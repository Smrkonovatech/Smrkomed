export function whatsAppEnv(): "development" | "production" {
  const value = (process.env["WHATSAPP_ENV"] ?? process.env["NODE_ENV"] ?? "development").toLowerCase();
  return value === "production" ? "production" : "development";
}

export function metaConfig() {
  return {
    appId: process.env["META_APP_ID"] ?? "",
    appSecret: process.env["META_APP_SECRET"] ?? "",
    configId: process.env["WHATSAPP_CONFIGURATION_ID"] ?? "",
    verifyToken: process.env["WHATSAPP_VERIFY_TOKEN"] ?? process.env["META_WEBHOOK_VERIFY_TOKEN"] ?? "",
    graphVersion: process.env["META_GRAPH_API_VERSION"] ?? process.env["META_API_VERSION"] ?? "v21.0",
    env: whatsAppEnv(),
    // Direct connection mode assets:
    directPhoneNumberId: process.env["WHATSAPP_PHONE_NUMBER_ID"] ?? "",
    directBusinessAccountId: process.env["WHATSAPP_BUSINESS_ACCOUNT_ID"] ?? "",
    directDisplayPhoneNumber: process.env["WHATSAPP_PHONE_NUMBER"] ?? "+91 86607 17328",
    directAccessToken:
      process.env["WHATSAPP_ACCESS_TOKEN"] ??
      process.env["META_SYSTEM_USER_TOKEN"] ??
      process.env["META_ACCESS_TOKEN"] ??
      "",
  };
}

/**
 * Returns true if direct Meta connection mode is configured via server-side environment variables.
 * In this mode, Embedded Signup is not required.
 */
export function isDirectMetaConfigured(): boolean {
  const cfg = metaConfig();
  return Boolean(
    cfg.appId &&
    cfg.appSecret &&
    cfg.directPhoneNumberId &&
    cfg.directBusinessAccountId
  );
}

export function isMetaConfigured(): boolean {
  const cfg = metaConfig();
  return Boolean(cfg.appId && cfg.appSecret && cfg.configId && cfg.verifyToken);
}

/** Development-only simulated onboarding when Meta App credentials are not set. */
export function isWhatsAppDemoMode(): boolean {
  if (isDirectMetaConfigured()) return false;
  if (process.env["NODE_ENV"] === "production" && process.env["WHATSAPP_DEMO_MODE"] !== "1") {
    return false;
  }
  if (isMetaConfigured()) return false;
  return (
    process.env["WHATSAPP_DEMO_MODE"] === "1" ||
    process.env["MOCK_INTEGRATIONS_ENABLED"] === "1"
  );
}

export function graphBaseUrl(): string {
  return `https://graph.facebook.com/${metaConfig().graphVersion}`;
}
