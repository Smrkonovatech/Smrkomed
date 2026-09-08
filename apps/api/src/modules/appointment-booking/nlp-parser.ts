/**
 * Natural language date & time parsing utility for booking requests.
 * Supports relative expressions ("tomorrow", "next Monday", "Friday"),
 * times ("10:30 AM", "4pm", "morning"), and ISO formats.
 */

export function parseNaturalDate(input: string, baseDate = new Date()): { date: string; label: string } | null {
  const text = input.trim().toLowerCase();
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);

  // Exact ISO: YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const parsed = new Date(y, m, day);
    if (!isNaN(parsed.getTime())) {
      return { date: formatDateIso(parsed), label: formatDateLabel(parsed) };
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const day = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const parsed = new Date(y, m, day);
    if (!isNaN(parsed.getTime())) {
      return { date: formatDateIso(parsed), label: formatDateLabel(parsed) };
    }
  }

  if (text.includes("today")) {
    return { date: formatDateIso(d), label: "Today, " + formatDateLabel(d) };
  }

  if (text.includes("tomorrow") || text.includes("day after tomorrow")) {
    const daysToAdd = text.includes("day after tomorrow") ? 2 : 1;
    d.setDate(d.getDate() + daysToAdd);
    return { date: formatDateIso(d), label: (daysToAdd === 1 ? "Tomorrow, " : "Day after tomorrow, ") + formatDateLabel(d) };
  }

  // In X days
  const inDaysMatch = text.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch && inDaysMatch[1]) {
    const days = parseInt(inDaysMatch[1], 10);
    d.setDate(d.getDate() + days);
    return { date: formatDateIso(d), label: formatDateLabel(d) };
  }

  // Weekdays: monday, tuesday, wednesday, etc.
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < weekdays.length; i++) {
    const dayName = weekdays[i]!;
    if (text.includes(dayName)) {
      const currentDay = d.getDay();
      let targetDay = i;
      let diff = targetDay - currentDay;
      if (diff <= 0 || text.includes("next")) {
        diff += 7;
      }
      d.setDate(d.getDate() + diff);
      return { date: formatDateIso(d), label: formatDateLabel(d) };
    }
  }

  return null;
}

export function parseNaturalTime(input: string): { time: string; label: string } | null {
  const text = input.trim().toLowerCase();

  // Pattern: HH:MM AM/PM or HH:MM or HH AM/PM
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (match && match[1]) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3];

    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const hh = String(hours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      const time = `${hh}:${mm}`;
      return { time, label: formatTimeLabel(time) };
    }
  }

  // General period hints
  if (text.includes("morning")) {
    return { time: "10:00", label: "10:00 AM (Morning)" };
  }
  if (text.includes("afternoon")) {
    return { time: "14:00", label: "02:00 PM (Afternoon)" };
  }
  if (text.includes("evening")) {
    return { time: "17:00", label: "05:00 PM (Evening)" };
  }

  return null;
}

export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTimeLabel(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
