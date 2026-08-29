import type { Prisma, TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { HttpError } from "../../lib/errors";
import { sendWhatsAppTemplate } from "../../integrations/providers/whatsapp/messaging";
import { previewSegment, type SegmentFilters } from "./segments";

export async function createCampaign(
  tenant: TenantContext,
  input: {
    name: string;
    templateName: string;
    templateLanguage?: string;
    filters?: SegmentFilters;
    scheduledAt?: string | null;
  },
) {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: {
      clinicId: tenant.clinicId,
      name: input.templateName,
      language: input.templateLanguage ?? "en",
      status: "APPROVED",
    },
  });
  if (!template) {
    throw new HttpError(
      422,
      "TEMPLATE_NOT_APPROVED",
      "Campaign requires a Meta-approved template for this clinic and language.",
    );
  }

  const preview = await previewSegment(tenant, input.filters ?? {});
  return prisma.whatsAppCampaign.create({
    data: {
      clinicId: tenant.clinicId,
      name: input.name,
      status: "DRAFT",
      templateName: template.name,
      templateLanguage: template.language,
      templateId: template.id,
      audienceFilter: (input.filters ?? {}) as Prisma.InputJsonValue,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      createdById: tenant.userId,
      audienceCount: preview.audienceCount,
      eligibleCount: preview.consentEligibleCount,
      excludedCount: preview.skippedCount,
    },
  });
}

export async function materializeCampaignRecipients(tenant: TenantContext, campaignId: string) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, clinicId: tenant.clinicId },
  });
  if (!campaign) throw new HttpError(404, "NOT_FOUND", "Campaign not found");

  const filters = (campaign.audienceFilter ?? {}) as SegmentFilters;
  const preview = await previewSegment(tenant, filters);

  await prisma.whatsAppCampaignRecipient.deleteMany({ where: { campaignId } });

  const rows: Prisma.WhatsAppCampaignRecipientCreateManyInput[] = [
    ...preview.eligiblePatientIds.map((patientId) => ({
      campaignId,
      clinicId: tenant.clinicId,
      patientId,
      status: "PENDING",
    })),
    ...preview.excluded.map((e) => ({
      campaignId,
      clinicId: tenant.clinicId,
      patientId: e.patientId,
      status: "SKIPPED",
      skipReason: e.reason,
    })),
  ];

  // Dedupe by patientId (eligible wins)
  const byPatient = new Map<string, Prisma.WhatsAppCampaignRecipientCreateManyInput>();
  for (const row of rows) {
    const existing = byPatient.get(row.patientId);
    if (!existing || row.status === "PENDING") byPatient.set(row.patientId, row);
  }
  const unique = [...byPatient.values()];
  if (unique.length) {
    await prisma.whatsAppCampaignRecipient.createMany({ data: unique });
  }

  const eligible = unique.filter((r) => r.status === "PENDING").length;
  return prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      audienceCount: unique.length,
      eligibleCount: eligible,
      excludedCount: unique.length - eligible,
      status: campaign.status === "DRAFT" ? "READY" : campaign.status,
    },
  });
}

export async function confirmAndStartCampaign(tenant: TenantContext, campaignId: string) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, clinicId: tenant.clinicId },
  });
  if (!campaign) throw new HttpError(404, "NOT_FOUND", "Campaign not found");
  if (!["DRAFT", "READY", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
    throw new HttpError(422, "INVALID_STATUS", "Campaign cannot be confirmed from this status.");
  }

  await materializeCampaignRecipients(tenant, campaignId);

  const updated = await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      status: campaign.scheduledAt && campaign.scheduledAt > new Date() ? "SCHEDULED" : "RUNNING",
      confirmedAt: new Date(),
      startedAt: campaign.scheduledAt && campaign.scheduledAt > new Date() ? null : new Date(),
    },
  });

  if (updated.status === "RUNNING") {
    await processCampaignBatch(tenant, campaignId, 25);
  }
  return prisma.whatsAppCampaign.findFirstOrThrow({
    where: { id: campaignId },
    include: { _count: { select: { recipients: true } } },
  });
}

export async function processCampaignBatch(tenant: TenantContext, campaignId: string, limit = 25) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, clinicId: tenant.clinicId },
  });
  if (!campaign || campaign.status !== "RUNNING") return { processed: 0 };
  if (!campaign.templateId) {
    throw new HttpError(422, "TEMPLATE_NOT_APPROVED", "Campaign template missing.");
  }

  const pending = await prisma.whatsAppCampaignRecipient.findMany({
    where: { campaignId, clinicId: tenant.clinicId, status: "PENDING" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of pending) {
    try {
      const result = await sendWhatsAppTemplate(tenant, {
        patientId: row.patientId,
        templateId: campaign.templateId!,
        parameters: [],
      });
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: row.id },
        data: { status: "SENT", messageId: result.id, sentAt: new Date(), skipReason: null },
      });
      sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      const skipLike =
        /consent|revoked|phone|recipient|disabled/i.test(msg);
      await prisma.whatsAppCampaignRecipient.update({
        where: { id: row.id },
        data: {
          status: skipLike ? "SKIPPED" : "FAILED",
          skipReason: skipLike ? "NO_CONSENT" : "META_ERROR",
        },
      });
      if (skipLike) skipped += 1;
      else failed += 1;
    }
  }

  const counts = await prisma.whatsAppCampaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });
  const map = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const remaining = map["PENDING"] ?? 0;
  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: map["SENT"] ?? 0,
      failedCount: map["FAILED"] ?? 0,
      skippedCount: map["SKIPPED"] ?? 0,
      ...(remaining === 0 ? { status: "COMPLETED" as const, completedAt: new Date() } : {}),
    },
  });

  return { processed: pending.length, sent, failed, skipped, remaining };
}

export async function processDueCampaigns(limit = 5) {
  const due = await prisma.whatsAppCampaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    take: limit,
  });
  const results = [];
  for (const c of due) {
    const clinic = await prisma.clinic.findUnique({ where: { id: c.clinicId } });
    if (!clinic) continue;
    const tenant: TenantContext = {
      userId: c.createdById ?? "system-worker",
      role: "CLINIC_ADMIN",
      clinicId: clinic.id,
      organizationId: clinic.organizationId,
      clinicName: clinic.name,
      organizationName: "",
    };
    await prisma.whatsAppCampaign.update({
      where: { id: c.id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    results.push({ id: c.id, ...(await processCampaignBatch(tenant, c.id, 40)) });
  }
  const running = await prisma.whatsAppCampaign.findMany({ where: { status: "RUNNING" }, take: limit });
  for (const c of running) {
    if (due.some((d) => d.id === c.id)) continue;
    const clinic = await prisma.clinic.findUnique({ where: { id: c.clinicId } });
    if (!clinic) continue;
    const tenant: TenantContext = {
      userId: c.createdById ?? "system-worker",
      role: "CLINIC_ADMIN",
      clinicId: clinic.id,
      organizationId: clinic.organizationId,
      clinicName: clinic.name,
      organizationName: "",
    };
    results.push({ id: c.id, ...(await processCampaignBatch(tenant, c.id, 40)) });
  }
  return results;
}
