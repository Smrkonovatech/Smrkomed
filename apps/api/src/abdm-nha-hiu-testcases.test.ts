import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";

import { createApp } from "./app";
import {
  AbdmV3Service,
  validateConsentInitRequest,
} from "./modules/digital-health/abdm-v3-service";
import {
  generateHiuKeyMaterial,
  generateHipKeyMaterial,
  calculateSharedSecret,
  deriveSymmetricKey,
  encryptFhirPayload,
} from "./modules/digital-health/abdm-v3-data-crypto";
import {
  type V3HiuConsentInitRequest,
  type V3HiuConsentOnInitCallback,
  type V3HiuConsentNotifyCallback,
  type V3DataPushPayload,
  type V3SubscriptionInitRequest,
  type V3SubscriptionOnInitCallback,
  type V3SubscriptionEventNotifyCallback,
} from "./modules/digital-health/abdm-v3-types";

describe("ABDM NHA Test Checklist — Module: Building HIU & Subscriptions (Milestone 3)", () => {
  const service = new AbdmV3Service();
  const app = createApp();

  // Ensure test runs in sandbox/demo mode
  process.env["ABDM_DEMO_MODE"] = "1";
  process.env["ABDM_ENV"] = "sandbox";

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 1: GATEWAY FLOWS (OPENID, CERTS, BRIDGE & FACILITY LINKAGE)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 1: Gateway Flow & Configuration (Section 3.0)", () => {
    it("Case 1.1: OpenID Configuration API — provides IDP configuration and jwks_uri", async () => {
      const config = await service.getOpenIdConfiguration();
      assert.ok(config.jwks_uri, "Must return jwks_uri for public key certificates");
      assert.match(config.jwks_uri, /\/api\/hiecm\/gateway\/v3\/certs/, "jwks_uri must target gateway certs endpoint");
    });

    it("Case 1.2: OAuth Certificate API — provides public keys for verifying callback tokens", async () => {
      const certs = await service.getCerts();
      assert.ok(certs.keys && certs.keys.length > 0, "Must return at least one RSA key");
      const key = certs.keys[0];
      assert.equal(key?.kty, "RSA", "Key type must be RSA");
      assert.equal(key?.use, "sig", "Key usage must be signature verification");
      assert.ok(key?.n && key?.e, "Key must contain modulus and exponent");
    });

    it("Case 1.3: Registration of Facility & Software Linkage — validates parameters per Section 3.2.5", async () => {
      // Valid facility linkage
      const validRes = await service.registerFacilitySoftwareLinkage({
        facilityId: "IN0210000045",
        facilityName: "SMRKOMED Fertility Center",
        bridgeId: "SBX_001234",
        hipName: "SMRKOMED_BRIDGE",
        type: "HIU",
        active: true,
      });
      assert.equal(validRes.status, "SUCCESS");

      // Invalid facilityId: must start with IN and be 12 chars
      await assert.rejects(
        async () => {
          await service.registerFacilitySoftwareLinkage({
            facilityId: "BAD_FACILITY_ID",
            facilityName: "Clinic",
            bridgeId: "SBX_001234",
            hipName: "CLINIC_BRIDGE",
            type: "HIU",
            active: true,
          });
        },
        (err: any) => err.code === "ABDM-1025",
        "Must reject facility ID not starting with IN or length != 12",
      );

      // Invalid hipName: cannot be > 15 chars or contain special chars (%$*#@)
      await assert.rejects(
        async () => {
          await service.registerFacilitySoftwareLinkage({
            facilityId: "IN0210000045",
            facilityName: "Clinic",
            bridgeId: "SBX_001234",
            hipName: "TOOLONG_NAME_INVALID@!",
            type: "HIU",
            active: true,
          });
        },
        (err: any) => err.code === "ABDM-1035",
        "Must reject hipName with special characters or length > 15",
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 2: HIU CONSENT FLOW (Section 4.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 2: HIU Consent Flow (Section 4.0)", () => {
    const validConsentReq: V3HiuConsentInitRequest = {
      consent: {
        hip: { id: "SBX_HIP1" },
        hiu: { id: "SMRKOMED_HIU" },
        hiTypes: ["Prescription", "DiagnosticReport", "OPConsultation"],
        patient: { id: "patient.01@sbx" },
        purpose: {
          code: "CAREMGT",
          text: "Care Management",
          refUri: "https://www.abdm.gov.in",
        },
        requester: {
          name: "Dr. Ananya Rao",
          identifier: {
            type: "REGNO",
            value: "MH1001",
            system: "https://www.mciindia.org",
          },
        },
        permission: {
          accessMode: "VIEW",
          dateRange: {
            from: "2024-01-01T00:00:00.000Z",
            to: "2024-05-01T00:00:00.000Z",
          },
          dataEraseAt: "2027-12-31T23:59:59.000Z",
          frequency: {
            unit: "HOUR",
            value: 0,
            repeats: 0,
          },
        },
        careContexts: [
          {
            patientReference: "pat_ref_01",
            careContextReference: "Episode11",
          },
        ],
      },
    };

    it("Case 2.1: Consent request initiation — initiates with valid body and returns 202 status", async () => {
      const res = await service.initiateHiuConsentRequest(validConsentReq);
      assert.ok(res.consentRequestId, "Must return consentRequestId");
      assert.equal(res.status, "REQUESTED");
      assert.ok(service.hiuConsentRequests.has(res.consentRequestId));
    });

    it("Case 2.2: Mandatory Validations — Purpose Text must not be empty or invalid (Pages 30, 32)", () => {
      // Empty purpose text
      const emptyTextReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      emptyTextReq.consent.purpose.text = "";
      assert.throws(
        () => validateConsentInitRequest(emptyTextReq),
        (err: any) => err.message.includes("Consent purpose text cannot be null"),
      );

      // Invalid purpose text
      const invalidTextReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      invalidTextReq.consent.purpose.text = "Random Purpose 123";
      assert.throws(
        () => validateConsentInitRequest(invalidTextReq),
        (err: any) => err.message.includes("Invalid purpose text"),
      );
    });

    it("Case 2.3: Mandatory Validations — Purpose Code must be in allowed list (Pages 35, 37)", () => {
      // Empty purpose code
      const emptyCodeReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      emptyCodeReq.consent.purpose.code = "";
      assert.throws(
        () => validateConsentInitRequest(emptyCodeReq),
        (err: any) => err.message.includes("Consent purpose code cannot be null"),
      );

      // Invalid purpose code
      const invalidCodeReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      invalidCodeReq.consent.purpose.code = "INVALID_CODE";
      assert.throws(
        () => validateConsentInitRequest(invalidCodeReq),
        (err: any) => err.message.includes("Invalid purpose code"),
      );
    });

    it("Case 2.4: Mandatory Validations — refUri must not be empty (Page 39)", () => {
      const emptyRefUriReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      emptyRefUriReq.consent.purpose.refUri = "";
      assert.throws(
        () => validateConsentInitRequest(emptyRefUriReq),
        (err: any) => err.message.includes("Invalid consent purpose refURI"),
      );
    });

    it("Case 2.5: Mandatory Validations — ABHA Address format (Page 46)", () => {
      const invalidAbhaReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      invalidAbhaReq.consent.patient.id = "invalid-address-without-domain";
      assert.throws(
        () => validateConsentInitRequest(invalidAbhaReq),
        (err: any) => err.message.includes("Invalid ABHA Address"),
      );
    });

    it("Case 2.6: Mandatory Validations — HIP is mandatory when care contexts are specified (Page 52)", () => {
      const noHipReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      noHipReq.consent.hip = null;
      noHipReq.consent.careContexts = [
        { patientReference: "p1", careContextReference: "c1" },
      ];
      assert.throws(
        () => validateConsentInitRequest(noHipReq),
        (err: any) => err.code === "ABDM-1031" && err.message.includes("HIP is mandatory"),
      );
    });

    it("Case 2.7: Mandatory Validations — DateRange cannot be future date (Page 44)", () => {
      const futureDateReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      futureDateReq.consent.permission.dateRange = {
        from: "2030-01-01T00:00:00.000Z",
        to: "2031-01-01T00:00:00.000Z",
      };
      assert.throws(
        () => validateConsentInitRequest(futureDateReq),
        (err: any) => err.message.includes("Invalid from/to date. Date must be a present/before date"),
      );
    });

    it("Case 2.8: Mandatory Validations — dataEraseAt must be in future (Page 44)", () => {
      const pastEraseReq: V3HiuConsentInitRequest = JSON.parse(JSON.stringify(validConsentReq));
      pastEraseReq.consent.permission.dataEraseAt = "2020-01-01T00:00:00.000Z";
      assert.throws(
        () => validateConsentInitRequest(pastEraseReq),
        (err: any) => err.message.includes("Invalid data erase date. Date must be a future date"),
      );
    });

    it("Case 2.9: Consent callback handling — on-init, notify approval, and auto-acknowledge", async () => {
      const initRes = await service.initiateHiuConsentRequest(validConsentReq);
      const consentReqId = initRes.consentRequestId;

      // 1. Simulate on-init callback (4.3.2)
      const onInitPayload: V3HiuConsentOnInitCallback = {
        consentRequest: { id: consentReqId },
        response: { requestId: randomUUID() },
        error: null,
      };
      service.handleHiuConsentOnInitCallback(onInitPayload);
      assert.equal(service.hiuConsentRequests.get(consentReqId)?.status, "REQUESTED");

      // 2. Simulate notify callback with GRANTED status and consent artefact ID (4.3.3)
      const artifactId = `artifact-${randomUUID()}`;
      const notifyPayload: V3HiuConsentNotifyCallback = {
        notification: {
          consentRequestId: consentReqId,
          status: "GRANTED",
          reason: null,
          consentArtefacts: [{ id: artifactId }],
        },
      };

      const notifyRes = await service.handleHiuConsentNotifyCallback(notifyPayload);
      assert.equal(notifyRes.status, "ACK");
      assert.equal(service.hiuConsentRequests.get(consentReqId)?.status, "GRANTED");
      assert.ok(service.hiuConsentRequests.get(consentReqId)?.consentArtefacts.includes(artifactId));

      // 3. Status check (4.3.5)
      const statusRes = await service.getHiuConsentStatus(consentReqId);
      assert.equal(statusRes.status, "GRANTED");

      // 4. Fetch consent artifact (4.3.7 & 4.3.8)
      const fetchRes = await service.fetchHiuConsentArtifact(artifactId);
      assert.ok(fetchRes.status);
      const req = service.hiuConsentRequests.get(consentReqId);
      assert.ok(req?.artifacts.has(artifactId));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 3: HIU DATA FLOW & DIRECT DATA TRANSFER (Section 5.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 3: HIU Data Flow & Direct Data Transfer (Section 5.0)", () => {
    it("Case 3.1: Data request initiation — generates Curve25519 keypair and creates exchange session", async () => {
      const consentId = `consent-art-${randomUUID()}`;
      const res = await service.initiateHiuDataRequest({
        consentId,
        dateRange: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-05-01T00:00:00.000Z",
        },
      });

      assert.ok(res.transactionId, "Must return transactionId");
      assert.equal(res.sessionStatus, "REQUESTED");
      assert.equal(res.keyMaterial.cryptoAlg, "ECDH");
      assert.equal(res.keyMaterial.curve, "Curve25519");
      assert.ok(res.keyMaterial.dhPublicKey.keyValue, "Must include HIU public key");
      assert.ok(res.keyMaterial.nonce, "Must include HIU nonce");

      const session = service.hiuDataExchanges.get(res.transactionId);
      assert.ok(session, "Must record exchange session in memory");
      assert.equal(session?.consentId, consentId);
    });

    it("Case 3.2: Direct Data Transfer from HIP — decrypts pushed encrypted FHIR payload with checksum verification", async () => {
      // 1. HIU initiates data request
      const consentId = `consent-art-${randomUUID()}`;
      const dataReq = await service.initiateHiuDataRequest({
        consentId,
        dateRange: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2024-05-01T00:00:00.000Z",
        },
      });

      const txnId = dataReq.transactionId;
      const hiuPubKey = dataReq.keyMaterial.dhPublicKey.keyValue;
      const hiuNonce = dataReq.keyMaterial.nonce;

      // 2. HIP prepares health data and encrypts using HIP keypair + HIU public key
      const hipKeys = generateHipKeyMaterial();
      const sharedSecret = calculateSharedSecret(hipKeys.privateKey, hiuPubKey);
      const aesKey = deriveSymmetricKey(sharedSecret, hipKeys.keyMaterial.nonce, hiuNonce);

      const fhirPrescriptionBundle = {
        resourceType: "Bundle",
        type: "document",
        id: "bundle-rx-001",
        entry: [
          {
            resource: {
              resourceType: "MedicationRequest",
              id: "med-01",
              status: "active",
              medicationCodeableConcept: { text: "Folic Acid 5mg" },
            },
          },
        ],
      };

      const payloadJson = JSON.stringify(fhirPrescriptionBundle);
      const { encryptedContent, checksum } = encryptFhirPayload(payloadJson, aesKey);

      // 3. HIP pushes encrypted data to HIU push receiver endpoint
      const pushPayload: V3DataPushPayload = {
        pageNumber: 1,
        pageCount: 1,
        transactionId: txnId,
        keyMaterial: hipKeys.keyMaterial,
        entries: [
          {
            content: encryptedContent,
            media: "application/fhir+json",
            checksum,
            careContextReference: "Episode11",
          },
        ],
      };

      const pushRes = await service.handleHiuDataPush(pushPayload);
      assert.equal(pushRes.status, "SUCCESS");
      assert.equal(pushRes.count, 1);

      // 4. Verify that decrypted records in session contain the valid FHIR bundle
      const session = service.hiuDataExchanges.get(txnId);
      assert.equal(session?.status, "RECEIVED");
      assert.equal(session?.records.length, 1);

      const rec = session?.records[0];
      assert.ok(rec?.verified, "MD5 checksum must verify");
      assert.equal(rec?.fhirBundle["resourceType"], "Bundle");
      assert.equal(rec?.fhirBundle["id"], "bundle-rx-001");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 4: SUBSCRIPTION FLOW (Section 6.0)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 4: Subscription Flow (Section 6.0)", () => {
    const subInitReq: V3SubscriptionInitRequest = {
      subscription: {
        purpose: {
          code: "CAREMGT",
          text: "Care Management",
          refUri: "https://www.abdm.gov.in",
        },
        patient: { id: "patient@sbx" },
        hiu: { id: "SMRKOMED_HIU" },
        categories: ["LINK", "DATA"],
        period: {
          from: "2024-01-01T00:00:00.000Z",
          to: "2025-01-01T00:00:00.000Z",
        },
      },
    };

    it("Case 4.1: Initiate subscription request — returns 202 and tracks in-memory", async () => {
      const res = await service.initiateSubscriptionRequest(subInitReq);
      assert.ok(res.subscriptionRequestId, "Must return subscriptionRequestId");
      assert.equal(res.status, "REQUESTED");
      assert.ok(service.hiuSubscriptions.has(res.subscriptionRequestId));
    });

    it("Case 4.2: Approve subscription request & callback delivery", async () => {
      const initRes = await service.initiateSubscriptionRequest(subInitReq);
      const subId = initRes.subscriptionRequestId;

      const approveRes = await service.approveSubscriptionRequest(subId, {
        isApplicableForAllHIPs: true,
        includedSources: [
          {
            hiTypes: ["Prescription", "DiagnosticReport"],
            categories: ["LINK", "DATA"],
            period: subInitReq.subscription.period,
          },
        ],
        purpose: subInitReq.subscription.purpose,
        categories: ["LINK", "DATA"],
        period: subInitReq.subscription.period,
      });

      assert.equal(approveRes.subscriptionId, subId);
      assert.equal(service.hiuSubscriptions.get(subId)?.status, "GRANTED");
    });

    it("Case 4.3: Deny subscription request & callback delivery", async () => {
      const initRes = await service.initiateSubscriptionRequest(subInitReq);
      const subId = initRes.subscriptionRequestId;

      const denyRes = await service.denySubscriptionRequest(subId, "Not required by patient");
      assert.ok(denyRes.message.includes("denied"));
      assert.equal(service.hiuSubscriptions.get(subId)?.status, "DENIED");
    });

    it("Case 4.4: Linked new record notification (6.3.11) — HIU receives event and acknowledges to HIECM", async () => {
      const initRes = await service.initiateSubscriptionRequest(subInitReq);
      const subId = initRes.subscriptionRequestId;

      const eventPayload: V3SubscriptionEventNotifyCallback = {
        event: {
          id: `event-${randomUUID()}`,
          published: new Date().toISOString(),
          subscriptionId: subId,
          category: "LINK",
          content: {
            patient: { id: "patient@sbx" },
            hip: { id: "CITY_HOSPITAL_HIP" },
            contexts: [
              {
                careContexts: [
                  {
                    patientReference: "patient@sbx",
                    careContextReference: "CTX-NEW-101",
                  },
                ],
                hiType: "Prescription",
              },
            ],
          },
        },
      };

      const res = await service.handleSubscriptionEventNotify(eventPayload);
      assert.equal(res.status, "ACK");
      const sub = service.hiuSubscriptions.get(subId);
      assert.equal(sub?.events.length, 1);
      assert.equal(sub?.events[0]?.event.id, eventPayload.event.id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION 5: HTTP ROUTE INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Function 5: HTTP Callback & API Routes Integration", () => {
    it("Case 5.1: HTTP Callback Routes — responds to consent and subscription callbacks with expected HTTP codes", async () => {
      // 1. Consent on-init callback (POST /api/v3/hiu/consent/request/on-init -> 202)
      const onInitReq = new Request("http://localhost/api/v3/hiu/consent/request/on-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentRequest: { id: "test-req-id" },
          response: { requestId: "res-id" },
        }),
      });
      const onInitRes = await app.fetch(onInitReq);
      assert.equal(onInitRes.status, 202);

      // 2. Consent notify callback (POST /api/v3/hiu/consent/request/notify -> 202)
      const notifyReq = new Request("http://localhost/api/v3/hiu/consent/request/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification: {
            consentRequestId: "test-req-id",
            status: "GRANTED",
            consentArtefacts: [{ id: "art-1" }],
          },
        }),
      });
      const notifyRes = await app.fetch(notifyReq);
      assert.equal(notifyRes.status, 202);

      // 3. Subscription on-init callback (POST /api/v3/hiu/hiecm/subscription-requests/on-init -> 202)
      const subOnInitReq = new Request("http://localhost/api/v3/hiu/hiecm/subscription-requests/on-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionRequest: { id: "sub-req-id" },
          response: { requestId: "res-id" },
        }),
      });
      const subOnInitRes = await app.fetch(subOnInitReq);
      assert.equal(subOnInitRes.status, 202);
    });
  });
});
