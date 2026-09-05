/**
 * Outbound WhatsApp session media (staff). Reuses Graph upload + WhatsAppMedia + SSE.
 */

import { randomUUID } from "node:crypto";
import { prisma, writeAuditLog, type TenantContext, type WhatsAppMediaType } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { credentialService } from "../../credentials/service";
import { createMemoryRateLimiter } from "../../../middleware/rate-limit";
import { sendMediaMessage, uploadWhatsAppMedia } from "./graph";
import { normalizeWhatsAppPhone } from "./phone";
import { realtimeBus } from "../../../modules/realtime/bus";
import { mediaStorageProvider, sanitizeFilename } from "../../../modules/media/storage";
import {
  graphMessageTypeForKind,
  validateOutboundMediaFile,
  type OutboundMediaKind,
} from "../../../modules/media/outbound-validation";

const perUser = createMemoryRateLimiter(10, 60_000);
const perClinic = createMemoryRateLimiter(30, 60_000);

function assertRateLimit(userId: string, clinicId: string) {
  if (!perUser.consume(`wa-user:${userId}`).allowed) {
    throw new IntegrationError("PROVIDER_RATE_LIMITED", "Too many WhatsApp send attempts.", 429);
  }
  if (!perClinic.consume(`wa-clinic:${clinicId}`).allowed) {
    throw new IntegrationError("PROVIDER_RATE_LIMITED", "Clinic WhatsApp send limit reached.", 429);
  }
}

async function loadActiveConnection(ctx: TenantContext) {
  const integration = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
  });
  if (!integration || integration.organizationId !== ctx.organizationId || integration.status !== "ACTIVE") {
    throw new IntegrationError("WHATSAPP_NOT_CONNECTED", "WhatsApp is not connected for this clinic.", 409);
  }
  const account = await prisma.whatsAppAccount.findFirst({
    where: { clinicId: ctx.clinicId, integrationId: integration.id, isActive: true },
  });
  if (!account) {
    throw new IntegrationError("PHONE_NOT_REGISTERED", "No active WhatsApp phone number is connected.", 409);
  }
  const credentials = credentialService.decrypt(integration.encryptedCredentials);
  const token = credentials.accessToken ?? credentials.systemUserToken;
  if (!token) {
    throw new IntegrationError("AUTHORIZATION_EXPIRED", "WhatsApp authorization requires attention.", 401);
  }
  return { integration, account, token };
}

async function assertConsent(ctx: TenantContext, patientId: string | null) {
  if (!patientId) return;
  const consent = await prisma.consent.findFirst({
    where: {
      clinicId: ctx.clinicId,
      patientId,
      channel: "WHATSAPP",
      consentType: "WHATSAPP_COMMUNICATION",
      status: "REVOKED",
    },
  });
  if (consent) {
    throw new IntegrationError("INVALID_RECIPIENT", "This patient has revoked WhatsApp communication.", 403);
  }
  const prefs = await prisma.communicationPreference.findUnique({ where: { patientId } });
  if (prefs && !prefs.whatsappEnabled) {
    throw new IntegrationError("INVALID_RECIPIENT", "Patient has disabled WhatsApp in communication preferences.", 403);
  }
}

async function resolveConversationForMedia(ctx: TenantContext, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, clinicId: ctx.clinicId, channel: "WHATSAPP" },
  });
  if (!conversation) throw new IntegrationError("INVALID_RECIPIENT", "Conversation was not found.", 404);
  if (conversation.contactPhone) return conversation;
  if (conversation.patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: conversation.patientId, clinicId: ctx.clinicId },
    });
    const phone = normalizeWhatsAppPhone(patient?.whatsappNumber || patient?.phone || "");
    if (!phone) {
      throw new IntegrationError("INVALID_RECIPIENT", "No WhatsApp number is associated with this conversation.", 422);
    }
    return prisma.conversation.update({
      where: { id: conversation.id },
      data: { contactPhone: phone },
    });
  }
  throw new IntegrationError("INVALID_RECIPIENT", "No WhatsApp number is associated with this conversation.", 422);
}

function contentPreview(kind: OutboundMediaKind, filename: string | null, caption: string | null) {
  if (caption?.trim()) return caption.trim().slice(0, 500);
  if (kind === "IMAGE") return "Image attachment";
  if (kind === "VIDEO") return "Video attachment";
  if (kind === "AUDIO") return "Voice note";
  return filename ? `Document: ${filename}` : "Document attachment";
}

function mediaPayload(row: {
  id: string;
  type: WhatsAppMediaType;
  mimeType: string;
  filename: string | null;
  caption: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  isVoice: boolean;
  status: string;
  error: string | null;
}) {
  const status =
    row.status === "PENDING" ||
    row.status === "DOWNLOADING" ||
    row.status === "READY" ||
    row.status === "FAILED" ||
    row.status === "EXPIRED"
      ? row.status
      : "FAILED";
  return {
    id: row.id,
    type: row.type,
    mimeType: row.mimeType,
    filename: row.filename,
    caption: row.caption,
    sizeBytes: row.sizeBytes,
    durationSeconds: row.durationSeconds,
    isVoice: row.isVoice,
    status,
    error: row.error,
    url: `/api/v1/whatsapp-automation/inbox/media/${row.id}`,
  } as const;
}

export async function sendWhatsAppSessionMedia(
  ctx: TenantContext,
  input: {
    conversationId: string;
    buffer: Buffer;
    mimeType: string;
    filename?: string | null;
    caption?: string | null;
    kind?: OutboundMediaKind;
    isVoice?: boolean;
    durationSeconds?: number | null;
  },
) {
  assertRateLimit(ctx.userId, ctx.clinicId);

  const validated = validateOutboundMediaFile({
    mimeType: input.mimeType,
    sizeBytes: input.buffer.length,
    ...(input.filename !== undefined ? { filename: input.filename } : {}),
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.isVoice ? { isVoice: input.isVoice } : {}),
  });
  if (!validated.ok) {
    throw new IntegrationError("INVALID_TEMPLATE", validated.reason, 422);
  }

  const filename = sanitizeFilename(input.filename) || `file${validated.kind === "IMAGE" ? ".jpg" : ""}`;
  const caption = input.caption?.trim() ? input.caption.trim().slice(0, 1024) : null;
  const isVoice = Boolean(input.isVoice && validated.kind === "AUDIO");

  const { account, token } = await loadActiveConnection(ctx);
  const conversation = await resolveConversationForMedia(ctx, input.conversationId);
  const recipient = conversation.contactPhone;
  if (!recipient) {
    throw new IntegrationError("INVALID_RECIPIENT", "No WhatsApp number is associated with this conversation.", 422);
  }
  await assertConsent(ctx, conversation.patientId);

  const localMediaKey = `outbound_${randomUUID()}`;

  // 1. Persist binary in clinic media storage (before Meta — enables retry)
  const storedFile = await mediaStorageProvider.upload({
    clinicId: ctx.clinicId,
    providerMediaId: localMediaKey,
    type: validated.kind,
    buffer: input.buffer,
    mimeType: validated.mimeType,
    filename,
  });

  const messageType = graphMessageTypeForKind(validated.kind);
  const preview = contentPreview(validated.kind, filename || null, caption);

  // 2. Create Message (QUEUED) + WhatsAppMedia (PENDING) before Meta calls
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      senderType: "STAFF",
      content: preview,
      messageType,
      status: "QUEUED",
    },
  });

  let mediaRow = await prisma.whatsAppMedia.create({
    data: {
      clinicId: ctx.clinicId,
      conversationId: conversation.id,
      messageId: message.id,
      provider: "WHATSAPP_CLOUD",
      providerMediaId: localMediaKey,
      type: validated.kind as WhatsAppMediaType,
      mimeType: validated.mimeType,
      filename: filename || null,
      caption,
      sizeBytes: storedFile.sizeBytes,
      sha256: storedFile.sha256,
      storageKey: storedFile.storageKey,
      status: "PENDING",
      isVoice,
      durationSeconds: input.durationSeconds ?? null,
    },
  });

  realtimeBus.publish({
    type: "MESSAGE_CREATED",
    clinicId: ctx.clinicId,
    conversationId: conversation.id,
    message: {
      id: message.id,
      direction: "OUTBOUND",
      senderType: "STAFF",
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt.toISOString(),
      status: message.status,
      label: "STAFF",
      media: mediaPayload(mediaRow),
    },
    conversation: {
      id: conversation.id,
      status: conversation.status,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "whatsapp.message.send.media.attempt",
    entityType: "Message",
    entityId: message.id,
    metadata: { kind: validated.kind, isVoice },
  });

  try {
    // 3. Upload to Meta
    const uploaded = await uploadWhatsAppMedia({
      phoneNumberId: account.phoneNumberId,
      accessToken: token,
      buffer: input.buffer,
      mimeType: validated.mimeType,
      filename: filename || "file",
    });

    // Update providerMediaId to Meta's ID (unique per clinic)
    mediaRow = await prisma.whatsAppMedia.update({
      where: { id: mediaRow.id },
      data: {
        providerMediaId: uploaded.id,
        status: "READY",
        error: null,
      },
    });

    // 4. Send WhatsApp message
    const result = await sendMediaMessage({
      phoneNumberId: account.phoneNumberId,
      accessToken: token,
      to: recipient,
      type: messageType,
      mediaId: uploaded.id,
      ...(caption ? { caption } : {}),
      ...(filename ? { filename } : {}),
      ...(isVoice ? { voice: true } : {}),
    });

    const messages = result["messages"];
    const providerMessageId =
      Array.isArray(messages) && messages[0] && typeof messages[0] === "object"
        ? String((messages[0] as { id?: string }).id ?? "")
        : "";

    const stored = await prisma.message.update({
      where: { id: message.id },
      data: {
        providerMessageId: providerMessageId || null,
        status: "SENT",
      },
    });

    const updatedConv = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: conversation.status === "CLOSED" ? "OPEN" : "WAITING_PATIENT",
        updatedAt: new Date(),
        lastStaffReadAt: new Date(),
      },
    });

    const mediaOut = mediaPayload(mediaRow);
    realtimeBus.publish({
      type: "MESSAGE_CREATED",
      clinicId: ctx.clinicId,
      conversationId: conversation.id,
      message: {
        id: stored.id,
        direction: "OUTBOUND",
        senderType: "STAFF",
        content: stored.content,
        messageType: stored.messageType,
        createdAt: stored.createdAt.toISOString(),
        status: stored.status,
        label: "STAFF",
        media: mediaOut,
      },
      conversation: {
        id: conversation.id,
        status: updatedConv.status,
        unreadCount: 0,
        updatedAt: updatedConv.updatedAt.toISOString(),
      },
    });
    realtimeBus.publish({
      type: "MESSAGE_MEDIA_UPDATED",
      clinicId: ctx.clinicId,
      conversationId: conversation.id,
      messageId: stored.id,
      media: mediaOut,
    });
    realtimeBus.publish({
      type: "CONVERSATION_UPDATED",
      clinicId: ctx.clinicId,
      conversationId: conversation.id,
      patch: {
        status: updatedConv.status,
        unreadCount: 0,
        updatedAt: updatedConv.updatedAt.toISOString(),
        lastMessage: {
          id: stored.id,
          preview: stored.content.slice(0, 100),
          createdAt: stored.createdAt.toISOString(),
          direction: "OUTBOUND",
          senderType: "STAFF",
          status: stored.status,
        },
      },
    });

    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.message.send.media.success",
      entityType: "Message",
      entityId: stored.id,
      metadata: { kind: validated.kind },
    });

    return {
      id: stored.id,
      status: stored.status,
      providerMessageId: stored.providerMessageId,
      media: mediaOut,
    };
  } catch (error) {
    const safeError =
      error instanceof IntegrationError
        ? error.message
        : "WhatsApp could not send this media. The 24-hour session window may be closed.";

    await prisma.message.update({
      where: { id: message.id },
      data: { status: "FAILED" },
    });
    const failedMedia = await prisma.whatsAppMedia.update({
      where: { id: mediaRow.id },
      data: {
        status: "FAILED",
        error: safeError.slice(0, 500),
      },
    });

    realtimeBus.publish({
      type: "MESSAGE_STATUS_UPDATED",
      clinicId: ctx.clinicId,
      conversationId: conversation.id,
      messageId: message.id,
      status: "FAILED",
    });
    realtimeBus.publish({
      type: "MESSAGE_MEDIA_UPDATED",
      clinicId: ctx.clinicId,
      conversationId: conversation.id,
      messageId: message.id,
      media: mediaPayload(failedMedia),
    });

    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.message.send.media.failure",
      entityType: "Message",
      entityId: message.id,
      metadata: { kind: validated.kind },
    });

    throw error instanceof IntegrationError
      ? error
      : new IntegrationError("MESSAGE_SEND_FAILED", safeError, 500);
  }
}

/**
 * Retry a failed outbound media message using stored binary (no re-upload from browser).
 */
export async function retryWhatsAppSessionMedia(ctx: TenantContext, input: { conversationId: string; messageId: string }) {
  assertRateLimit(ctx.userId, ctx.clinicId);
  const conversation = await resolveConversationForMedia(ctx, input.conversationId);
  const message = await prisma.message.findFirst({
    where: {
      id: input.messageId,
      conversationId: conversation.id,
      direction: "OUTBOUND",
    },
    include: { whatsappMedia: true },
  });
  if (!message?.whatsappMedia) {
    throw new IntegrationError("INVALID_TEMPLATE", "Media message was not found.", 404);
  }
  if (message.status !== "FAILED" && message.whatsappMedia.status !== "FAILED") {
    throw new IntegrationError("INVALID_TEMPLATE", "Only failed media messages can be retried.", 422);
  }
  if (!message.whatsappMedia.storageKey) {
    throw new IntegrationError("INVALID_TEMPLATE", "Original media file is not available for retry.", 422);
  }

  const buffer = await mediaStorageProvider.getBuffer(message.whatsappMedia.storageKey);
  return sendWhatsAppSessionMedia(ctx, {
    conversationId: conversation.id,
    buffer,
    mimeType: message.whatsappMedia.mimeType,
    filename: message.whatsappMedia.filename,
    caption: message.whatsappMedia.caption,
    kind: message.whatsappMedia.type as OutboundMediaKind,
    isVoice: message.whatsappMedia.isVoice,
    durationSeconds: message.whatsappMedia.durationSeconds,
  });
}

/**
 * Send an existing patient Document (must have stored binary) over WhatsApp.
 */
export async function sendPatientDocumentOverWhatsApp(
  ctx: TenantContext,
  input: { conversationId: string; documentId: string; caption?: string | null },
) {
  const conversation = await resolveConversationForMedia(ctx, input.conversationId);
  const document = await prisma.document.findFirst({
    where: { id: input.documentId, clinicId: ctx.clinicId },
  });
  if (!document) {
    throw new IntegrationError("INVALID_TEMPLATE", "Document was not found for this clinic.", 404);
  }

  // Tenant guard: document must belong to conversation patient/couple when linked
  if (conversation.patientId && document.patientId && document.patientId !== conversation.patientId) {
    throw new IntegrationError("INVALID_TEMPLATE", "Document does not belong to this patient.", 403);
  }
  if (conversation.coupleId && document.coupleId && document.coupleId !== conversation.coupleId) {
    throw new IntegrationError("INVALID_TEMPLATE", "Document does not belong to this couple.", 403);
  }

  if (!document.storageKey) {
    throw new IntegrationError(
      "INVALID_TEMPLATE",
      "This document has no stored file (metadata only). Upload the file first, then send.",
      422,
    );
  }

  const exists = await mediaStorageProvider.exists(document.storageKey);
  if (!exists) {
    throw new IntegrationError(
      "INVALID_TEMPLATE",
      "Document file is not available in storage. Upload the file again to send via WhatsApp.",
      422,
    );
  }

  const buffer = await mediaStorageProvider.getBuffer(document.storageKey);
  const mimeType = document.mimeType || "application/pdf";
  const caption =
    input.caption?.trim() ||
    `Hi, please find your document: ${document.name}`;

  return sendWhatsAppSessionMedia(ctx, {
    conversationId: conversation.id,
    buffer,
    mimeType,
    filename: document.name,
    caption,
    kind: "DOCUMENT",
  });
}
