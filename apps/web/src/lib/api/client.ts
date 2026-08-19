export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const baseUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

type Envelope<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as Envelope<T>;
  if (!("success" in body) || body.success !== true) {
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
