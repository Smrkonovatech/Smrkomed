"use client";

import { Bot } from "lucide-react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui-kit";
import { useAppState } from "@/lib/app-state";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Deterministic KPIs from AppState — AI only explains, never invents counts. */
export function SmrkoAiBrief() {
  const { ask } = useSmrkoAiBuddy();
  const { tasks, appointments, couples } = useAppState();
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const activeCouples = couples.filter((couple) => couple.careLoop === "Active").length;

  const overdueTasks = tasks.filter((task) => {
    if (task.status === "completed") return false;
    if (task.status === "overdue" || task.status === "escalated") return true;
    return false;
  }).length;

  const appointmentsToday = appointments.filter((appointment) => {
    if (!appointment.date) return true;
    const date = new Date(`${appointment.date}T00:00:00`);
    return date >= today && date < tomorrow;
  }).length;

  const inactiveCouples = couples.filter((couple) => couple.careLoop === "Paused").length;
  const followUpsDue = Math.max(overdueTasks, inactiveCouples);

  const insight =
    overdueTasks > 0
      ? `Your biggest priority today is following up on ${overdueTasks} overdue care task${overdueTasks === 1 ? "" : "s"} from clinic records.`
      : appointmentsToday > 0
        ? `Focus on today's ${appointmentsToday} appointment${appointmentsToday === 1 ? "" : "s"} — no overdue care tasks in the current clinic view.`
        : followUpsDue > 0
          ? `${followUpsDue} couple${followUpsDue === 1 ? "" : "s"} may need follow-up based on Care Loop status.`
          : "No overdue tasks or urgent follow-ups in the current clinic data.";

  return (
    <section className="surface-card rounded-xl p-4">
      <SectionHeading
        title="Smrko AI Brief"
        subtitle="Good morning — here's what needs attention today."
        icon={Bot}
        tone="purple"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => ask("Give me today's clinic priorities.")}
          >
            View priorities
          </Button>
        }
      />
      <ul className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <li className="rounded-lg border p-3">
          <p className="text-muted-foreground">Active couples</p>
          <p className="num-display mt-1 text-2xl">{activeCouples}</p>
        </li>
        <li className="rounded-lg border p-3">
          <p className="text-muted-foreground">Appointments today</p>
          <p className="num-display mt-1 text-2xl">{appointmentsToday}</p>
        </li>
        <li className="rounded-lg border p-3">
          <p className="text-muted-foreground">Overdue tasks</p>
          <p className="num-display mt-1 text-2xl">{overdueTasks}</p>
        </li>
        <li className="rounded-lg border p-3">
          <p className="text-muted-foreground">Follow-ups due</p>
          <p className="num-display mt-1 text-2xl">{followUpsDue}</p>
        </li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">{insight}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          "Give me today's clinic priorities.",
          "Show today's appointments",
          "Show overdue tasks",
          "Give me today's clinic summary",
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            onClick={() => ask(prompt)}
          >
            {prompt.replace(/\.$/, "")}
          </button>
        ))}
      </div>
    </section>
  );
}
