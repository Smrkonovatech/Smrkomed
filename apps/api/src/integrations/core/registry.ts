import type { IntegrationProvider } from "@smrkomed/database";

import { env } from "../../config/env";
import { IntegrationError } from "./errors";
import type { IntegrationProviderAdapter } from "./provider";
import type { FrameworkProviderId } from "./types";
import { FRAMEWORK_PROVIDERS } from "./types";
import { googleAdsProvider } from "../providers/google-ads/provider";
import { metaAdsProvider } from "../providers/meta-ads/provider";
import { whatsappProvider } from "../providers/whatsapp/provider";

const stubs: Record<FrameworkProviderId, IntegrationProviderAdapter> = {
  WHATSAPP_CLOUD: whatsappProvider,
  META_ADS: metaAdsProvider,
  GOOGLE_ADS: googleAdsProvider,
};

const aliases: Record<string, FrameworkProviderId> = {
  WHATSAPP: "WHATSAPP_CLOUD",
  WHATSAPP_CLOUD: "WHATSAPP_CLOUD",
  META: "META_ADS",
  META_ADS: "META_ADS",
  GOOGLE: "GOOGLE_ADS",
  GOOGLE_ADS: "GOOGLE_ADS",
};

const testOverrides = new Map<IntegrationProvider, IntegrationProviderAdapter>();

export function parseProviderId(raw: string): FrameworkProviderId {
  const normalized = raw.trim().toUpperCase().replace(/-/g, "_");
  const mapped = aliases[normalized];
  if (!mapped) {
    throw new IntegrationError("PROVIDER_NOT_SUPPORTED", `Unknown integration provider: ${raw}.`, 422);
  }
  return mapped;
}

export function parseWebhookProvider(raw: string): FrameworkProviderId {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "whatsapp" || normalized === "whatsapp_cloud") return "WHATSAPP_CLOUD";
  if (normalized === "meta" || normalized === "meta_ads") return "META_ADS";
  if (normalized === "google" || normalized === "google_ads") return "GOOGLE_ADS";
  return parseProviderId(raw);
}

export function getProvider(id: string): IntegrationProviderAdapter {
  const providerId = parseProviderId(id);
  const override = testOverrides.get(providerId);
  if (override) return override;
  const stub = stubs[providerId];
  if (!stub) {
    throw new IntegrationError("PROVIDER_NOT_SUPPORTED", `Provider ${id} is not registered.`, 422);
  }
  return stub;
}

export function registerProviderForTests(adapter: IntegrationProviderAdapter) {
  if (env.nodeEnv === "production") {
    throw new IntegrationError("MOCK_PROVIDER_DISABLED", "Test provider registration is disabled.", 403);
  }
  testOverrides.set(adapter.id, adapter);
}

export function resetProviderRegistryForTests() {
  testOverrides.clear();
}

export function canUseMockProvider() {
  return env.nodeEnv !== "production" && (env.nodeEnv === "test" || env.mockIntegrationsEnabled);
}

export function listFrameworkProviders() {
  return FRAMEWORK_PROVIDERS;
}

export { FRAMEWORK_PROVIDERS };
