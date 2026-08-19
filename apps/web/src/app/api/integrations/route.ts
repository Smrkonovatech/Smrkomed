import { NextRequest } from "next/server";

import { fail, ok, serverError, unauthorized } from "@/lib/api/response";
import { requireSession } from "@/lib/auth";
import { tenantErrorResponse } from "@/server/authz";
import { listIntegrations } from "@/server/services/integrations";

const providers = new Set<string>([
  "WHATSAPP_CLOUD",
  "META_ADS",
  "GOOGLE_ADS",
  "GOOGLE_CALENDAR",
  "RAZORPAY",
  "SMS",
  "EMAIL",
  "VOICE",
  "EMR",
  "ABDM",
]);

export async function GET() {
  const ctx = await requireSession();
  if (ctx instanceof Response) return ctx;
  if (ctx.userId.startsWith("demo:")) {
    return ok({ integrations: [], demo: true });
  }
  try {
    const integrations = await listIntegrations(ctx);
    return ok({ integrations });
  } catch (error) {
    return tenantErrorResponse(error) ?? serverError("Could not load integrations.");
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireSession();
  if (ctx instanceof Response) return ctx;
  if (ctx.userId.startsWith("demo:")) {
    return unauthorized("Connect a live clinic workspace to save integrations.");
  }

  try {
    const body = (await request.json()) as {
      provider?: string;
      action?: string;
      clinicId?: string;
      organizationId?: string;
    };
    if (body.clinicId && body.clinicId !== ctx.clinicId && ctx.role !== "ORGANIZATION_ADMIN") {
      return fail(403, "FORBIDDEN", "You cannot access another clinic.");
    }
    if (body.organizationId && body.organizationId !== ctx.organizationId) {
      return fail(403, "FORBIDDEN", "You cannot access another organization.");
    }
    const provider = body.provider;
    if (!provider || !providers.has(provider)) {
      return fail(422, "VALIDATION_ERROR", "Unknown integration.");
    }
    return fail(501, "PROVIDER_NOT_IMPLEMENTED", "External provider connect and disconnect are not implemented yet.");
  } catch (error) {
    const mapped = tenantErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : "Could not update integration.";
    return serverError(message);
  }
}
