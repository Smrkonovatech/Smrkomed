import { randomUUID } from "node:crypto";
import { getAbdmConfig, buildGatewayHeaders, scrubAbdmSecrets } from "./abdm-config";
import type {
  AbdmSessionToken,
  AbdmAuthMode,
  AbdmAuthPurpose,
} from "./abdm-types";

export class AbdmClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly technicalDetail?: string,
  ) {
    super(scrubAbdmSecrets(message));
    this.name = "AbdmClientError";
  }
}

export class AbdmHttpClient {
  private cachedToken: AbdmSessionToken | null = null;
  private inFlightTokenPromise: Promise<string> | null = null;
  private customFetch: typeof fetch = fetch;

  constructor(
    customFetch?: typeof fetch,
    private configOverrides?: {
      baseUrl?: string;
      clientId?: string;
      clientSecret?: string;
    },
  ) {
    if (customFetch) {
      this.customFetch = customFetch;
    }
  }

  /**
   * Clears the in-memory token cache (useful for tests or after authentication errors).
   */
  clearTokenCache(): void {
    this.cachedToken = null;
    this.inFlightTokenPromise = null;
  }

  /**
   * Obtains a valid Gateway session Bearer token from ABDM Gateway (/v0.5/sessions).
   * - Caches token in-memory
   * - Automatically refreshes 60s before expiry
   * - Deduplicates concurrent calls via mutex promise
   */
  async getGatewayToken(): Promise<string> {
    const config = getAbdmConfig();
    const clientId = this.configOverrides?.clientId || config.clientId;
    const clientSecret = this.configOverrides?.clientSecret || config.clientSecret;
    const baseUrl = this.configOverrides?.baseUrl || config.baseUrl;

    if (!clientId || !clientSecret) {
      throw new AbdmClientError(
        "ABDM_CREDENTIALS_MISSING",
        "ABDM Client ID and Secret are not configured on the server.",
        500,
      );
    }

    const now = Date.now();
    // Return cached token if still valid (with 60-second safety buffer)
    if (this.cachedToken && this.cachedToken.expiresAt - now > 60_000) {
      return this.cachedToken.accessToken;
    }

    // Deduplicate concurrent token requests
    if (this.inFlightTokenPromise) {
      return this.inFlightTokenPromise;
    }

    this.inFlightTokenPromise = this.requestNewToken(baseUrl, clientId, clientSecret)
      .finally(() => {
        this.inFlightTokenPromise = null;
      });

    return this.inFlightTokenPromise;
  }

  private async requestNewToken(
    baseUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const sessionUrl = `${baseUrl}/v0.5/sessions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await this.customFetch(sessionUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
        }),
      });

      if (!response.ok) {
        let errBody = "";
        try {
          errBody = await response.text();
        } catch {
          // ignore
        }

        if (response.status === 401 || response.status === 403) {
          throw new AbdmClientError(
            "ABDM_INVALID_CREDENTIALS",
            "ABDM rejected client credentials. Verify Client ID and Secret in sandbox portal.",
            401,
            errBody,
          );
        }

        if (response.status >= 500) {
          throw new AbdmClientError(
            "ABDM_GATEWAY_DOWN",
            "ABDM Gateway services are temporarily unavailable.",
            503,
            errBody,
          );
        }

        throw new AbdmClientError(
          "ABDM_SESSION_ERROR",
          `Failed to authenticate with ABDM Gateway (HTTP ${response.status}).`,
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
        throw new AbdmClientError(
          "ABDM_TOKEN_PARSE_ERROR",
          "ABDM Gateway did not return a valid session token.",
          502,
        );
      }

      const expiresInSeconds = data.expiresIn && data.expiresIn > 0 ? data.expiresIn : 1800; // default 30 mins
      this.cachedToken = {
        accessToken: data.accessToken,
        expiresIn: expiresInSeconds,
        tokenType: data.tokenType || "Bearer",
        expiresAt: Date.now() + expiresInSeconds * 1000,
      };

      return this.cachedToken.accessToken;
    } catch (err: unknown) {
      if (err instanceof AbdmClientError) {
        throw err;
      }
      if ((err as { name?: string }).name === "AbortError") {
        throw new AbdmClientError(
          "ABDM_TIMEOUT",
          "ABDM Gateway timed out during session authentication.",
          504,
        );
      }
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new AbdmClientError(
        "ABDM_CONNECTION_FAILED",
        "Could not connect to ABDM Gateway. Check network or gateway status.",
        502,
        rawMsg,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Query authentication modes for a given ABHA or mobile identifier.
   * Calls POST /v0.5/users/auth/fetch-modes
   */
  async fetchAuthModes(input: {
    id: string; // ABHA number, ABHA address, or Mobile
    purpose?: AbdmAuthPurpose;
    requestId?: string;
  }): Promise<{ requestId: string }> {
    const config = getAbdmConfig();
    const token = await this.getGatewayToken();
    const requestId = input.requestId || randomUUID();
    const timestamp = new Date().toISOString();

    const headers = buildGatewayHeaders({
      token,
      requestId,
      timestamp,
      xCmId: config.xCmId,
    });

    const url = `${config.baseUrl}/v0.5/users/auth/fetch-modes`;
    const body = {
      requestId,
      timestamp,
      query: {
        id: input.id,
        purpose: input.purpose || "KYC_AND_LINK",
        requester: {
          type: "HIP",
          id: config.facilityId || "SMRKOMED_CLINIC",
        },
      },
    };

    await this.postGateway(url, headers, body);
    return { requestId };
  }

  /**
   * Initiates authentication with ABDM Gateway.
   * Calls POST /v0.5/users/auth/init
   */
  async initAuth(input: {
    id: string; // ABHA number or address
    authMode: AbdmAuthMode;
    purpose?: AbdmAuthPurpose;
    requestId?: string;
  }): Promise<{ requestId: string }> {
    const config = getAbdmConfig();
    const token = await this.getGatewayToken();
    const requestId = input.requestId || randomUUID();
    const timestamp = new Date().toISOString();

    const headers = buildGatewayHeaders({
      token,
      requestId,
      timestamp,
      xCmId: config.xCmId,
    });

    const url = `${config.baseUrl}/v0.5/users/auth/init`;
    const body = {
      requestId,
      timestamp,
      query: {
        id: input.id,
        purpose: input.purpose || "KYC_AND_LINK",
        authMode: input.authMode,
        requester: {
          type: "HIP",
          id: config.facilityId || "SMRKOMED_CLINIC",
        },
      },
    };

    await this.postGateway(url, headers, body);
    return { requestId };
  }

  /**
   * Confirms OTP with ABDM Gateway.
   * Calls POST /v0.5/users/auth/confirm
   */
  async confirmAuth(input: {
    transactionId: string;
    otp: string;
    requestId?: string;
  }): Promise<{ requestId: string }> {
    const config = getAbdmConfig();
    const token = await this.getGatewayToken();
    const requestId = input.requestId || randomUUID();
    const timestamp = new Date().toISOString();

    const headers = buildGatewayHeaders({
      token,
      requestId,
      timestamp,
      xCmId: config.xCmId,
    });

    const url = `${config.baseUrl}/v0.5/users/auth/confirm`;
    const body = {
      requestId,
      timestamp,
      transactionId: input.transactionId,
      credential: {
        authCode: input.otp,
      },
    };

    await this.postGateway(url, headers, body);
    return { requestId };
  }

  private async postGateway(
    url: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await this.customFetch(url, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify(body),
      });

      // 202 Accepted or 200 OK is expected from ABDM Gateway
      if (response.status !== 202 && response.status !== 200) {
        let errBody = "";
        try {
          errBody = await response.text();
        } catch {
          // ignore
        }

        if (response.status === 401) {
          // Invalidate cached token so next request refreshes
          this.clearTokenCache();
          throw new AbdmClientError(
            "ABDM_UNAUTHORIZED",
            "ABDM Gateway token expired or invalid.",
            401,
            errBody,
          );
        }

        if (response.status === 400) {
          throw new AbdmClientError(
            "ABDM_BAD_REQUEST",
            "ABDM Gateway rejected the request parameters.",
            400,
            errBody,
          );
        }

        if (response.status >= 500) {
          throw new AbdmClientError(
            "ABDM_GATEWAY_ERROR",
            "ABDM Gateway encountered an internal error.",
            503,
            errBody,
          );
        }

        throw new AbdmClientError(
          "ABDM_REQUEST_FAILED",
          `ABDM Gateway call failed with HTTP ${response.status}.`,
          response.status,
          errBody,
        );
      }
    } catch (err: unknown) {
      if (err instanceof AbdmClientError) {
        throw err;
      }
      if ((err as { name?: string }).name === "AbortError") {
        throw new AbdmClientError(
          "ABDM_TIMEOUT",
          "ABDM Gateway request timed out.",
          504,
        );
      }
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new AbdmClientError(
        "ABDM_NETWORK_ERROR",
        "Failed to reach ABDM Gateway.",
        502,
        rawMsg,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const abdmClient = new AbdmHttpClient();
