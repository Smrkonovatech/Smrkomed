export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly step?: string;
  readonly prismaCode?: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    extras?: { requestId?: string; step?: string; prismaCode?: string | null },
  ) {
    super(message);
    this.status = status;
    this.code = code;
    if (extras?.requestId) this.requestId = extras.requestId;
    if (extras?.step) this.step = extras.step;
    if (extras?.prismaCode !== undefined) this.prismaCode = extras.prismaCode;
  }
}

function apiBaseUrl() {
  if (typeof window !== "undefined") return "";
  return process.env["API_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
}

type Envelope<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        requestId?: string;
        details?: { requestId?: string; step?: string; prismaCode?: string | null };
      };
    };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      "Unable to reach the clinic API. Confirm the API is running and try again.",
    );
  }

  const text = await response.text();
  let body: Envelope<T> | null = null;
  try {
    body = text ? (JSON.parse(text) as Envelope<T>) : null;
  } catch {
    throw new ApiError(response.status, "HTTP_ERROR", "The clinic API returned an unexpected response.");
  }
  if (!body || !("success" in body) || body.success !== true) {
    const error =
      body && "error" in body
        ? body.error
        : { code: "HTTP_ERROR", message: "Request failed" };
    const requestId = error.requestId ?? error.details?.requestId;
    const step = error.details?.step;
    const prismaCode = error.details?.prismaCode;
    throw new ApiError(response.status, error.code, error.message, {
      ...(requestId ? { requestId } : {}),
      ...(step ? { step } : {}),
      ...(prismaCode !== undefined ? { prismaCode } : {}),
    });
  }
  return body.data;
}

export function apiGet<T>(path: string) {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown = {}) {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown = {}) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}
