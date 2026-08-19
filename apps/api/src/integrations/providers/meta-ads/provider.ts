import { stubOAuth } from "../../core/oauth";
import type { IntegrationProviderAdapter } from "../../core/provider";
import { notImplemented } from "../../core/errors";
import type { NormalizedWebhookEvent } from "../../core/types";

export const metaAdsProvider: IntegrationProviderAdapter = {
  id: "META_ADS",
  displayName: "Meta Ads",
  connect() {
    return Promise.reject(notImplemented("connect", "Meta Ads"));
  },
  disconnect() {
    return Promise.reject(notImplemented("disconnect", "Meta Ads"));
  },
  getStatus() {
    return Promise.resolve({ implemented: false as const });
  },
  refresh() {
    return Promise.reject(notImplemented("refresh", "Meta Ads"));
  },
  rotateCredentials() {
    return Promise.reject(notImplemented("credential rotation", "Meta Ads"));
  },
  verifyWebhook() {
    return Promise.reject(notImplemented("webhook verification", "Meta Ads"));
  },
  parseWebhook(_rawBody: string): NormalizedWebhookEvent {
    throw notImplemented("webhook parse", "Meta Ads");
  },
  handleWebhook() {
    return Promise.reject(notImplemented("webhook handle", "Meta Ads"));
  },
};

export const metaAdsOAuth = stubOAuth("Meta Ads");
