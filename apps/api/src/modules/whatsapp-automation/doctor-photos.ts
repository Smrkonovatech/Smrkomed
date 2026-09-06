/**
 * Doctor Photos & Media Management for WhatsApp Interactive Flow.
 * Strictly Doctor-ID based mapping to supplied images.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DoctorPhotoAsset {
  filename: string;
  contentType: string;
  doctorIndex: number;
}

const DOCTOR_PHOTO_MAP: Record<string, DoctorPhotoAsset> = {
  // Doctor 1 -> Image 1 (Dr. Ananya Rao)
  doc_ananya: { filename: "doctor-ananya.png", contentType: "image/png", doctorIndex: 1 },
  "1": { filename: "doctor-ananya.png", contentType: "image/png", doctorIndex: 1 },

  // Doctor 2 -> Image 2 (Dr. Rahul Mehta)
  doc_rahul: { filename: "doctor-rahul.png", contentType: "image/png", doctorIndex: 2 },
  "2": { filename: "doctor-rahul.png", contentType: "image/png", doctorIndex: 2 },

  // Doctor 3 -> Image 3 (Dr. Priya Nair)
  doc_priya: { filename: "doctor-priya.jpg", contentType: "image/jpeg", doctorIndex: 3 },
  "3": { filename: "doctor-priya.jpg", contentType: "image/jpeg", doctorIndex: 3 },
};

/**
 * Deterministically resolve a doctor's photo asset based strictly on doctorId.
 */
export function resolveDoctorPhotoAsset(doctorId: string, doctorName?: string | null): DoctorPhotoAsset {
  const normalizedId = (doctorId || "").trim().toLowerCase();
  const directMatch = DOCTOR_PHOTO_MAP[normalizedId];
  if (directMatch) return directMatch;

  const normalizedName = (doctorName || "").trim().toLowerCase();

  // Explicit name or ID pattern matches
  if (normalizedId.includes("ananya") || normalizedName.includes("ananya")) {
    return DOCTOR_PHOTO_MAP["doc_ananya"]!;
  }
  if (normalizedId.includes("rahul") || normalizedName.includes("rahul")) {
    return DOCTOR_PHOTO_MAP["doc_rahul"]!;
  }
  if (normalizedId.includes("priya") || normalizedName.includes("priya")) {
    return DOCTOR_PHOTO_MAP["doc_priya"]!;
  }

  // Consistent stable hash for any arbitrary clinic doctor ID (no gender heuristics)
  let hash = 0;
  for (let i = 0; i < normalizedId.length; i++) {
    hash = (hash * 31 + normalizedId.charCodeAt(i)) >>> 0;
  }
  const idx = hash % 3;
  if (idx === 0) return DOCTOR_PHOTO_MAP["doc_ananya"]!;
  if (idx === 1) return DOCTOR_PHOTO_MAP["doc_rahul"]!;
  return DOCTOR_PHOTO_MAP["doc_priya"]!;
}

/**
 * Locate the local directory containing doctor assets.
 */
export function getDoctorAssetsDir(): string {
  const candidates = [
    path.join(__dirname, "../../../assets/doctors"),
    path.join(__dirname, "../../assets/doctors"),
    path.join(process.cwd(), "apps/api/assets/doctors"),
    path.join(process.cwd(), "assets/doctors"),
    path.join(__dirname, "assets/doctors"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return path.join(process.cwd(), "apps/api/assets/doctors");
}

/**
 * Get public API base URL for WhatsApp Meta Cloud API image webhooks.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env["PUBLIC_API_URL"] || process.env["API_BASE_URL"] || process.env["API_URL"];
  if (envUrl && !envUrl.includes("localhost")) return envUrl.replace(/\/$/, "");
  if (process.env["RAILWAY_STATIC_URL"]) {
    const host = process.env["RAILWAY_STATIC_URL"].replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  if (process.env["RAILWAY_PUBLIC_DOMAIN"]) {
    const host = process.env["RAILWAY_PUBLIC_DOMAIN"].replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "https://smrkomed-api-production.up.railway.app";
}

/**
 * Return public photo URL accessible by Meta Cloud API.
 */
export function getDoctorPhotoUrl(doctorId: string, baseUrl?: string): string {
  const base = (baseUrl || getApiBaseUrl()).replace(/\/$/, "");
  return `${base}/api/v1/public/doctors/${encodeURIComponent(doctorId)}/photo`;
}

/**
 * Return image buffer for a doctor photo.
 */
export async function getDoctorPhotoBuffer(
  doctorId: string,
  doctorName?: string | null,
): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  const asset = resolveDoctorPhotoAsset(doctorId, doctorName);
  const assetsDir = getDoctorAssetsDir();
  const filePath = path.join(assetsDir, asset.filename);
  if (!fs.existsSync(filePath)) return null;
  const buffer = await fs.promises.readFile(filePath);
  return { buffer, contentType: asset.contentType, filename: asset.filename };
}

interface CachedMetaMedia {
  mediaId: string;
  uploadedAt: number;
}

const doctorMetaMediaCache = new Map<string, CachedMetaMedia>();
const MEDIA_CACHE_TTL_MS = 25 * 24 * 60 * 60_000; // 25 days (Meta media IDs expire after 30 days)

/**
 * Upload doctor photo to Meta Cloud API and cache media ID for instant, native rendering.
 */
export async function getOrUploadDoctorMetaMediaId(
  tenant: { clinicId: string; organizationId: string; userId: string },
  doctorId: string,
  doctorName?: string | null,
): Promise<string | null> {
  const cacheKey = `${tenant.clinicId}_${doctorId}`;
  const cached = doctorMetaMediaCache.get(cacheKey);
  if (cached && Date.now() - cached.uploadedAt < MEDIA_CACHE_TTL_MS) {
    return cached.mediaId;
  }

  const asset = await getDoctorPhotoBuffer(doctorId, doctorName);
  if (!asset) return null;

  try {
    const { resolveWhatsAppSenderCredentials } = await import("../../integrations/providers/whatsapp/service");
    const { uploadWhatsAppMedia } = await import("../../integrations/providers/whatsapp/graph");

    const creds = await resolveWhatsAppSenderCredentials(tenant as any);
    if (!creds?.phoneNumberId || !creds?.token) return null;

    console.log("[DOCTOR_IMAGE_SEND_STARTED]", {
      clinicId: tenant.clinicId,
      doctorId,
      filename: asset.filename,
      uploadingToMeta: true,
    });

    const res = await uploadWhatsAppMedia({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.token,
      buffer: asset.buffer,
      mimeType: asset.contentType,
      filename: asset.filename,
    });

    if (res?.id) {
      doctorMetaMediaCache.set(cacheKey, { mediaId: res.id, uploadedAt: Date.now() });
      console.log("[DOCTOR_IMAGE_SEND_RESULT]", {
        clinicId: tenant.clinicId,
        doctorId,
        metaMediaId: res.id,
        success: true,
      });
      return res.id;
    }
  } catch (err) {
    console.warn("[DOCTOR_IMAGE_SEND_RESULT]", {
      clinicId: tenant.clinicId,
      doctorId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      note: "Falling back to public photo URL",
    });
  }

  return null;
}

