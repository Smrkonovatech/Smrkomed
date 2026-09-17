import { Hono } from "hono";
import { z } from "zod";
import { PERMISSIONS } from "@smrkomed/database";

import { requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { abdmHprService } from "./abdm-hpr-service";
import type {
  HprPractitionerPayload,
  HfrBasicFacilityInfoRequest,
  HfrAdditionalInfoRequest,
  HfrDetailedInfoRequest,
  HfrSubmitFacilityRequest,
  HfrMultipleHrpRequest,
  HfrValidateOtpRequest,
  HfrUwinFetchDetailsRequest,
  HfrUwinValidateOtpRequest,
  HfrDeduplicateFacilityRequest,
} from "./abdm-hpr-types";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const passwordLoginSchema = z.object({
  hprId: z.string().min(3),
  password: z.string().min(1),
  domainName: z.string().optional(),
});

const mobileOtpSendSchema = z.object({
  mobile: z.string().min(10).max(15),
});

const mobileOtpVerifySchema = z.object({
  otp: z.string().min(4).max(8),
  txnId: z.string().min(1),
  mobile: z.string().optional(),
});

const userAuthorizedTokenSchema = z.object({
  hpId: z.string().min(1),
  txnId: z.string().min(1),
});

const aadhaarLoginInitSchema = z.object({
  hprId: z.string().min(3),
});

const aadhaarLoginConfirmSchema = z.object({
  otp: z.string().min(4).max(8),
  txnId: z.string().min(1),
});

const aadhaarRegistrationOtpSchema = z.object({
  aadhaarNumber: z.string().min(12).max(16),
});

const aadhaarRegistrationVerifySchema = z.object({
  otp: z.string().min(4).max(8),
  txnId: z.string().min(1),
});

const checkHpIdSchema = z.object({
  txnId: z.string().min(1),
});

const demographicAuthSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
  txnId: z.string().min(1),
});

const regMobileOtpSendSchema = z.object({
  mobile: z.string().min(10).max(15),
  txnId: z.string().min(1),
});

const regMobileOtpVerifySchema = z.object({
  otp: z.string().min(4).max(8),
  txnId: z.string().min(1),
});

const suggestionsSchema = z.object({
  txnId: z.string().min(1),
});

const createHprIdSchema = z.object({
  txnId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8),
  profilePhoto: z.string().optional(),
  hpCategoryCode: z.number().int(),
  hpSubCategoryCode: z.number().int(),
  hprId: z.string().optional(),
  clientId: z.string().optional(),
  stateCode: z.string().optional(),
  districtCode: z.string().optional(),
  council: z.boolean().optional(),
  role: z.number().int().optional(),
});

const facilitySearchSchema = z.object({
  ownershipCode: z.string().optional(),
  subDistrictLGDCode: z.string().optional(),
  pincode: z.string().optional(),
  facilityName: z.string().optional(),
  facilityId: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  resultsPerPage: z.union([z.string(), z.number()]).optional(),
  stateLGDCode: z.string().optional(),
  districtLGDCode: z.string().optional(),
});

const registerProfessionalSchema = z.object({
  hprToken: z.string().min(1),
  practitioner: z.custom<HprPractitionerPayload>((val) => Boolean(val && typeof val === "object")),
});

const fetchProfessionalInfoSchema = z.object({
  practitioner: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    contactNumber: z.string().optional(),
    state: z.string().optional(),
    registrationNumber: z.string().optional(),
  }),
});

const updateProfessionalSchema = z.object({
  hprToken: z.string().min(1),
  practitioner: z.custom<HprPractitionerPayload>((val) => Boolean(val && typeof val === "object")),
});


const fetchDocumentsListSchema = z.object({
  hprid: z.string().min(1),
});

const uploadDocumentSchema = z.object({
  hpr_token: z.string().min(1),
  document: z.array(
    z.object({
      document_id: z.number().int(),
      document_type: z.enum([
        "profilePhoto",
        "degreeCertificate",
        "registrationCertificate",
        "proofOfWorkCertificate",
        "proofOfNameChangeRegCertificate",
        "proofOfNameChangeQualCertificate",
      ]),
      fileType: z.string().min(1),
      data: z.string().min(1),
    }),
  ).min(1),
});

const generateEmailOtpSchema = z.object({
  hpr_token: z.string().min(1),
  emailAddress: z.string().email(),
  otp_type: z.string().optional(),
});

const resendEmailOtpSchema = z.object({
  hpr_token: z.string().min(1),
  emailAddress: z.string().email(),
  otp_type: z.string().optional(),
});

const verifyEmailOtpSchema = z.object({
  hpr_token: z.string().min(1),
  hpr_id: z.string().min(1),
  officialEmail: z.string().email(),
  emailOtp: z.number().int(),
});

const generateUpdateMobileOtpSchema = z.object({
  hpr_token: z.string().min(1),
  officialMobile: z.string().min(10),
});

const regenerateUpdateMobileOtpSchema = z.object({
  hpr_token: z.string().min(1),
  officialMobile: z.string().min(10),
});

const verifyUpdateMobileOtpSchema = z.object({
  hpr_token: z.string().min(1),
  txnId: z.string().min(1),
  otp: z.string().min(4).max(8),
});

const recoverPasswordSendMobileOtpSchema = z.object({
  hprId: z.string().min(1),
});

const recoverPasswordVerifyMobileOtpSchema = z.object({
  txnId: z.string().min(1),
  otp: z.string().min(4).max(8),
});

const resetPasswordSchema = z.object({
  txnId: z.string().min(1),
  newPassword: z.string().min(8),
});

const recoverPasswordByAadhaarSchema = z.object({
  hprId: z.string().min(1),
});

const recoverPasswordConfirmByAadhaarSchema = z.object({
  txnId: z.string().min(1),
  otp: z.string().min(4).max(8),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const forgotIdAadhaarGenerateOtpSchema = z.object({
  aadhaar: z.string().min(12).max(16),
  iagree: z.boolean().optional(),
});

const forgotIdAadhaarVerifyOtpSchema = z.object({
  otp: z.string().min(4).max(8),
  txnId: z.string().min(1),
});

const forgotIdMobileGenerateOtpSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
});

const forgotIdMobileVerifyOtpSchema = z.object({
  otp: z.string().min(4).max(8),
  txnId: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  yearOfBirth: z.string().min(4),
  monthOfBirth: z.string().min(1),
  dayOfBirth: z.string().min(1),
  gender: z.string().min(1),
});

const basicFacilityInfoSchema = z.object({
  trackingId: z.string().optional(),
  facilityInformation: z.record(z.unknown()),
});

const additionalFacilityInfoSchema = z.object({
  trackingId: z.string().min(1),
  generalInformation: z.record(z.unknown()),
  linkedProgramIds: z.record(z.unknown()).optional(),
});

const detailedFacilityInfoSchema = z.object({
  trackingId: z.string().optional(),
  specialities: z.array(z.record(z.unknown())).optional(),
  medicalInfrastructure: z.record(z.unknown()).optional(),
  pharmacyDetails: z.record(z.unknown()).optional(),
  bloodBankDetails: z.record(z.unknown()).optional(),
  imagingServices: z.array(z.record(z.unknown())).optional(),
  diagnosticServices: z.array(z.string()).optional(),
});

const submitFacilitySchema = z.object({
  trackingId: z.string().min(1),
  sourceOfInformation: z.string().optional(),
  sourceUniqueID: z.string().optional(),
});

const multipleHrpSchema = z.object({
  facilityId: z.string().min(1),
  facilityName: z.string().min(1),
  HRP: z.array(
    z.object({
      bridgeId: z.string().min(1),
      hipName: z.string().min(1),
      type: z.string().min(1),
      active: z.union([z.boolean(), z.string()]),
    }),
  ),
});

const facilitySendOtpSchema = z.object({
  facilityId: z.string().min(1),
});

const facilityValidateOtpSchema = z.object({
  facilityId: z.string().min(1),
  sourceId: z.string().min(1),
  otp: z.string().min(1),
  source: z.string().min(1),
  transactionId: z.string().min(1),
});

const facilityContactDetailsSchema = z.object({
  facilityId: z.string().min(1),
});

const uwinFetchDetailsSchema = z.object({
  facilityId: z.string().min(1),
  source: z.string().min(1),
  sourceId: z.string().min(1),
});

const uwinValidateOtpSchema = z.object({
  facilityId: z.string().min(1),
  sourceId: z.string().min(1),
  otp: z.string().min(1),
  source: z.string().min(1),
  transactionId: z.string().min(1),
});

const deduplicateFacilitySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  district: z.string().min(1),
  subDistrict: z.string().min(1),
  village: z.string().optional(),
  geolocation: z.string().optional(),
  facilityId: z.string().optional(),
});

// ─── HPR Router ──────────────────────────────────────────────────────────────

export const hprRoutes = new Hono<AppEnv>()

  // ─── 1. Authentication ───

  .post("/auth/password", validate("json", passwordLoginSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.loginWithPassword(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_AUTH_PASSWORD_FAILED", msg);
    }
  })

  .post("/auth/mobile/send-otp", validate("json", mobileOtpSendSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.sendLoginMobileOtp(body.mobile);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_MOBILE_OTP_SEND_FAILED", msg);
    }
  })

  .post("/auth/mobile/verify-otp", validate("json", mobileOtpVerifySchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.verifyLoginMobileOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_MOBILE_OTP_VERIFY_FAILED", msg);
    }
  })

  .post("/auth/mobile/authorize-token", validate("json", userAuthorizedTokenSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.authorizeUserToken(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_USER_AUTH_TOKEN_FAILED", msg);
    }
  })

  .post("/auth/aadhaar/send-otp", validate("json", aadhaarLoginInitSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.initAadhaarLogin(body.hprId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_AADHAAR_LOGIN_INIT_FAILED", msg);
    }
  })

  .post("/auth/aadhaar/verify-otp", validate("json", aadhaarLoginConfirmSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.confirmAadhaarLogin(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_AADHAAR_LOGIN_CONFIRM_FAILED", msg);
    }
  })

  // ─── 2. Registration ───

  .post("/registration/aadhaar/send-otp", validate("json", aadhaarRegistrationOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.generateAadhaarRegistrationOtp(body.aadhaarNumber);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_AADHAAR_REG_OTP_FAILED", msg);
    }
  })

  .post("/registration/aadhaar/verify-otp", validate("json", aadhaarRegistrationVerifySchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.verifyAadhaarRegistrationOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_AADHAAR_REG_VERIFY_FAILED", msg);
    }
  })

  .post("/registration/aadhaar/check-account", validate("json", checkHpIdSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.checkHpIdAccountExist(body.txnId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_CHECK_ACCOUNT_FAILED", msg);
    }
  })

  .post("/registration/mobile/demographic-auth", validate("json", demographicAuthSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.demographicAuthViaMobile(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_DEMO_AUTH_FAILED", msg);
    }
  })

  .post("/registration/mobile/send-otp", validate("json", regMobileOtpSendSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.generateRegistrationMobileOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_REG_MOBILE_OTP_FAILED", msg);
    }
  })

  .post("/registration/mobile/verify-otp", validate("json", regMobileOtpVerifySchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.verifyRegistrationMobileOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_REG_MOBILE_VERIFY_FAILED", msg);
    }
  })

  .post("/registration/suggestions", validate("json", suggestionsSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.getHprIdSuggestions(body.txnId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_SUGGESTIONS_FAILED", msg);
    }
  })

  .post("/registration/create-hpr-id", validate("json", createHprIdSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.createHprId(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_CREATE_ID_FAILED", msg);
    }
  })

  // ─── 3. Facility Search ───

  .post("/facilities/search", validate("json", facilitySearchSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.searchFacilities(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_FACILITY_SEARCH_FAILED", msg);
    }
  })

  // ─── 4. Professional Details & Profiles ───

  .post("/professionals/register", validate("json", registerProfessionalSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.registerProfessional(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_REGISTER_PROFESSIONAL_FAILED", msg);
    }
  })

  .post("/professionals/fetch", validate("json", fetchProfessionalInfoSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.fetchProfessionalInfo(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_FETCH_PROFESSIONAL_FAILED", msg);
    }
  })

  .post("/professionals/update", validate("json", updateProfessionalSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.updateProfessional(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_UPDATE_PROFESSIONAL_FAILED", msg);
    }
  })

  // ─── 5. Document Management ───

  .post("/documents/list", validate("json", fetchDocumentsListSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.fetchDocumentsList(body.hprid);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_FETCH_DOCUMENTS_FAILED", msg);
    }
  })

  .post("/documents/upload", validate("json", uploadDocumentSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.uploadDocuments(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_UPLOAD_DOCUMENT_FAILED", msg);
    }
  })

  // ─── 6. Email Verification ───

  .post("/email/send-otp", validate("json", generateEmailOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.generateEmailVerificationOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_EMAIL_OTP_SEND_FAILED", msg);
    }
  })

  .post("/email/resend-otp", validate("json", resendEmailOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.resendEmailVerificationOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_EMAIL_OTP_RESEND_FAILED", msg);
    }
  })

  .post("/email/verify-otp", validate("json", verifyEmailOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.verifyEmailOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_EMAIL_OTP_VERIFY_FAILED", msg);
    }
  })

  // ─── 7. Update Mobile via API ───

  .post("/mobile/generate-otp", validate("json", generateUpdateMobileOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.generateUpdateMobileOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_MOBILE_UPDATE_OTP_FAILED", msg);
    }
  })

  .post("/mobile/regenerate-otp", validate("json", regenerateUpdateMobileOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.regenerateUpdateMobileOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_MOBILE_UPDATE_REGENERATE_FAILED", msg);
    }
  })

  .post("/mobile/verify-otp", validate("json", verifyUpdateMobileOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_MANAGE);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.verifyUpdateMobileOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_MOBILE_UPDATE_VERIFY_FAILED", msg);
    }
  })

  // ─── 8. Account, Profile & ID Card ───

  .get("/account/logout", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const authHeader = c.req.header("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    try {
      const result = await abdmHprService.logout(token);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_LOGOUT_FAILED", msg);
    }
  })

  .get("/account/id-card", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const authHeader = c.req.header("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    try {
      const result = await abdmHprService.getIdCard(token);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_ID_CARD_FAILED", msg);
    }
  })

  .get("/account/information", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const authHeader = c.req.header("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    try {
      const result = await abdmHprService.getAccountInformation(token);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_ACCOUNT_INFO_FAILED", msg);
    }
  })

  // ─── 9. Password Management & Recovery ───

  .post("/password/recover/by-mobile/send-otp", validate("json", recoverPasswordSendMobileOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.recoverPasswordSendMobileOtp(body.hprId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_RECOVER_PWD_SEND_OTP_FAILED", msg);
    }
  })

  .post("/password/recover/by-mobile/verify-otp", validate("json", recoverPasswordVerifyMobileOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.recoverPasswordVerifyMobileOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_RECOVER_PWD_VERIFY_OTP_FAILED", msg);
    }
  })

  .post("/password/reset", validate("json", resetPasswordSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.resetPassword(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_RESET_PASSWORD_FAILED", msg);
    }
  })

  .post("/password/recover/by-aadhaar/send-otp", validate("json", recoverPasswordByAadhaarSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.recoverPasswordByAadhaar(body.hprId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_RECOVER_PWD_BY_AADHAAR_FAILED", msg);
    }
  })

  .post("/password/recover/by-aadhaar/verify-otp", validate("json", recoverPasswordConfirmByAadhaarSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.recoverPasswordConfirmByAadhaar(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_RECOVER_PWD_CONFIRM_AADHAAR_FAILED", msg);
    }
  })

  .post("/password/change", validate("json", changePasswordSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const authHeader = c.req.header("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.changePasswordWithOldPassword({
        token,
        oldPassword: body.oldPassword,
        newPassword: body.newPassword,
      });
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_CHANGE_PASSWORD_FAILED", msg);
    }
  })

  // ─── 10. Forgot HPR ID ───

  .post("/forgot-id/aadhaar/generate-otp", validate("json", forgotIdAadhaarGenerateOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.forgotIdAadhaarGenerateOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_FORGOT_ID_AADHAAR_OTP_FAILED", msg);
    }
  })

  .post("/forgot-id/aadhaar/verify-otp", validate("json", forgotIdAadhaarVerifyOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.forgotIdAadhaarVerifyOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_FORGOT_ID_AADHAAR_VERIFY_FAILED", msg);
    }
  })

  .post("/forgot-id/mobile/generate-otp", validate("json", forgotIdMobileGenerateOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.forgotIdMobileGenerateOtp(body.mobileNumber);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_FORGOT_ID_MOBILE_OTP_FAILED", msg);
    }
  })

  .post("/forgot-id/mobile/verify-otp", validate("json", forgotIdMobileVerifyOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.forgotIdMobileVerifyOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_FORGOT_ID_MOBILE_VERIFY_FAILED", msg);
    }
  })

  // ─── 11. Search HPRID Document API ───

  .get("/search/exists/:hprId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const hprId = c.req.param("hprId");
    try {
      const exists = await abdmHprService.checkHprIdExists(hprId);
      return ok(c, { exists });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_EXISTS_CHECK_FAILED", msg);
    }
  })

  .get("/search/hpr-id/:hprId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const hprId = c.req.param("hprId");
    try {
      const result = await abdmHprService.searchHprId(hprId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_SEARCH_BY_ID_FAILED", msg);
    }
  })

  .get("/search/mobile/:mobile", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const mobile = c.req.param("mobile");
    try {
      const result = await abdmHprService.searchHprByMobile(mobile);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_SEARCH_BY_MOBILE_FAILED", msg);
    }
  })

  // ─── 12. Master Data (HPR) via APIs ───

  .get("/masters/systems-of-medicine", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    try {
      const result = await abdmHprService.getSystemsOfMedicine();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_SYSTEMS_OF_MEDICINE_FAILED", msg);
    }
  })

  .get("/masters/medical-councils", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    try {
      const result = await abdmHprService.getMedicalCouncils();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_MEDICAL_COUNCILS_FAILED", msg);
    }
  })

  .get("/masters/languages", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const languageId = c.req.query("id");
    try {
      const result = await abdmHprService.getLanguages(languageId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_LANGUAGES_FAILED", msg);
    }
  })

  .get("/masters/universities", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const collegeId = c.req.query("collegeId");
    try {
      const result = await abdmHprService.getUniversities(collegeId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_UNIVERSITIES_FAILED", msg);
    }
  })

  .post("/masters/colleges/:stateId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const stateId = c.req.param("stateId");
    const rawBody = await c.req.json().catch(() => ({}));
    const systemOfMedicine = typeof rawBody === "object" && rawBody && "systemOfMedicine" in rawBody
      ? String((rawBody as Record<string, unknown>)["systemOfMedicine"])
      : undefined;
    try {
      const result = await abdmHprService.getColleges(stateId, systemOfMedicine);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_COLLEGES_FAILED", msg);
    }
  })

  .post("/masters/courses", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const rawBody = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    try {
      const result = await abdmHprService.getCourses(rawBody);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_COURSES_FAILED", msg);
    }
  })

  .get("/masters/countries", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const countryId = c.req.query("id");
    try {
      const result = await abdmHprService.getCountries(countryId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_COUNTRIES_FAILED", msg);
    }
  })

  .get("/masters/states", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const stateId = c.req.query("id");
    try {
      const result = await abdmHprService.getStates(stateId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_STATES_FAILED", msg);
    }
  })

  .get("/masters/districts/:stateId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const stateId = c.req.param("stateId");
    try {
      const result = await abdmHprService.getDistricts(stateId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_DISTRICTS_FAILED", msg);
    }
  })

  .get("/masters/sub-districts/:districtId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const districtId = c.req.param("districtId");
    try {
      const result = await abdmHprService.getSubDistricts(districtId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_SUB_DISTRICTS_FAILED", msg);
    }
  })

  .get("/masters/nurse-affiliated-boards", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const boardId = c.req.query("boardId");
    try {
      const result = await abdmHprService.getNurseAffiliatedBoards(boardId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_NURSE_BOARDS_FAILED", msg);
    }
  })

  .get("/masters/nurse-councils", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    try {
      const result = await abdmHprService.getNurseCouncils();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_NURSE_COUNCILS_FAILED", msg);
    }
  })

  .get("/masters/nurse-colleges/:stateId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const stateId = c.req.param("stateId");
    try {
      const result = await abdmHprService.getNurseCollegesByState(stateId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_NURSE_COLLEGES_FAILED", msg);
    }
  })

  .get("/masters/state-affiliated-boards/:stateId", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const stateId = c.req.param("stateId");
    try {
      const result = await abdmHprService.getAffiliatedBoardsByState(stateId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_STATE_AFFILIATED_BOARDS_FAILED", msg);
    }
  })

  .get("/masters/ministries", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const hprToken = c.req.header("x-hprid-auth");
    try {
      const result = await abdmHprService.getAllMinistry(hprToken);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_MINISTRIES_FAILED", msg);
    }
  })

  .get("/masters/categories", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const role = Number(c.req.query("role") || 1);
    try {
      const result = await abdmHprService.getHprCategories(role);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_CATEGORIES_FAILED", msg);
    }
  })

  .get("/masters/sub-categories", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const role = Number(c.req.query("role") || 1);
    const categoryCode = c.req.query("categoryCode") || "1";
    try {
      const result = await abdmHprService.getHprSubCategories(role, categoryCode);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HPR_GET_SUB_CATEGORIES_FAILED", msg);
    }
  })

  // ─── 13. Health Facility Registry (HFR) APIs ───

  .post("/facility/search", validate("json", facilitySearchSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.searchHfrFacility(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_FACILITY_SEARCH_FAILED", msg);
    }
  })

  .post("/facility/basic-information", validate("json", basicFacilityInfoSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const hprToken = c.req.header("x-hprid-auth") || "";
    const body = c.req.valid("json") as unknown as HfrBasicFacilityInfoRequest;
    try {
      const result = await abdmHprService.onboardBasicFacilityInfo(body, hprToken);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_BASIC_INFO_FAILED", msg);
    }
  })

  .post("/facility/additional-information", validate("json", additionalFacilityInfoSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json") as unknown as HfrAdditionalInfoRequest;
    try {
      const result = await abdmHprService.onboardAdditionalFacilityInfo(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_ADDITIONAL_INFO_FAILED", msg);
    }
  })

  .post("/facility/detailed-information", validate("json", detailedFacilityInfoSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json") as unknown as HfrDetailedInfoRequest;
    try {
      const result = await abdmHprService.onboardDetailedFacilityInfo(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_DETAILED_INFO_FAILED", msg);
    }
  })

  .post("/facility/submit-facility", validate("json", submitFacilitySchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const hprToken = c.req.header("x-hprid-auth") || "";
    const body = c.req.valid("json") as unknown as HfrSubmitFacilityRequest;
    try {
      const result = await abdmHprService.submitFacility(body, hprToken);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_SUBMIT_FACILITY_FAILED", msg);
    }
  })

  .get("/facility/master-types", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    try {
      const result = await abdmHprService.getHfrMasterTypes();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_GET_MASTER_TYPES_FAILED", msg);
    }
  })

  .get("/facility/master-data", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const type = c.req.query("type") || "";
    try {
      const result = await abdmHprService.getHfrMasterData(type);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_GET_MASTER_DATA_FAILED", msg);
    }
  })

  .get("/facility/lgd/states", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    try {
      const result = await abdmHprService.getHfrLgdStates();
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_GET_LGD_STATES_FAILED", msg);
    }
  })

  .get("/facility/lgd/districts", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const stateCode = c.req.query("stateCode") || "";
    try {
      const result = await abdmHprService.getHfrLgdDistricts(stateCode);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_GET_LGD_DISTRICTS_FAILED", msg);
    }
  })

  .get("/facility/lgd/sub-districts", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const districtCode = c.req.query("districtCode") || "";
    try {
      const result = await abdmHprService.getHfrLgdSubDistricts(districtCode);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_GET_LGD_SUB_DISTRICTS_FAILED", msg);
    }
  })

  .post("/facility/fetch-facility-type", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const rawBody = (await c.req.json().catch(() => ({}))) as { ownershipCode?: string; systemOfMedicineCode?: string };
    try {
      const result = await abdmHprService.fetchHfrFacilityType({
        ownershipCode: rawBody.ownershipCode || "P",
        systemOfMedicineCode: rawBody.systemOfMedicineCode,
      });
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_FETCH_FACILITY_TYPE_FAILED", msg);
    }
  })

  .post("/facility/get-owner-subtype", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const rawBody = (await c.req.json().catch(() => ({}))) as { ownershipCode?: string; ownerSubtypeCode?: string };
    try {
      const result = await abdmHprService.getHfrOwnerSubtypes({
        ownershipCode: rawBody.ownershipCode || "G",
        ownerSubtypeCode: rawBody.ownerSubtypeCode,
      });
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_GET_OWNER_SUBTYPE_FAILED", msg);
    }
  })

  .post("/facility/get-specialities", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const rawBody = (await c.req.json().catch(() => ({}))) as { systemOfMedicineCode?: string };
    try {
      const result = await abdmHprService.getHfrSpecialities({
        systemOfMedicineCode: rawBody.systemOfMedicineCode || "M",
      });
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_GET_SPECIALITIES_FAILED", msg);
    }
  })

  .post("/facility/fetch-facility-sub-type", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const rawBody = (await c.req.json().catch(() => ({}))) as { facilityTypeCode?: string };
    try {
      const result = await abdmHprService.fetchHfrFacilitySubtype({
        facilityTypeCode: rawBody.facilityTypeCode || "5",
      });
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_FETCH_FACILITY_SUB_TYPE_FAILED", msg);
    }
  })

  .post("/facility/bridges/multiple-hrp", validate("json", multipleHrpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json") as unknown as HfrMultipleHrpRequest;
    try {
      const result = await abdmHprService.linkMultipleHrp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_MULTIPLE_HRP_LINK_FAILED", msg);
    }
  })

  .post("/facility/send-otp-to-contact", validate("json", facilitySendOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.sendFacilityContactOtp(body.facilityId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_SEND_OTP_CONTACT_FAILED", msg);
    }
  })

  .post("/facility/validate-otp", validate("json", facilityValidateOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json") as unknown as HfrValidateOtpRequest;
    try {
      const result = await abdmHprService.validateFacilityContactOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_VALIDATE_OTP_FAILED", msg);
    }
  })

  .post("/facility/fetch-contact-details", validate("json", facilityContactDetailsSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json");
    try {
      const result = await abdmHprService.getFacilityContactDetails(body.facilityId);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_FETCH_CONTACT_DETAILS_FAILED", msg);
    }
  })

  .post("/facility/uwin/fetch-details", validate("json", uwinFetchDetailsSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json") as unknown as HfrUwinFetchDetailsRequest;
    try {
      const result = await abdmHprService.getFacilityDetailsForUwin(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_UWIN_FETCH_DETAILS_FAILED", msg);
    }
  })

  .post("/facility/uwin/validate-otp", validate("json", uwinValidateOtpSchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json") as unknown as HfrUwinValidateOtpRequest;
    try {
      const result = await abdmHprService.validateUwinOtp(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_UWIN_VALIDATE_OTP_FAILED", msg);
    }
  })

  .post("/facility/deduplicate", validate("json", deduplicateFacilitySchema), async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const body = c.req.valid("json") as unknown as HfrDeduplicateFacilityRequest;
    try {
      const result = await abdmHprService.deduplicateFacility(body);
      return ok(c, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpError(500, "HFR_DEDUPLICATE_FACILITY_FAILED", msg);
    }
  });


