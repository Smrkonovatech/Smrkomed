import { randomUUID } from "node:crypto";
import { getAbdmConfig, scrubAbdmSecrets } from "./abdm-config";
import { encryptWithAbdmPublicKey, getAbdmPublicKey } from "./abdm-v3-crypto";
import type { AbdmSessionToken } from "./abdm-types";

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
      method?: "GET" | "POST" | "PATCH" | "DELETE";
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
}

export const abdmV3Client = new AbdmV3HttpClient();
