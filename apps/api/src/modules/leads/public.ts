import { Hono } from "hono";
import { ingestPublicLeadByClinicSlug, writeAuditLog } from "@smrkomed/database";

import { env } from "../../config/env";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { createMemoryRateLimiter } from "../../middleware/rate-limit";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { getLeadSourceAdapter } from "../crm/adapters";
import { publicLeadSchema } from "../leads/schemas";

const ingestLimiter = createMemoryRateLimiter(8, 60_000);

export const publicLeadRoutes = new Hono<AppEnv>()
  .post("/leads", validate("json", publicLeadSchema), async (c) => {
    const rawLen = Number(c.req.header("content-length") ?? "0");
    if (rawLen > 8_192) {
      throw new HttpError(422, "PAYLOAD_TOO_LARGE", "Payload is too large.");
    }
    if (!env.rateLimitDisabled) {
      const key = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      if (!ingestLimiter.consume(`public-lead:${key}`).allowed) {
        throw new HttpError(429, "RATE_LIMITED", "Too many lead submissions. Please try later.");
      }
    }
    const body = c.req.valid("json");
    let lead;
    try {
      lead = await ingestPublicLeadByClinicSlug({
        clinicSlug: body.clinicSlug,
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        location: body.location || null,
        treatment: body.treatment || null,
        utmSource: body.utmSource || null,
        utmMedium: body.utmMedium || null,
        utmCampaign: body.utmCampaign || null,
        utmTerm: body.utmTerm || null,
        utmContent: body.utmContent || null,
        landingPage: body.landingPage || null,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Clinic not found.") {
        throw new HttpError(404, "RESOURCE_NOT_FOUND", "Clinic not found.");
      }
      throw error;
    }
    await writeAuditLog({
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      action: "lead.ingest",
      entityType: "Lead",
      entityId: lead.id,
      metadata: { source: "WEBSITE" },
    });
    return ok(
      c,
      {
        id: lead.id,
        status: lead.status,
        source: lead.source,
      },
      201,
    );
  })
  .post("/leads/adapters/:provider", async (c) => {
    getLeadSourceAdapter(c.req.param("provider"));
    throw new HttpError(501, "NOT_IMPLEMENTED", "This lead adapter is not implemented.");
  });
