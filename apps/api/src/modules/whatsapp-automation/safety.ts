import { prisma } from "@smrkomed/database";

export type WorkingHoursDay = { start: string; end: string } | null;
export type WorkingHoursMap = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", WorkingHoursDay>
>;

export type ClinicCommSettings = {
  workingHours: WorkingHoursMap | null;
  timezone: string;
  maxMessagesPerDay: number;
  minDelayMinutes: number;
  requireConsentGranted: boolean;
  urgentBypassHours: boolean;
};

const DEFAULT_HOURS: WorkingHoursMap = {
  mon: { start: "09:00", end: "18:00" },
  tue: { start: "09:00", end: "18:00" },
  wed: { start: "09:00", end: "18:00" },
  thu: { start: "09:00", end: "18:00" },
  fri: { start: "09:00", end: "18:00" },
  sat: { start: "09:00", end: "13:00" },
  sun: null,
};

export async function getClinicCommSettings(clinicId: string): Promise<ClinicCommSettings> {
  const row = await prisma.whatsAppClinicSettings.findUnique({ where: { clinicId } });
  return {
    workingHours: (row?.workingHours as WorkingHoursMap | null) ?? DEFAULT_HOURS,
    timezone: row?.timezone ?? "Asia/Kolkata",
    maxMessagesPerDay: row?.maxMessagesPerDay ?? 5,
    minDelayMinutes: row?.minDelayMinutes ?? 30,
    requireConsentGranted: row?.requireConsentGranted ?? false,
    urgentBypassHours: row?.urgentBypassHours ?? true,
  };
}

function weekdayKey(d: Date): keyof WorkingHoursMap {
  const keys: (keyof WorkingHoursMap)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return keys[d.getDay()]!;
}

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map((x) => Number(x));
  return { h: h ?? 0, m: m ?? 0 };
}

/** Returns null if now is inside working hours; otherwise next open Date (local clock approx). */
export function nextWorkingWindowStart(now: Date, hours: WorkingHoursMap | null): Date | null {
  const map = hours ?? DEFAULT_HOURS;
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const probe = new Date(now.getTime() + dayOffset * 86_400_000);
    const key = weekdayKey(probe);
    const day = map[key];
    if (!day) continue;
    const { h: sh, m: sm } = parseHm(day.start);
    const { h: eh, m: em } = parseHm(day.end);
    const start = new Date(probe);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(probe);
    end.setHours(eh, em, 0, 0);
    if (dayOffset === 0) {
      if (now >= start && now <= end) return null;
      if (now < start) return start;
      continue;
    }
    return start;
  }
  return new Date(now.getTime() + 86_400_000);
}

export async function assertAutomationConsent(input: {
  clinicId: string;
  patientId: string | null;
  requireGranted: boolean;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!input.patientId) {
    return { ok: true };
  }
  const consent = await prisma.consent.findUnique({
    where: {
      patientId_consentType_channel: {
        patientId: input.patientId,
        consentType: "WHATSAPP_COMMUNICATION",
        channel: "WHATSAPP",
      },
    },
  });
  if (consent?.status === "REVOKED") {
    return { ok: false, reason: "WhatsApp consent revoked." };
  }
  if (input.requireGranted && consent?.status !== "GRANTED") {
    return { ok: false, reason: "WhatsApp consent required." };
  }
  return { ok: true };
}

export async function checkFrequencyLimits(input: {
  clinicId: string;
  patientId: string | null;
  maxPerDay: number;
  minDelayMinutes: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!input.patientId) return { ok: true };
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const sinceDelay = new Date(Date.now() - input.minDelayMinutes * 60_000);

  const [todayCount, recent] = await Promise.all([
    prisma.message.count({
      where: {
        direction: "OUTBOUND",
        createdAt: { gte: dayStart },
        conversation: { clinicId: input.clinicId, patientId: input.patientId, channel: "WHATSAPP" },
      },
    }),
    prisma.message.findFirst({
      where: {
        direction: "OUTBOUND",
        createdAt: { gte: sinceDelay },
        conversation: { clinicId: input.clinicId, patientId: input.patientId, channel: "WHATSAPP" },
      },
      select: { id: true },
    }),
  ]);

  if (todayCount >= input.maxPerDay) {
    return {
      ok: false,
      reason: `Message skipped due to communication frequency limit (${input.maxPerDay}/day).`,
    };
  }
  if (recent) {
    return {
      ok: false,
      reason: `Message skipped due to minimum delay between automated messages (${input.minDelayMinutes} min).`,
    };
  }
  return { ok: true };
}

export function missingRequiredVars(keys: string[], vars: Record<string, string>) {
  return keys.filter((k) => !String(vars[k] ?? "").trim());
}
