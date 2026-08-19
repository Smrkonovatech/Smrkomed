import { createHmac, timingSafeEqual } from "node:crypto";

import { IntegrationError } from "../../core/errors";
import type { IntegrationProviderAdapter } from "../../core/provider";
import type { NormalizedWebhookEvent, StoredCredentials } from "../../core/types";
import { isMetaConfigured, metaConfig } from "./config";
import { unsubscribeWaba } from "./graph";

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const secret = metaConfig().appSecret;
  if (!secret) {
    throw new IntegrationError("WEBHOOK_VERIFICATION_FAILED", "WhatsApp webhook secret is not configured.", 401);
  }
  if (!signatureHeader?.startsWith("sha256=")) {
    throw new IntegrationError("WEBHOOK_VERIFICATION_FAILED", "WhatsApp webhook signature missing.", 401);
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new IntegrationError("WEBHOOK_VERIFICATION_FAILED", "WhatsApp webhook signature invalid.", 401);
  }
}

export function verifyWebhookChallenge(mode: string | undefined, token: string | undefined, challenge: string | undefined) {
  const expected = metaConfig().verifyToken;
  if (mode !== "subscribe" || !token || !challenge || !expected) {
    throw new IntegrationError("WEBHOOK_VERIFICATION_FAILED", "WhatsApp webhook verification failed.", 403);
  }
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  const match = left.length === right.length && timingSafeEqual(left, right);
  if (!match) {
    throw new IntegrationError("WEBHOOK_VERIFICATION_FAILED", "WhatsApp webhook verification failed.", 403);
  }
  return challenge;
}

type ChangeValue = {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  messages?: Array<{ id?: string; from?: string; type?: string; timestamp?: string; text?: { body?: string } }>;
  statuses?: Array<{ id?: string; status?: string; recipient_id?: string; timestamp?: string }>;
  message_template_name?: string;
  message_template_language?: string;
  event?: string;
  reason?: string;
};

export function parseWhatsAppPayload(rawBody: string): NormalizedWebhookEvent[] {
  let parsed: { object?: string; entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: ChangeValue }> }> };
  try {
    parsed = JSON.parse(rawBody) as typeof parsed;
  } catch {
    throw new IntegrationError("UNSUPPORTED_EVENT", "WhatsApp webhook payload must be JSON.", 400);
  }
  if (parsed.object && parsed.object !== "whatsapp_business_account") {
    throw new IntegrationError("UNSUPPORTED_EVENT", "Unsupported WhatsApp webhook object.", 400);
  }
  const events: NormalizedWebhookEvent[] = [];
  for (const entry of parsed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id ?? null;
      if (change.field === "message_template_status_update") {
        events.push({
          externalEventId: `tpl:${entry.id ?? "waba"}:${value.message_template_name ?? "unknown"}:${value.message_template_language ?? "und"}:${value.event ?? "unknown"}`,
          eventType: "template_status",
          externalAccountId: phoneNumberId ?? entry.id ?? null,
          metadata: {
            name: value.message_template_name ?? null,
            language: value.message_template_language ?? null,
            event: value.event ?? null,
            reason: value.reason ?? null,
            wabaId: entry.id ?? null,
            field: change.field,
          },
        });
        continue;
      }
      if (change.field && change.field !== "messages") {
        events.push({
          externalEventId: `${entry.id ?? "waba"}:${change.field}:${value.metadata?.phone_number_id ?? "unknown"}`,
          eventType: change.field,
          externalAccountId: phoneNumberId ?? entry.id ?? null,
          metadata: { field: change.field, wabaId: entry.id ?? null },
        });
        continue;
      }
      for (const message of value.messages ?? []) {
        if (!message.id) continue;
        events.push({
          externalEventId: message.id,
          eventType: message.type === "text" ? "inbound_text" : `inbound_${message.type ?? "unknown"}`,
          externalAccountId: phoneNumberId,
          metadata: {
            from: message.from ?? null,
            messageType: message.type ?? "text",
            timestamp: message.timestamp ?? null,
            wabaId: entry.id ?? null,
          },
        });
      }
      for (const status of value.statuses ?? []) {
        if (!status.id) continue;
        events.push({
          externalEventId: `status:${status.id}:${status.status ?? "unknown"}`,
          eventType: `status_${status.status ?? "unknown"}`,
          externalAccountId: phoneNumberId,
          metadata: {
            providerMessageId: status.id,
            status: status.status ?? null,
            recipientId: status.recipient_id ?? null,
            timestamp: status.timestamp ?? null,
            wabaId: entry.id ?? null,
          },
        });
      }
    }
  }
  return events;
}

export const whatsappProvider: IntegrationProviderAdapter = {
  id: "WHATSAPP_CLOUD",
  displayName: "WhatsApp",
  connect() {
    return Promise.reject(
      new IntegrationError(
        "PROVIDER_NOT_IMPLEMENTED",
        "Connect WhatsApp with Embedded Signup from the clinic Integrations page.",
        501,
      ),
    );
  },
  async disconnect(input?: { credentials?: StoredCredentials; externalAccountId?: string | null }) {
    if (!isMetaConfigured()) {
      throw new IntegrationError(
        "PROVIDER_NOT_IMPLEMENTED",
        "WhatsApp disconnect requires Meta app configuration.",
        501,
      );
    }
    const token = input?.credentials?.accessToken ?? input?.credentials?.systemUserToken;
    const wabaId = input?.externalAccountId;
    if (token && wabaId) {
      try {
        await unsubscribeWaba(wabaId, token);
      } catch (error) {
        if (error instanceof IntegrationError && error.code === "AUTHORIZATION_EXPIRED") {
          return { disconnected: true as const };
        }
        throw error;
      }
    }
    return { disconnected: true as const };
  },
  async getStatus() {
    return { implemented: true as const, healthy: isMetaConfigured() };
  },
  refresh() {
    return Promise.reject(
      new IntegrationError(
        "PROVIDER_NOT_IMPLEMENTED",
        "Embedded Signup issues a Business Integration System User token. There is no refresh-token grant for this flow.",
        501,
      ),
    );
  },
  rotateCredentials() {
    return Promise.reject(
      new IntegrationError("PROVIDER_NOT_IMPLEMENTED", "Reconnect WhatsApp with Embedded Signup to rotate access.", 501),
    );
  },
  async verifyWebhook(headers: Headers, rawBody: string) {
    verifyMetaSignature(rawBody, headers.get("x-hub-signature-256"));
    return { ok: true as const };
  },
  parseWebhook(rawBody: string): NormalizedWebhookEvent {
    const events = parseWhatsAppPayload(rawBody);
    const first = events[0];
    if (!first) {
      throw new IntegrationError("MISSING_EVENT_ID", "WhatsApp webhook contained no processable events.", 400);
    }
    return first;
  },
  async handleWebhook() {
    return;
  },
};
