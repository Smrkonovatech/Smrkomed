/**
 * Parse preferred appointment dates from patient WhatsApp text.
 * Relative phrases use clinic IANA timezone.
 */

const WEEKDAY: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};

function pad2(n: number): string { return String(n).padStart(2, "0"); }
function toIsoYmd(y: number, m0: number, d: number): string { return `${y}-${pad2(m0 + 1)}-${pad2(d)}`; }

export function getZonedCalendarParts(now: Date, timeZone: string): { y: number; m0: number; d: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  const parts = Object.fromEntries(fmt.formatToParts(now).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: Number(parts["year"]), m0: Number(parts["month"]) - 1, d: Number(parts["day"]), weekday: wdMap[parts["weekday"] ?? ""] ?? 0 };
}

function addDaysYmd(y: number, m0: number, d: number, add: number): string {
  const dt = new Date(Date.UTC(y, m0, d + add));
  return toIsoYmd(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

function resolveWeekdayToken(token: string): number | null {
  const key = token.toLowerCase();
  const full = key.startsWith("mon") ? "monday" : key.startsWith("tue") ? "tuesday" : key.startsWith("wed") ? "wednesday" : key.startsWith("thu") ? "thursday" : key.startsWith("fri") ? "friday" : key.startsWith("sat") ? "saturday" : key.startsWith("sun") ? "sunday" : key;
  return WEEKDAY[full] ?? null;
}

function nextWeekdayIso(now: Date, targetWeekday: number, timeZone: string): string {
  const z = getZonedCalendarParts(now, timeZone);
  let ahead = (targetWeekday - z.weekday + 7) % 7;
  if (ahead === 0) ahead = 7;
  return addDaysYmd(z.y, z.m0, z.d, ahead);
}

export function extractPreferredDateIso(message: string, now = new Date(), timeZone = "Asia/Kolkata"): string | null {
  const t = message.trim().toLowerCase();
  if (!t) return null;
  if (/\btoday\b/.test(t)) { const z = getZonedCalendarParts(now, timeZone); return toIsoYmd(z.y, z.m0, z.d); }
  if (/\btomorrow\b/.test(t)) { const z = getZonedCalendarParts(now, timeZone); return addDaysYmd(z.y, z.m0, z.d, 1); }
  const nextWd = /\bnext\s+(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/.exec(t);
  if (nextWd) { const target = resolveWeekdayToken(nextWd[1]!); if (target != null) return nextWeekdayIso(now, target, timeZone); }
  const onWd = /\bon\s+(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/.exec(t);
  if (onWd) { const target = resolveWeekdayToken(onWd[1]!); if (target != null) { const z = getZonedCalendarParts(now, timeZone); const ahead = (target - z.weekday + 7) % 7; return addDaysYmd(z.y, z.m0, z.d, ahead); } }
  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ordinalOnly = /\b(?:on|to|for)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/.exec(t);
  if (ordinalOnly) { const day = Number(ordinalOnly[1]); if (day >= 1 && day <= 31) { const z = getZonedCalendarParts(now, timeZone); let y = z.y; let m0 = z.m0; if (day < z.d) { m0 += 1; if (m0 > 11) { m0 = 0; y += 1; } } return toIsoYmd(y, m0, day); } }
  return null;
}

export function formatPreferredDateLabel(isoYmd: string, timeZone = "Asia/Kolkata"): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  if (!y || !m || !d) return isoYmd;
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return utc.toLocaleDateString("en-IN", { timeZone, weekday: "long", day: "numeric", month: "long" });
}

