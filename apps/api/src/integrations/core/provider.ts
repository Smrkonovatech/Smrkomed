import type { IntegrationProvider } from "@smrkomed/database";

import type {
  ConnectResult,
  DisconnectResult,
  NormalizedWebhookEvent,
  OAuthStartInput,
  ProviderOperation,
  StoredCredentials,
  WebhookVerifyResult,
} from "./types";

export interface IntegrationProviderAdapter {
  readonly id: IntegrationProvider;
  readonly displayName: string;
  connect(): Promise<ConnectResult>;
  disconnect(input?: { credentials?: StoredCredentials; externalAccountId?: string | null }): Promise<DisconnectResult>;
  getStatus(): Promise<{ implemented: false } | { implemented: true; healthy: boolean }>;
  refresh(): Promise<StoredCredentials>;
  rotateCredentials(current: StoredCredentials): Promise<StoredCredentials>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookVerifyResult>;
  parseWebhook(rawBody: string): NormalizedWebhookEvent;
  handleWebhook(_event: NormalizedWebhookEvent): Promise<void>;
}

export interface OAuthProvider {
  getAuthorizationUrl(input: OAuthStartInput): Promise<string>;
  handleCallback(input: { code: string; state: string }): Promise<ConnectResult>;
  exchangeCode(code: string): Promise<StoredCredentials>;
  refreshToken(refreshToken: string): Promise<StoredCredentials>;
}

export interface WebhookVerifier {
  verify(headers: Headers, rawBody: string): Promise<WebhookVerifyResult>;
}

export type ProviderMethod = ProviderOperation;
