import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";

import { createApp } from "./app";
import {
  calculateSharedSecret,
  decryptFhirPayload,
  deriveSymmetricKey,
  encryptFhirPayload,
  generateHipKeyMaterial,
  importCurve25519PublicKey,
} from "./modules/digital-health/abdm-v3-data-crypto";
import { abdmV3Client } from "./modules/digital-health/abdm-v3-client";
import { abdmV3Service } from "./modules/digital-health/abdm-v3-service";
import {
  ABDM_ERROR_CODES,
  ABDM_HIT_TYPES,
  type V3DiscoverCallbackPayload,
  type V3HealthInfoRequestCallbackPayload,
  type V3LinkConfirmCallbackPayload,
  type V3LinkInitCallbackPayload,
  type V3ProfileShareCallbackPayload,
} from "./modules/digital-health/abdm-v3-types";

describe("ABDM Milestone 2 — End-to-End Test Suite", () => {
  // Ensure tests run in sandbox/demo mode
  process.env["ABDM_DEMO_MODE"] = "1";
  process.env["ABDM_ENV"] = "sandbox";

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CRYPTOGRAPHIC ENGINE (CURVE25519 ECDH + AES-256-GCM)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("1. Curve25519 ECDH & AES-GCM Cryptographic Engine", () => {
    it("generates valid Curve25519 key material with random nonce and expiry", () => {
      const hipExchange = generateHipKeyMaterial(24);
      assert.ok(hipExchange.keyMaterial);
      assert.equal(hipExchange.keyMaterial.cryptoAlg, "ECDH");
      assert.equal(hipExchange.keyMaterial.curve, "Curve25519");
      assert.ok(hipExchange.keyMaterial.dhPublicKey.keyValue);
      assert.ok(hipExchange.keyMaterial.nonce);
      assert.ok(new Date(hipExchange.keyMaterial.dhPublicKey.expiry).getTime() > Date.now());
    });

    it("imports Curve25519 public key from Base64 string", () => {
      const hipExchange = generateHipKeyMaterial();
      const importedKey = importCurve25519PublicKey(hipExchange.keyMaterial.dhPublicKey.keyValue);
      assert.ok(importedKey);
      assert.equal(importedKey.asymmetricKeyType, "x25519");
    });

    it("performs symmetric Diffie-Hellman key agreement between HIP and HIU", () => {
      const hip = generateHipKeyMaterial();
      const hiu = generateHipKeyMaterial();

      const sharedSecretHIP = calculateSharedSecret(
        hip.privateKey,
        hiu.keyMaterial.dhPublicKey.keyValue,
      );
      const sharedSecretHIU = calculateSharedSecret(
        hiu.privateKey,
        hip.keyMaterial.dhPublicKey.keyValue,
      );

      assert.equal(sharedSecretHIP.length, 32);
      assert.equal(sharedSecretHIU.length, 32);
      assert.ok(sharedSecretHIP.equals(sharedSecretHIU), "Both sides must derive the exact same shared secret");
    });

    it("derives matching AES-256 keys on both sides using HKDF with nonces", () => {
      const hip = generateHipKeyMaterial();
      const hiu = generateHipKeyMaterial();

      const secretHIP = calculateSharedSecret(hip.privateKey, hiu.keyMaterial.dhPublicKey.keyValue);
      const secretHIU = calculateSharedSecret(hiu.privateKey, hip.keyMaterial.dhPublicKey.keyValue);

      const aesKeyHIP = deriveSymmetricKey(secretHIP, hip.keyMaterial.nonce, hiu.keyMaterial.nonce);
      const aesKeyHIU = deriveSymmetricKey(secretHIU, hip.keyMaterial.nonce, hiu.keyMaterial.nonce);

      assert.equal(aesKeyHIP.length, 32);
      assert.ok(aesKeyHIP.equals(aesKeyHIU), "Derived symmetric AES keys must match");
    });

    it("encrypts and decrypts FHIR JSON payload with AES-256-GCM and MD5 checksum", () => {
      const hip = generateHipKeyMaterial();
      const hiu = generateHipKeyMaterial();

      const secret = calculateSharedSecret(hip.privateKey, hiu.keyMaterial.dhPublicKey.keyValue);
      const aesKey = deriveSymmetricKey(secret, hip.keyMaterial.nonce, hiu.keyMaterial.nonce);

      const sampleFhirBundle = JSON.stringify({
        resourceType: "Bundle",
        type: "document",
        entry: [{ resource: { resourceType: "Composition", title: "Patient Prescription" } }],
      });

      const { encryptedContent, checksum } = encryptFhirPayload(sampleFhirBundle, aesKey);
      assert.ok(encryptedContent);
      assert.ok(checksum);
      assert.notEqual(encryptedContent, sampleFhirBundle);

      const decryptedJson = decryptFhirPayload(encryptedContent, aesKey);
      assert.equal(decryptedJson, sampleFhirBundle);
      const parsed = JSON.parse(decryptedJson) as { resourceType: string };
      assert.equal(parsed.resourceType, "Bundle");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. GATEWAY BRIDGE MANAGEMENT (Section 3.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("2. Gateway Bridge Management APIs", () => {
    it("updates bridge URL in demo mode", async () => {
      const res = await abdmV3Service.updateBridgeUrl("https://api.smrkomed.com/api/v3");
      assert.ok(res);
      assert.ok(res.status?.includes("DEMO") || res.status === "SUCCESS");
    });

    it("retrieves bridge services configuration status", async () => {
      const status = await abdmV3Service.getBridgeStatus();
      assert.ok(status.bridge);
      assert.ok(Array.isArray(status.services));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. HIP-INITIATED LINKING (Section 4.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("3. HIP-Initiated Care Context Linking", () => {
    it("generates a link token for a patient (4.3.1)", async () => {
      const res = await abdmV3Service.generateLinkToken({
        name: "Priya Sharma",
        gender: "F",
        yearOfBirth: 1994,
        abhaAddress: "priya.sharma@sbx",
      });

      assert.ok(res.requestId);
      assert.ok(res.linkToken);
      assert.match(res.message, /successfully/i);
    });

    it("handles link token callback and caches token (4.3.2)", async () => {
      const reqId = randomUUID();
      await abdmV3Service.handleLinkTokenCallback({
        abhaAddress: "priya.sharma@sbx",
        linkToken: "token-abc-123",
        response: { requestId: reqId },
      });
      // Should complete without error
      assert.ok(true);
    });

    it("links care context with patient ABHA address (4.3.3)", async () => {
      const res = await abdmV3Service.linkCareContexts({
        patientId: "patient-test-01",
        clinicId: "clinic-test-01",
        abhaAddress: "priya.sharma@sbx",
        linkToken: "mock-link-token",
        patientDisplay: "Priya Sharma OPD Visit",
        careContexts: [{ referenceNumber: "OPD-101", display: "Fertility Consultation" }],
        hiType: "OPCONSULTATION",
      });

      assert.ok(res.requestId);
      assert.equal(res.linkedCount, 1);
      assert.match(res.message, /linked/i);
    });

    it("fetches patient links from ABDM Gateway (4.3.5)", async () => {
      const res = await abdmV3Service.getPatientLinks(10);
      assert.ok(res.patient.links.length > 0);
      assert.equal(res.patient.links[0]?.hip.type, "HIP");
    });

    it("notifies care context update to subscribed HIUs (4.3.6)", async () => {
      const res = await abdmV3Service.notifyCareContext({
        patientId: "patient-test-01",
        clinicId: "clinic-test-01",
        patientReference: "MR-001",
        careContextReference: "OPD-101",
        abhaAddress: "priya.sharma@sbx",
      });
      assert.ok(res.status);
    });

    it("sends SMS notification to patient when records are ready (4.3.8)", async () => {
      const res = await abdmV3Service.sendPatientSmsNotification({
        phoneNo: "9876543210",
        hipName: "SmrkoMed Fertility Clinic",
      });
      assert.ok(res.requestId);
      assert.ok(res.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. USER-INITIATED LINKING (Section 5.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("4. User-Initiated Linking (Discovery, Init, Confirm)", () => {
    it("handles patient health record discovery (5.3.2 -> 5.3.3)", async () => {
      const payload: V3DiscoverCallbackPayload = {
        transactionId: randomUUID(),
        patient: {
          id: "priya.sharma@sbx",
          verifiedIdentifiers: [{ type: "MOBILE", value: "9876543210" }],
          name: "Priya Sharma",
          gender: "F",
          yearOfBirth: 1994,
        },
      };

      const res = await abdmV3Service.handlePatientDiscovery(payload);
      assert.ok(res.status);
    });

    it("initiates link and generates OTP challenge (5.3.6 -> 5.3.7)", async () => {
      const txnId = randomUUID();
      const payload: V3LinkInitCallbackPayload = {
        transactionId: txnId,
        abhaAddress: "priya.sharma@sbx",
        patient: [
          {
            referenceNumber: "MR-001",
            careContexts: [{ referenceNumber: "OPD-101" }],
            hiType: "OPCONSULTATION",
            count: 1,
          },
        ],
      };

      const res = await abdmV3Service.handleLinkInit(payload);
      assert.ok(res.linkRefNumber);

      // Now verify confirm with correct OTP (123456)
      const confirmPayload: V3LinkConfirmCallbackPayload = {
        confirmation: {
          linkRefNumber: res.linkRefNumber,
          token: "123456",
        },
      };

      const confirmRes = await abdmV3Service.handleLinkConfirm(confirmPayload);
      assert.equal(confirmRes.status, "CONFIRMED");
    });

    it("rejects confirm when OTP does not match (ABDM-1035)", async () => {
      const payload: V3LinkInitCallbackPayload = {
        transactionId: randomUUID(),
        patient: [
          {
            referenceNumber: "MR-002",
            careContexts: [{ referenceNumber: "OPD-102" }],
            hiType: "OPCONSULTATION",
            count: 1,
          },
        ],
      };

      const initRes = await abdmV3Service.handleLinkInit(payload);

      const confirmPayload: V3LinkConfirmCallbackPayload = {
        confirmation: {
          linkRefNumber: initRes.linkRefNumber,
          token: "999999", // Invalid OTP
        },
      };

      const confirmRes = await abdmV3Service.handleLinkConfirm(confirmPayload);
      assert.equal(confirmRes.status, "FAILED");
      assert.match(confirmRes.message, /OTP does not matched/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CONSENT & DATA FLOW (Section 6.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("5. Consent & FHIR Data Flow", () => {
    it("handles consent notification callback (6.3.1)", async () => {
      await abdmV3Service.handleConsentNotify({
        notification: {
          status: "GRANTED",
          consentId: `consent-${randomUUID()}`,
          createdAt: new Date().toISOString(),
          patient: { id: "priya.sharma@sbx" },
          purpose: { text: "Care Management", code: "CAREMGT" },
          hiTypes: ["OPCONSULTATION"],
          permission: {
            accessMode: "VIEW",
            dateRange: {
              from: "2024-01-01T00:00:00.000Z",
              to: "2026-12-31T00:00:00.000Z",
            },
            dataEraseAt: "2027-01-01T00:00:00.000Z",
          },
        },
      });
      assert.ok(true);
    });

    it("processes health information request, encrypts FHIR, and pushes data (6.3.3 -> 6.3.6)", async () => {
      const hiuKeyMaterial = generateHipKeyMaterial();
      const payload: V3HealthInfoRequestCallbackPayload = {
        hiRequest: {
          consent: { id: `consent-${randomUUID()}` },
          dateRange: {
            from: "2024-01-01T00:00:00.000Z",
            to: "2026-12-31T00:00:00.000Z",
          },
          dataPushUrl: "https://hiu.example.com/api-hiu/data/notification",
          keyMaterial: hiuKeyMaterial.keyMaterial,
        },
      };

      const res = await abdmV3Service.handleHealthInfoRequest(payload);
      assert.equal(res.status, "DATA_TRANSFERRED");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SCAN AND PROFILE SHARE (Section 7.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("6. Scan & Profile Share (OPD Counter QR)", () => {
    it("handles patient scanning QR code and shares profile (7.3.2 -> 7.3.3)", async () => {
      const payload: V3ProfileShareCallbackPayload = {
        intent: "PROFILE_SHARE",
        metaData: {
          hipId: "SMRKOMED_HIP",
          context: "COUNTER_01",
        },
        profile: {
          patient: {
            abhaNumber: "91178386101251",
            abhaAddress: "rahul.verma@sbx",
            name: "Rahul Verma",
            gender: "M",
            dayOfBirth: "15",
            monthOfBirth: "08",
            yearOfBirth: "1992",
            phoneNumber: "9876543210",
            address: {
              line: "123 Indiranagar",
              district: "Bengaluru Urban",
              state: "Karnataka",
              pincode: "560038",
            },
          },
        },
      };

      const res = await abdmV3Service.handleProfileShare(payload);
      assert.ok(res.tokenNumber.startsWith("TK-"));
      assert.equal(res.abhaAddress, "rahul.verma@sbx");
      assert.match(res.message, /assigned/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. INBOUND HTTP CALLBACK ROUTER (NHA Spec Paths)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("7. Inbound Callback HTTP Router via createApp()", () => {
    const app = createApp();

    it("POST /api/v3/hip/token/on-generate-token responds with 202 Accepted", async () => {
      const res = await app.request("/api/v3/hip/token/on-generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abhaAddress: "user@sbx",
          linkToken: "token-xyz",
          response: { requestId: randomUUID() },
        }),
      });
      assert.equal(res.status, 202);
    });

    it("POST /api/v3/link/on_carecontext responds with 202 Accepted", async () => {
      const res = await app.request("/api/v3/link/on_carecontext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abhaAddress: "user@sbx",
          status: "Successfully Linked care context",
          response: { requestId: randomUUID() },
        }),
      });
      assert.equal(res.status, 202);
    });

    it("POST /api/v3/hip/patient/care-context/discover responds with 200 OK", async () => {
      const res = await app.request("/api/v3/hip/patient/care-context/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: randomUUID(),
          patient: {
            id: "user@sbx",
            name: "Test User",
            gender: "M",
            yearOfBirth: 1990,
          },
        }),
      });
      assert.equal(res.status, 200);
    });

    it("POST /api/v3/hip/link/care-context/init responds with 200 OK", async () => {
      const res = await app.request("/api/v3/hip/link/care-context/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: randomUUID(),
          patient: [
            {
              referenceNumber: "MR-01",
              careContexts: [{ referenceNumber: "OPD-01" }],
              hiType: "OPCONSULTATION",
              count: 1,
            },
          ],
        }),
      });
      assert.equal(res.status, 200);
    });

    it("POST /api/v3/consent/request/hip/notify responds with 202 Accepted", async () => {
      const res = await app.request("/api/v3/consent/request/hip/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification: {
            status: "GRANTED",
            consentId: randomUUID(),
            createdAt: new Date().toISOString(),
            patient: { id: "user@sbx" },
            purpose: { text: "Care Management", code: "CAREMGT" },
            hiTypes: ["OPCONSULTATION"],
            permission: {
              accessMode: "VIEW",
              dateRange: { from: "2024-01-01T00:00:00.000Z", to: "2025-01-01T00:00:00.000Z" },
              dataEraseAt: "2026-01-01T00:00:00.000Z",
            },
          },
        }),
      });
      assert.equal(res.status, 202);
    });

    it("POST /api/v3/hip/patient/share responds with 200 OK", async () => {
      const res = await app.request("/api/v3/hip/patient/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "PROFILE_SHARE",
          metaData: { hipId: "SMRKOMED_HIP" },
          profile: {
            patient: {
              abhaNumber: "91123456789012",
              abhaAddress: "scan.user@sbx",
              name: "Scan User",
              gender: "F",
              yearOfBirth: 1995,
            },
          },
        }),
      });
      assert.equal(res.status, 200);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. CONSTANTS & VALIDATIONS (NHA Standard)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("8. NHA Milestone 2 Constants & Standard Error Codes", () => {
    it("defines all 7 mandatory NHA HITypes", () => {
      assert.equal(ABDM_HIT_TYPES.length, 7);
      assert.ok(ABDM_HIT_TYPES.includes("PRESCRIPTION"));
      assert.ok(ABDM_HIT_TYPES.includes("DIAGNOSTIC REPORT"));
      assert.ok(ABDM_HIT_TYPES.includes("OPCONSULTATION"));
      assert.ok(ABDM_HIT_TYPES.includes("DISCHARGE SUMMARY"));
      assert.ok(ABDM_HIT_TYPES.includes("IMMUNIZATION RECORD"));
      assert.ok(ABDM_HIT_TYPES.includes("HEALTH DOCUMENT RECORD"));
      assert.ok(ABDM_HIT_TYPES.includes("WELLNESS RECORD"));
    });

    it("verifies NHA standard error code constants", () => {
      assert.equal(ABDM_ERROR_CODES.PATIENT_NOT_FOUND.code, "ABDM-1010");
      assert.equal(ABDM_ERROR_CODES.CARE_CONTEXT_COUNT_MISMATCH.code, "ABDM-1037");
      assert.equal(ABDM_ERROR_CODES.ABHA_ADDRESS_MISMATCH.code, "ABDM-1038");
      assert.equal(ABDM_ERROR_CODES.CARE_CONTEXT_ALREADY_LINKED.code, "ABDM-1056");
      assert.equal(ABDM_ERROR_CODES.DUPLICATE_HIP_LINK_REQUEST.code, "ABDM-1090");
      assert.equal(ABDM_ERROR_CODES.DUPLICATE_LINK_TOKEN_REQUEST.code, "ABDM-1092");
    });
  });
});
