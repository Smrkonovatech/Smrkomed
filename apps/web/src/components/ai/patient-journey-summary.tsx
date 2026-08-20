"use client";

import { Bot, Route } from "lucide-react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { Button } from "@/components/ui/button";
import { SectionHeading, StatusBadge } from "@/components/ui-kit";
import type { Appointment, CareTask, Couple, DocumentItem, LoopActivity } from "@/lib/demo-data";
import { carePlanSteps } from "@/lib/demo-data";
import { taskStatusMeta } from "@/lib/status";

type AppointmentView = Appointment & { date?: string };

const ASK_PROMPTS = [
  "Summarize this patient",
  "What happened in the last consultation?",
  "What needs to happen next?",
  "Are there overdue tasks?",
  "What should the coordinator follow up on?",
  "Draft a follow-up message",
] as const;

type Props = {
  couple: Couple;
  tasks: CareTask[];
  appointments: AppointmentView[];
  documents: DocumentItem[];
  activity: LoopActivity[];
  consultationCount?: number;
};

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
  const overdue = tasks.filter(
    (t) => t.status === "overdue" || t.status === "escalated",
  );
  const upcoming = [...appointments]
    .filter((a) => a.status !== "Completed" && a.status !== "No-show")
    .slice(0, 1)[0];
  const milestones = carePlanSteps.slice(0, 5);

  return (
    <section className="surface-card space-y-4 p-4">
      <SectionHeading
        title="Patient Journey Summary"
        subtitle="Facts from SmrkoMed records — not clinical advice"
        icon={Route}
        tone="teal"
      />

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Patient / couple" value={`${couple.primary.name}${couple.partner ? ` & ${couple.partner.name}` : ""}`} />
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
        <Fact
          label="Pending actions"
          value={pending.length ? `${pending.length} open` : "None"}
        />
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

      {milestones.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Care-plan reference stages: {milestones.map((m) => m.title).join(" · ")}
        </p>
      ) : null}

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
