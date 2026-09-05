/**
 * Lightweight natural-language date hints for appointment tools.
 * Returns YYYY-MM-DD in local calendar approximation - never invents slots.
 */

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function extractPreferredDateIso(message: string, now = new Date()): string | null {
  const t = message.trim().toLowerCase();
  if (!t) return null;
  if (/\btoday\b/.test(t)) return toIsoLocal(now);
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return toIsoLocal(d);
  }
  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /\b(\d{1,2})[\\/\-.](\d{1,2})[\\/\-.](20\d{2})\b/.exec(t);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return toIsoLocal(new Date(year, month, day));
    }
  }
  const named =
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(?:\s+(20\d{2}))?/.exec(
      t,
    );
  if (named) {
    const day = Number(named[1]);
    const key = named[2]!.toLowerCase().startsWith("sep") ? "sep" : named[2]!.toLowerCase().slice(0, 3);
    const month = MONTHS[key];
    const year = named[3] ? Number(named[3]) : now.getFullYear();
    if (month != null && day >= 1 && day <= 31) {
      let d = new Date(year, month, day);
      if (!named[3] && d.getTime() < now.getTime() - 12 * 3600_000) {
        d = new Date(year + 1, month, day);
      }
      return toIsoLocal(d);
    }
  }
  const ordinalOnly = /\b(?:on|to|for)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/.exec(t);
  if (ordinalOnly) {
    const day = Number(ordinalOnly[1]);
    if (day >= 1 && day <= 31) {
      let d = new Date(now.getFullYear(), now.getMonth(), day);
      if (d.getTime() < now.getTime() - 12 * 3600_000) {
        d = new Date(now.getFullYear(), now.getMonth() + 1, day);
      }
      return toIsoLocal(d);
    }
  }
  return null;
}
