"use client";

import { Bot, Route } from "lucide-react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { JourneyStrip, type JourneyStage } from "@/components/journey-strip";
import { Button } from "@/components/ui/button";
import { SectionHeading, StatusBadge } from "@/components/ui-kit";
import type { Appointment, CareTask, Couple, DocumentItem, LoopActivity } from "@/lib/demo-data";
import { fertilityStages, journeyTemplates } from "@/lib/demo-data";
import { taskStatusMeta } from "@/lib/status";

const ASK_PROMPTS = [
  "Summarize this patient",
  "What happened in the last consultation?",
  "What needs to happen next?",
  "Are there overdue tasks?",
  "What should the coordinator follow up on?",
  "Draft a follow-up message",
] as const;

type AppointmentView = Appointment & { date?: string };

type Props = {
  couple: Couple;
  tasks: CareTask[];
  appointments: AppointmentView[];
  documents: DocumentItem[];
  activity: LoopActivity[];
  consultationCount?: number;
};

function buildJourneyStages(couple: Couple, tasks: CareTask[]): JourneyStage[] {
  const template =
    journeyTemplates.find((t) => t.name === couple.treatment) ??
    (couple.treatment === "Evaluation"
      ? journeyTemplates.find((t) => t.name === "Fertility Evaluation")
      : undefined) ??
    journeyTemplates.find((t) => t.name === "IVF");
  const labels = template?.steps ?? [...fertilityStages];
  const overdue = tasks.some((t) => t.status === "overdue" || t.status === "escalated");
  const current = Math.min(Math.max(couple.stageIndex, 0), labels.length - 1);

  return labels.map((label, index) => {
    let state: JourneyStage["state"] = "upcoming";
    if (index < current) state = "done";
    else if (index === current) state = overdue ? "attention" : "current";
    const detail =
      index === current
        ? overdue
          ? `Current stage with overdue care tasks on record.`
          : `Current stage: ${couple.stage}. Next step on record: ${couple.nextStep}.`
        : undefined;
    return {
      label,
      state,
      ...(detail ? { detail } : {}),
    };
  });
}

export function PatientJourneySummary({
  couple,
  tasks,
  appointments,
  documents,
  activity,
  consultationCount = 0,
}: Props) {
  const { ask } = useSmrkoAiBuddy();
  const completed = tasks.filter((t) => t.status === "completed");
  const pending = tasks.filter((t) => t.status !== "completed");
  const overdue = tasks.filter((t) => t.status === "overdue" || t.status === "escalated");
  const upcoming = [...appointments]
    .filter((a) => a.status !== "Completed" && a.status !== "No-show")
    .slice(0, 1)[0];
  const stages = buildJourneyStages(couple, tasks);

  return (
    <section className="surface-card space-y-4 p-4">
      <SectionHeading
        title="Patient Journey"
        subtitle="Stages from SmrkoMed care records — not a clinical assessment"
        icon={Route}
        tone="teal"
      />

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {couple.treatment} journey
        </p>
        <JourneyStrip stages={stages} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          ✓ Completed · ● Current · ⚠ Pending/overdue · ○ Upcoming
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Fact
          label="Patient / couple"
          value={`${couple.primary.name}${couple.partner ? ` & ${couple.partner.name}` : ""}`}
        />
        <Fact label="Treatment" value={couple.treatment || "Not mentioned in records"} />
        <Fact label="Current stage" value={couple.stage || "Not mentioned in records"} />
        <Fact label="Care plan next step" value={couple.nextStep || "Not mentioned in records"} />
        <Fact label="Assigned doctor" value={couple.doctor || "Not assigned"} />
        <Fact label="Coordinator" value={couple.coordinator || "Not assigned"} />
        <Fact
          label="Completed milestones"
          value={
            completed.length
              ? `${completed.length} task${completed.length === 1 ? "" : "s"} completed`
              : "No completed tasks recorded"
          }
        />
        <Fact label="Pending actions" value={pending.length ? `${pending.length} open` : "None"} />
        <Fact
          label="Overdue actions"
          value={overdue.length ? `${overdue.length} overdue` : "None"}
        />
        <Fact
          label="Upcoming appointment"
          value={
            upcoming
              ? `${upcoming.type} · ${upcoming.date ?? "Scheduled"} ${upcoming.time}`
              : "No upcoming appointment in records"
          }
        />
        <Fact
          label="Recent consultations"
          value={
            consultationCount > 0
              ? `${consultationCount} saved summar${consultationCount === 1 ? "y" : "ies"}`
              : "No saved consultation summaries"
          }
        />
        <Fact
          label="Documents"
          value={documents.length ? `${documents.length} on file` : "No documents listed"}
        />
      </dl>

      {overdue.length > 0 && (
        <div className="rounded-lg border border-danger/20 bg-danger-soft/30 p-3">
          <p className="text-xs font-semibold tracking-wide text-danger uppercase">Overdue</p>
          <ul className="mt-2 space-y-1.5">
            {overdue.slice(0, 4).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{task.title}</span>
                <StatusBadge
                  label={taskStatusMeta[task.status]?.label ?? task.status}
                  tone={taskStatusMeta[task.status]?.tone ?? "info"}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {activity.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Recent timeline
          </p>
          <ul className="mt-2 space-y-2">
            {activity.slice(0, 5).map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{item.activity}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Care path (from records)
        </p>
        <ol className="space-y-2 border-l border-border pl-4 text-sm">
          {[
            {
              event: "Registration",
              detail: "Couple on file in SmrkoMed",
              status: "done" as const,
            },
            {
              event: "Initial Consultation",
              detail:
                consultationCount > 0
                  ? `${consultationCount} consultation summar${consultationCount === 1 ? "y" : "ies"} saved`
                  : "Not available in SmrkoMed",
              status: consultationCount > 0 || couple.stageIndex > 0 ? ("done" as const) : ("upcoming" as const),
            },
            {
              event: "Investigation",
              detail: documents.length
                ? `${documents.length} document(s) on file`
                : "Not available in SmrkoMed",
              status: documents.length || couple.stageIndex > 1 ? ("done" as const) : ("upcoming" as const),
            },
            {
              event: "Treatment Started",
              detail: couple.treatment || "Not available in SmrkoMed",
              status: couple.stageIndex >= 2 ? ("current" as const) : ("upcoming" as const),
            },
            {
              event: "Medication / Procedure",
              detail: couple.stage || "Not available in SmrkoMed",
              status: couple.stageIndex >= 3 ? ("current" as const) : ("upcoming" as const),
            },
            {
              event: "Follow-up",
              detail: overdue.length
                ? `${overdue.length} overdue task(s)`
                : pending.length
                  ? `${pending.length} open task(s)`
                  : "No open follow-ups on record",
              status: overdue.length ? ("attention" as const) : pending.length ? ("current" as const) : ("upcoming" as const),
            },
            {
              event: "Next Appointment",
              detail: upcoming
                ? `${upcoming.type} · ${upcoming.date ?? "Scheduled"} ${upcoming.time}`
                : "Not available in SmrkoMed",
              status: upcoming ? ("current" as const) : ("upcoming" as const),
            },
          ].map((row) => (
            <li key={row.event} className="relative">
              <span
                className={
                  row.status === "done"
                    ? "absolute -left-[1.15rem] mt-1.5 size-2 rounded-full bg-success"
                    : row.status === "attention"
                      ? "absolute -left-[1.15rem] mt-1.5 size-2 rounded-full bg-warning"
                      : row.status === "current"
                        ? "absolute -left-[1.15rem] mt-1.5 size-2 rounded-full bg-primary"
                        : "absolute -left-[1.15rem] mt-1.5 size-2 rounded-full bg-muted-foreground/40"
                }
              />
              <p className="font-medium">{row.event}</p>
              <p className="text-xs text-muted-foreground">{row.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Bot className="size-4 text-primary" />
          Ask Smrko AI about this patient
        </div>
        <div className="flex flex-wrap gap-2">
          {ASK_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              type="button"
              size="sm"
              variant="outline"
              className="h-auto min-h-9 whitespace-normal py-1.5 text-left text-xs"
              onClick={() => ask(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
