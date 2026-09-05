/**
 * Outbound WhatsApp media validation — MIME allowlist + Meta-aligned size limits.
 */

export type OutboundMediaKind = "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/3gpp"]);
const AUDIO_MIMES = new Set([
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/amr",
  "audio/ogg",
  "audio/opus",
  "audio/webm", // browser MediaRecorder often produces webm; may need conversion for Meta
]);
const DOCUMENT_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

/** Meta Cloud API approximate limits (bytes). */
export const OUTBOUND_MEDIA_MAX_BYTES: Record<OutboundMediaKind, number> = {
  IMAGE: 5 * 1024 * 1024,
  VIDEO: 16 * 1024 * 1024,
  AUDIO: 16 * 1024 * 1024,
  DOCUMENT: 100 * 1024 * 1024,
};

export function normalizeMime(mime: string): string {
  return (mime.split(";")[0] ?? mime).trim().toLowerCase();
}

export function inferMediaKind(mimeType: string): OutboundMediaKind | null {
  const mime = normalizeMime(mimeType);
  if (IMAGE_MIMES.has(mime)) return "IMAGE";
  if (VIDEO_MIMES.has(mime)) return "VIDEO";
  if (AUDIO_MIMES.has(mime)) return "AUDIO";
  if (DOCUMENT_MIMES.has(mime)) return "DOCUMENT";
  if (mime.startsWith("image/")) return null; // unsupported image subtype
  if (mime.startsWith("video/")) return null;
  if (mime.startsWith("audio/")) return null;
  return null;
}

export function isAllowedOutboundMime(mimeType: string, kind?: OutboundMediaKind): boolean {
  const mime = normalizeMime(mimeType);
  const inferred = inferMediaKind(mime);
  if (!inferred) return false;
  if (kind && inferred !== kind) return false;
  return true;
}

export function validateOutboundMediaFile(input: {
  mimeType: string;
  sizeBytes: number;
  filename?: string | null;
  kind?: OutboundMediaKind;
  isVoice?: boolean;
}): { ok: true; kind: OutboundMediaKind; mimeType: string } | { ok: false; reason: string } {
  const mimeType = normalizeMime(input.mimeType);
  if (!mimeType) return { ok: false, reason: "MIME type is required." };

  // Block executable / script types explicitly
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("html") ||
    mimeType === "application/x-msdownload" ||
    mimeType === "application/x-executable" ||
    mimeType === "application/octet-stream" && (input.filename ?? "").match(/\.(exe|bat|cmd|sh|js|msi)$/i)
  ) {
    return { ok: false, reason: "This file type is not allowed." };
  }

  const kind = input.kind ?? inferMediaKind(mimeType);
  if (!kind || !isAllowedOutboundMime(mimeType, kind)) {
    return {
      ok: false,
      reason: "Unsupported media type for WhatsApp. Use JPEG/PNG/WebP, MP4, PDF/Office docs, or supported audio.",
    };
  }

  // Browser voice notes often land as audio/webm — accept for storage; Meta may reject (handled at send)
  if (input.isVoice && kind !== "AUDIO") {
    return { ok: false, reason: "Voice notes must be audio." };
  }

  const max = OUTBOUND_MEDIA_MAX_BYTES[kind];
  if (input.sizeBytes <= 0) return { ok: false, reason: "File is empty." };
  if (input.sizeBytes > max) {
    return {
      ok: false,
      reason: `File exceeds the ${Math.round(max / (1024 * 1024))}MB limit for ${kind.toLowerCase()} messages.`,
    };
  }

  return { ok: true, kind, mimeType };
}

export function graphMessageTypeForKind(kind: OutboundMediaKind): "image" | "video" | "document" | "audio" {
  if (kind === "IMAGE") return "image";
  if (kind === "VIDEO") return "video";
  if (kind === "AUDIO") return "audio";
  return "document";
}
