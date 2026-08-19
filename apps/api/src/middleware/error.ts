import type { ErrorHandler } from "hono";
import { isTenantAccessError } from "@smrkomed/database";
import { ZodError } from "zod";

import { HttpError } from "../lib/errors";
import { fail } from "../lib/http";
import { isIntegrationError } from "../integrations/core/errors";

const HTTP_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429, 500, 501]);

export const onError: ErrorHandler = (error, c) => {
  if (error instanceof HttpError) {
    const status = HTTP_STATUSES.has(error.status)
      ? (error.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 501)
      : 500;
    return fail(c, status, error.code, error.message, error.details);
  }
  if (isIntegrationError(error)) {
    return fail(c, error.httpStatus, error.code, error.message);
  }
  if (isTenantAccessError(error)) {
    return fail(c, 403, "FORBIDDEN", error.message);
  }
  if (error instanceof ZodError) {
    return fail(c, 422, "VALIDATION_ERROR", "Invalid request", error.flatten());
  }
  console.error("API error:", error instanceof Error ? error.message : "unknown");
  return fail(c, 500, "INTERNAL_ERROR", "Internal server error");
};
