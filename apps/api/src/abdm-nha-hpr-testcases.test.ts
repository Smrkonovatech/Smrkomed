import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AbdmHprService,
  NHA_HPR_CONSENT_TEXTS,
  validateHprAlias,
  validateHprPasswordComplexity,
  validateHprEmail,
} from "./modules/digital-health/abdm-hpr-service";

describe("NHA ABDM Official Test Cases — Healthcare Professionals Registry (HPR)", () => {
  const service = new AbdmHprService();

  // Force demo mode for deterministic testing without external sandbox connection
  process.env["ABDM_DEMO_MODE"] = "1";

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CREATION OF HPR PROFILE (HPR-002 to HPR-011)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Creation of HPR Profile (HPR-002 to HPR-011)", () => {
    it("HPR-002: System provides option to create HPR ID through Aadhaar", () => {
      assert.equal(typeof service.generateAadhaarRegistrationOtp, "function");
    });

    it("HPR-003: Aadhaar collection and error message — requires 12 digits, throws on invalid input", async () => {
      await assert.rejects(
        async () => {
          await service.generateAadhaarRegistrationOtp("12345"); // Invalid length
        },
        { name: "AbdmV3ClientError", code: "INVALID_AADHAAR" },
      );

      const res = await service.generateAadhaarRegistrationOtp("123456789012");
      assert.ok(res.txnId);
      assert.equal(res.mobileNumber, "9999999999");
    });

    it("HPR-004: Consent collection & multilingual texts — English and Hindi published consent", () => {
      const enConsent = NHA_HPR_CONSENT_TEXTS["en"];
      assert.ok(enConsent, "English consent text must be present");
      assert.match(enConsent.title, /Standard Consent Language for Aadhaar/i);
      assert.match(enConsent.body, /voluntarily sharing my Aadhaar Number/i);
      assert.match(enConsent.body, /Healthcare Professional ID/i);
      assert.match(enConsent.body, /National Health Authority/i);

      const hiConsent = NHA_HPR_CONSENT_TEXTS["hi"];
      assert.ok(hiConsent, "Hindi consent text must be present");
      assert.match(hiConsent.body, /हेल्थकेयर प्रोफेशनल आईडी/);
      assert.match(hiConsent.body, /राष्ट्रीय स्वास्थ्य प्राधिकरण/);
    });

    it("HPR-006: Aadhaar OTP collection & validation", async () => {
      // Rejects empty OTP
      await assert.rejects(
        async () => {
          await service.verifyAadhaarRegistrationOtp({ otp: "", txnId: "txn_123" });
        },
        { name: "AbdmV3ClientError", code: "INVALID_INPUT" },
      );

      const res = await service.verifyAadhaarRegistrationOtp({
        otp: "350991",
        txnId: "txn_123",
      });
      assert.equal(res.txnId, "txn_123");
    });

    it("HPR-008: Communication Mobile Number verification logic", async () => {
      // Step 1: Check account existence & get Aadhaar-linked mobile
      const checkRes = await service.checkHpIdAccountExist("txn_123");
      assert.equal(checkRes.mobile, "9876543210");

      // Step 2: Demographic auth via mobile
      const demoAuth = await service.demographicAuthViaMobile({
        mobileNumber: "9876543210",
        txnId: "txn_123",
      });
      assert.equal(demoAuth.verified, true);

      // Step 3: Different mobile sends separate verification OTP
      const otpSend = await service.generateRegistrationMobileOtp({
        mobile: "9876543210",
        txnId: "txn_123",
      });
      assert.ok(otpSend.txnId);

      const otpVerify = await service.verifyRegistrationMobileOtp({
        otp: "123456",
        txnId: otpSend.txnId,
      });
      assert.ok(otpVerify.txnId);
    });

    it("HPR-010 (2.3): Username / Alias validation — at least 4 letters, alphanumeric and dot only", () => {
      assert.equal(validateHprAlias("amol.hudekar").valid, true);
      assert.equal(validateHprAlias("doc123").valid, true);
      assert.equal(validateHprAlias("doc").valid, false, "Must contain at least 4 letters");
      assert.equal(validateHprAlias("dr@amol").valid, false, "Special characters except dot not allowed");
    });

    it("HPR-010 (2.5): Email ID validation — presence of @, domain name format, absence of spaces", () => {
      assert.equal(validateHprEmail("dr.amol@example.com").valid, true);
      assert.equal(validateHprEmail("dr.amol example.com").valid, false, "Must have @");
      assert.equal(validateHprEmail("dr amol@example.com").valid, false, "No spaces allowed");
      assert.equal(validateHprEmail("dr.amol@com").valid, false, "Must have domain format");
    });

    it("HPR-010 (2.6 & 2.7): Password complexity validation — >8 chars, uppercase, lowercase, number, special char", () => {
      assert.equal(validateHprPasswordComplexity("P@ssword123").valid, true);
      assert.equal(validateHprPasswordComplexity("Short1!").valid, false, "Must be > 8 characters");
      assert.equal(validateHprPasswordComplexity("alllowercase1!").valid, false, "Must have uppercase");
      assert.equal(validateHprPasswordComplexity("ALLUPPERCASE1!").valid, false, "Must have lowercase");
      assert.equal(validateHprPasswordComplexity("NoNumbersHere!").valid, false, "Must have number");
      assert.equal(validateHprPasswordComplexity("NoSpecial123").valid, false, "Must have special char");
    });

    it("HPR-010 (Suggestion API): Returns at least 3 username suggestions", async () => {
      const suggestions = await service.getHprIdSuggestions("txn_123");
      assert.ok(Array.isArray(suggestions));
      assert.ok(suggestions.length >= 3, "Must provide at least 3 suggestions");
      assert.ok(suggestions.every((s) => validateHprAlias(s).valid), "Suggestions must be valid HPR aliases");
    });

    it("HPR-011: Submit HPR ID creates professional profile and returns token & hprIdNumber", async () => {
      const res = await service.createHprId({
        txnId: "txn_123",
        email: "amol.hudekar@example.com",
        firstName: "Amol",
        lastName: "Hudekar",
        password: "SecretPassword123!",
        hpCategoryCode: 1, // Doctor
        hpSubCategoryCode: 1, // Modern Medicine
        role: 1,
        hprId: "amol.hudekar@hpr.abdm",
      });

      assert.ok(res.token);
      assert.ok(res.hprIdNumber.startsWith("71-"));
      assert.equal(res.hprId, "amol.hudekar@hpr.abdm");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REGISTER IN HPR DETAILS (HPR-018 to HPR-080)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Register in HPR Details (HPR-018 to HPR-080)", () => {
    it("HPR-018 to HPR-024: Captures personal information, official mobile & email, salutation", async () => {
      const regRes = await service.registerProfessional({
        hprToken: "mock-hpr-token",
        practitioner: {
          healthProfessionalType: "doctor",
          personalInformation: {
            salutation: 1, // Dr.
            firstName: "Amol",
            lastName: "Hudekar",
            nationality: "Indian",
            gender: "M",
            dateOfBirth: "1990-04-24",
            languagesSpoken: "English, Hindi, Marathi",
          },
          communicationAddress: {
            isCommunicationAddressAsPerKYC: "1",
            address: "510 South Street",
            country: "India",
          },
          registrationAcademic: {
            category: 1,
            registrationData: [
              {
                registeredWithCouncil: 41,
                registrationNumber: "REG12032",
                registrationDate: "2024-12-01",
                isPermanentOrRenewable: "Permanent",
                categoryId: 2,
              },
            ],
          },
          currentWorkDetails: {
            currentlyWorking: "1",
            purposeOfWork: "Practice",
            chooseWorkStatus: 1,
          },
        },
      });

      assert.equal(regRes.statusCode, "OK");
      assert.equal(regRes.body.status, "true");
      assert.ok(regRes.body.hprId.startsWith("71-"));
    });

    it("HPR-054 to HPR-067: Captures council registrations and degree qualifications", async () => {
      const councils = await service.getMedicalCouncils();
      assert.ok(councils.length > 0);

      const courses = await service.getCourses();
      assert.ok(courses.length > 0);
    });

    it("HPR-068 to HPR-076: Captures work details and facility declaration via facility search", async () => {
      const searchRes = await service.searchHfrFacility({
        facilityName: "ABC Hospital",
      });
      assert.ok(searchRes.facilities.length > 0);
      assert.equal(searchRes.facilities[0]?.facilityId, "IN3310001245");
    });

    it("HPR-078: Fetch professional info API retrieves full details", async () => {
      const info = await service.fetchProfessionalInfo({
        practitioner: {
          id: "71-1227-1234-0212",
        },
      });
      assert.ok(Array.isArray(info.practitioners));
      assert.ok(info.practitioners.length > 0);
      assert.equal(info.practitioners[0]![0]!.hpr_id, "71-1227-1234-0212");
    });

    it("HPR-079: Update professional API allows modifying details", async () => {
      const updateRes = await service.updateProfessional({
        hprToken: "mock-hpr-token",
        practitioner: {
          healthProfessionalType: "doctor",
          personalInformation: {
            salutation: 1,
            firstName: "Amol",
            lastName: "Hudekar",
            nationality: "Indian",
            gender: "M",
            dateOfBirth: "1990-04-24",
            languagesSpoken: "English, Hindi, Marathi",
          },
          communicationAddress: {
            isCommunicationAddressAsPerKYC: "1",
          },
          registrationAcademic: {
            category: 1,
            registrationData: [
              {
                registeredWithCouncil: 41,
                registrationNumber: "REG12032",
                registrationDate: "2024-12-01",
                isPermanentOrRenewable: "Permanent",
                categoryId: 2,
              },
            ],
          },
          currentWorkDetails: {
            currentlyWorking: "1",
            purposeOfWork: "Practice",
            chooseWorkStatus: 1,
          },
        },
      });

      assert.equal(updateRes.statusCode, "OK");
      assert.equal(updateRes.body.status, "true");
    });

    it("HPR-080: Upload document API fetches document list then uploads base64 file", async () => {
      // Step 1: Fetch documents list
      const docList = await service.fetchDocumentsList("71-1227-1234-0212");
      const profilePhoto = docList.documentList?.profileDetails?.profilePhoto;
      assert.ok(profilePhoto?.id);
      assert.ok(profilePhoto?.data);
      const targetDocId = profilePhoto.id;

      // Step 2: Upload document
      const uploadRes = await service.uploadDocuments({
        hpr_token: "mock-hpr-token",
        document: [
          {
            document_id: targetDocId,
            document_type: "profilePhoto",
            fileType: "jpeg",
            data: profilePhoto.data,
          },
        ],
      });

      assert.equal(uploadRes["profilePhoto"]?.status, "pass");
      assert.match(uploadRes["profilePhoto"]?.msg ?? "", /updated successfully/i);
    });
  });
});
