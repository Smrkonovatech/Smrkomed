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
import { triggerBackgroundMediaDownload } from "../../../modules/media/service";
import { sanitizeFilename } from "../../../modules/media/storage";
import { scheduleInboundWhatsAppAutomation, runInboundWhatsAppAi } from "../../../modules/whatsapp-automation/inbound-dispatch";
import type { WhatsAppMediaType, WhatsAppMediaStatus } from "@smrkomed/database";

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

export interface InboundMediaMeta {
  type: WhatsAppMediaType;
  providerMediaId: string;
  mimeType: string;
  filename?: string | null;
  caption?: string | null;
  sha256?: string | null;
  isVoice?: boolean;
}

export interface ExtractedInboundMessage {
  type: string;
  text: string;
  media: InboundMediaMeta | null;
}

function extractInboundMessage(rawBody: string, messageId: string): ExtractedInboundMessage {
  try {
    const payload = JSON.parse(rawBody) as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              id?: string;
              type?: string;
              text?: { body?: string };
              audio?: { id?: string; mime_type?: string; sha256?: string; voice?: boolean };
              image?: { id?: string; mime_type?: string; sha256?: string; caption?: string };
              video?: { id?: string; mime_type?: string; sha256?: string; caption?: string; filename?: string };
              document?: { id?: string; mime_type?: string; sha256?: string; caption?: string; filename?: string };
              sticker?: { id?: string; mime_type?: string; sha256?: string; animated?: boolean };
            }>;
          };
        }>;
      }>;
    };
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const match = change.value?.messages?.find((row) => row.id === messageId);
        if (!match) continue;

        if (match.type === "text" && match.text?.body) {
          return { type: "text", text: match.text.body, media: null };
        }

        if (match.type === "audio" && match.audio?.id) {
          const isVoice = Boolean(match.audio.voice);
          return {
            type: "audio",
            text: isVoice ? "🎤 Voice message" : "🎵 Audio message",
            media: {
              type: "AUDIO",
              providerMediaId: match.audio.id,
              mimeType: match.audio.mime_type || "audio/ogg",
              sha256: match.audio.sha256 ?? null,
              isVoice,
            },
          };
        }

        if (match.type === "image" && match.image?.id) {
          return {
            type: "image",
            text: match.image.caption || "📷 Photo",
            media: {
              type: "IMAGE",
              providerMediaId: match.image.id,
              mimeType: match.image.mime_type || "image/jpeg",
              caption: match.image.caption ?? null,
              sha256: match.image.sha256 ?? null,
            },
          };
        }

        if (match.type === "video" && match.video?.id) {
          return {
            type: "video",
            text: match.video.caption || "📹 Video",
            media: {
              type: "VIDEO",
              providerMediaId: match.video.id,
              mimeType: match.video.mime_type || "video/mp4",
              filename: match.video.filename ?? null,
              caption: match.video.caption ?? null,
              sha256: match.video.sha256 ?? null,
            },
          };
        }

        if (match.type === "document" && match.document?.id) {
          return {
            type: "document",
            text: match.document.filename || match.document.caption || "📄 Document",
            media: {
              type: "DOCUMENT",
              providerMediaId: match.document.id,
              mimeType: match.document.mime_type || "application/pdf",
              filename: match.document.filename ?? null,
              caption: match.document.caption ?? null,
              sha256: match.document.sha256 ?? null,
            },
          };
        }

        if (match.type === "sticker" && match.sticker?.id) {
          return {
            type: "sticker",
            text: "Sticker",
            media: {
              type: "STICKER",
              providerMediaId: match.sticker.id,
              mimeType: match.sticker.mime_type || "image/webp",
              sha256: match.sticker.sha256 ?? null,
            },
          };
        }

        if (match.type) {
          return {
            type: "unknown",
            text: `Unsupported WhatsApp media: ${match.type}`,
            media: null,
          };
        }
      }
    }
  } catch (err) {
    console.error("[WhatsApp Webhook] Error parsing inbound message payload:", err);
  }
  return { type: "unknown", text: "Unsupported WhatsApp message", media: null };
}

async function processInbound(event: NormalizedWebhookEvent, clinicId: string, rawBody: string) {
  const from = typeof event.metadata["from"] === "string" ? normalizeWhatsAppPhone(event.metadata["from"]) : "";
  if (!from) return "IGNORED" as const;
  const inbound = extractInboundMessage(rawBody, event.externalEventId);
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
        messageType: inbound.type,
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

  // Create associated media record if inbound message contains media
  let mediaRecord: {
    id: string;
    type: WhatsAppMediaType;
    mimeType: string;
    filename: string | null;
    caption: string | null;
    sizeBytes: number | null;
    durationSeconds: number | null;
    isVoice: boolean;
    status: WhatsAppMediaStatus;
  } | null = null;

  if (inbound.media && createdMessage) {
    try {
      mediaRecord = await prisma.whatsAppMedia.create({
        data: {
          clinicId,
          conversationId: conversation.id,
          messageId: createdMessage.id,
          provider: "WHATSAPP_CLOUD",
          providerMediaId: inbound.media.providerMediaId,
          type: inbound.media.type,
          mimeType: inbound.media.mimeType,
          filename: sanitizeFilename(inbound.media.filename) || null,
          caption: inbound.media.caption ?? null,
          sha256: inbound.media.sha256 ?? null,
          isVoice: inbound.media.isVoice ?? false,
          status: "PENDING",
        },
        select: {
          id: true,
          type: true,
          mimeType: true,
          filename: true,
          caption: true,
          sizeBytes: true,
          durationSeconds: true,
          isVoice: true,
          status: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        mediaRecord = await prisma.whatsAppMedia.findUnique({
          where: { clinicId_providerMediaId: { clinicId, providerMediaId: inbound.media.providerMediaId } },
          select: {
            id: true,
            type: true,
            mimeType: true,
            filename: true,
            caption: true,
            sizeBytes: true,
            durationSeconds: true,
            isVoice: true,
            status: true,
          },
        });
      } else {
        console.error("[WhatsApp Media] Failed to create media record:", error);
      }
    }
  }

  if (createdMessage) {
    const mediaPayload = mediaRecord
      ? {
          id: mediaRecord.id,
          type: mediaRecord.type,
          mimeType: mediaRecord.mimeType,
          filename: mediaRecord.filename,
          caption: mediaRecord.caption,
          sizeBytes: mediaRecord.sizeBytes,
          durationSeconds: mediaRecord.durationSeconds,
          isVoice: mediaRecord.isVoice,
          status: mediaRecord.status,
          url: `/api/v1/whatsapp-automation/inbox/media/${mediaRecord.id}`,
        }
      : null;

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
        media: mediaPayload,
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

    // Trigger async background media download without blocking the webhook
    if (mediaRecord && mediaRecord.status === "PENDING") {
      triggerBackgroundMediaDownload(clinicId, mediaRecord.id);
    }
  }

  if (createdMessage) {
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
  // Phase 4: automation AFTER persist — async so webhook returns promptly.
  // Only for newly created messages (duplicate providerMessageId → createdMessage null).
  // Notifications must also skip duplicates so staff are not spammed.
  if (createdMessage) {
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
    const inboundJob = {
      clinicId,
      conversationId: conversation.id,
      patientId: patient?.id ?? conversation.patientId,
      contactPhone: conversation.contactPhone ?? from,
      unmatched: conversation.unmatched,
      messageId: createdMessage.id,
      providerMessageId: event.externalEventId,
      messageType: createdMessage.messageType,
      messageText: createdMessage.content,
      mediaType: mediaRecord?.type ?? null,
      mediaMimeType: mediaRecord?.mimeType ?? null,
      mediaCaption: mediaRecord?.caption ?? null,
      timestampIso: createdMessage.createdAt.toISOString(),
    };

    // Await AI in webhook (fast for greetings). If it fails/times out, also run AI in background.
    let aiOk = false;
    try {
      const raced = await Promise.race([
        runInboundWhatsAppAi(inboundJob).then((r) => ({ kind: "ok" as const, r })),
        new Promise<{ kind: "timeout" }>((resolve) => {
          setTimeout(() => resolve({ kind: "timeout" }), 12_000);
        }),
      ]);
      if (raced.kind === "ok") {
        aiOk = Boolean(raced.r.messageId);
        console.log("[WhatsApp AI] webhook await finished", {
          skipped: Boolean(raced.r.skipped),
          reason: raced.r.reason ?? null,
          messageId: raced.r.messageId ?? null,
        });
      } else {
        console.error("[WhatsApp AI] webhook await timed out at 12s — background will retry");
      }
    } catch (err) {
      console.error(
        "[WhatsApp AI] webhook-awaited AI failed:",
        err instanceof Error ? err.message : err,
      );
    }

    // Always schedule automation; re-run AI in background only if webhook path did not send.
    scheduleInboundWhatsAppAutomation({ ...inboundJob, skipAi: aiOk });
  }

  return "PROCESSED" as const;
}

const MESSAGE_STATUS_RANK: Record<string, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 100,
};

function shouldApplyMessageStatus(current: string, next: string): boolean {
  if (next === "FAILED") return true;
  if (current === "FAILED") return false;
  const curRank = MESSAGE_STATUS_RANK[current] ?? -1;
  const nextRank = MESSAGE_STATUS_RANK[next] ?? -1;
  return nextRank >= curRank;
}

async function processStatus(event: NormalizedWebhookEvent, clinicId: string) {
  const providerMessageId = typeof event.metadata["providerMessageId"] === "string" ? event.metadata["providerMessageId"] : "";
  const statusRaw = typeof event.metadata["status"] === "string" ? event.metadata["status"] : "";
  const mapped = metaStatusToMessage(statusRaw);
  if (!providerMessageId || !mapped) return "IGNORED" as const;

  const existing = await prisma.message.findFirst({
    where: { providerMessageId },
    select: {
      id: true,
      status: true,
      conversationId: true,
      conversation: { select: { clinicId: true } },
    },
  });

  if (!existing) {
    // Unknown outbound id — acknowledge without creating orphans.
    return "IGNORED" as const;
  }

  if (!shouldApplyMessageStatus(existing.status, mapped)) {
    return "PROCESSED" as const;
  }

  await prisma.message.updateMany({
    where: { id: existing.id, providerMessageId },
    data: { status: mapped },
  });

  const targetClinicId = existing.conversation?.clinicId ?? clinicId;
  realtimeBus.publish({
    type: "MESSAGE_STATUS_UPDATED",
    clinicId: targetClinicId,
    conversationId: existing.conversationId,
    messageId: existing.id,
    providerMessageId,
    status: mapped,
  });
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
    // Atomic claim: only one concurrent delivery may process (status RECEIVED → PROCESSING).
    const claimed = await prisma.integrationEvent.updateMany({
      where: { id: stored.id, processedAt: null, status: "RECEIVED" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) {
      processed.push({ id: stored.id, duplicate: true });
      continue;
    }
    try {
      let status: "PROCESSED" | "IGNORED" = "IGNORED";
      if (event.eventType === "inbound_text" || event.eventType.startsWith("inbound_")) {
        status = await processInbound(event, match.integration.clinicId, rawBody);
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
