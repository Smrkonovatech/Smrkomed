import type { DoctorLeave, DoctorProfile, TimeSlot, Weekday, WeeklySchedule } from "./types";
import { WEEKDAYS } from "./types";

export function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatTimeLabel(value: string): string {
  const mins = parseTimeToMinutes(value);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  const aStart = parseTimeToMinutes(a.start);
  const aEnd = parseTimeToMinutes(a.end);
  const bStart = parseTimeToMinutes(b.start);
  const bEnd = parseTimeToMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

export function validateSlot(slot: TimeSlot): string | null {
  if (!slot.start || !slot.end) return "Start and end time are required.";
  if (parseTimeToMinutes(slot.end) <= parseTimeToMinutes(slot.start)) {
    return "End time must be after start time.";
  }
  return null;
}

export function findOverlappingSlots(slots: TimeSlot[]): string | null {
  for (let i = 0; i < slots.length; i++) {
    const err = validateSlot(slots[i]!);
    if (err) return err;
    for (let j = i + 1; j < slots.length; j++) {
      if (slotsOverlap(slots[i]!, slots[j]!)) {
        return "Availability slots overlap on this day.";
      }
    }
  }
  return null;
}

export function copyDaySchedule(
  schedule: WeeklySchedule,
  from: Weekday,
  targets: Weekday[],
): WeeklySchedule {
  const source = schedule[from];
  const next = { ...schedule };
  for (const day of targets) {
    next[day] = {
      enabled: source.enabled,
      slots: source.slots.map((s, i) => ({
        ...s,
        id: `${day}-copy-${i}-${Date.now().toString(36)}`,
      })),
    };
  }
  return next;
}

export function weekdayFromDate(date: Date): Weekday {
  const map: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[date.getDay()]!;
}

export function isOnLeave(doctor: DoctorProfile, dateIso: string, time?: string): boolean {
  return doctor.leaves.some((leave) => leaveCovers(leave, dateIso, time));
}

function leaveCovers(leave: DoctorLeave, dateIso: string, time?: string): boolean {
  const start = leave.date;
  const end = leave.endDate || leave.date;
  if (dateIso < start || dateIso > end) return false;
  if (leave.fullDay || !leave.startTime || !leave.endTime) return true;
  if (!time) return true;
  const t = parseTimeToMinutes(time);
  return t >= parseTimeToMinutes(leave.startTime) && t < parseTimeToMinutes(leave.endTime);
}

export function isBlocked(doctor: DoctorProfile, dateIso: string, time?: string): boolean {
  return doctor.blockedTimes.some((block) => {
    if (block.date !== dateIso) return false;
    if (!time) return true;
    const t = parseTimeToMinutes(time);
    return t >= parseTimeToMinutes(block.startTime) && t < parseTimeToMinutes(block.endTime);
  });
}

export function dayHasAvailability(doctor: DoctorProfile, date: Date): boolean {
  if (doctor.status !== "active") return false;
  const iso = toIsoDate(date);
  if (isOnLeave(doctor, iso) && doctor.leaves.some((l) => leaveCovers(l, iso) && l.fullDay)) {
    return false;
  }
  const day = weekdayFromDate(date);
  const schedule = doctor.weeklySchedule[day];
  return Boolean(schedule.enabled && schedule.slots.length > 0);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type GeneratedSlot = {
  start: string;
  end: string;
  status: "available" | "leave" | "blocked";
};

/** Generate bookable slots for a day from weekly schedule + settings − leave/blocks. */
export function generateDaySlots(doctor: DoctorProfile, date: Date): GeneratedSlot[] {
  if (doctor.status !== "active") return [];
  const iso = toIsoDate(date);
  const day = weekdayFromDate(date);
  const schedule = doctor.weeklySchedule[day];
  if (!schedule.enabled) return [];

  const duration = doctor.appointmentSettings.consultationMinutes;
  const buffer = doctor.appointmentSettings.bufferMinutes;
  const step = duration + buffer;
  const out: GeneratedSlot[] = [];

  for (const window of schedule.slots) {
    let cursor = parseTimeToMinutes(window.start);
    const end = parseTimeToMinutes(window.end);
    while (cursor + duration <= end) {
      const startStr = minutesToHHmm(cursor);
      const endStr = minutesToHHmm(cursor + duration);
      let status: GeneratedSlot["status"] = "available";
      if (isOnLeave(doctor, iso, startStr)) status = "leave";
      else if (isBlocked(doctor, iso, startStr)) status = "blocked";
      out.push({ start: startStr, end: endStr, status });
      cursor += step;
    }
  }
  return out;
}

function minutesToHHmm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function nextAvailableSlot(
  doctor: DoctorProfile,
  from: Date = new Date(),
): { date: string; start: string } | null {
  if (doctor.status !== "active") return null;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + i);
    const slots = generateDaySlots(doctor, day).filter((s) => s.status === "available");
    if (slots.length === 0) continue;
    const iso = toIsoDate(day);
    if (i === 0) {
      const nowMins = from.getHours() * 60 + from.getMinutes();
      const future = slots.find((s) => parseTimeToMinutes(s.start) > nowMins);
      if (future) return { date: iso, start: future.start };
      continue;
    }
    return { date: iso, start: slots[0]!.start };
  }
  return null;
}

export function formatNextAvailable(doctor: DoctorProfile): string {
  const next = nextAvailableSlot(doctor);
  if (!next) return "No upcoming slots";
  const d = new Date(`${next.date}T00:00:00`);
  const label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${label} · ${formatTimeLabel(next.start)}`;
}

export function scheduleSummary(schedule: WeeklySchedule): string {
  const enabled = WEEKDAYS.filter((d) => schedule[d].enabled);
  if (enabled.length === 0) return "Not configured";
  if (enabled.length >= 5) return `${enabled.length} days / week`;
  return enabled.map((d) => d.slice(0, 3)).join(", ");
}

export function displayNameOf(doctor: Pick<DoctorProfile, "displayName" | "firstName" | "lastName">): string {
  if (doctor.displayName.trim()) return doctor.displayName.trim();
  return `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();
}

export function initialsOf(doctor: Pick<DoctorProfile, "firstName" | "lastName" | "displayName">): string {
  const first = doctor.firstName?.[0] || doctor.displayName?.[0] || "D";
  const last = doctor.lastName?.[0] || doctor.displayName?.split(" ").at(-1)?.[0] || "";
  return `${first}${last}`.toUpperCase();
}
