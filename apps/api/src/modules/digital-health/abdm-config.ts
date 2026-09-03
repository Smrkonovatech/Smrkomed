import { randomUUID } from "node:crypto";
import { env } from "../../config/env";

export const ABDM_DEFAULT_SANDBOX_URL = "https://dev.abdm.gov.in/gateway";

export function getAbdmConfig() {
  const isEnabled = env.abdmEnabled || process.env["ABDM_ENABLED"] === "1";
  const rawBaseUrl = env.abdmBaseUrl?.trim() || process.env["ABDM_BASE_URL"]?.trim();
  const environment: "production" | "sandbox" =
    ((env.abdmEnv ?? process.env["ABDM_ENV"]) ?? "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
  
  // In sandbox, if base URL is not specified or blank, default to official ABDM sandbox gateway
  const baseUrl = rawBaseUrl || (environment === "sandbox" ? ABDM_DEFAULT_SANDBOX_URL : "");
  const clientId = (process.env["ABDM_CLIENT_ID"] !== undefined ? process.env["ABDM_CLIENT_ID"] : env.abdmClientId)?.trim() || "";
  const clientSecret = (process.env["ABDM_CLIENT_SECRET"] !== undefined ? process.env["ABDM_CLIENT_SECRET"] : env.abdmClientSecret)?.trim() || "";
  const facilityId = (process.env["ABDM_FACILITY_ID"] !== undefined ? process.env["ABDM_FACILITY_ID"] : env.abdmFacilityId)?.trim() || "";
  const xCmId = (process.env["ABDM_X_CM_ID"] !== undefined ? process.env["ABDM_X_CM_ID"] : env.abdmXCmId)?.trim() || (environment === "sandbox" ? "sbx" : "");
  const callbackBaseUrl = (process.env["ABDM_CALLBACK_BASE_URL"] !== undefined ? process.env["ABDM_CALLBACK_BASE_URL"] : env.abdmCallbackBaseUrl)?.trim() || "";
  const demoMode = process.env["ABDM_DEMO_MODE"] !== undefined
    ? (process.env["ABDM_DEMO_MODE"] === "1" || process.env["ABDM_DEMO_MODE"] === "true")
    : env.abdmDemoMode;

  const isConfigured = Boolean(
    isEnabled && baseUrl && clientId && clientSecret,
  );

  return {
    isEnabled,
    environment,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    clientId,
    clientSecret,
    facilityId,
    xCmId,
    callbackBaseUrl: callbackBaseUrl.replace(/\/+$/, ""),
    demoMode,
    isConfigured,
  };
}

export function buildGatewayHeaders(input: {
  token: string;
  requestId?: string;
  timestamp?: string;
  xCmId?: string;
}): Record<string, string> {
  const requestId = input.requestId || randomUUID();
  const timestamp = input.timestamp || new Date().toISOString();
  const config = getAbdmConfig();
  const cmId = input.xCmId || config.xCmId || "sbx";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${input.token}`,
    "REQUEST-ID": requestId,
    TIMESTAMP: timestamp,
  };

  if (cmId) {
    headers["X-CM-ID"] = cmId;
  }

  if (config.facilityId) {
    headers["X-HIP-ID"] = config.facilityId;
  }

  return headers;
}

/**
 * Strips any sensitive secrets or raw tokens from error messages or logs.
 */
export function scrubAbdmSecrets(text: string): string {
  const config = getAbdmConfig();
  let sanitized = text;
  if (config.clientSecret) {
    sanitized = sanitized.replaceAll(config.clientSecret, "[REDACTED_CLIENT_SECRET]");
  }
  if (config.clientId) {
    sanitized = sanitized.replaceAll(config.clientId, "[REDACTED_CLIENT_ID]");
  }
  // Scrub Bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, "Bearer [REDACTED_TOKEN]");
  return sanitized;
}
