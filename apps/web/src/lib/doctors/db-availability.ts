import { prisma } from "@smrkomed/database";
import {
  defaultAppointmentSettings,
  defaultClinicSchedule,
} from "./catalog";
import {
  formatTimeLabel,
  parseTimeToMinutes,
  toIsoDate,
  weekdayFromDate,
} from "./availability";
import { SEED_DOCTORS } from "./seed";
import type {
  AppointmentSettings,
  DoctorProfile,
  TimeSlot,
  Weekday,
  WeeklySchedule,
} from "./types";

export type DoctorAvailabilityRecord = {
  id: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  weeklySchedule: WeeklySchedule;
  settings: AppointmentSettings;
  leaves: Array<{ date: string; endDate?: string; fullDay?: boolean; startTime?: string; endTime?: string }>;
  blockedTimes: Array<{ date: string; startTime: string; endTime: string; reason?: string }>;
  updatedAt: Date;
};

export type DoctorSlotInfo = {
  time: string;       // "09:00"
  timeLabel: string;  // "9:00 AM"
  status: "available" | "booked" | "blocked" | "leave";
};

export type DoctorDayAvailability = {
  doctorId: string;
  doctorName: string;
  designation?: string;
  date: string;
  isWorkingDay: boolean;
  openSlots: DoctorSlotInfo[];
  bookedCount: number;
};

function parseWeeklyStructured(structured: any[]): WeeklySchedule {
  const sched = defaultClinicSchedule();
  if (!Array.isArray(structured)) return sched;
  const dayMap: Record<string, Weekday> = {
    Mon: "monday",
    Tue: "tuesday",
    Wed: "wednesday",
    Thu: "thursday",
    Fri: "friday",
    Sat: "saturday",
    Sun: "sunday",
  };
  for (const item of structured) {
    const key = dayMap[item.day];
    if (!key) continue;
    if (item.active === false || item.tag === "Off Day") {
      sched[key] = { enabled: false, slots: [] };
    } else {
      sched[key] = {
        enabled: true,
        slots: [
          { id: `${key}-0`, start: "09:00", end: "13:00" },
          { id: `${key}-1`, start: "14:00", end: "17:30" },
        ],
      };
    }
  }
  return sched;
}

/**
 * Fetch or initialize doctor availability from PostgreSQL.
 */
export async function getDoctorAvailability(
  clinicId: string,
  doctorIdOrName: string,
): Promise<DoctorAvailabilityRecord> {
  const cleanDocId = (doctorIdOrName || "").replace(/^doc_/, "");
  const cleanDocName = (doctorIdOrName || "").replace(/^dr\s*\.?\s*/i, "").trim();

  // 1. Look up user in DB
  let doctorUser = null;
  try {
    doctorUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: cleanDocId },
          { id: doctorIdOrName },
          ...(cleanDocName ? [{ name: { contains: cleanDocName, mode: "insensitive" as const } }] : []),
        ],
      },
      select: { id: true, name: true, email: true },
    });
  } catch {}

  const resolvedId = doctorUser?.id || cleanDocId;
  const resolvedName = doctorUser?.name
    ? (doctorUser.name.startsWith("Dr.") ? doctorUser.name : `Dr. ${doctorUser.name}`)
    : (cleanDocName ? `Dr. ${cleanDocName}` : "Dr. Ananya Rao");

  // 2. Look up doctor profile rule in automationRule
  let profileRule = null;
  try {
    profileRule = await prisma.automationRule.findFirst({
      where: {
        trigger: "DOCTOR_PROFILE",
        OR: [
          { name: resolvedId },
          { name: `doc_${resolvedId}` },
          { name: cleanDocId },
        ],
      },
    });
  } catch {}

  const cfg = (profileRule?.config as any) || {};
  let weeklySchedule: WeeklySchedule = cfg.weeklySchedule;
  if (!weeklySchedule && Array.isArray(cfg.weeklyScheduleStructured)) {
    weeklySchedule = parseWeeklyStructured(cfg.weeklyScheduleStructured);
  }
  if (!weeklySchedule) {
    const seed = SEED_DOCTORS.find(
      (d) =>
        d.id === doctorIdOrName ||
        d.displayName.toLowerCase().includes(doctorIdOrName.toLowerCase()) ||
        d.lastName.toLowerCase().includes(doctorIdOrName.toLowerCase()),
    );
    weeklySchedule = seed?.weeklySchedule || defaultClinicSchedule();
  }

  const settings: AppointmentSettings = cfg.appointmentSettings || defaultAppointmentSettings();
  const leaves = Array.isArray(cfg.leaves) ? cfg.leaves : [];
  const blockedTimes = Array.isArray(cfg.blockedTimes) ? cfg.blockedTimes : [];

  return {
    id: resolvedId,
    clinicId,
    doctorId: resolvedId,
    doctorName: resolvedName,
    weeklySchedule,
    settings,
    leaves,
    blockedTimes,
    updatedAt: profileRule?.updatedAt || new Date(),
  };
}

/**
 * Save updated doctor availability to PostgreSQL.
 */
export async function saveDoctorAvailability(
  clinicId: string,
  doctorId: string,
  doctorName: string,
  weeklySchedule: WeeklySchedule,
  settings?: AppointmentSettings,
  leaves?: any[],
  blockedTimes?: any[],
): Promise<DoctorAvailabilityRecord> {
  const cleanId = (doctorId || "").replace(/^doc_/, "");
  try {
    const existingRule = await prisma.automationRule.findFirst({
      where: {
        clinicId,
        trigger: "DOCTOR_PROFILE",
        OR: [{ name: cleanId }, { name: `doc_${cleanId}` }],
      },
    });

    const existingConfig = (existingRule?.config as any) || {};
    const updatedConfig = {
      ...existingConfig,
      displayName: doctorName,
      weeklySchedule,
      appointmentSettings: settings || existingConfig.appointmentSettings || defaultAppointmentSettings(),
      leaves: leaves || existingConfig.leaves || [],
      blockedTimes: blockedTimes || existingConfig.blockedTimes || [],
    };

    if (existingRule) {
      await prisma.automationRule.update({
        where: { id: existingRule.id },
        data: {
          config: updatedConfig,
        },
      });
    } else {
      await prisma.automationRule.create({
        data: {
          clinicId,
          trigger: "DOCTOR_PROFILE",
          name: cleanId,
          config: updatedConfig,
        },
      });
    }
  } catch {}

  return {
    id: cleanId,
    clinicId,
    doctorId: cleanId,
    doctorName,
    weeklySchedule,
    settings: settings || defaultAppointmentSettings(),
    leaves: leaves || [],
    blockedTimes: blockedTimes || [],
    updatedAt: new Date(),
  };
}

/**
 * Generate real-time open slots for a doctor on a specific date,
 * strictly accounting for:
 * 1. Weekly schedule working hours
 * 2. Leaves / blocked times
 * 3. Existing confirmed appointments in PostgreSQL
 */
export async function getDoctorDaySlots(
  clinicId: string,
  doctorIdOrName: string,
  targetDate: Date,
): Promise<DoctorDayAvailability> {
  const avail = await getDoctorAvailability(clinicId, doctorIdOrName);
  const isoDate = toIsoDate(targetDate);
  const weekday = weekdayFromDate(targetDate);
  const dayConfig = avail.weeklySchedule[weekday];

  if (!dayConfig || !dayConfig.enabled || !dayConfig.slots || dayConfig.slots.length === 0) {
    return {
      doctorId: avail.doctorId,
      doctorName: avail.doctorName,
      date: isoDate,
      isWorkingDay: false,
      openSlots: [],
      bookedCount: 0,
    };
  }

  // Check if doctor is on full-day leave
  const onFullLeave = avail.leaves.some(
    (l) => isoDate >= l.date && isoDate <= (l.endDate || l.date) && l.fullDay,
  );
  if (onFullLeave) {
    return {
      doctorId: avail.doctorId,
      doctorName: avail.doctorName,
      date: isoDate,
      isWorkingDay: false,
      openSlots: [],
      bookedCount: 0,
    };
  }

  // Fetch confirmed appointments for this doctor on this day (IST)
  const dayStart = new Date(`${isoDate}T00:00:00+05:30`);
  const dayEnd = new Date(`${isoDate}T23:59:59.999+05:30`);

  const cleanNameForSearch = avail.doctorName.replace(/^Dr\s*\.?\s*/i, "").trim();

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      ...(clinicId && clinicId !== "clinic_default" ? { clinicId } : {}),
      status: { in: ["CONFIRMED", "WAITING"] },
      startsAt: {
        gte: dayStart,
        lte: dayEnd,
      },
      OR: [
        { couple: { assignedDoctorId: avail.doctorId } },
        ...(cleanNameForSearch
          ? [{ doctorName: { contains: cleanNameForSearch, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: {
      id: true,
      startsAt: true,
      durationMin: true,
    },
  });

  const bookedWindows = bookedAppointments.map((appt) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(appt.startsAt);
    const hours = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const mins = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const startMins = hours * 60 + mins;
    const endMins = startMins + (appt.durationMin || 30);
    return { startMins, endMins };
  });

  const duration = avail.settings?.consultationMinutes || 30;
  const buffer = avail.settings?.bufferMinutes || 5;
  const step = duration + buffer;

  const slots: DoctorSlotInfo[] = [];

  const overrideRule = await prisma.automationRule.findFirst({
    where: {
      trigger: "DOCTOR_SLOT_OVERRIDES",
      OR: [
        { name: `${avail.doctorId}_${isoDate}` },
        { name: `doc_${avail.doctorId}_${isoDate}` },
      ],
    },
  });
  const savedActiveSlots = (overrideRule?.config as any)?.activeSlots as string[] | undefined;

  for (const window of dayConfig.slots) {
    let cursor = parseTimeToMinutes(window.start);
    const end = parseTimeToMinutes(window.end);

    while (cursor + duration <= end) {
      const h = Math.floor(cursor / 60);
      const m = cursor % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      // Check overlap with booked appointments
      const slotEnd = cursor + duration;
      const isBooked = bookedWindows.some(
        (b) => cursor < b.endMins && slotEnd > b.startMins,
      );

      // Check overlap with blocked times
      const isBlocked = avail.blockedTimes.some((b) => {
        if (b.date !== isoDate) return false;
        const bStart = parseTimeToMinutes(b.startTime);
        const bEnd = parseTimeToMinutes(b.endTime);
        return cursor < bEnd && slotEnd > bStart;
      });

      const endH = Math.floor(slotEnd / 60);
      const endM = slotEnd % 60;
      const endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      const slotLabel = `${timeStr} - ${endStr}`;
      const isDoctorEnabled = savedActiveSlots
        ? savedActiveSlots.some((s) => s === slotLabel || s === timeStr || s.startsWith(timeStr))
        : true;

      let status: DoctorSlotInfo["status"] = "available";
      if (isBooked) status = "booked";
      else if (isBlocked || !isDoctorEnabled) status = "blocked";

      slots.push({
        time: timeStr,
        timeLabel: formatTimeLabel(timeStr),
        status,
      });

      cursor += step;
    }
  }

  const openSlots = slots.filter((s) => s.status === "available");

  return {
    doctorId: avail.doctorId,
    doctorName: avail.doctorName,
    date: isoDate,
    isWorkingDay: true,
    openSlots,
    bookedCount: bookedAppointments.length,
  };
}
