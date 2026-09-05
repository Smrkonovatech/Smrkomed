/**
 * Real appointment slot availability from clinic working hours + existing Appointment rows.
 * Never invents slots outside open hours or over existing CONFIRMED/WAITING bookings.
 */

import { prisma } from "@smrkomed/database";

import {
  DEFAULT_HOURS,
  type WorkingHoursMap,
  getClinicCommSettings,
} from "../whatsapp-automation/safety";

export type AppointmentSlot = {
  slotId: string;
  doctorId: string | null;
  doctorName: string | null;
  appointmentType: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string | null;
  durationMin: number;
};

const DAY_KEYS: (keyof WorkingHoursMap)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map((x) => Number(x));
  return { h: h ?? 0, m: m ?? 0 };
}

/** Encode slot identity for round-trip without a separate slot table. */
export function encodeSlotId(input: {
  startMs: number;
  durationMin: number;
  doctorName: string | null;
  appointmentType: string;
}): string {
  const doc = encodeURIComponent(input.doctorName ?? "");
  const typ = encodeURIComponent(input.appointmentType || "Consultation");
  return `s_${input.startMs}_${input.durationMin}_${doc}_${typ}`;
}

export function decodeSlotId(slotId: string): {
  startMs: number;
  durationMin: number;
  doctorName: string | null;
  appointmentType: string;
} | null {
  if (!slotId.startsWith("s_")) return null;
  const parts = slotId.slice(2).split("_");
  if (parts.length < 4) return null;
  const startMs = Number(parts[0]);
  const durationMin = Number(parts[1]);
  if (!Number.isFinite(startMs) || !Number.isFinite(durationMin)) return null;
  const doctorName = decodeURIComponent(parts[2] ?? "") || null;
  const appointmentType = decodeURIComponent(parts.slice(3).join("_")) || "Consultation";
  return { startMs, durationMin, doctorName, appointmentType };
}

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Build available slots for the next `days` days using clinic WhatsApp working hours
 * and excluding conflicts with existing appointments.
 */
export async function getAvailableAppointmentSlots(input: {
  clinicId: string;
  doctorName?: string | null;
  appointmentType?: string | null;
  preferredDate?: string | null;
  days?: number;
  durationMin?: number;
  limit?: number;
}): Promise<{
  slots: AppointmentSlot[];
  available: boolean;
  timezone: string;
  reason?: string;
}> {
  const settings = await getClinicCommSettings(input.clinicId);
  const hours = settings.workingHours ?? DEFAULT_HOURS;
  const timezone = settings.timezone || "Asia/Kolkata";
  const durationMin = input.durationMin ?? 30;
  const limit = Math.min(input.limit ?? 12, 24);
  const days = Math.min(input.days ?? 7, 14);

  const clinic = await prisma.clinic.findUnique({
    where: { id: input.clinicId },
    select: { name: true, address: true },
  });

  const rangeStart = new Date();
  const rangeEnd = new Date(Date.now() + days * 86_400_000);

  const existing = await prisma.appointment.findMany({
    where: {
      clinicId: input.clinicId,
      status: { in: ["CONFIRMED", "WAITING"] },
      startsAt: { gte: rangeStart, lte: rangeEnd },
      ...(input.doctorName
        ? { doctorName: input.doctorName }
        : {}),
    },
    select: { startsAt: true, durationMin: true, doctorName: true },
  });

  const appointmentType = (input.appointmentType ?? "Consultation").trim() || "Consultation";
  const doctorName = input.doctorName?.trim() || null;
  const slots: AppointmentSlot[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < days && slots.length < limit; dayOffset++) {
    const day = new Date(now.getTime() + dayOffset * 86_400_000);
    if (input.preferredDate) {
      const pref = input.preferredDate.slice(0, 10);
      const dayIso = day.toISOString().slice(0, 10);
      // Preferred date filter: allow same calendar day in local approx via ISO date match on constructed local
      const localY = day.getFullYear();
      const localM = String(day.getMonth() + 1).padStart(2, "0");
      const localD = String(day.getDate()).padStart(2, "0");
      const localIso = `${localY}-${localM}-${localD}`;
      if (pref !== localIso && pref !== dayIso) continue;
    }

    const key = DAY_KEYS[day.getDay()]!;
    const window = hours[key];
    if (!window) continue;

    const { h: sh, m: sm } = parseHm(window.start);
    const { h: eh, m: em } = parseHm(window.end);
    const open = new Date(day);
    open.setHours(sh, sm, 0, 0);
    const close = new Date(day);
    close.setHours(eh, em, 0, 0);

    for (
      let cursor = new Date(open);
      cursor.getTime() + durationMin * 60_000 <= close.getTime() && slots.length < limit;
      cursor = new Date(cursor.getTime() + durationMin * 60_000)
    ) {
      if (cursor <= now) continue;
      const end = new Date(cursor.getTime() + durationMin * 60_000);
      const conflict = existing.some((appt) => {
        const aStart = appt.startsAt;
        const aEnd = new Date(aStart.getTime() + (appt.durationMin || 30) * 60_000);
        if (doctorName && appt.doctorName && appt.doctorName.toLowerCase() !== doctorName.toLowerCase()) {
          return false;
        }
        return overlaps(cursor, end, aStart, aEnd);
      });
      if (conflict) continue;

      const startMs = cursor.getTime();
      slots.push({
        slotId: encodeSlotId({
          startMs,
          durationMin,
          doctorName,
          appointmentType,
        }),
        doctorId: null,
        doctorName,
        appointmentType,
        startTime: cursor.toISOString(),
        endTime: end.toISOString(),
        timezone,
        location: clinic?.address ?? clinic?.name ?? null,
        durationMin,
      });
    }
  }

  return {
    slots,
    available: slots.length > 0,
    timezone,
    ...(slots.length === 0
      ? { reason: "NO_OPEN_SLOTS_IN_RANGE" }
      : {}),
  };
}

/** Re-check a slot is still free before booking. */
export async function validateSlotStillAvailable(input: {
  clinicId: string;
  startTime: Date;
  durationMin: number;
  doctorName?: string | null;
  excludeAppointmentId?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const end = new Date(input.startTime.getTime() + input.durationMin * 60_000);
  if (input.startTime <= new Date()) {
    return { ok: false, reason: "SLOT_IN_PAST" };
  }

  const settings = await getClinicCommSettings(input.clinicId);
  const hours = settings.workingHours ?? DEFAULT_HOURS;
  const key = DAY_KEYS[input.startTime.getDay()]!;
  const window = hours[key];
  if (!window) return { ok: false, reason: "CLINIC_CLOSED" };
  const { h: sh, m: sm } = parseHm(window.start);
  const { h: eh, m: em } = parseHm(window.end);
  const open = new Date(input.startTime);
  open.setHours(sh, sm, 0, 0);
  const close = new Date(input.startTime);
  close.setHours(eh, em, 0, 0);
  if (input.startTime < open || end > close) {
    return { ok: false, reason: "OUTSIDE_WORKING_HOURS" };
  }

  const conflicts = await prisma.appointment.findMany({
    where: {
      clinicId: input.clinicId,
      status: { in: ["CONFIRMED", "WAITING"] },
      startsAt: {
        gte: new Date(input.startTime.getTime() - 24 * 60 * 60_000),
        lte: new Date(input.startTime.getTime() + 24 * 60 * 60_000),
      },
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
    },
    select: { id: true, startsAt: true, durationMin: true, doctorName: true },
  });

  for (const appt of conflicts) {
    const aStart = appt.startsAt;
    const aEnd = new Date(aStart.getTime() + (appt.durationMin || 30) * 60_000);
    if (
      input.doctorName &&
      appt.doctorName &&
      appt.doctorName.toLowerCase() !== input.doctorName.toLowerCase()
    ) {
      continue;
    }
    if (overlaps(input.startTime, end, aStart, aEnd)) {
      return { ok: false, reason: "SLOT_CONFLICT" };
    }
  }
  return { ok: true };
}

// Re-export default hours for tests
export { DEFAULT_HOURS };
