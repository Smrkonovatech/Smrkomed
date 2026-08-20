import type { Context } from "hono";
import type { ZodError } from "zod";

export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 501;

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json({ success: true as const, data }, status);
}

export function fail(
  c: Context,
  status: ApiErrorStatus,
  code: string,
  message: string,
  details?: unknown,
  extras?: { requestId?: string },
) {
  return c.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(extras?.requestId ? { requestId: extras.requestId } : {}),
        ...(details === undefined ? {} : { details }),
      },
    },
    status,
  );
}

export function validationDetails(error: ZodError) {
  return error.flatten();
}
