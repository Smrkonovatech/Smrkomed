import { prisma, type TenantContext } from "@smrkomed/database";
import { resolveWhatsAppAccessToken } from "../../integrations/providers/whatsapp/service";
import { downloadWhatsAppMediaBinary, getWhatsAppMediaMetadata } from "../../integrations/providers/whatsapp/graph";
import { mediaStorageProvider } from "./storage";
import { realtimeBus } from "../realtime/bus";

export async function downloadAndStoreWhatsAppMedia(clinicId: string, mediaRecordId: string) {
  const media = await prisma.whatsAppMedia.findUnique({
    where: { id: mediaRecordId },
    include: { message: true },
  });

  if (!media) {
    console.warn(`[WhatsApp Media] Record not found: ${mediaRecordId}`);
    return;
  }

  // Already successfully downloaded
  if (media.status === "READY" && media.storageKey) {
    return;
  }

  try {
    await prisma.whatsAppMedia.update({
      where: { id: media.id },
      data: { status: "DOWNLOADING" },
    });

    const token = await resolveWhatsAppAccessToken({ clinicId } as TenantContext);
    if (!token) {
      throw new Error("No valid WhatsApp access token resolved for clinic");
    }

    // 1. Get temporary download URL from Meta Graph API
    const metaMeta = await getWhatsAppMediaMetadata(media.providerMediaId, token);
    if (!metaMeta.url) {
      throw new Error(`Meta Graph API returned empty URL for media ${media.providerMediaId}`);
    }

    // 2. Download binary stream using server-side access token
    const { buffer, mimeType } = await downloadWhatsAppMediaBinary(metaMeta.url, token);

    // 3. Store file securely via storage abstraction
    const effectiveMime = media.mimeType || mimeType || metaMeta.mimeType;
    const stored = await mediaStorageProvider.upload({
      clinicId,
      providerMediaId: media.providerMediaId,
      type: media.type,
      buffer,
      mimeType: effectiveMime,
      filename: media.filename,
    });

    // 4. Update database record with storageKey, size, hash, and READY status
    const updatedMedia = await prisma.whatsAppMedia.update({
      where: { id: media.id },
      data: {
        status: "READY",
        storageKey: stored.storageKey,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        mimeType: effectiveMime,
        error: null,
      },
    });

    // 5. Publish real-time MESSAGE_MEDIA_UPDATED event to connected clinic sessions
    realtimeBus.publish({
      type: "MESSAGE_MEDIA_UPDATED",
      clinicId,
      conversationId: media.conversationId,
      messageId: media.messageId,
      media: {
        id: updatedMedia.id,
        type: updatedMedia.type,
        mimeType: updatedMedia.mimeType,
        filename: updatedMedia.filename,
        caption: updatedMedia.caption,
        sizeBytes: updatedMedia.sizeBytes,
        durationSeconds: updatedMedia.durationSeconds,
        isVoice: updatedMedia.isVoice,
        status: "READY",
        url: `/api/v1/whatsapp-automation/inbox/media/${updatedMedia.id}`,
      },
    });

    console.log(`[WhatsApp Media] Download complete for media ${updatedMedia.id} (${updatedMedia.type})`);
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : "Unknown download failure";
    const safeError = rawMsg.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]").slice(0, 500);

    console.error(`[WhatsApp Media Error] Failed to download media ${mediaRecordId}:`, safeError);

    try {
      const failedMedia = await prisma.whatsAppMedia.update({
        where: { id: media.id },
        data: {
          status: "FAILED",
          error: safeError,
        },
      });

      realtimeBus.publish({
        type: "MESSAGE_MEDIA_UPDATED",
        clinicId,
        conversationId: media.conversationId,
        messageId: media.messageId,
        media: {
          id: failedMedia.id,
          type: failedMedia.type,
          mimeType: failedMedia.mimeType,
          filename: failedMedia.filename,
          caption: failedMedia.caption,
          sizeBytes: failedMedia.sizeBytes,
          durationSeconds: failedMedia.durationSeconds,
          isVoice: failedMedia.isVoice,
          status: "FAILED",
          error: "Failed to download media attachment",
          url: `/api/v1/whatsapp-automation/inbox/media/${failedMedia.id}`,
        },
      });
    } catch {
      // Ignore database update error on cleanup
    }
  }
}

/**
 * Dispatches async background download without blocking the webhook acknowledgment.
 */
export function triggerBackgroundMediaDownload(clinicId: string, mediaRecordId: string) {
  // Execute asynchronously in background
  queueMicrotask(() => {
    downloadAndStoreWhatsAppMedia(clinicId, mediaRecordId).catch((err) => {
      console.error("[WhatsApp Media Background] Uncaught error in media worker:", err);
    });
  });
}
