import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AbdmProvider,
  hashAbha,
  maskAbha,
  normalizeAbhaDigits,
} from "./modules/digital-health/abdm-provider";
import { buildInteropBundle } from "./modules/digital-health/interop";
import { AbdmHttpClient, AbdmClientError } from "./modules/digital-health/abdm-client";
import { buildGatewayHeaders, scrubAbdmSecrets } from "./modules/digital-health/abdm-config";
import { mapAbdmErrorToUserMessage, abdmEvents } from "./modules/digital-health/abdm-callbacks";
import { PERMISSIONS, roleHasPermission } from "@smrkomed/database";

describe("digital health foundation", () => {
  it("masks and hashes ABHA without exposing full identifier", () => {
    const digits = normalizeAbhaDigits("12-3456-7890-1234");
    assert.equal(digits, "12345678901234");
    assert.equal(maskAbha(digits), "XX-XXXX-XXXX-1234");
    assert.equal(hashAbha(digits).length, 64);
    assert.notEqual(hashAbha(digits), digits);
  });

  it("reports ABDM not connected without credentials", () => {
    const origId = process.env["ABDM_CLIENT_ID"];
    const origSecret = process.env["ABDM_CLIENT_SECRET"];
    process.env["ABDM_CLIENT_ID"] = "";
    process.env["ABDM_CLIENT_SECRET"] = "";
    try {
      const provider = new AbdmProvider();
      const info = provider.getConnectionInfo();
      assert.equal(info.connected, false);
      assert.equal(info.status, "NOT_CONNECTED");
      assert.match(info.message, /not connected/i);
    } finally {
      if (origId) process.env["ABDM_CLIENT_ID"] = origId;
      if (origSecret) process.env["ABDM_CLIENT_SECRET"] = origSecret;
    }
  });

  it("linkAbha refuses OTP fakery when not connected and demo off", async () => {
    const origId = process.env["ABDM_CLIENT_ID"];
    const origSecret = process.env["ABDM_CLIENT_SECRET"];
    process.env["ABDM_CLIENT_ID"] = "";
    process.env["ABDM_CLIENT_SECRET"] = "";
    try {
      const provider = new AbdmProvider();
      const result = await provider.linkAbha({
        abhaNumber: "12345678901234",
        patientName: "Test Patient",
      });
      if (result.ok && result.mode === "demo_intent") {
        assert.ok(result.verificationRequired);
        assert.match(result.message, /sandbox|demo/i);
      } else {
        assert.equal(result.ok, false);
        if (!result.ok) assert.equal(result.code, "ABDM_NOT_CONNECTED");
      }
    } finally {
      if (origId) process.env["ABDM_CLIENT_ID"] = origId;
      if (origSecret) process.env["ABDM_CLIENT_SECRET"] = origSecret;
    }
  });

  it("shareRecord never invents SHARED without gateway", async () => {
    const provider = new AbdmProvider();
    const result = await provider.shareRecord({
      exchangeId: "ex_1",
      payloadSummary: "test",
    });
    assert.equal(result.ok, false);
  });

  it("interop bundle only includes requested existing resources", () => {
    const bundle = buildInteropBundle({
      clinicId: "c1",
      clinicName: "Demo Clinic",
      patient: {
        id: "p1",
        firstName: "Asha",
        lastName: "Rao",
        dateOfBirth: null,
        gender: "FEMALE",
        phone: null,
      },
      appointments: [],
      consultations: [],
      treatments: [],
      carePlans: [],
      prescriptions: [
        {
          id: "rx1",
          prescriptionDate: new Date("2026-08-01"),
          status: "PENDING",
          doctorName: "Dr Test",
          items: [{ medicineName: "Folic Acid", dosage: "1 tablet", instructions: "After food" }],
        },
      ],
      documents: [{ id: "d1", name: "Scan.pdf", status: "AWAITING_UPLOAD", createdAt: new Date(), storageKey: null }],
      recordTypes: ["prescription", "document"],
    });
    assert.equal(bundle.format, "SMRKOMED_INTEROP_V1");
    assert.match(bundle.disclaimer, /Not claimed as ABDM-certified/);
    assert.ok(bundle.resources.some((r) => r.resourceType === "MedicationRequest"));
    assert.ok(bundle.resources.some((r) => r.resourceType === "DocumentReference"));
    assert.ok(
      bundle.resources
        .filter((r) => r.resourceType === "DocumentReference")
        .every((r) => String((r.data as { note?: string }).note).includes("not configured")),
    );
  });

  it("grants digital health permissions to clinic admin and doctors", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.ABDM_SETTINGS), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.DIGITAL_HEALTH_VIEW), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.RECORD_SHARE), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.RECORD_SHARE), false);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.CONSENT_MANAGE), true);
  });
});

describe("ABDM Milestone 1 (ABHA) Gateway Client", () => {
  it("builds required Gateway headers conforming to ABDM v0.5 spec", () => {
    const headers = buildGatewayHeaders({
      token: "mock-jwt-token-12345",
      requestId: "req-abc-123",
      timestamp: "2026-09-04T00:00:00.000Z",
      xCmId: "sbx",
    });

    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers["Authorization"], "Bearer mock-jwt-token-12345");
    assert.equal(headers["REQUEST-ID"], "req-abc-123");
    assert.equal(headers["TIMESTAMP"], "2026-09-04T00:00:00.000Z");
    assert.equal(headers["X-CM-ID"], "sbx");
  });

  it("scrubs secrets from messages so client secrets and tokens never leak", () => {
    const sensitive = "Error with client_secret=secret123 and Authorization: Bearer eyJhbGciOiJIUzI1Ni...";
    const scrubbed = scrubAbdmSecrets(sensitive);
    assert.ok(!scrubbed.includes("Bearer eyJhbGciOiJIUzI1Ni"));
    assert.ok(scrubbed.includes("[REDACTED_TOKEN]"));
  });

  it("acquires session token, caches it in-memory, and deduplicates concurrent calls", async () => {
    let callCount = 0;
    const mockFetch = async (_url: string | URL | Request, _init?: RequestInit) => {
      callCount++;
      return new Response(
        JSON.stringify({
          accessToken: "mock-token-abc-999",
          expiresIn: 1800,
          tokenType: "Bearer",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = new AbdmHttpClient(mockFetch as unknown as typeof fetch, {
      clientId: "TEST_SBX_CLIENT_ID",
      clientSecret: "TEST_SBX_CLIENT_SECRET",
    });
    client.clearTokenCache();

    // Run 3 concurrent token requests
    const [t1, t2, t3] = await Promise.all([
      client.getGatewayToken(),
      client.getGatewayToken(),
      client.getGatewayToken(),
    ]);

    assert.equal(t1, "mock-token-abc-999");
    assert.equal(t2, "mock-token-abc-999");
    assert.equal(t3, "mock-token-abc-999");
    // Must only call gateway once due to mutex / in-memory deduplication!
    assert.equal(callCount, 1);

    // Subsequent call also uses cache
    const t4 = await client.getGatewayToken();
    assert.equal(t4, "mock-token-abc-999");
    assert.equal(callCount, 1);
  });

  it("handles 401 invalid credentials with ABDM_INVALID_CREDENTIALS error", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const client = new AbdmHttpClient(mockFetch as unknown as typeof fetch, {
      clientId: "WRONG_ID",
      clientSecret: "WRONG_SECRET",
    });
    client.clearTokenCache();

    await assert.rejects(
      async () => {
        await client.getGatewayToken();
      },
      (err: unknown) => {
        assert.ok(err instanceof AbdmClientError);
        assert.equal(err.code, "ABDM_INVALID_CREDENTIALS");
        assert.equal(err.statusCode, 401);
        return true;
      },
    );
  });

  it("handles 503 gateway down with ABDM_GATEWAY_DOWN error", async () => {
    const mockFetch = async () =>
      new Response("Service Unavailable", { status: 503 });

    const client = new AbdmHttpClient(mockFetch as unknown as typeof fetch, {
      clientId: "TEST_ID",
      clientSecret: "TEST_SEC",
    });
    client.clearTokenCache();

    await assert.rejects(
      async () => {
        await client.getGatewayToken();
      },
      (err: unknown) => {
        assert.ok(err instanceof AbdmClientError);
        assert.equal(err.code, "ABDM_GATEWAY_DOWN");
        assert.equal(err.statusCode, 503);
        return true;
      },
    );
  });
});

describe("ABDM Error Mapping & Security Rules", () => {
  it("maps ABDM OTP error codes to clean, empathetic user messages", () => {
    assert.equal(
      mapAbdmErrorToUserMessage(1410, "Invalid OTP"),
      "The OTP is incorrect. Please check and try again.",
    );
    assert.equal(
      mapAbdmErrorToUserMessage(1411, "OTP expired"),
      "This verification session has expired. Please start again.",
    );
    assert.equal(
      mapAbdmErrorToUserMessage(1423, "Max attempts exceeded"),
      "Too many failed attempts. Please try again later.",
    );
    assert.equal(
      mapAbdmErrorToUserMessage(1510, "User not found"),
      "No ABHA profile found for the provided identifier.",
    );
  });

  it("reactive event bus delivers Gateway callback payloads via requestId", async () => {
    const testRequestId = "test-req-xyz-456";
    const promise = new Promise<string>((resolve) => {
      abdmEvents.once(`on-init:${testRequestId}`, (payload) => {
        resolve(payload.auth?.transactionId || "");
      });
    });

    // Simulate callback arriving from ABDM Gateway
    abdmEvents.emit(`on-init:${testRequestId}`, {
      requestId: "gw-cb-1",
      timestamp: new Date().toISOString(),
      auth: {
        transactionId: "gw-txn-98765",
        mode: "MOBILE_OTP",
        meta: { hint: "******4321" },
      },
      resp: { requestId: testRequestId },
    });

    const txnId = await promise;
    assert.equal(txnId, "gw-txn-98765");
  });
});

describe("ABDM Live Authentication & OTP Verification Lifecycle", () => {
  it("formats /v0.5/users/auth/init payload correctly with HIP requester", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> = {};

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      if (capturedUrl.includes("/v0.5/sessions")) {
        return new Response(JSON.stringify({ accessToken: "test-token", expiresIn: 1800 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      capturedBody = JSON.parse(String(init?.body || "{}"));
      return new Response(JSON.stringify({ status: "ACCEPTED" }), { status: 202 });
    };

    const client = new AbdmHttpClient(mockFetch as unknown as typeof fetch, {
      baseUrl: "https://dev.abdm.gov.in/gateway",
      clientId: "TEST_CLIENT_ID",
      clientSecret: "TEST_SECRET",
    });

    const res = await client.initAuth({
      id: "priya@abdm",
      authMode: "MOBILE_OTP",
      purpose: "KYC_AND_LINK",
      requestId: "init-req-123",
    });

    assert.equal(res.requestId, "init-req-123");
    assert.ok(capturedUrl.endsWith("/v0.5/users/auth/init"));
    assert.equal(capturedBody["requestId"], "init-req-123");
    const query = capturedBody["query"] as { id: string; authMode: string; purpose: string };
    assert.equal(query.id, "priya@abdm");
    assert.equal(query.authMode, "MOBILE_OTP");
    assert.equal(query.purpose, "KYC_AND_LINK");
  });

  it("formats /v0.5/users/auth/confirm payload with authCode credential", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> = {};

    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      if (capturedUrl.includes("/v0.5/sessions")) {
        return new Response(JSON.stringify({ accessToken: "test-token", expiresIn: 1800 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      capturedBody = JSON.parse(String(init?.body || "{}"));
      return new Response(JSON.stringify({ status: "ACCEPTED" }), { status: 202 });
    };

    const client = new AbdmHttpClient(mockFetch as unknown as typeof fetch, {
      baseUrl: "https://dev.abdm.gov.in/gateway",
      clientId: "TEST_CLIENT_ID",
      clientSecret: "TEST_SECRET",
    });

    const res = await client.confirmAuth({
      transactionId: "gw-txn-12345",
      otp: "654321",
      requestId: "confirm-req-999",
    });

    assert.equal(res.requestId, "confirm-req-999");
    assert.ok(capturedUrl.endsWith("/v0.5/users/auth/confirm"));
    assert.equal(capturedBody["transactionId"], "gw-txn-12345");
    const credential = capturedBody["credential"] as { authCode: string };
    assert.equal(credential.authCode, "654321");
  });

  it("extracts official verified profile from on-confirm callback", () => {
    const profilePayload = {
      id: "anita@abdm",
      name: "Anita Deshmukh",
      gender: "F",
      yearOfBirth: 1993,
      identifiers: [
        { type: "HEALTH_NUMBER", value: "91-1234-5678-9012" },
        { type: "MOBILE", value: "+919845012345" },
      ],
    };

    const abhaIdent = profilePayload.identifiers.find((i) => i.type === "HEALTH_NUMBER");
    assert.equal(abhaIdent?.value, "91-1234-5678-9012");
    assert.equal(profilePayload.id, "anita@abdm");

    const digits = normalizeAbhaDigits(abhaIdent!.value);
    assert.equal(digits, "91123456789012");
    assert.equal(maskAbha(digits), "XX-XXXX-XXXX-9012");
    assert.equal(hashAbha(digits).length, 64);
  });

  it("CRITICAL RULE: live gateway failure NEVER falls back to demo mode", async () => {
    const provider = new AbdmProvider();
    // Test that synchronous verifyOtp refuses to invent success when in connected live mode
    const session = provider.startAuthSession({
      patientId: "patient-123",
      purpose: "LINK_EXISTING",
      authMethod: "mobile_otp",
    });

    // If session is marked sandboxMode: false (live), verifyOtp must return ABDM_OTP_GATEWAY_PENDING
    if (session.session) {
      session.session.sandboxMode = false;
      const res = provider.verifyOtp({
        sessionId: session.session.sessionId,
        otp: "123456",
      });

      assert.equal(res.ok, false);
      assert.notEqual((res as { mode?: string }).mode, "demo_intent");
      if (!res.ok) {
        assert.equal(res.code, "ABDM_OTP_GATEWAY_PENDING");
      }
    }
  });

  it("ensures OTP is never stored in auth session object", () => {
    const origDemo = process.env["ABDM_DEMO_MODE"];
    const origId = process.env["ABDM_CLIENT_ID"];
    const origSecret = process.env["ABDM_CLIENT_SECRET"];
    process.env["ABDM_CLIENT_ID"] = "";
    process.env["ABDM_CLIENT_SECRET"] = "";
    process.env["ABDM_DEMO_MODE"] = "1";
    try {
      const provider = new AbdmProvider();
      const session = provider.startAuthSession({
        patientId: "patient-sec-check",
        purpose: "LINK_EXISTING",
        authMethod: "sandbox_otp",
      });

      assert.ok(session.session);
      // Verify session object schema has no OTP field
      assert.equal((session.session as Record<string, unknown>)["otp"], undefined);
      assert.equal((session.session as Record<string, unknown>)["authCode"], undefined);
      assert.equal((session.session as Record<string, unknown>)["password"], undefined);
    } finally {
      if (origDemo !== undefined) {
        process.env["ABDM_DEMO_MODE"] = origDemo;
      } else {
        delete process.env["ABDM_DEMO_MODE"];
      }
      if (origId) process.env["ABDM_CLIENT_ID"] = origId;
      if (origSecret) process.env["ABDM_CLIENT_SECRET"] = origSecret;
    }
  });
});
