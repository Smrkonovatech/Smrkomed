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

/** Permanent Meta Graph codes — do not retry indefinitely. */
const META_PERMANENT_CODES = new Set([
  10, // Permission denied
  100, // Invalid parameter
  200, // Permissions error
  190, // OAuth / token
  131026, // Undeliverable / invalid recipient
  131047, // Outside allowed window / re-engagement
  131051, // Unsupported message type
  132000, // Template param count mismatch
  132001, // Template does not exist
  132005, // Template text too long
  132007, // Template format mismatch
  132012, // Template param format
  132015, // Template paused
  132016, // Template disabled
  133010, // Account locked / restricted
]);

const META_RATE_LIMIT_CODES = new Set([4, 80007, 130429]);

/**
 * Maps Meta Graph error codes to IntegrationError classification.
 * Transient (rate limit / 5xx) → retryable. Permanent validation/auth → not retryable.
 */
export function mapMetaGraphError(input: {
  httpStatus: number;
  code: number;
  subcode?: number;
  safeMessage: string;
}): IntegrationError {
  const { httpStatus, code, safeMessage } = input;

  if (code === 190) {
    return new IntegrationError("AUTHORIZATION_EXPIRED", safeMessage, 401);
  }
  if (META_RATE_LIMIT_CODES.has(code) || httpStatus === 429) {
    return new IntegrationError("PROVIDER_RATE_LIMITED", safeMessage, 429, true);
  }
  if (code === 131026 || code === 131047) {
    return new IntegrationError("INVALID_RECIPIENT", safeMessage, 422);
  }
  if (
    code === 132000 ||
    code === 132001 ||
    code === 132005 ||
    code === 132007 ||
    code === 132012 ||
    code === 132015 ||
    code === 132016 ||
    code === 131051
  ) {
    return new IntegrationError("INVALID_TEMPLATE", safeMessage, 422);
  }
  if (code === 10 || code === 200 || code === 133010) {
    return new IntegrationError("AUTHORIZATION_FAILED", safeMessage, 403);
  }
  if (META_PERMANENT_CODES.has(code) || (httpStatus >= 400 && httpStatus < 500 && httpStatus !== 429)) {
    // Generic Meta #100 = invalid parameter (OAuth code, message payload, etc.) — permanent, not a template-specific code.
    if (code === 100) {
      return new IntegrationError("AUTHORIZATION_FAILED", safeMessage, 400);
    }
    return new IntegrationError("MESSAGE_SEND_FAILED", safeMessage, httpStatus === 404 ? 404 : 422);
  }
  // 5xx / unknown server-side → transient
  return new IntegrationError("PROVIDER_UNAVAILABLE", safeMessage, 500, true);
}

export async function graphRequest(path: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${graphBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;
  try {
    response = await graphFetch(url, init);
  } catch {
    throw new IntegrationError(
      "CONNECTION_FAILED",
      "Temporary network error talking to Meta WhatsApp API.",
      500,
      true,
    );
  }
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

    throw mapMetaGraphError({
      httpStatus: response.status,
      code,
      ...(subcode !== undefined ? { subcode } : {}),
      safeMessage: safeMsg,
    });
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

export type TemplateSendComponentParameters = {
  header?: string[];
  body?: string[];
  buttons?: Array<{ index: number; parameters: string[]; subType?: string }>;
};

export async function sendTemplateMessage(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  name: string;
  language: string;
  /** Legacy body-only positional parameters */
  parameters?: string[];
  /** Structured header / body / button parameters */
  componentParameters?: TemplateSendComponentParameters;
}) {
  const template: GraphJson = {
    name: input.name,
    language: { code: input.language },
  };

  const components: GraphJson[] = [];
  const header = input.componentParameters?.header ?? [];
  const body =
    input.componentParameters?.body ??
    (input.parameters && input.parameters.length > 0 ? input.parameters : []);
  const buttons = input.componentParameters?.buttons ?? [];

  if (header.length > 0) {
    components.push({
      type: "header",
      parameters: header.map((text) => ({ type: "text", text: text.slice(0, 60) })),
    });
  }
  if (body.length > 0) {
    components.push({
      type: "body",
      parameters: body.map((text) => ({ type: "text", text: text.slice(0, 1024) })),
    });
  }
  for (const btn of buttons) {
    if (!btn.parameters.length) continue;
    components.push({
      type: "button",
      sub_type: (btn.subType ?? "url").toLowerCase(),
      index: String(btn.index),
      parameters: btn.parameters.map((text) => ({ type: "text", text: text.slice(0, 200) })),
    });
  }

  if (components.length > 0) {
    template["components"] = components;
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

export interface MetaMediaMetadata {
  id: string;
  url: string;
  mimeType: string;
  sha256?: string | undefined;
  fileSizeBytes?: number | undefined;
}

export async function getWhatsAppMediaMetadata(mediaId: string, accessToken: string): Promise<MetaMediaMetadata> {
  const json = await graphRequest(`/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return {
    id: String(json["id"] ?? mediaId),
    url: String(json["url"] ?? ""),
    mimeType: String(json["mime_type"] ?? "application/octet-stream"),
    sha256: typeof json["sha256"] === "string" ? json["sha256"] : undefined,
    fileSizeBytes: typeof json["file_size"] === "number" ? json["file_size"] : undefined,
  };
}

export async function downloadWhatsAppMediaBinary(
  downloadUrl: string,
  accessToken: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await graphFetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "SmrkoMed/1.0",
    },
  });
  if (!response.ok) {
    const status: 400 | 401 | 403 | 404 | 429 | 500 =
      response.status === 401
        ? 401
        : response.status === 403
          ? 403
          : response.status === 404
            ? 404
            : response.status === 429
              ? 429
              : 500;
    throw new IntegrationError(
      "PROVIDER_UNAVAILABLE",
      `Failed to download media from Meta Graph API (status ${response.status})`,
      status,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType,
  };
}

/**
 * Upload binary media to Meta Cloud API for later send.
 * Returns Meta media ID — never returned to browsers as a secret context.
 */
export async function uploadWhatsAppMedia(input: {
  phoneNumberId: string;
  accessToken: string;
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<{ id: string }> {
  const form = new FormData();
  form.set("messaging_product", "whatsapp");
  form.set("type", input.mimeType.split(";")[0]?.trim() || input.mimeType);
  const bytes = new Uint8Array(input.buffer);
  const blob = new Blob([bytes], { type: input.mimeType });
  form.set("file", blob, input.filename || "file");

  const json = await graphRequest(`/${input.phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      // Let fetch set multipart boundary — do not set Content-Type manually
    },
    body: form,
  });

  const id = typeof json["id"] === "string" ? json["id"] : "";
  if (!id) {
    throw new IntegrationError("PROVIDER_UNAVAILABLE", "Meta did not return a media ID for the upload.", 500);
  }
  return { id };
}

export async function sendMediaMessage(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  type: "image" | "video" | "document" | "audio";
  mediaId: string;
  caption?: string;
  filename?: string;
  /** WhatsApp voice note flag (audio only) */
  voice?: boolean;
}) {
  const mediaPayload: GraphJson = { id: input.mediaId };
  if (input.caption && (input.type === "image" || input.type === "video" || input.type === "document")) {
    mediaPayload["caption"] = input.caption.slice(0, 1024);
  }
  if (input.type === "document" && input.filename) {
    mediaPayload["filename"] = input.filename.slice(0, 240);
  }
  if (input.type === "audio" && input.voice) {
    // Meta accepts voice notes as audio with voice:true on some API versions via type audio
  }

  const body: GraphJson = {
    messaging_product: "whatsapp",
    to: input.to,
    type: input.type,
    [input.type]: mediaPayload,
  };

  return graphRequest(`/${input.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

