import { prisma, type TenantContext } from "@smrkomed/database";
import type { LeadActivityType, Prisma } from "@prisma/client";

import { sanitizeActivityMetadata } from "./sanitize";

export async function recordLeadActivity(input: {
  leadId: string;
  organizationId: string;
  clinicId?: string | null;
  userId?: string | null;
  type: LeadActivityType;
  description: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const metadata = sanitizeActivityMetadata(input.metadata);
  const activity = await prisma.leadActivity.create({
    data: {
      leadId: input.leadId,
      organizationId: input.organizationId,
      clinicId: input.clinicId ?? null,
      userId: input.userId ?? null,
      type: input.type,
      description: input.description,
      ...(metadata === undefined ? {} : { metadata }),
    },
  });
  await prisma.lead.update({
    where: { id: input.leadId },
    data: { lastActivityAt: new Date() },
  });
  return activity;
}

export async function notifyAssignee(input: {
  clinicId: string | null;
  userId: string;
  title: string;
  body: string;
  href: string;
}) {
  if (!input.clinicId) return;
  await prisma.notification
    .create({
      data: {
        clinicId: input.clinicId,
        userId: input.userId,
        title: input.title,
        body: input.body,
        href: input.href,
        status: "UNREAD",
      },
    })
    .catch(() => undefined);
}

export function leadHref(leadId: string) {
  return `/crm/leads/${leadId}`;
}

export async function assertAssigneeInTenant(ctx: TenantContext, userId: string, clinicId: string | null) {
  const membership = await prisma.clinicMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      user: { isActive: true },
      clinic: { organizationId: ctx.organizationId, ...(clinicId ? { id: clinicId } : {}) },
    },
  });
  if (!membership) {
    throw new Error("ASSIGNEE_NOT_IN_TENANT");
  }
  return membership;
}
