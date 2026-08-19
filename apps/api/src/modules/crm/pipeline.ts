import { prisma, type TenantContext } from "@smrkomed/database";
import type { Lead } from "@prisma/client";

import { HttpError } from "../../lib/errors";
import { recordLeadActivity, assertAssigneeInTenant, notifyAssignee, leadHref } from "./activity";
import { ALLOWED_STAGE_TRANSITIONS, LEAD_STAGE_LABELS, lifecycleStatusFromStage } from "./constants";
import { recomputeLeadScore } from "./scoring";

export function canOverrideStage(role: string) {
  return role === "CLINIC_ADMIN" || role === "ORGANIZATION_ADMIN";
}

export async function changeLeadStage(
  ctx: TenantContext,
  lead: Lead,
  nextStage: Lead["stage"],
  options?: { reason?: string },
) {
  if (lead.stage === nextStage) return lead;
  const allowed = ALLOWED_STAGE_TRANSITIONS[lead.stage] ?? [];
  if (!allowed.includes(nextStage) && !canOverrideStage(ctx.role)) {
    throw new HttpError(422, "INVALID_STAGE_TRANSITION", `Cannot move from ${LEAD_STAGE_LABELS[lead.stage]} to ${LEAD_STAGE_LABELS[nextStage]}.`);
  }
  const override = !allowed.includes(nextStage);
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      stage: nextStage,
      status: lifecycleStatusFromStage(nextStage, lead.status),
      ...(nextStage === "LOST" ? {} : { lostReason: null }),
    },
  });
  await recordLeadActivity({
    leadId: lead.id,
    organizationId: lead.organizationId,
    clinicId: lead.clinicId,
    userId: ctx.userId,
    type: "STAGE_CHANGED",
    description: `Stage changed to ${LEAD_STAGE_LABELS[nextStage]}.`,
    metadata: {
      from: lead.stage,
      to: nextStage,
      override,
      reason: options?.reason ?? null,
    },
  });
  await recomputeLeadScore(updated);
  return updated;
}

export async function assignLead(
  ctx: TenantContext,
  lead: Lead,
  assignedToId: string | null,
) {
  if (assignedToId) {
    await assertAssigneeInTenant(ctx, assignedToId, lead.clinicId).catch(() => {
      throw new HttpError(422, "INVALID_ASSIGNEE", "Assigned user must belong to the same organization and clinic.");
    });
  }
  const previous = lead.assignedToId;
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { assignedToId },
  });
  await recordLeadActivity({
    leadId: lead.id,
    organizationId: lead.organizationId,
    clinicId: lead.clinicId,
    userId: ctx.userId,
    type: previous && assignedToId && previous !== assignedToId ? "LEAD_REASSIGNED" : "LEAD_ASSIGNED",
    description: assignedToId ? "Lead assigned." : "Lead unassigned.",
    metadata: { from: previous, to: assignedToId },
  });
  if (assignedToId && assignedToId !== ctx.userId) {
    await notifyAssignee({
      clinicId: lead.clinicId,
      userId: assignedToId,
      title: previous && previous !== assignedToId ? "Lead reassigned to you" : "New lead assigned",
      body: `${lead.name} needs follow-up.`,
      href: leadHref(lead.id),
    });
  }
  return updated;
}

export async function roundRobinAssignee(organizationId: string, clinicId: string | null) {
  const members = await prisma.clinicMembership.findMany({
    where: {
      status: "ACTIVE",
      user: { isActive: true },
      clinic: { organizationId, ...(clinicId ? { id: clinicId } : {}) },
      role: { key: { in: ["COUNSELOR", "CARE_COORDINATOR"] } },
    },
    select: { userId: true },
    orderBy: { createdAt: "asc" },
  });
  if (members.length === 0) return null;
  const counts = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: {
      organizationId,
      clinicId,
      assignedToId: { in: members.map((row) => row.userId) },
      status: { in: ["NEW", "OPEN"] },
    },
    _count: true,
  });
  const load = new Map(counts.map((row) => [row.assignedToId, row._count]));
  return members.reduce((best, row) => {
    const current = load.get(row.userId) ?? 0;
    const bestLoad = load.get(best) ?? 0;
    return current < bestLoad ? row.userId : best;
  }, members[0]!.userId);
}
