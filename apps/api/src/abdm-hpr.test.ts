import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateKeyPairSync } from "node:crypto";

import { Hono } from "hono";
import { PERMISSIONS } from "@smrkomed/database";

import {
  encryptWithHprPublicKey,
  formatPublicKeyPem,
} from "./modules/digital-health/abdm-v3-crypto";
import { AbdmV3HttpClient } from "./modules/digital-health/abdm-v3-client";
import { AbdmHprService } from "./modules/digital-health/abdm-hpr-service";
import { hprRoutes } from "./modules/digital-health/hpr-routes";
import {
  HPR_CATEGORY_CODES,
  HPR_SUBCATEGORY_CODES,
  HPR_WORK_STATUS,
} from "./modules/digital-health/abdm-hpr-types";
import type { AppEnv } from "./types";


describe("ABDM HPR (Healthcare Professionals Registry) Module", () => {
  const service = new AbdmHprService();

  // Force demo mode for deterministic testing without external sandbox connection
  process.env["ABDM_DEMO_MODE"] = "1";

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CRYPTOGRAPHY TESTS (RSA/ECB/PKCS1Padding)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Cryptography", () => {
    it("encrypts data conforming to RSA/ECB/PKCS1Padding (RS512)", () => {
      const { publicKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
      });

      const pubPem = publicKey.export({ type: "spki", format: "pem" }).toString();

      const plainText = "350991"; // Sample OTP
      const cipherText = encryptWithHprPublicKey(pubPem, plainText);

      assert.ok(typeof cipherText === "string");
      assert.ok(cipherText.length > 50);
      assert.notEqual(cipherText, plainText);
      assert.match(cipherText, /^[A-Za-z0-9+/=]+$/);
    });


    it("constructs correct HSP base URLs for sandbox and production", () => {
      const origEnv = process.env["ABDM_ENV"];
      try {
        process.env["ABDM_ENV"] = "sandbox";
        const sbxClient = new AbdmV3HttpClient();
        assert.equal(sbxClient.getHspBaseUrl(), "https://apihspsbx.abdm.gov.in");

        process.env["ABDM_ENV"] = "production";
        const prodClient = new AbdmV3HttpClient();
        assert.equal(prodClient.getHspBaseUrl(), "https://apihsp.abdm.gov.in");
      } finally {
        if (origEnv !== undefined) process.env["ABDM_ENV"] = origEnv;
        else delete process.env["ABDM_ENV"];
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & LOGIN WORKFLOWS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Authentication & Login", () => {
    it("logs in with password and receives HPR session token", async () => {
      const res = await service.loginWithPassword({
        hprId: "kapil.saraswat@hpr.abdm",
        password: "SecretPassword123!",
      });

      assert.ok(res.token);
      assert.ok(res.token.startsWith("mock-hpr-token-"));
      assert.equal(res.tokenType, "bearer");
      assert.ok((res.expiresIn ?? 0) > 0);
    });

    it("rejects login with missing credentials", async () => {
      await assert.rejects(
        async () => {
          await service.loginWithPassword({ hprId: "", password: "" });
        },
        { name: "AbdmV3ClientError", code: "INVALID_CREDENTIALS" },
      );
    });

    it("executes login via Mobile OTP workflow (send, verify, authorize token)", async () => {
      // Step 1: Send Mobile OTP
      const sendRes = await service.sendLoginMobileOtp("9900005000");
      assert.ok(sendRes.txnId);
      assert.equal(sendRes.mobileNumber, "******5000");

      // Step 2: Verify Mobile OTP
      const verifyRes = await service.verifyLoginMobileOtp({
        otp: "123456",
        txnId: sendRes.txnId,
      });
      assert.equal(verifyRes.txnId, sendRes.txnId);
      assert.ok(Array.isArray(verifyRes.mobileLinkedHpIdDTO));
      assert.ok(verifyRes.mobileLinkedHpIdDTO.length > 0);
      assert.ok(verifyRes.mobileLinkedHpIdDTO[0]?.hprIdNumber);

      // Step 3: Authorize User Token
      const tokenRes = await service.authorizeUserToken({
        hpId: verifyRes.mobileLinkedHpIdDTO[0]!.hprId,
        txnId: verifyRes.txnId,
      });
      assert.ok(tokenRes.token);
      assert.ok(tokenRes.token.startsWith("mock-hpr-auth-token-"));
    });

    it("executes login via Aadhaar OTP workflow (init, confirm)", async () => {
      // Step 1: Init Aadhaar OTP
      const initRes = await service.initAadhaarLogin("71-6347-4142-2778");
      assert.ok(initRes.txnId);
      assert.equal(initRes.mobileNumber, "******5860");

      // Step 2: Confirm Aadhaar OTP
      const confirmRes = await service.confirmAadhaarLogin({
        otp: "350991",
        txnId: initRes.txnId!,
      });
      assert.ok(confirmRes.token);
      assert.ok(confirmRes.token.startsWith("mock-hpr-aadhaar-token-"));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REGISTRATION IN HPR WORKFLOW (DOCTOR & NURSE)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Registration Flow", () => {
    it("validates 12-digit Aadhaar number during OTP generation", async () => {
      await assert.rejects(
        async () => {
          await service.generateAadhaarRegistrationOtp("12345");
        },
        { name: "AbdmV3ClientError", code: "INVALID_AADHAAR" },
      );

      const res = await service.generateAadhaarRegistrationOtp("123456789012");
      assert.ok(res.txnId);
      assert.equal(res.mobileNumber, "9999999999");
    });

    it("verifies Aadhaar OTP and checks existing HPID account", async () => {
      const otpRes = await service.generateAadhaarRegistrationOtp("999988887777");
      const verifyRes = await service.verifyAadhaarRegistrationOtp({
        otp: "123456",
        txnId: otpRes.txnId,
      });
      assert.equal(verifyRes.txnId, otpRes.txnId);

      const checkRes = await service.checkHpIdAccountExist(verifyRes.txnId);
      assert.equal(checkRes.txnId, verifyRes.txnId);
      assert.equal(checkRes.name, "Dr. Demo Candidate");
      assert.equal(checkRes.new, true);
    });

    it("handles demographic authentication and mobile OTP verification", async () => {
      const demoAuthRes = await service.demographicAuthViaMobile({
        mobileNumber: "9876543210",
        txnId: "txn-1234",
      });
      assert.equal(demoAuthRes.verified, true);

      const mobileOtpRes = await service.generateRegistrationMobileOtp({
        mobile: "9876543210",
        txnId: "txn-1234",
      });
      assert.equal(mobileOtpRes.txnId, "txn-1234");

      const verifyMobileRes = await service.verifyRegistrationMobileOtp({
        otp: "654321",
        txnId: mobileOtpRes.txnId,
      });
      assert.equal(verifyMobileRes.txnId, "txn-1234");
    });

    it("provides username suggestions and creates HPR ID with pre-verified data", async () => {
      const suggestions = await service.getHprIdSuggestions("txn-demo");
      assert.ok(Array.isArray(suggestions));
      assert.ok(suggestions.length > 0);

      const createRes = await service.createHprId({
        txnId: "txn-demo",
        email: "doctor.demo@hospital.org",
        firstName: "Demo",
        lastName: "Doctor",
        password: "StrongPassword123!",
        hpCategoryCode: HPR_CATEGORY_CODES.DOCTOR,
        hpSubCategoryCode: HPR_SUBCATEGORY_CODES.MODERN_MEDICINE,
      });

      assert.ok(createRes.token);
      assert.ok(createRes.hprIdNumber.startsWith("71-"));
      assert.equal(createRes.firstName, "Demo");
      assert.equal(createRes.categoryId, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FACILITY SEARCH & PROFESSIONAL DETAILS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Facility Search & Professional Details", () => {
    it("searches facilities in HFR registry", async () => {
      const res = await service.searchFacilities({
        facilityName: "Apollo",
        stateLGDCode: "7",
      });

      assert.ok(Array.isArray(res.facilities));
      assert.equal(res.totalFacilities, 1);
      assert.equal(res.facilities[0]?.facilityId, "IN2710000059");
      assert.equal(res.facilities[0]?.systemOfMedicineCode, "M");
    });

    it("registers and updates professional profiles (Doctor and Nurse)", async () => {
      // Register doctor
      const regRes = await service.registerProfessional({
        hprToken: "valid-hpr-token",
        practitioner: {
          healthProfessionalType: "doctor",
          personalInformation: {
            salutation: 1,
            firstName: "Rajesh",
            lastName: "Sharma",
            nationality: "356",
            gender: "M",
            dateOfBirth: "1985-05-15",
            languagesSpoken: "1,2",
          },
          communicationAddress: {
            isCommunicationAddressAsPerKYC: "false",
            address: "123 Medical Row",
            pincode: "110001",
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
            chooseWorkStatus: HPR_WORK_STATUS.GOVERNMENT_ONLY,
          },
        },
      });

      assert.equal(regRes.statusCode, "OK");
      assert.equal(regRes.statusCodeValue, 200);
      assert.ok(regRes.body.hprId.startsWith("71-"));

      // Fetch professional info
      const fetchRes = await service.fetchProfessionalInfo({
        practitioner: { id: regRes.body.hprId },
      });
      assert.equal(fetchRes.Message, "Data fetched successfully");
      assert.ok(Array.isArray(fetchRes.practitioners));
      assert.equal(fetchRes.practitioners[0]?.[0]?.hpr_id, regRes.body.hprId);

      // Update professional details
      const updateRes = await service.updateProfessional({
        hprToken: "valid-hpr-token",
        practitioner: {
          healthProfessionalType: "doctor",
          personalInformation: {
            salutation: 1,
            firstName: "Rajesh",
            lastName: "Sharma",
            nationality: "356",
            gender: "M",
            dateOfBirth: "1985-05-15",
            languagesSpoken: "1,2,3",
          },
          communicationAddress: {
            isCommunicationAddressAsPerKYC: "false",
            address: "456 Updated Clinic St",
            pincode: "110001",
          },
          registrationAcademic: {
            category: 1,
            registrationData: [],
          },
          currentWorkDetails: {
            currentlyWorking: "1",
            purposeOfWork: "Practice",
            chooseWorkStatus: HPR_WORK_STATUS.PRIVATE,
          },
        },
      });
      assert.equal(updateRes.statusCode, "OK");
      assert.equal(updateRes.body.status, "true");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. DOCUMENT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Document Management", () => {
    it("retrieves professional document list", async () => {
      const res = await service.fetchDocumentsList("71-9999-9999-1358");
      assert.equal(res.Message, "Data fetched successfully");
      assert.ok(res.documentList.profileDetails?.profilePhoto);
      assert.equal(res.documentList.profileDetails.profilePhoto.id, 40169);
    });

    it("uploads documents with validation of allowed formats and sizes", async () => {
      const validPhotoBase64 = Buffer.from("fake-jpeg-photo-content").toString("base64");
      const validCertBase64 = Buffer.from("fake-pdf-cert-content").toString("base64");

      const uploadRes = await service.uploadDocuments({
        hpr_token: "mock-token",
        document: [
          {
            document_id: 40169,
            document_type: "profilePhoto",
            fileType: "image/jpeg",
            data: validPhotoBase64,
          },
          {
            document_id: 13953,
            document_type: "degreeCertificate",
            fileType: "application/pdf",
            data: validCertBase64,
          },
        ],
      });

      assert.ok(uploadRes["profilePhoto"]);
      assert.equal(uploadRes["profilePhoto"]?.status, "pass");
      assert.ok(uploadRes["degreeCertificate"]);
      assert.equal(uploadRes["degreeCertificate"]?.status, "pass");
    });


    it("rejects unsupported document formats", async () => {
      await assert.rejects(
        async () => {
          await service.uploadDocuments({
            hpr_token: "mock-token",
            document: [
              {
                document_id: 1234,
                document_type: "degreeCertificate",
                fileType: "application/exe",
                data: Buffer.from("fake-exe").toString("base64"),
              },
            ],
          });
        },
        { name: "AbdmV3ClientError", code: "UNSUPPORTED_FILE_TYPE" },
      );
    });

    it("enforces maximum file size limit (1 MB for profile photo)", async () => {
      // Create a dummy payload larger than 1 MB
      const oversizedPhoto = Buffer.alloc(1.2 * 1024 * 1024).toString("base64");

      await assert.rejects(
        async () => {
          await service.uploadDocuments({
            hpr_token: "mock-token",
            document: [
              {
                document_id: 1234,
                document_type: "profilePhoto",
                fileType: "image/jpeg",
                data: oversizedPhoto,
              },
            ],
          });
        },
        { name: "AbdmV3ClientError", code: "FILE_TOO_LARGE" },
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. UPDATE EMAIL ADDRESS WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Email Address Verification", () => {
    it("executes email OTP generation, resend, and verification", async () => {
      // Step 1: Generate Email OTP
      const genRes = await service.generateEmailVerificationOtp({
        hpr_token: "mock-hpr-token",
        emailAddress: "kapil.saraswat992@gmail.com",
      });
      assert.equal(genRes.status, "success");
      assert.equal(genRes.msg, "Mail sent successfully");

      // Step 2: Resend Email OTP
      const resendRes = await service.resendEmailVerificationOtp({
        hpr_token: "mock-hpr-token",
        emailAddress: "kapil.saraswat992@gmail.com",
      });
      assert.equal(resendRes.emailAddress, "kapil.saraswat992@gmail.com");

      // Step 3: Verify Email OTP
      const verifyRes = await service.verifyEmailOtp({
        hpr_token: "mock-hpr-token",
        hpr_id: "71-6347-4142-2778",
        officialEmail: "kapil.saraswat992@gmail.com",
        emailOtp: 103913,
      });
      assert.equal(verifyRes.status, "pass");
      assert.equal(verifyRes.msg, "Email Verified");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. REST API ROUTES INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR REST API Routes", () => {
    const testApp = new Hono<AppEnv>();
    testApp.use("*", async (c, next) => {
      c.set("tenant", {
        userId: "user_test_1",
        organizationId: "org_test_1",
        organizationName: "Test Organization",
        clinicId: "clinic_test_1",
        clinicName: "Test Clinic",
        role: "CLINIC_ADMIN",
      });
      c.set("claims", {
        id: "user_test_1",
        email: "admin@smrkomed.com",
        organizationId: "org_test_1",
        organizationName: "Test Organization",
        clinicId: "clinic_test_1",
        clinicName: "Test Clinic",
        role: "CLINIC_ADMIN",
      });
      await next();
    });

    testApp.route("/hpr", hprRoutes);

    it("POST /hpr/auth/password returns auth token", async () => {
      const res = await testApp.request("/hpr/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hprId: "kapilku.aswat@hpr.abdm",
          password: "K@pil&&&&2",
        }),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { data: { token: string } };
      assert.ok(data.data?.token);
    });

    it("POST /hpr/facilities/search returns facilities list", async () => {
      const res = await testApp.request("/hpr/facilities/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityName: "Apollo",
        }),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { data: { facilities: unknown[] } };
      assert.ok(Array.isArray(data.data?.facilities));
    });

    it("POST /hpr/documents/list returns document details", async () => {
      const res = await testApp.request("/hpr/documents/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hprid: "71-9999-9999-1358",
        }),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { data: { Message: string } };
      assert.equal(data.data?.Message, "Data fetched successfully");
    });

    it("GET /hpr/account/information returns profile details", async () => {
      const res = await testApp.request("/hpr/account/information", {
        method: "GET",
        headers: { Authorization: "Bearer mock-test-token" },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { data: { hprIdNumber: string } };
      assert.ok(data.data?.hprIdNumber.startsWith("71-"));
    });

    it("GET /hpr/account/id-card returns base64 PDF", async () => {
      const res = await testApp.request("/hpr/account/id-card", {
        method: "GET",
        headers: { Authorization: "Bearer mock-test-token" },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { data: { pdf: string } };
      assert.ok(data.data?.pdf.startsWith("JVBER"));
    });

    it("GET /hpr/account/logout logs out session", async () => {
      const res = await testApp.request("/hpr/account/logout", {
        method: "GET",
        headers: { Authorization: "Bearer mock-test-token" },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { data: { message: string } };
      assert.match(data.data?.message, /LoggedOut/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. UPDATE MOBILE VIA API
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Update Mobile via API", () => {
    it("generates, regenerates, and verifies mobile update OTP", async () => {
      const genRes = await service.generateUpdateMobileOtp({
        hpr_token: "mock-hpr-token",
        officialMobile: "9876543210",
      });
      assert.equal(genRes.status, "success");
      assert.ok(genRes.txnId);

      const regenRes = await service.regenerateUpdateMobileOtp({
        hpr_token: "mock-hpr-token",
        officialMobile: "9876543210",
      });
      assert.equal(regenRes.status, "success");
      assert.ok(regenRes.txnId);

      const verifyRes = await service.verifyUpdateMobileOtp({
        hpr_token: "mock-hpr-token",
        txnId: genRes.txnId,
        otp: "123456",
      });
      assert.equal(verifyRes.status, "success");
      assert.equal(verifyRes.msg, "Success");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. PASSWORD MANAGEMENT & RECOVERY
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Password Management & Recovery", () => {
    it("recovers password via Mobile OTP workflow", async () => {
      const sendRes = await service.recoverPasswordSendMobileOtp("amol.hudekar");
      assert.ok(sendRes.txnId);
      assert.match(sendRes.msg, /OTP/i);

      const verifyRes = await service.recoverPasswordVerifyMobileOtp({
        txnId: sendRes.txnId,
        otp: "123456",
      });
      assert.equal(verifyRes.verified, true);

      const resetRes = await service.resetPassword({
        txnId: verifyRes.txnId,
        newPassword: "NewSecretPassword123!",
      });
      assert.match(resetRes.message, /changed successfully/i);
    });

    it("recovers password via Aadhaar-linked mobile workflow", async () => {
      const sendRes = await service.recoverPasswordByAadhaar("71-3663-1868-2415");
      assert.ok(sendRes.txnId);
      assert.equal(sendRes.mobileNumber, "******8063");

      const confirmRes = await service.recoverPasswordConfirmByAadhaar({
        txnId: sendRes.txnId,
        otp: "123456",
      });
      assert.equal(confirmRes.verified, true);
    });

    it("changes password with old password after login", async () => {
      const res = await service.changePasswordWithOldPassword({
        token: "mock-auth-token",
        oldPassword: "OldPassword123!",
        newPassword: "BrandNewPassword123!",
      });
      assert.match(res.message, /changed successfully/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. FORGOT HPR ID WORKFLOWS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Forgot ID", () => {
    it("retrieves HPR ID via Aadhaar OTP", async () => {
      const genRes = await service.forgotIdAadhaarGenerateOtp({
        aadhaar: "123456789012",
        iagree: true,
      });
      assert.ok(genRes.txnId);
      assert.equal(genRes.verified, false);

      const verifyRes = await service.forgotIdAadhaarVerifyOtp({
        otp: "350991",
        txnId: genRes.txnId,
      });
      assert.equal(verifyRes.hprId, "amol.hudekar@hpr.abdm");
      assert.ok(verifyRes.hprIdNumber.startsWith("71-"));
    });

    it("retrieves HPR ID via Mobile OTP and demographic confirmation", async () => {
      const genRes = await service.forgotIdMobileGenerateOtp("9999999999");
      assert.ok(genRes.txnId);

      const verifyRes = await service.forgotIdMobileVerifyOtp({
        otp: "654321",
        txnId: genRes.txnId,
        firstName: "Amol",
        yearOfBirth: "1990",
        monthOfBirth: "04",
        dayOfBirth: "24",
        gender: "M",
      });
      assert.equal(verifyRes.hprId, "amol@hpr.abdm");
      assert.ok(verifyRes.hprIdNumber.startsWith("71-"));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. SEARCH HPRID DOCUMENT API
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Search HPRID Document API", () => {
    it("checks if an HPR ID exists", async () => {
      const exists = await service.checkHprIdExists("amol.hudekar");
      assert.equal(exists, true);
    });

    it("rejects check with blank HPR ID", async () => {
      await assert.rejects(
        async () => {
          await service.checkHprIdExists("");
        },
        { name: "AbdmV3ClientError", code: "INVALID_HPR_ID" },
      );
    });

    it("searches HPR ID details by HPR ID", async () => {
      const record = await service.searchHprId("amol.hudekar@hpr.abdm");
      assert.ok(record.hprIdNumber.startsWith("71-"));
      assert.equal(record.name, "Dr. Amol Hudekar");
      assert.ok(Array.isArray(record.authMethods));
      assert.ok(record.authMethods.includes("PASSWORD"));
      assert.ok(record.authMethods.includes("MOBILE_OTP"));
    });

    it("searches HPR ID details by mobile number", async () => {
      const list = await service.searchHprByMobile("9042703499");
      assert.ok(Array.isArray(list));
      assert.ok(list.length > 0);
      assert.equal(list[0]?.hprId, "amol.hudekar@hpr.abdm");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. MASTER DATA (HPR) VIA APIS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR Master Data APIs", () => {
    it("fetches systems of medicine", async () => {
      const list = await service.getSystemsOfMedicine();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 7);
      assert.ok(list.some((s) => s.code === "modern_medicine"));
      assert.ok(list.some((s) => s.code === "ayurveda"));
    });

    it("fetches medical councils", async () => {
      const councils = await service.getMedicalCouncils();
      assert.ok(Array.isArray(councils));
      assert.ok(councils.length > 0);
      assert.ok(councils.some((c) => c.name.includes("Medical Council") || c.name.includes("Medical Commission")));
    });

    it("fetches languages and specific language", async () => {
      const allLangs = (await service.getLanguages()) as any[];
      assert.ok(Array.isArray(allLangs));
      assert.ok(allLangs.length > 0);

      const singleLang = (await service.getLanguages(1)) as any;
      assert.equal(singleLang.id, 1);
      assert.equal(singleLang.name, "English");
    });

    it("fetches universities with and without collegeId", async () => {
      const univs = await service.getUniversities(76);
      assert.ok(Array.isArray(univs));
      assert.ok(univs.length > 0);
      assert.equal(univs[0]?.collegeId, 76);
    });

    it("fetches colleges by state and system of medicine", async () => {
      const colleges = await service.getColleges(1, "Modern Medicine");
      assert.ok(Array.isArray(colleges));
      assert.ok(colleges.length > 0);
      assert.equal(colleges[0]?.stateId, 1);
    });

    it("fetches courses master list", async () => {
      const courses = await service.getCourses({ systemOfMedicine: "Modern Medicine", hprType: "doctor" });
      assert.ok(Array.isArray(courses));
      assert.ok(courses.length > 0);
      assert.ok(courses.some((c) => c.name.includes("Mbbs") || c.name.includes("Diploma")));
    });

    it("fetches countries, states, districts, and sub-districts", async () => {
      const country = (await service.getCountries(356)) as any;
      assert.equal(country.id, 356);
      assert.equal(country.alpha_2_code, "IN");

      const states = (await service.getStates()) as any[];
      assert.ok(Array.isArray(states));
      assert.ok(states.length > 0);

      const districts = await service.getDistricts(1);
      assert.ok(Array.isArray(districts));
      assert.ok(districts.length > 0);

      const subDistricts = await service.getSubDistricts(603);
      assert.ok(Array.isArray(subDistricts));
      assert.ok(subDistricts.length > 0);
    });

    it("fetches nurse boards, councils, and colleges", async () => {
      const boards = await service.getNurseAffiliatedBoards();
      assert.ok(Array.isArray(boards));
      assert.ok(boards.length > 0);

      const councils = await service.getNurseCouncils();
      assert.ok(Array.isArray(councils));
      assert.ok(councils.length > 0);

      const colleges = await service.getNurseCollegesByState(27);
      assert.ok(Array.isArray(colleges));
      assert.ok(colleges.length > 0);

      const stateBoards = await service.getAffiliatedBoardsByState(20);
      assert.ok(Array.isArray(stateBoards));
      assert.ok(stateBoards.length > 0);
    });

    it("fetches ministries, categories, and subcategories", async () => {
      const ministries = await service.getAllMinistry();
      assert.ok(Array.isArray(ministries));
      assert.ok(ministries.length > 0);
      assert.ok(ministries[0]?.ministry);

      const categories = await service.getHprCategories(1);
      assert.ok(Array.isArray(categories));
      assert.ok(categories.length > 0);

      const subCategories = await service.getHprSubCategories(1, 1);
      assert.ok(Array.isArray(subCategories));
      assert.ok(subCategories.length > 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. HEALTH FACILITY REGISTRY (HFR) APIS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Health Facility Registry (HFR) APIs", () => {
    it("searches facilities with criteria and pagination", async () => {
      const res = await service.searchHfrFacility({
        ownershipCode: "P",
        stateLGDCode: "33",
        facilityName: "ABC Hospital",
        page: 1,
        resultsPerPage: 10,
      });
      assert.ok(Array.isArray(res.facilities));
      assert.ok(res.facilities.length > 0);
      assert.equal(res.totalFacilities, 1);
    });

    it("executes the facility onboarding lifecycle (basic, additional, detailed, submit)", async () => {
      // Step 1: Basic Facility Information API
      const basicRes = await service.onboardBasicFacilityInfo(
        {
          facilityInformation: {
            facilityName: "Metro Super Speciality Hospital",
            facilityAddressDetails: {
              country: "India",
              stateLGDCode: "33",
              districtLGDCode: "568",
              subDistrictLGDCode: "5704",
              addressLine1: "Temple Street",
              pincode: "600107",
              latitude: "24.068570",
              longitude: "24.068570",
            },
            facilityContactInformation: {
              facilityEmailId: "contact@metrohospital.org",
              facilityContactNumber: "9042703499",
            },
            ownershipCode: "G",
            ownershipSubTypeCode: "S",
            systemOfMedicineCode: "M,D",
            facilityTypeCode: "5",
            facilityOperationalStatus: "F",
          },
        },
        "mock-hpr-facility-manager-token",
      );
      assert.ok(basicRes.trackingId);
      assert.match(basicRes.status, /success|Created/i);

      // Step 2: Additional Information API
      const addRes = await service.onboardAdditionalFacilityInfo({
        trackingId: basicRes.trackingId,
        generalInformation: {
          hasDialysisCenter: "Y",
          hasPharmacy: "Y",
          hasBloodBank: "N",
          hasCathLab: "N",
          hasDiagnosticLab: "Y",
          hasImagingCenter: "N",
        },
        linkedProgramIds: {
          nhrrId: "NHRR-12345",
          nin: "NIN-67890",
        },
      });
      assert.equal(addRes.trackingId, basicRes.trackingId);
      assert.match(addRes.status, /Created/i);

      // Step 3: Detailed Information API
      const detailRes = await service.onboardDetailedFacilityInfo({
        trackingId: basicRes.trackingId,
        specialities: [
          {
            systemOfMedicineCode: "M",
            isSpecializationAvalaible: "Yes",
            specialities: ["M-S1", "M-S6"],
          },
        ],
        pharmacyDetails: {
          isJanAushadhiKendra: "N",
          drugLicenseNumber: "DL-12345",
        },
      });
      assert.equal(detailRes.trackingId, basicRes.trackingId);
      assert.match(detailRes.status, /Saved/i);

      // Step 4: Submit Facility API
      const submitRes = await service.submitFacility(
        {
          trackingId: basicRes.trackingId,
        },
        "mock-hpr-facility-manager-token",
      );
      assert.ok(submitRes.facilityId);
      assert.ok(submitRes.facilityId!.startsWith("IN"));
      assert.equal(submitRes.status, "Created");
    });

    it("fetches HFR utilities and master data (types, data, LGD)", async () => {
      const types = await service.getHfrMasterTypes();
      assert.ok(Array.isArray(types.masterTypes));
      assert.ok(types.masterTypes.some((t) => t.type === "MEDICINE"));

      const ownerData = await service.getHfrMasterData("OWNER");
      assert.equal(ownerData.type, "OWNER");
      assert.ok(ownerData.data.some((d) => d.code === "G"));

      const states = await service.getHfrLgdStates();
      assert.ok(Array.isArray(states));
      assert.ok(states.length > 0);

      const districts = await service.getHfrLgdDistricts("33");
      assert.ok(Array.isArray(districts));
      assert.ok(districts.length > 0);

      const subDistricts = await service.getHfrLgdSubDistricts("568");
      assert.ok(Array.isArray(subDistricts));
      assert.ok(subDistricts.length > 0);
    });

    it("fetches HFR facility types, owner subtypes, specialities, and facility subtypes", async () => {
      const facTypes = await service.fetchHfrFacilityType({ ownershipCode: "P", systemOfMedicineCode: "M" });
      assert.ok(Array.isArray(facTypes.data));
      assert.ok(facTypes.data.some((f) => f.value === "Hospital"));

      const ownerSubtypes = await service.getHfrOwnerSubtypes({ ownershipCode: "G", ownerSubtypeCode: "C" });
      assert.ok(Array.isArray(ownerSubtypes.data));

      const specialities = await service.getHfrSpecialities({ systemOfMedicineCode: "M" });
      assert.ok(Array.isArray(specialities.data));
      assert.ok(specialities.data.some((s) => s.code === "M-S1"));

      const subTypes = await service.fetchHfrFacilitySubtype({ facilityTypeCode: "5" });
      assert.ok(Array.isArray(subTypes.data));
    });

    it("links multiple HRP bridges to a facility", async () => {
      const res = await service.linkMultipleHrp({
        facilityId: "IN2810002708",
        facilityName: "Test Hospital 104",
        HRP: [
          {
            bridgeId: "SBX_000135",
            hipName: "Test Hospital 104",
            type: "HIP",
            active: true,
          },
        ],
      });
      assert.ok(Array.isArray(res));
      assert.ok(res.length > 0);
      assert.equal(res[0]?.servicesLinked?.id, "SBX_000135");
    });

    it("sends and validates OTP for facility contact", async () => {
      // Invalid format validation
      await assert.rejects(
        async () => {
          await service.sendFacilityContactOtp("IP2810002718");
        },
        { name: "AbdmV3ClientError", code: "INVALID_FACILITY_ID" },
      );

      // Valid OTP send
      const sendRes = (await service.sendFacilityContactOtp("IN2810002718")) as any[];
      assert.ok(Array.isArray(sendRes));
      assert.equal(sendRes[0]?.status, "Success");
      assert.ok(sendRes[0]?.transactionId);

      // Validate OTP
      const validateRes = (await service.validateFacilityContactOtp({
        facilityId: "IN2810002718",
        sourceId: "COWIN",
        otp: "123456",
        source: "COWIN",
        transactionId: sendRes[0]!.transactionId,
      })) as any[];
      assert.ok(Array.isArray(validateRes));
      assert.equal(validateRes[0]?.status, "success");
    });

    it("fetches facility contact details", async () => {
      const res = await service.getFacilityContactDetails("IN2710002921");
      assert.equal(res.status, "Success");
      assert.ok(res.facility);
      assert.equal(res.facility.facilityId, "IN2710002921");
      assert.ok(res.facility.contactName);
    });

    it("fetches details and validates OTP for UWIN", async () => {
      const details = await service.getFacilityDetailsForUwin({
        facilityId: "IN2410001111",
        source: "UWIN",
        sourceId: "UWIN",
      });
      assert.equal(details.status, "Success");
      assert.ok(details.facility);

      const valRes = await service.validateUwinOtp({
        facilityId: "IN2410001111",
        sourceId: "UWIN",
        otp: "150779",
        source: "UWIN",
        transactionId: "66de14f5-bf59-4144-bf55-abaea14cef23",
      });
      assert.equal(valRes.status, "success");
    });

    it("deduplicates facilities by name, district, and subdistrict", async () => {
      const res = await service.deduplicateFacility({
        name: "Test Hospital",
        district: "499",
        subDistrict: "3997",
      });
      assert.ok(Array.isArray(res));
      assert.ok(res.length > 0);
      assert.ok(res[0]?.alternate_id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 14. HTTP ROUTE INTEGRATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("HPR & HFR HTTP Routes", () => {
    const app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("tenant", {
        organizationId: "org_test",
        clinicId: "clinic_test",
        userId: "user_test",
        role: "DOCTOR",
        membershipId: "mem_test",
      } as any);
      await next();
    });
    app.route("/hpr", hprRoutes);

    it("GET /hpr/search/exists/:hprId returns status 200 with exists boolean", async () => {
      const res = await app.request("/hpr/search/exists/amol.hudekar");
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.data.exists, true);
    });

    it("GET /hpr/search/hpr-id/:hprId returns status 200 with record", async () => {
      const res = await app.request("/hpr/search/hpr-id/amol.hudekar@hpr.abdm");
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.data.name, "Dr. Amol Hudekar");
    });

    it("GET /hpr/masters/systems-of-medicine returns status 200 with list", async () => {
      const res = await app.request("/hpr/masters/systems-of-medicine");
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(Array.isArray(data.data));
    });

    it("POST /hpr/facility/basic-information returns status 200 with trackingId", async () => {
      const res = await app.request("/hpr/facility/basic-information", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hprid-auth": "mock-hpr-token",
        },
        body: JSON.stringify({
          facilityInformation: {
            facilityName: "City Hospital",
          },
        }),
      });
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(data.data.trackingId);
    });

    it("POST /hpr/facility/send-otp-to-contact returns status 200 with transactionId", async () => {
      const res = await app.request("/hpr/facility/send-otp-to-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: "IN2810002718",
        }),
      });
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(Array.isArray(data.data));
      assert.equal(data.data[0]?.status, "Success");
    });

    it("POST /hpr/facility/deduplicate returns status 200 with matching facilities", async () => {
      const res = await app.request("/hpr/facility/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Apollo Clinic",
          district: "568",
          subDistrict: "5704",
        }),
      });
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.ok(Array.isArray(data.data));
    });
  });
});


