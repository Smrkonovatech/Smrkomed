"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { useCreateTask } from "@/components/create-task-drawer";
import { Button } from "@/components/ui/button";
import { SectionHeading, StatusBadge } from "@/components/ui-kit";
import { scorePatientAttention } from "@/lib/ai/attention";
import type { Appointment, CareTask, Couple, LoopActivity } from "@/lib/demo-data";

type NoteLite = { consultationDate: string; reasonForVisit?: string | null };

type Props = {
  couple: Couple;
  tasks: CareTask[];
  appointments: Appointment[];
  activity: LoopActivity[];
  consultationNotes?: NoteLite[];
  noResponse?: boolean;
};

/** Deterministic Smrko AI Summary — facts from clinic records only. */
export function AiPatientSummary({
  couple,
  tasks,
  appointments,
  activity,
  consultationNotes: notesProp,
  noResponse = false,
}: Props) {
  const { ask } = useSmrkoAiBuddy();
  const { open: openTask } = useCreateTask();
  const [fetchedNotes, setFetchedNotes] = useState<NoteLite[]>([]);

  useEffect(() => {
    if (notesProp) return;
    let cancelled = false;
    void fetch(`/api/voice/notes?coupleId=${encodeURIComponent(couple.id)}`)
      .then((res) => res.json())
      .then((json: { success?: boolean; data?: NoteLite[] }) => {
        if (!cancelled && json.success && json.data) setFetchedNotes(json.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [couple.id, notesProp]);

  const consultationNotes = notesProp ?? fetchedNotes;
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const completed = tasks.filter((t) => t.status === "completed");
  const overdue = tasks.filter((t) => t.status === "overdue" || t.status === "escalated");
  const upcoming = appointments.find(
    (a) => a.status === "Confirmed" || a.status === "Waiting",
  );
  const missed = appointments.filter((a) => a.status === "No-show").length;
  const lastConsult = consultationNotes[0];
  const label = `${couple.primary.name}${couple.partner ? ` & ${couple.partner.name}` : ""}`;

  const score = scorePatientAttention({
    coupleId: couple.id,
    coupleSlug: couple.slug,
    coupleLabel: label,
    treatment: couple.treatment,
    careLoopPaused: couple.careLoop === "Paused",
    statusNeedsAttention: couple.status === "Needs Attention",
    overdueTaskCount: overdue.length,
    pendingTaskCount: openTasks.length,
    missedAppointmentCount: missed,
    upcomingAppointmentCount: upcoming ? 1 : 0,
    unassignedDoctor: !couple.doctor?.trim(),
    unassignedCoordinator: !couple.coordinator?.trim(),
    noResponseException: noResponse,
    inactiveDays: couple.careLoop === "Paused" ? 8 : 0,
  });

  const nextExpected =
    openTasks[0]?.title ||
    lastConsult?.reasonForVisit ||
    couple.nextStep ||
    "Not available in SmrkoMed.";

  const summary = [
    `${label} — ${couple.treatment} · ${couple.stage}.`,
    lastConsult
      ? `Latest consultation recorded ${new Date(lastConsult.consultationDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`
      : "No consultation summary saved yet.",
    `${completed.length} completed task(s), ${openTasks.length} open.`,
  ].join(" ");

  const tone =
    score.level === "CRITICAL" || score.level === "HIGH"
      ? "danger"
      : score.level === "MEDIUM"
        ? "warning"
        : "success";

  return (
    <section className="surface-card space-y-4 p-4">
      <SectionHeading
        title="Smrko AI Summary"
        subtitle="Operational summary from SmrkoMed records — not a clinical assessment"
        icon={Bot}
        tone="teal"
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={score.level} tone={tone} />
        <StatusBadge label={score.label} tone={tone} />
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Current stage</p>
          <p className="mt-1 font-semibold">
            {couple.treatment} — {couple.stage}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1 font-semibold">{score.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Why: {score.reasons[0] ?? "Not available in SmrkoMed."}
          </p>
        </div>
        <div className="rounded-lg border p-3 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Pending</p>
          {openTasks.length ? (
            <ul className="mt-1 space-y-0.5">
              {openTasks.slice(0, 4).map((t) => (
                <li key={t.id}>· {t.title}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">Not available in SmrkoMed.</p>
          )}
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Upcoming</p>
          <p className="mt-1 font-semibold">
            {upcoming
              ? `${upcoming.type} · ${upcoming.time}`
              : "Not available in SmrkoMed."}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Recommended next step</p>
          <p className="mt-1 font-semibold">{score.recommendedAction}</p>
        </div>
      </div>

      <p className="rounded-lg bg-muted/30 p-3 text-sm">{summary}</p>
      <p className="text-xs text-muted-foreground">Next expected action: {nextExpected}</p>
      {activity[0] ? (
        <p className="text-xs text-muted-foreground">
          Last interaction on record: {activity[0].activity} ({activity[0].time})
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Last interaction: Not available in SmrkoMed.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => ask("Summarize this patient")}>
          Ask about this patient
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => ask("Why is this patient marked as needing attention?")}
        >
          Why attention?
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => openTask(couple.id)}>
          Create follow-up
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => ask("Draft a follow-up WhatsApp for this patient")}
        >
          Draft message
        </Button>
      </div>
    </section>
  );
}
