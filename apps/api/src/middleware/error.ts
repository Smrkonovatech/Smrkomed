import type { ErrorHandler } from "hono";
import { isTenantAccessError } from "@smrkomed/database";
import { ZodError } from "zod";

import { CreateCoupleFailedError, HttpError } from "../lib/errors";
import { fail } from "../lib/http";
import { isIntegrationError } from "../integrations/core/errors";

const HTTP_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429, 500, 501]);

function prismaFields(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {
      code: "",
      message: "",
      meta: undefined as unknown,
      name: "",
      stack: undefined as string | undefined,
    };
  }
  const e = error as {
    code?: unknown;
    message?: unknown;
    meta?: unknown;
    name?: unknown;
    stack?: unknown;
  };
  return {
    code: typeof e.code === "string" ? e.code : "",
    message: typeof e.message === "string" ? e.message : "",
    meta: e.meta,
    name: typeof e.name === "string" ? e.name : "",
    stack: typeof e.stack === "string" ? e.stack : undefined,
  };
}

function safeMeta(meta: unknown) {
  if (!meta || typeof meta !== "object") return meta ?? null;
  const record = meta as Record<string, unknown>;
  return {
    ...(typeof record["modelName"] === "string" ? { modelName: record["modelName"] } : {}),
    ...(typeof record["field_name"] === "string" ? { field_name: record["field_name"] } : {}),
    ...(typeof record["constraint"] === "string" ? { constraint: record["constraint"] } : {}),
    ...(Array.isArray(record["target"]) ? { target: record["target"] } : {}),
    ...(typeof record["column_name"] === "string" ? { column_name: record["column_name"] } : {}),
  };
}

function p2003Message(meta: unknown) {
  const field =
    meta && typeof meta === "object" && "field_name" in meta && typeof meta.field_name === "string"
      ? meta.field_name
      : "";
  const constraint =
    meta && typeof meta === "object" && "constraint" in meta && typeof meta.constraint === "string"
      ? meta.constraint
      : "";
  const haystack = `${field} ${constraint}`.toLowerCase();
  if (haystack.includes("assigneddoctor") || haystack.includes("doctor")) {
    return {
      code: "DOCTOR_NOT_FOUND",
      message: "Selected doctor is no longer available. Please select another.",
    };
  }
  if (haystack.includes("assignedcoordinator") || haystack.includes("coordinator")) {
    return {
      code: "COORDINATOR_NOT_FOUND",
      message: "Selected coordinator is no longer available. Please select another.",
    };
  }
  if (haystack.includes("createdby") || haystack.includes("user")) {
    return {
      code: "INVALID_REFERENCE",
      message:
        "This login is not linked to a clinic staff account in the database. Sign out and sign in again.",
    };
  }
  if (haystack.includes("clinic")) {
    return {
      code: "CLINIC_NOT_FOUND",
      message: "This login is not linked to a clinic in the database. Sign out and sign in again.",
    };
  }
  return {
    code: "INVALID_REFERENCE",
    message: "Unable to create the patient because a related record is missing. Try again.",
  };
}

function createCoupleUserMessage(step: string) {
  switch (step) {
    case "CARE_PLAN":
    case "CARE_TASK":
      return "Patient could not be created because the care plan could not be saved.";
    case "CONSENT":
      return "Patient could not be created because WhatsApp consent could not be saved.";
    case "STAFF_RESOLVE":
      return "Selected doctor or coordinator is no longer available. Please select another.";
    case "CLINIC_LOOKUP":
      return "This login is not linked to a clinic in the database. Sign out and sign in again.";
    default:
      return "Unable to create the patient. Please try again.";
  }
}

export const onError: ErrorHandler = (error, c) => {
  if (error instanceof HttpError) {
    const status = HTTP_STATUSES.has(error.status)
      ? (error.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 501)
      : 500;
    return fail(c, status, error.code, error.message, error.details);
  }

  if (error instanceof CreateCoupleFailedError) {
    const fields = prismaFields(error.causeError);
    console.error("CREATE_COUPLE_FAILED", {
      requestId: error.requestId,
      step: error.step,
      prismaCode: fields.code || null,
      message: fields.message || error.message,
      meta: safeMeta(fields.meta),
      clinicId: error.clinicId,
      userId: error.userId,
    });

    if (fields.code === "P2003") {
      const mapped = p2003Message(fields.meta);
      return fail(
        c,
        409,
        mapped.code,
        `${mapped.message} Reference: ${error.requestId}`,
        { step: error.step, prismaCode: fields.code },
        { requestId: error.requestId },
      );
    }
    if (fields.code === "P2002") {
      return fail(
        c,
        409,
        "CONFLICT",
        `A matching record already exists. Reference: ${error.requestId}`,
        { step: error.step, prismaCode: fields.code },
        { requestId: error.requestId },
      );
    }
    if (fields.code === "P2011" || fields.code === "P2022") {
      return fail(
        c,
        500,
        "CREATE_COUPLE_FAILED",
        `${createCoupleUserMessage(error.step)} Reference: ${error.requestId}`,
        { step: error.step, prismaCode: fields.code },
        { requestId: error.requestId },
      );
    }

    const message = `${createCoupleUserMessage(error.step)} Reference: ${error.requestId}`;
    return fail(
      c,
      500,
      "CREATE_COUPLE_FAILED",
      message,
      { step: error.step, prismaCode: fields.code || null },
      { requestId: error.requestId },
    );
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

  const fields = prismaFields(error);
  if (fields.code === "P2003") {
    const mapped = p2003Message(fields.meta);
    return fail(c, 409, mapped.code, mapped.message);
  }
  if (fields.code === "P2002") {
    return fail(c, 409, "CONFLICT", "A matching record already exists.");
  }

  console.error("API error:", {
    name: fields.name || (error instanceof Error ? error.name : "unknown"),
    code: fields.code || null,
    message: fields.message || (error instanceof Error ? error.message : "unknown"),
    meta: safeMeta(fields.meta),
  });
  return fail(c, 500, "INTERNAL_ERROR", "Unable to create the patient. Please try again.");
};
