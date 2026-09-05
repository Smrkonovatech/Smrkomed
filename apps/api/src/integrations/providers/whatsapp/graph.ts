import { IntegrationError } from "../../core/errors";
import { graphBaseUrl, metaConfig } from "./config";

export type GraphJson = Record<string, unknown>;

type GraphFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

let graphFetch: GraphFetch = fetch;

export function setWhatsAppGraphFetchForTests(fn: GraphFetch | null) {
  graphFetch = fn ?? fetch;
}

function asRecord(value: unknown): GraphJson {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as GraphJson) : {};
}

function extractSafeMetaErrorMessage(err: GraphJson, fallbackStatus: number): string {
  const rawMsg = typeof err["message"] === "string" ? err["message"] : "";
  const code = typeof err["code"] === "number" ? err["code"] : fallbackStatus;
  const subcode = typeof err["error_subcode"] === "number" ? err["error_subcode"] : null;
  const type = typeof err["type"] === "string" ? err["type"] : "MetaError";

  // Sanitize message: never leak tokens, URLs with query parameters, or secrets
  let safeMsg = rawMsg
    .replace(/access_token=[^&\s]+/gi, "access_token=[REDACTED]")
    .replace(/client_secret=[^&\s]+/gi, "client_secret=[REDACTED]")
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/[a-zA-Z0-9_\-]{40,}/g, "[REDACTED_SECRET]")
    .trim();

  if (!safeMsg) {
    safeMsg = `Meta API request failed with status ${fallbackStatus}`;
  }

  const subcodeStr = subcode ? ` (subcode ${subcode})` : "";
  return `Meta WhatsApp API error [${type} code ${code}${subcodeStr}]: ${safeMsg}`;
}

export async function graphRequest(path: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${graphBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await graphFetch(url, init);
  const text = await response.text();
  let json: GraphJson = {};
  try {
    json = text ? (JSON.parse(text) as GraphJson) : {};
  } catch {
    json = {};
  }
  if (!response.ok) {
    const err = asRecord(json["error"]);
    const code = typeof err["code"] === "number" ? err["code"] : response.status;
    const subcode = typeof err["error_subcode"] === "number" ? err["error_subcode"] : undefined;
    const errType = typeof err["type"] === "string" ? err["type"] : undefined;
    const safeMsg = extractSafeMetaErrorMessage(err, response.status);

    console.error(
      `[Meta Graph API Error] Path: ${path.split("?")[0]} | Status: ${response.status} | Code: ${code} | Subcode: ${subcode ?? "none"} | Type: ${errType ?? "none"} | Error: ${safeMsg}`,
    );

    if (code === 190) {
      throw new IntegrationError("AUTHORIZATION_EXPIRED", safeMsg, 401);
    }
    if (code === 4 || code === 80007) {
      throw new IntegrationError("PROVIDER_RATE_LIMITED", safeMsg, 429, true);
    }
    throw new IntegrationError("PROVIDER_UNAVAILABLE", safeMsg, 500, true);
  }
  return json;
}

export async function exchangeEmbeddedSignupCode(code: string) {
  const cfg = metaConfig();
  if (!cfg.appId || !cfg.appSecret) {
    throw new IntegrationError("PROVIDER_UNAVAILABLE", "WhatsApp is not configured on this server.", 501);
  }
  const url = new URL(`${graphBaseUrl()}/oauth/access_token`);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("client_secret", cfg.appSecret);
  url.searchParams.set("code", code);
  return graphRequest(url.toString());
}

export async function subscribeWaba(wabaId: string, accessToken: string) {
  return graphRequest(`/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getSubscribedApps(wabaId: string, accessToken: string) {
  return graphRequest(`/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function unsubscribeWaba(wabaId: string, accessToken: string) {
  return graphRequest(`/${wabaId}/subscribed_apps`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getWaba(wabaId: string, accessToken: string) {
  return graphRequest(`/${wabaId}?fields=id,name,currency,timezone_id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getPhoneNumber(phoneNumberId: string, accessToken: string) {
  return graphRequest(
    `/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function listWabaPhones(wabaId: string, accessToken: string) {
  return graphRequest(`/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function listMessageTemplates(wabaId: string, accessToken: string) {
  return graphRequest(
    `/${wabaId}/message_templates?fields=id,name,language,status,category,rejected_reason,components&limit=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export async function sendTemplateMessage(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  name: string;
  language: string;
  parameters: string[];
}) {
  const template: GraphJson = {
    name: input.name,
    language: { code: input.language },
  };
  if (input.parameters.length > 0) {
    template["components"] = [
      {
        type: "body",
        parameters: input.parameters.map((text) => ({ type: "text", text })),
      },
    ];
  }
  return graphRequest(`/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template,
    }),
  });
}

export async function sendTextMessage(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}) {
  return graphRequest(`/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "text",
      text: { preview_url: false, body: input.body.slice(0, 4096) },
    }),
  });
}
