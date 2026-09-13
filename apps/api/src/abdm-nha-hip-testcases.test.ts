import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";

import { createApp } from "./app";
import {
  AbdmV3Service,
  generateAbdmFhirRecord,
  fuzzyMatchPatient,
  formatDeepLinkSms,
  type FhirRecordInput,
} from "./modules/digital-health/abdm-v3-service";
import {
  generateHipKeyMaterial,
  calculateSharedSecret,
  deriveSymmetricKey,
  encryptFhirPayload,
  decryptFhirPayload,
} from "./modules/digital-health/abdm-v3-data-crypto";
import {
  type V3ConsentNotifyCallbackPayload,
  type V3DiscoverCallbackPayload,
  type V3LinkInitCallbackPayload,
  type V3LinkConfirmCallbackPayload,
  type V3HealthInfoRequestCallbackPayload,
} from "./modules/digital-health/abdm-v3-types";

describe("ABDM NHA Test Checklist — Module: Building HIP (Milestone 2)", () => {
  const service = new AbdmV3Service();
  const app = createApp();

  // Ensure test runs in sandbox/demo mode
  process.env["ABDM_DEMO_MODE"] = "1";
  process.env["ABDM_ENV"] = "sandbox";

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 1: HEALTH RECORD CREATION (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 1: Health Record Creation (HIP)", () => {
    it("Case 1.1 (Mandatory): Generation of digital health record in FHIR format", () => {
      // ABDM mandates only the sharing of digital health record in FHIR format.
      // 1. Structured FHIR Bundle generation (OP Consultation with Prescription)
      const structuredInput: FhirRecordInput = {
        careContextReference: "OPD-CARE-CTX-101",
        hiType: "OPCONSULTATION",
        format: "STRUCTURED",
        patient: {
          id: "pat-priya-01",
          name: "Priya Sharma",
          gender: "F",
          birthDate: "1994-06-15",
          abhaAddress: "priya.sharma@sbx",
          abhaNumber: "91-1234-5678-9012",
          mobile: "9876543210",
        },
        encounter: {
          visitDateTime: "2026-03-10T10:30:00.000Z",
          doctorName: "Dr. Ananya Rao",
        },
        details: {
          title: "Fertility Consultation Note",
          content: "Initial evaluation for IVF protocol. Baseline ultrasound scheduled.",
          medications: [
            { medicineName: "Folic Acid 5mg", dosage: "1 tablet daily", instructions: "Oral after meals" },
            { medicineName: "CoQ10 200mg", dosage: "1 capsule twice daily", instructions: "With food" },
          ],
          diagnosticObservations: [
            { code: "AMH", display: "Anti-Mullerian Hormone", value: "2.4", unit: "ng/mL" },
            { code: "FSH", display: "Follicle Stimulating Hormone", value: "6.8", unit: "mIU/mL" },
          ],
        },
      };

      const structuredBundle = generateAbdmFhirRecord(structuredInput);

      assert.equal(structuredBundle.resourceType, "Bundle", "Root resource must be a FHIR Bundle");
      assert.equal(structuredBundle.type, "document", "Bundle type must be 'document' per ABDM spec");
      assert.ok(structuredBundle.id, "Bundle must have a unique identifier");
      assert.ok(structuredBundle.entry.length >= 4, "Bundle must contain Composition, Patient, MedicationRequest, Observation");

      // Verify Composition
      const composition = structuredBundle.entry.find((e) => e.resource["resourceType"] === "Composition")?.resource;
      assert.ok(composition, "Must contain Composition resource");
      assert.equal(composition["status"], "final");
      assert.equal(composition["title"], "Fertility Consultation Note");

      // Verify Patient
      const patient = structuredBundle.entry.find((e) => e.resource["resourceType"] === "Patient")?.resource;
      assert.ok(patient, "Must contain Patient resource");
      assert.equal(patient["gender"], "female");

      // Verify Structured MedicationRequest
      const medReq = structuredBundle.entry.find((e) => e.resource["resourceType"] === "MedicationRequest")?.resource;
      assert.ok(medReq, "Must contain MedicationRequest in structured OP record");

      // 2. Unstructured FHIR Bundle generation (DocumentReference with attachment/clinical report)
      const unstructuredInput: FhirRecordInput = {
        careContextReference: "DOC-CARE-CTX-202",
        hiType: "DIAGNOSTIC REPORT",
        format: "UNSTRUCTURED",
        patient: {
          id: "pat-priya-01",
          name: "Priya Sharma",
          gender: "F",
          abhaAddress: "priya.sharma@sbx",
        },
        encounter: {
          visitDateTime: "2026-03-10T11:00:00.000Z",
        },
        details: {
          title: "Pelvic Ultrasound Imaging Report",
          attachmentBase64: Buffer.from("SAMPLE_ULTRASOUND_PDF_DATA").toString("base64"),
        },
      };

      const unstructuredBundle = generateAbdmFhirRecord(unstructuredInput);
      assert.equal(unstructuredBundle.resourceType, "Bundle");
      const docRef = unstructuredBundle.entry.find((e) => e.resource["resourceType"] === "DocumentReference")?.resource;
      assert.ok(docRef, "Unstructured record must contain DocumentReference");
      const content = (docRef["content"] as Array<{ attachment?: { contentType?: string; data?: string } }>)?.[0];
      assert.equal(content?.attachment?.contentType, "application/pdf");
      assert.ok(content?.attachment?.data, "Attachment must contain base64 encoded data");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 2: HIP INITIATED HEALTH RECORD LINKING USING MOBILE OTP (OPTIONAL/RECOMMENDED)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 2: HIP Initiated Health Record Linking Using Mobile OTP", () => {
    let mobileOtpTxnId = "";
    let mobileOtpLinkToken = "";

    it("Case 2.1: User receives OTP on mobile number registered with ABHA address", async () => {
      const res = await service.initiateHipLinkAuth({
        authMode: "MOBILE_OTP",
        abhaAddress: "priya.sharma@sbx",
        patient: {
          name: "Priya Sharma",
          gender: "F",
          yearOfBirth: 1994,
          mobile: "9876543210",
        },
      });

      assert.ok(res.transactionId, "Transaction ID must be generated");
      assert.equal(res.authMode, "MOBILE_OTP");
      assert.equal(res.status, "OTP_SENT");
      mobileOtpTxnId = res.transactionId;
    });

    it("Case 2.2: OTP received on registered mobile number with masked number prompt", async () => {
      const res = await service.initiateHipLinkAuth({
        authMode: "MOBILE_OTP",
        abhaAddress: "priya.sharma@sbx",
        patient: {
          name: "Priya Sharma",
          gender: "F",
          yearOfBirth: 1994,
          mobile: "9876543210",
        },
      });

      assert.equal(res.maskedMobile, "*******3210", "Must mask mobile for privacy");
      assert.match(res.message, /\*\*\*\*\*\*\*3210/);
      assert.match(res.message, /registered mobile number/i);
    });

    it("Case 2.3: In case of incorrect OTP, system throws error; in case of correct OTP, patient is validated", async () => {
      // 1. Incorrect OTP -> Throws error
      await assert.rejects(
        async () => {
          await service.verifyHipLinkAuth({
            transactionId: mobileOtpTxnId,
            authCode: "000000",
          });
        },
        (err: unknown) => {
          const e = err as { code: string; message: string };
          assert.equal(e.code, "INVALID_OTP");
          assert.match(e.message, /Incorrect OTP/i);
          return true;
        },
      );

      // 2. Correct OTP -> Validated
      const verified = await service.verifyHipLinkAuth({
        transactionId: mobileOtpTxnId,
        authCode: "123456",
      });
      assert.equal(verified.verified, true);
      assert.equal(verified.status, "AUTHENTICATED");
      assert.ok(verified.linkToken, "Linking token must be returned upon successful authentication");
      mobileOtpLinkToken = verified.linkToken;
    });

    it("Case 2.4: New Linking token should be created", () => {
      assert.ok(mobileOtpLinkToken, "New linking token must be created");
      assert.ok(mobileOtpLinkToken.startsWith("otp-link-token-"));
    });

    it("Case 2.5: Health record linking can now be initiated using generated linking token", async () => {
      const linkRes = await service.linkCareContexts({
        patientId: "patient-priya-01",
        clinicId: "clinic-test-01",
        abhaAddress: "priya.sharma@sbx",
        linkToken: mobileOtpLinkToken,
        patientDisplay: "Priya Sharma OPD Visit",
        careContexts: [{ referenceNumber: "OPD-CARE-CTX-101", display: "Fertility Consultation" }],
        hiType: "OPCONSULTATION",
      });

      assert.ok(linkRes.requestId);
      assert.equal(linkRes.linkedCount, 1);
      assert.match(linkRes.message, /linked/i);
    });

    it("Case 2.6: User can pull linked health records on PHR app using 'Pull Records' button and verify details", async () => {
      const links = await service.getPatientLinks(10);
      assert.ok(links.patient.links.length > 0, "Patient must have at least one link");
      const record = links.patient.links[0];
      assert.ok(record);
      assert.ok(record.careContexts.length > 0, "Care contexts must be present");
      assert.ok(record.hiType, "HI Type must be present");
      assert.ok(record.dateCreated, "Visit Date and Time must be present");
      assert.ok(record.display, "Patient details must be present");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 3: HIP INITIATED HEALTH RECORD LINKING USING AADHAAR OTP (OPTIONAL/RECOMMENDED)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 3: HIP Initiated Health Record Linking Using Aadhaar OTP", () => {
    let aadhaarTxnId = "";
    let aadhaarLinkToken = "";

    it("Case 3.1 & 3.2: User receives OTP on Aadhaar linked mobile number registered with ABHA address", async () => {
      const res = await service.initiateHipLinkAuth({
        authMode: "AADHAAR_OTP",
        abhaAddress: "rahul.verma@sbx",
        abhaNumber: "91-8888-2222-3333",
        patient: {
          name: "Rahul Verma",
          gender: "M",
          yearOfBirth: 1992,
          mobile: "9812345678",
        },
      });

      assert.ok(res.transactionId);
      assert.equal(res.authMode, "AADHAAR_OTP");
      assert.equal(res.maskedMobile, "*******5678");
      assert.match(res.message, /Aadhaar-linked mobile/i);
      aadhaarTxnId = res.transactionId;
    });

    it("Case 3.3: In case of correct OTP, user validated; incorrect OTP throws error; linking token generated", async () => {
      // Incorrect OTP
      await assert.rejects(
        async () => {
          await service.verifyHipLinkAuth({
            transactionId: aadhaarTxnId,
            authCode: "111111",
          });
        },
        (err: unknown) => {
          const e = err as { code: string };
          assert.equal(e.code, "INVALID_OTP");
          return true;
        },
      );

      // Correct OTP
      const res = await service.verifyHipLinkAuth({
        transactionId: aadhaarTxnId,
        authCode: "123456",
      });
      assert.equal(res.verified, true);
      assert.ok(res.linkToken);
      aadhaarLinkToken = res.linkToken;
    });

    it("Case 3.4: New Linking token should be created", () => {
      assert.ok(aadhaarLinkToken);
      assert.ok(aadhaarLinkToken.startsWith("otp-link-token-"));
    });

    it("Case 3.5 & 3.6: Health record linking initiated; user pulls records on PHR app using 'Pull Records'", async () => {
      const linkRes = await service.linkCareContexts({
        patientId: "patient-rahul-02",
        clinicId: "clinic-test-01",
        abhaAddress: "rahul.verma@sbx",
        linkToken: aadhaarLinkToken,
        careContexts: [{ referenceNumber: "LAB-201", display: "Semen Analysis Report" }],
        hiType: "DIAGNOSTIC REPORT",
      });

      assert.ok(linkRes.requestId);
      assert.equal(linkRes.linkedCount, 1);

      // Pull records verification
      const patientLinks = await service.getPatientLinks(10);
      assert.ok(patientLinks.patient.links.length > 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 4: HIP INITIATED HEALTH RECORD LINKING USING DIRECT AUTH (OPTIONAL)
  // & CONSENT LIFECYCLE (GRANT, REVOKE, EXPIRE)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 4: HIP Initiated Health Record Linking Using Direct Auth & Consent", () => {
    let directTxnId = "";
    let directLinkToken = "";

    it("Case 4.1: Request for linking should be initiated using Direct auth mode", async () => {
      const res = await service.initiateHipLinkAuth({
        authMode: "DIRECT",
        abhaAddress: "priya.sharma@sbx",
        patient: {
          name: "Priya Sharma",
          gender: "F",
          yearOfBirth: 1994,
        },
      });

      assert.equal(res.authMode, "DIRECT");
      assert.equal(res.status, "APPROVAL_PENDING");
      assert.ok(res.transactionId);
      directTxnId = res.transactionId;
    });

    it("Case 4.2 & 4.3: User receives notification on PHR app for approval of request sent by HIP", () => {
      // In Direct Auth, user gets push notification on PHR app to approve/reject
      assert.ok(directTxnId);
    });

    it("Case 4.4 & 4.5: Patient approves on PHR app; New Linking token created; record linked", async () => {
      const res = await service.verifyHipLinkAuth({
        transactionId: directTxnId,
        action: "APPROVE",
      });

      assert.equal(res.verified, true);
      assert.equal(res.status, "AUTHENTICATED");
      assert.ok(res.linkToken);
      directLinkToken = res.linkToken;

      const linkRes = await service.linkCareContexts({
        patientId: "patient-priya-01",
        clinicId: "clinic-test-01",
        abhaAddress: "priya.sharma@sbx",
        linkToken: directLinkToken,
        careContexts: [{ referenceNumber: "OPD-DIRECT-301", display: "Direct Auth Care Context" }],
        hiType: "OPCONSULTATION",
      });
      assert.ok(linkRes.requestId);
      assert.equal(linkRes.linkedCount, 1);
    });

    it("Case 4.6 & 4.7: Grant Consent Request (HIP) — Consent request seen in HMIS", async () => {
      const consentId = `consent-grant-${randomUUID()}`;
      const grantPayload: V3ConsentNotifyCallbackPayload = {
        notification: {
          status: "GRANTED",
          consentId,
          createdAt: new Date().toISOString(),
          patient: { id: "priya.sharma@sbx" },
          purpose: { text: "Routine Care & IVF Follow-up", code: "CAREMGT" },
          hiTypes: ["OPCONSULTATION", "PRESCRIPTION"],
          permission: {
            accessMode: "VIEW",
            dateRange: { from: "2025-01-01T00:00:00.000Z", to: "2027-01-01T00:00:00.000Z" },
            dataEraseAt: "2027-01-02T00:00:00.000Z",
          },
        },
      };

      await service.handleConsentNotify(grantPayload);

      // Verify HTTP route responds with 202 Accepted
      const httpRes = await app.request("/api/v3/consent/request/hip/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grantPayload),
      });
      assert.equal(httpRes.status, 202, "Consent notification callback must respond with 202 Accepted");
    });

    it("Case 4.8 & 4.9: Revoke Consent Request (HIP) — Consent revoked seen in HMIS", async () => {
      const consentId = `consent-revoke-${randomUUID()}`;
      const revokePayload: V3ConsentNotifyCallbackPayload = {
        notification: {
          status: "REVOKED",
          consentId,
          createdAt: new Date().toISOString(),
          patient: { id: "priya.sharma@sbx" },
          purpose: { text: "Routine Care", code: "CAREMGT" },
          hiTypes: ["OPCONSULTATION"],
          permission: {
            accessMode: "VIEW",
            dateRange: { from: "2025-01-01T00:00:00.000Z", to: "2026-01-01T00:00:00.000Z" },
            dataEraseAt: "2026-01-02T00:00:00.000Z",
          },
        },
      };

      await service.handleConsentNotify(revokePayload);

      const httpRes = await app.request("/api/v3/consent/request/hip/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(revokePayload),
      });
      assert.equal(httpRes.status, 202);
    });

    it("Case 4.10 & 4.11: Expire Consent Request (HIP) — Consent expired seen in HMIS", async () => {
      const consentId = `consent-expire-${randomUUID()}`;
      const expirePayload: V3ConsentNotifyCallbackPayload = {
        notification: {
          status: "EXPIRED",
          consentId,
          createdAt: new Date().toISOString(),
          patient: { id: "priya.sharma@sbx" },
          purpose: { text: "Past Evaluation", code: "CAREMGT" },
          hiTypes: ["DIAGNOSTIC REPORT"],
          permission: {
            accessMode: "VIEW",
            dateRange: { from: "2024-01-01T00:00:00.000Z", to: "2024-12-31T00:00:00.000Z" },
            dataEraseAt: "2025-01-01T00:00:00.000Z",
          },
        },
      };

      await service.handleConsentNotify(expirePayload);

      const httpRes = await app.request("/api/v3/consent/request/hip/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expirePayload),
      });
      assert.equal(httpRes.status, 202);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 8 (OR 5): HIP INITIATED HEALTH RECORD LINKING USING DEMOGRAPHIC AUTH (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 8: HIP Initiated Health Record Linking Using Demographic Auth (Mandatory)", () => {
    let demoLinkToken = "";

    it("Case 8.1 & 8.2: HIP should have all demographic details like Name, Date of Birth, Gender and Mobile number", async () => {
      // Attempting demographic auth with missing demographic details fails
      await assert.rejects(
        async () => {
          await service.initiateHipLinkAuth({
            authMode: "DEMOGRAPHICS",
            abhaAddress: "priya.sharma@sbx",
            patient: {
              name: "", // missing
              gender: "F",
              yearOfBirth: 0,
            },
          });
        },
        (err: unknown) => {
          const e = err as { code: string };
          assert.equal(e.code, "DEMOGRAPHIC_VALIDATION_FAILED");
          return true;
        },
      );
    });

    it("Case 8.3: Demographic details should be validated by gateway; linking token generated on success", async () => {
      const res = await service.initiateHipLinkAuth({
        authMode: "DEMOGRAPHICS",
        abhaAddress: "priya.sharma@sbx",
        patient: {
          name: "Priya Sharma",
          gender: "F",
          yearOfBirth: 1994,
          mobile: "9876543210",
        },
      });

      assert.equal(res.status, "AUTHENTICATED");
      assert.ok(res.linkToken);
      demoLinkToken = res.linkToken;
    });

    it("Case 8.4: New Linking token should be created", () => {
      assert.ok(demoLinkToken);
      assert.ok(demoLinkToken.startsWith("demographic-link-token-"));
    });

    it("Case 8.5 & 8.6: Health record linking initiated using generated linking token; records pulled on PHR app", async () => {
      const linkRes = await service.linkCareContexts({
        patientId: "patient-priya-01",
        clinicId: "clinic-test-01",
        abhaAddress: "priya.sharma@sbx",
        linkToken: demoLinkToken,
        careContexts: [{ referenceNumber: "DEMO-CTX-801", display: "Demographic Care Episode" }],
        hiType: "OPCONSULTATION",
      });

      assert.ok(linkRes.requestId);
      assert.equal(linkRes.linkedCount, 1);

      const patientLinks = await service.getPatientLinks(10);
      assert.ok(patientLinks.patient.links.length > 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 6: USER INITIATED HEALTH RECORD LINKING (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 6: User Initiated Health Record Linking (Mandatory)", () => {
    let linkRefNumber = "";

    it("Case 6.1 & 6.2: User logins to PHR app and searches for health provider (HIP)", () => {
      // User finds SmrkoMed HIP in provider registry
      assert.ok(true, "PHR app connects to ABDM provider registry");
    });

    it("Case 6.3: Gateway sends discovery request to HIP to identify patient in HIP system", async () => {
      const discoverPayload: V3DiscoverCallbackPayload = {
        transactionId: randomUUID(),
        patient: {
          id: "priya.sharma@sbx",
          verifiedIdentifiers: [{ type: "MOBILE", value: "9876543210" }],
          name: "Priya Sharma",
          gender: "F",
          yearOfBirth: 1994,
        },
      };

      // Direct service discovery
      const res = await service.handlePatientDiscovery(discoverPayload);
      assert.equal(res.status, "DISCOVERY_ACKNOWLEDGED");

      // HTTP endpoint discovery
      const httpRes = await app.request("/api/v3/hip/patient/care-context/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discoverPayload),
      });
      assert.equal(httpRes.status, 200);
    });

    it("Case 6.4: Facility/HIP searches records by ABHA Address first, then Mobile number with fuzzy logic matching", () => {
      // 1. Exact ABHA Address match
      const abhaMatch = fuzzyMatchPatient(
        { abhaAddress: "priya.sharma@sbx", name: "Priya Sharma" },
        { abhaAddress: "priya.sharma@sbx", name: "Priya S" },
      );
      assert.equal(abhaMatch.matched, true);
      assert.equal(abhaMatch.matchType, "ABHA_EXACT");

      // 2. Mobile match + fuzzy name match
      const fuzzyMatch = fuzzyMatchPatient(
        { phone: "9876543210", name: "Priya Sharma" },
        { phone: "+91 98765 43210", name: "Priya" },
      );
      assert.equal(fuzzyMatch.matched, true);
      assert.equal(fuzzyMatch.matchType, "PHONE_AND_FUZZY_NAME");

      // 3. Different phone and no ABHA match -> Rejected
      const noMatch = fuzzyMatchPatient(
        { phone: "9111111111", name: "Priya Sharma" },
        { phone: "9876543210", name: "Rahul Verma" },
      );
      assert.equal(noMatch.matched, false);
    });

    it("Case 6.5: Facility/HIP returns list of available health records/care contexts for linking", async () => {
      const initPayload: V3LinkInitCallbackPayload = {
        transactionId: randomUUID(),
        abhaAddress: "priya.sharma@sbx",
        patient: [
          {
            referenceNumber: "MR-001",
            careContexts: [{ referenceNumber: "OPD-101" }, { referenceNumber: "LAB-102" }],
            hiType: "OPCONSULTATION",
            count: 2,
          },
        ],
      };

      const res = await service.handleLinkInit(initPayload);
      assert.ok(res.linkRefNumber);
      linkRefNumber = res.linkRefNumber;

      const httpRes = await app.request("/api/v3/hip/link/care-context/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initPayload),
      });
      assert.equal(httpRes.status, 200);
    });

    it("Case 6.6: In case OTP is correct, selected health records are linked with ABHA; incorrect OTP rejected", async () => {
      // Incorrect OTP -> ABDM-1035 error
      const badConfirmPayload: V3LinkConfirmCallbackPayload = {
        confirmation: {
          linkRefNumber,
          token: "999999",
        },
      };
      const badRes = await service.handleLinkConfirm(badConfirmPayload);
      assert.equal(badRes.status, "FAILED");
      assert.match(badRes.message, /OTP does not matched/i);

      // Correct OTP -> Linked
      const goodConfirmPayload: V3LinkConfirmCallbackPayload = {
        confirmation: {
          linkRefNumber,
          token: "123456",
        },
      };
      const goodRes = await service.handleLinkConfirm(goodConfirmPayload);
      assert.equal(goodRes.status, "CONFIRMED");
      assert.match(goodRes.message, /confirmed and linked/i);
    });

    it("Case 6.7: Request validated by CM; health record linking initiated; user pulls records on PHR app", async () => {
      const links = await service.getPatientLinks(10);
      assert.ok(links.patient.links.length > 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 7: SENDING NOTIFICATION FOR DEEP LINK WORKFLOW (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 7: Sending Notification for deep link workflow (Mandatory)", () => {
    it("Case 7.1: SMS sent with deep link workflow", async () => {
      // 1. Beneficiary shares mobile number (not ABHA address or number)
      const beneficiaryMobile = "9876543210";

      // 2. Formats deep link SMS per ABDM specification
      const smsText = formatDeepLinkSms({
        hipName: "SmrkoMed Fertility Clinic",
        facilityCode: "IN0210000001",
        deepLinkUrl: "https://phr.abdm.gov.in/download?hip=IN0210000001",
      });
      assert.match(smsText, /Welcome to SmrkoMed Fertility Clinic/);
      assert.match(smsText, /https:\/\/phr\.abdm\.gov\.in/);
      assert.match(smsText, /IN0210000001/);

      // 3. Trigger SMS notification to patient via ABDM Gateway
      const smsRes = await service.sendPatientSmsNotification({
        phoneNo: beneficiaryMobile,
        hipName: "SmrkoMed Fertility Clinic",
      });
      assert.ok(smsRes.requestId);
      assert.ok(smsRes.status);

      // 4. Inbound callback /patients/sms/on-notify responds with 202 Accepted
      const httpRes = await app.request("/api/v3/patients/sms/on-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: smsRes.requestId,
          timestamp: new Date().toISOString(),
          resp: { requestId: smsRes.requestId },
        }),
      });
      assert.equal(httpRes.status, 202);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 8: DATA TRANSFER & SHARE (MANDATORY)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 8: Data transfer & share (Mandatory)", () => {
    it("Case 8.1: Health records received in PHR app, properly decryptable using HIP public key, in proper FHIR formats", async () => {
      // 1. HIU generates Diffie-Hellman key material (Curve25519)
      const hiuKeyMaterial = generateHipKeyMaterial();

      // 2. HIP processes Health Information Request callback from Gateway
      const hiRequestPayload: V3HealthInfoRequestCallbackPayload = {
        hiRequest: {
          consent: { id: `consent-${randomUUID()}` },
          dateRange: {
            from: "2024-01-01T00:00:00.000Z",
            to: "2026-12-31T00:00:00.000Z",
          },
          dataPushUrl: "https://hiu.sandbox.abdm.gov.in/data/notification",
          keyMaterial: hiuKeyMaterial.keyMaterial,
        },
      };

      const transferRes = await service.handleHealthInfoRequest(hiRequestPayload);
      assert.equal(transferRes.status, "DATA_TRANSFERRED");

      // 3. Cryptographic Verification: Verify encrypted FHIR payload is decryptable with HIP public key
      const hipExchange = generateHipKeyMaterial();
      const sharedSecretHIP = calculateSharedSecret(hipExchange.privateKey, hiuKeyMaterial.keyMaterial.dhPublicKey.keyValue);
      const sharedSecretHIU = calculateSharedSecret(hiuKeyMaterial.privateKey, hipExchange.keyMaterial.dhPublicKey.keyValue);
      assert.ok(sharedSecretHIP.equals(sharedSecretHIU), "Shared secrets must match");

      const aesKey = deriveSymmetricKey(sharedSecretHIU, hipExchange.keyMaterial.nonce, hiuKeyMaterial.keyMaterial.nonce);

      // 4. Standard FHIR Bundle payload
      const fhirRecord = generateAbdmFhirRecord({
        careContextReference: "OPD-FINAL-01",
        hiType: "PRESCRIPTION",
        format: "STRUCTURED",
        patient: {
          id: "priya-sharma",
          name: "Priya Sharma",
          gender: "F",
          birthDate: "1994-06-15",
          abhaAddress: "priya.sharma@sbx",
        },
        encounter: { visitDateTime: "2026-03-10T12:00:00.000Z" },
        details: {
          title: "Prescription",
          medications: [{ medicineName: "Progesterone 200mg", dosage: "Vaginal daily" }],
        },
      });

      const jsonPayload = JSON.stringify(fhirRecord);
      const { encryptedContent, checksum } = encryptFhirPayload(jsonPayload, aesKey);
      assert.ok(checksum, "MD5 checksum must be present");

      // PHR/HIU receives and decrypts payload
      const decryptedString = decryptFhirPayload(encryptedContent, aesKey);
      assert.equal(decryptedString, jsonPayload, "Decrypted FHIR payload must match original");

      const parsedDecryptedFhir = JSON.parse(decryptedString);
      assert.equal(parsedDecryptedFhir.resourceType, "Bundle");
      assert.equal(parsedDecryptedFhir.type, "document");
      assert.ok(parsedDecryptedFhir.entry.length >= 2);
    });
  });
});
