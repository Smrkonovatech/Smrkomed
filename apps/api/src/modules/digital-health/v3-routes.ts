import { Hono } from "hono";
import { z } from "zod";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { abdmV3Service } from "./abdm-v3-service";
import { hashAbha, maskAbha, normalizeAbhaDigits } from "./abdm-provider";

const aadhaarOtpRequestSchema = z.object({
  aadhaarNumber: z.string().min(12).max(16),
});

const aadhaarEnrolSchema = z.object({
  txnId: z.string().min(1),
  otp: z.string().min(4).max(8),
  mobile: z.string().min(10).max(15),
  patientId: z.string().optional(),
});

const abhaAddressSchema = z.object({
  txnId: z.string().min(1),
  abhaAddress: z.string().min(3),
  patientId: z.string().optional(),
  preferred: z.number().optional(),
});

const loginOtpRequestSchema = z.object({
  loginType: z.enum(["mobile", "aadhaar", "abha-number"]),
  identifier: z.string().min(1),
});

const loginVerifySchema = z.object({
  txnId: z.string().min(1),
  otp: z.string().min(4).max(8),
  loginType: z.enum(["mobile", "aadhaar", "abha-number"]),
  patientId: z.string().optional(),
});

const selectAccountSchema = z.object({
  txnId: z.string().min(1),
  abhaNumber: z.string().min(10),
  tToken: z.string().min(1),
  patientId: z.string().optional(),
});

export const abdmV3Routes = new Hono<AppEnv>()
  // ─── 1. ABHA Enrollment via Aadhaar OTP ─────────────────────────────────────
  .post("/enrol/aadhaar/request-otp", validate("json", aadhaarOtpRequestSchema), async (c) => {
    requirePermission(c, PERMISSIONS.ABHA_LINK);
    const body = c.req.valid("json");
    try {
      const result = await abdmV3Service.requestAadhaarEnrolOtp(body.aadhaarNumber);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_ENROL_OTP_FAILED", msg);
    }
  })

  .post("/enrol/aadhaar/verify", validate("json", aadhaarEnrolSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.ABHA_LINK);
    const body = c.req.valid("json");

    try {
      const result = await abdmV3Service.enrolByAadhaar({
        txnId: body.txnId,
        otp: body.otp,
        mobile: body.mobile,
      });

      // If patientId provided, link/update patient DigitalHealthIdentity
      if (body.patientId && result.ABHAProfile?.ABHANumber) {
        const rawAbha = result.ABHAProfile.ABHANumber;
        const digits = normalizeAbhaDigits(rawAbha);
        const abhaHash = hashAbha(digits);
        const masked = maskAbha(digits);
        const primaryAddress = result.ABHAProfile.phrAddress?.[0] || null;

        await prisma.digitalHealthIdentity.upsert({
          where: { patientId: body.patientId },
          create: {
            clinicId: tenant.clinicId,
            patientId: body.patientId,
            abhaNumberHash: abhaHash,
            abhaMasked: masked,
            abhaAddress: primaryAddress,
            status: "LINKED",
            verificationStatus: "VERIFIED_V3_AADHAAR",
            linkedAt: new Date(),
            lastVerifiedAt: new Date(),
            source: "ABDM_V3_ENROL",
            sandboxMode: result.tokens.token.includes("mock"),
          },
          update: {
            abhaNumberHash: abhaHash,
            abhaMasked: masked,
            abhaAddress: primaryAddress,
            status: "LINKED",
            verificationStatus: "VERIFIED_V3_AADHAAR",
            linkedAt: new Date(),
            lastVerifiedAt: new Date(),
            source: "ABDM_V3_ENROL",
            errorMessage: null,
          },
        });
      }

      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_ENROL_FAILED", msg);
    }
  })

  // ─── 2. Suggestions & Custom ABHA Address ──────────────────────────────────
  .get("/enrol/suggestions", async (c) => {
    requirePermission(c, PERMISSIONS.ABHA_LINK);
    const txnId = c.req.query("txnId");
    if (!txnId) {
      throw new HttpError(400, "TXN_ID_REQUIRED", "txnId query parameter is required.");
    }

    try {
      const suggestions = await abdmV3Service.getAddressSuggestions(txnId);
      return ok(c, suggestions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_SUGGESTIONS_FAILED", msg);
    }
  })

  .post("/enrol/abha-address", validate("json", abhaAddressSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.ABHA_LINK);
    const body = c.req.valid("json");

    try {
      const res = await abdmV3Service.createCustomAbhaAddress({
        txnId: body.txnId,
        abhaAddress: body.abhaAddress,
        preferred: body.preferred,
      });

      if (body.patientId && res.preferredAbhaAddress) {
        await prisma.digitalHealthIdentity.updateMany({
          where: { clinicId: tenant.clinicId, patientId: body.patientId },
          data: { abhaAddress: res.preferredAbhaAddress },
        });
      }

      return ok(c, res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_ADDRESS_CREATION_FAILED", msg);
    }
  })

  // ─── 3. Login / Verification Flows (Mobile / Aadhaar / ABHA) ───────────────
  .post("/auth/request-otp", validate("json", loginOtpRequestSchema), async (c) => {
    requirePermission(c, PERMISSIONS.ABHA_VERIFY);
    const body = c.req.valid("json");

    try {
      const result = await abdmV3Service.requestLoginOtp({
        loginType: body.loginType,
        identifier: body.identifier,
      });
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_LOGIN_OTP_FAILED", msg);
    }
  })

  .post("/auth/verify-otp", validate("json", loginVerifySchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.ABHA_VERIFY);
    const body = c.req.valid("json");

    try {
      const result = await abdmV3Service.verifyLoginOtp({
        txnId: body.txnId,
        otp: body.otp,
        loginType: body.loginType,
      });

      // If single account returned and patientId provided, link immediately
      if (body.patientId && result.accounts?.length === 1) {
        const acc = result.accounts[0];
        if (acc?.ABHANumber) {
          const digits = normalizeAbhaDigits(acc.ABHANumber);
          const abhaHash = hashAbha(digits);
          const masked = maskAbha(digits);

          await prisma.digitalHealthIdentity.upsert({
            where: { patientId: body.patientId },
            create: {
              clinicId: tenant.clinicId,
              patientId: body.patientId,
              abhaNumberHash: abhaHash,
              abhaMasked: masked,
              abhaAddress: acc.preferredAbhaAddress || null,
              status: "LINKED",
              verificationStatus: "VERIFIED_V3_LOGIN",
              linkedAt: new Date(),
              lastVerifiedAt: new Date(),
              source: "ABDM_V3_LOGIN",
              sandboxMode: (result.token ?? "").includes("mock"),
            },
            update: {
              abhaNumberHash: abhaHash,
              abhaMasked: masked,
              abhaAddress: acc.preferredAbhaAddress || null,
              status: "LINKED",
              verificationStatus: "VERIFIED_V3_LOGIN",
              lastVerifiedAt: new Date(),
              source: "ABDM_V3_LOGIN",
              errorMessage: null,
            },
          });
        }
      }

      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_LOGIN_VERIFY_FAILED", msg);
    }
  })

  .post("/auth/select-account", validate("json", selectAccountSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.ABHA_VERIFY);
    const body = c.req.valid("json");

    try {
      const result = await abdmV3Service.selectLoginUser({
        txnId: body.txnId,
        abhaNumber: body.abhaNumber,
        tToken: body.tToken,
      });

      if (body.patientId && body.abhaNumber) {
        const digits = normalizeAbhaDigits(body.abhaNumber);
        const abhaHash = hashAbha(digits);
        const masked = maskAbha(digits);

        await prisma.digitalHealthIdentity.upsert({
          where: { patientId: body.patientId },
          create: {
            clinicId: tenant.clinicId,
            patientId: body.patientId,
            abhaNumberHash: abhaHash,
            abhaMasked: masked,
            status: "LINKED",
            verificationStatus: "VERIFIED_V3_ACCOUNT_SELECTED",
            linkedAt: new Date(),
            lastVerifiedAt: new Date(),
            source: "ABDM_V3_LOGIN",
            sandboxMode: result.token.includes("mock"),
          },
          update: {
            abhaNumberHash: abhaHash,
            abhaMasked: masked,
            status: "LINKED",
            verificationStatus: "VERIFIED_V3_ACCOUNT_SELECTED",
            lastVerifiedAt: new Date(),
            source: "ABDM_V3_LOGIN",
            errorMessage: null,
          },
        });
      }

      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_SELECT_ACCOUNT_FAILED", msg);
    }
  })

  // ─── 4. FaceAuth QR & PID Polling ──────────────────────────────────────────
  .post("/face-auth/init", async (c) => {
    requirePermission(c, PERMISSIONS.ABHA_LINK);
    try {
      const result = await abdmV3Service.initFaceAuth();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_FACE_AUTH_INIT_FAILED", msg);
    }
  })

  .get("/face-auth/status", async (c) => {
    requirePermission(c, PERMISSIONS.ABHA_LINK);
    const txnId = c.req.query("txnId");
    if (!txnId) throw new HttpError(400, "TXN_ID_REQUIRED", "txnId is required.");

    try {
      const result = await abdmV3Service.pollFaceAuthCapture(txnId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_FACE_AUTH_STATUS_FAILED", msg);
    }
  })

  // ─── 5. Profile, Card & QR Assets ──────────────────────────────────────────
  .get("/profile", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const xToken = c.req.query("xToken") || c.req.header("X-token");
    if (!xToken) throw new HttpError(401, "X_TOKEN_REQUIRED", "Patient X-token is required.");

    try {
      const profile = await abdmV3Service.getProfile(xToken);
      return ok(c, profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_PROFILE_FAILED", msg);
    }
  })

  .get("/profile/abha-card", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const xToken = c.req.query("xToken") || c.req.header("X-token");
    if (!xToken) throw new HttpError(401, "X_TOKEN_REQUIRED", "Patient X-token is required.");

    try {
      const card = await abdmV3Service.getAbhaCard(xToken);
      return ok(c, card);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_CARD_FAILED", msg);
    }
  })

  .get("/profile/qr-code", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const xToken = c.req.query("xToken") || c.req.header("X-token");
    if (!xToken) throw new HttpError(401, "X_TOKEN_REQUIRED", "Patient X-token is required.");

    try {
      const qr = await abdmV3Service.getQrCode(xToken);
      return ok(c, qr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABHA_V3_QR_FAILED", msg);
    }
  });
