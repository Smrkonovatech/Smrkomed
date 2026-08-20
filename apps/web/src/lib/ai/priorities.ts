export type PriorityLevel = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export type ClinicPriorityItem = {
  id: string;
  level: PriorityLevel;
  title: string;
  detail: string;
  href?: string;
  coupleSlug?: string;
};

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** Deterministic clinic priorities — never invent medical urgency. */
export function buildClinicPriorities(input: {
  overdueTasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    coupleSlug: string | null;
    coupleLabel: string | null;
  }>;
  todayAppointments: Array<{
    id: string;
    type: string;
    startsAt: Date;
    status: string;
    coupleSlug: string | null;
    coupleLabel: string | null;
  }>;
  pausedCouples: Array<{ id: string; slug: string; label: string }>;
}): ClinicPriorityItem[] {
  const now = new Date();
  const items: ClinicPriorityItem[] = [];

  for (const task of input.overdueTasks) {
    const overdueDays = task.dueDate ? Math.max(1, daysBetween(task.dueDate, now)) : 1;
    items.push({
      id: `task-${task.id}`,
      level: overdueDays >= 3 ? "URGENT" : "HIGH",
      title: `Overdue task: ${task.title}`,
      detail: task.coupleLabel
        ? `${task.coupleLabel} · ${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`
        : `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`,
      href: "/tasks",
      ...(task.coupleSlug ? { coupleSlug: task.coupleSlug } : {}),
    });
  }

  for (const appt of input.todayAppointments) {
    if (appt.status === "CANCELLED" || appt.status === "COMPLETED" || appt.status === "NO_SHOW") {
      continue;
    }
    const hours = (appt.startsAt.getTime() - now.getTime()) / (60 * 60 * 1000);
    if (hours >= 0 && hours <= 2) {
      items.push({
        id: `appt-soon-${appt.id}`,
        level: "HIGH",
        title: `Appointment soon: ${appt.type}`,
        detail: appt.coupleLabel
          ? `${appt.coupleLabel} · ${appt.startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
          : appt.startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        href: "/appointments",
        ...(appt.coupleSlug ? { coupleSlug: appt.coupleSlug } : {}),
      });
    } else if (appt.status === "NO_SHOW" || appt.status === "WAITING") {
      items.push({
        id: `appt-${appt.id}`,
        level: appt.status === "NO_SHOW" ? "URGENT" : "MEDIUM",
        title: `${appt.status === "NO_SHOW" ? "Missed" : "Waiting"}: ${appt.type}`,
        detail: appt.coupleLabel ?? "Clinic appointment",
        href: "/appointments",
        ...(appt.coupleSlug ? { coupleSlug: appt.coupleSlug } : {}),
      });
    }
  }

  for (const couple of input.pausedCouples) {
    items.push({
      id: `paused-${couple.id}`,
      level: "MEDIUM",
      title: `Care Loop paused: ${couple.label}`,
      detail: "Based on clinic records, this couple may need attention.",
      href: `/patients/${couple.slug}`,
      coupleSlug: couple.slug,
    });
  }

  const rank: Record<PriorityLevel, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return items.sort((a, b) => rank[a.level] - rank[b.level]).slice(0, 20);
}
