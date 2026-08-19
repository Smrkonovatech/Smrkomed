import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../../../config/env";
import { IntegrationError } from "../../core/errors";
import type { IntegrationProviderAdapter } from "../../core/provider";
import type { ConnectResult, NormalizedWebhookEvent, StoredCredentials } from "../../core/types";

const MOCK_SECRET = "smrkomed-mock-webhook-secret";

function assertMockAllowed() {
  if (env.nodeEnv === "production" || (env.nodeEnv !== "test" && !env.mockIntegrationsEnabled)) {
    throw new IntegrationError("MOCK_PROVIDER_DISABLED", "Mock integrations are disabled.", 403);
  }
}

function parseBody(rawBody: string): {
  id?: string;
  type?: string;
  account?: string;
  signature?: string;
} {
  try {
    return JSON.parse(rawBody) as { id?: string; type?: string; account?: string; signature?: string };
  } catch {
    throw new IntegrationError("UNSUPPORTED_EVENT", "Mock webhook payload must be JSON.", 400);
  }
}

export const mockIntegrationProvider: IntegrationProviderAdapter = {
  id: "WHATSAPP_CLOUD",
  displayName: "Mock",
  async connect(): Promise<ConnectResult> {
    assertMockAllowed();
    return {
      externalAccountId: "mock_account_001",
      displayName: "Mock WhatsApp",
      credentials: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
      },
    };
  },
  async disconnect() {
    assertMockAllowed();
    return { disconnected: true as const };
  },
  async getStatus() {
    assertMockAllowed();
    return { implemented: true as const, healthy: true };
  },
  async refresh(): Promise<StoredCredentials> {
    assertMockAllowed();
    return { accessToken: "mock-access-token-rotated", refreshToken: "mock-refresh-token" };
  },
  async rotateCredentials(current: StoredCredentials): Promise<StoredCredentials> {
    assertMockAllowed();
    const rotated: StoredCredentials = { accessToken: `${current.accessToken ?? "mock"}-rotated` };
    if (current.refreshToken) rotated.refreshToken = current.refreshToken;
    return rotated;
  },
  async verifyWebhook(headers: Headers, rawBody: string) {
    assertMockAllowed();
    const provided = headers.get("x-smrkomed-mock-signature") ?? parseBody(rawBody).signature;
    if (!provided) {
      throw new IntegrationError("WEBHOOK_VERIFICATION_FAILED", "Mock webhook signature missing.", 401);
    }
    const expected = createHmac("sha256", MOCK_SECRET).update(rawBody).digest("hex");
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new IntegrationError("WEBHOOK_VERIFICATION_FAILED", "Mock webhook signature invalid.", 401);
    }
    return { ok: true as const };
  },
  parseWebhook(rawBody: string): NormalizedWebhookEvent {
    assertMockAllowed();
    const body = parseBody(rawBody);
    if (!body.id) {
      throw new IntegrationError("MISSING_EVENT_ID", "Webhook event id is required.", 400);
    }
    if (!body.type) {
      throw new IntegrationError("UNSUPPORTED_EVENT", "Webhook event type is required.", 400);
    }
    return {
      externalEventId: body.id,
      eventType: body.type,
      externalAccountId: body.account ?? "mock_account_001",
      metadata: { eventType: body.type },
    };
  },
  async handleWebhook() {
    assertMockAllowed();
  },
};

export function mockWebhookSignature(rawBody: string) {
  return createHmac("sha256", MOCK_SECRET).update(rawBody).digest("hex");
}
