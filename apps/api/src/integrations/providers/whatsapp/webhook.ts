import { Prisma } from "@prisma/client";
import { prisma } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { encryptString } from "../../credentials/encryption";
import type { NormalizedWebhookEvent } from "../../core/types";
import { parseWhatsAppPayload, verifyMetaSignature, verifyWebhookChallenge } from "./provider";
import { normalizeWhatsAppPhone, phonesMatch } from "./phone";
import { mapMetaTemplateStatus } from "./templates";
import { attachWhatsAppInboundToCrm } from "./crm-capture";
import { metaConfig } from "./config";
import { ensureDirectWhatsAppConnection } from "./service";
import { realtimeBus } from "../../../modules/realtime/bus";

const PAYLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function sanitizeMetadata(event: NormalizedWebhookEvent) {
  return {
    eventType: event.eventType,
    messageType: typeof event.metadata["messageType"] === "string" ? event.metadata["messageType"] : null,
    status: typeof event.metadata["status"] === "string" ? event.metadata["status"] : null,
    field: typeof event.metadata["field"] === "string" ? event.metadata["field"] : null,
  };
}

function metaStatusToMessage(status: string) {
  if (status === "delivered") return "DELIVERED" as const;
  if (status === "read") return "READ" as const;
  if (status === "failed") return "FAILED" as const;
  if (status === "sent") return "SENT" as const;
  return null;
}

async function findActiveIntegration(event: NormalizedWebhookEvent) {
  const phoneNumberId = event.externalAccountId;
  const wabaId = typeof event.metadata["wabaId"] === "string" ? event.metadata["wabaId"] : null;
  const cfg = metaConfig();

  if (phoneNumberId) {
    const byPhone = await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId, isActive: true },
      include: { integration: true },
    });
    if (byPhone?.integration?.status === "ACTIVE") {
      return { account: byPhone, integration: byPhone.integration };
    }

    // Direct Meta fallback if phone matches configured server phone
    if (cfg.directPhoneNumberId && phoneNumberId === cfg.directPhoneNumberId) {
      const primaryClinic = await prisma.clinic.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, organizationId: true, organization: { select: { name: true } } },
      });
      if (primaryClinic) {
        const direct = await ensureDirectWhatsAppConnection({
          clinicId: primaryClinic.id,
          clinicName: primaryClinic.name,
          organizationId: primaryClinic.organizationId,
          organizationName: primaryClinic.organization.name,
          userId: "system_webhook",
          role: "CLINIC_ADMIN",
        });
        if (direct && direct.integration.status === "ACTIVE") {
          return { account: direct.account, integration: direct.integration };
        }
      }
    }

    return null;
  }

  if (wabaId) {
    const byWaba = await prisma.whatsAppAccount.findFirst({
      where: { businessAccountId: wabaId, isActive: true },
      include: { integration: true },
    });
    if (byWaba?.integration?.status === "ACTIVE") {
      return { account: byWaba, integration: byWaba.integration };
    }

    // Direct Meta fallback if WABA matches configured server WABA
    if (cfg.directBusinessAccountId && wabaId === cfg.directBusinessAccountId) {
      const primaryClinic = await prisma.clinic.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, organizationId: true, organization: { select: { name: true } } },
      });
      if (primaryClinic) {
        const direct = await ensureDirectWhatsAppConnection({
          clinicId: primaryClinic.id,
          clinicName: primaryClinic.name,
          organizationId: primaryClinic.organizationId,
          organizationName: primaryClinic.organization.name,
          userId: "system_webhook",
          role: "CLINIC_ADMIN",
        });
        if (direct && direct.integration.status === "ACTIVE") {
          return { account: direct.account, integration: direct.integration };
        }
      }
    }
  }

  return null;
}

async function storeEvent(
  event: NormalizedWebhookEvent,
  integration: { id: string; organizationId: string; clinicId: string },
  rawBody: string,
) {
  const existing = await prisma.integrationEvent.findUnique({
    where: { provider_externalEventId: { provider: "WHATSAPP_CLOUD", externalEventId: event.externalEventId } },
  });
  if (existing) return existing;
  try {
    return await prisma.integrationEvent.create({
      data: {
        integrationId: integration.id,
        organizationId: integration.organizationId,
        clinicId: integration.clinicId,
        provider: "WHATSAPP_CLOUD",
        externalEventId: event.externalEventId,
        eventType: event.eventType,
        status: "RECEIVED",
        metadata: sanitizeMetadata(event),
        encryptedPayload: encryptString(rawBody),
        payloadExpiresAt: new Date(Date.now() + PAYLOAD_RETENTION_MS),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.integrationEvent.findUnique({
        where: { provider_externalEventId: { provider: "WHATSAPP_CLOUD", externalEventId: event.externalEventId } },
      });
    }
    throw error;
  }
}

async function matchPatient(clinicId: string, phone: string) {
  const suffix = phone.slice(-10);
  const candidates = await prisma.patient.findMany({
    where: {
      clinicId,
      OR: [
        { whatsappNumber: { contains: suffix } },
        { phone: { contains: suffix } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, phone: true, whatsappNumber: true },
    take: 50,
  });
  return candidates.find((row) => phonesMatch(row.whatsappNumber, phone) || phonesMatch(row.phone, phone)) ?? null;
}

function extractInboundText(rawBody: string, messageId: string) {
  const payload = JSON.parse(rawBody) as {
    entry?: Array<{
      changes?: Array<{ value?: { messages?: Array<{ id?: string; text?: { body?: string }; type?: string }> } }>;
    }>;
  };
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const match = change.value?.messages?.find((row) => row.id === messageId);
      if (match?.type && match.type !== "text") return { type: match.type, text: null };
      if (match?.text?.body) return { type: "text", text: match.text.body };
    }
  }
  return { type: "unknown", text: null };
}

async function processInbound(event: NormalizedWebhookEvent, clinicId: string, rawBody: string) {
  const from = typeof event.metadata["from"] === "string" ? normalizeWhatsAppPhone(event.metadata["from"]) : "";
  if (!from) return "IGNORED" as const;
  const inbound = extractInboundText(rawBody, event.externalEventId);
  if (inbound.type !== "text") return "IGNORED" as const;
  const patient = await matchPatient(clinicId, from);
  let conversation = patient
    ? await prisma.conversation.findFirst({ where: { clinicId, channel: "WHATSAPP", patientId: patient.id } })
    : await prisma.conversation.findFirst({ where: { clinicId, channel: "WHATSAPP", contactPhone: from, unmatched: true } });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clinicId,
        patientId: patient?.id ?? null,
        contactPhone: from,
        unmatched: !patient,
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        status: conversation.status === "CLOSED" ? "OPEN" : conversation.status,
      },
    });
  }
  let createdMessage: {
    id: string;
    conversationId: string;
    direction: "INBOUND" | "OUTBOUND";
    senderType: string;
    content: string;
    messageType: string;
    status: string;
    createdAt: Date;
  } | null = null;
  try {
    createdMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        senderType: "PATIENT",
        content: inbound.text ?? "",
        messageType: "text",
        providerMessageId: event.externalEventId,
        status: "DELIVERED",
      },
      select: {
        id: true,
        conversationId: true,
        direction: true,
        senderType: true,
        content: true,
        messageType: true,
        status: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    createdMessage = null;
  }
  if (createdMessage) {
    // Real-time publish to connected browser sessions
    realtimeBus.publish({
      type: "MESSAGE_CREATED",
      clinicId,
      conversationId: conversation.id,
      message: {
        id: createdMessage.id,
        direction: "INBOUND",
        senderType: createdMessage.senderType,
        content: createdMessage.content,
        messageType: createdMessage.messageType,
        createdAt: createdMessage.createdAt.toISOString(),
        status: createdMessage.status,
        label: "PATIENT",
      },
      conversation: {
        id: conversation.id,
        status: conversation.status,
        unreadCount: 1,
        updatedAt: conversation.updatedAt.toISOString(),
        contactPhone: conversation.contactPhone,
        patient: patient
          ? {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
            }
          : null,
      },
    });

    realtimeBus.publish({
      type: "CONVERSATION_UPDATED",
      clinicId,
      conversationId: conversation.id,
      patch: {
        status: conversation.status,
        unreadCount: 1,
        updatedAt: conversation.updatedAt.toISOString(),
        lastMessage: {
          id: createdMessage.id,
          preview: createdMessage.content.slice(0, 100),
          createdAt: createdMessage.createdAt.toISOString(),
          direction: "INBOUND",
          senderType: createdMessage.senderType,
          status: createdMessage.status,
        },
      },
    });

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { organizationId: true },
    });
    if (clinic) {
      await attachWhatsAppInboundToCrm({
        clinicId,
        organizationId: clinic.organizationId,
        conversationId: conversation.id,
        phone: from,
        patientId: patient?.id ?? null,
        preview: inbound.text,
      });
    }
  }
  const staff = await prisma.clinicMembership.findFirst({
    where: { clinicId, status: "ACTIVE" },
    select: { userId: true },
  });
  if (staff) {
    await prisma.notification.create({
      data: {
        clinicId,
        userId: staff.userId,
        title: conversation.unmatched ? "Unmatched WhatsApp contact" : "New WhatsApp message",
        body: "A WhatsApp message was received.",
        status: "UNREAD",
      },
    }).catch(() => undefined);
  }
  return "PROCESSED" as const;
}

async function processStatus(event: NormalizedWebhookEvent, clinicId: string) {
  const providerMessageId = typeof event.metadata["providerMessageId"] === "string" ? event.metadata["providerMessageId"] : "";
  const statusRaw = typeof event.metadata["status"] === "string" ? event.metadata["status"] : "";
  const mapped = metaStatusToMessage(statusRaw);
  if (!providerMessageId || !mapped) return "IGNORED" as const;

  const existing = await prisma.message.findFirst({
    where: { providerMessageId },
    select: { id: true, conversationId: true, conversation: { select: { clinicId: true } } },
  });

  await prisma.message.updateMany({
    where: { providerMessageId },
    data: { status: mapped },
  });

  if (existing) {
    const targetClinicId = existing.conversation?.clinicId ?? clinicId;
    realtimeBus.publish({
      type: "MESSAGE_STATUS_UPDATED",
      clinicId: targetClinicId,
      conversationId: existing.conversationId,
      messageId: existing.id,
      providerMessageId,
      status: mapped,
    });
  }
  return "PROCESSED" as const;
}

async function processTemplateStatus(event: NormalizedWebhookEvent, integrationId: string, clinicId: string) {
  const name = typeof event.metadata["name"] === "string" ? event.metadata["name"] : "";
  const language = typeof event.metadata["language"] === "string" ? event.metadata["language"] : "en";
  if (!name) return "IGNORED" as const;
  await prisma.whatsAppTemplate.updateMany({
    where: { integrationId, clinicId, name, language },
    data: {
      status: mapMetaTemplateStatus(typeof event.metadata["event"] === "string" ? event.metadata["event"] : undefined),
      rejectionReason: typeof event.metadata["reason"] === "string" ? event.metadata["reason"] : null,
      lastSyncedAt: new Date(),
    },
  });
  return "PROCESSED" as const;
}

export function verifyWhatsAppChallenge(query: Record<string, string | undefined>) {
  return verifyWebhookChallenge(query["hub.mode"], query["hub.verify_token"], query["hub.challenge"]);
}

export async function receiveWhatsAppWebhook(headers: Headers, rawBody: string) {
  verifyMetaSignature(rawBody, headers.get("x-hub-signature-256"));
  const events = parseWhatsAppPayload(rawBody);
  const processed: Array<{ id: string; duplicate: boolean; ignored?: boolean }> = [];
  for (const event of events) {
    const match = await findActiveIntegration(event);
    if (!match) {
      processed.push({ id: event.externalEventId, duplicate: false, ignored: true });
      continue;
    }
    const stored = await storeEvent(event, match.integration, rawBody);
    if (!stored) continue;
    if (stored.processedAt) {
      processed.push({ id: stored.id, duplicate: true });
      continue;
    }
    const claimed = await prisma.integrationEvent.updateMany({
      where: { id: stored.id, processedAt: null },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) {
      processed.push({ id: stored.id, duplicate: true });
      continue;
    }
    try {
      let status: "PROCESSED" | "IGNORED" = "IGNORED";
      if (event.eventType === "inbound_text") {
        status = await processInbound(event, match.integration.clinicId, rawBody);
      } else if (event.eventType.startsWith("inbound_")) {
        status = "IGNORED";
      } else if (event.eventType.startsWith("status_")) {
        status = await processStatus(event, match.integration.clinicId);
      } else if (event.eventType === "template_status") {
        status = await processTemplateStatus(event, match.integration.id, match.integration.clinicId);
      }
      await prisma.integrationEvent.update({
        where: { id: stored.id },
        data: { status, processedAt: new Date() },
      });
      processed.push({ id: stored.id, duplicate: false, ignored: status === "IGNORED" });
    } catch (error) {
      await prisma.integrationEvent.update({
        where: { id: stored.id },
        data: {
          status: "FAILED",
          error: error instanceof IntegrationError ? error.code : "PROCESSING_FAILED",
          processedAt: new Date(),
        },
      });
      processed.push({ id: stored.id, duplicate: false });
    }
  }
  return { received: true, events: processed };
}
