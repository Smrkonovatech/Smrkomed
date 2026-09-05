import type { Prisma, TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { realtimeBus } from "../realtime/bus";
import { HUMAN_HANDOFF_MESSAGE } from "./safety";

export async function pauseWhatsAppAi(
  tenant: TenantContext,
  conversationId: string,
  reason: string,
) {
  return prisma.conversation.updateMany({
    where: { id: conversationId, clinicId: tenant.clinicId },
    data: {
      aiPausedAt: new Date(),
      handoffAt: new Date(),
      handoffReason: reason,
      status: "HUMAN_HANDOFF",
    },
  });
}

export async function resumeWhatsAppAi(tenant: TenantContext, conversationId: string) {
  const updated = await prisma.conversation.updateMany({
    where: { id: conversationId, clinicId: tenant.clinicId },
    data: {
      aiPausedAt: null,
      status: "OPEN",
      handoffReason: null,
    },
  });
  realtimeBus.publish({
    type: "CONVERSATION_UPDATED",
    clinicId: tenant.clinicId,
    conversationId,
    patch: { status: "OPEN", updatedAt: new Date().toISOString() },
  });
  return updated;
}

export async function escalateToHuman(input: {
  tenant: TenantContext;
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
  reason: string;
  notifyStaff?: boolean;
}) {
  await pauseWhatsAppAi(input.tenant, input.conversationId, input.reason);

  const task = await prisma.careTask.create({
    data: {
      clinicId: input.tenant.clinicId,
      coupleId: input.coupleId ?? null,
      title: "WhatsApp Needs Attention — human handoff",
      description: `AI handoff: ${input.reason}`,
      category: "WHATSAPP_HANDOFF",
      status: "WAITING",
      priority: "HIGH",
      ...(input.tenant.userId && input.tenant.userId !== "system-webhook"
        ? { createdById: input.tenant.userId }
        : {}),
    },
  });

  if (input.notifyStaff !== false) {
    const staff = await prisma.clinicMembership.findFirst({
      where: { clinicId: input.tenant.clinicId, status: "ACTIVE" },
      select: { userId: true },
    });
    if (staff) {
      await prisma.notification
        .create({
          data: {
            clinicId: input.tenant.clinicId,
            userId: staff.userId,
            title: "Needs Attention — WhatsApp handoff",
            body: input.reason,
            href: "/whatsapp/inbox",
            status: "UNREAD",
          },
        })
        .catch(() => undefined);
    }
  }

  realtimeBus.publish({
    type: "AI_HANDOFF",
    clinicId: input.tenant.clinicId,
    conversationId: input.conversationId,
    reason: input.reason,
  });

  return { careTaskId: task.id, patientMessage: HUMAN_HANDOFF_MESSAGE };
}

export async function recordAiInteraction(data: {
  clinicId: string;
  conversationId?: string | null;
  messageId?: string | null;
  patientId?: string | null;
  careTaskId?: string | null;
  trigger: string;
  intent?: string | null;
  classification?: string | null;
  model?: string | null;
  safeToAutoReply: boolean;
  status: string;
  handoffReason?: string | null;
  knowledgeSources?: Prisma.InputJsonValue;
  rawSummary?: string | null;
}) {
  return prisma.aIInteraction.create({
    data: {
      clinicId: data.clinicId,
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? null,
      patientId: data.patientId ?? null,
      careTaskId: data.careTaskId ?? null,
      trigger: data.trigger,
      intent: data.intent ?? null,
      classification: data.classification ?? null,
      model: data.model ?? null,
      safeToAutoReply: data.safeToAutoReply,
      status: data.status,
      handoffReason: data.handoffReason ?? null,
      ...(data.knowledgeSources !== undefined ? { knowledgeSources: data.knowledgeSources } : {}),
      rawSummary: data.rawSummary ?? null,
    },
  });
}
