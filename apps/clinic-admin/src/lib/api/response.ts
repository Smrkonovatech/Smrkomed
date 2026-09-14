import type { StaffRole } from "@smrkomed/database";
import { ZodError } from "zod";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiErrorBody = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, {
    status: 200,
    ...init,
  });
}

export function created<T>(data: T) {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, { status: 201 });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorBody = {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return Response.json(body, { status });
}

export function unauthorized(message = "Unauthorized") {
  return fail(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return fail(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found") {
  return fail(404, "RESOURCE_NOT_FOUND", message);
}

export function conflict(message: string) {
  return fail(409, "CONFLICT", message);
}

export function validationError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(422, "VALIDATION_ERROR", "Invalid request", error.flatten());
  }
  return fail(422, "VALIDATION_ERROR", "Invalid request");
}

export function serverError(message = "Internal server error") {
  return fail(500, "INTERNAL_ERROR", message);
}

export type SessionClinicContext = {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  clinicId: string;
  clinicName: string;
  role: StaffRole;
};
