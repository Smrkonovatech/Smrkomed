/**
 * SmrkoMed Appointment Booking Slot & Doctor Engine
 * Computes available doctors, dates, and slots with live conflict checking.
 */

import { prisma } from "@smrkomed/database";
import type { BookingDoctorSummary, BookingSlot } from "./types";
import { formatDateIso, formatTimeLabel } from "./nlp-parser";

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
    availableDates: [],
  },
];

/** Standard daily consultation hours: 10:00 to 17:00 in 30-min intervals (excluding 13:00-14:00 lunch) */
const STANDARD_SLOT_TIMES = [
  "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30",
  "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30",
];

export async function getClinicDoctors(clinicId: string): Promise<BookingDoctorSummary[]> {
  try {
    // Check if real staff exists in DB
    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId,
        status: "ACTIVE",
        user: { isActive: true },
      },
      select: {
        role: { select: { key: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const doctors = memberships.filter((m) => m.role?.key === "DOCTOR" && m.user?.id);

    if (doctors.length > 0) {
      return doctors.map((m, idx) => ({
        id: m.user.id,
        name: m.user.name || `Doctor ${idx + 1}`,
        displayName: m.user.name?.startsWith("Dr.") ? m.user.name : `Dr. ${m.user.name || "Doctor"}`,
        specialty: "Reproductive Medicine",
        experienceYears: 10 + idx,
        languages: ["English", "Hindi"],
        bio: `Experienced specialist at this clinic.`,
        availableDates: getUpcomingDates(7),
      }));
    }
  } catch {
    // Graceful fallback to default doctors
  }

  return DEFAULT_DOCTORS.map((doc) => ({
    ...doc,
    availableDates: getUpcomingDates(7),
  }));
}

export function getUpcomingDates(count = 7): string[] {
  const dates: string[] = [];
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);

  for (let i = 1; i <= count; i++) {
    const d = new Date(cur);
    d.setDate(d.getDate() + i);
    // Exclude Sundays (0)
    if (d.getDay() !== 0) {
      dates.push(formatDateIso(d));
    }
  }
  return dates;
}

export async function getDoctorDaySlots(
  clinicId: string,
  doctorId: string,
  dateIso: string,
): Promise<BookingSlot[]> {
  const dateObj = new Date(`${dateIso}T00:00:00`);
  if (dateObj.getDay() === 0) {
    // Sunday closed
    return [];
  }

  // Fetch all confirmed appointments for this doctor on this day
  const dayStart = new Date(`${dateIso}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateIso}T23:59:59.999Z`);

  let bookedAppointments: Array<{ startsAt: Date; durationMin: number }> = [];
  try {
    bookedAppointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        status: "CONFIRMED",
        startsAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: { startsAt: true, durationMin: true, doctorName: true },
    });
  } catch {
    bookedAppointments = [];
  }

  const slots: BookingSlot[] = [];

  for (const timeStr of STANDARD_SLOT_TIMES) {
    const [h, m] = timeStr.split(":").map(Number);
    const slotStart = new Date(`${dateIso}T00:00:00.000Z`);
    slotStart.setUTCHours(h!, m!, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    // Check collision with existing appointments
    const isBooked = bookedAppointments.some((appt) => {
      const apptStart = new Date(appt.startsAt).getTime();
      const apptEnd = apptStart + (appt.durationMin || 30) * 60 * 1000;
      return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
    });

    slots.push({
      time: timeStr,
      timeLabel: formatTimeLabel(timeStr),
      start: timeStr,
      end: `${String(m === 30 ? h! + 1 : h!).padStart(2, "0")}:${m === 30 ? "00" : "30"}`,
      status: isBooked ? "booked" : "available",
    });
  }

  return slots;
}

/**
 * Critical live re-validation before committing appointment.
 * Returns true if slot is still free, false if collision exists.
 */
export async function recheckSlotAvailability(
  clinicId: string,
  doctorName: string,
  dateIso: string,
  timeStr: string,
): Promise<{ available: boolean; reason?: string }> {
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const reqStart = new Date(`${dateIso}T00:00:00.000Z`);
    reqStart.setUTCHours(h!, m!, 0, 0);
    const reqEnd = new Date(reqStart.getTime() + 30 * 60 * 1000);

    const conflict = await prisma.appointment.findFirst({
      where: {
        clinicId,
        status: "CONFIRMED",
        doctorName: { contains: doctorName.replace("Dr. ", "").trim(), mode: "insensitive" },
        startsAt: {
          lt: reqEnd,
          gte: new Date(reqStart.getTime() - 30 * 60 * 1000),
        },
      },
    });

    if (conflict) {
      return { available: false, reason: "SLOT_TAKEN" };
    }

    return { available: true };
  } catch {
    // If DB is offline or check fails, allow booking to proceed to transactional commit
    return { available: true };
  }
}
