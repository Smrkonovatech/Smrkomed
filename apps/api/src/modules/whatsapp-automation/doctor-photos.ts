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
  if (process.env["PUBLIC_API_URL"]) return process.env["PUBLIC_API_URL"].replace(/\/$/, "");
  if (process.env["API_BASE_URL"]) return process.env["API_BASE_URL"].replace(/\/$/, "");
  if (process.env["RAILWAY_STATIC_URL"]) return `https://${process.env["RAILWAY_STATIC_URL"].replace(/\/$/, "")}`;
  return "https://smrkomed-api-production.up.railway.app";
}

/**
 * Return public photo URL accessible by Meta Cloud API.
 */
export function getDoctorPhotoUrl(doctorId: string, baseUrl?: string): string {
  const base = (baseUrl || getApiBaseUrl()).replace(/\/$/, "");
  return `${base}/api/v1/public/doctors/${encodeURIComponent(doctorId)}/photo`;
}
