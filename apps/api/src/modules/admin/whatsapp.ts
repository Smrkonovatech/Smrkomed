import { prisma } from "@smrkomed/database";

import { maskAccount } from "../../integrations/core/mask";
import { toConnectionStatus } from "../../integrations/core/status";
import { SAFE_INTEGRATION_SELECT } from "../../integrations/core/serializer";
import { maskPhone } from "../../integrations/providers/whatsapp/phone";

function templateCounts(rows: Array<{ status: string; _count: { _all: number } }>) {
  const counts = { total: 0, pending: 0, approved: 0, rejected: 0, disabled: 0, paused: 0 };
  for (const row of rows) {
    counts.total += row._count._all;
    const key = row.status.toLowerCase() as keyof typeof counts;
    if (key in counts && key !== "total") counts[key] += row._count._all;
  }
  return counts;
}

export async function listAdminWhatsApp() {
  const [integrations, templateGroups, lastEvents, lastMessages] = await Promise.all([
    prisma.integration.findMany({
      where: { provider: "WHATSAPP_CLOUD" },
      select: {
        ...SAFE_INTEGRATION_SELECT,
        clinic: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
        whatsappAccounts: {
          where: { isActive: true },
          take: 1,
          select: {
            id: true,
            displayName: true,
            displayPhoneNumber: true,
            phoneNumberId: true,
            businessAccountId: true,
            qualityRating: true,
            isActive: true,
            lastSyncedAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.whatsAppTemplate.groupBy({
      by: ["clinicId", "status"],
      _count: { _all: true },
    }),
    prisma.integrationEvent.findMany({
      where: { provider: "WHATSAPP_CLOUD" },
      orderBy: { receivedAt: "desc" },
      distinct: ["clinicId"],
      select: { clinicId: true, receivedAt: true, eventType: true, status: true, error: true },
    }),
    prisma.message.findMany({
      where: { conversation: { channel: "WHATSAPP" } },
      orderBy: { createdAt: "desc" },
      distinct: ["conversationId"],
      select: {
        createdAt: true,
        status: true,
        direction: true,
        conversation: { select: { clinicId: true } },
      },
      take: 200,
    }),
  ]);

  const templatesByClinic = new Map<string, ReturnType<typeof templateCounts>>();
  for (const row of templateGroups) {
    const current = templatesByClinic.get(row.clinicId) ?? templateCounts([]);
    current.total += row._count._all;
    const key = row.status.toLowerCase() as keyof typeof current;
    if (key in current && key !== "total") current[key] += row._count._all;
    templatesByClinic.set(row.clinicId, current);
  }

  const lastWebhookByClinic = new Map(lastEvents.map((row) => [row.clinicId, row]));
  const lastMessageByClinic = new Map<string, { createdAt: Date; status: string; direction: string }>();
  for (const row of lastMessages) {
    if (!lastMessageByClinic.has(row.conversation.clinicId)) {
      lastMessageByClinic.set(row.conversation.clinicId, {
        createdAt: row.createdAt,
        status: row.status,
        direction: row.direction,
      });
    }
  }

  const connectedClinics = integrations.map((row) => {
    const account = row.whatsappAccounts[0];
    const templates = templatesByClinic.get(row.clinicId) ?? templateCounts([]);
    return {
      id: row.id,
      clinicId: row.clinicId,
      clinicName: row.clinic.name,
      organizationId: row.organizationId,
      organizationName: row.clinic.organization.name,
      connectionStatus: toConnectionStatus(row.status),
      displayName: row.displayName,
      waba: maskAccount(account?.businessAccountId ?? row.externalAccountId),
      phone: maskPhone(account?.displayPhoneNumber ?? null) ?? maskAccount(account?.phoneNumberId ?? null),
      qualityRating: account?.qualityRating ?? null,
      templates,
      lastWebhook: lastWebhookByClinic.get(row.clinicId) ?? null,
      lastMessage: lastMessageByClinic.get(row.clinicId) ?? null,
      lastError: row.lastError,
      lastErrorCode: row.lastErrorCode,
      lastSyncAt: row.lastSyncAt,
    };
  });

  const totals = {
    connected: connectedClinics.filter((row) => row.connectionStatus === "CONNECTED").length,
    actionRequired: connectedClinics.filter((row) => row.connectionStatus === "ACTION_REQUIRED").length,
    errors: connectedClinics.filter((row) => row.connectionStatus === "ERROR").length,
  };

  return {
    totals,
    connectedClinics,
    templates: templateCounts(
      templateGroups.map((row) => ({ status: row.status, _count: row._count })),
    ),
    note: "Monitoring only. Access tokens and patient message content are never returned.",
  };
}

export async function getAdminWhatsAppDetail(id: string) {
  const row = await prisma.integration.findFirst({
    where: { id, provider: "WHATSAPP_CLOUD" },
    select: {
      ...SAFE_INTEGRATION_SELECT,
      clinic: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
      whatsappAccounts: {
        select: {
          displayName: true,
          displayPhoneNumber: true,
          phoneNumberId: true,
          businessAccountId: true,
          qualityRating: true,
          isActive: true,
          lastSyncedAt: true,
          verifiedName: true,
        },
      },
    },
  });
  if (!row) return null;
  const [templateGroups, lastWebhook, recentEvents, recentErrors, messageStats] = await Promise.all([
    prisma.whatsAppTemplate.groupBy({
      by: ["status"],
      where: { clinicId: row.clinicId },
      _count: { _all: true },
    }),
    prisma.integrationEvent.findFirst({
      where: { clinicId: row.clinicId, provider: "WHATSAPP_CLOUD" },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true, eventType: true, status: true, error: true },
    }),
    prisma.integrationEvent.findMany({
      where: { clinicId: row.clinicId, provider: "WHATSAPP_CLOUD" },
      orderBy: { receivedAt: "desc" },
      take: 20,
      select: { id: true, eventType: true, status: true, receivedAt: true, error: true },
    }),
    prisma.integrationEvent.findMany({
      where: { clinicId: row.clinicId, provider: "WHATSAPP_CLOUD", OR: [{ status: "FAILED" }, { error: { not: null } }] },
      orderBy: { receivedAt: "desc" },
      take: 10,
      select: { id: true, eventType: true, status: true, receivedAt: true, error: true },
    }),
    prisma.message.groupBy({
      by: ["status", "direction"],
      where: { conversation: { clinicId: row.clinicId, channel: "WHATSAPP" } },
      _count: { _all: true },
    }),
  ]);
  const account = row.whatsappAccounts.find((item) => item.isActive) ?? row.whatsappAccounts[0] ?? null;
  return {
    id: row.id,
    organization: row.clinic.organization,
    clinic: { id: row.clinic.id, name: row.clinic.name },
    connectionStatus: toConnectionStatus(row.status),
    displayName: row.displayName,
    waba: maskAccount(account?.businessAccountId ?? row.externalAccountId),
    phone: maskPhone(account?.displayPhoneNumber ?? null) ?? maskAccount(account?.phoneNumberId ?? null),
    qualityRating: account?.qualityRating ?? null,
    verifiedName: account?.verifiedName ?? null,
    lastSyncAt: row.lastSyncAt ?? account?.lastSyncedAt ?? null,
    lastWebhook,
    lastError: row.lastError,
    lastErrorCode: row.lastErrorCode,
    templates: templateCounts(templateGroups),
    messages: {
      sent: messageStats.filter((item) => item.direction === "OUTBOUND").reduce((sum, item) => sum + item._count._all, 0),
      inbound: messageStats.filter((item) => item.direction === "INBOUND").reduce((sum, item) => sum + item._count._all, 0),
      delivered: messageStats.filter((item) => item.status === "DELIVERED").reduce((sum, item) => sum + item._count._all, 0),
      read: messageStats.filter((item) => item.status === "READ").reduce((sum, item) => sum + item._count._all, 0),
      failed: messageStats.filter((item) => item.status === "FAILED").reduce((sum, item) => sum + item._count._all, 0),
    },
    recentEvents,
    recentErrors,
  };
}

export async function listAdminWhatsAppErrors() {
  const rows = await prisma.integration.findMany({
    where: { provider: "WHATSAPP_CLOUD", status: { in: ["ACTION_REQUIRED", "ERROR"] } },
    select: {
      ...SAFE_INTEGRATION_SELECT,
      clinic: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    clinicId: row.clinicId,
    clinicName: row.clinic.name,
    organizationName: row.clinic.organization.name,
    connectionStatus: toConnectionStatus(row.status),
    lastError: row.lastError,
    lastErrorCode: row.lastErrorCode,
    lastSyncAt: row.lastSyncAt,
  }));
}
