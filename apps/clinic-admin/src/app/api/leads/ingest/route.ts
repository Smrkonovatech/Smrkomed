import { ingestPublicLeadByClinicSlug, writeAuditLog } from "@smrkomed/database";
import { NextRequest } from "next/server";

import { created, notFound, validationError } from "@/lib/api/response";
import { websiteLeadSchema } from "@/lib/validations/onboarding";

const WINDOW_MS = 60_000;
const MAX = 8;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX;
}

export async function POST(request: NextRequest) {
  try {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > 8_192) {
      return validationError(new Error("Payload is too large."));
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (rateLimited(`ingest:${ip}`)) {
      return new Response(JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "Too many lead submissions." } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    const body: unknown = await request.json();
    const parsed = websiteLeadSchema.parse(body);
    const lead = await ingestPublicLeadByClinicSlug({
      clinicSlug: parsed.clinicSlug,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email || null,
      location: parsed.location || null,
      treatment: parsed.treatment || null,
      utmSource: parsed.utmSource || null,
      utmMedium: parsed.utmMedium || null,
      utmCampaign: parsed.utmCampaign || null,
      utmTerm: parsed.utmTerm || null,
      utmContent: parsed.utmContent || null,
      landingPage: parsed.landingPage || null,
    });
    await writeAuditLog({
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      action: "lead.ingest",
      entityType: "Lead",
      entityId: lead.id,
      metadata: { source: "WEBSITE" },
    });
    return created({
      id: lead.id,
      status: lead.status,
      source: lead.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not capture lead.";
    if (message === "Clinic not found.") return notFound(message);
    return validationError(error);
  }
}
