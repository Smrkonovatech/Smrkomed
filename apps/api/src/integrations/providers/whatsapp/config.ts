export function metaConfig() {
  return {
    appId: process.env["META_APP_ID"] ?? "",
    appSecret: process.env["META_APP_SECRET"] ?? "",
    configId: process.env["WHATSAPP_CONFIGURATION_ID"] ?? "",
    verifyToken: process.env["WHATSAPP_VERIFY_TOKEN"] ?? "",
    graphVersion: process.env["META_GRAPH_API_VERSION"] ?? "v21.0",
  };
}

export function isMetaConfigured() {
  const cfg = metaConfig();
  return Boolean(cfg.appId && cfg.appSecret && cfg.configId && cfg.verifyToken);
}

/** Development-only simulated onboarding when Meta App credentials are not set. */
export function isWhatsAppDemoMode() {
  if (process.env["NODE_ENV"] === "production" && process.env["WHATSAPP_DEMO_MODE"] !== "1") {
    return false;
  }
  if (isMetaConfigured()) return false;
  return (
    process.env["WHATSAPP_DEMO_MODE"] === "1" ||
    process.env["MOCK_INTEGRATIONS_ENABLED"] === "1"
  );
}

export function graphBaseUrl() {
  return `https://graph.facebook.com/${metaConfig().graphVersion}`;
}
