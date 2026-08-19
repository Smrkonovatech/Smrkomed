import { createLeadForTenant, ingestPublicLeadByClinicSlug, type TenantContext } from "@smrkomed/database";
import { websiteLeadSchema } from "@/lib/validations/onboarding";

export async function ingestWebsiteLead(input: unknown) {
  const parsed = websiteLeadSchema.parse(input);
  return ingestPublicLeadByClinicSlug({
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
}

export async function createAuthenticatedLead(
  ctx: TenantContext,
  input: { name: string; phone?: string | null; email?: string | null; clinicId?: string | null },
) {
  return createLeadForTenant(ctx, {
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    source: "WALK_IN",
    clinicId: input.clinicId ?? null,
  });
}
