/**
 * Doctor Photos & Media Management for WhatsApp Interactive Flow.
 * Resolves doctor images from:
 *   1. Real profile data (photoDataUrl / profileImageUrl stored in AutomationRule config)
 *   2. Static asset files as fallback
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@smrkomed/database";

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
 * Lookup the real profileImageUrl or photo endpoint for the doctor's saved profile data in the DB.
 * Returns the URL string if found, null otherwise.
 */
export async function resolveRealDoctorImageUrl(
  clinicId?: string | null,
  doctorId?: string | null,
  doctorName?: string | null,
): Promise<string | null> {
  try {
    if (!doctorId && !doctorName) return null;
    const cleanId = (doctorId || "").replace(/^doc_/, "");

    const whereOr: Array<Record<string, unknown>> = [];
    if (cleanId) whereOr.push({ name: cleanId }, { name: `doc_${cleanId}` });
    if (doctorId) whereOr.push({ name: doctorId });

    // Try within clinicId first if provided
    let rule = whereOr.length > 0 ? await prisma.automationRule.findFirst({
      where: {
        ...(clinicId ? { clinicId } : {}),
        trigger: "DOCTOR_PROFILE",
        OR: whereOr,
      },
    }) : null;

    // Cross-clinic fallback: doctor may have been registered in another clinic (e.g. Kochi vs Bangalore)
    if (!rule && whereOr.length > 0 && clinicId) {
      rule = await prisma.automationRule.findFirst({
        where: {
          trigger: "DOCTOR_PROFILE",
          OR: whereOr,
        },
      });
    }

    if (!rule && doctorName) {
      const cleanName = doctorName.replace(/^Dr\s*\.?\s*/i, "").trim();
      const users = await prisma.user.findMany({
        where: {
          name: { contains: cleanName, mode: "insensitive" },
        },
        select: { id: true },
        take: 5,
      });
      for (const u of users) {
        rule = await prisma.automationRule.findFirst({
          where: {
            ...(clinicId ? { clinicId } : {}),
            trigger: "DOCTOR_PROFILE",
            OR: [{ name: u.id }, { name: `doc_${u.id}` }],
          },
        });
        if (!rule) {
          rule = await prisma.automationRule.findFirst({
            where: {
              trigger: "DOCTOR_PROFILE",
              OR: [{ name: u.id }, { name: `doc_${u.id}` }],
            },
          });
        }
        if (rule) break;
      }

      // Also search profile rules directly by displayName
      if (!rule) {
        const allRules = await prisma.automationRule.findMany({
          where: { trigger: "DOCTOR_PROFILE" },
        });
        for (const r of allRules) {
          const cfg = r.config as any;
          const dName = (cfg?.displayName || "").replace(/^Dr\s*\.?\s*/i, "").trim().toLowerCase();
          if (dName && (dName.includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(dName))) {
            rule = r;
            break;
          }
        }
      }
    }

    if (rule?.config && typeof rule.config === "object") {
      const cfg = rule.config as any;
      const httpUrl = (typeof cfg["profileImageUrl"] === "string" && cfg["profileImageUrl"].startsWith("http")) ? cfg["profileImageUrl"] :
                      (typeof cfg["photoUrl"] === "string" && cfg["photoUrl"].startsWith("http")) ? cfg["photoUrl"] :
                      (typeof cfg["imageUrl"] === "string" && cfg["imageUrl"].startsWith("http")) ? cfg["imageUrl"] :
                      (typeof cfg["avatarUrl"] === "string" && cfg["avatarUrl"].startsWith("http")) ? cfg["avatarUrl"] : null;
      if (httpUrl) return httpUrl;

      // If stored as base64 data URL, the public photo endpoint serves it as a real image URL
      const dataUrl = (typeof cfg["photoDataUrl"] === "string" && cfg["photoDataUrl"].startsWith("data:image/")) ? cfg["photoDataUrl"] :
                      (typeof cfg["profileImageUrl"] === "string" && cfg["profileImageUrl"].startsWith("data:image/")) ? cfg["profileImageUrl"] : null;
      if (dataUrl) {
        const effectiveId = cleanId || doctorId || (rule.name ? rule.name.replace(/^doc_/, "") : null);
        if (effectiveId) {
          return getDoctorPhotoUrl(effectiveId);
        }
      }
    }
  } catch {
    // DB lookup failed, fall back to static assets
  }
  return null;
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
 * Priority:
 *   1. Uploaded base64 image (photoDataUrl) from AutomationRule profile in DB
 *   2. Custom HTTP/HTTPS image URL (fetched as buffer)
 *   3. Deterministic static asset fallback
 */
export interface DoctorPhotoResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  isReal?: boolean;
}

export async function getDoctorPhotoBuffer(
  doctorId: string,
  doctorName?: string | null,
  clinicId?: string | null,
): Promise<DoctorPhotoResult | null> {
  const cleanId = (doctorId || "").replace(/^doc_/, "");

  // 1. Try resolving real uploaded photo from database config
  try {
    const whereOr: Array<Record<string, unknown>> = [];
    if (cleanId) whereOr.push({ name: cleanId }, { name: `doc_${cleanId}` });
    if (doctorId) whereOr.push({ name: doctorId });

    // Try within clinicId first if provided
    let rule = whereOr.length > 0 ? await prisma.automationRule.findFirst({
      where: {
        ...(clinicId ? { clinicId } : {}),
        trigger: "DOCTOR_PROFILE",
        OR: whereOr,
      },
    }) : null;

    // Cross-clinic fallback: doctor may have been registered in another clinic (e.g. Kochi vs Bangalore)
    if (!rule && whereOr.length > 0 && clinicId) {
      rule = await prisma.automationRule.findFirst({
        where: {
          trigger: "DOCTOR_PROFILE",
          OR: whereOr,
        },
      });
    }

    if (!rule && doctorName) {
      const cleanName = doctorName.replace(/^Dr\s*\.?\s*/i, "").trim();
      const users = await prisma.user.findMany({
        where: {
          name: { contains: cleanName, mode: "insensitive" },
        },
        select: { id: true },
        take: 5,
      });
      for (const u of users) {
        rule = await prisma.automationRule.findFirst({
          where: {
            ...(clinicId ? { clinicId } : {}),
            trigger: "DOCTOR_PROFILE",
            OR: [{ name: u.id }, { name: `doc_${u.id}` }],
          },
        });
        if (!rule) {
          rule = await prisma.automationRule.findFirst({
            where: {
              trigger: "DOCTOR_PROFILE",
              OR: [{ name: u.id }, { name: `doc_${u.id}` }],
            },
          });
        }
        if (rule) break;
      }

      // Also search profile rules directly by displayName
      if (!rule) {
        const allRules = await prisma.automationRule.findMany({
          where: { trigger: "DOCTOR_PROFILE" },
        });
        for (const r of allRules) {
          const cfg = r.config as any;
          const dName = (cfg?.displayName || "").replace(/^Dr\s*\.?\s*/i, "").trim().toLowerCase();
          if (dName && (dName.includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(dName))) {
            rule = r;
            break;
          }
        }
      }
    }

    if (rule?.config && typeof rule.config === "object") {
      const cfg = rule.config as any;

      // Check for base64 data URL (uploaded real photo)
      const dataUrl = (typeof cfg["photoDataUrl"] === "string" && cfg["photoDataUrl"].startsWith("data:image/")) ? cfg["photoDataUrl"] :
                      (typeof cfg["profileImageUrl"] === "string" && cfg["profileImageUrl"].startsWith("data:image/")) ? cfg["profileImageUrl"] : null;
      if (dataUrl) {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match && match[1] && match[2]) {
          const contentType = match[1];
          const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
          const buffer = Buffer.from(match[2], "base64");
          return {
            buffer,
            contentType,
            filename: `doctor-${cleanId || "photo"}.${ext}`,
            isReal: true,
          };
        }
      }

      // Check for HTTP image URL
      const httpUrl = (typeof cfg["profileImageUrl"] === "string" && cfg["profileImageUrl"].startsWith("http")) ? cfg["profileImageUrl"] :
                      (typeof cfg["photoUrl"] === "string" && cfg["photoUrl"].startsWith("http")) ? cfg["photoUrl"] :
                      (typeof cfg["imageUrl"] === "string" && cfg["imageUrl"].startsWith("http")) ? cfg["imageUrl"] : null;
      if (httpUrl) {
        try {
          const res = await fetch(httpUrl);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const contentType = res.headers.get("content-type") || "image/jpeg";
            const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
            return {
              buffer: Buffer.from(arrayBuf),
              contentType,
              filename: `doctor-${cleanId || "photo"}.${ext}`,
              isReal: true,
            };
          }
        } catch {
          // fetch error, continue to static fallback
        }
      }
    }
  } catch {
    // DB error, continue to static fallback
  }

  // 2. Static asset fallback (only if no real uploaded photo exists)
  const asset = resolveDoctorPhotoAsset(doctorId, doctorName);
  const assetsDir = getDoctorAssetsDir();
  const filePath = path.join(assetsDir, asset.filename);
  if (!fs.existsSync(filePath)) return null;
  const buffer = await fs.promises.readFile(filePath);
  return { buffer, contentType: asset.contentType, filename: asset.filename, isReal: false };
}

interface CachedMetaMedia {
  mediaId: string;
  uploadedAt: number;
  isReal?: boolean;
}

const doctorMetaMediaCache = new Map<string, CachedMetaMedia>();
const MEDIA_CACHE_TTL_MS = 25 * 24 * 60 * 60_000; // 25 days (Meta media IDs expire after 30 days)

/**
 * Clear cached Meta media IDs to allow refreshed doctor uploads.
 */
export function clearDoctorMetaMediaCache(): void {
  doctorMetaMediaCache.clear();
}

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

  const asset = await getDoctorPhotoBuffer(doctorId, doctorName, tenant.clinicId);
  if (!asset) return null;

  // If we have a cached real image, reuse it. But if cached entry was mock fallback and now we have a real photo, re-upload!
  if (cached && Date.now() - cached.uploadedAt < MEDIA_CACHE_TTL_MS) {
    if (cached.isReal || !asset.isReal) {
      return cached.mediaId;
    }
  }

  try {
    const { resolveWhatsAppSenderCredentials } = await import("../../integrations/providers/whatsapp/service");
    const { uploadWhatsAppMedia } = await import("../../integrations/providers/whatsapp/graph");

    const creds = await resolveWhatsAppSenderCredentials(tenant as any);
    if (!creds?.phoneNumberId || !creds?.token) return null;

    console.log("[DOCTOR_IMAGE_SEND_STARTED]", {
      clinicId: tenant.clinicId,
      doctorId,
      filename: asset.filename,
      isReal: !!asset.isReal,
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
      doctorMetaMediaCache.set(cacheKey, { mediaId: res.id, uploadedAt: Date.now(), isReal: !!asset.isReal });
      console.log("[DOCTOR_IMAGE_SEND_RESULT]", {
        clinicId: tenant.clinicId,
        doctorId,
        metaMediaId: res.id,
        isReal: !!asset.isReal,
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
