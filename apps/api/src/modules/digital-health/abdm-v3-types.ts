/**
 * ABDM Milestone 2 (HIP & HIU Data Exchange, Care Context Linking, Consent Flow, Scan & Share)
 * Conforms to NHA ABDM Milestone 2 Sandbox Specification v2.8 (13.02.2026).
 */

export const ABDM_HIT_TYPES = [
  "PRESCRIPTION",
  "DIAGNOSTIC REPORT",
  "OPCONSULTATION",
  "DISCHARGE SUMMARY",
  "IMMUNIZATION RECORD",
  "HEALTH DOCUMENT RECORD",
  "WELLNESS RECORD",
] as const;

export type AbdmHiType = (typeof ABDM_HIT_TYPES)[number];

export interface CareContextItem {
  referenceNumber: string;
  display: string;
}

export interface PatientCareContextGroup {
  referenceNumber: string;
  display?: string;
  careContexts: CareContextItem[];
  hiType: string;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// GATEWAY BRIDGE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface BridgeUrlUpdateRequest {
  url: string;
}

export interface BridgeServiceDetails {
  id: number | string;
  bridgeId: string;
  serviceId: string;
  name: string;
  isHip: boolean;
  isHiu: boolean;
  isPhr: boolean;
  endpoints?: Record<string, unknown>;
  active: boolean;
  registerTime?: string;
  dateCreated?: string;
  dateModified?: string;
}

export interface BridgeServicesListResponse {
  bridge: {
    id: string;
    name: string;
    url: string;
    active: boolean;
    blocklisted: boolean;
  };
  services: Array<{
    id: string;
    name: string;
    types: string[];
    endpoints?: Record<string, unknown>;
    active: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HIP-INITIATED LINKING
// ─────────────────────────────────────────────────────────────────────────────

export interface V3LinkTokenGenerateRequest {
  abhaAddress?: string;
  abhaNumber?: string | number;
  name: string;
  gender: "M" | "F" | "O" | "D";
  yearOfBirth: number;
}

export interface V3LinkTokenOnGenerateCallback {
  abhaAddress?: string;
  linkToken?: string;
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface V3CareContextLinkRequest {
  abhaAddress: string;
  abhaNumber?: string;
  patient: PatientCareContextGroup[];
}

export interface V3CareContextOnLinkCallback {
  abhaAddress: string;
  status?: string;
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface V3PatientLinksResponse {
  patient: {
    id: string;
    links: Array<{
      hip: {
        id: string;
        name: string;
        type: string;
      };
      referenceNumber: string;
      display: string;
      hiType: string;
      careContexts: CareContextItem[];
      dateCreated: string;
    }>;
  };
}

export interface V3CareContextNotifyRequest {
  notification: {
    patient: {
      id: string;
    };
    careContext: {
      patientReference: string;
      careContextReference: string;
    };
    hiTypes: string[];
    date: string;
    hip: {
      id: string;
    };
  };
}

export interface V3CareContextOnNotifyCallback {
  requestId: string;
  timestamp: string;
  acknowledgement: {
    status: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface V3SmsNotifyRequest {
  requestId: string;
  timestamp: string;
  notification: {
    phoneNo: string;
    hip: {
      id: string;
      name: string;
    };
  };
}

export interface V3SmsOnNotifyCallback {
  requestId: string;
  timestamp: string;
  status: string;
  resp: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// USER-INITIATED LINKING (DISCOVER / INIT / CONFIRM)
// ─────────────────────────────────────────────────────────────────────────────

export interface V3DiscoverCallbackPayload {
  transactionId: string;
  patient: {
    id: string; // ABHA address (e.g. user@sbx)
    verifiedIdentifiers?: Array<{
      type: "MOBILE" | "ABHA_NUMBER" | string;
      value: string;
    }>;
    unverifiedIdentifiers?: Array<{
      type: "MR" | "ABHA_ADDRESS" | string;
      value: string;
    }>;
    name: string;
    gender: string;
    yearOfBirth: number | string;
  };
}

export interface V3OnDiscoverRequest {
  transactionId: string;
  patient?: PatientCareContextGroup[];
  matchedBy?: string[];
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface V3LinkInitCallbackPayload {
  transactionId: string;
  abhaAddress?: string;
  patient: Array<{
    referenceNumber: string;
    careContexts: Array<{ referenceNumber: string }>;
    hiType: string;
    count: number;
  }>;
}

export interface V3OnInitRequest {
  transactionId: string;
  link?: {
    referenceNumber: string;
    authenticationType: "MEDIATE" | "DIRECT";
    meta: {
      communicationMedium: "MOBILE" | "EMAIL";
      communicationHint: "OTP";
      communicationExpiry: string;
    };
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface V3LinkConfirmCallbackPayload {
  confirmation: {
    token: string;
    linkRefNumber: string;
  };
}

export interface V3OnConfirmRequest {
  patient?: PatientCareContextGroup[];
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSENT & DATA FLOW
// ─────────────────────────────────────────────────────────────────────────────

export interface V3ConsentNotifyCallbackPayload {
  notification: {
    status: "GRANTED" | "REVOKED" | "EXPIRED";
    consentId: string;
    createdAt: string;
    patient: {
      id: string;
    };
    hip?: {
      id: string;
      name?: string;
    };
    hiu?: {
      id: string;
      name?: string;
    };
    purpose: {
      text: string;
      code: string;
      refUri?: string;
    };
    careContexts?: Array<{
      patientReference?: string;
      careContextReference: string;
    }>;
    hiTypes: string[];
    permission: {
      accessMode: "VIEW" | "STORE" | "STREAM" | "QUERY";
      dateRange: {
        from: string;
        to: string;
      };
      dataEraseAt: string;
      frequency?: {
        unit: string;
        value: number;
        repeats: number;
      };
    };
    signature?: string;
    grantAcknowledgement?: boolean;
  };
}

export interface V3ConsentOnNotifyRequest {
  acknowledgement: {
    status: "OK" | "FAILED";
    consentId: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface V3KeyMaterial {
  cryptoAlg: "ECDH";
  curve: "Curve25519";
  dhPublicKey: {
    expiry: string;
    parameters: string;
    keyValue: string;
  };
  nonce: string;
}

export interface V3HealthInfoRequestCallbackPayload {
  hiRequest: {
    consent: {
      id: string;
    };
    dateRange: {
      from: string;
      to: string;
    };
    dataPushUrl: string;
    keyMaterial: V3KeyMaterial;
  };
}

export interface V3HealthInfoOnRequestPayload {
  hiRequest?: {
    transactionId: string;
    sessionStatus: "ACKNOWLEDGED" | "FAILED";
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface V3DataPushEntry {
  content: string; // Encrypted FHIR JSON string
  media: "application/fhir+json";
  checksum: string;
  careContextReference: string;
}

export interface V3DataPushPayload {
  pageNumber: number;
  pageCount: number;
  transactionId: string;
  entries: V3DataPushEntry[];
  keyMaterial: V3KeyMaterial;
}

export interface V3HealthInfoNotifyPayload {
  notification: {
    consentId: string;
    transactionId: string;
    doneAt: string;
    notifier: {
      type: "HIP" | "HIU";
      id: string;
    };
    statusNotification: {
      sessionStatus: "TRANSFERRED" | "FAILED" | "RECEIVED";
      hipId: string;
      statusResponses: Array<{
        careContextReference: string;
        hiStatus: "OK" | "DELIVERED" | "ERRORED";
        description?: string;
      }>;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN AND PROFILE SHARE
// ─────────────────────────────────────────────────────────────────────────────

export interface V3ProfileShareCallbackPayload {
  intent: "PROFILE_SHARE" | string;
  metaData: {
    hipId: string;
    context?: string;
    hprId?: string;
    latitude?: string;
    longitude?: string;
  };
  profile: {
    patient: {
      abhaNumber: string | number;
      abhaAddress: string;
      name: string;
      gender: "M" | "F" | "O" | "D";
      dayOfBirth?: string | number;
      monthOfBirth?: string | number;
      yearOfBirth: string | number;
      address?: {
        line?: string | null;
        district?: string | null;
        state?: string | null;
        pincode?: string | null;
      };
      phoneNumber?: string;
    };
  };
}

export interface V3ProfileOnShareRequest {
  acknowledgement?: {
    abhaAddress: string;
    status: "success" | "failed";
    profile: {
      context?: string;
      tokenNumber: string | number;
      expiry: string;
    };
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE 3: HIU GATEWAY FLOWS
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenIdConfigurationResponse {
  jwks_uri: string;
}

export interface OAuthCertKey {
  e: string;
  kid: string;
  kty: string;
  n: string;
  use: string;
  x5c: string[];
  alg?: string;
  x5t?: string;
  x5t2?: string;
}

export interface OAuthCertsResponse {
  keys: OAuthCertKey[];
}

export interface MultipleHrpAddUpdateServicesRequest {
  facilityId: string;
  facilityName: string;
  bridgeId: string;
  hipName: string;
  type: string;
  active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE 3: HIU CONSENT FLOW
// ─────────────────────────────────────────────────────────────────────────────

export interface V3ConsentPurpose {
  code: string;
  text: string;
  refUri: string;
}

export interface V3ConsentRequesterIdentifier {
  type: string;
  value: string;
  system: string;
}

export interface V3ConsentRequester {
  name: string;
  identifier: V3ConsentRequesterIdentifier;
}

export interface V3ConsentPermission {
  accessMode: "VIEW" | "STORE" | "QUERY" | "STREAM";
  dateRange: {
    from: string;
    to: string;
  };
  dataEraseAt: string;
  frequency: {
    unit: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
    value: number;
    repeats: number;
  };
}

export interface V3ConsentCareContext {
  patientReference?: string;
  careContextReference: string;
}

export interface V3HiuConsentInitRequest {
  consent: {
    hip?: {
      id: string;
    } | null;
    hiu: {
      id: string;
    };
    hiTypes: string[];
    patient: {
      id: string;
    };
    purpose: V3ConsentPurpose;
    requester: V3ConsentRequester;
    permission: V3ConsentPermission;
    careContexts?: V3ConsentCareContext[];
  };
}

export interface V3HiuConsentOnInitCallback {
  consentRequest?: {
    id: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
}

export interface V3HiuConsentNotifyCallback {
  notification: {
    consentRequestId: string;
    status: "GRANTED" | "REVOKED" | "DENIED" | "EXPIRED";
    reason?: string | null;
    consentArtefacts?: Array<{
      id: string;
    }>;
  };
}

export interface V3HiuConsentOnNotifyAckRequest {
  acknowledgement: Array<{
    status: "OK" | "FAILED";
    consentId: string;
  }>;
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
}

export interface V3HiuConsentStatusRequest {
  consentRequestId: string;
}

export interface V3HiuConsentOnStatusCallback {
  consentRequest?: {
    id: string;
    status: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
  resp?: unknown;
}

export interface V3HiuConsentFetchRequest {
  consentId: string;
}

export interface V3ConsentArtifactDetail {
  consentId: string;
  hip: {
    id: string;
  };
  hiu: {
    id: string;
  };
  hiTypes: string[];
  patient: {
    id: string;
  };
  purpose: V3ConsentPurpose;
  createdAt: string;
  requester: V3ConsentRequester;
  permission: V3ConsentPermission;
  lastUpdated?: string;
  careContexts?: V3ConsentCareContext[];
  schemaVersion?: string;
  consentManager?: {
    id: string;
  };
}

export interface V3HiuConsentOnFetchCallback {
  consent?: {
    status: string;
    consentDetail: V3ConsentArtifactDetail;
    signature?: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
  resp?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE 3: HIU DATA FLOW
// ─────────────────────────────────────────────────────────────────────────────

export interface V3HiuDataRequest {
  hiRequest: {
    consent: {
      id: string;
    };
    dateRange: {
      from: string;
      to: string;
    };
    dataPushUrl: string;
    keyMaterial: V3KeyMaterial;
  };
}

export interface V3HiuDataOnRequestCallback {
  hiRequest?: {
    transactionId: string;
    sessionStatus: "REQUESTED" | "ACKNOWLEDGED" | "FAILED";
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
}

export interface V3HiuDataNotifyRequest {
  notification: {
    consentId: string;
    transactionId: string;
    doneAt: string;
    notifier: {
      type: "HIU";
      id: string;
    };
    statusNotification: {
      sessionStatus: "RECEIVED" | "FAILED";
      hipId: string;
      statusResponses: Array<{
        careContextReference: string;
        hiStatus: "OK" | "ERRORED";
        description?: string;
      }>;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE 3: SUBSCRIPTION FLOW
// ─────────────────────────────────────────────────────────────────────────────

export interface V3SubscriptionGetRequestsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface V3SubscriptionInitRequest {
  subscription: {
    purpose: V3ConsentPurpose;
    patient: {
      id: string;
    };
    hiu: {
      id: string;
    };
    hips?: Array<{
      id: string;
      name?: string;
      type?: string;
    }>;
    categories: Array<"LINK" | "DATA">;
    period: {
      from: string;
      to: string;
    };
  };
}

export interface V3SubscriptionOnInitCallback {
  subscriptionRequest?: {
    id: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
}

export interface V3SubscriptionSourceItem {
  hiTypes: string[];
  purpose?: V3ConsentPurpose;
  hip?: {
    id: string;
    name?: string;
  };
  categories?: string[];
  period?: {
    from: string;
    to: string;
  };
}

export interface V3SubscriptionApproveRequest {
  isApplicableForAllHIPs: boolean;
  includedSources: V3SubscriptionSourceItem[];
  purpose: V3ConsentPurpose;
  hip?: Array<{
    id: string;
    name?: string;
  }>;
  categories: string[];
  period: {
    from: string;
    to: string;
  };
  excludedSources?: V3SubscriptionSourceItem[];
}

export interface V3SubscriptionDenyRequest {
  reason: string;
}

export interface V3SubscriptionEditRequest {
  hiuId: string;
  subscriptionEditAndApprovalRequest: {
    isApplicableForAllHIPs: boolean;
    includedSources: Array<{
      hiTypes: string[];
      purpose?: {
        text: string;
        code?: string;
        refUri?: string;
      };
      categories?: string[];
      period?: {
        from: string;
        to: string;
      };
    }>;
    excludedSources?: unknown[];
  };
}

export interface V3SubscriptionNotifyCallback {
  notification: {
    subscriptionRequestId: string;
    status: "GRANTED" | "DENIED";
    reason?: string | null;
    subscription?: {
      id: string;
      patient: {
        id: string;
      };
      hiu: {
        id: string;
        name?: string;
        type?: string;
      };
      sources?: unknown[];
      period?: {
        from: string;
        to: string;
      };
    };
  };
}

export interface V3SubscriptionOnNotifyAckRequest {
  acknowledgement: {
    status: "OK" | "FAILED";
    subscriptionRequestId: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
}

export interface V3SubscriptionEventNotifyCallback {
  event: {
    id: string;
    published: string;
    subscriptionId: string;
    category: "LINK" | "DATA";
    content: {
      patient: {
        id: string;
      };
      hip: {
        id: string;
      };
      contexts: Array<{
        careContexts: Array<{
          patientReference?: string;
          careContextReference: string;
        }>;
        hiType?: string;
      }>;
    };
  };
}

export interface V3SubscriptionCareContextOnNotifyAckRequest {
  acknowledgement: {
    status: "OK" | "FAILED";
    eventId: string;
  };
  response: {
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ABDM ERROR CODES (Section 7.0 Error Codes Listing)
// ─────────────────────────────────────────────────────────────────────────────

export const ABDM_ERROR_CODES = {
  UNABLE_TO_CONNECT_DB: { code: "ABDM-1000", message: "Unable to connect the database" },
  NO_DATA_FOUND: { code: "ABDM-1001", message: "No data found" },
  INTEGRITY_VIOLATION: { code: "ABDM-1002", message: "Integrity violation" },
  EMAIL_GATEWAY_UNAVAILABLE: { code: "ABDM-1003", message: "Email Gateway is unavailable" },
  SMS_GATEWAY_UNAVAILABLE: { code: "ABDM-1004", message: "SMS Gateway is unavailable" },
  INVALID_RECEIVER: { code: "ABDM-1005", message: "Invalid receiver" },
  BAD_REQUEST_BODY: { code: "ABDM-1006", message: "Bad Request, invalid request Body" },
  CONNECTION_TIMEOUT: { code: "ABDM-1007", message: "Connection failed due to timeout" },
  SMS_SERVICE_DISABLED: { code: "ABDM-1008", message: "SMS service currently disabled" },
  EMAIL_SERVICE_DISABLED: { code: "ABDM-1009", message: "Email service currently disabled" },
  VALIDATION_FAILED: { code: "ABDM-1010", message: "Validation failed" },
  PATIENT_NOT_FOUND: { code: "ABDM-1010", message: "Patient not found" },
  GATEWAY_DB_UNAVAILABLE: { code: "ABDM-1011", message: "Gateway database unavailable" },
  NO_RECORDS_FOR_ABHA_ADDRESS: { code: "ABDM-1012", message: "No records found against the ABHA Address" },
  INVALID_ABHA_NUMBER: { code: "ABDM-1013", message: "Invalid ABHA Number" },
  INVALID_MOBILE_EMAIL: { code: "ABDM-1014", message: "Invalid Mobile Email" },
  INVALID_RESPONSE: { code: "ABDM-1015", message: "Invalid Response" },
  INVALID_TIMESTAMP: { code: "ABDM-1016", message: "Invalid TimeStamp" },
  INVALID_TRANSACTION_ID: { code: "ABDM-1017", message: "Invalid TransactionId" },
  SHARE_PROFILE_DB_UNAVAILABLE: { code: "ABDM-1018", message: "Share Profile database unavailable" },
  DEPENDENT_SERVICE_UNAVAILABLE: { code: "ABDM-1019", message: "Dependent Service Unavailable" },
  UNKNOWN_DATABASE: { code: "ABDM-1020", message: "Unknown database" },
  LACK_OF_PRIVILEGES: { code: "ABDM-1021", message: "Lack of required priviledges" },
  TOO_MANY_REQUESTS: { code: "ABDM-1022", message: "Too many requests" },
  INVALID_USER: { code: "ABDM-1023", message: "Invalid User" },
  DEPENDENT_SERVICE_UNAVAILABLE_2: { code: "ABDM-1024", message: "Dependent service unavailable" },
  INVALID_SERVICE_ID: { code: "ABDM-1025", message: "Invalid ServiceId" },
  INVALID_LINK_TOKEN: { code: "ABDM-1026", message: "Invalid Link Token" },
  USER_BLOCKED_24H: { code: "ABDM-1027", message: "You are blocked. Please try again after 24 hours." },
  HIP_UNAVAILABLE: { code: "ABDM-1028", message: "HIP is unavailable" },
  REDIS_UNAVAILABLE: { code: "ABDM-1029", message: "Redis server is unavailable" },
  INVALID_REQUEST_ID: { code: "ABDM-1030", message: "Invalid request ID" },
  INVALID_REQUEST: { code: "ABDM-1031", message: "Invalid request" },
  HIP_MANDATORY_FOR_CARE_CONTEXTS: { code: "ABDM-1031", message: "HIP is mandatory when care contexts are specified" },
  INVALID_HEADER: { code: "ABDM-1032", message: "Invalid header" },
  HIU_UNAVAILABLE: { code: "ABDM-1033", message: "HIU is unavailable" },
  NOTIFICATION_SERVICE_UNAVAILABLE: { code: "ABDM-1034", message: "Notification service unavailable" },
  INVALID_HIP_ID: { code: "ABDM-1035", message: "Invalid HIP ID" },
  OTP_NOT_MATCHED: { code: "ABDM-1035", message: "OTP does not matched" },
  DATA_NOT_MATCHED: { code: "ABDM-1036", message: "Data does not matched" },
  CARE_CONTEXT_COUNT_MISMATCH: { code: "ABDM-1037", message: "Counter and Care context count mismatch" },
  ABHA_ADDRESS_MISMATCH: { code: "ABDM-1038", message: "ABHA address and Link token mismatch" },
  INVALID_CONSENT_REQUEST_ID: { code: "ABDM-1039", message: "Invalid Consent request id" },
  INVALID_HIU_ID: { code: "ABDM-1040", message: "Invalid HIU ID" },
  INVALID_ACKNOWLEDGEMENT: { code: "ABDM-1041", message: "Invalid Acknowledgement" },
  PROVIDER_MANDATORY: { code: "ABDM-1042", message: "Provider Mandatory" },
  ABHA_ADDRESS_NOT_MATCH_KYC: { code: "ABDM-1043", message: "ABHA Address does not match with KYC details." },
  BROADCAST_FAILED: { code: "ABDM-1044", message: "Broadcast Failed" },
  DATABASE_ACCESS_RESTRICTED: { code: "ABDM-1045", message: "Database Access is restricted" },
  INVALID_PURPOSE: { code: "ABDM-1046", message: "Invalid Purpose" },
  PURPOSE_NOT_EXIST: { code: "ABDM-1047", message: "Purpose does not exist" },
  TIMEOUT: { code: "ABDM-1048", message: "Timeout" },
  INVALID_PROFILE_SHARE_INTENT_KEYS: { code: "ABDM-1049", message: "Invalid Profile Share Intent Keys" },
  INVALID_PROFILE_SHARE_METADATA_KEYS: { code: "ABDM-1050", message: "Invalid Profile Share Metadata Keys" },
  INVALID_ABHA_NUMBER_OR_ADDRESS: { code: "ABDM-1051", message: "Invalid ABHA Number or ABHA Address" },
  INVALID_TRANSACTION_OR_RESPONSE_REQ_ID: { code: "ABDM-1052", message: "Invalid TransactionId or response's requestId" },
  DATA_ALREADY_EXISTS: { code: "ABDM-1053", message: "Data already exists" },
  INVALID_SUBSCRIPTION_REQUEST_ID: { code: "ABDM-1054", message: "Invalid Subscription Request Id" },
  CARE_CONTEXT_ALREADY_LINKED: { code: "ABDM-1056", message: "This care context has been already linked" },
  INVALID_CARE_CONTEXTS: { code: "ABDM-1057", message: "Invalid Care Contexts" },
  CONSENT_ARTEFACT_EXPIRED: { code: "ABDM-1061", message: "Consent artefact expired" },
  CONSENT_NOT_GRANTED: { code: "ABDM-1062", message: "Consent Not granted" },
  INVALID_DATE_RANGE: { code: "ABDM-1063", message: "Date Range given is invalid" },
  REQUEST_ID_ALREADY_EXISTS: { code: "ABDM-1064", message: "request with this request id already exists" },
  REQUEST_BODY_MISSING: { code: "ABDM-1064", message: "Request body was missing" },
  INVALID_CONSENT_ARTEFACT_ID: { code: "ABDM-1080", message: "Invalid Consent artefact id" },
  DUPLICATE_HIP_LINK_REQUEST: { code: "ABDM-1090", message: "Duplicate HIP link request" },
  EXPIRED_OR_INVALID_CONSENT_ARTEFACT: { code: "ABDM-1092", message: "Invalid or already expired consent artefact id" },
  DUPLICATE_LINK_TOKEN_REQUEST: { code: "ABDM-1092", message: "Duplicate Link token request" },
  DUPLICATE_DISCOVERY_REQUEST: { code: "ABDM-1103", message: "Duplicate Discovery request" },
  HIP_NOT_AVAILABLE: { code: "ABDM-1401", message: "HIP is not available" },
  ACK_NOT_RECEIVED_FROM_HIP: { code: "ABDM-1402", message: "Acknowledgement is not received from HIP" },
  UNKNOWN_EXCEPTION: { code: "ABDM-9999", message: "Unknown exception" },
} as const;

export const VALID_PURPOSE_CODES = [
  "CAREMGT",
  "BTG",
  "PUBHLTH",
  "HPAYMT",
  "DSRCH",
  "PATRQT",
] as const;

export const VALID_PURPOSE_TEXTS = [
  "Care Management",
  "Break the Glass",
  "Public Health",
  "Healthcare Payment",
  "Disease Specific Healthcare Research",
  "Self-Requested",
  "Self Requested",
] as const;

export const VALID_ACCESS_MODES = ["VIEW", "STORE", "QUERY", "STREAM"] as const;

