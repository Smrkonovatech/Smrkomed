export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function unauthenticated(message = "Unauthenticated") {
  return new HttpError(401, "UNAUTHENTICATED", message);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found") {
  return new HttpError(404, "RESOURCE_NOT_FOUND", message);
}
