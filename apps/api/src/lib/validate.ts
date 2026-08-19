import type { Context, ValidationTargets } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";

import { fail, validationDetails } from "./http";

export function validate<T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result, c: Context) => {
    if (!result.success) {
      return fail(c, 422, "VALIDATION_ERROR", "Invalid request", validationDetails(result.error));
    }
    return undefined;
  });
}
