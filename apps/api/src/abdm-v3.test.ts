import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateKeyPairSync } from "node:crypto";

import { formatPublicKeyPem, encryptWithAbdmPublicKey } from "./modules/digital-health/abdm-v3-crypto";
import { AbdmV3HttpClient } from "./modules/digital-health/abdm-v3-client";
import { AbdmV3Service } from "./modules/digital-health/abdm-v3-service";

describe("ABDM V3 Cryptography & Client", () => {
  it("formats public key with PEM boundaries", () => {
    const rawKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0==";
    const pem = formatPublicKeyPem(rawKey);
    assert.ok(pem.startsWith("-----BEGIN PUBLIC KEY-----"));
    assert.ok(pem.endsWith("-----END PUBLIC KEY-----"));
  });

  it("encrypts sensitive data using RSA/ECB/OAEPWithSHA-1AndMGF1Padding", () => {
    const { publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const pubPem = publicKey.export({ type: "spki", format: "pem" }).toString();

    const plainText = "123456789012";
    const cipherText = encryptWithAbdmPublicKey(pubPem, plainText);

    assert.ok(typeof cipherText === "string");
    assert.ok(cipherText.length > 50);
    assert.match(cipherText, /^[A-Za-z0-9+/=]+$/);
    assert.notEqual(cipherText, plainText);
  });

  it("constructs correct V3 sandbox and production URLs", () => {
    const origEnv = process.env["ABDM_ENV"];
    try {
      process.env["ABDM_ENV"] = "sandbox";
      const sbxClient = new AbdmV3HttpClient();
      assert.equal(sbxClient.getCoreBaseUrl(), "https://abhasbx.abdm.gov.in/abha/api");
      assert.equal(sbxClient.getPhrBaseUrl(), "https://abhasbx.abdm.gov.in/abha/api/v3/phr/web");
      assert.equal(sbxClient.getSessionUrl(), "https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions");
      assert.equal(sbxClient.getCmId(), "sbx");

      process.env["ABDM_ENV"] = "production";
      const prodClient = new AbdmV3HttpClient();
      assert.equal(prodClient.getCoreBaseUrl(), "https://abha.abdm.gov.in/api/abha");
      assert.equal(prodClient.getPhrBaseUrl(), "https://phr.abdm.gov.in/api/phr/web/v3");
      assert.equal(prodClient.getSessionUrl(), "https://apis.abdm.gov.in/api/hiecm/gateway/v3/sessions");
      assert.equal(prodClient.getCmId(), "abdm");
    } finally {
      if (origEnv !== undefined) process.env["ABDM_ENV"] = origEnv;
      else delete process.env["ABDM_ENV"];
    }
  });

  it("handles V3 Aadhaar OTP enrollment workflow", async () => {
    const origDemo = process.env["ABDM_DEMO_MODE"];
    process.env["ABDM_DEMO_MODE"] = "1";
    try {
      const service = new AbdmV3Service();
      await assert.rejects(
        async () => {
          await service.requestAadhaarEnrolOtp("123");
        },
        { name: "AbdmV3ClientError", code: "INVALID_AADHAAR" },
      );

      const otpRes = await service.requestAadhaarEnrolOtp("123456789012");
      assert.ok(otpRes.txnId);
      assert.match(otpRes.message, /OTP/i);

      const enrolRes = await service.enrolByAadhaar({
        txnId: otpRes.txnId,
        otp: "123456",
        mobile: "9876543210",
      });
      assert.ok(enrolRes.tokens?.token);
      assert.ok(enrolRes.ABHAProfile?.ABHANumber);
      assert.equal(enrolRes.ABHAProfile.mobile, "9876543210");
    } finally {
      if (origDemo !== undefined) process.env["ABDM_DEMO_MODE"] = origDemo;
      else delete process.env["ABDM_DEMO_MODE"];
    }
  });

  it("handles suggestions and custom ABHA address creation", async () => {
    const origDemo = process.env["ABDM_DEMO_MODE"];
    process.env["ABDM_DEMO_MODE"] = "1";
    try {
      const service = new AbdmV3Service();
      const suggestions = await service.getAddressSuggestions("test-txn-123");
      assert.ok(Array.isArray(suggestions.abhaAddressList));
      assert.ok(suggestions.abhaAddressList.length > 0);

      const customRes = await service.createCustomAbhaAddress({
        txnId: "test-txn-123",
        abhaAddress: "rahul.sharma@sbx",
      });
      assert.equal(customRes.preferredAbhaAddress, "rahul.sharma@sbx");
    } finally {
      if (origDemo !== undefined) process.env["ABDM_DEMO_MODE"] = origDemo;
      else delete process.env["ABDM_DEMO_MODE"];
    }
  });

  it("handles FaceAuth initialization and status polling", async () => {
    const origDemo = process.env["ABDM_DEMO_MODE"];
    process.env["ABDM_DEMO_MODE"] = "1";
    try {
      const service = new AbdmV3Service();
      const init = await service.initFaceAuth();
      assert.ok(init.txnId);
      assert.ok(init.qrCodeUrl.includes("face-auth?txnId="));

      const status = await service.pollFaceAuthCapture(init.txnId);
      assert.ok(status.status);
    } finally {
      if (origDemo !== undefined) process.env["ABDM_DEMO_MODE"] = origDemo;
      else delete process.env["ABDM_DEMO_MODE"];
    }
  });
});
