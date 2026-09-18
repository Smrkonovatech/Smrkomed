/**
 * Appointment-specific helper functions for the WhatsApp Automation Node Engine.
 * Reuses existing appointment availability and booking services.
 */

import { prisma } from "@smrkomed/database";
import type { TenantContext } from "@smrkomed/database";

import {
  getAvailableAppointmentSlots,
  validateSlotStillAvailable,
  decodeSlotId,
  type AppointmentSlot,
} from "../appointments/availability";
import { bookAppointmentFromSlot } from "../appointments/whatsapp-booking";
import { classifyPatientIntent } from "../whatsapp-ai/intent";
import { escalateToHuman } from "../whatsapp-ai/handoff";

export type ClinicDoctor = {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  bio: string;
  languages: string[];
  photoUrl?: string | null;
  clinicId?: string;
  location?: string;
};

import { getDoctorPhotoUrl, resolveDoctorPhotoAsset } from "./doctor-photos";

// High quality, medical-safe portrait demo images strictly doctor-id mapped
export const DEMO_DOCTORS: ClinicDoctor[] = [
  {
    id: "doc_ananya",
    name: "Dr. Ananya Rao",
    specialty: "Fertility Specialist",
    experience: "14+ years experience",
    bio: "MBBS, MD, Fellowship in Reproductive Medicine. Specialises in personalised IVF and FET protocols with compassionate care.",
    languages: ["English", "Hindi", "Kannada"],
    photoUrl: getDoctorPhotoUrl("doc_ananya"),
  },
  {
    id: "doc_rahul",
    name: "Dr. Rahul Mehta",
    specialty: "Senior Andrologist & Embryologist",
    experience: "11+ years experience",
    bio: "MBBS, MS, Fellowship in Andrology. Focused on male fertility evaluation, ICSI, and reproductive health.",
    languages: ["English", "Hindi"],
    photoUrl: getDoctorPhotoUrl("doc_rahul"),
  },
  {
    id: "doc_priya",
    name: "Dr. Priya Nair",
    specialty: "Reproductive Endocrinologist",
    experience: "9+ years experience",
    bio: "MBBS, DNB (OBGYN). Expert in PCOS management, ovulation induction, and recurrent implantation failure.",
    languages: ["English", "Malayalam", "Tamil"],
    photoUrl: getDoctorPhotoUrl("doc_priya"),
  },
];

export function isMockDoctorEmail(email?: string | null, name?: string | null): boolean {
  const e = (email || "").toLowerCase().trim();
  const n = (name || "").toLowerCase().trim();
  return (
    e === "ananya@abcfertility.demo" ||
    e === "ravi@abcfertility.demo" ||
    e === "priya@abcfertility.demo" ||
    e === "rajesh@abcfertility.demo" ||
    (e.endsWith("@abcfertility.demo") && (n.includes("ananya") || n.includes("rahul") || n.includes("priya") || n.includes("rajesh"))) ||
    n.includes("ananya rao") ||
    n.includes("rahul menon") ||
    n.includes("priya nair") ||
    n.includes("rajesh sharma")
  );
}

/** Fetch real active doctors for the clinic (or all branches for Hospex), attaching clinic location. */
export async function resolveClinicDoctors(clinicId: string): Promise<ClinicDoctor[]> {
  try {
    const isHospex =
      clinicId === "cmt0exo9n000vl804rbaabh32" ||
      clinicId === "cmu3nmx310026jy04gsi21hxl" ||
      clinicId === "blr" ||
      clinicId === "kochi";

    const targetClinicIds = isHospex
      ? ["cmt0exo9n000vl804rbaabh32", "cmu3nmx310026jy04gsi21hxl"]
      : [clinicId];

    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId: { in: targetClinicIds },
        status: "ACTIVE",
        user: { isActive: true },
        OR: [
          { role: { key: "DOCTOR" } },
          { role: { name: { contains: "Doctor", mode: "insensitive" } } },
        ],
      },
      include: {
        clinic: { select: { id: true, city: true, name: true } },
        user: {
          select: { id: true, name: true, title: true, phone: true, initials: true, email: true },
        },
      },
      orderBy: [{ clinicId: "asc" }, { createdAt: "asc" }],
    });

    const realMemberships = memberships.filter((m) => !isMockDoctorEmail(m.user.email, m.user.name));

    if (realMemberships.length > 0) {
      const profileRules = await prisma.automationRule.findMany({
        where: {
          clinicId: { in: targetClinicIds },
          trigger: "DOCTOR_PROFILE",
        },
      });

      const profileMap = new Map<string, any>();
      for (const rule of profileRules) {
        if (rule.name) profileMap.set(rule.name, rule.config);
      }

      return realMemberships.map((m, idx) => {
        const demo = DEMO_DOCTORS[idx % DEMO_DOCTORS.length]!;
        const saved = (profileMap.get(m.userId) || profileMap.get(`doc_${m.userId}`) || {}) as any;
        const rawName = saved.displayName || m.user.name || demo.name;
        const cleanName = rawName.replace(/^Dr\s*\.?\s*/i, "").trim();
        const displayName = `Dr. ${cleanName}`;
        const specialty = saved.primarySpecialty || saved.department || m.user.title || demo.specialty || "Fertility Specialist";
        const experience = saved.yearsExperience ? `${saved.yearsExperience}+ years experience` : demo.experience;
        const bio = saved.professionalBio || saved.shortIntro || saved.bio || demo.bio;
        const languages = Array.isArray(saved.languages) && saved.languages.length > 0 ? saved.languages : demo.languages;
        const location = m.clinic?.city || (m.clinicId === "cmu3nmx310026jy04gsi21hxl" ? "Kochi" : "Bangalore");

        return {
          id: m.userId,
          name: cleanName,
          displayName,
          specialty,
          experience,
          bio,
          languages,
          clinicId: m.clinicId,
          location,
          photoUrl: (typeof saved.profileImageUrl === "string" && saved.profileImageUrl.startsWith("http"))
            ? saved.profileImageUrl
            : getDoctorPhotoUrl(m.userId),
        };
      });
    }
  } catch {
    // Fallback
  }

  return [];
}

/** Interpolate {{variables}} safely in template strings. */
export function interpolateVariables(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    // Support dot notation: patient.firstName -> patient_first_name or patient.firstName
    const direct = vars[key];
    if (direct !== undefined && direct !== "") return direct;

    const lower = vars[key.toLowerCase()];
    if (lower !== undefined && lower !== "") return lower;

    const snake = vars[key.replace(/\./g, "_")];
    if (snake !== undefined && snake !== "") return snake;

    const lowerSnake = vars[key.replace(/\./g, "_").toLowerCase()];
    if (lowerSnake !== undefined && lowerSnake !== "") return lowerSnake;

    // Common abbreviations
    if (key === "patient.firstName" || key === "patient.name") return vars["patient_name"] || vars["patient.name"] || vars["first_name"] || "there";
    if (key === "clinic.name") return vars["clinic.name"] || vars["clinic_name"] || "our clinic";
    if (key === "doctor.name" || key === "doctor_name" || key === "doctor") {
      const doc = vars["doctor.name"] || vars["doctor_name"] || vars["firstDoctorName"] || "Doctor";
      return doc;
    }
    if (key === "doctor.specialty" || key === "doctor_specialty") {
      return vars["doctor.specialty"] || vars["doctor_specialty"] || "Fertility Specialist";
    }
    if (key === "doctor.experience" || key === "doctor_experience") {
      return vars["doctor.experience"] || vars["doctor_experience"] || "10+ years experience";
    }
    if (key === "appointment.date") return vars["appointment.date"] || vars["appointment_date"] || vars["selected_date"] || "";
    if (key === "appointment.time") return vars["appointment.time"] || vars["selected_time"] || vars["appointment_time"] || "";

    return "";
  }).replace(/\bDr\.\s+Dr\.\s+/gi, "Dr. ");
}

/** Extract unique available dates from slots with friendly labels in clinic local time. */
export function groupAvailableDates(slots: AppointmentSlot[], timezone = "Asia/Kolkata"): Array<{
  dateIso: string;
  label: string;
  weekday: string;
  slotCount: number;
}> {
  const map = new Map<string, { label: string; weekday: string; slotCount: number }>();

  for (const s of slots) {
    const d = new Date(s.startTime);
    if (Number.isNaN(d.getTime())) continue;

    const dateIso = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
    const existing = map.get(dateIso);
    if (existing) {
      existing.slotCount += 1;
    } else {
      const weekday = d.toLocaleDateString("en-US", { timeZone: timezone, weekday: "short" });
      const month = d.toLocaleDateString("en-US", { timeZone: timezone, month: "short" });
      const day = new Intl.DateTimeFormat("en-US", { timeZone: timezone, day: "numeric" }).format(d);
      const label = `${weekday}, ${day} ${month}`;
      map.set(dateIso, { label, weekday, slotCount: 1 });
    }
  }

  return Array.from(map.entries()).map(([dateIso, info]) => ({
    dateIso,
    ...info,
  }));
}

/** Segment available slots by morning and afternoon/evening in clinic local time. */
export function segmentSlots(slots: AppointmentSlot[], timezone = "Asia/Kolkata"): {
  morning: Array<{ slotId: string; timeLabel: string; startMs: number }>;
  afternoon: Array<{ slotId: string; timeLabel: string; startMs: number }>;
} {
  const morning: Array<{ slotId: string; timeLabel: string; startMs: number }> = [];
  const afternoon: Array<{ slotId: string; timeLabel: string; startMs: number }> = [];

  for (const s of slots) {
    const d = new Date(s.startTime);
    if (Number.isNaN(d.getTime())) continue;

    const hour23Str = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(d);
    const localHour = parseInt(hour23Str, 10);

    const timeLabel = d.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const item = { slotId: s.slotId, timeLabel, startMs: d.getTime() };
    if (localHour < 12) {
      morning.push(item);
    } else {
      afternoon.push(item);
    }
  }

  // Meta WhatsApp list allows up to 10 rows maximum across all sections
  const morningTake = Math.min(morning.length, afternoon.length > 0 ? (afternoon.length < 5 ? 10 - afternoon.length : 5) : 10);
  const afternoonTake = Math.min(afternoon.length, 10 - morningTake);

  return {
    morning: morning.slice(0, morningTake),
    afternoon: afternoon.slice(0, afternoonTake),
  };
}

/** Extract natural language preferences from patient message. */
export function extractAppointmentPreferences(text: string): {
  preferredDate?: string | undefined;
  preferredTimeRange?: "MORNING" | "AFTERNOON" | "EVENING" | undefined;
  doctorPreference?: string | undefined;
} {
  const lower = text.toLowerCase();
  let preferredTimeRange: "MORNING" | "AFTERNOON" | "EVENING" | undefined;

  if (/\b(morning|am|early)\b/.test(lower)) preferredTimeRange = "MORNING";
  else if (/\b(afternoon|post[- ]?lunch|noon)\b/.test(lower)) preferredTimeRange = "AFTERNOON";
  else if (/\b(evening|night|pm|after 5|after 6)\b/.test(lower)) preferredTimeRange = "EVENING";

  let doctorPreference: string | undefined;
  const docMatch = text.match(/\b(dr\.?|doctor)\s+([a-zA-Z]+)/i);
  if (docMatch) {
    doctorPreference = docMatch[2];
  }

  // Date heuristics
  const now = new Date();
  let preferredDate: string | undefined;

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now.getTime() + 86_400_000);
    preferredDate = d.toISOString().slice(0, 10);
  } else if (/\btoday\b/.test(lower)) {
    preferredDate = now.toISOString().slice(0, 10);
  } else {
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < weekdays.length; i++) {
      const w = weekdays[i]!;
      if (new RegExp(`\\b${w}\\b`).test(lower)) {
        const currentDay = now.getDay();
        let daysAhead = i - currentDay;
        if (daysAhead <= 0 || /\bnext\b/.test(lower)) daysAhead += 7;
        const target = new Date(now.getTime() + daysAhead * 86_400_000);
        preferredDate = target.toISOString().slice(0, 10);
        break;
      }
    }
  }

  return { preferredDate, preferredTimeRange, doctorPreference };
}

export {
  getAvailableAppointmentSlots,
  validateSlotStillAvailable,
  decodeSlotId,
  bookAppointmentFromSlot,
  classifyPatientIntent,
  escalateToHuman,
  getDoctorPhotoUrl,
  resolveDoctorPhotoAsset,
};

