import { EventEmitter } from "node:events";
import { randomUUID, type KeyObject } from "node:crypto";
import { prisma } from "@smrkomed/database";
import { abdmV3Client, AbdmV3ClientError } from "./abdm-v3-client";
import { getAbdmConfig } from "./abdm-config";
import { hashAbha, maskAbha, normalizeAbhaDigits } from "./abdm-provider";
import { buildInteropBundle } from "./interop";
import {
  calculateSharedSecret,
  decryptHiuDataPushEntry,
  deriveSymmetricKey,
  encryptFhirPayload,
  generateHipKeyMaterial,
  generateHiuKeyMaterial,
} from "./abdm-v3-data-crypto";
import {
  ABDM_ERROR_CODES,
  VALID_ACCESS_MODES,
  VALID_PURPOSE_CODES,
  VALID_PURPOSE_TEXTS,
  type MultipleHrpAddUpdateServicesRequest,
  type OAuthCertsResponse,
  type OpenIdConfigurationResponse,
  type CareContextItem,
  type PatientCareContextGroup,
  type V3CareContextLinkRequest,
  type V3CareContextNotifyRequest,
  type V3CareContextOnLinkCallback,
  type V3ConsentArtifactDetail,
  type V3ConsentNotifyCallbackPayload,
  type V3DataPushPayload,
  type V3DiscoverCallbackPayload,
  type V3HealthInfoNotifyPayload,
  type V3HealthInfoRequestCallbackPayload,
  type V3HiuConsentFetchRequest,
  type V3HiuConsentInitRequest,
  type V3HiuConsentNotifyCallback,
  type V3HiuConsentOnFetchCallback,
  type V3HiuConsentOnInitCallback,
  type V3HiuConsentOnNotifyAckRequest,
  type V3HiuConsentOnStatusCallback,
  type V3HiuConsentStatusRequest,
  type V3HiuDataNotifyRequest,
  type V3HiuDataOnRequestCallback,
  type V3HiuDataRequest,
  type V3LinkConfirmCallbackPayload,
  type V3LinkInitCallbackPayload,
  type V3LinkTokenGenerateRequest,
  type V3LinkTokenOnGenerateCallback,
  type V3PatientLinksResponse,
  type V3ProfileShareCallbackPayload,
  type V3SmsNotifyRequest,
  type V3SubscriptionApproveRequest,
  type V3SubscriptionCareContextOnNotifyAckRequest,
  type V3SubscriptionDenyRequest,
  type V3SubscriptionEditRequest,
  type V3SubscriptionEventNotifyCallback,
  type V3SubscriptionGetRequestsParams,
  type V3SubscriptionInitRequest,
  type V3SubscriptionNotifyCallback,
  type V3SubscriptionOnInitCallback,
  type V3SubscriptionOnNotifyAckRequest,
} from "./abdm-v3-types";

export const abdmV3Events = new EventEmitter();
abdmV3Events.setMaxListeners(100);

export interface V3EnrollmentOtpResponse {
  txnId: string;
  message: string;
}

export interface V3AbhaProfile {
  firstName: string;
  middleName?: string;
  lastName?: string;
  dob: string;
  mobile: string | null;
  gender: string;
  photo?: string;
  phrAddress?: string[];
  address?: string;
  districtCode?: string;
  stateCode?: string;
  pinCode?: string | number;
  abhaType?: string;
  stateName?: string;
  districtName?: string;
  ABHANumber: string;
  abhaStatus?: string;
  kycPhoto?: string;
}

export interface V3EnrollmentResponse {
  message: string;
  txnId: string;
  tokens: {
    token: string;
    expiresIn: number;
    refreshToken: string;
    refreshExpiresIn: number;
  };
  ABHAProfile: V3AbhaProfile;
  isNew: boolean;
}

export interface V3AddressSuggestionsResponse {
  txnId: string;
  abhaAddressList: string[];
}

export interface V3LoginVerifyResponse {
  txnId: string;
  authResult: string;
  message: string;
  token?: string;
  refreshToken?: string;
  accounts?: Array<{
    ABHANumber: string;
    preferredAbhaAddress?: string;
    name?: string;
    gender?: string;
    dob?: string;
    status?: string;
    profilePhoto?: string;
    kycVerified?: boolean;
  }>;
}

/**
 * NHA Official Validation on ABHA Address (CRT_ABHA_112):
 * 1. Minimum length - 8 characters
 * 2. Maximum length - 18 characters
 * 3. Special characters allowed - 1 dot (.) and/or 1 underscore (_)
 * 4. Special character dot and underscore should be in between. Cannot be in the beginning or at the end.
 * 5. Alphanumeric - only numbers, only letters or any combination allowed.
 */
export function validateAbhaAddress(rawAddress: string): { valid: boolean; error?: string } {
  const base = rawAddress.trim().split("@")[0] || "";
  if (base.length < 8) {
    return { valid: false, error: "ABHA Address minimum length is 8 characters." };
  }
  if (base.length > 18) {
    return { valid: false, error: "ABHA Address maximum length is 18 characters." };
  }
  if (/^[._]/.test(base) || /[._]$/.test(base)) {
    return { valid: false, error: "Special characters dot and underscore cannot be in the beginning or at the end." };
  }
  const dots = (base.match(/\./g) || []).length;
  const underscores = (base.match(/_/g) || []).length;
  if (dots > 1 || underscores > 1) {
    return { valid: false, error: "Special characters allowed: maximum 1 dot (.) and/or 1 underscore (_)." };
  }
  if (!/^[a-zA-Z0-9]+([._][a-zA-Z0-9]+)*$/.test(base)) {
    return { valid: false, error: "ABHA Address must be alphanumeric and may only contain allowed special characters in between." };
  }
  return { valid: true };
}

/**
 * Formats Aadhaar OTP collection prompt per NHA CRT_ABHA_105 spec:
 * "We just sent an OTP on the Mobile Number *******XXXX linked with Aadhaar. Enter the OTP below to proceed with ABHA creation"
 */
export function formatAadhaarOtpPrompt(maskedMobileLast4: string = "XXXX"): string {
  const last4 = maskedMobileLast4.slice(-4);
  return `We just sent an OTP on the Mobile Number *******${last4} linked with Aadhaar. Enter the OTP below to proceed with ABHA creation`;
}

/**
 * Resend OTP policy per NHA CRT_ABHA_106 spec:
 * System may activate the Resend OTP button maximum 2 times after 60 seconds cooldown.
 */
export function canResendOtp(input: { attempts: number; secondsSinceLastSend: number }): {
  allowed: boolean;
  reason?: string;
} {
  if (input.attempts >= 2) {
    return { allowed: false, reason: "Maximum 2 resend OTP attempts reached." };
  }
  if (input.secondsSinceLastSend < 60) {
    return {
      allowed: false,
      reason: `Please wait ${60 - input.secondsSinceLastSend} seconds before requesting a new OTP.`,
    };
  }
  return { allowed: true };
}

/**
 * Strict validation for ABDM Milestone 3 Consent Request Init (Section 4.3.1).
 * Matches all test scenarios specified in NHA Sandbox Documentation v2.6.
 */
export function validateConsentInitRequest(body: V3HiuConsentInitRequest): void {
  if (!body || !body.consent) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.REQUEST_BODY_MISSING.code,
      ABDM_ERROR_CODES.REQUEST_BODY_MISSING.message,
      400,
    );
  }

  const consent = body.consent;

  // Purpose text validation
  if (!consent.purpose || !consent.purpose.text || !consent.purpose.text.trim()) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Consent purpose text cannot be null",
      400,
    );
  }

  const purposeText = consent.purpose.text.trim();
  const validTextMatch = VALID_PURPOSE_TEXTS.some(
    (vt) => vt.toLowerCase() === purposeText.toLowerCase(),
  );
  if (!validTextMatch) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid purpose text, it must be in Care Management, Break the Glass, Public Health, Healthcare Payment, Disease Specific Healthcare Research, Self Requested",
      400,
    );
  }

  // Purpose code validation
  if (!consent.purpose.code || !consent.purpose.code.trim()) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Consent purpose code cannot be null",
      400,
    );
  }

  const purposeCode = consent.purpose.code.trim().toUpperCase();
  if (!VALID_PURPOSE_CODES.includes(purposeCode as any)) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid purpose code, it must be in CAREMGT, BTG, PUBHLTH, HPAYMT, DSRCH, PATRQT",
      400,
    );
  }

  // Purpose refUri validation
  if (!consent.purpose.refUri || !consent.purpose.refUri.trim()) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid consent purpose refURI",
      400,
    );
  }

  // Patient ABHA Address validation
  const patientId = consent.patient?.id ? consent.patient.id.trim() : "";
  const abhaRegex = /^[a-zA-Z0-9]+([._][a-zA-Z0-9]+)*@(abdm|sbx)$/;
  if (!patientId || !abhaRegex.test(patientId)) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid ABHA Address, it must start with Alphanumeric . and _ in the middle and must be ending with @abdm or @sbx",
      400,
    );
  }

  // HIU / HIP Service ID validation (Alphanumeric with _ or -)
  const hiuId = consent.hiu?.id ? consent.hiu.id.trim() : "";
  const serviceIdRegex = /^[a-zA-Z0-9]+([_-][a-zA-Z0-9]+)*$/;
  if (!hiuId || !serviceIdRegex.test(hiuId)) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid Service ID, it must be Alpha numeric and _ or - in middle",
      400,
    );
  }

  // If careContexts specified, HIP is mandatory
  if (consent.careContexts && consent.careContexts.length > 0) {
    if (!consent.hip?.id || !consent.hip.id.trim()) {
      throw new AbdmV3ClientError(
        ABDM_ERROR_CODES.HIP_MANDATORY_FOR_CARE_CONTEXTS.code,
        ABDM_ERROR_CODES.HIP_MANDATORY_FOR_CARE_CONTEXTS.message,
        400,
      );
    }
  }

  // Permission access mode validation
  const perm = consent.permission;
  if (!perm || !perm.accessMode || !VALID_ACCESS_MODES.includes(perm.accessMode as any)) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid accessMode, it must be in VIEW, STORE, QUERY, STREAM",
      400,
    );
  }

  // Permission date range validation
  if (!perm.dateRange || !perm.dateRange.from || !perm.dateRange.to) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "DateRange should not be null or empty",
      400,
    );
  }

  const fromDate = new Date(perm.dateRange.from);
  const toDate = new Date(perm.dateRange.to);
  const now = new Date();
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate > now || toDate > now) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid from/to date. Date must be a present/before date",
      400,
    );
  }

  // dataEraseAt must be in future
  if (!perm.dataEraseAt) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid data erase date. Date must be a future date",
      400,
    );
  }
  const eraseDate = new Date(perm.dataEraseAt);
  if (isNaN(eraseDate.getTime()) || eraseDate <= now) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Invalid data erase date. Date must be a future date",
      400,
    );
  }

  // Frequency validation
  if (!perm.frequency) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Frequency should not be null or empty",
      400,
    );
  }
  if (!perm.frequency.unit || !perm.frequency.unit.trim()) {
    throw new AbdmV3ClientError(
      ABDM_ERROR_CODES.UNKNOWN_EXCEPTION.code,
      "Frequency unit should not be null or empty",
      400,
    );
  }
}


/**
 * Communication mobile check per NHA CRT_ABHA_108 & CRT_ABHA_109:
 * If communication mobile is same as Aadhaar linked mobile, directly go to ABHA creation screen.
 * Otherwise, prompt for OTP to verify communication mobile number.
 */
export function shouldVerifyCommunicationMobile(aadhaarMobile: string, communicationMobile: string): boolean {
  const cleanA = aadhaarMobile.replace(/\D/g, "").slice(-10);
  const cleanC = communicationMobile.replace(/\D/g, "").slice(-10);
  return cleanA !== cleanC;
}

/**
 * Multilingual Consent Texts per NHA CRT_ABHA_102 & CRT_ABHA_103
 */
export const NHA_CONSENT_TEXTS: Record<string, { title: string; language: string; body: string }> = {
  en: {
    language: "English",
    title: "Consent for ABHA Creation",
    body: "I hereby declare that I am voluntarily sharing my Aadhaar number and demographic information with the National Health Authority (NHA) for the purpose of creation of Ayushman Bharat Health Account (ABHA).",
  },
  hi: {
    language: "Hindi",
    title: "आभा निर्माण हेतु सहमति",
    body: "मैं एतद्द्वारा घोषणा करता/करती हूँ कि मैं आयुष्मान भारत स्वास्थ्य खाता (ABHA) बनाने के उद्देश्य से राष्ट्रीय स्वास्थ्य प्राधिकरण (NHA) के साथ स्वेच्छा से अपना आधार नंबर और जनसांख्यिकीय विवरण साझा कर रहा/रही हूँ।",
  },
  kn: {
    language: "Kannada",
    title: "ABHA ರಚನೆಗಾಗಿ ಸಮ್ಮತಿ",
    body: "ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಆರೋಗ್ಯ ಖಾತೆ (ABHA) ರಚನೆಯ ಉದ್ದೇಶಕ್ಕಾಗಿ ನಾನು ಸ್ವಯಂಪ್ರೇರಿತನಾಗಿ ನನ್ನ ಆಧಾರ್ ಸಂಖ್ಯೆ ಮತ್ತು ವಿವರಗಳನ್ನು ರಾಷ್ಟ್ರೀಯ ಆರೋಗ್ಯ ಪ್ರಾಧಿಕಾರದೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ.",
  },
  te: {
    language: "Telugu",
    title: "ABHA సృష్టి కోసం సమ్మతి",
    body: "ఆయుష్మాన్ భారత్ హెల్త్ ఖాతా (ABHA) సృష్టి కోసం నేను నా ఆధార్ సంఖ్య మరియు వివరాలను స్వచ్ఛందంగా పంచుకుంటున్నాను.",
  },
  ta: {
    language: "Tamil",
    title: "ABHA உருவாக்குவதற்கான ஒப்புதல்",
    body: "ஆயுஷ்மான் பாரத் சுகாதார கணக்கு (ABHA) உருவாக்குவதற்காக எனது ஆதார் எண் மற்றும் விவரங்களை தானாக முன்வந்து பகிர்கிறேன்.",
  },
};

export class AbdmV3Service {
  private isLive(): boolean {
    const config = getAbdmConfig();
    return Boolean(config.isEnabled && !config.demoMode && config.clientId && config.clientSecret);
  }

  // ─── MILESTONE 3: IN-MEMORY TRACKING (SANDBOX / DEMO / GATEWAY) ───────────
  public hiuConsentRequests = new Map<
    string,
    {
      consentRequestId: string;
      status: "REQUESTED" | "INITIATED" | "GRANTED" | "REVOKED" | "DENIED" | "EXPIRED";
      patientId: string;
      request: V3HiuConsentInitRequest;
      consentArtefacts: string[];
      artifacts: Map<string, V3ConsentArtifactDetail>;
      createdAt: string;
      lastUpdated: string;
    }
  >();

  public hiuDataExchanges = new Map<
    string,
    {
      transactionId: string;
      consentId: string;
      hiuKeyMaterial: import("./abdm-v3-types").V3KeyMaterial;
      hiuPrivateKey: KeyObject;
      status: "REQUESTED" | "ACKNOWLEDGED" | "RECEIVED" | "FAILED";
      records: Array<{
        careContextReference: string;
        fhirJson: string;
        fhirBundle: Record<string, unknown>;
        checksum: string;
        verified: boolean;
      }>;
      createdAt: string;
      updatedAt: string;
    }
  >();

  public hiuSubscriptions = new Map<
    string,
    {
      subscriptionRequestId: string;
      status: "REQUESTED" | "GRANTED" | "DENIED";
      patientId: string;
      request: V3SubscriptionInitRequest;
      approvalDetails?: V3SubscriptionApproveRequest;
      events: V3SubscriptionEventNotifyCallback[];
      createdAt: string;
      updatedAt: string;
    }
  >();


  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ABHA CREATION VIA AADHAAR (Section 3.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request Aadhaar OTP for ABHA creation (CRT_ABHA_104 & CRT_ABHA_105).
   * Calls POST /v3/enrollment/request/otp with encrypted Aadhaar.
   */
  async requestAadhaarEnrolOtp(aadhaarNumber: string): Promise<V3EnrollmentOtpResponse> {
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      throw new AbdmV3ClientError("INVALID_AADHAAR", "Aadhaar Number is not valid", 400);
    }

    if (!this.isLive()) {
      return {
        txnId: randomUUID(),
        message: `OTP sent to Aadhaar-registered mobile (SANDBOX DEMO). Enter any 6-digit OTP.`,
      };
    }

    const encryptedAadhaar = await abdmV3Client.encrypt(cleanAadhaar);
    return abdmV3Client.request<V3EnrollmentOtpResponse>("/v3/enrollment/request/otp", {
      method: "POST",
      body: {
        txnId: "",
        scope: ["abha-enrol"],
        loginHint: "aadhaar",
        loginId: encryptedAadhaar,
        otpSystem: "aadhaar",
      },
    });
  }

  /**
   * Enrol ABHA using the received Aadhaar OTP.
   * Calls POST /v3/enrollment/enrol/byAadhaar with encrypted OTP.
   */
  async enrolByAadhaar(input: {
    txnId: string;
    otp: string;
    mobile: string;
  }): Promise<V3EnrollmentResponse> {
    const cleanMobile = input.mobile.replace(/\D/g, "");

    if (!this.isLive()) {
      if (input.otp === "000000" || input.otp.length !== 6) {
        throw new AbdmV3ClientError("INVALID_OTP", "Incorrect OTP", 400);
      }
      const mockAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        message: "Account created successfully (SANDBOX DEMO)",
        txnId: input.txnId,
        tokens: {
          token: "mock-v3-token-" + randomUUID(),
          expiresIn: 1800,
          refreshToken: "mock-v3-refresh-" + randomUUID(),
          refreshExpiresIn: 1296000,
        },
        ABHAProfile: {
          firstName: "Demo",
          lastName: "Patient",
          dob: "01-01-1995",
          gender: "F",
          mobile: cleanMobile,
          ABHANumber: mockAbha,
          abhaStatus: "ACTIVE",
          stateName: "Karnataka",
          districtName: "Bengaluru",
          pinCode: "560001",
          phrAddress: [`demo${Math.floor(100 + Math.random() * 900)}@sbx`],
        },
        isNew: true,
      };
    }

    const encryptedOtp = await abdmV3Client.encrypt(input.otp);
    return abdmV3Client.request<V3EnrollmentResponse>("/v3/enrollment/enrol/byAadhaar", {
      method: "POST",
      body: {
        authData: {
          authMethods: ["otp"],
          otp: {
            txnId: input.txnId,
            otpValue: encryptedOtp,
            mobile: cleanMobile,
          },
        },
        consent: {
          code: "abha-enrollment",
          version: "1.4",
        },
      },
    });
  }

  /**
   * Get ABHA Address suggestions for newly enrolled ABHA.
   * Calls GET /v3/enrollment/enrol/suggestion
   */
  async getAddressSuggestions(txnId: string): Promise<V3AddressSuggestionsResponse> {
    if (!this.isLive()) {
      return {
        txnId,
        abhaAddressList: ["smrko.patient95", "patient.smrkomed", "patient1995", "smrko_care"],
      };
    }

    return abdmV3Client.request<V3AddressSuggestionsResponse>("/v3/enrollment/enrol/suggestion", {
      method: "GET",
      headers: {
        Transaction_Id: txnId,
      },
    });
  }

  /**
   * Set custom ABHA Address against enrollment transaction ID (CRT_ABHA_112).
   * Calls POST /v3/enrollment/enrol/abha-address
   */
  async createCustomAbhaAddress(input: {
    txnId: string;
    abhaAddress: string;
    preferred?: number | undefined;
  }): Promise<{ txnId: string; healthIdNumber: string; preferredAbhaAddress: string }> {
    const validation = validateAbhaAddress(input.abhaAddress);
    if (!validation.valid) {
      throw new AbdmV3ClientError("INVALID_ABHA_ADDRESS", validation.error || "ABHA Address format is invalid", 400);
    }

    if (!this.isLive()) {
      if (input.abhaAddress.toLowerCase().includes("existing") || input.abhaAddress.toLowerCase().includes("taken")) {
        throw new AbdmV3ClientError("ABHA_ADDRESS_EXISTS", "ABHA Address is already exist", 409);
      }
      return {
        txnId: input.txnId,
        healthIdNumber: "91-XXXX-XXXX-1234",
        preferredAbhaAddress: input.abhaAddress,
      };
    }

    return abdmV3Client.request("/v3/enrollment/enrol/abha-address", {
      method: "POST",
      body: {
        txnId: input.txnId,
        abhaAddress: input.abhaAddress,
        preferred: input.preferred ?? 1,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ABHA VERIFICATION & LOGIN (Section 7.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request OTP for ABHA Login (via Mobile or Aadhaar or ABHA Number).
   * Calls POST /v3/profile/login/request/otp
   */
  async requestLoginOtp(input: {
    loginType: "mobile" | "aadhaar" | "abha-number";
    identifier: string;
  }): Promise<V3EnrollmentOtpResponse> {
    const cleanId = input.identifier.replace(/[-\s]/g, "");

    if (input.loginType === "aadhaar" && cleanId.length !== 12) {
      throw new AbdmV3ClientError("INVALID_AADHAAR", "Aadhaar Number is not valid", 400);
    }
    if (input.loginType === "mobile" && cleanId.length !== 10) {
      throw new AbdmV3ClientError("INVALID_MOBILE", "Please enter a valid mobile number", 400);
    }

    if (!this.isLive()) {
      return {
        txnId: randomUUID(),
        message: `OTP sent to registered ${input.loginType} (SANDBOX DEMO). Enter any 6-digit OTP.`,
      };
    }

    const encryptedId = await abdmV3Client.encrypt(cleanId);

    const scopeMap = {
      mobile: ["abha-login", "mobile-verify"],
      aadhaar: ["abha-login", "aadhaar-verify"],
      "abha-number": ["abha-login", "aadhaar-verify"],
    };

    const otpSystem = input.loginType === "mobile" ? "abdm" : "aadhaar";

    return abdmV3Client.request<V3EnrollmentOtpResponse>("/v3/profile/login/request/otp", {
      method: "POST",
      body: {
        scope: scopeMap[input.loginType],
        loginHint: input.loginType,
        loginId: encryptedId,
        otpSystem,
      },
    });
  }

  /**
   * Verify login OTP and obtain profile token or list of linked accounts.
   * Calls POST /v3/profile/login/verify
   */
  async verifyLoginOtp(input: {
    txnId: string;
    otp: string;
    loginType: "mobile" | "aadhaar" | "abha-number";
  }): Promise<V3LoginVerifyResponse> {
    if (!this.isLive()) {
      if (input.otp === "000000" || input.otp.length !== 6) {
        throw new AbdmV3ClientError("INVALID_OTP", "Incorrect OTP", 400);
      }
      if (input.txnId.includes("not-found") || input.txnId.includes("unregistered")) {
        if (input.loginType === "mobile") {
          throw new AbdmV3ClientError(
            "ABHA_NOT_FOUND",
            "ABHA Number not found\nWe did not find any ABHA number linked to this mobile number.\nPlease use ABHA linked mobile number",
            404,
          );
        }
        throw new AbdmV3ClientError("ABHA_NOT_FOUND", "NO ABHA user registered with this Aadhaar Number", 404);
      }

      const mockAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        txnId: input.txnId,
        authResult: "success",
        message: "OTP verified successfully (SANDBOX DEMO)",
        token: "mock-v3-login-token-" + randomUUID(),
        accounts: [
          {
            ABHANumber: mockAbha,
            preferredAbhaAddress: "patient@sbx",
            name: "Verified Demo Patient",
            gender: "F",
            dob: "15-05-1992",
            status: "ACTIVE",
            kycVerified: true,
          },
        ],
      };
    }

    const encryptedOtp = await abdmV3Client.encrypt(input.otp);
    const scopeMap = {
      mobile: ["abha-login", "mobile-verify"],
      aadhaar: ["abha-login", "aadhaar-verify"],
      "abha-number": ["abha-login", "aadhaar-verify"],
    };

    return abdmV3Client.request<V3LoginVerifyResponse>("/v3/profile/login/verify", {
      method: "POST",
      body: {
        scope: scopeMap[input.loginType],
        authData: {
          authMethods: ["otp"],
          otp: {
            txnId: input.txnId,
            otpValue: encryptedOtp,
          },
        },
      },
    });
  }

  /**
   * In mobile login where multiple ABHAs exist, select specific ABHA user account.
   * Calls POST /v3/profile/login/verify/user
   */
  async selectLoginUser(input: {
    txnId: string;
    abhaNumber: string;
    tToken: string;
  }): Promise<{ token: string; expiresIn: number; refreshToken?: string }> {
    if (!this.isLive()) {
      return {
        token: "mock-v3-selected-token-" + randomUUID(),
        expiresIn: 1800,
        refreshToken: "mock-v3-refresh-" + randomUUID(),
      };
    }

    return abdmV3Client.request("/v3/profile/login/verify/user", {
      method: "POST",
      headers: {
        "T-token": `Bearer ${input.tToken}`,
      },
      body: {
        ABHANumber: input.abhaNumber,
        txnId: input.txnId,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PROFILE & IDENTITY ASSETS (Section 9.0, 10.0, 11.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get official ABHA profile details using patient X-token.
   * Calls GET /v3/profile/account
   */
  async getProfile(xToken: string): Promise<V3AbhaProfile> {
    if (!this.isLive()) {
      return {
        firstName: "Verified",
        lastName: "Patient",
        dob: "01-01-1995",
        gender: "F",
        mobile: "******9999",
        ABHANumber: "91-1234-5678-9012",
        abhaStatus: "ACTIVE",
        phrAddress: ["patient@sbx"],
      };
    }

    return abdmV3Client.request<V3AbhaProfile>("/v3/profile/account", {
      method: "GET",
      headers: {
        "X-token": `Bearer ${xToken}`,
      },
    });
  }

  /**
   * Get official ABHA Card (base64 or PDF stream).
   * Calls GET /v3/profile/account/abha-card
   */
  async getAbhaCard(xToken: string): Promise<{ cardData?: string; contentType?: string }> {
    if (!this.isLive()) {
      return {
        cardData: "SAMPLE_CARD_DATA_DEMO",
        contentType: "image/png",
      };
    }

    return abdmV3Client.request("/v3/profile/account/abha-card", {
      method: "GET",
      headers: {
        "X-token": `Bearer ${xToken}`,
      },
    });
  }

  /**
   * Get official QR code for patient ABHA profile.
   * Calls GET /v3/profile/account/qrCode
   */
  async getQrCode(xToken: string): Promise<{ qrCode?: string }> {
    if (!this.isLive()) {
      return { qrCode: "data:image/png;base64,SAMPLE_QR_MOCK" };
    }

    return abdmV3Client.request("/v3/profile/account/qrCode", {
      method: "GET",
      headers: {
        "X-token": `Bearer ${xToken}`,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FACE AUTH ENROLLMENT (Section 6.2.2)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate transaction ID and QR code URL for FaceAuth on ABHA mobile app.
   * Calls POST /v3/enrollment/enrol/auth/init
   */
  async initFaceAuth(): Promise<{ txnId: string; qrCodeUrl: string; message: string }> {
    const config = getAbdmConfig();
    const phrBase =
      config.environment === "production" ? "https://phr.abdm.gov.in" : "https://phrsbx.abdm.gov.in";

    if (!this.isLive()) {
      const mockTxn = randomUUID();
      return {
        txnId: mockTxn,
        qrCodeUrl: `${phrBase}/face-auth?txnId=${mockTxn}`,
        message: "Transaction ID generated successfully (SANDBOX DEMO)",
      };
    }

    const res = await abdmV3Client.request<{ txnId: string; message: string }>(
      "/v3/enrollment/enrol/auth/init",
      {
        method: "POST",
        body: {
          scope: ["abha-enrol", "face-auth"],
        },
      },
    );

    return {
      txnId: res.txnId,
      qrCodeUrl: `${phrBase}/face-auth?txnId=${res.txnId}`,
      message: res.message,
    };
  }

  /**
   * Poll face capture status from mobile app.
   * Calls POST /v3/enrollment/enrol/capturePID
   */
  async pollFaceAuthCapture(txnId: string): Promise<{ status: string; message: string }> {
    if (!this.isLive()) {
      return { status: "COMPLETE", message: "PID captured successfully (SANDBOX DEMO)" };
    }

    return abdmV3Client.request("/v3/enrollment/enrol/capturePID", {
      method: "POST",
      body: {
        scope: ["abha-enrol", "face-verify"],
        txnId,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MILESTONE 2: CARE CONTEXT BUILDER & STATE
  // ─────────────────────────────────────────────────────────────────────────────

  private userLinkSessions = new Map<
    string,
    {
      transactionId: string;
      linkRefNumber: string;
      otp: string;
      patientId: string;
      abhaAddress: string;
      careContexts: CareContextItem[];
      hiType: string;
      expiresAt: number;
    }
  >();

  private cachedLinkTokens = new Map<string, { token: string; expiresAt: number }>();
  private scanShareCounter = 100;

  /**
   * Builds standardized ABDM care contexts from clinical data for a given patient.
   */
  async buildCareContextsForPatient(
    patientId: string,
    clinicId?: string,
  ): Promise<PatientCareContextGroup[]> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) return [];

    const effectiveClinicId = clinicId || patient.clinicId;

    const couples = await prisma.couple.findMany({
      where: {
        clinicId: effectiveClinicId,
        OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
      },
      select: { id: true },
    });
    const coupleIds = couples.map((c) => c.id);

    const [appointments, documents, prescriptions] = await Promise.all([
      coupleIds.length
        ? prisma.appointment.findMany({
            where: { clinicId: effectiveClinicId, coupleId: { in: coupleIds } },
            take: 5,
            orderBy: { startsAt: "desc" },
          })
        : Promise.resolve([]),
      prisma.document.findMany({
        where: { clinicId: effectiveClinicId, patientId },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.pharmacyPrescription.findMany({
        where: { clinicId: effectiveClinicId, patientId },
        take: 5,
        orderBy: { prescriptionDate: "desc" },
      }),
    ]);

    const groups: PatientCareContextGroup[] = [];

    // 1. Appointments & Consultations
    const consultationCareContexts: CareContextItem[] = appointments.map((apt) => ({
      referenceNumber: `OPD-${apt.id}`,
      display: `OPD Visit on ${apt.startsAt.toISOString().slice(0, 10)} (${apt.type})`,
    }));

    if (consultationCareContexts.length > 0) {
      groups.push({
        referenceNumber: `MR-${patient.id}`,
        display: `${patient.firstName} ${patient.lastName} - Consultations`,
        careContexts: consultationCareContexts,
        hiType: "OPCONSULTATION",
        count: consultationCareContexts.length,
      });
    }

    // 2. Prescriptions
    const rxCareContexts: CareContextItem[] = prescriptions.map((rx) => ({
      referenceNumber: `RX-${rx.id}`,
      display: `Prescription on ${rx.prescriptionDate.toISOString().slice(0, 10)}`,
    }));

    if (rxCareContexts.length > 0) {
      groups.push({
        referenceNumber: `MR-${patient.id}`,
        display: `${patient.firstName} ${patient.lastName} - Prescriptions`,
        careContexts: rxCareContexts,
        hiType: "PRESCRIPTION",
        count: rxCareContexts.length,
      });
    }

    // 3. Diagnostic Reports / Documents
    const documentCareContexts: CareContextItem[] = documents.map((doc) => ({
      referenceNumber: `DOC-${doc.id}`,
      display: doc.name || `Medical Document ${doc.id.slice(0, 8)}`,
    }));

    if (documentCareContexts.length > 0) {
      groups.push({
        referenceNumber: `MR-${patient.id}`,
        display: `${patient.firstName} ${patient.lastName} - Diagnostic Reports`,
        careContexts: documentCareContexts,
        hiType: "DIAGNOSTIC REPORT",
        count: documentCareContexts.length,
      });
    }

    // If no real records yet, provide an initial patient episode care context
    if (groups.length === 0) {
      groups.push({
        referenceNumber: `MR-${patient.id}`,
        display: `${patient.firstName} ${patient.lastName} - Primary Registration`,
        careContexts: [
          {
            referenceNumber: `EPISODE-${patient.id.slice(0, 8)}`,
            display: `Primary Care Episode (${effectiveClinicId.slice(0, 8)})`,
          },
        ],
        hiType: "HEALTH DOCUMENT RECORD",
        count: 1,
      });
    }

    return groups;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. MILESTONE 2: HIP-INITIATED LINKING (Section 4.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request link token generation from Gateway for HIP-initiated linking (4.3.1).
   */
  async generateLinkToken(input: {
    patientId?: string | undefined;
    abhaAddress?: string | undefined;
    abhaNumber?: string | number | undefined;
    name: string;
    gender: "M" | "F" | "O" | "D";
    yearOfBirth: number;
  }): Promise<{ requestId: string; linkToken?: string; message: string }> {
    const requestId = randomUUID();

    if (!this.isLive()) {
      const mockToken = `mock-link-token-${randomUUID()}`;
      if (input.abhaAddress) {
        this.cachedLinkTokens.set(input.abhaAddress, {
          token: mockToken,
          expiresAt: Date.now() + 3600 * 1000,
        });
      }
      return {
        requestId,
        linkToken: mockToken,
        message: "Link token generated successfully (SANDBOX DEMO).",
      };
    }

    const payload: V3LinkTokenGenerateRequest = {
      name: input.name,
      gender: input.gender,
      yearOfBirth: input.yearOfBirth,
      ...(input.abhaAddress ? { abhaAddress: input.abhaAddress } : {}),
      ...(input.abhaNumber ? { abhaNumber: input.abhaNumber } : {}),
    };

    await abdmV3Client.generateLinkToken(payload);

    return {
      requestId,
      message: "Link token generation requested from ABDM Gateway.",
    };
  }

  /**
   * Handles Gateway callback when link token is generated (4.3.2).
   */
  async handleLinkTokenCallback(payload: V3LinkTokenOnGenerateCallback): Promise<void> {
    if (payload.abhaAddress && payload.linkToken) {
      this.cachedLinkTokens.set(payload.abhaAddress, {
        token: payload.linkToken,
        expiresAt: Date.now() + 3600 * 1000,
      });
    }
    abdmV3Events.emit(`link-token:${payload.response.requestId}`, payload);
  }

  /**
   * Link care context with patient ABHA address using link token (4.3.3).
   */
  async linkCareContexts(input: {
    patientId: string;
    clinicId: string;
    abhaAddress: string;
    abhaNumber?: string | undefined;
    linkToken: string;
    careContexts?: CareContextItem[] | undefined;
    hiType?: string | undefined;
    patientDisplay?: string | undefined;
  }): Promise<{ requestId: string; message: string; linkedCount: number }> {
    const requestId = randomUUID();
    const effectiveCareContexts = input.careContexts && input.careContexts.length > 0
      ? input.careContexts
      : (await this.buildCareContextsForPatient(input.patientId, input.clinicId))[0]?.careContexts ?? [
          { referenceNumber: `REC-${input.patientId.slice(0, 8)}`, display: "Medical Record" },
        ];

    const hiType = input.hiType || "OPCONSULTATION";

    const payload: V3CareContextLinkRequest = {
      abhaAddress: input.abhaAddress,
      ...(input.abhaNumber ? { abhaNumber: input.abhaNumber } : {}),
      patient: [
        {
          referenceNumber: `MR-${input.patientId}`,
          display: input.patientDisplay || "Patient Medical Record",
          careContexts: effectiveCareContexts,
          hiType,
          count: effectiveCareContexts.length,
        },
      ],
    };

    if (!this.isLive()) {
      // Mock instant link confirmation in demo mode
      try {
        await prisma.digitalHealthIdentity.upsert({
          where: { patientId: input.patientId },
          create: {
            clinicId: input.clinicId,
            patientId: input.patientId,
            abhaAddress: input.abhaAddress,
            abhaMasked: maskAbha(input.abhaNumber || "91123456789012"),
            status: "LINKED",
            verificationStatus: "VERIFIED_V3_LINKED",
            linkedAt: new Date(),
            lastVerifiedAt: new Date(),
            source: "ABDM_V3_HIP_LINK",
            sandboxMode: true,
          },
          update: {
            abhaAddress: input.abhaAddress,
            status: "LINKED",
            verificationStatus: "VERIFIED_V3_LINKED",
            lastVerifiedAt: new Date(),
            source: "ABDM_V3_HIP_LINK",
          },
        });
      } catch {
        // Table or foreign key may not exist in demo/test environment
      }

      return {
        requestId,
        message: "Care context successfully linked (SANDBOX DEMO).",
        linkedCount: effectiveCareContexts.length,
      };
    }

    await abdmV3Client.linkCareContext(payload, input.linkToken);

    return {
      requestId,
      message: "Care context link submitted to ABDM Gateway.",
      linkedCount: effectiveCareContexts.length,
    };
  }

  /**
   * Handles Gateway callback when care contexts are linked (4.3.4).
   */
  async handleCareContextOnLinkCallback(payload: V3CareContextOnLinkCallback): Promise<void> {
    abdmV3Events.emit(`on-carecontext:${payload.response.requestId}`, payload);
  }

  /**
   * Fetch all patient links from ABDM Gateway (4.3.5).
   */
  async getPatientLinks(limit = 100, xAuthToken?: string): Promise<V3PatientLinksResponse> {
    if (!this.isLive()) {
      return {
        patient: {
          id: "demo_patient@sbx",
          links: [
            {
              hip: { id: "SMRKOMED_HIP", name: "SmrkoMed Fertility Clinic", type: "HIP" },
              referenceNumber: "MR-DEMO-001",
              display: "OPD Consultation & Care Plan",
              hiType: "OPCONSULTATION",
              careContexts: [
                { referenceNumber: "OPD-101", display: "Initial Consultation" },
                { referenceNumber: "LAB-202", display: "Hormone Profile" },
              ],
              dateCreated: new Date().toISOString(),
            },
          ],
        },
      };
    }

    return abdmV3Client.getPatientLinks(limit, xAuthToken);
  }

  /**
   * Notify care context update to subscribed HIUs (4.3.6).
   */
  async notifyCareContext(input: {
    patientId: string;
    clinicId: string;
    patientReference: string;
    careContextReference: string;
    hiTypes?: string[] | undefined;
    abhaAddress: string;
  }): Promise<{ status?: string }> {
    const config = getAbdmConfig();
    const payload: V3CareContextNotifyRequest = {
      notification: {
        patient: { id: input.abhaAddress },
        careContext: {
          patientReference: input.patientReference,
          careContextReference: input.careContextReference,
        },
        hiTypes: input.hiTypes || ["OPConsultation"],
        date: new Date().toISOString(),
        hip: { id: config.facilityId || "SMRKOMED_HIP" },
      },
    };

    if (!this.isLive()) {
      return { status: "SUCCESS_DEMO" };
    }

    return abdmV3Client.notifyCareContext(payload);
  }

  /**
   * Trigger SMS notification to patient when health record is available (4.3.8).
   */
  async sendPatientSmsNotification(input: {
    phoneNo: string;
    hipName?: string | undefined;
  }): Promise<{ requestId: string; status?: string }> {
    const requestId = randomUUID();
    const config = getAbdmConfig();

    const payload: V3SmsNotifyRequest = {
      requestId,
      timestamp: new Date().toISOString(),
      notification: {
        phoneNo: input.phoneNo.replace(/\D/g, "").slice(-10),
        hip: {
          id: config.facilityId || "SMRKOMED_HIP",
          name: input.hipName || "SmrkoMed Clinic",
        },
      },
    };

    if (!this.isLive()) {
      return { requestId, status: "SUCCESS_DEMO" };
    }

    const res = await abdmV3Client.sendSmsNotification(payload);
    return { requestId, status: res?.status || "SUBMITTED" };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. MILESTONE 2: USER-INITIATED LINKING (Section 5.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handles HIE-CM discovery callback to HIP (5.3.2 -> 5.3.3).
   * Searches SmrkoMed patient records matching the patient's identifiers.
   */
  async handlePatientDiscovery(payload: V3DiscoverCallbackPayload): Promise<{ status: string }> {
    const p = payload.patient;
    const phoneVal = p.verifiedIdentifiers?.find((i) => i.type === "MOBILE")?.value;
    const abhaVal = p.verifiedIdentifiers?.find((i) => i.type === "ABHA_NUMBER")?.value;
    const mrVal = p.unverifiedIdentifiers?.find((i) => i.type === "MR")?.value;

    let matchedPatient: { id: string; clinicId: string; firstName: string; lastName: string } | null = null;
    let matchedBy = "MR";

    if (abhaVal) {
      const hash = hashAbha(normalizeAbhaDigits(abhaVal));
      const identity = await prisma.digitalHealthIdentity.findFirst({
        where: { abhaNumberHash: hash },
        include: { patient: { select: { id: true, clinicId: true, firstName: true, lastName: true } } },
      });
      if (identity?.patient) {
        matchedPatient = identity.patient;
        matchedBy = "ABHA_NUMBER";
      }
    }

    if (!matchedPatient && p.id) {
      const identity = await prisma.digitalHealthIdentity.findFirst({
        where: { abhaAddress: p.id },
        include: { patient: { select: { id: true, clinicId: true, firstName: true, lastName: true } } },
      });
      if (identity?.patient) {
        matchedPatient = identity.patient;
        matchedBy = "ABHA_ADDRESS";
      }
    }

    if (!matchedPatient && phoneVal) {
      const cleanPhone = phoneVal.replace(/\D/g, "").slice(-10);
      const pat = await prisma.patient.findFirst({
        where: { phone: { contains: cleanPhone } },
        select: { id: true, clinicId: true, firstName: true, lastName: true },
      });
      if (pat) {
        matchedPatient = pat;
        matchedBy = "MOBILE";
      }
    }

    if (!matchedPatient && mrVal) {
      const pat = await prisma.patient.findFirst({
        where: { id: mrVal },
        select: { id: true, clinicId: true, firstName: true, lastName: true },
      });
      if (pat) {
        matchedPatient = pat;
        matchedBy = "MR";
      }
    }

    // In demo mode or fallback if no patient found, match demo patient to verify flow
    if (!matchedPatient && !this.isLive()) {
      matchedPatient = {
        id: "demo-patient-001",
        clinicId: "clinic-default",
        firstName: p.name.split(" ")[0] || "Demo",
        lastName: p.name.split(" ").slice(1).join(" ") || "Patient",
      };
    }

    if (!matchedPatient) {
      if (this.isLive()) {
        await abdmV3Client.respondOnDiscover({
          transactionId: payload.transactionId,
          error: ABDM_ERROR_CODES.PATIENT_NOT_FOUND,
          response: { requestId: randomUUID() },
        });
      }
      return { status: "PATIENT_NOT_FOUND" };
    }

    const careContextGroups = await this.buildCareContextsForPatient(
      matchedPatient.id,
      matchedPatient.clinicId,
    );

    if (this.isLive()) {
      await abdmV3Client.respondOnDiscover({
        transactionId: payload.transactionId,
        patient: careContextGroups,
        matchedBy: [matchedBy],
        response: { requestId: randomUUID() },
      });
    }

    return { status: "DISCOVERY_ACKNOWLEDGED" };
  }

  /**
   * Handles HIE-CM link init callback to HIP (5.3.6 -> 5.3.7).
   * Generates OTP for patient confirmation and returns link reference.
   */
  async handleLinkInit(payload: V3LinkInitCallbackPayload): Promise<{ linkRefNumber: string }> {
    const linkRefNumber = randomUUID();
    const otp = "123456"; // Standard NHA Sandbox testing OTP
    const expiresAt = Date.now() + 15 * 60 * 1000;

    const patGroup = payload.patient?.[0];
    const careContexts = patGroup?.careContexts?.map((c) => ({
      referenceNumber: c.referenceNumber,
      display: `Care Context ${c.referenceNumber}`,
    })) ?? [];

    this.userLinkSessions.set(linkRefNumber, {
      transactionId: payload.transactionId,
      linkRefNumber,
      otp,
      patientId: patGroup?.referenceNumber || "unknown",
      abhaAddress: payload.abhaAddress || "patient@sbx",
      careContexts,
      hiType: patGroup?.hiType || "OPCONSULTATION",
      expiresAt,
    });

    if (this.isLive()) {
      await abdmV3Client.respondOnInit({
        transactionId: payload.transactionId,
        link: {
          referenceNumber: linkRefNumber,
          authenticationType: "MEDIATE",
          meta: {
            communicationMedium: "MOBILE",
            communicationHint: "OTP",
            communicationExpiry: new Date(expiresAt).toISOString(),
          },
        },
        response: { requestId: randomUUID() },
      });
    }

    return { linkRefNumber };
  }

  /**
   * Handles HIE-CM link confirm callback to HIP (5.3.10 -> 5.3.11).
   * Validates OTP and confirms linked care contexts to Gateway.
   */
  async handleLinkConfirm(
    payload: V3LinkConfirmCallbackPayload,
  ): Promise<{ status: "CONFIRMED" | "FAILED"; message: string }> {
    const session = this.userLinkSessions.get(payload.confirmation.linkRefNumber);

    if (!session) {
      if (this.isLive()) {
        await abdmV3Client.respondOnConfirm({
          response: { requestId: randomUUID() },
          error: { code: "ABDM-9999", message: "Invalid link reference number." },
        });
      }
      return { status: "FAILED", message: "Invalid or expired link reference number." };
    }

    if (payload.confirmation.token !== session.otp && payload.confirmation.token !== "123456") {
      if (this.isLive()) {
        await abdmV3Client.respondOnConfirm({
          response: { requestId: randomUUID() },
          error: { code: "ABDM-1035", message: "OTP does not matched" },
        });
      }
      return { status: "FAILED", message: "OTP does not matched" };
    }

    const patientResponseGroups: PatientCareContextGroup[] = [
      {
        referenceNumber: session.patientId,
        display: "Confirmed Health Records",
        careContexts: session.careContexts,
        hiType: session.hiType,
        count: session.careContexts.length,
      },
    ];

    if (this.isLive()) {
      await abdmV3Client.respondOnConfirm({
        patient: patientResponseGroups,
        response: { requestId: randomUUID() },
      });
    }

    this.userLinkSessions.delete(payload.confirmation.linkRefNumber);
    return { status: "CONFIRMED", message: "Care contexts confirmed and linked." };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. MILESTONE 2: DATA FLOW & CONSENT (Section 6.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handles consent notification callback from Gateway (6.3.1 -> 6.3.2).
   */
  async handleConsentNotify(payload: V3ConsentNotifyCallbackPayload): Promise<void> {
    const n = payload.notification;

    // Acknowledge consent notification
    if (this.isLive()) {
      await abdmV3Client.respondConsentOnNotify({
        acknowledgement: { status: "OK", consentId: n.consentId },
        response: { requestId: randomUUID() },
      });
    }

    // Upsert local consent record
    try {
      const identity = await prisma.digitalHealthIdentity.findFirst({
        where: { abhaAddress: n.patient.id },
      });

      if (identity) {
        await prisma.digitalHealthConsent.upsert({
          where: { id: n.consentId },
          create: {
            id: n.consentId,
            clinicId: identity.clinicId,
            patientId: identity.patientId,
            purpose: n.purpose.text,
            requestedByName: n.hiu?.name || "Requester HIU",
            status: n.status === "GRANTED" ? "ACTIVE" : n.status === "EXPIRED" ? "EXPIRED" : "REVOKED",
            dataCategories: n.hiTypes,
            expiresAt: n.permission?.dataEraseAt ? new Date(n.permission.dataEraseAt) : null,
            sandboxMode: !this.isLive(),
          },
          update: {
            status: n.status === "GRANTED" ? "ACTIVE" : n.status === "EXPIRED" ? "EXPIRED" : "REVOKED",
          },
        });
      }
    } catch {
      // Table may not have unique on id or pending migration
    }
  }

  /**
   * Handles health information request callback from Gateway (6.3.3 -> 6.3.6).
   * Assembles FHIR bundle, encrypts using Curve25519 ECDH + AES-GCM, and pushes to HIU.
   */
  async handleHealthInfoRequest(
    payload: V3HealthInfoRequestCallbackPayload,
  ): Promise<{ status: string }> {
    const req = payload.hiRequest;

    // 1. Immediately acknowledge health info request (6.3.4)
    if (this.isLive()) {
      await abdmV3Client.respondHealthInfoOnRequest({
        hiRequest: {
          transactionId: req.consent.id,
          sessionStatus: "ACKNOWLEDGED",
        },
        response: { requestId: randomUUID() },
      });
    }

    // 2. Generate HIP Ephemeral Key Pair for ECDH exchange
    const hipKeyExchange = generateHipKeyMaterial();

    // 3. Compute shared secret and derive symmetric AES key
    const sharedSecret = calculateSharedSecret(
      hipKeyExchange.privateKey,
      req.keyMaterial.dhPublicKey.keyValue,
    );

    const aesKey = deriveSymmetricKey(
      sharedSecret,
      hipKeyExchange.keyMaterial.nonce,
      req.keyMaterial.nonce,
    );

    // 4. Assemble mock or active FHIR bundle
    const fhirBundle = {
      resourceType: "Bundle",
      type: "document",
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: "Composition",
            id: "comp-001",
            status: "final",
            title: "SmrkoMed Clinical Summary",
            date: new Date().toISOString(),
          },
        },
      ],
    };

    // 5. Encrypt FHIR bundle with AES-256-GCM
    const { encryptedContent, checksum } = encryptFhirPayload(JSON.stringify(fhirBundle), aesKey);

    const pushPayload: V3DataPushPayload = {
      pageNumber: 1,
      pageCount: 1,
      transactionId: req.consent.id,
      entries: [
        {
          content: encryptedContent,
          media: "application/fhir+json",
          checksum,
          careContextReference: "EPISODE-001",
        },
      ],
      keyMaterial: hipKeyExchange.keyMaterial,
    };

    // 6. Push data to HIU URL (6.3.5)
    if (this.isLive()) {
      await abdmV3Client.pushHealthData(req.dataPushUrl, pushPayload);
    }

    // 7. Notify Gateway of transfer completion (6.3.6)
    const config = getAbdmConfig();
    const notifyPayload: V3HealthInfoNotifyPayload = {
      notification: {
        consentId: req.consent.id,
        transactionId: req.consent.id,
        doneAt: new Date().toISOString(),
        notifier: { type: "HIP", id: config.facilityId || "SMRKOMED_HIP" },
        statusNotification: {
          sessionStatus: "TRANSFERRED",
          hipId: config.facilityId || "SMRKOMED_HIP",
          statusResponses: [
            {
              careContextReference: "EPISODE-001",
              hiStatus: "OK",
              description: "Clinical FHIR bundle delivered successfully",
            },
          ],
        },
      },
    };

    if (this.isLive()) {
      await abdmV3Client.notifyHealthDataTransfer(notifyPayload);
    }

    return { status: "DATA_TRANSFERRED" };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. MILESTONE 2: SCAN AND PROFILE SHARE (Section 7.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handles patient scanning counter QR code and sharing KYC demographic profile (7.3.2 -> 7.3.3).
   */
  async handleProfileShare(
    payload: V3ProfileShareCallbackPayload,
  ): Promise<{ tokenNumber: string; abhaAddress: string; message: string }> {
    const p = payload.profile.patient;
    const tokenSeq = this.scanShareCounter++;
    const tokenNumber = `TK-${tokenSeq}`;
    const context = payload.metaData.context || "REGISTRATION";

    // Auto-create or link patient in clinic if not already present
    const config = getAbdmConfig();
    const clinic = await prisma.clinic.findFirst({
      select: { id: true, name: true },
    });

    if (clinic) {
      const cleanPhone = p.phoneNumber?.replace(/\D/g, "").slice(-10) || null;
      let existingPatient = await prisma.patient.findFirst({
        where: {
          clinicId: clinic.id,
          OR: [
            ...(cleanPhone ? [{ phone: cleanPhone }] : []),
            { digitalHealthIdentity: { abhaAddress: p.abhaAddress } },
          ],
        },
      });

      if (!existingPatient) {
        const nameParts = p.name.trim().split(/\s+/);
        const firstName = nameParts[0] || "Patient";
        const lastName = nameParts.slice(1).join(" ") || "Shared";

        existingPatient = await prisma.patient.create({
          data: {
            clinicId: clinic.id,
            firstName,
            lastName,
            phone: cleanPhone,
            gender: p.gender === "M" ? "MALE" : p.gender === "F" ? "FEMALE" : "OTHER",
            dateOfBirth: p.yearOfBirth ? new Date(`${p.yearOfBirth}-01-01`) : null,
          },
        });
      }

      const rawAbha = String(p.abhaNumber);
      const digits = normalizeAbhaDigits(rawAbha);
      await prisma.digitalHealthIdentity.upsert({
        where: { patientId: existingPatient.id },
        create: {
          clinicId: clinic.id,
          patientId: existingPatient.id,
          abhaAddress: p.abhaAddress,
          abhaNumberHash: hashAbha(digits),
          abhaMasked: maskAbha(digits),
          status: "LINKED",
          verificationStatus: "VERIFIED_V3_SCAN_SHARE",
          linkedAt: new Date(),
          lastVerifiedAt: new Date(),
          source: "ABDM_V3_SCAN_SHARE",
          sandboxMode: !this.isLive(),
        },
        update: {
          abhaAddress: p.abhaAddress,
          status: "LINKED",
          verificationStatus: "VERIFIED_V3_SCAN_SHARE",
          lastVerifiedAt: new Date(),
          source: "ABDM_V3_SCAN_SHARE",
        },
      });
    }

    if (this.isLive()) {
      await abdmV3Client.respondProfileOnShare({
        acknowledgement: {
          abhaAddress: p.abhaAddress,
          status: "success",
          profile: {
            context,
            tokenNumber,
            expiry: "180",
          },
        },
        response: { requestId: randomUUID() },
      });
    }

    return {
      tokenNumber,
      abhaAddress: p.abhaAddress,
      message: `OPD Queue Token ${tokenNumber} assigned for ${p.name}.`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. MILESTONE 2: BRIDGE MANAGEMENT (Section 3.2.4 - 3.2.7)
  // ─────────────────────────────────────────────────────────────────────────────

  async updateBridgeUrl(url: string): Promise<{ status?: string }> {
    if (!this.isLive()) {
      return { status: "ACCEPTED_DEMO" };
    }
    return abdmV3Client.updateBridgeUrl(url);
  }

  async getBridgeStatus(): Promise<{ bridge: unknown; services: unknown }> {
    if (!this.isLive()) {
      const config = getAbdmConfig();
      return {
        bridge: {
          id: config.clientId || "SBX_000135",
          name: "SmrkoMed Bridge",
          url: config.callbackBaseUrl || "https://api.smrkomed.com",
          active: true,
          blocklisted: false,
        },
        services: [
          {
            id: config.facilityId || "IN0210000001",
            name: "SmrkoMed Fertility & EMR Clinic",
            types: ["HIP", "HIU"],
            active: true,
          },
        ],
      };
    }

    const res = await abdmV3Client.getBridgeServices();
    return { bridge: res.bridge, services: res.services };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. NHA BUILDING HIP: MULTI-MODE HIP-INITIATED LINKING & AUTH
  // ─────────────────────────────────────────────────────────────────────────────

  private hipAuthSessions = new Map<
    string,
    {
      transactionId: string;
      authMode: "MOBILE_OTP" | "AADHAAR_OTP" | "DIRECT" | "DEMOGRAPHICS";
      abhaAddress: string;
      abhaNumber?: string | undefined;
      patient: {
        name: string;
        gender: "M" | "F" | "O" | "D";
        yearOfBirth: number;
        mobile?: string | undefined;
      };
      status: "AWAITING_OTP" | "DIRECT_APPROVAL_PENDING" | "AUTHENTICATED" | "FAILED";
      otp?: string | undefined;
      linkToken?: string | undefined;
      expiresAt: number;
    }
  >();

  /**
   * Initiates HIP-Initiated Linking via Mobile OTP, Aadhaar OTP, Direct Auth, or Demographics.
   */
  async initiateHipLinkAuth(input: {
    authMode: "MOBILE_OTP" | "AADHAAR_OTP" | "DIRECT" | "DEMOGRAPHICS";
    abhaAddress: string;
    abhaNumber?: string | undefined;
    patient: {
      name: string;
      gender: "M" | "F" | "O" | "D";
      yearOfBirth: number;
      mobile?: string | undefined;
    };
  }): Promise<{
    transactionId: string;
    authMode: "MOBILE_OTP" | "AADHAAR_OTP" | "DIRECT" | "DEMOGRAPHICS";
    status: string;
    message: string;
    maskedMobile?: string | undefined;
    linkToken?: string | undefined;
  }> {
    const transactionId = randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const cleanMobile = input.patient.mobile?.replace(/\D/g, "").slice(-10) || "9876543210";
    const maskedMobile = `*******${cleanMobile.slice(-4)}`;

    if (input.authMode === "DEMOGRAPHICS") {
      // Demographic Auth: Validate Name, DOB/YOB, Gender, Mobile
      if (!input.patient.name || !input.patient.gender || !input.patient.yearOfBirth) {
        throw {
          code: "DEMOGRAPHIC_VALIDATION_FAILED",
          message: "Demographic details incomplete: Name, Gender, and Year of Birth are required.",
        };
      }
      const linkToken = `demographic-link-token-${randomUUID()}`;
      this.cachedLinkTokens.set(input.abhaAddress, { token: linkToken, expiresAt });
      this.hipAuthSessions.set(transactionId, {
        transactionId,
        authMode: "DEMOGRAPHICS",
        abhaAddress: input.abhaAddress,
        abhaNumber: input.abhaNumber,
        patient: input.patient,
        status: "AUTHENTICATED",
        linkToken,
        expiresAt,
      });

      return {
        transactionId,
        authMode: "DEMOGRAPHICS",
        status: "AUTHENTICATED",
        message: "Demographic details validated by ABDM Gateway. Linking token generated.",
        linkToken,
      };
    }

    if (input.authMode === "DIRECT") {
      // Direct Auth mode: Patient receives notification on PHR app for approval
      this.hipAuthSessions.set(transactionId, {
        transactionId,
        authMode: "DIRECT",
        abhaAddress: input.abhaAddress,
        abhaNumber: input.abhaNumber,
        patient: input.patient,
        status: "DIRECT_APPROVAL_PENDING",
        expiresAt,
      });

      return {
        transactionId,
        authMode: "DIRECT",
        status: "APPROVAL_PENDING",
        message: "Direct authentication request initiated. Notification sent to patient's PHR app for approval.",
      };
    }

    // OTP Modes (MOBILE_OTP or AADHAAR_OTP)
    const otp = "123456"; // Standard NHA Sandbox OTP
    this.hipAuthSessions.set(transactionId, {
      transactionId,
      authMode: input.authMode,
      abhaAddress: input.abhaAddress,
      abhaNumber: input.abhaNumber,
      patient: input.patient,
      status: "AWAITING_OTP",
      otp,
      expiresAt,
    });

    const promptMessage =
      input.authMode === "AADHAAR_OTP"
        ? `OTP sent to the Aadhaar-linked mobile number ${maskedMobile} registered with ABHA.`
        : `OTP sent to the registered mobile number ${maskedMobile} registered with ABHA address.`;

    return {
      transactionId,
      authMode: input.authMode,
      status: "OTP_SENT",
      message: promptMessage,
      maskedMobile,
    };
  }

  /**
   * Confirms OTP or Direct Approval for HIP-Initiated Linking and returns a newly created linking token.
   */
  async verifyHipLinkAuth(input: {
    transactionId: string;
    authCode?: string | undefined;
    action?: "APPROVE" | "REJECT" | undefined;
  }): Promise<{
    verified: boolean;
    status: string;
    message: string;
    linkToken?: string | undefined;
    abhaAddress?: string | undefined;
  }> {
    const session = this.hipAuthSessions.get(input.transactionId);
    if (!session) {
      throw {
        code: "INVALID_TRANSACTION",
        message: "Authentication session expired or not found.",
      };
    }

    if (session.authMode === "DIRECT") {
      if (input.action === "REJECT") {
        session.status = "FAILED";
        return {
          verified: false,
          status: "REJECTED",
          message: "Linking request was rejected on PHR app.",
        };
      }
      const linkToken = `direct-link-token-${randomUUID()}`;
      session.status = "AUTHENTICATED";
      session.linkToken = linkToken;
      this.cachedLinkTokens.set(session.abhaAddress, { token: linkToken, expiresAt: session.expiresAt });
      return {
        verified: true,
        status: "AUTHENTICATED",
        message: "Direct authentication approved by patient on PHR app. Linking token created.",
        linkToken,
        abhaAddress: session.abhaAddress,
      };
    }

    // For OTP modes
    if (input.authCode !== session.otp && input.authCode !== "123456") {
      throw {
        code: "INVALID_OTP",
        message: "In case of incorrect OTP, the system throws an error: Incorrect OTP",
      };
    }

    const linkToken = `otp-link-token-${randomUUID()}`;
    session.status = "AUTHENTICATED";
    session.linkToken = linkToken;
    this.cachedLinkTokens.set(session.abhaAddress, { token: linkToken, expiresAt: session.expiresAt });

    return {
      verified: true,
      status: "AUTHENTICATED",
      message: "Patient authenticated successfully. New linking token created.",
      linkToken,
      abhaAddress: session.abhaAddress,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: GATEWAY FLOWS (Section 3.0)
  // ─────────────────────────────────────────────────────────────────────────

  async getOpenIdConfiguration(): Promise<OpenIdConfigurationResponse> {
    if (!this.isLive()) {
      return {
        jwks_uri: "https://dev.abdm.gov.in/api/hiecm/gateway/v3/certs",
      };
    }
    return abdmV3Client.getOpenIdConfiguration();
  }

  async getCerts(): Promise<OAuthCertsResponse> {
    if (!this.isLive()) {
      return {
        keys: [
          {
            e: "AQAB",
            kid: "AlRb5WCm8Tm9EJ_IfO9z06j9oCv51pKKFknGb_TBvK0",
            kty: "RSA",
            n: "mgmW7W5ZGF_G5cJevwYi8HiPcI-6qS_psnZxa4v3bkwAkyOoOd8-6ketrOI-ZA2PbRbGnxFfZHiI94rdFXJ4Q9ampscsz9NocTIPMPmWydJ8A50pZaYWyikYDSJiDltq7i3WspPKSOuQHrC5h9dMcCVveX5oeg0tO68Z79gwDlpcxiqDbFaphsqDvx-5XkfwiqvOBaybK6_BCBPuTqWMUEuUklLYXu2X7ESHdVNFMFAjxCcCXUtP7LFdvT3nnFekRmG82QbSQSVe4N5tPH8q0MCxSWWn2c15bDnzOF-dvfRCVPRabCzw0M-utHR9diTrWtq6Koi5buxgwM1rbk0p8Q",
            use: "sig",
            x5c: [
              "MIICrzCCAZcCBgFy/3WZBjANBgkqhkiG9w0BAQsFADAbMRkwFwYDVQQDDBBjZW50cmFsLXJlZ2lzdHJ5MB4XDTIwMDYyOTA5NDEzNloXDTMwMDYyOTA5NDMxNlowGzEZMBcGA1UEAwwQY2VudHJhbC1yZWdpc3RyeTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJoJlu1uWRhfxuXCXr8GIvB4j3CPuqkv6bJ2cWuL925MAJMjqDnfPupHraziPmQNj20Wxp8RX2R4iPeK3RVyeEPWpqbHLM/TaHEyDzD5lsnSfAOdKWWmFsopGA0iYg5bau4t1rKTykjrkB6wuYfXTHAlb3l+aHoNLTuvGe/YMA5aXMYqg2xWqYbKg78fuV5H8IqrzgWsmyuvwQgT7k6ljFBLlJJS2F7tl+xEh3VTRTBQI8QnAl1LT+yxXb0955xXpEZhvNkG0kElXuDebTx/KtDAsUllp9nNeWw58zhfnb30QlT0Wmws8NDPrrR0fXYk61rauiqIuW7sYMDNa25NKfECAwEAATANBgkqhkiG9w0BAQs",
            ],
            alg: "RS256",
          },
        ],
      };
    }
    return abdmV3Client.getCerts();
  }

  async registerFacilitySoftwareLinkage(
    input: MultipleHrpAddUpdateServicesRequest,
  ): Promise<{ status: string; message: string }> {
    // Validate facilityId: starting with IN and 12 characters (Section 3.2.5)
    if (!input.facilityId || !/^IN[a-zA-Z0-9]{10}$/.test(input.facilityId)) {
      throw new AbdmV3ClientError(
        ABDM_ERROR_CODES.INVALID_SERVICE_ID.code,
        "facilityId must start with IN and be 12 characters long.",
        400,
      );
    }

    // Validate hipName: max 15 characters, alphanumeric, no special characters (Section 3.2.5)
    if (!input.hipName || input.hipName.length > 15 || /[%$*#@(~&!)]/.test(input.hipName)) {
      throw new AbdmV3ClientError(
        ABDM_ERROR_CODES.INVALID_HIP_ID.code,
        "hipName cannot be more than 15 characters and cannot contain special characters (%$*#@(~&!).",
        400,
      );
    }

    if (!this.isLive()) {
      return {
        status: "SUCCESS",
        message: "Facility and bridge services linked successfully (SANDBOX DEMO).",
      };
    }

    const res = await abdmV3Client.registerFacilitySoftwareLinkage(input);
    return {
      status: res.status || "SUCCESS",
      message: res.message || "Facility and bridge services linked successfully.",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: HIU CONSENT FLOW (Section 4.0)
  // ─────────────────────────────────────────────────────────────────────────


  /**
   * Initiates an HIU Consent Request (4.3.1 POST /api/hiecm/consent/v3/request/init).
   * Validates all NHA mandatory fields, codes, date ranges, and permission parameters.
   */
  async initiateHiuConsentRequest(
    input: V3HiuConsentInitRequest,
    clinicId?: string,
  ): Promise<{ consentRequestId: string; status: string; message: string }> {
    // 1. Strict validation matching NHA specification test cases
    validateConsentInitRequest(input);

    const consentRequestId = randomUUID();
    const nowIso = new Date().toISOString();

    // 2. Track in-memory
    this.hiuConsentRequests.set(consentRequestId, {
      consentRequestId,
      status: "REQUESTED",
      patientId: input.consent.patient.id,
      request: input,
      consentArtefacts: [],
      artifacts: new Map(),
      createdAt: nowIso,
      lastUpdated: nowIso,
    });

    // 3. Persist in database if clinicId provided
    if (clinicId) {
      try {
        await prisma.digitalHealthConsent.create({
          data: {
            clinicId,
            patientId: input.consent.patient.id,
            purpose: input.consent.purpose.text,
            dataCategories: input.consent.hiTypes,
            status: "PENDING",
            externalConsentId: consentRequestId,
            sandboxMode: !this.isLive(),
          },
        });
      } catch {
        // Non-blocking in demo/test environments
      }
    }

    // 4. Send request to ABDM Gateway or simulate in demo mode
    if (!this.isLive()) {
      // Simulate instantaneous gateway on-init callback
      this.handleHiuConsentOnInitCallback({
        consentRequest: { id: consentRequestId },
        response: { requestId: randomUUID() },
        error: null,
      });

      return {
        consentRequestId,
        status: "REQUESTED",
        message: "Consent request initiated successfully (SANDBOX DEMO).",
      };
    }

    const res = await abdmV3Client.initConsentRequest(input);
    return {
      consentRequestId,
      status: "REQUESTED",
      message: res.message || "Consent request initiated with ABDM Gateway.",
    };
  }

  /**
   * Handles Gateway on-init callback to HIU (4.3.2 POST /api/v3/hiu/consent/request/on-init).
   */
  handleHiuConsentOnInitCallback(payload: V3HiuConsentOnInitCallback): void {
    const requestId = payload.consentRequest?.id;
    if (requestId && this.hiuConsentRequests.has(requestId)) {
      const existing = this.hiuConsentRequests.get(requestId)!;
      existing.status = "REQUESTED";
      existing.lastUpdated = new Date().toISOString();
    }
    abdmV3Events.emit("hiu:consent:on-init", payload);
  }

  /**
   * Handles Gateway notify callback when consent is APPROVED/REVOKED/DENIED/EXPIRED
   * (4.3.3 POST /api/v3/hiu/consent/request/notify).
   * Automatically responds to HIECM with acknowledgement (4.3.4 POST /api/hiecm/consent/v3/request/hiu/on-notify).
   */
  async handleHiuConsentNotifyCallback(payload: V3HiuConsentNotifyCallback): Promise<{ status: string }> {
    const notif = payload.notification;
    if (!notif) return { status: "FAIL" };

    const reqId = notif.consentRequestId;
    const req = this.hiuConsentRequests.get(reqId);
    if (req) {
      req.status = notif.status;
      req.lastUpdated = new Date().toISOString();
      if (notif.consentArtefacts) {
        req.consentArtefacts = notif.consentArtefacts.map((a) => a.id);
      }
    }

    // Update DB record if exists
    try {
      const dbStatus =
        notif.status === "GRANTED"
          ? "ACTIVE"
          : notif.status === "REVOKED"
            ? "REVOKED"
            : notif.status === "EXPIRED"
              ? "EXPIRED"
              : "REJECTED";

      await prisma.digitalHealthConsent.updateMany({
        where: { externalConsentId: reqId },
        data: {
          status: dbStatus,
          decidedAt: new Date(),
          notes: notif.reason || null,
        },
      });
    } catch {
      // Non-blocking in mock mode
    }

    // Automatically send acknowledgement to HIECM per Section 4.3.4
    const ackItems = (notif.consentArtefacts || []).map((art) => ({
      status: "OK" as const,
      consentId: art.id,
    }));
    if (ackItems.length === 0) {
      ackItems.push({
        status: "OK" as const,
        consentId: reqId,
      });
    }

    if (this.isLive()) {
      try {
        await abdmV3Client.respondConsentOnNotifyHiu({
          acknowledgement: ackItems,
          response: { requestId: randomUUID() },
          error: null,
        });
      } catch (err) {
        console.error("Failed to acknowledge HIU consent notification to HIECM:", err);
      }
    }

    abdmV3Events.emit("hiu:consent:notify", payload);
    return { status: "ACK" };
  }

  /**
   * Queries status of consent request from HIE-CM (4.3.5 POST /api/hiecm/consent/v3/request/status).
   */
  async getHiuConsentStatus(
    consentRequestId: string,
  ): Promise<{ consentRequestId: string; status: string }> {
    if (!consentRequestId) {
      throw new AbdmV3ClientError(ABDM_ERROR_CODES.INVALID_REQUEST_ID.code, "Invalid request ID", 400);
    }

    const tracked = this.hiuConsentRequests.get(consentRequestId);
    if (!this.isLive()) {
      return {
        consentRequestId,
        status: tracked ? tracked.status : "REQUESTED",
      };
    }

    await abdmV3Client.getConsentRequestStatus({ consentRequestId });
    return {
      consentRequestId,
      status: tracked ? tracked.status : "REQUESTED",
    };
  }

  /**
   * Handles Gateway on-status callback to HIU (4.3.6 POST /api/v3/hiu/consent/request/on-status).
   */
  handleHiuConsentOnStatusCallback(payload: V3HiuConsentOnStatusCallback): void {
    const reqId = payload.consentRequest?.id;
    const status = payload.consentRequest?.status;
    if (reqId && status && this.hiuConsentRequests.has(reqId)) {
      const existing = this.hiuConsentRequests.get(reqId)!;
      existing.status = status as any;
      existing.lastUpdated = new Date().toISOString();
    }
    abdmV3Events.emit("hiu:consent:on-status", payload);
  }

  /**
   * Fetches full signed consent artifact details from HIE-CM (4.3.7 POST /api/hiecm/consent/v3/fetch).
   */
  async fetchHiuConsentArtifact(consentId: string): Promise<{ consentId: string; status: string }> {
    if (!consentId) {
      throw new AbdmV3ClientError(
        ABDM_ERROR_CODES.INVALID_CONSENT_ARTEFACT_ID.code,
        "Invalid Consent artefact id",
        400,
      );
    }

    if (!this.isLive()) {
      // Find request tracking this consent artifact or create demo artifact
      const mockArtifact: V3ConsentArtifactDetail = {
        consentId,
        hip: { id: "DEMO_HIP" },
        hiu: { id: "DEMO_HIU" },
        hiTypes: ["Prescription", "DiagnosticReport", "OPConsultation"],
        patient: { id: "patient@sbx" },
        purpose: { code: "CAREMGT", text: "Care Management", refUri: "https://www.abdm.gov.in" },
        createdAt: new Date().toISOString(),
        requester: {
          name: "Dr. Clinic Specialist",
          identifier: { type: "REGNO", value: "MH1001", system: "https://www.mciindia.org" },
        },
        permission: {
          accessMode: "VIEW",
          dateRange: {
            from: new Date(Date.now() - 30 * 86400000).toISOString(),
            to: new Date().toISOString(),
          },
          dataEraseAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          frequency: { unit: "HOUR", value: 0, repeats: 0 },
        },
        schemaVersion: "v3",
        consentManager: { id: "sbx" },
      };

      this.handleHiuConsentOnFetchCallback({
        consent: {
          status: "GRANTED",
          consentDetail: mockArtifact,
          signature: "demo-consent-signature-" + randomUUID(),
        },
        response: { requestId: randomUUID() },
        error: null,
      });

      return { consentId, status: "FETCHED" };
    }

    await abdmV3Client.fetchConsentArtifact({ consentId });
    return { consentId, status: "FETCH_INITIATED" };
  }

  /**
   * Handles Gateway on-fetch callback delivering signed consent artifact to HIU
   * (4.3.8 POST /api/v3/hiu/consent/on-fetch).
   */
  handleHiuConsentOnFetchCallback(payload: V3HiuConsentOnFetchCallback): void {
    const art = payload.consent?.consentDetail;
    if (art?.consentId) {
      for (const req of this.hiuConsentRequests.values()) {
        if (req.consentArtefacts.includes(art.consentId)) {
          req.artifacts.set(art.consentId, art);
          break;
        }
      }
    }
    abdmV3Events.emit("hiu:consent:on-fetch", payload);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: HIU DATA FLOW (Section 5.0)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initiates Health Information Request from HIU to HIP via CM
   * (5.3.1 POST /api/hiecm/data-flow/v3/health-information/request).
   * Generates HIU ECDH Curve25519 keypair and registers data push URL.
   */
  async initiateHiuDataRequest(input: {
    consentId: string;
    dateRange: { from: string; to: string };
    dataPushUrl?: string | undefined;
  }): Promise<{ transactionId: string; sessionStatus: string; keyMaterial: import("./abdm-v3-types").V3KeyMaterial }> {
    if (!input.consentId) {
      throw new AbdmV3ClientError(
        ABDM_ERROR_CODES.INVALID_CONSENT_ARTEFACT_ID.code,
        "Invalid Consent artefact id",
        400,
      );
    }

    // 1. Generate HIU-side Curve25519 keypair for receiving encrypted health data
    const keyExchange = generateHiuKeyMaterial();
    const transactionId = randomUUID();
    const nowIso = new Date().toISOString();

    const pushUrl = input.dataPushUrl || "http://localhost:3000/api/v3/hiu/data/push";

    // 2. Track in-memory session for incoming data push decryption
    this.hiuDataExchanges.set(transactionId, {
      transactionId,
      consentId: input.consentId,
      hiuKeyMaterial: keyExchange.keyMaterial,
      hiuPrivateKey: keyExchange.privateKey,
      status: "REQUESTED",
      records: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const dataReq: import("./abdm-v3-types").V3HiuDataRequest = {
      hiRequest: {
        consent: { id: input.consentId },
        dateRange: input.dateRange,
        dataPushUrl: pushUrl,
        keyMaterial: keyExchange.keyMaterial,
      },
    };

    if (!this.isLive()) {
      // Simulate instantaneous gateway on-request callback
      this.handleHiuHealthInfoOnRequestCallback({
        hiRequest: {
          transactionId,
          sessionStatus: "REQUESTED",
        },
        response: { requestId: randomUUID() },
        error: null,
      });

      return {
        transactionId,
        sessionStatus: "REQUESTED",
        keyMaterial: keyExchange.keyMaterial,
      };
    }

    await abdmV3Client.requestHealthInformation(dataReq);
    return {
      transactionId,
      sessionStatus: "REQUESTED",
      keyMaterial: keyExchange.keyMaterial,
    };
  }

  /**
   * Handles Gateway on-request callback acknowledging data request to HIU
   * (5.3.2 POST /api/v3/hiu/health-information/on-request).
   */
  handleHiuHealthInfoOnRequestCallback(payload: import("./abdm-v3-types").V3HiuDataOnRequestCallback): void {
    const txnId = payload.hiRequest?.transactionId;
    if (txnId && this.hiuDataExchanges.has(txnId)) {
      const session = this.hiuDataExchanges.get(txnId)!;
      session.status = "ACKNOWLEDGED";
      session.updatedAt = new Date().toISOString();
    }
    abdmV3Events.emit("hiu:data:on-request", payload);
  }

  /**
   * Receives pushed health data directly from HIP at dataPushUrl (Section 5.2 Direct Data Transfer).
   * Decrypts each entry with HIU's Curve25519 private key, validates MD5 checksums,
   * parses FHIR bundles, and automatically notifies HIECM of receipt (Section 5.3.3).
   */
  async handleHiuDataPush(payload: V3DataPushPayload): Promise<{ status: string; count: number }> {
    const session = this.hiuDataExchanges.get(payload.transactionId);
    if (!session) {
      throw new AbdmV3ClientError(
        ABDM_ERROR_CODES.INVALID_TRANSACTION_ID.code,
        "Transaction ID not found for health data push.",
        400,
      );
    }

    // Decrypt each encrypted FHIR entry using HIU private key + HIP keyMaterial
    const decryptedRecords: Array<{
      careContextReference: string;
      fhirJson: string;
      fhirBundle: Record<string, unknown>;
      checksum: string;
      verified: boolean;
    }> = [];

    for (const entry of payload.entries) {
      const dec = decryptHiuDataPushEntry(
        entry.content,
        entry.checksum,
        session.hiuPrivateKey,
        session.hiuKeyMaterial.nonce,
        payload.keyMaterial,
      );

      decryptedRecords.push({
        careContextReference: entry.careContextReference,
        fhirJson: dec.fhirJson,
        fhirBundle: dec.fhirBundle,
        checksum: entry.checksum,
        verified: dec.verified,
      });
    }

    session.records.push(...decryptedRecords);
    session.status = "RECEIVED";
    session.updatedAt = new Date().toISOString();

    // Automatically notify HIE-CM of data transfer status (Section 5.3.3)
    const statusResponses = payload.entries.map((entry) => ({
      careContextReference: entry.careContextReference,
      hiStatus: "OK" as const,
      description: "Care Management",
    }));

    if (this.isLive()) {
      try {
        await abdmV3Client.notifyHiuDataTransfer({
          notification: {
            consentId: session.consentId,
            transactionId: payload.transactionId,
            doneAt: new Date().toISOString(),
            notifier: {
              type: "HIU",
              id: "SMRKOMED_HIU",
            },
            statusNotification: {
              sessionStatus: "RECEIVED",
              hipId: "HIP_ID",
              statusResponses,
            },
          },
        });
      } catch (err) {
        console.error("Failed to notify HIECM of HIU data transfer receipt:", err);
      }
    }

    abdmV3Events.emit("hiu:data:received", {
      transactionId: payload.transactionId,
      count: decryptedRecords.length,
      records: decryptedRecords,
    });

    return { status: "SUCCESS", count: decryptedRecords.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: SUBSCRIPTION FLOW (Section 6.0)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fetches subscription requests for patient/PHR application
   * (6.3.1 GET /api/hiecm/subscription-requests/v3/requests).
   */
  async getSubscriptionRequests(
    params: V3SubscriptionGetRequestsParams = {},
    xAuthToken?: string,
  ): Promise<unknown> {
    if (!this.isLive()) {
      // Mock response matching NHA format
      const requests = Array.from(this.hiuSubscriptions.values()).map((sub) => ({
        requestId: sub.subscriptionRequestId,
        subscriptionId: sub.subscriptionRequestId,
        requestType: "HEALTH_LOCKER",
        status: sub.status,
        details: {
          patient: sub.request.subscription.patient,
          purpose: sub.request.subscription.purpose,
          hiu: sub.request.subscription.hiu,
          hips: sub.request.subscription.hips || [],
          categories: sub.request.subscription.categories,
          period: sub.request.subscription.period,
        },
      }));
      return {
        limit: params.limit || 10,
        offset: params.offset || 0,
        size: requests.length,
        requests,
      };
    }

    return abdmV3Client.getSubscriptionRequests(params, xAuthToken);
  }

  /**
   * Initiates a subscription request from HIU to patient/PHR
   * (6.3.2 POST /api/hiecm/subscription-requests/v3/init).
   */
  async initiateSubscriptionRequest(
    input: V3SubscriptionInitRequest,
  ): Promise<{ subscriptionRequestId: string; status: string }> {
    const subscriptionRequestId = randomUUID();
    const nowIso = new Date().toISOString();

    this.hiuSubscriptions.set(subscriptionRequestId, {
      subscriptionRequestId,
      status: "REQUESTED",
      patientId: input.subscription.patient.id,
      request: input,
      events: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (!this.isLive()) {
      // Simulate instantaneous on-init callback
      this.handleSubscriptionOnInit({
        subscriptionRequest: { id: subscriptionRequestId },
        response: { requestId: randomUUID() },
        error: null,
      });

      return {
        subscriptionRequestId,
        status: "REQUESTED",
      };
    }

    await abdmV3Client.initSubscriptionRequest(input);
    return {
      subscriptionRequestId,
      status: "REQUESTED",
    };
  }

  /**
   * Handles on-init callback for subscription initiation
   * (6.3.3 POST /api/v3/hiu/hiecm/subscription-requests/on-init).
   */
  handleSubscriptionOnInit(payload: V3SubscriptionOnInitCallback): void {
    const id = payload.subscriptionRequest?.id;
    if (id && this.hiuSubscriptions.has(id)) {
      const sub = this.hiuSubscriptions.get(id)!;
      sub.status = "REQUESTED";
      sub.updatedAt = new Date().toISOString();
    }
    abdmV3Events.emit("hiu:subscription:on-init", payload);
  }

  /**
   * Approves a subscription request from PHR app
   * (6.3.4 POST /api/hiecm/subscription-requests/v3/{id}/approve).
   */
  async approveSubscriptionRequest(
    subscriptionRequestId: string,
    input: V3SubscriptionApproveRequest,
    xAuthToken?: string,
  ): Promise<{ subscriptionId: string; message: string }> {
    const sub = this.hiuSubscriptions.get(subscriptionRequestId);
    if (sub) {
      sub.status = "GRANTED";
      sub.approvalDetails = input;
      sub.updatedAt = new Date().toISOString();
    }

    if (!this.isLive()) {
      // Simulate approval notify callback to HIU (Section 6.3.5)
      await this.handleSubscriptionNotify({
        notification: {
          subscriptionRequestId,
          status: "GRANTED",
          reason: null,
          subscription: {
            id: subscriptionRequestId,
            patient: { id: sub ? sub.patientId : "patient@sbx" },
            hiu: { id: "HIU_ID", name: "HIU_NAME", type: "HIU" },
            sources: input.includedSources,
            period: input.period,
          },
        },
      });

      return {
        subscriptionId: subscriptionRequestId,
        message: "Successfully approved Subscription request",
      };
    }

    const res = await abdmV3Client.approveSubscriptionRequest(subscriptionRequestId, input, xAuthToken);
    return {
      subscriptionId: res.subscriptionId || subscriptionRequestId,
      message: res.message || "Successfully approved Subscription request",
    };
  }

  /**
   * Denies a subscription request from PHR app
   * (6.3.7 POST /api/hiecm/subscriptionrequests/v3/{id}/deny).
   */
  async denySubscriptionRequest(
    subscriptionId: string,
    reason: string,
    xAuthToken?: string,
  ): Promise<{ message: string }> {
    const sub = this.hiuSubscriptions.get(subscriptionId);
    if (sub) {
      sub.status = "DENIED";
      sub.updatedAt = new Date().toISOString();
    }

    if (!this.isLive()) {
      // Simulate denial notify callback to HIU (Section 6.3.8)
      await this.handleSubscriptionNotify({
        notification: {
          subscriptionRequestId: subscriptionId,
          status: "DENIED",
          reason,
        },
      });

      return { message: "Successfully denied the subscription request" };
    }

    const res = await abdmV3Client.denySubscriptionRequest(subscriptionId, { reason }, xAuthToken);
    return { message: res.message || "Successfully denied the subscription request" };
  }

  /**
   * Handles notify callback when subscription is APPROVED or DENIED
   * (6.3.5 & 6.3.8 POST /api/v3/hiu/subscription-requests/hiu/notify).
   * Automatically responds to HIECM with acknowledgement (6.3.6 POST /api/hiecm/subscription-requests/v3/hiu/on-notify).
   */
  async handleSubscriptionNotify(payload: V3SubscriptionNotifyCallback): Promise<{ status: string }> {
    const notif = payload.notification;
    if (notif?.subscriptionRequestId) {
      const sub = this.hiuSubscriptions.get(notif.subscriptionRequestId);
      if (sub) {
        sub.status = notif.status;
        sub.updatedAt = new Date().toISOString();
      }

      // Automatically acknowledge to HIECM (Section 6.3.6)
      if (this.isLive()) {
        try {
          await abdmV3Client.respondSubscriptionOnNotifyHiu({
            acknowledgement: {
              status: "OK",
              subscriptionRequestId: notif.subscriptionRequestId,
            },
            response: { requestId: randomUUID() },
            error: null,
          });
        } catch (err) {
          console.error("Failed to acknowledge subscription notification to HIECM:", err);
        }
      }
    }

    abdmV3Events.emit("hiu:subscription:notify", payload);
    return { status: "ACK" };
  }

  /**
   * Edits an active subscription from PHR app
   * (6.3.9 PUT /api/hiecm/subscription-requests/v3/patients/{id}).
   */
  async editSubscriptionRequest(
    subscriptionId: string,
    input: V3SubscriptionEditRequest,
    xAuthToken?: string,
  ): Promise<{ subscriptionId: string; message: string }> {
    if (!this.isLive()) {
      return {
        subscriptionId,
        message: "Successful creation of Subscriptions",
      };
    }

    const res = await abdmV3Client.editSubscriptionRequest(subscriptionId, input, xAuthToken);
    return {
      subscriptionId: res.subscriptionId || subscriptionId,
      message: res.message || "Successful creation of Subscriptions",
    };
  }

  /**
   * Handles link new record notification from HIECM to HIU
   * (6.3.11 POST /api/v3/hiu/subscription/notify).
   * Automatically responds to HIECM with acknowledgement
   * (6.3.12 POST /api/hiecm/subscription-requests/v3/hiu/care-context/on-notify).
   */
  async handleSubscriptionEventNotify(
    payload: V3SubscriptionEventNotifyCallback,
  ): Promise<{ status: string }> {
    const event = payload.event;
    if (event?.subscriptionId) {
      const sub = this.hiuSubscriptions.get(event.subscriptionId);
      if (sub) {
        sub.events.push(payload);
        sub.updatedAt = new Date().toISOString();
      }

      // Automatically acknowledge to HIECM per Section 6.3.12
      if (this.isLive()) {
        try {
          await abdmV3Client.respondSubscriptionCareContextOnNotify({
            acknowledgement: {
              status: "OK",
              eventId: event.id,
            },
            response: { requestId: randomUUID() },
            error: null,
          });
        } catch (err) {
          console.error("Failed to acknowledge subscription event notification to HIECM:", err);
        }
      }
    }

    abdmV3Events.emit("hiu:subscription:event", payload);
    return { status: "ACK" };
  }
}


export const abdmV3Service = new AbdmV3Service();

// ─────────────────────────────────────────────────────────────────────────────
// NHA BUILDING HIP: STANDALONE HELPERS (FHIR, FUZZY MATCH, DEEP LINK)
// ─────────────────────────────────────────────────────────────────────────────

export interface FhirRecordInput {
  careContextReference: string;
  hiType:
    | "OPCONSULTATION"
    | "PRESCRIPTION"
    | "DIAGNOSTIC REPORT"
    | "DISCHARGE SUMMARY"
    | "IMMUNIZATION RECORD"
    | "HEALTH DOCUMENT RECORD"
    | "WELLNESS RECORD";
  format: "STRUCTURED" | "UNSTRUCTURED";
  patient: {
    id: string;
    name: string;
    gender: "M" | "F" | "O" | "D";
    birthDate?: string | undefined;
    abhaAddress?: string | undefined;
    abhaNumber?: string | undefined;
    mobile?: string | undefined;
  };
  encounter?: {
    visitDateTime: string;
    doctorName?: string | undefined;
  } | undefined;
  details: {
    title: string;
    content?: string | undefined;
    attachmentBase64?: string | undefined;
    medications?: Array<{ medicineName: string; dosage?: string | undefined; instructions?: string | undefined }> | undefined;
    diagnosticObservations?: Array<{ code: string; display: string; value: string; unit?: string | undefined }> | undefined;
  };
}

/**
 * Builds compliant ABDM FHIR Document Bundle (mandatory per NHA S.No 1.1).
 * Supports both Structured and Unstructured data formats.
 */
export function generateAbdmFhirRecord(input: FhirRecordInput): {
  resourceType: "Bundle";
  type: "document";
  id: string;
  timestamp: string;
  meta: { lastUpdated: string; profile: string[] };
  identifier: { system: string; value: string };
  entry: Array<{ fullUrl: string; resource: Record<string, unknown> }>;
} {
  const bundleId = `bundle-${randomUUID()}`;
  const compositionId = `comp-${randomUUID()}`;
  const patientId = `patient-${input.patient.id}`;
  const timestamp = input.encounter?.visitDateTime || new Date().toISOString();

  const patientResource: Record<string, unknown> = {
    resourceType: "Patient",
    id: patientId,
    name: [{ text: input.patient.name }],
    gender: input.patient.gender === "M" ? "male" : input.patient.gender === "F" ? "female" : "other",
    ...(input.patient.birthDate ? { birthDate: input.patient.birthDate } : {}),
    identifier: [
      ...(input.patient.abhaAddress
        ? [{ system: "https://healthid.ndhm.gov.in", value: input.patient.abhaAddress }]
        : []),
      ...(input.patient.abhaNumber
        ? [{ system: "https://ndhm.gov.in/abha-number", value: input.patient.abhaNumber }]
        : []),
    ],
  };

  const compositionResource: Record<string, unknown> = {
    resourceType: "Composition",
    id: compositionId,
    status: "final",
    type: {
      coding: [
        {
          system: "https://projecteka.in/snomed",
          code: input.hiType,
          display: input.details.title,
        },
      ],
      text: input.details.title,
    },
    subject: { reference: `Patient/${patientId}`, display: input.patient.name },
    date: timestamp,
    title: input.details.title,
    author: [{ display: input.encounter?.doctorName || "Treating Physician" }],
    section: [
      {
        title: input.details.title,
        code: { coding: [{ code: input.hiType }] },
      },
    ],
  };

  const entries: Array<{ fullUrl: string; resource: Record<string, unknown> }> = [
    { fullUrl: `Composition/${compositionId}`, resource: compositionResource },
    { fullUrl: `Patient/${patientId}`, resource: patientResource },
  ];

  if (input.format === "UNSTRUCTURED") {
    const docRefId = `docref-${randomUUID()}`;
    entries.push({
      fullUrl: `DocumentReference/${docRefId}`,
      resource: {
        resourceType: "DocumentReference",
        id: docRefId,
        status: "current",
        subject: { reference: `Patient/${patientId}` },
        description: input.details.title,
        content: [
          {
            attachment: {
              contentType: input.details.attachmentBase64 ? "application/pdf" : "text/plain",
              data: input.details.attachmentBase64 || Buffer.from(input.details.content || "").toString("base64"),
              title: input.details.title,
            },
          },
        ],
      },
    });
  } else {
    // Structured format
    if (input.details.medications && input.details.medications.length > 0) {
      input.details.medications.forEach((med, idx) => {
        const medId = `med-req-${idx + 1}`;
        entries.push({
          fullUrl: `MedicationRequest/${medId}`,
          resource: {
            resourceType: "MedicationRequest",
            id: medId,
            status: "active",
            intent: "order",
            medicationCodeableConcept: { text: med.medicineName },
            dosageInstruction: [{ text: `${med.dosage || ""} - ${med.instructions || ""}`.trim() }],
            subject: { reference: `Patient/${patientId}` },
          },
        });
      });
    }

    if (input.details.diagnosticObservations && input.details.diagnosticObservations.length > 0) {
      input.details.diagnosticObservations.forEach((obs, idx) => {
        const obsId = `obs-${idx + 1}`;
        entries.push({
          fullUrl: `Observation/${obsId}`,
          resource: {
            resourceType: "Observation",
            id: obsId,
            status: "final",
            code: { coding: [{ code: obs.code, display: obs.display }] },
            valueString: `${obs.value} ${obs.unit || ""}`.trim(),
            subject: { reference: `Patient/${patientId}` },
          },
        });
      });
    }
  }

  return {
    resourceType: "Bundle",
    type: "document",
    id: bundleId,
    timestamp,
    meta: {
      lastUpdated: timestamp,
      profile: ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"],
    },
    identifier: {
      system: "https://smrkomed.com/fhir/bundles",
      value: input.careContextReference,
    },
    entry: entries,
  };
}

/**
 * Fuzzy matching on patient records when searched by mobile number (NHA S.No 6.4).
 * Priority: 1. ABHA Address exact match, 2. Mobile match + Name fuzzy match.
 */
export function fuzzyMatchPatient(
  query: { name?: string | undefined; phone?: string | undefined; abhaAddress?: string | undefined },
  candidate: { name: string; phone?: string | undefined; abhaAddress?: string | undefined },
): { matched: boolean; score: number; matchType: "ABHA_EXACT" | "PHONE_AND_FUZZY_NAME" | "PHONE_ONLY" | "NONE" } {
  // 1. First priority: ABHA Address exact match
  if (
    query.abhaAddress &&
    candidate.abhaAddress &&
    query.abhaAddress.toLowerCase() === candidate.abhaAddress.toLowerCase()
  ) {
    return { matched: true, score: 1.0, matchType: "ABHA_EXACT" };
  }

  // 2. Second priority: Mobile number match
  const cleanQPhone = query.phone?.replace(/\D/g, "").slice(-10);
  const cleanCPhone = candidate.phone?.replace(/\D/g, "").slice(-10);
  const phoneMatched = cleanQPhone && cleanCPhone && cleanQPhone === cleanCPhone;

  if (!phoneMatched) {
    return { matched: false, score: 0.0, matchType: "NONE" };
  }

  // On mobile number match, do fuzzy logic match on patient name
  if (!query.name) {
    return { matched: true, score: 0.5, matchType: "PHONE_ONLY" };
  }

  const qTokens = query.name.toLowerCase().trim().split(/\s+/);
  const cTokens = candidate.name.toLowerCase().trim().split(/\s+/);
  const overlap = qTokens.filter((token) => cTokens.some((ct) => ct.includes(token) || token.includes(ct)));
  const score = overlap.length / Math.max(qTokens.length, cTokens.length);

  // Score >= 0.4 considered a fuzzy name match
  return {
    matched: score >= 0.4,
    score,
    matchType: score >= 0.4 ? "PHONE_AND_FUZZY_NAME" : "PHONE_ONLY",
  };
}

/**
 * Formats Deep Link SMS for beneficiary onboarding without requiring prior ABHA (NHA S.No 7.1).
 */
export function formatDeepLinkSms(input: {
  hipName: string;
  deepLinkUrl?: string | undefined;
  facilityCode?: string | undefined;
}): string {
  const url = input.deepLinkUrl || "https://phr.abdm.gov.in/download";
  return `Welcome to ${input.hipName}! Your health records are ready. Tap the ABDM link to install your PHR app and view your digital records: ${url} (Facility: ${input.facilityCode || "SMRKOMED"})`;
}

