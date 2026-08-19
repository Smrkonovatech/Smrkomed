import { stubOAuth } from "../../core/oauth";
import type { IntegrationProviderAdapter } from "../../core/provider";
import { notImplemented } from "../../core/errors";
import type { NormalizedWebhookEvent } from "../../core/types";

export const googleAdsProvider: IntegrationProviderAdapter = {
  id: "GOOGLE_ADS",
  displayName: "Google Ads",
  connect() {
    return Promise.reject(notImplemented("connect", "Google Ads"));
  },
  disconnect() {
    return Promise.reject(notImplemented("disconnect", "Google Ads"));
  },
  getStatus() {
    return Promise.resolve({ implemented: false as const });
  },
  refresh() {
    return Promise.reject(notImplemented("refresh", "Google Ads"));
  },
  rotateCredentials() {
    return Promise.reject(notImplemented("credential rotation", "Google Ads"));
  },
  verifyWebhook() {
    return Promise.reject(notImplemented("webhook verification", "Google Ads"));
  },
  parseWebhook(_rawBody: string): NormalizedWebhookEvent {
    throw notImplemented("webhook parse", "Google Ads");
  },
  handleWebhook() {
    return Promise.reject(notImplemented("webhook handle", "Google Ads"));
  },
};

export const googleAdsOAuth = stubOAuth("Google Ads");
