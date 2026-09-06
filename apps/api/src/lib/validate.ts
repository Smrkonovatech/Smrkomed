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
      const flat = result.error.flatten();
      const firstField = Object.entries(flat.fieldErrors)[0];
      const detailMsg = firstField
        ? `${firstField[0]}: ${firstField[1]?.join(", ")}`
        : flat.formErrors.join(", ");
      const message = detailMsg ? `Invalid request: ${detailMsg}` : "Invalid request";
      return fail(c, 422, "VALIDATION_ERROR", message, flat);
    }
    return undefined;
  });
}

