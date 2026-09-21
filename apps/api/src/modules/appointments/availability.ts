/**
 * Real appointment slot availability from clinic working hours + existing Appointment rows.
 * Never invents slots outside open hours or over existing CONFIRMED/WAITING bookings.
 *
 * LIMITATION: There is no DoctorSchedule / leave / holiday / blocking calendar in Prisma.
 * doctorId on generated slots is always null. Do not attribute clinic-hour slots to a named doctor.
 */

import { prisma } from "@smrkomed/database";

import {
  DEFAULT_HOURS,
  type WorkingHoursMap,
  getClinicCommSettings,
} from "../whatsapp-automation/safety";
import { getTimezoneOffsetString } from "../appointment-booking/slot-engine";

/** Format a Date or ISO string to HH:MM in Asia/Kolkata timezone. */
export function formatTimeIST(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a Date or ISO string to YYYY-MM-DD in Asia/Kolkata timezone. */
export function formatDateIST(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
}

/** Format a Date or ISO string to hh:mm AM/PM in Asia/Kolkata timezone. */
export function formatTime12IST(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a Date or ISO string to friendly string like "Fri, 18 Sep" in Asia/Kolkata timezone. */
export function formatDateFriendlyIST(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const weekday = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
  const month = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", month: "short" });
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", day: "numeric" }).format(date);
  return `${weekday}, ${day} ${month}`;
}

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

export function doctorNamesMatch(docA?: string | null, docB?: string | null): boolean {
  if (!docA || !docB) return true;
  const cleanA = docA.replace(/^dr\.?\s*/i, "").trim().toLowerCase();
  const cleanB = docB.replace(/^dr\.?\s*/i, "").trim().toLowerCase();
  if (!cleanA || !cleanB) return true;
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}


/**
 * Build available slots for the next `days` days using clinic WhatsApp working hours
 * and excluding conflicts with existing appointments.
 */
export async function getAvailableAppointmentSlots(input: {
  clinicId: string;
  doctorId?: string | null;
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

  const prefStr = input.preferredDate ? input.preferredDate.slice(0, 10) : null;
  const now = new Date();
  let baseDate: Date;
  let scanDays: number;

  if (prefStr && /^\d{4}-\d{2}-\d{2}$/.test(prefStr)) {
    const [y, m, d] = prefStr.split("-").map(Number);
    baseDate = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0, 0));
    scanDays = Math.min(input.days ?? 1, 21);
  } else if (input.preferredDate) {
    const parsed = new Date(input.preferredDate);
    baseDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    scanDays = Math.min(input.days ?? 1, 21);
  } else {
    const cur = new Date();
    baseDate = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), 0, 0, 0, 0));
    scanDays = Math.min(input.days ?? 7, 21);
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: input.clinicId },
    select: { name: true, address: true },
  });

  const rangeStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  const rangeEnd = new Date(baseDate.getTime() + (scanDays + 1) * 86_400_000);

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
  let doctorName = input.doctorName?.trim() || null;
  const slots: AppointmentSlot[] = [];

  // Resolve target doctor to honor their date slot overrides
  let targetDoctorUser: { id: string; name: string } | null = null;
  try {
    const explicitDocId = (input.doctorId || "").replace(/^doc_/, "");
    if (explicitDocId) {
      targetDoctorUser = await prisma.user.findFirst({
        where: {
          OR: [{ id: explicitDocId }, { id: input.doctorId! }],
        },
        select: { id: true, name: true },
      });
      if (targetDoctorUser && !doctorName) {
        doctorName = targetDoctorUser.name;
      }
    }

    const cleanDocName = (doctorName || "").replace(/^dr\.?\s*/i, "").trim();
    if (!targetDoctorUser && cleanDocName) {
      targetDoctorUser = await prisma.user.findFirst({
        where: {
          name: { contains: cleanDocName, mode: "insensitive" },
        },
        select: { id: true, name: true },
      });
    }
    if (!targetDoctorUser) {
      const docMembership = await prisma.clinicMembership.findFirst({
        where: {
          clinicId: input.clinicId,
          status: "ACTIVE",
          role: { OR: [{ key: "DOCTOR" }, { name: { contains: "Doctor", mode: "insensitive" } }] },
        },
        include: { user: { select: { id: true, name: true } } },
      });
      if (docMembership) {
        targetDoctorUser = docMembership.user;
        if (!doctorName) doctorName = docMembership.user.name;
      }
    }
  } catch (err) {
    console.warn("[getAvailableAppointmentSlots] doctor lookup resilient fallback:", err);
  }

  for (let dayOffset = 0; dayOffset < scanDays && slots.length < limit; dayOffset++) {
    const day = new Date(baseDate.getTime() + dayOffset * 86_400_000);
    if (prefStr && scanDays > 1) {
      const dayIso = day.toISOString().slice(0, 10);
      const localY = day.getFullYear();
      const localM = String(day.getMonth() + 1).padStart(2, "0");
      const localD = String(day.getDate()).padStart(2, "0");
      const localIso = `${localY}-${localM}-${localD}`;
      if (prefStr !== localIso && prefStr !== dayIso) continue;
    }

    const dateIso = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(day);
    const tzOffset = getTimezoneOffsetString(timezone, day);

    // Check if doctor has explicit date slot overrides
    let savedActiveSlots: string[] | undefined = undefined;
    if (targetDoctorUser) {
      try {
        const overrideRule = await prisma.automationRule.findFirst({
          where: {
            trigger: "DOCTOR_SLOT_OVERRIDES",
            OR: [
              { name: `${targetDoctorUser.id}_${dateIso}` },
              { name: `doc_${targetDoctorUser.id}_${dateIso}` },
            ],
          },
        });
        savedActiveSlots = (overrideRule?.config as any)?.activeSlots as string[] | undefined;
      } catch {}
    }

    if (savedActiveSlots !== undefined && savedActiveSlots.length === 0) {
      // Doctor explicitly turned off all slots for this date
      continue;
    }

    const tzDayStr = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" })
      .format(day)
      .toLowerCase()
      .slice(0, 3) as keyof WorkingHoursMap;
    const window = hours[tzDayStr] ?? hours[DAY_KEYS[day.getUTCDay()]!];
    if (!window && (!savedActiveSlots || savedActiveSlots.length === 0)) continue;

    const { h: sh, m: sm } = parseHm(window?.start || "09:00");
    const { h: eh, m: em } = parseHm(window?.end || "18:00");

    let startHour = sh;
    let endHour = eh;
    if (savedActiveSlots && savedActiveSlots.length > 0) {
      startHour = Math.min(startHour, 9);
      endHour = Math.max(endHour, 18);
    }

    const open = new Date(`${dateIso}T${String(startHour).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00${tzOffset}`);
    const close = new Date(`${dateIso}T${String(endHour).padStart(2, "0")}:${String(em).padStart(2, "0")}:00${tzOffset}`);

    for (
      let cursor = new Date(open);
      cursor.getTime() + durationMin * 60_000 <= close.getTime() && slots.length < limit;
      cursor = new Date(cursor.getTime() + durationMin * 60_000)
    ) {
      if (cursor.getTime() <= now.getTime() + 10 * 60_000) continue;
      const end = new Date(cursor.getTime() + durationMin * 60_000);

      // Filter by doctor's active selected slots
      const startStr = formatTimeIST(cursor);
      const endStr = formatTimeIST(end);
      const slotLabel = `${startStr} - ${endStr}`;
      if (savedActiveSlots && !savedActiveSlots.includes(slotLabel)) {
        continue;
      }

      const conflict = existing.some((appt) => {
        const aStart = appt.startsAt;
        const aEnd = new Date(aStart.getTime() + (appt.durationMin || 30) * 60_000);
        if (!doctorNamesMatch(doctorName, appt.doctorName)) {
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
  const timezone = settings.timezone || "Asia/Kolkata";
  const tzDayStr = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" })
    .format(input.startTime)
    .toLowerCase()
    .slice(0, 3) as keyof WorkingHoursMap;
  const window = hours[tzDayStr] ?? hours[DAY_KEYS[input.startTime.getUTCDay()]!];
  if (!window) return { ok: false, reason: "CLINIC_CLOSED" };
  const { h: sh, m: sm } = parseHm(window.start);
  const { h: eh, m: em } = parseHm(window.end);

  const dateIso = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(input.startTime);
  const tzOffset = getTimezoneOffsetString(timezone, input.startTime);
  const openLocal = new Date(`${dateIso}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00${tzOffset}`);
  const closeLocal = new Date(`${dateIso}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00${tzOffset}`);

  const openUtc = new Date(Date.UTC(input.startTime.getUTCFullYear(), input.startTime.getUTCMonth(), input.startTime.getUTCDate(), sh, sm, 0, 0));
  const closeUtc = new Date(Date.UTC(input.startTime.getUTCFullYear(), input.startTime.getUTCMonth(), input.startTime.getUTCDate(), eh, em, 0, 0));

  const isWithinClinic = input.startTime >= openLocal && end <= closeLocal;
  const isWithinUtc = input.startTime >= openUtc && end <= closeUtc;

  if (!isWithinClinic && !isWithinUtc) {
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
    if (!doctorNamesMatch(input.doctorName, appt.doctorName)) {
      continue;
    }
    if (overlaps(input.startTime, end, aStart, aEnd)) {
      return { ok: false, reason: "SLOT_CONFLICT" };
    }
  }

  // Check if doctor disabled this slot via DOCTOR_SLOT_OVERRIDES
  if (input.doctorName) {
    const cleanDoc = input.doctorName.replace(/^dr\.?\s*/i, "").trim();
    const docUser = await prisma.user.findFirst({
      where: { name: { contains: cleanDoc, mode: "insensitive" } },
      select: { id: true },
    });
    if (docUser) {
      const overrideRule = await prisma.automationRule.findFirst({
        where: {
          trigger: "DOCTOR_SLOT_OVERRIDES",
          OR: [
            { name: `${docUser.id}_${dateIso}` },
            { name: `doc_${docUser.id}_${dateIso}` },
          ],
        },
      });
      const active = (overrideRule?.config as any)?.activeSlots as string[] | undefined;
      if (Array.isArray(active)) {
        const sTime = formatTimeIST(input.startTime);
        const eTime = formatTimeIST(end);
        const label = `${sTime} - ${eTime}`;
        if (!active.includes(label)) {
          return { ok: false, reason: "SLOT_CLOSED_BY_DOCTOR" };
        }
      }
    }
  }

  return { ok: true };
}

// Re-export default hours for tests
export { DEFAULT_HOURS };
