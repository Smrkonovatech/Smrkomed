import type { IntegrationProvider, LeadSource } from "@prisma/client";

import { prisma } from "./client";
import { TenantAccessError } from "./errors";
import { normalizeEmail, phoneSuffix, phonesLikelyMatch } from "./phone";
import {
  assertClinicAccess,
  organizationScope,
  resolveAuthorizedClinic,
  type TenantContext,
} from "./tenant";

export async function getPatientsForClinic(ctx: TenantContext, requestedClinicId?: string) {
  const clinic = await resolveAuthorizedClinic(ctx, requestedClinicId);
  return prisma.patient.findMany({
    where: { clinicId: clinic.id, clinic: { organizationId: ctx.organizationId } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCarePlansForClinic(ctx: TenantContext, requestedClinicId?: string) {
  const clinic = await resolveAuthorizedClinic(ctx, requestedClinicId);
  return prisma.carePlan.findMany({
    where: { clinicId: clinic.id, clinic: { organizationId: ctx.organizationId } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAppointmentsForClinic(ctx: TenantContext, requestedClinicId?: string) {
  const clinic = await resolveAuthorizedClinic(ctx, requestedClinicId);
  return prisma.appointment.findMany({
    where: { clinicId: clinic.id, clinic: { organizationId: ctx.organizationId } },
    orderBy: { startsAt: "desc" },
  });
}

export async function getLeadsForOrganization(ctx: TenantContext) {
  return prisma.lead.findMany({
    where: organizationScope(ctx),
    orderBy: { createdAt: "desc" },
  });
}

export async function findDuplicateLeads(input: {
  organizationId: string;
  clinicId?: string | null;
  phone?: string | null;
  email?: string | null;
  excludeLeadId?: string;
}) {
  const email = normalizeEmail(input.email);
  const suffix = phoneSuffix(input.phone);
  if (!email && !suffix) return [];

  const or: Array<{ email?: string; phone?: { contains: string } }> = [];
  if (email) or.push({ email });
  if (suffix.length >= 8) or.push({ phone: { contains: suffix } });

  const candidates = await prisma.lead.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.clinicId ? { clinicId: input.clinicId } : {}),
      ...(input.excludeLeadId ? { id: { not: input.excludeLeadId } } : {}),
      OR: or,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return candidates.filter(
    (row) =>
      (email && normalizeEmail(row.email) === email) || phonesLikelyMatch(row.phone, input.phone),
  );
}

export async function createLeadForTenant(
  ctx: TenantContext,
  input: {
    name: string;
    phone?: string | null;
    email?: string | null;
    source: LeadSource;
    clinicId?: string | null;
    sourceDetail?: string | null;
    campaignId?: string | null;
    campaign?: string | null;
    medium?: string | null;
    location?: string | null;
    treatmentInterest?: string | null;
    preferredLanguage?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
    landingPage?: string | null;
    externalLeadId?: string | null;
  },
) {
  let clinicId = input.clinicId ?? ctx.clinicId;
  if (clinicId) {
    await assertClinicAccess(ctx, clinicId);
  } else {
    clinicId = ctx.clinicId;
  }

  return prisma.lead.create({
    data: {
      organizationId: ctx.organizationId,
      clinicId,
      name: input.name,
      phone: input.phone ?? null,
      email: normalizeEmail(input.email),
      source: input.source,
      sourceDetail: input.sourceDetail ?? null,
      campaignId: input.campaignId ?? null,
      campaign: input.campaign ?? null,
      medium: input.medium ?? null,
      location: input.location ?? null,
      treatmentInterest: input.treatmentInterest ?? null,
      preferredLanguage: input.preferredLanguage ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      utmTerm: input.utmTerm ?? null,
      utmContent: input.utmContent ?? null,
      landingPage: input.landingPage ?? null,
      externalLeadId: input.externalLeadId ?? null,
      status: "NEW",
      stage: "NEW_LEAD",
      lastActivityAt: new Date(),
    },
  });
}

export async function ingestPublicLeadByClinicSlug(input: {
  clinicSlug: string;
  name: string;
  phone: string;
  email?: string | null;
  location?: string | null;
  treatment?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  landingPage?: string | null;
}) {
  const clinic = await prisma.clinic.findUnique({
    where: { slug: input.clinicSlug },
    select: { id: true, organizationId: true },
  });
  if (!clinic) {
    throw new Error("Clinic not found.");
  }

  const duplicates = await findDuplicateLeads({
    organizationId: clinic.organizationId,
    clinicId: clinic.id,
    phone: input.phone,
    ...(input.email === undefined ? {} : { email: input.email }),
  });
  if (duplicates[0]) {
    const existing = duplicates[0];
    await prisma.leadActivity.create({
      data: {
        leadId: existing.id,
        organizationId: clinic.organizationId,
        clinicId: clinic.id,
        type: "NOTE_ADDED",
        description: "Repeat website enquiry received for this contact.",
        metadata: { source: "WEBSITE", duplicate: true },
      },
    });
    return prisma.lead.update({
      where: { id: existing.id },
      data: { lastActivityAt: new Date() },
    });
  }

  const lead = await prisma.lead.create({
    data: {
      organizationId: clinic.organizationId,
      clinicId: clinic.id,
      name: input.name,
      phone: input.phone,
      email: normalizeEmail(input.email),
      source: "WEBSITE",
      location: input.location || null,
      treatmentInterest: input.treatment || null,
      utmSource: input.utmSource || null,
      utmMedium: input.utmMedium || null,
      utmCampaign: input.utmCampaign || null,
      utmTerm: input.utmTerm || null,
      utmContent: input.utmContent || null,
      landingPage: input.landingPage || null,
      status: "NEW",
      stage: "NEW_LEAD",
      lastActivityAt: new Date(),
    },
  });
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      organizationId: clinic.organizationId,
      clinicId: clinic.id,
      type: "LEAD_CREATED",
      description: "Website enquiry captured.",
      metadata: { source: "WEBSITE" },
    },
  });
  return lead;
}

export async function getIntegrationsForClinic(ctx: TenantContext, requestedClinicId?: string) {
  const clinic = await resolveAuthorizedClinic(ctx, requestedClinicId);
  return prisma.integration.findMany({
    where: { clinicId: clinic.id, clinic: { organizationId: ctx.organizationId } },
    select: {
      provider: true,
      status: true,
      displayName: true,
      externalAccountId: true,
      lastError: true,
      lastSyncAt: true,
    },
  });
}

export async function connectIntegrationRecord(
  ctx: TenantContext,
  provider: IntegrationProvider,
  data: {
    displayName: string | null;
    externalAccountId: string | null;
    encryptedCredentials: string;
  },
) {
  await assertClinicAccess(ctx, ctx.clinicId);
  return prisma.integration.upsert({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider } },
    create: {
      clinicId: ctx.clinicId,
      organizationId: ctx.organizationId,
      provider,
      status: "ACTIVE",
      displayName: data.displayName,
      externalAccountId: data.externalAccountId,
      encryptedCredentials: data.encryptedCredentials,
      lastSyncAt: new Date(),
      config: { connectedVia: "oauth" },
    },
    update: {
      status: "ACTIVE",
      displayName: data.displayName,
      externalAccountId: data.externalAccountId,
      encryptedCredentials: data.encryptedCredentials,
      lastError: null,
      lastSyncAt: new Date(),
    },
    select: {
      provider: true,
      status: true,
      displayName: true,
      externalAccountId: true,
      lastError: true,
    },
  });
}

export async function disconnectIntegrationRecord(ctx: TenantContext, provider: IntegrationProvider) {
  await assertClinicAccess(ctx, ctx.clinicId);
  await prisma.integration.updateMany({
    where: { clinicId: ctx.clinicId, provider, clinic: { organizationId: ctx.organizationId } },
    data: {
      status: "DISABLED",
      encryptedCredentials: null,
      lastError: null,
    },
  });
}

export function rejectForeignTenant(ctx: TenantContext, organizationId: string, clinicId?: string | null) {
  if (organizationId !== ctx.organizationId) {
    throw new TenantAccessError("You cannot access another organization.");
  }
  if (clinicId && clinicId !== ctx.clinicId && ctx.role !== "ORGANIZATION_ADMIN") {
    throw new TenantAccessError("You cannot access another clinic.");
  }
}
