import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

let loaded = false;

export function loadApiEnv() {
  if (loaded) return;
  loaded = true;
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const file = resolve(dir, ".env");
    if (existsSync(file)) {
      loadDotenv({ path: file, quiet: true });
      break;
    }
    dir = dirname(dir);
  }
}

loadApiEnv();

export const env = {
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  port: Number.parseInt(process.env["PORT"] ?? "4000", 10),
  apiUrl: process.env["API_URL"] ?? "http://localhost:4000",
  webAppUrl: process.env["WEB_APP_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
  authSecret:
    process.env["AUTH_SECRET"] ??
    process.env["NEXTAUTH_SECRET"] ??
    "smrkomed-demo-auth-secret-replace-in-production-32",
  corsOrigins: parseCorsOrigins(),
  rateLimitDisabled: process.env["RATE_LIMIT_DISABLED"] === "1" || process.env["NODE_ENV"] === "test",
  integrationEncryptionKey: process.env["INTEGRATION_ENCRYPTION_KEY"],
  mockIntegrationsEnabled: process.env["MOCK_INTEGRATIONS_ENABLED"] === "1",
  /** In-process WAIT/schedule tick on Railway API. Default on in production. */
  whatsappAutomationWorker:
    process.env["WHATSAPP_AUTOMATION_WORKER"] === "1" ||
    (process.env["WHATSAPP_AUTOMATION_WORKER"] !== "0" &&
      (process.env["NODE_ENV"] ?? "development") === "production"),
  whatsappAutomationWorkerIntervalMs: Number.parseInt(
    process.env["WHATSAPP_AUTOMATION_WORKER_INTERVAL_MS"] ?? "60000",
    10,
  ),
  /** Shared secret for cron/Vercel → POST /whatsapp-automation/internal/tick */
  whatsappWorkerSecret: process.env["WHATSAPP_WORKER_SECRET"] ?? process.env["CRON_SECRET"] ?? "",
  /** ABDM / ABHA — server-only. Never NEXT_PUBLIC_. */
  abdmEnabled: process.env["ABDM_ENABLED"] === "1",
  abdmEnv: (process.env["ABDM_ENV"] ?? "sandbox").toLowerCase() === "production" ? "production" : "sandbox",
  abdmBaseUrl: process.env["ABDM_BASE_URL"]?.trim() || "",
  abdmClientId: process.env["ABDM_CLIENT_ID"]?.trim() || "",
  abdmClientSecret: process.env["ABDM_CLIENT_SECRET"]?.trim() || "",
  abdmFacilityId: process.env["ABDM_FACILITY_ID"]?.trim() || "",
  abdmXCmId: process.env["ABDM_X_CM_ID"]?.trim() || "",
  /** Allows local SANDBOX link intents without claiming gateway OTP success. */
  abdmDemoMode: process.env["ABDM_DEMO_MODE"] === "1",
};

function parseCorsOrigins() {
  const raw = process.env["CORS_ORIGINS"] ?? process.env["WEB_APP_URL"] ?? "http://localhost:3000";
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProd = (process.env["NODE_ENV"] ?? "development") === "production";
  if (isProd) {
    return origins.filter((origin) => origin !== "*");
  }
  for (const local of ["http://localhost:3000", "http://localhost:3001"]) {
    if (!origins.includes(local)) origins.push(local);
  }
  return origins;
}

export function sessionCookieName() {
  return env.webAppUrl.startsWith("https://") ? "__Secure-authjs.session-token" : "authjs.session-token";
}
