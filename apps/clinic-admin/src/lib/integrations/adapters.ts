import type { IntegrationProvider } from "@smrkomed/database";

import type { IntegrationAdapter, PublicIntegration } from "./types";

function stub(provider: IntegrationProvider, displayName: string): IntegrationAdapter {
  return {
    provider,
    async connect() {
      const result: PublicIntegration = {
        provider,
        status: "ACTIVE",
        displayName,
        externalAccountId: `${provider.toLowerCase()}_demo`,
        lastError: null,
      };
      return result;
    },
    async disconnect() {
      return;
    },
    async getStatus() {
      return "ACTIVE";
    },
  };
}

export const adapters: Record<IntegrationProvider, IntegrationAdapter> = {
  WHATSAPP_CLOUD: stub("WHATSAPP_CLOUD", "WhatsApp Business"),
  META_ADS: stub("META_ADS", "Meta Ads"),
  GOOGLE_ADS: stub("GOOGLE_ADS", "Google Ads"),
  GOOGLE_CALENDAR: stub("GOOGLE_CALENDAR", "Google Calendar"),
  RAZORPAY: stub("RAZORPAY", "Razorpay"),
  SMS: stub("SMS", "SMS"),
  EMAIL: stub("EMAIL", "Email"),
  VOICE: stub("VOICE", "Voice"),
  EMR: stub("EMR", "Existing EMR"),
  ABDM: stub("ABDM", "ABDM"),
  OPENAI: stub("OPENAI", "AI assistant"),
  S3: stub("S3", "File storage"),
};

export function getAdapter(provider: IntegrationProvider) {
  return adapters[provider];
}
