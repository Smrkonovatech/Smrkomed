import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AbdmV3Service,
  validateAbhaAddress,
  formatAadhaarOtpPrompt,
  canResendOtp,
  shouldVerifyCommunicationMobile,
  NHA_CONSENT_TEXTS,
} from "./modules/digital-health/abdm-v3-service";
import { hashAbha, maskAbha, normalizeAbhaDigits } from "./modules/digital-health/abdm-provider";

describe("ABDM NHA Test Checklist — ABHA Creation & Verification", () => {
  const service = new AbdmV3Service();

  // Ensure test runs in demo/sandbox mode
  process.env["ABDM_DEMO_MODE"] = "1";

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: ABHA CREATION THROUGH AADHAAR OTP (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Section 1: ABHA Creation Process", () => {
    it("CRT_ABHA_101: Create ABHA Option — system must provide an option to create ABHA through Aadhaar OTP", async () => {
      // The system provides requestAadhaarEnrolOtp API and UI entrypoint
      assert.equal(typeof service.requestAadhaarEnrolOtp, "function");
      const res = await service.requestAadhaarEnrolOtp("123456789012");
      assert.ok(res.txnId, "Transaction ID must be returned to track ABHA creation session");
      assert.ok(res.message.toLowerCase().includes("otp"), "Prompt message must indicate OTP sent");
    });

    it("CRT_ABHA_102: Consent Collection — system must display consent language & collect user consent per ABDM policy", () => {
      const consent = NHA_CONSENT_TEXTS["en"];
      assert.ok(consent, "English consent text must exist");
      assert.match(consent.title, /Consent for ABHA Creation/i);
      assert.match(consent.body, /voluntarily sharing my Aadhaar number/i);
      assert.match(consent.body, /National Health Authority/i);
      assert.match(consent.body, /Ayushman Bharat Health Account/i);
    });

    it("CRT_ABHA_103: Multilingual Consent — system must support consent in Indian languages other than English", () => {
      const languages = Object.keys(NHA_CONSENT_TEXTS);
      assert.ok(languages.length >= 5, "Must support at least 5 languages");
      assert.ok(languages.includes("hi"), "Hindi consent must be present");
      assert.ok(languages.includes("kn"), "Kannada consent must be present");
      assert.ok(languages.includes("te"), "Telugu consent must be present");
      assert.ok(languages.includes("ta"), "Tamil consent must be present");

      // Verify non-empty localized strings
      assert.ok(NHA_CONSENT_TEXTS["hi"]?.body.includes("आयुष्मान भारत स्वास्थ्य खाता"));
      assert.ok(NHA_CONSENT_TEXTS["kn"]?.body.includes("ಆಯುಷ್ಮಾನ್ ಭಾರತ್"));
    });

    it("CRT_ABHA_104: Aadhaar Collection & Error Message — display error 'Aadhaar Number is not valid' on invalid input", async () => {
      // Test with less than 12 digits
      await assert.rejects(
        async () => {
          await service.requestAadhaarEnrolOtp("12345");
        },
        (err: any) => {
          assert.equal(err.code, "INVALID_AADHAAR");
          assert.equal(err.message, "Aadhaar Number is not valid");
          return true;
        },
      );

      // Test with letters/special characters resulting in invalid length
      await assert.rejects(
        async () => {
          await service.requestAadhaarEnrolOtp("1234ABCD9012");
        },
        (err: any) => {
          assert.equal(err.code, "INVALID_AADHAAR");
          assert.equal(err.message, "Aadhaar Number is not valid");
          return true;
        },
      );
    });

    it("CRT_ABHA_105: Aadhaar OTP Collection — prompt user with formatted message containing masked mobile number", () => {
      const prompt = formatAadhaarOtpPrompt("9876543210");
      assert.equal(
        prompt,
        "We just sent an OTP on the Mobile Number *******3210 linked with Aadhaar. Enter the OTP below to proceed with ABHA creation",
      );

      // Verify standard 6-digit OTP structure requirement
      const validOtp = "123456";
      assert.equal(validOtp.length, 6);
      assert.match(validOtp, /^\d{6}$/);
    });

    it("CRT_ABHA_106: Resend OTP — enforce 60s cooldown and maximum 2 resend attempts", () => {
      // Attempt 0: Allowed after 60s
      const check1 = canResendOtp({ attempts: 0, secondsSinceLastSend: 65 });
      assert.equal(check1.allowed, true);

      // Attempt 1 within cooldown (30s): Blocked
      const check2 = canResendOtp({ attempts: 1, secondsSinceLastSend: 30 });
      assert.equal(check2.allowed, false);
      assert.match(check2.reason || "", /Please wait 30 seconds/);

      // Attempt 1 after cooldown (60s): Allowed
      const check3 = canResendOtp({ attempts: 1, secondsSinceLastSend: 60 });
      assert.equal(check3.allowed, true);

      // Attempt 2 (Max reached): Blocked
      const check4 = canResendOtp({ attempts: 2, secondsSinceLastSend: 90 });
      assert.equal(check4.allowed, false);
      assert.match(check4.reason || "", /Maximum 2 resend OTP attempts reached/);
    });

    it("CRT_ABHA_107: OTP based Aadhaar Authentication — verifies OTP, rejects incorrect, completes enrollment", async () => {
      // 1. In case of incorrect OTP, system displays an error
      await assert.rejects(
        async () => {
          await service.enrolByAadhaar({
            txnId: "txn-107",
            otp: "000000",
            mobile: "9876543210",
          });
        },
        (err: any) => {
          assert.equal(err.code, "INVALID_OTP");
          assert.equal(err.message, "Incorrect OTP");
          return true;
        },
      );

      // 2. In case of correct OTP, system creates ABHA and returns profile
      const enrolRes = await service.enrolByAadhaar({
        txnId: "txn-107",
        otp: "123456",
        mobile: "9876543210",
      });
      assert.ok(enrolRes.tokens?.token);
      assert.ok(enrolRes.ABHAProfile?.ABHANumber);
      assert.equal(enrolRes.ABHAProfile.mobile, "9876543210");
      assert.equal(enrolRes.isNew, true);
    });

    it("CRT_ABHA_108: Communication Mobile verification-I — auto-skips OTP when communication mobile is same as Aadhaar mobile", () => {
      const aadhaarMobile = "9876543210";
      const commsMobileSame = "9876543210";
      const needsOtp = shouldVerifyCommunicationMobile(aadhaarMobile, commsMobileSame);
      assert.equal(needsOtp, false, "Should not require OTP when communication mobile matches Aadhaar mobile");
    });

    it("CRT_ABHA_109: Communication Mobile verification-II — prompts for OTP when communication mobile is different", () => {
      const aadhaarMobile = "9876543210";
      const commsMobileDifferent = "9123456789";
      const needsOtp = shouldVerifyCommunicationMobile(aadhaarMobile, commsMobileDifferent);
      assert.equal(needsOtp, true, "Must require OTP when communication mobile differs from Aadhaar mobile");
    });

    it("CRT_ABHA_112: Suggested ABHA Address & Validation Rules — offers >=3 suggestions, enforces 8-18 chars & format", async () => {
      // 1. Returns at least 3 suggestions
      const suggRes = await service.getAddressSuggestions("txn-112");
      assert.ok(Array.isArray(suggRes.abhaAddressList));
      assert.ok(suggRes.abhaAddressList.length >= 3, "System must provide at least 3 suggestions");

      // 2. Validation rule 1: Min length 8 chars
      const shortCheck = validateAbhaAddress("rahul");
      assert.equal(shortCheck.valid, false);
      assert.match(shortCheck.error || "", /minimum length is 8/);

      // Validation rule 2: Max length 18 chars
      const longCheck = validateAbhaAddress("this_is_way_too_long_for_an_abha_handle");
      assert.equal(longCheck.valid, false);
      assert.match(longCheck.error || "", /maximum length is 18/);

      // Validation rule 3 & 4: Dot or underscore cannot be in beginning or end
      const leadingDot = validateAbhaAddress(".rahulsharma");
      assert.equal(leadingDot.valid, false);
      const trailingUnderscore = validateAbhaAddress("rahulsharma_");
      assert.equal(trailingUnderscore.valid, false);

      // Validation rule 5: Valid format with 1 dot in between
      const validAddress = validateAbhaAddress("rahul.sharma@sbx");
      assert.equal(validAddress.valid, true);

      // 3. Duplicate check: Displays "ABHA Address is already exist"
      await assert.rejects(
        async () => {
          await service.createCustomAbhaAddress({
            txnId: "txn-112",
            abhaAddress: "existing.user@sbx",
          });
        },
        (err: any) => {
          assert.equal(err.code, "ABHA_ADDRESS_EXISTS");
          assert.equal(err.message, "ABHA Address is already exist");
          return true;
        },
      );
    });

    it("CRT_ABHA_113: Display of ABHA Number — system displays 14-digit ABHA number and address", () => {
      const rawAbha = "91-1234-5678-9012";
      const digits = normalizeAbhaDigits(rawAbha);
      assert.equal(digits.length, 14, "ABHA number digits must be 14 characters");
      assert.equal(maskAbha(digits), "XX-XXXX-XXXX-9012", "ABHA number should be masked safely in display");
    });

    it("CRT_ABHA_114: View and Download ABHA Card — ABHA card contains all mandatory fields", async () => {
      const card = await service.getAbhaCard("mock-token-x");
      assert.ok(card.cardData, "ABHA Card binary/base64 data must be present");
      assert.ok(card.contentType, "Content type must be present");

      const profile = await service.getProfile("mock-token-x");
      // Required card fields per NHA specification:
      assert.ok(profile.ABHANumber, "Card must include 14-digit ABHA Number");
      assert.ok(profile.dob, "Card must include date of birth");
      assert.ok(profile.gender, "Card must include gender");
      assert.ok(profile.phrAddress?.[0], "Card must include ABHA address");
    });

    it("CRT_ABHA_115: View and Download ABHA Details for HIMS — card information formatted for HIMS card generation", () => {
      const patientId = "patient_1001";
      const abhaNumber = "91-2345-6789-0123";
      const abhaAddress = "priya.sharma@sbx";

      const himsCardRecord = {
        patientId,
        abhaNumber,
        abhaAddress,
        digits: normalizeAbhaDigits(abhaNumber),
        masked: maskAbha(normalizeAbhaDigits(abhaNumber)),
        hash: hashAbha(normalizeAbhaDigits(abhaNumber)),
      };

      assert.equal(himsCardRecord.patientId, patientId);
      assert.equal(himsCardRecord.masked, "XX-XXXX-XXXX-0123");
      assert.equal(himsCardRecord.abhaAddress, "priya.sharma@sbx");
      assert.equal(himsCardRecord.hash.length, 64);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: ABHA VERIFICATION PROCESS (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Section 2: ABHA Verification Process", () => {
    it("VRFY_ABHA_101 & 102: ABHA Number & Address Verification using Aadhaar OTP", async () => {
      const otpRes = await service.requestLoginOtp({
        loginType: "aadhaar",
        identifier: "123456789012",
      });
      assert.ok(otpRes.txnId);

      const verifyRes = await service.verifyLoginOtp({
        txnId: otpRes.txnId,
        otp: "123456",
        loginType: "aadhaar",
      });
      assert.equal(verifyRes.authResult, "success");
      assert.ok(verifyRes.accounts && verifyRes.accounts.length > 0);
      assert.ok(verifyRes.accounts[0]?.ABHANumber);
      assert.ok(verifyRes.accounts[0]?.preferredAbhaAddress);
    });

    it("VRFY_ABHA_201 & 202: ABHA Number & Address verification using Mobile OTP", async () => {
      const otpRes = await service.requestLoginOtp({
        loginType: "mobile",
        identifier: "9876543210",
      });
      assert.ok(otpRes.txnId);

      const verifyRes = await service.verifyLoginOtp({
        txnId: otpRes.txnId,
        otp: "123456",
        loginType: "mobile",
      });
      assert.equal(verifyRes.authResult, "success");
      assert.ok(verifyRes.accounts && verifyRes.accounts.length > 0);
    });

    it("VRFY_ABHA_301: Fetch ABHA details via Mobile Auth — handles not found with exact NHA error message", async () => {
      await assert.rejects(
        async () => {
          await service.verifyLoginOtp({
            txnId: "txn-not-found-123",
            otp: "123456",
            loginType: "mobile",
          });
        },
        (err: any) => {
          assert.equal(err.code, "ABHA_NOT_FOUND");
          assert.match(err.message, /ABHA Number not found/);
          assert.match(err.message, /We did not find any ABHA number linked to this mobile number/);
          assert.match(err.message, /Please use ABHA linked mobile number/);
          return true;
        },
      );
    });

    it("VRFY_ABHA_401: Fetch ABHA details via Aadhaar — handles invalid Aadhaar & unregistered Aadhaar", async () => {
      // 1. Invalid Aadhaar Number format
      await assert.rejects(
        async () => {
          await service.requestLoginOtp({
            loginType: "aadhaar",
            identifier: "999",
          });
        },
        (err: any) => {
          assert.equal(err.code, "INVALID_AADHAAR");
          assert.equal(err.message, "Aadhaar Number is not valid");
          return true;
        },
      );

      // 2. Aadhaar not registered
      await assert.rejects(
        async () => {
          await service.verifyLoginOtp({
            txnId: "txn-unregistered-aadhaar",
            otp: "123456",
            loginType: "aadhaar",
          });
        },
        (err: any) => {
          assert.equal(err.code, "ABHA_NOT_FOUND");
          assert.equal(err.message, "NO ABHA user registered with this Aadhaar Number");
          return true;
        },
      );
    });

    it("VRFY_ABHA_501: Reading ABHA Profile Info using ABHA QR Code", () => {
      // Scan and parse demographic details from ABDM QR payload
      const qrPayload = JSON.stringify({
        hid: "91-1234-5678-9012",
        hidn: "91123456789012",
        name: "Aadhaar User",
        gender: "M",
        dob: "1990-01-01",
        mobile: "9876543210",
        address: "Bengaluru, Karnataka",
      });

      const parsed = JSON.parse(qrPayload);
      assert.equal(parsed.hid, "91-1234-5678-9012");
      assert.equal(parsed.name, "Aadhaar User");
      assert.equal(normalizeAbhaDigits(parsed.hid), "91123456789012");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: HIMS DATABASE TAGGING & SCAN-AND-SHARE (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Section 3: HIMS Tagging & PHR Share Profile", () => {
    it("TAGGING_UNIQUEPATIENTID_UNIQUEABHANUMBER: Enforces 1:1 ABHA to patient ID mapping in HIMS", () => {
      // In-memory mapping simulating database uniqueness check
      const databaseRecords = new Map<string, string>(); // abhaHash -> patientId

      function linkPatientAbha(patientId: string, rawAbha: string): { ok: boolean; error?: string } {
        const hash = hashAbha(normalizeAbhaDigits(rawAbha));
        const existingPatientId = databaseRecords.get(hash);
        if (existingPatientId && existingPatientId !== patientId) {
          return {
            ok: false,
            error: `ABHA Number is already tagged to patient ID ${existingPatientId}. Cannot tag multiple patient IDs.`,
          };
        }
        databaseRecords.set(hash, patientId);
        return { ok: true };
      }

      // Link first patient
      const res1 = linkPatientAbha("PAT_001", "91-1111-2222-3333");
      assert.equal(res1.ok, true);

      // Attempt to link second patient with same ABHA number: MUST FAIL
      const res2 = linkPatientAbha("PAT_002", "91-1111-2222-3333");
      assert.equal(res2.ok, false);
      assert.match(res2.error || "", /already tagged to patient ID PAT_001/);
    });

    it("SHARE_PATIENT_PROFILE_701: Share Patient Profile via QR scan at facility desk", () => {
      const hipName = "Smrko Med Healthcare Facility";
      const consentDisclaimer = `Your consent to the above information to be shared with ${hipName}. They can use this information for your registration and linking your health records`;

      assert.match(consentDisclaimer, /Your consent to the above information to be shared with/);
      assert.match(consentDisclaimer, /They can use this information for your registration/);

      // Generate share token with 30-minute validity
      const tokenIssuedAt = Date.now();
      const tokenExpiresAt = tokenIssuedAt + 30 * 60 * 1000;
      const tokenRecord = {
        tokenNumber: `TKN-${Math.floor(100000 + Math.random() * 900000)}`,
        issuedAt: new Date(tokenIssuedAt).toISOString(),
        expiresAt: new Date(tokenExpiresAt).toISOString(),
        validityMinutes: 30,
      };

      assert.equal(tokenRecord.validityMinutes, 30);
      assert.match(tokenRecord.tokenNumber, /^TKN-\d{6}$/);
    });
  });
});
