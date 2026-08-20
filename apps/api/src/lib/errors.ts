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

/** Stable create-couple failure steps for logs and client reference matching. */
export type CreateCoupleStep =
  | "VALIDATE_INPUT"
  | "AUTH"
  | "CLINIC_LOOKUP"
  | "STAFF_RESOLVE"
  | "PATIENT_PRIMARY"
  | "PATIENT_PARTNER"
  | "COUPLE"
  | "TREATMENT"
  | "CARE_PLAN"
  | "CARE_TASK"
  | "CONSENT"
  | "LOAD_COUPLE"
  | "SERIALIZE"
  | "UNKNOWN";

export class CreateCoupleFailedError extends Error {
  readonly code = "CREATE_COUPLE_FAILED";
  readonly requestId: string;
  readonly step: CreateCoupleStep;
  readonly clinicId: string;
  readonly userId: string;
  readonly causeError: unknown;

  constructor(input: {
    requestId: string;
    step: CreateCoupleStep;
    clinicId: string;
    userId: string;
    cause: unknown;
  }) {
    const message = input.cause instanceof Error ? input.cause.message : "Unknown create couple failure";
    super(message);
    this.name = "CreateCoupleFailedError";
    this.requestId = input.requestId;
    this.step = input.step;
    this.clinicId = input.clinicId;
    this.userId = input.userId;
    this.causeError = input.cause;
  }
}

export function newCreateCoupleRequestId() {
  return `CC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
