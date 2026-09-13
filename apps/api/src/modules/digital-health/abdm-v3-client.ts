import { randomUUID } from "node:crypto";
import { getAbdmConfig, scrubAbdmSecrets } from "./abdm-config";
import {
  encryptWithAbdmPublicKey,
  getAbdmPublicKey,
  encryptWithHprPublicKey,
  getHprPublicKey,
} from "./abdm-v3-crypto";
import type { AbdmSessionToken } from "./abdm-types";
import type {
  HprAadhaarGenerateOtpRequest,
  HprAadhaarGenerateOtpResponse,
  HprAadhaarOtpConfirmRequest,
  HprAadhaarOtpInitRequest,
  HprAadhaarOtpInitResponse,
  HprAadhaarVerifyOtpRequest,
  HprAadhaarVerifyOtpResponse,
  HprAccountInformationResponse,
  HprChangePasswordByPasswordRequest,
  HprChangePasswordByPasswordResponse,
  HprCheckHpIdAccountExistRequest,
  HprCheckHpIdAccountExistResponse,
  HprCreateHprIdRequest,
  HprCreateHprIdResponse,
  HprDemographicAuthViaMobileRequest,
  HprDemographicAuthViaMobileResponse,
  HprFacilitySearchRequest,
  HprFacilitySearchResponse,
  HprFetchDocumentsListRequest,
  HprFetchDocumentsListResponse,
  HprFetchProfessionalInfoRequest,
  HprFetchProfessionalInfoResponse,
  HprForgotIdAadhaarGenerateOtpRequest,
  HprForgotIdAadhaarGenerateOtpResponse,
  HprForgotIdAadhaarVerifyOtpRequest,
  HprForgotIdAadhaarVerifyOtpResponse,
  HprForgotIdMobileGenerateOtpRequest,
  HprForgotIdMobileGenerateOtpResponse,
  HprForgotIdMobileVerifyOtpRequest,
  HprForgotIdMobileVerifyOtpResponse,
  HprGenerateEmailOtpRequest,
  HprGenerateEmailOtpResponse,
  HprGenerateMobileOtpRequest,
  HprGenerateUpdateMobileOtpRequest,
  HprGenerateUpdateMobileOtpResponse,
  HprHpidSuggestionRequest,
  HprIdCardResponse,
  HprLogoutResponse,
  HprMobileOtpSendRequest,
  HprMobileOtpSendResponse,
  HprMobileOtpVerifyRequest,
  HprMobileOtpVerifyResponse,
  HprPasswordLoginRequest,
  HprRecoverPasswordByAadhaarRequest,
  HprRecoverPasswordByAadhaarResponse,
  HprRecoverPasswordConfirmByAadhaarRequest,
  HprRecoverPasswordConfirmByAadhaarResponse,
  HprRecoverPasswordSendMobileOtpRequest,
  HprRecoverPasswordSendMobileOtpResponse,
  HprRecoverPasswordVerifyMobileOtpRequest,
  HprRecoverPasswordVerifyMobileOtpResponse,
  HprRegisterProfessionalRequest,
  HprRegisterProfessionalResponse,
  HprResendEmailOtpRequest,
  HprResendEmailOtpResponse,
  HprResendUpdateMobileOtpRequest,
  HprResendUpdateMobileOtpResponse,
  HprResetPasswordRequest,
  HprResetPasswordResponse,
  HprTokenResponse,
  HprUpdateProfessionalRequest,
  HprUploadDocumentRequest,
  HprUploadDocumentResponse,
  HprUserAuthorizedTokenRequest,
  HprVerifyEmailOtpRequest,
  HprVerifyEmailOtpResponse,
  HprVerifyMobileOtpRequest,
  HprVerifyUpdateMobileOtpRequest,
  HprVerifyUpdateMobileOtpResponse,
  HprSearchRecord,
  HprSystemOfMedicineItem,
  HprMedicalCouncilItem,
  HprLanguageItem,
  HprUniversityItem,
  HprCollegeItem,
  HprCourseItem,
  HprCountryItem,
  HprStateItem,
  HprDistrictItem,
  HprSubDistrictItem,
  HprAffiliatedBoardItem,
  HprNurseCouncilItem,
  HprMinistryItem,
  HprCategoryMasterItem,
  HprSubCategoryMasterItem,
  HfrBasicFacilityInfoRequest,
  HfrBasicFacilityInfoResponse,
  HfrAdditionalInfoRequest,
  HfrAdditionalInfoResponse,
  HfrDetailedInfoRequest,
  HfrDetailedInfoResponse,
  HfrSubmitFacilityRequest,
  HfrSubmitFacilityResponse,
  HfrMultipleHrpRequest,
  HfrMultipleHrpResponseItem,
  HfrSendOtpToContactRequest,
  HfrSendOtpToContactResponse,
  HfrValidateOtpRequest,
  HfrValidateOtpResponse,
  HfrFacilityContactDetailsRequest,
  HfrFacilityContactDetailsResponse,
  HfrUwinFetchDetailsRequest,
  HfrUwinFetchDetailsResponse,
  HfrUwinValidateOtpRequest,
  HfrUwinValidateOtpResponse,
  HfrDeduplicateFacilityRequest,
  HfrDeduplicateFacilityItem,
  HfrMasterTypesResponse,
  HfrMasterDataResponse,
  HfrLgdStateItem,
  HfrLgdDistrictItem,
  HfrLgdSubDistrictItem,
  HfrFacilityTypeResponse,
  HfrOwnerSubtypesResponse,
  HfrSpecialitiesResponse,
  HfrFacilitySubtypeResponse,
} from "./abdm-hpr-types";
import type {
  BridgeServiceDetails,
  BridgeServicesListResponse,
  BridgeUrlUpdateRequest,
  MultipleHrpAddUpdateServicesRequest,
  OAuthCertsResponse,
  OpenIdConfigurationResponse,
  V3CareContextLinkRequest,
  V3CareContextNotifyRequest,
  V3ConsentOnNotifyRequest,
  V3DataPushPayload,
  V3HealthInfoNotifyPayload,
  V3HealthInfoOnRequestPayload,
  V3HiuConsentFetchRequest,
  V3HiuConsentInitRequest,
  V3HiuConsentOnNotifyAckRequest,
  V3HiuConsentStatusRequest,
  V3HiuDataNotifyRequest,
  V3HiuDataRequest,
  V3LinkTokenGenerateRequest,
  V3OnConfirmRequest,
  V3OnDiscoverRequest,
  V3OnInitRequest,
  V3PatientLinksResponse,
  V3ProfileOnShareRequest,
  V3SmsNotifyRequest,
  V3SubscriptionApproveRequest,
  V3SubscriptionCareContextOnNotifyAckRequest,
  V3SubscriptionDenyRequest,
  V3SubscriptionEditRequest,
  V3SubscriptionGetRequestsParams,
  V3SubscriptionInitRequest,
  V3SubscriptionOnNotifyAckRequest,
} from "./abdm-v3-types";

export class AbdmV3ClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly technicalDetail?: string,
  ) {
    super(scrubAbdmSecrets(message));
    this.name = "AbdmV3ClientError";
  }
}

export class AbdmV3HttpClient {
  private cachedToken: AbdmSessionToken | null = null;
  private inFlightTokenPromise: Promise<string> | null = null;
  private customFetch: typeof fetch = fetch;

  constructor(customFetch?: typeof fetch) {
    if (customFetch) {
      this.customFetch = customFetch;
    }
  }

  clearTokenCache(): void {
    this.cachedToken = null;
    this.inFlightTokenPromise = null;
  }

  getGatewayBaseUrl(): string {
    const config = getAbdmConfig();
    return config.environment === "production"
      ? "https://apis.abdm.gov.in"
      : "https://dev.abdm.gov.in";
  }

  getCoreBaseUrl(): string {
    const config = getAbdmConfig();
    return config.environment === "production"
      ? "https://abha.abdm.gov.in/api/abha"
      : "https://abhasbx.abdm.gov.in/abha/api";
  }

  getPhrBaseUrl(): string {
    const config = getAbdmConfig();
    return config.environment === "production"
      ? "https://phr.abdm.gov.in/api/phr/web/v3"
      : "https://abhasbx.abdm.gov.in/abha/api/v3/phr/web";
  }

  getSessionUrl(): string {
    const config = getAbdmConfig();
    return config.environment === "production"
      ? "https://apis.abdm.gov.in/api/hiecm/gateway/v3/sessions"
      : "https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions";
  }

  getHspBaseUrl(): string {
    const config = getAbdmConfig();
    return config.environment === "production"
      ? "https://apihsp.abdm.gov.in"
      : "https://apihspsbx.abdm.gov.in";
  }


  getCmId(): string {
    const config = getAbdmConfig();
    return config.environment === "production" ? "abdm" : "sbx";
  }

  /**
   * Obtains a valid V3 Gateway session Bearer token (/api/hiecm/gateway/v3/sessions).
   */
  async getGatewayToken(): Promise<string> {
    const config = getAbdmConfig();
    const clientId = config.clientId;
    const clientSecret = config.clientSecret;

    if (!clientId || !clientSecret) {
      throw new AbdmV3ClientError(
        "ABDM_CREDENTIALS_MISSING",
        "ABDM Client ID and Secret are not configured on the server.",
        500,
      );
    }

    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt - now > 60_000) {
      return this.cachedToken.accessToken;
    }

    if (this.inFlightTokenPromise) {
      return this.inFlightTokenPromise;
    }

    this.inFlightTokenPromise = this.requestNewToken(clientId, clientSecret).finally(() => {
      this.inFlightTokenPromise = null;
    });

    return this.inFlightTokenPromise;
  }

  private async requestNewToken(clientId: string, clientSecret: string): Promise<string> {
    const sessionUrl = this.getSessionUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await this.customFetch(sessionUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "REQUEST-ID": randomUUID(),
          TIMESTAMP: new Date().toISOString(),
          "X-CM-ID": this.getCmId(),
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
          grantType: "client_credentials",
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new AbdmV3ClientError(
          "ABDM_SESSION_ERROR",
          `Failed to authenticate with ABDM V3 Session Gateway (HTTP ${response.status}).`,
          response.status,
          errBody,
        );
      }

      const data = (await response.json()) as {
        accessToken: string;
        expiresIn?: number;
        tokenType?: string;
      };

      if (!data?.accessToken) {
        throw new AbdmV3ClientError(
          "ABDM_TOKEN_PARSE_ERROR",
          "ABDM V3 Gateway did not return a valid session token.",
          502,
        );
      }

      const expiresInSeconds = data.expiresIn && data.expiresIn > 0 ? data.expiresIn : 1200;
      this.cachedToken = {
        accessToken: data.accessToken,
        expiresIn: expiresInSeconds,
        tokenType: data.tokenType || "Bearer",
        expiresAt: Date.now() + expiresInSeconds * 1000,
      };

      return this.cachedToken.accessToken;
    } catch (err: unknown) {
      if (err instanceof AbdmV3ClientError) throw err;
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new AbdmV3ClientError(
        "ABDM_CONNECTION_FAILED",
        "Could not connect to ABDM V3 Session Gateway.",
        502,
        rawMsg,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Helper to encrypt plain text data using the ABDM V3 public key.
   */
  async encrypt(plainText: string): Promise<string> {
    const keyPem = await getAbdmPublicKey(() => this.getGatewayToken());
    return encryptWithAbdmPublicKey(keyPem, plainText);
  }

  /**
   * Execute an authenticated request against ABDM V3 Core or PHR API.
   */
  async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      headers?: Record<string, string>;
      usePhrBase?: boolean;
    } = {},
  ): Promise<T> {
    const token = await this.getGatewayToken();
    const baseUrl = options.usePhrBase ? this.getPhrBaseUrl() : this.getCoreBaseUrl();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "REQUEST-ID": randomUUID(),
      TIMESTAMP: new Date().toISOString(),
      "X-CM-ID": this.getCmId(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const fetchOptions: RequestInit = {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        signal: controller.signal,
      };

      if (options.body !== undefined) {
        fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      }

      const response = await this.customFetch(url, fetchOptions);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        let parsedCode = `HTTP_${response.status}`;
        let parsedMessage = `ABDM V3 request failed (HTTP ${response.status})`;

        try {
          const errJson = JSON.parse(errText) as {
            error?: { code?: string; message?: string };
            message?: string;
            code?: string;
          };
          if (errJson.error?.message) {
            parsedMessage = errJson.error.message;
            parsedCode = errJson.error.code ?? parsedCode;
          } else if (errJson.message) {
            parsedMessage = errJson.message;
            parsedCode = errJson.code ?? parsedCode;
          }
        } catch {
          // not json
        }

        throw new AbdmV3ClientError(parsedCode, parsedMessage, response.status, errText);
      }

      // If 204 or empty response body
      const text = await response.text();
      if (!text || !text.trim()) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (err: unknown) {
      if (err instanceof AbdmV3ClientError) throw err;
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new AbdmV3ClientError(
        "ABDM_V3_REQUEST_FAILED",
        "Failed to complete ABDM V3 operation.",
        500,
        rawMsg,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Execute an authenticated request against the ABDM V3 Gateway (HIE-CM).
   */
  async gatewayRequest<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      headers?: Record<string, string>;
      attachHipId?: boolean;
    } = {},
  ): Promise<T> {
    const token = await this.getGatewayToken();
    const config = getAbdmConfig();
    const baseUrl = this.getGatewayBaseUrl();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "REQUEST-ID": randomUUID(),
      TIMESTAMP: new Date().toISOString(),
      "X-CM-ID": this.getCmId(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    };

    if (options.attachHipId !== false && config.facilityId) {
      headers["X-HIP-ID"] = config.facilityId;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const fetchOptions: RequestInit = {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        signal: controller.signal,
      };

      if (options.body !== undefined) {
        fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      }

      const response = await this.customFetch(url, fetchOptions);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        let parsedCode = `HTTP_${response.status}`;
        let parsedMessage = `ABDM Gateway request failed (HTTP ${response.status})`;

        try {
          const errJson = JSON.parse(errText) as {
            error?: { code?: string; message?: string };
            message?: string;
            code?: string;
          };
          if (errJson.error?.message) {
            parsedMessage = errJson.error.message;
            parsedCode = errJson.error.code ?? parsedCode;
          } else if (errJson.message) {
            parsedMessage = errJson.message;
            parsedCode = errJson.code ?? parsedCode;
          }
        } catch {
          // not json
        }

        throw new AbdmV3ClientError(parsedCode, parsedMessage, response.status, errText);
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (err: unknown) {
      if (err instanceof AbdmV3ClientError) throw err;
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new AbdmV3ClientError(
        "ABDM_GATEWAY_REQUEST_FAILED",
        "Failed to complete ABDM Gateway operation.",
        500,
        rawMsg,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 2: GATEWAY BRIDGE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async updateBridgeUrl(url: string): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/gateway/v3/bridge/url", {
      method: "PATCH",
      body: { url } as BridgeUrlUpdateRequest,
    });
  }

  async getBridgeByServiceId(serviceId: string): Promise<BridgeServiceDetails> {
    return this.gatewayRequest(`/api/hiecm/gateway/v3/bridge-service/serviceId/${encodeURIComponent(serviceId)}`, {
      method: "GET",
    });
  }

  async getBridgeServices(): Promise<BridgeServicesListResponse> {
    return this.gatewayRequest("/api/hiecm/gateway/v3/bridge-services", {
      method: "GET",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 2: HIP-INITIATED LINKING
  // ─────────────────────────────────────────────────────────────────────────

  async generateLinkToken(body: V3LinkTokenGenerateRequest): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/v3/token/generate-token", {
      method: "POST",
      body,
    });
  }

  async linkCareContext(
    body: V3CareContextLinkRequest,
    linkToken: string,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/hip/v3/link/carecontext", {
      method: "POST",
      headers: {
        "X-LINK-TOKEN": linkToken,
      },
      body,
    });
  }

  async getPatientLinks(limit = 100, xAuthToken?: string): Promise<V3PatientLinksResponse> {
    const headers: Record<string, string> = {};
    if (xAuthToken) {
      headers["X-AUTH-TOKEN"] = xAuthToken;
    }
    return this.gatewayRequest(`/api/hiecm/hip/v3/link/patient/links?limit=${limit}`, {
      method: "GET",
      headers,
    });
  }

  async notifyCareContext(body: V3CareContextNotifyRequest): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/hip/v3/link/context/notify", {
      method: "POST",
      body,
    });
  }

  async sendSmsNotification(body: V3SmsNotifyRequest): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/hip/v3/link/patient/links/sms/notify2", {
      method: "POST",
      body,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 2: USER-INITIATED LINKING (RESPONSES)
  // ─────────────────────────────────────────────────────────────────────────

  async respondOnDiscover(body: V3OnDiscoverRequest): Promise<{ status?: string }> {
    return this.gatewayRequest(
      "/api/hiecm/user-initiated-linking/v3/patient/care-context/on-discover",
      {
        method: "POST",
        body,
      },
    );
  }

  async respondOnInit(body: V3OnInitRequest): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/user-initiated-linking/v3/link/care-context/on-init", {
      method: "POST",
      body,
    });
  }

  async respondOnConfirm(body: V3OnConfirmRequest): Promise<{ status?: string }> {
    return this.gatewayRequest(
      "/api/hiecm/user-initiated-linking/v3/link/care-context/on-confirm",
      {
        method: "POST",
        body,
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 2: CONSENT & DATA FLOW (RESPONSES & PUSH)
  // ─────────────────────────────────────────────────────────────────────────

  async respondConsentOnNotify(body: V3ConsentOnNotifyRequest): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/consent/v3/request/hip/on-notify", {
      method: "POST",
      body,
    });
  }

  async respondHealthInfoOnRequest(body: V3HealthInfoOnRequestPayload): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/data-flow/v3/health-information/hip/on-request", {
      method: "POST",
      body,
    });
  }

  async pushHealthData(dataPushUrl: string, body: V3DataPushPayload): Promise<{ status?: string }> {
    const token = await this.getGatewayToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await this.customFetch(dataPushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "REQUEST-ID": randomUUID(),
          TIMESTAMP: new Date().toISOString(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new AbdmV3ClientError(
          `PUSH_FAILED_${response.status}`,
          `Failed to push health data to HIU URL (HTTP ${response.status})`,
          response.status,
          errText,
        );
      }

      const text = await response.text();
      return text && text.trim() ? JSON.parse(text) : { status: "SUCCESS" };
    } catch (err: unknown) {
      if (err instanceof AbdmV3ClientError) throw err;
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new AbdmV3ClientError("DATA_PUSH_FAILED", "Failed to push encrypted health data to HIU.", 500, rawMsg);
    } finally {
      clearTimeout(timeout);
    }
  }

  async notifyHealthDataTransfer(body: V3HealthInfoNotifyPayload): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/data-flow/v3/health-information/notify", {
      method: "POST",
      body,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 2: SCAN AND PROFILE SHARE
  // ─────────────────────────────────────────────────────────────────────────

  async respondProfileOnShare(body: V3ProfileOnShareRequest): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/patient-share/v3/on-share", {
      method: "POST",
      body,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: GATEWAY FLOWS (OPENID, CERTS, HRP LINKAGE)
  // ─────────────────────────────────────────────────────────────────────────

  async getOpenIdConfiguration(): Promise<OpenIdConfigurationResponse> {
    return this.gatewayRequest("/api/hiecm/gateway/v3/.well-known/openid-configuration", {
      method: "GET",
    });
  }

  async getCerts(): Promise<OAuthCertsResponse> {
    return this.gatewayRequest("/api/hiecm/gateway/v3/certs", {
      method: "GET",
    });
  }

  async registerFacilitySoftwareLinkage(
    body: MultipleHrpAddUpdateServicesRequest,
  ): Promise<{ status?: string; message?: string }> {
    const token = await this.getGatewayToken();
    const hspBase = this.getHspBaseUrl();
    const url = `${hspBase}/v4/int/v1/bridges/MutipleHRPAddUpdateServices`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await this.customFetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "REQUEST-ID": randomUUID(),
          TIMESTAMP: new Date().toISOString(),
          "X-CM-ID": this.getCmId(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new AbdmV3ClientError(
          `HRP_LINKAGE_FAILED_${response.status}`,
          `Failed to link HRP/bridge services with facility (HTTP ${response.status})`,
          response.status,
          errText,
        );
      }

      const text = await response.text();
      return text && text.trim() ? JSON.parse(text) : { status: "SUCCESS" };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: HIU CONSENT FLOW
  // ─────────────────────────────────────────────────────────────────────────

  async initConsentRequest(body: V3HiuConsentInitRequest): Promise<{ status?: string; message?: string }> {
    return this.gatewayRequest("/api/hiecm/consent/v3/request/init", {
      method: "POST",
      body,
    });
  }

  async respondConsentOnNotifyHiu(
    body: V3HiuConsentOnNotifyAckRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/consent/v3/request/hiu/on-notify", {
      method: "POST",
      body,
    });
  }

  async getConsentRequestStatus(
    body: V3HiuConsentStatusRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/consent/v3/request/status", {
      method: "POST",
      body,
    });
  }

  async fetchConsentArtifact(
    body: V3HiuConsentFetchRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/consent/v3/fetch", {
      method: "POST",
      body,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: HIU DATA FLOW
  // ─────────────────────────────────────────────────────────────────────────

  async requestHealthInformation(
    body: V3HiuDataRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/data-flow/v3/health-information/request", {
      method: "POST",
      body,
    });
  }

  async notifyHiuDataTransfer(
    body: V3HiuDataNotifyRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/data-flow/v3/health-information/notify", {
      method: "POST",
      body,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MILESTONE 3: SUBSCRIPTION FLOW
  // ─────────────────────────────────────────────────────────────────────────

  async getSubscriptionRequests(
    params: V3SubscriptionGetRequestsParams = {},
    xAuthToken?: string,
  ): Promise<unknown> {
    const status = params.status ?? "ALL";
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;
    const headers: Record<string, string> = {};
    if (xAuthToken) {
      headers["X-AUTHTOKEN"] = xAuthToken;
    }

    return this.gatewayRequest(
      `/api/hiecm/subscription-requests/v3/requests?status=${encodeURIComponent(status)}&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers,
      },
    );
  }

  async initSubscriptionRequest(
    body: V3SubscriptionInitRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/subscription-requests/v3/init", {
      method: "POST",
      body,
    });
  }

  async approveSubscriptionRequest(
    subscriptionRequestId: string,
    body: V3SubscriptionApproveRequest,
    xAuthToken?: string,
  ): Promise<{ subscriptionId?: string; message?: string }> {
    const headers: Record<string, string> = {};
    if (xAuthToken) {
      headers["X-AUTHTOKEN"] = xAuthToken;
    }
    return this.gatewayRequest(
      `/api/hiecm/subscription-requests/v3/${encodeURIComponent(subscriptionRequestId)}/approve`,
      {
        method: "POST",
        headers,
        body,
      },
    );
  }

  async respondSubscriptionOnNotifyHiu(
    body: V3SubscriptionOnNotifyAckRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest("/api/hiecm/subscription-requests/v3/hiu/on-notify", {
      method: "POST",
      body,
    });
  }

  async denySubscriptionRequest(
    subscriptionId: string,
    body: V3SubscriptionDenyRequest,
    xAuthToken?: string,
  ): Promise<{ message?: string }> {
    const headers: Record<string, string> = {};
    if (xAuthToken) {
      headers["X-AUTHTOKEN"] = xAuthToken;
    }
    return this.gatewayRequest(
      `/api/hiecm/subscriptionrequests/v3/${encodeURIComponent(subscriptionId)}/deny`,
      {
        method: "POST",
        headers,
        body,
      },
    );
  }

  async editSubscriptionRequest(
    subscriptionId: string,
    body: V3SubscriptionEditRequest,
    xAuthToken?: string,
  ): Promise<{ subscriptionId?: string; message?: string }> {
    const headers: Record<string, string> = {};
    if (xAuthToken) {
      headers["X-AUTH-TOKEN"] = xAuthToken;
    }
    return this.gatewayRequest(
      `/api/hiecm/subscription-requests/v3/patients/${encodeURIComponent(subscriptionId)}`,
      {
        method: "PUT",
        headers,
        body,
      },
    );
  }

  async respondSubscriptionCareContextOnNotify(
    body: V3SubscriptionCareContextOnNotifyAckRequest,
  ): Promise<{ status?: string }> {
    return this.gatewayRequest(
      "/api/hiecm/subscription-requests/v3/hiu/care-context/on-notify",
      {
        method: "POST",
        body,
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HEALTHCARE PROFESSIONALS REGISTRY (HPR) CLIENT METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Helper to encrypt plain text data using the ABDM HPR public key (RSA/ECB/PKCS1Padding).
   */
  async encryptHpr(plainText: string): Promise<string> {
    const keyPem = await getHprPublicKey(() => this.getGatewayToken());
    return encryptWithHprPublicKey(keyPem, plainText);
  }

  /**
   * Execute an authenticated request against the ABDM HPR (HSP) gateway.
   */
  async hspRequest<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      headers?: Record<string, string>;
      hprToken?: string;
    } = {},
  ): Promise<T> {
    const token = await this.getGatewayToken();
    const baseUrl = this.getHspBaseUrl();
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "REQUEST-ID": randomUUID(),
      TIMESTAMP: new Date().toISOString(),
      "X-CM-ID": this.getCmId(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    };

    if (options.hprToken) {
      headers["hpr_token"] = options.hprToken;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const fetchOptions: RequestInit = {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        signal: controller.signal,
      };

      if (options.body !== undefined) {
        fetchOptions.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      }

      const response = await this.customFetch(url, fetchOptions);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        let parsedCode = `HTTP_${response.status}`;
        let parsedMessage = `ABDM HPR request failed (HTTP ${response.status})`;

        try {
          const errJson = JSON.parse(errText) as {
            error?: { code?: string; message?: string } | string;
            message?: string;
            code?: string;
            details?: unknown;
          };
          if (typeof errJson.error === "object" && errJson.error?.message) {
            parsedMessage = errJson.error.message;
            parsedCode = errJson.error.code ?? parsedCode;
          } else if (typeof errJson.error === "string") {
            parsedMessage = errJson.error;
          } else if (errJson.message) {
            parsedMessage = errJson.message;
            parsedCode = errJson.code ?? parsedCode;
          }
        } catch {
          // not json
        }

        throw new AbdmV3ClientError(parsedCode, parsedMessage, response.status, errText);
      }

      const text = await response.text();
      if (!text || !text.trim()) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (err: unknown) {
      if (err instanceof AbdmV3ClientError) throw err;
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new AbdmV3ClientError(
        "ABDM_HPR_REQUEST_FAILED",
        "Failed to complete ABDM HPR operation.",
        500,
        rawMsg,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── HPR Authentication ───

  async loginHprPassword(body: HprPasswordLoginRequest): Promise<HprTokenResponse> {
    return this.hspRequest<HprTokenResponse>("/v4/int/api/v1/auth/authPassword", {
      method: "POST",
      body: {
        idType: body.idType || "hpr_id",
        domainName: body.domainName || "@hpr.abdm",
        hprId: body.hprId,
        password: body.password,
      },
    });
  }

  async loginHprMobileSendOtp(body: HprMobileOtpSendRequest): Promise<HprMobileOtpSendResponse> {
    return this.hspRequest<HprMobileOtpSendResponse>("/v4/int/api/v2/auth/loginViaMobileSendOTP", {
      method: "POST",
      body,
    });
  }

  async loginHprMobileVerifyOtp(body: HprMobileOtpVerifyRequest): Promise<HprMobileOtpVerifyResponse> {
    return this.hspRequest<HprMobileOtpVerifyResponse>("/v4/int/api/v2/auth/loginViaMobileSendOTP", {
      method: "POST",
      body,
    });
  }

  async loginHprUserAuthorizedToken(body: HprUserAuthorizedTokenRequest): Promise<HprTokenResponse> {
    return this.hspRequest<HprTokenResponse>("/v4/int/api/v2/auth/login/userAuthorizedToken", {
      method: "POST",
      body,
    });
  }

  async loginHprAadhaarInit(body: HprAadhaarOtpInitRequest): Promise<HprAadhaarOtpInitResponse> {
    return this.hspRequest<HprAadhaarOtpInitResponse>("/v4/int/api/v1/auth/init", {
      method: "POST",
      body: {
        idType: body.idType || "hpr_id",
        domainName: body.domainName || "@hpr.abdm",
        authMethod: body.authMethod || "AADHAAR OTP",
        hprId: body.hprId,
      },
    });
  }

  async loginHprAadhaarConfirm(body: HprAadhaarOtpConfirmRequest): Promise<HprTokenResponse> {
    return this.hspRequest<HprTokenResponse>("/v4/int/api/v1/auth/confirmWithAadhaarOtp", {
      method: "POST",
      body,
    });
  }

  // ─── HPR Registration ───

  async generateHprAadhaarOtp(body: HprAadhaarGenerateOtpRequest): Promise<HprAadhaarGenerateOtpResponse> {
    return this.hspRequest<HprAadhaarGenerateOtpResponse>("/v4/int/v2/registration/aadhaar/generateOtp", {
      method: "POST",
      body,
    });
  }

  async verifyHprAadhaarOtp(body: HprAadhaarVerifyOtpRequest): Promise<HprAadhaarVerifyOtpResponse> {
    return this.hspRequest<HprAadhaarVerifyOtpResponse>("/v4/int/v2/registration/aadhaar/verifyOTP", {
      method: "POST",
      body: {
        domainName: body.domainName || "@hpr.abdm",
        idType: body.idType || "hpr_id",
        otp: body.otp,
        restrictions: body.restrictions || "",
        txnId: body.txnId,
      },
    });
  }

  async checkHpIdAccountExist(body: HprCheckHpIdAccountExistRequest): Promise<HprCheckHpIdAccountExistResponse> {
    return this.hspRequest<HprCheckHpIdAccountExistResponse>(
      "/v4/int/v1/registration/aadhaar/checkHpIdAccountExist",
      {
        method: "POST",
        body,
      },
    );
  }

  async demographicAuthViaMobile(
    body: HprDemographicAuthViaMobileRequest,
  ): Promise<HprDemographicAuthViaMobileResponse> {
    return this.hspRequest<HprDemographicAuthViaMobileResponse>(
      "/v4/int/v2/registration/aadhaar/demographicAuthViaMobile",
      {
        method: "POST",
        body,
      },
    );
  }

  async generateHprMobileOtp(body: HprGenerateMobileOtpRequest): Promise<HprAadhaarGenerateOtpResponse> {
    return this.hspRequest<HprAadhaarGenerateOtpResponse>("/v4/int/v1/registration/aadhaar/generateMobileOTP", {
      method: "POST",
      body,
    });
  }

  async verifyHprMobileOtp(body: HprVerifyMobileOtpRequest): Promise<HprAadhaarVerifyOtpResponse> {
    return this.hspRequest<HprAadhaarVerifyOtpResponse>("/v4/int/v1/registration/aadhaar/verifyMobileOTP", {
      method: "POST",
      body,
    });
  }

  async getHprIdSuggestions(body: HprHpidSuggestionRequest): Promise<string[]> {
    return this.hspRequest<string[]>("/v4/int/v1/registration/aadhaar/hpid/suggestion", {
      method: "POST",
      body,
    });
  }

  async createHprIdWithPreVerified(body: HprCreateHprIdRequest): Promise<HprCreateHprIdResponse> {
    return this.hspRequest<HprCreateHprIdResponse>(
      "/v4/int/v2/registration/aadhaar/createHprIdWithPreVerified",
      {
        method: "POST",
        body: {
          ...body,
          idType: body.idType || "hpr_id",
          domainName: body.domainName || "@hpr.abdm",
          sourceType: body.sourceType || "AADHAAR",
        },
      },
    );
  }

  // ─── HFR Facility Search ───

  async searchFacility(body: HprFacilitySearchRequest): Promise<HprFacilitySearchResponse> {
    return this.hspRequest<HprFacilitySearchResponse>(
      "/v4/int/FacilityManagement/v1.5/facility/search",
      {
        method: "POST",
        body,
      },
    );
  }

  // ─── Professional Profile Registration & Updates ───

  async registerProfessional(body: HprRegisterProfessionalRequest): Promise<HprRegisterProfessionalResponse> {
    return this.hspRequest<HprRegisterProfessionalResponse>(
      "/v4/int/apis/v1/doctors/register-professional-new",
      {
        method: "POST",
        body,
        hprToken: body.hprToken,
      },
    );
  }

  async fetchProfessionalInfo(body: HprFetchProfessionalInfoRequest): Promise<HprFetchProfessionalInfoResponse> {
    return this.hspRequest<HprFetchProfessionalInfoResponse>(
      "/v4/int/apis/v1/doctors/fetch-professional-info",
      {
        method: "POST",
        body,
      },
    );
  }

  async updateProfessional(body: HprUpdateProfessionalRequest): Promise<HprRegisterProfessionalResponse> {
    return this.hspRequest<HprRegisterProfessionalResponse>(
      "/v4/int/apis/v1/doctors/update-professional-new",
      {
        method: "POST",
        body,
        hprToken: body.hprToken,
      },
    );
  }

  // ─── Document Management ───

  async fetchDocumentsList(body: HprFetchDocumentsListRequest): Promise<HprFetchDocumentsListResponse> {
    return this.hspRequest<HprFetchDocumentsListResponse>(
      "/v4/int/apis/v1/doctors/fetch-documents-list",
      {
        method: "POST",
        body,
      },
    );
  }

  async uploadDocuments(body: HprUploadDocumentRequest): Promise<HprUploadDocumentResponse> {
    return this.hspRequest<HprUploadDocumentResponse>(
      "/v4/int/apis/v1/uploads/upload-document",
      {
        method: "POST",
        body,
        hprToken: body.hpr_token,
      },
    );
  }

  // ─── Email Verification ───

  async generateVerificationEmail(body: HprGenerateEmailOtpRequest): Promise<HprGenerateEmailOtpResponse> {
    return this.hspRequest<HprGenerateEmailOtpResponse>(
      "/v4/int/apis/v1/doctors/generate-verification-email",
      {
        method: "POST",
        body,
        hprToken: body.hpr_token,
      },
    );
  }

  async resendVerificationEmail(body: HprResendEmailOtpRequest): Promise<HprResendEmailOtpResponse> {
    return this.hspRequest<HprResendEmailOtpResponse>(
      "/v4/int/apis/v1/doctors/resent-verify-email",
      {
        method: "POST",
        body,
        hprToken: body.hpr_token,
      },
    );
  }

  async verifyEmailOtp(body: HprVerifyEmailOtpRequest): Promise<HprVerifyEmailOtpResponse> {
    return this.hspRequest<HprVerifyEmailOtpResponse>(
      "/v4/int/apis/v1/doctors/verify-email-otp",
      {
        method: "POST",
        body,
        hprToken: body.hpr_token,
      },
    );
  }

  // ─── Update Mobile via API ───

  async generateHprUpdateMobileOtp(body: HprGenerateUpdateMobileOtpRequest): Promise<HprGenerateUpdateMobileOtpResponse> {
    return this.hspRequest<HprGenerateUpdateMobileOtpResponse>(
      "/v4/int/apis/v1/doctors/generate-mobile-otp",
      {
        method: "POST",
        body,
        hprToken: body.hpr_token,
      },
    );
  }

  async regenerateHprUpdateMobileOtp(body: HprResendUpdateMobileOtpRequest): Promise<HprResendUpdateMobileOtpResponse> {
    return this.hspRequest<HprResendUpdateMobileOtpResponse>(
      "/v4/int/apis/v1/doctors/regenerate-mobile-otp",
      {
        method: "POST",
        body,
        hprToken: body.hpr_token,
      },
    );
  }

  async verifyHprUpdateMobileOtp(body: HprVerifyUpdateMobileOtpRequest): Promise<HprVerifyUpdateMobileOtpResponse> {
    return this.hspRequest<HprVerifyUpdateMobileOtpResponse>(
      "/v4/int/apis/v1/doctors/verify-mobile-otp",
      {
        method: "POST",
        body,
        hprToken: body.hpr_token,
      },
    );
  }

  // ─── Logout, ID Card & Account Information ───

  async logoutHpr(token: string): Promise<HprLogoutResponse> {
    return this.hspRequest<HprLogoutResponse>("/v4/int/v4/auth/logout", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getHprIdCard(token: string): Promise<HprIdCardResponse> {
    return this.hspRequest<HprIdCardResponse>("/v4/int/v1/account/getIdCard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getHprAccountInformation(token: string): Promise<HprAccountInformationResponse> {
    return this.hspRequest<HprAccountInformationResponse>("/v4/int/v1/account/information", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // ─── Password Management & Recovery ───

  async recoverPasswordSendMobileOtp(body: HprRecoverPasswordSendMobileOtpRequest): Promise<HprRecoverPasswordSendMobileOtpResponse> {
    return this.hspRequest<HprRecoverPasswordSendMobileOtpResponse>(
      "/v4/int/password/recover/byMobile/sendMobileOTP",
      {
        method: "POST",
        body,
      },
    );
  }

  async recoverPasswordVerifyMobileOtp(body: HprRecoverPasswordVerifyMobileOtpRequest): Promise<HprRecoverPasswordVerifyMobileOtpResponse> {
    return this.hspRequest<HprRecoverPasswordVerifyMobileOtpResponse>(
      "/v4/int/password/recover/byMobile/verifyMobileOTP",
      {
        method: "POST",
        body,
      },
    );
  }

  async resetPassword(body: HprResetPasswordRequest): Promise<HprResetPasswordResponse> {
    return this.hspRequest<HprResetPasswordResponse>(
      "/v4/int/password/resetPassword",
      {
        method: "POST",
        body,
      },
    );
  }

  async recoverPasswordByAadhaar(body: HprRecoverPasswordByAadhaarRequest): Promise<HprRecoverPasswordByAadhaarResponse> {
    return this.hspRequest<HprRecoverPasswordByAadhaarResponse>(
      "/v4/int/password/recover/byAadhaar",
      {
        method: "POST",
        body,
      },
    );
  }

  async recoverPasswordConfirmByAadhaar(body: HprRecoverPasswordConfirmByAadhaarRequest): Promise<HprRecoverPasswordConfirmByAadhaarResponse> {
    return this.hspRequest<HprRecoverPasswordConfirmByAadhaarResponse>(
      "/v4/int/password/recover/confirmByAadhaar",
      {
        method: "POST",
        body,
      },
    );
  }

  async changePasswordByPassword(token: string, body: HprChangePasswordByPasswordRequest): Promise<HprChangePasswordByPasswordResponse> {
    return this.hspRequest<HprChangePasswordByPasswordResponse>(
      "/v4/int/password/change/byPassword",
      {
        method: "POST",
        body,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }

  // ─── Forgot HPR ID ───

  async forgotIdAadhaarGenerateOtp(body: HprForgotIdAadhaarGenerateOtpRequest): Promise<HprForgotIdAadhaarGenerateOtpResponse> {
    return this.hspRequest<HprForgotIdAadhaarGenerateOtpResponse>(
      "/v4/int/v1/forgot/hprId/aadhaar/generateOtp",
      {
        method: "POST",
        body: {
          aadhaar: body.aadhaar,
          iagree: body.iagree ?? true,
        },
      },
    );
  }

  async forgotIdAadhaarVerifyOtp(body: HprForgotIdAadhaarVerifyOtpRequest): Promise<HprForgotIdAadhaarVerifyOtpResponse> {
    return this.hspRequest<HprForgotIdAadhaarVerifyOtpResponse>(
      "/v4/int/v1/forgot/hprId/aadhaar",
      {
        method: "POST",
        body,
      },
    );
  }

  async forgotIdMobileGenerateOtp(body: HprForgotIdMobileGenerateOtpRequest): Promise<HprForgotIdMobileGenerateOtpResponse> {
    return this.hspRequest<HprForgotIdMobileGenerateOtpResponse>(
      "/v4/int/v1/forgot/hprId/mobile/generateOtp",
      {
        method: "POST",
        body,
      },
    );
  }

  async forgotIdMobileVerifyOtp(body: HprForgotIdMobileVerifyOtpRequest): Promise<HprForgotIdMobileVerifyOtpResponse> {
    return this.hspRequest<HprForgotIdMobileVerifyOtpResponse>(
      "/v4/int/v1/forgot/hprId/mobile",
      {
        method: "POST",
        body,
      },
    );
  }

  // ─── Search HPRID Document API ───

  async existsByHprId(hprId: string): Promise<boolean> {
    const res = await this.hspRequest<boolean | { status?: boolean; data?: boolean }>(
      `/v4/int/v1/search/existsByHprId/${encodeURIComponent(hprId)}`,
      { method: "GET" },
    );
    if (typeof res === "boolean") return res;
    if (typeof res === "object" && res !== null) {
      return Boolean(res.data ?? res.status ?? false);
    }
    return false;
  }

  async searchByHprId(hprId: string): Promise<HprSearchRecord> {
    return this.hspRequest<HprSearchRecord>(
      `/v4/int/v1/search/searchByHprId/${encodeURIComponent(hprId)}`,
      { method: "GET" },
    );
  }

  async searchByMobile(mobileNumber: string): Promise<HprSearchRecord[]> {
    return this.hspRequest<HprSearchRecord[]>(
      `/v4/int/v1/search/searchByMobile/${encodeURIComponent(mobileNumber)}`,
      { method: "GET" },
    );
  }

  // ─── Master Data (HPR) via APIs ───

  async getHprSystemsOfMedicine(): Promise<HprSystemOfMedicineItem[]> {
    return this.hspRequest<HprSystemOfMedicineItem[]>(
      "/v4/int/apis/v1/masters/system-of-medicines",
      { method: "GET" },
    );
  }

  async getHprMedicalCouncils(): Promise<HprMedicalCouncilItem[]> {
    return this.hspRequest<HprMedicalCouncilItem[]>(
      "/v4/int/apis/v1/masters/medical-councils",
      { method: "GET" },
    );
  }

  async getHprLanguages(languageId?: number | string): Promise<HprLanguageItem | HprLanguageItem[]> {
    const endpoint = languageId
      ? `/v4/int/apis/v1/masters/languages/${encodeURIComponent(String(languageId))}`
      : "/v4/int/apis/v1/masters/languages";
    return this.hspRequest<HprLanguageItem | HprLanguageItem[]>(endpoint, { method: "GET" });
  }

  async getHprUniversities(collegeId?: number | string): Promise<HprUniversityItem[]> {
    const endpoint = collegeId
      ? `/v4/int/apis/v1/masters/universites/${encodeURIComponent(String(collegeId))}`
      : "/v4/int/apis/v1/masters/universites";
    return this.hspRequest<HprUniversityItem[]>(endpoint, { method: "GET" });
  }

  async getHprColleges(stateId: number | string, systemOfMedicine?: string): Promise<HprCollegeItem[]> {
    const endpoint = systemOfMedicine
      ? `/v4/int/apis/v1/masters/colleges/${encodeURIComponent(String(stateId))}/${encodeURIComponent(systemOfMedicine)}`
      : `/v4/int/apis/v1/masters/colleges/${encodeURIComponent(String(stateId))}`;
    return this.hspRequest<HprCollegeItem[]>(endpoint, { method: "POST" });
  }

  async getHprCourses(payload?: Record<string, unknown>): Promise<HprCourseItem[]> {
    return this.hspRequest<HprCourseItem[]>(
      "/v4/int/apis/v1/masters/courses",
      {
        method: "POST",
        body: payload ?? {},
      },
    );
  }

  async getHprCountries(countryId?: number | string): Promise<HprCountryItem | HprCountryItem[]> {
    const endpoint = countryId
      ? `/v4/int/apis/v1/masters/countries/${encodeURIComponent(String(countryId))}`
      : "/v4/int/apis/v1/masters/countries";
    return this.hspRequest<HprCountryItem | HprCountryItem[]>(endpoint, { method: "GET" });
  }

  async getHprStates(stateId?: number | string): Promise<HprStateItem | HprStateItem[]> {
    const endpoint = stateId
      ? `/v4/int/apis/v1/masters/states/${encodeURIComponent(String(stateId))}`
      : "/v4/int/apis/v1/masters/states";
    return this.hspRequest<HprStateItem | HprStateItem[]>(endpoint, { method: "GET" });
  }

  async getHprDistricts(stateId?: number | string): Promise<HprDistrictItem[]> {
    const endpoint = stateId
      ? `/v4/int/apis/v1/masters/district/${encodeURIComponent(String(stateId))}`
      : "/v4/int/apis/v1/masters/district";
    return this.hspRequest<HprDistrictItem[]>(endpoint, { method: "GET" });
  }

  async getHprSubDistricts(districtId?: number | string): Promise<HprSubDistrictItem[]> {
    const endpoint = districtId
      ? `/v4/int/apis/v1/masters/sub-districts/${encodeURIComponent(String(districtId))}`
      : "/v4/int/apis/v1/masters/sub-districts";
    return this.hspRequest<HprSubDistrictItem[]>(endpoint, { method: "GET" });
  }

  async getHprNurseAffiliatedBoards(boardId?: number | string): Promise<HprAffiliatedBoardItem | HprAffiliatedBoardItem[]> {
    const endpoint = boardId
      ? `/v4/int/apis/v1/masters/affiliated-board/${encodeURIComponent(String(boardId))}`
      : "/v4/int/apis/v1/masters/affiliated-board";
    return this.hspRequest<HprAffiliatedBoardItem | HprAffiliatedBoardItem[]>(endpoint, { method: "GET" });
  }

  async getHprNurseCouncils(): Promise<HprNurseCouncilItem[]> {
    return this.hspRequest<HprNurseCouncilItem[]>(
      "/v4/int/apis/v1/masters/nurse-councils",
      { method: "GET" },
    );
  }

  async getHprNurseCollegesByState(stateId: number | string): Promise<HprCollegeItem[]> {
    return this.hspRequest<HprCollegeItem[]>(
      `/v4/int/apis/v1/masters/colleges/${encodeURIComponent(String(stateId))}`,
      { method: "GET" },
    );
  }

  async getHprAffiliatedBoardsByState(stateId: number | string): Promise<HprAffiliatedBoardItem[]> {
    return this.hspRequest<HprAffiliatedBoardItem[]>(
      `/v4/int/apis/v1/masters/affiliated-board/states/${encodeURIComponent(String(stateId))}`,
      { method: "GET" },
    );
  }

  async getHprAllMinistry(hprToken?: string): Promise<HprMinistryItem[]> {
    return this.hspRequest<HprMinistryItem[]>(
      "/v4/int/apis/v1/master/getAllMinistry",
      {
        method: "GET",
        ...(hprToken ? { headers: { "x-hprid-auth": hprToken } } : {}),
      },
    );
  }

  async getHprCategories(role: number): Promise<HprCategoryMasterItem[]> {
    return this.hspRequest<HprCategoryMasterItem[]>(
      `/v4/int/hpid/get/categories?role=${encodeURIComponent(String(role))}`,
      { method: "GET" },
    );
  }

  async getHprSubCategories(role: number, categoryCode: number | string): Promise<HprSubCategoryMasterItem[]> {
    return this.hspRequest<HprSubCategoryMasterItem[]>(
      `/v4/int/hpid/get/subCategories?role=${encodeURIComponent(String(role))}&categoryCode=${encodeURIComponent(String(categoryCode))}`,
      { method: "GET" },
    );
  }

  // ─── Health Facility Registry (HFR) APIs ───

  async createBasicFacilityInfo(
    body: HfrBasicFacilityInfoRequest,
    hprToken: string,
  ): Promise<HfrBasicFacilityInfoResponse> {
    return this.hspRequest<HfrBasicFacilityInfoResponse>(
      "/v4/int/v1.5/facility/basic-information",
      {
        method: "POST",
        body,
        headers: {
          "x-hprid-auth": hprToken,
        },
      },
    );
  }

  async createAdditionalFacilityInfo(
    body: HfrAdditionalInfoRequest,
  ): Promise<HfrAdditionalInfoResponse> {
    return this.hspRequest<HfrAdditionalInfoResponse>(
      "/v4/int/v1.5/facility/additional-information",
      {
        method: "POST",
        body,
      },
    );
  }

  async createDetailedFacilityInfo(
    body: HfrDetailedInfoRequest,
  ): Promise<HfrDetailedInfoResponse> {
    return this.hspRequest<HfrDetailedInfoResponse>(
      "/v4/int/v1.5/facility/detailed-information",
      {
        method: "POST",
        body,
      },
    );
  }

  async submitFacility(
    body: HfrSubmitFacilityRequest,
    hprToken: string,
  ): Promise<HfrSubmitFacilityResponse> {
    return this.hspRequest<HfrSubmitFacilityResponse>(
      "/v4/int/v1.5/facility/submit-facility",
      {
        method: "POST",
        body,
        headers: {
          "x-hprid-auth": hprToken,
        },
      },
    );
  }

  async getHfrMasterTypes(): Promise<HfrMasterTypesResponse> {
    return this.hspRequest<HfrMasterTypesResponse>(
      "/v4/int/v1.5/facility/get-master-types",
      { method: "GET" },
    );
  }

  async getHfrMasterData(type: string): Promise<HfrMasterDataResponse> {
    return this.hspRequest<HfrMasterDataResponse>(
      `/v4/int/v1.5/facility/get-master-data?type=${encodeURIComponent(type)}`,
      { method: "GET" },
    );
  }

  async getHfrLgdStates(): Promise<HfrLgdStateItem[]> {
    return this.hspRequest<HfrLgdStateItem[]>(
      "/v4/int/v1.5/facility/lgd/states",
      { method: "GET" },
    );
  }

  async getHfrLgdDistricts(stateCode: string | number): Promise<HfrLgdDistrictItem[]> {
    return this.hspRequest<HfrLgdDistrictItem[]>(
      `/v4/int/v1.5/facility/lgd/districts?stateCode=${encodeURIComponent(String(stateCode))}`,
      { method: "GET" },
    );
  }

  async getHfrLgdSubDistricts(districtCode: string | number): Promise<HfrLgdSubDistrictItem[]> {
    return this.hspRequest<HfrLgdSubDistrictItem[]>(
      `/v4/int/v1.5/facility/lgd/subdistricts?districtCode=${encodeURIComponent(String(districtCode))}`,
      { method: "GET" },
    );
  }

  async fetchHfrFacilityType(body: {
    ownershipCode: string;
    systemOfMedicineCode?: string | undefined;
  }): Promise<HfrFacilityTypeResponse> {
    return this.hspRequest<HfrFacilityTypeResponse>(
      "/v4/int/v1.5/facility/fetch-facility-type",
      {
        method: "POST",
        body,
      },
    );
  }

  async getHfrOwnerSubtypes(body: {
    ownershipCode: string;
    ownerSubtypeCode?: string | undefined;
  }): Promise<HfrOwnerSubtypesResponse> {
    return this.hspRequest<HfrOwnerSubtypesResponse>(
      "/v4/int/v1.5/facility/get-owner-subtype",
      {
        method: "POST",
        body,
      },
    );
  }

  async getHfrSpecialities(body: {
    systemOfMedicineCode: string;
  }): Promise<HfrSpecialitiesResponse> {
    return this.hspRequest<HfrSpecialitiesResponse>(
      "/v4/int/v1.5/facility/get-specialities",
      {
        method: "POST",
        body,
      },
    );
  }

  async fetchHfrFacilitySubtype(body: {
    facilityTypeCode: string;
  }): Promise<HfrFacilitySubtypeResponse> {
    return this.hspRequest<HfrFacilitySubtypeResponse>(
      "/v4/int/v1.5/facility/fetch-facility-Sub-type",
      {
        method: "POST",
        body,
      },
    );
  }

  async linkMultipleHrp(body: HfrMultipleHrpRequest): Promise<HfrMultipleHrpResponseItem[]> {
    return this.hspRequest<HfrMultipleHrpResponseItem[]>(
      "/v4/int/v1/bridges/MutipleHRPAddUpdateServices",
      {
        method: "POST",
        body,
      },
    );
  }

  async sendOtpToContact(
    body: HfrSendOtpToContactRequest,
  ): Promise<HfrSendOtpToContactResponse | HfrSendOtpToContactResponse[]> {
    return this.hspRequest<HfrSendOtpToContactResponse | HfrSendOtpToContactResponse[]>(
      "/v4/int/v1.5/facility/sendOtpToContact",
      {
        method: "POST",
        body,
      },
    );
  }

  async validateOtp(
    body: HfrValidateOtpRequest,
  ): Promise<HfrValidateOtpResponse | HfrValidateOtpResponse[]> {
    return this.hspRequest<HfrValidateOtpResponse | HfrValidateOtpResponse[]>(
      "/v4/int/v1.5/facility/validateOtp",
      {
        method: "POST",
        body,
      },
    );
  }

  async fetchFacilityContactDetails(
    body: HfrFacilityContactDetailsRequest,
  ): Promise<HfrFacilityContactDetailsResponse> {
    return this.hspRequest<HfrFacilityContactDetailsResponse>(
      "/v4/int/v1.5/facility/fetchFacilityContactDetails",
      {
        method: "POST",
        body,
      },
    );
  }

  async fetchDetailsForUwin(
    body: HfrUwinFetchDetailsRequest,
  ): Promise<HfrUwinFetchDetailsResponse> {
    return this.hspRequest<HfrUwinFetchDetailsResponse>(
      "/v4/int/v1.6/facility/fetchDetailsForUwin",
      {
        method: "POST",
        body,
      },
    );
  }

  async validateUwinOtp(
    body: HfrUwinValidateOtpRequest,
  ): Promise<HfrUwinValidateOtpResponse> {
    return this.hspRequest<HfrUwinValidateOtpResponse>(
      "/v4/int/v1.5/facility/validateUwinOtp",
      {
        method: "POST",
        body,
      },
    );
  }

  async deduplicateFacility(
    body: HfrDeduplicateFacilityRequest,
  ): Promise<HfrDeduplicateFacilityItem[]> {
    return this.hspRequest<HfrDeduplicateFacilityItem[]>(
      "/v4/int/search/address/filter/deduplicate",
      {
        method: "POST",
        body,
      },
    );
  }
}


export const abdmV3Client = new AbdmV3HttpClient();
