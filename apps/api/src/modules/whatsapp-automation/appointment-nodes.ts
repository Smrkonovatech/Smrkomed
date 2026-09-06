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

/** Fetch real active doctors for the clinic, falling back to clinic demo doctors if none configured. */
export async function resolveClinicDoctors(clinicId: string): Promise<ClinicDoctor[]> {
  const memberships = await prisma.clinicMembership.findMany({
    where: {
      clinicId,
      status: "ACTIVE",
      role: { key: "DOCTOR" },
    },
    include: {
      user: {
        select: { id: true, name: true, title: true, phone: true, initials: true },
      },
    },
  });

  if (memberships.length > 0) {
    return memberships.map((m, idx) => {
      const demo = DEMO_DOCTORS[idx % DEMO_DOCTORS.length]!;
      return {
        id: m.userId,
        name: m.user.name.startsWith("Dr.") ? m.user.name : `Dr. ${m.user.name}`,
        specialty: m.user.title || demo.specialty || "Fertility Specialist",
        experience: demo.experience || "10+ years experience",
        bio: demo.bio || "Compassionate, personalised reproductive medicine.",
        languages: demo.languages || ["English", "Hindi"],
        photoUrl: getDoctorPhotoUrl(m.userId),
      };
    });
  }

  return DEMO_DOCTORS;
}

/** Interpolate {{variables}} safely in template strings. */
export function interpolateVariables(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    // Support dot notation: patient.firstName -> patient_first_name or patient.firstName
    const direct = vars[key];
    if (direct !== undefined) return direct;

    const lower = vars[key.toLowerCase()];
    if (lower !== undefined) return lower;

    const snake = vars[key.replace(/\./g, "_")];
    if (snake !== undefined) return snake;

    const lowerSnake = vars[key.replace(/\./g, "_").toLowerCase()];
    if (lowerSnake !== undefined) return lowerSnake;

    // Common abbreviations
    if (key === "patient.firstName" || key === "patient.name") return vars["patient_name"] || vars["first_name"] || "there";
    if (key === "clinic.name") return vars["clinic_name"] || "our clinic";
    if (key === "doctor.name") return vars["doctor_name"] || "the doctor";
    if (key === "appointment.date") return vars["appointment_date"] || vars["selected_date"] || "";
    if (key === "appointment.time") return vars["appointment_time"] || vars["selected_time"] || "";

    return "";
  });
}

/** Extract unique available dates from slots with friendly labels. */
export function groupAvailableDates(slots: AppointmentSlot[]): Array<{
  dateIso: string;
  label: string;
  weekday: string;
  slotCount: number;
}> {
  const map = new Map<string, { label: string; weekday: string; slotCount: number }>();

  for (const s of slots) {
    const d = new Date(s.startTime);
    if (Number.isNaN(d.getTime())) continue;

    const dateIso = d.toISOString().slice(0, 10);
    const existing = map.get(dateIso);
    if (existing) {
      existing.slotCount += 1;
    } else {
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const day = d.getDate();
      const label = `${weekday}, ${day} ${month}`;
      map.set(dateIso, { label, weekday, slotCount: 1 });
    }
  }

  return Array.from(map.entries()).map(([dateIso, info]) => ({
    dateIso,
    ...info,
  }));
}

/** Segment available slots by morning and afternoon/evening. */
export function segmentSlots(slots: AppointmentSlot[]): {
  morning: Array<{ slotId: string; timeLabel: string; startMs: number }>;
  afternoon: Array<{ slotId: string; timeLabel: string; startMs: number }>;
} {
  const morning: Array<{ slotId: string; timeLabel: string; startMs: number }> = [];
  const afternoon: Array<{ slotId: string; timeLabel: string; startMs: number }> = [];

  for (const s of slots) {
    const d = new Date(s.startTime);
    if (Number.isNaN(d.getTime())) continue;

    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const timeLabel = `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;

    const item = { slotId: s.slotId, timeLabel, startMs: d.getTime() };
    if (hours < 12) {
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

