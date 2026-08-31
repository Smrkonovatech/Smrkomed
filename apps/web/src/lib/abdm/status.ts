/** ABHA / ABDM status engine — UI labels mapped from DigitalHealthIdentity + verificationStatus. */

export type AbhaUiStatus =
  | "NOT_REGISTERED"
  | "REGISTRATION_STARTED"
  | "AUTHENTICATION_PENDING"
  | "ABHA_CREATED"
  | "ABHA_LINKED"
  | "KYC_VERIFIED"
  | "SELF_DECLARED"
  | "LINK_PENDING"
  | "AUTHENTICATION_FAILED"
  | "DUPLICATE_DETECTED"
  | "CONSENT_PENDING"
  | "SUSPENDED"
  | "ERROR";

export const ABHA_STATUS_LABELS: Record<AbhaUiStatus, string> = {
  NOT_REGISTERED: "Not Registered",
  REGISTRATION_STARTED: "Registration Started",
  AUTHENTICATION_PENDING: "Authentication Pending",
  ABHA_CREATED: "ABHA Created",
  ABHA_LINKED: "ABHA Linked",
  KYC_VERIFIED: "KYC Verified",
  SELF_DECLARED: "Self Declared",
  LINK_PENDING: "Link Pending",
  AUTHENTICATION_FAILED: "Authentication Failed",
  DUPLICATE_DETECTED: "Duplicate Detected",
  CONSENT_PENDING: "Consent Pending",
  SUSPENDED: "Suspended / Unavailable",
  ERROR: "Error",
};

export function resolveAbhaUiStatus(identity: {
  status: string;
  verificationStatus?: string | null;
}): AbhaUiStatus {
  const v = (identity.verificationStatus ?? "").toUpperCase();
  if (v.includes("FAILED") || v.includes("AUTHENTICATION_FAILED")) return "AUTHENTICATION_FAILED";
  if (v.includes("DUPLICATE")) return "DUPLICATE_DETECTED";
  if (v.includes("CONSENT")) return "CONSENT_PENDING";
  if (v.includes("KYC") || v === "DEMO_VERIFIED") return "KYC_VERIFIED";
  if (v.includes("ABHA_CREATED") || v.includes("REGISTRATION_STARTED")) {
    if (identity.status === "LINKED") return "ABHA_LINKED";
    return v.includes("ABHA_CREATED") ? "ABHA_CREATED" : "REGISTRATION_STARTED";
  }
  if (v.includes("AUTHENTICATION_PENDING") || v === "AWAITING_ABDM") return "AUTHENTICATION_PENDING";
  if (v.includes("IDENTITY_MATCHED")) return "LINK_PENDING";

  switch (identity.status) {
    case "LINKED":
      return "ABHA_LINKED";
    case "PENDING":
      return "LINK_PENDING";
    case "VERIFICATION_REQUIRED":
      return "AUTHENTICATION_PENDING";
    case "ERROR":
      return "ERROR";
    case "NOT_LINKED":
    default:
      return "NOT_REGISTERED";
  }
}

export function abhaStatusTone(status: AbhaUiStatus): "success" | "warning" | "danger" | "muted" | "info" {
  if (status === "ABHA_LINKED" || status === "KYC_VERIFIED" || status === "ABHA_CREATED") return "success";
  if (
    status === "AUTHENTICATION_PENDING" ||
    status === "LINK_PENDING" ||
    status === "REGISTRATION_STARTED" ||
    status === "CONSENT_PENDING"
  )
    return "warning";
  if (
    status === "AUTHENTICATION_FAILED" ||
    status === "DUPLICATE_DETECTED" ||
    status === "ERROR" ||
    status === "SUSPENDED"
  )
    return "danger";
  if (status === "SELF_DECLARED") return "info";
  return "muted";
}

export const CONSENT_VERSION = "abdm-consent-v1";

export const RECORD_TYPE_OPTIONS = [
  "Diagnostic Reports",
  "Discharge Summary",
  "OP Consultation Notes",
  "Prescriptions",
  "Immunization Records",
  "Wellness Records",
  "Health Documents",
] as const;
