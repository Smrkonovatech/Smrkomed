import type { IntegrationProvider, IntegrationStatus } from "@smrkomed/database";

export const FRAMEWORK_PROVIDERS = ["WHATSAPP_CLOUD", "META_ADS", "GOOGLE_ADS"] as const;
export type FrameworkProviderId = (typeof FRAMEWORK_PROVIDERS)[number];

export type ConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "ACTION_REQUIRED"
  | "ERROR"
  | "DISCONNECTED";

export type ProviderOperation =
  | "connect"
  | "disconnect"
  | "refresh"
  | "getStatus"
  | "handleWebhook"
  | "verifyWebhook"
  | "rotateCredentials"
  | "oauth";

export type StoredCredentials = {
  accessToken?: string;
  refreshToken?: string;
  clientSecret?: string;
  appSecret?: string;
  systemUserToken?: string;
  [key: string]: string | undefined;
};

export type ConnectResult = {
  externalAccountId: string | null;
  displayName: string | null;
  credentials: StoredCredentials;
};

export type DisconnectResult = {
  disconnected: true;
};

export type WebhookVerifyResult = {
  ok: true;
};

export type NormalizedWebhookEvent = {
  externalEventId: string;
  eventType: string;
  externalAccountId: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type PublicIntegration = {
  id: string | null;
  organizationId: string;
  clinicId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  connectionStatus: ConnectionStatus;
  displayName: string | null;
  externalAccount: string | null;
  lastSyncAt: Date | null;
  lastError: { code: string; message: string } | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type OAuthStartInput = {
  clinicId: string;
  organizationId: string;
  redirectUri: string;
  state: string;
};
