/**
 * ABDM Milestone 1 (ABHA) Type Definitions.
 * Conforms to NHA ABDM Gateway v0.5 / v3 API specification.
 */

export type AbdmSessionToken = {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  expiresAt: number; // Unix timestamp in ms
};

export type AbdmAuthMode = "MOBILE_OTP" | "AADHAAR_OTP" | "DEMO_OTP";

export type AbdmRequesterType = "HIP" | "HIU";

export type AbdmAuthPurpose = "KYC_AND_LINK" | "KYC" | "LINK";

export type AbdmPatientIdentifier = {
  type: "HEALTH_NUMBER" | "MOBILE" | "MR" | string;
  value: string;
};

export type AbdmPatientAddress = {
  line?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export type AbdmVerifiedPatientProfile = {
  id: string; // ABHA address (e.g. "priya@abdm")
  name: string;
  gender: string;
  yearOfBirth?: number | null;
  monthOfBirth?: number | null;
  dayOfBirth?: number | null;
  address?: AbdmPatientAddress | null;
  identifiers: AbdmPatientIdentifier[];
};

export type AbdmCallbackResp = {
  requestId: string;
};

export type AbdmCallbackError = {
  code: number | string;
  message: string;
};

export type AbdmOnFetchModesCallbackPayload = {
  requestId: string;
  timestamp: string;
  auth?: {
    purpose: string;
    modes: string[];
  } | null;
  error?: AbdmCallbackError | null;
  resp: AbdmCallbackResp;
};

export type AbdmOnInitCallbackPayload = {
  requestId: string;
  timestamp: string;
  auth?: {
    transactionId: string;
    mode: string;
    meta?: {
      hint?: string | null;
      expiry?: string | null;
    } | null;
  } | null;
  error?: AbdmCallbackError | null;
  resp: AbdmCallbackResp;
};

export type AbdmOnConfirmCallbackPayload = {
  requestId: string;
  timestamp: string;
  auth?: {
    accessToken?: string | null;
    validity?: string | null;
    patient?: AbdmVerifiedPatientProfile | null;
  } | null;
  error?: AbdmCallbackError | null;
  resp: AbdmCallbackResp;
};

export type GatewayInitAuthResult =
  | {
      ok: true;
      requestId: string;
      transactionId?: string;
      authMode: string;
      maskedMobile?: string | null;
      expiry?: string | null;
      message: string;
      isAsyncCallback: boolean;
    }
  | {
      ok: false;
      code: string;
      message: string;
      technicalDetail?: string;
    };

export type GatewayConfirmAuthResult =
  | {
      ok: true;
      requestId: string;
      profile: AbdmVerifiedPatientProfile;
      officialAbhaNumber: string;
      officialAbhaAddress: string;
      message: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      technicalDetail?: string;
    };
