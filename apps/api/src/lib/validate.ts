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
      const fieldEntries = Object.entries(flat.fieldErrors);
      const firstField = fieldEntries[0];
      const detailMsg = firstField
        ? `${firstField[0]}: ${firstField[1]?.join(", ")}`
        : flat.formErrors.join(", ");
      const message = detailMsg ? `Invalid request: ${detailMsg}` : "Invalid request";
      const fieldMap = Object.fromEntries(
        fieldEntries.map(([k, v]) => [k, v?.join(", ") ?? "Invalid"]),
      );
      return fail(c, 422, "VALIDATION_ERROR", message, {
        fields: fieldMap,
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
      });
    }
    return undefined;
  });
}

