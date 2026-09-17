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
  })

  // ─── 6. Milestone 2: HIP Care Context Linking & Bridge Management ──────────
  .post(
    "/m2/link-token",
    validate(
      "json",
      z.object({
        patientId: z.string().optional(),
        abhaAddress: z.string().optional(),
        abhaNumber: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(1),
        gender: z.enum(["M", "F", "O", "D"]),
        yearOfBirth: z.number().int().min(1900).max(2200),
      }),
    ),
    async (c) => {
      requirePermission(c, PERMISSIONS.ABHA_LINK);
      const body = c.req.valid("json");
      try {
        const result = await abdmV3Service.generateLinkToken(body);
        return ok(c, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(500, "ABDM_LINK_TOKEN_FAILED", msg);
      }
    },
  )

  .get("/m2/patient/:patientId/care-contexts", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const patientId = c.req.param("patientId");
    if (!patientId) throw new HttpError(400, "PATIENT_ID_REQUIRED", "patientId is required");

    try {
      const groups = await abdmV3Service.buildCareContextsForPatient(patientId, tenant.clinicId);
      return ok(c, groups);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABDM_BUILD_CARE_CONTEXTS_FAILED", msg);
    }
  })

  .post(
    "/m2/link/care-context",
    validate(
      "json",
      z.object({
        patientId: z.string().min(1),
        abhaAddress: z.string().min(3),
        abhaNumber: z.string().optional(),
        linkToken: z.string().min(1),
        hiType: z.string().optional(),
        patientDisplay: z.string().optional(),
        careContexts: z
          .array(
            z.object({
              referenceNumber: z.string().min(1),
              display: z.string().min(1),
            }),
          )
          .optional(),
      }),
    ),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.ABHA_LINK);
      const body = c.req.valid("json");
      try {
        const result = await abdmV3Service.linkCareContexts({
          ...body,
          clinicId: tenant.clinicId,
        });
        return ok(c, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(500, "ABDM_LINK_CARE_CONTEXT_FAILED", msg);
      }
    },
  )

  .get("/m2/patient/links", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const limit = Number(c.req.query("limit")) || 100;
    const xAuthToken = c.req.query("xAuthToken") || c.req.header("X-AUTH-TOKEN");
    try {
      const result = await abdmV3Service.getPatientLinks(limit, xAuthToken);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABDM_GET_PATIENT_LINKS_FAILED", msg);
    }
  })

  .post(
    "/m2/patient/notify",
    validate(
      "json",
      z.object({
        patientId: z.string().min(1),
        abhaAddress: z.string().min(3),
        patientReference: z.string().min(1),
        careContextReference: z.string().min(1),
        hiTypes: z.array(z.string()).optional(),
      }),
    ),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
      const body = c.req.valid("json");
      try {
        const result = await abdmV3Service.notifyCareContext({
          ...body,
          clinicId: tenant.clinicId,
        });
        return ok(c, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(500, "ABDM_CARE_CONTEXT_NOTIFY_FAILED", msg);
      }
    },
  )

  .post(
    "/m2/patient/sms-notify",
    validate(
      "json",
      z.object({
        phoneNo: z.string().min(10),
        hipName: z.string().optional(),
      }),
    ),
    async (c) => {
      requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
      const body = c.req.valid("json");
      try {
        const result = await abdmV3Service.sendPatientSmsNotification(body);
        return ok(c, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(500, "ABDM_SMS_NOTIFY_FAILED", msg);
      }
    },
  )

  .get("/m2/bridge/status", async (c) => {
    requirePermission(c, PERMISSIONS.ABDM_SETTINGS);
    try {
      const status = await abdmV3Service.getBridgeStatus();
      return ok(c, status);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABDM_BRIDGE_STATUS_FAILED", msg);
    }
  })

  .patch(
    "/m2/bridge/url",
    validate("json", z.object({ url: z.string().url() })),
    async (c) => {
      requirePermission(c, PERMISSIONS.ABDM_SETTINGS);
      const body = c.req.valid("json");
      try {
        const result = await abdmV3Service.updateBridgeUrl(body.url);
        return ok(c, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new HttpError(500, "ABDM_UPDATE_BRIDGE_URL_FAILED", msg);
      }
    },
  )

  // ─── 7. Milestone 3: HIU Gateway, Consent, Data Flow & Subscription ────────
  .get("/m3/openid-configuration", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    try {
      const result = await abdmV3Service.getOpenIdConfiguration();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABDM_M3_OPENID_FAILED", msg);
    }
  })

  .get("/m3/certs", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    try {
      const result = await abdmV3Service.getCerts();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "ABDM_M3_CERTS_FAILED", msg);
    }
  })

  .post("/m3/consent/init", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const body = await c.req.json();
    try {
      const result = await abdmV3Service.initiateHiuConsentRequest(body, tenant.clinicId);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_CONSENT_INIT_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  })

  .get("/m3/consent/status/:consentRequestId", async (c) => {
    requirePermission(c, PERMISSIONS.CONSENT_VIEW);
    const consentRequestId = c.req.param("consentRequestId");
    try {
      const result = await abdmV3Service.getHiuConsentStatus(consentRequestId);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_CONSENT_STATUS_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  })

  .post("/m3/consent/fetch/:consentId", async (c) => {
    requirePermission(c, PERMISSIONS.CONSENT_VIEW);
    const consentId = c.req.param("consentId");
    try {
      const result = await abdmV3Service.fetchHiuConsentArtifact(consentId);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_CONSENT_FETCH_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  })

  .post(
    "/m3/data/request",
    validate(
      "json",
      z.object({
        consentId: z.string().min(1),
        dateRange: z.object({
          from: z.string().min(1),
          to: z.string().min(1),
        }),
        dataPushUrl: z.string().url().optional(),
      }),
    ),
    async (c) => {
      requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
      const body = c.req.valid("json");
      try {
        const result = await abdmV3Service.initiateHiuDataRequest(body);
        return ok(c, result);
      } catch (err: any) {
        if (err instanceof HttpError) throw err;
        const code = err.code || "ABDM_M3_DATA_REQUEST_FAILED";
        const msg = err.message || String(err);
        const status = err.statusCode || 400;
        throw new HttpError(status, code, msg);
      }
    },
  )

  .get("/m3/data/records/:transactionId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const transactionId = c.req.param("transactionId");
    const exchange = abdmV3Service.hiuDataExchanges.get(transactionId);
    if (!exchange) {
      throw new HttpError(404, "TRANSACTION_NOT_FOUND", "Data exchange transaction not found.");
    }
    return ok(c, {
      transactionId,
      consentId: exchange.consentId,
      status: exchange.status,
      count: exchange.records.length,
      records: exchange.records,
    });
  })

  .post("/m3/subscription/init", async (c) => {
    requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const body = await c.req.json();
    try {
      const result = await abdmV3Service.initiateSubscriptionRequest(body);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_SUBSCRIPTION_INIT_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  })

  .get("/m3/subscription/requests", async (c) => {
    requirePermission(c, PERMISSIONS.CONSENT_VIEW);
    const status = c.req.query("status") || "ALL";
    const limit = Number(c.req.query("limit")) || 10;
    const offset = Number(c.req.query("offset")) || 0;
    const xAuthToken = c.req.query("xAuthToken") || c.req.header("X-AUTHTOKEN");
    try {
      const result = await abdmV3Service.getSubscriptionRequests({ status, limit, offset }, xAuthToken);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_SUBSCRIPTION_GET_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  })

  .post("/m3/subscription/:id/approve", async (c) => {
    requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const id = c.req.param("id");
    const body = await c.req.json();
    const xAuthToken = c.req.header("X-AUTHTOKEN");
    try {
      const result = await abdmV3Service.approveSubscriptionRequest(id, body, xAuthToken);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_SUBSCRIPTION_APPROVE_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  })

  .post("/m3/subscription/:id/deny", async (c) => {
    requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const id = c.req.param("id");
    const body = await c.req.json();
    const xAuthToken = c.req.header("X-AUTHTOKEN");
    try {
      const result = await abdmV3Service.denySubscriptionRequest(id, body.reason, xAuthToken);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_SUBSCRIPTION_DENY_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  })

  .put("/m3/subscription/:id/edit", async (c) => {
    requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const id = c.req.param("id");
    const body = await c.req.json();
    const xAuthToken = c.req.header("X-AUTH-TOKEN");
    try {
      const result = await abdmV3Service.editSubscriptionRequest(id, body, xAuthToken);
      return ok(c, result);
    } catch (err: any) {
      if (err instanceof HttpError) throw err;
      const code = err.code || "ABDM_M3_SUBSCRIPTION_EDIT_FAILED";
      const msg = err.message || String(err);
      const status = err.statusCode || 400;
      throw new HttpError(status, code, msg);
    }
  });

