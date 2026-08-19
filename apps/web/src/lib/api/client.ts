export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function apiBaseUrl() {
  if (typeof window !== "undefined") return "";
  return process.env["API_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
}

type Envelope<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

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
    const error = body && "error" in body ? body.error : { code: "HTTP_ERROR", message: "Request failed" };
    throw new ApiError(response.status, error.code, error.message);
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
