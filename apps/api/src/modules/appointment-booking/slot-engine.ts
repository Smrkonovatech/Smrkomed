/**
 * SmrkoMed Appointment Booking Slot & Doctor Engine
 * Computes available doctors, dates, and slots with live conflict checking.
 */

import { prisma } from "@smrkomed/database";
import type { BookingDoctorSummary, BookingSlot } from "./types";
import { formatDateIso, formatTimeLabel } from "./nlp-parser";
import { getDoctorPhotoUrl } from "../whatsapp-automation/doctor-photos";

// Standard seed doctor profiles to ensure deterministic availability across environments
export const DEFAULT_DOCTORS: BookingDoctorSummary[] = [
  {
    id: "doc_ananya",
    name: "Ananya Rao",
    displayName: "Dr. Ananya Rao",
    specialty: "Reproductive Medicine & IVF",
    experienceYears: 14,
    consultationFee: 1200,
    languages: ["English", "Hindi", "Kannada"],
    bio: "Senior Fertility Specialist with 14+ years experience focusing on IVF and patient-centered protocols.",
    photoUrl: "https://smrkomed-api-production.up.railway.app/api/v1/public/doctors/doc_ananya/photo",
    availableDates: [],
  },
  {
    id: "doc_rajesh",
    name: "Rajesh Sharma",
    displayName: "Dr. Rajesh Sharma",
    specialty: "Andrology & Male Infertility",
    experienceYears: 12,
    consultationFee: 1000,
    languages: ["English", "Hindi"],
    bio: "Specialist in male fertility evaluations, surgical sperm retrieval, and couple counselling.",
    photoUrl: "https://smrkomed-api-production.up.railway.app/api/v1/public/doctors/doc_rahul/photo",
    availableDates: [],
  },
  {
    id: "doc_priya",
    name: "Priya Menon",
    displayName: "Dr. Priya Menon",
    specialty: "Obstetrics & High-Risk Pregnancy",
    experienceYears: 10,
    consultationFee: 900,
    languages: ["English", "Malayalam", "Tamil"],
    bio: "Consultant obstetrician supporting IVF pregnancies and antenatal care.",
    photoUrl: "https://smrkomed-api-production.up.railway.app/api/v1/public/doctors/doc_priya/photo",
    availableDates: [],
  },
];

/** Standard daily consultation hours: 09:00 to 17:30 in 30-min intervals (excluding 13:00-14:00 lunch) */
const STANDARD_SLOT_TIMES = [
  "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30",
  "17:00",
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

export function getTimezoneOffsetString(timezone = "Asia/Kolkata", date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart?.value && tzPart.value.startsWith("GMT")) {
      const offset = tzPart.value.replace("GMT", "");
      if (!offset) return "+00:00";
      if (/^[+-]\d{2}:\d{2}$/.test(offset)) return offset;
      if (/^[+-]\d{2}$/.test(offset)) return `${offset}:00`;
    }
  } catch {}
  return "+05:30";
}

export async function getClinicDoctors(clinicId: string): Promise<BookingDoctorSummary[]> {
  try {
    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId,
        status: "ACTIVE",
        user: { isActive: true },
        OR: [
          { role: { key: "DOCTOR" } },
          { role: { name: { contains: "Doctor", mode: "insensitive" } } },
        ],
      },
      select: {
        userId: true,
        role: { select: { key: true, name: true } },
        user: { select: { id: true, name: true, email: true, title: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Strictly filter out any mock/seed demo doctors
    const realMemberships = memberships.filter((m) => !isMockDoctorEmail(m.user?.email, m.user?.name));

    if (realMemberships.length > 0) {
      const profileRules = await prisma.automationRule.findMany({
        where: {
          clinicId,
          trigger: "DOCTOR_PROFILE",
        },
      });

      const profileMap = new Map<string, any>();
      for (const rule of profileRules) {
        if (rule.name) profileMap.set(rule.name, rule.config);
      }

      return realMemberships.map((m, idx) => {
        const u = m.user;
        const saved = (profileMap.get(u.id) || profileMap.get(`doc_${u.id}`) || {}) as any;
        const rawName = saved.displayName || u.name || `Doctor ${idx + 1}`;
        const cleanName = rawName.replace(/^Dr\s*\.?\s*/i, "").trim();
        const displayName = `Dr. ${cleanName}`;
        const specialty = saved.primarySpecialty || saved.department || u.title || "Reproductive Medicine & Fertility Specialist";
        const experienceYears = saved.yearsExperience ? Number(saved.yearsExperience) : (10 + idx);
        const languages = Array.isArray(saved.languages) && saved.languages.length > 0 ? saved.languages : ["English", "Hindi"];
        const bio = saved.professionalBio || saved.shortIntro || saved.bio || "Senior Reproductive Medicine and Fertility Specialist providing patient-centered fertility care.";
        const fee = saved.consultationFee ? Number(saved.consultationFee) : 1000;

        return {
          id: u.id,
          name: cleanName,
          displayName,
          specialty,
          experienceYears,
          consultationFee: fee,
          languages,
          bio,
          photoUrl: (typeof saved.profileImageUrl === "string" && saved.profileImageUrl.startsWith("http"))
            ? saved.profileImageUrl
            : (typeof saved.photoUrl === "string" && saved.photoUrl.startsWith("http"))
            ? saved.photoUrl
            : getDoctorPhotoUrl(u.id),
          availableDates: getUpcomingDates(7),
        };
      });
    }
  } catch {
    // Graceful fallback
  }

  // If no doctors exist in this clinic, return empty array rather than injecting fake doctors
  return [];
}

export function getUpcomingDates(count = 7): string[] {
  const dates: string[] = [];
  const cur = new Date();
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(cur);
  const [y, m, d] = todayIso.split("-").map(Number);
  const base = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));

  // Include i = 0 (today) through count days ahead
  for (let i = 0; i <= count; i++) {
    const target = new Date(base.getTime() + i * 86_400_000);
    const dateIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(target);
    const dayOfWeek = new Date(`${dateIso}T12:00:00+05:30`).getDay();
    // Exclude Sundays (0)
    if (dayOfWeek !== 0) {
      dates.push(dateIso);
    }
  }
  return dates;
}

function formatSlotTimeLabel(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export async function getDoctorDaySlots(
  clinicId: string,
  doctorId: string,
  dateIso: string,
): Promise<BookingSlot[]> {
  const dateObj = new Date(`${dateIso}T12:00:00+05:30`);
  if (dateObj.getDay() === 0) {
    // Sunday closed
    return [];
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { timezone: true },
  });
  const tz = clinic?.timezone || "Asia/Kolkata";
  const tzOffset = getTimezoneOffsetString(tz);
  const now = new Date();

  // Fetch all active, confirmed, waiting appointments in this clinic on this day
  const dayStart = new Date(`${dateIso}T00:00:00${tzOffset}`);
  const dayEnd = new Date(`${dateIso}T23:59:59.999${tzOffset}`);

  let bookedAppointments: Array<{ startsAt: Date; durationMin: number; doctorName?: string | null; couple?: { assignedDoctorId: string | null } | null }> = [];
  try {
    bookedAppointments = await prisma.appointment.findMany({
      where: {
        ...(clinicId && clinicId !== "clinic_default" ? { clinicId } : {}),
        status: { in: ["CONFIRMED", "WAITING"] },
        startsAt: {
          gte: new Date(dayStart.getTime() - 60 * 60 * 1000),
          lte: new Date(dayEnd.getTime() + 60 * 60 * 1000),
        },
      },
      select: {
        startsAt: true,
        durationMin: true,
        doctorName: true,
        couple: { select: { assignedDoctorId: true } },
      },
    });
  } catch {
    bookedAppointments = [];
  }

  const cleanDocId = doctorId.replace(/^doc_/, "");
  const doctorUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: cleanDocId }, { id: doctorId }],
    },
    select: { id: true, name: true },
  });
  const doctorName = doctorUser?.name?.trim() || doctorId;
  const docNameClean = doctorName.replace(/^dr\s*\.?\s*/i, "").trim().toLowerCase();

  const doctorAppts = bookedAppointments.filter((a) => {
    if (doctorUser && a.couple?.assignedDoctorId === doctorUser.id) return true;
    const nameInAppt = (a.doctorName || "").replace(/^dr\s*\.?\s*/i, "").trim().toLowerCase();
    if (!nameInAppt || !docNameClean) return true;
    return nameInAppt.includes(docNameClean) || docNameClean.includes(nameInAppt);
  });

  const slots: BookingSlot[] = [];

  for (const timeStr of STANDARD_SLOT_TIMES) {
    const [h, m] = timeStr.split(":").map(Number);
    const slotStart = new Date(`${dateIso}T${timeStr}:00${tzOffset}`);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    // 1. PAST TIME CHECK:
    // If the slot is in the past (e.g. current time is 3:00 PM, slots at 09:00 - 15:00 are past)
    // We add a 10-minute grace window so patients cannot book immediately expiring slots
    const isPast = slotStart.getTime() <= (now.getTime() + 10 * 60 * 1000);

    // 2. OVERLAP CONFLICT CHECK:
    // Ensure no overlapping booking exists for this doctor during slot window
    const isConflict = doctorAppts.some((appt) => {
      const apptStart = new Date(appt.startsAt).getTime();
      const apptEnd = apptStart + (appt.durationMin || 30) * 60 * 1000;
      return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
    });

    const isAvailable = !isPast && !isConflict;

    slots.push({
      time: timeStr,
      timeLabel: formatSlotTimeLabel(h!, m!),
      start: timeStr,
      end: `${String(m === 30 ? h! + 1 : h!).padStart(2, "0")}:${m === 30 ? "00" : "30"}`,
      status: isAvailable ? "available" : "booked",
    });
  }

  return slots;
}

/**
 * Critical live re-validation before committing appointment.
 * Returns true if slot is still free, false if collision exists or slot in past.
 */
export async function recheckSlotAvailability(
  clinicId: string,
  doctorName: string,
  dateIso: string,
  timeStr: string,
): Promise<{ available: boolean; reason?: string }> {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const tz = clinic?.timezone || "Asia/Kolkata";
    const tzOffset = getTimezoneOffsetString(tz);
    const now = new Date();

    const normalizedTime = timeStr.trim().replace(/\s+(AM|PM)/i, "");
    const parts = normalizedTime.split(":");
    let h = parseInt(parts[0] ?? "10", 10);
    const m = parseInt(parts[1] ?? "0", 10);
    if (/PM/i.test(timeStr) && h < 12) h += 12;
    if (/AM/i.test(timeStr) && h === 12) h = 0;

    const timeFormatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const reqStart = new Date(`${dateIso}T${timeFormatted}:00${tzOffset}`);
    const reqEnd = new Date(reqStart.getTime() + 30 * 60 * 1000);

    // 1. Check if slot has already passed
    if (reqStart.getTime() <= now.getTime()) {
      return { available: false, reason: "SLOT_IN_PAST" };
    }

    // 2. Check for overlapping appointment for this doctor
    const cleanDoc = doctorName.replace(/^dr\s*\.?\s*/i, "").trim().toLowerCase();
    const existing = await prisma.appointment.findMany({
      where: {
        clinicId,
        status: { in: ["CONFIRMED", "WAITING"] },
        startsAt: {
          gte: new Date(reqStart.getTime() - 120 * 60 * 1000),
          lte: new Date(reqEnd.getTime() + 120 * 60 * 1000),
        },
      },
      select: { startsAt: true, durationMin: true, doctorName: true },
    });

    const hasConflict = existing.some((appt) => {
      const doc = (appt.doctorName || "").replace(/^dr\s*\.?\s*/i, "").trim().toLowerCase();
      if (cleanDoc && doc && !doc.includes(cleanDoc) && !cleanDoc.includes(doc)) {
        return false;
      }
      const apptStart = new Date(appt.startsAt).getTime();
      const apptEnd = apptStart + (appt.durationMin || 30) * 60 * 1000;
      return reqStart.getTime() < apptEnd && reqEnd.getTime() > apptStart;
    });

    if (hasConflict) {
      return { available: false, reason: "SLOT_TAKEN" };
    }

    return { available: true };
  } catch {
    return { available: true };
  }
}
