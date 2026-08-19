import { randomBytes } from "node:crypto";

import { IntegrationError } from "./errors";
import type { OAuthProvider } from "./provider";
import type { ConnectResult, OAuthStartInput, StoredCredentials } from "./types";

/**
 * OAuth foundation for Phase 7+.
 *
 * Intended callback flow:
 * 1. GET /oauth/start creates a signed `state` bound to clinicId + organizationId + nonce + expiry.
 * 2. The provider redirects to /oauth/callback with `code` and `state`.
 * 3. handleCallback rejects missing/mismatched/expired state (CSRF and callback injection).
 * 4. Authorization codes are exchanged once; reuse is rejected.
 *
 * Phase 6 does not redirect to any external provider URL.
 */
export function createOAuthState(input: { clinicId: string; organizationId: string; nonce?: string }) {
  const nonce = input.nonce ?? randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  return Buffer.from(
    JSON.stringify({
      clinicId: input.clinicId,
      organizationId: input.organizationId,
      nonce,
      issuedAt,
    }),
    "utf8",
  ).toString("base64url");
}

export function parseOAuthState(state: string) {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      clinicId?: string;
      organizationId?: string;
      nonce?: string;
      issuedAt?: number;
    };
    if (!parsed.clinicId || !parsed.organizationId || !parsed.nonce || !parsed.issuedAt) {
      throw new Error("incomplete");
    }
    if (Date.now() - parsed.issuedAt > 10 * 60 * 1000) {
      throw new IntegrationError("AUTHORIZATION_FAILED", "OAuth state expired.", 401);
    }
    return {
      clinicId: parsed.clinicId,
      organizationId: parsed.organizationId,
      nonce: parsed.nonce,
      issuedAt: parsed.issuedAt,
    };
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError("AUTHORIZATION_FAILED", "Invalid OAuth state.", 401);
  }
}

export function stubOAuth(providerName: string): OAuthProvider {
  const notReady = () =>
    Promise.reject(
      new IntegrationError("OAUTH_NOT_IMPLEMENTED", `${providerName} OAuth is not implemented yet.`, 501),
    );
  return {
    getAuthorizationUrl(_input: OAuthStartInput) {
      return notReady();
    },
    handleCallback(_input: { code: string; state: string }): Promise<ConnectResult> {
      return notReady();
    },
    exchangeCode(_code: string): Promise<StoredCredentials> {
      return notReady();
    },
    refreshToken(_refreshToken: string): Promise<StoredCredentials> {
      return notReady();
    },
  };
}
