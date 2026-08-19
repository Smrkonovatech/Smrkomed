import { prisma, type TenantContext } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { integrationService } from "../../services/integration-service";
import { publicWhatsAppAccount } from "./onboarding";
import { maskPhone } from "./phone";

function countByStatus(rows: Array<{ status: string; _count: { _all: number } }>) {
  const counts = { pending: 0, approved: 0, rejected: 0, disabled: 0, paused: 0, total: 0 };
  for (const row of rows) {
    counts.total += row._count._all;
    const key = row.status.toLowerCase();
    if (key === "pending") counts.pending += row._count._all;
    else if (key === "approved") counts.approved += row._count._all;
    else if (key === "rejected") counts.rejected += row._count._all;
    else if (key === "disabled") counts.disabled += row._count._all;
    else if (key === "paused") counts.paused += row._count._all;
  }
  return counts;
}

export async function getWhatsAppClinicStatus(ctx: TenantContext) {
  const integration = await integrationService.getConnection(ctx, "WHATSAPP_CLOUD");
  const account = await prisma.whatsAppAccount.findFirst({
    where: { clinicId: ctx.clinicId, isActive: true },
  });
  const templateGroups = await prisma.whatsAppTemplate.groupBy({
    by: ["status"],
    where: { clinicId: ctx.clinicId },
    _count: { _all: true },
  });
  const lastWebhook = await prisma.integrationEvent.findFirst({
    where: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" },
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true, eventType: true, status: true },
  });
  const attention =
    integration.connectionStatus === "ACTION_REQUIRED"
      ? "WhatsApp connection requires attention."
      : integration.connectionStatus === "ERROR"
        ? (integration.lastError?.message ?? "WhatsApp connection requires attention.")
        : null;
  return {
    integration,
    account: account ? publicWhatsAppAccount(account) : null,
    templates: countByStatus(templateGroups),
    lastWebhook,
    lastSyncAt: integration.lastSyncAt ?? account?.lastSyncedAt ?? null,
    attention,
  };
}

export async function listWhatsAppConversations(ctx: TenantContext) {
  const rows = await prisma.conversation.findMany({
    where: { clinicId: ctx.clinicId, channel: "WHATSAPP" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, direction: true, status: true, createdAt: true, messageType: true, content: true },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    status: row.status,
    unmatched: row.unmatched,
    contactPhone: maskPhone(row.contactPhone),
    contactState: row.unmatched ? "UNMATCHED_CONTACT" : "MATCHED_PATIENT",
    patient: row.patient,
    lastMessage: row.messages[0]
      ? {
          id: row.messages[0].id,
          direction: row.messages[0].direction,
          status: row.messages[0].status,
          createdAt: row.messages[0].createdAt,
          messageType: row.messages[0].messageType,
          preview: row.messages[0].content.slice(0, 80),
        }
      : null,
    updatedAt: row.updatedAt,
  }));
}

export async function getWhatsAppConversation(ctx: TenantContext, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, clinicId: ctx.clinicId, channel: "WHATSAPP" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: {
          id: true,
          direction: true,
          senderType: true,
          status: true,
          messageType: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });
  if (!conversation) {
    throw new IntegrationError("INVALID_RECIPIENT", "Conversation was not found.", 404);
  }
  return {
    id: conversation.id,
    channel: conversation.channel,
    status: conversation.status,
    unmatched: conversation.unmatched,
    contactPhone: maskPhone(conversation.contactPhone),
    contactState: conversation.unmatched ? "UNMATCHED_CONTACT" : "MATCHED_PATIENT",
    patient: conversation.patient,
    messages: conversation.messages,
  };
}

export async function getWhatsAppAnalytics(ctx: TenantContext) {
  const conversationWhere = { clinicId: ctx.clinicId, channel: "WHATSAPP" as const };
  const [activeConversations, inbound, sent, delivered, read, failed] = await Promise.all([
    prisma.conversation.count({ where: { ...conversationWhere, status: { not: "CLOSED" } } }),
    prisma.message.count({ where: { direction: "INBOUND", conversation: conversationWhere } }),
    prisma.message.count({ where: { direction: "OUTBOUND", conversation: conversationWhere } }),
    prisma.message.count({ where: { status: "DELIVERED", conversation: conversationWhere } }),
    prisma.message.count({ where: { status: "READ", conversation: conversationWhere } }),
    prisma.message.count({ where: { status: "FAILED", conversation: conversationWhere } }),
  ]);
  return {
    activeConversations,
    inboundMessages: inbound,
    messagesSent: sent,
    messagesDelivered: delivered,
    messagesRead: read,
    messagesFailed: failed,
  };
}
