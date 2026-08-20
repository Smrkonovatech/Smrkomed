"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bot, CalendarDays, ListChecks, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { FollowUpQueuePanel } from "@/components/ai/follow-up-queue";
import { useCreateTask } from "@/components/create-task-drawer";
import { Button } from "@/components/ui/button";
import { SectionHeading, StatusBadge } from "@/components/ui-kit";
import {
  buildClientAttention,
  buildClientFollowUpQueue,
  buildPrepareMyDay,
  buildTaskRecommendations,
  buildTeamWorkload,
  type AttentionSeverity,
} from "@/lib/ai/attention";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const severityTone: Record<AttentionSeverity, "danger" | "warning" | "info"> = {
  high: "danger",
  medium: "warning",
  info: "info",
};

const severityLabel: Record<AttentionSeverity, string> = {
  high: "High",
  medium: "Medium",
  info: "Info",
};

/** Smrko AI Copilot / Command Center — deterministic clinic operations. */
export function SmrkoAiCommandCenter() {
  const { ask } = useSmrkoAiBuddy();
  const { open: openTask } = useCreateTask();
  const { data: session } = useSession();
  const { tasks, appointments, couples, documents, staff, reload, exceptions } = useAppState();
  const [showPrepareDay, setShowPrepareDay] = useState(false);
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const displayName =
    session?.user?.name?.split(" ")[0] ||
    session?.user?.email?.split("@")[0] ||
    "there";

  const appointmentsToday = appointments.filter((appointment) => {
    if (!appointment.date) return true;
    const date = new Date(`${appointment.date}T00:00:00`);
    return date >= today && date < tomorrow;
  });

  const overdueTasks = tasks.filter(
    (task) => task.status === "overdue" || task.status === "escalated",
  );
  const activeCouples = couples.filter((c) => c.careLoop === "Active").length;
  const unassigned = couples.filter((c) => !c.doctor?.trim() || !c.coordinator?.trim()).length;

  const attention = useMemo(
    () => buildClientAttention({ couples, tasks, appointments, documents }),
    [couples, tasks, appointments, documents],
  );
  const unanswered = exceptions.filter((e) => e.kind === "no_response").length;
  const pendingCareActions = tasks.filter(
    (t) => t.status === "waiting" || t.status === "in_progress",
  ).length;
  const atRiskCount = attention.filter(
    (a) => a.severity === "high" || a.category === "No Recent Activity",
  ).length;
  const followUpQueue = useMemo(
    () => buildClientFollowUpQueue({ couples, tasks, attention, appointments }),
    [couples, tasks, attention, appointments],
  );
  const followUpNeeded = followUpQueue.filter(
    (i) => i.bucket === "URGENT" || i.bucket === "DUE_SOON" || i.bucket === "INACTIVE",
  ).length;
  const prepareDay = useMemo(
    () => buildPrepareMyDay({ couples, tasks, appointments }),
    [couples, tasks, appointments],
  );
  const workload = useMemo(
    () => buildTeamWorkload({ staff, couples, tasks, appointments }),
    [staff, couples, tasks, appointments],
  );
  const recommendations = useMemo(
    () =>
      buildTaskRecommendations({ couples, tasks, appointments }).filter(
        (r) => !dismissedRecs.has(r.id),
      ),
    [couples, tasks, appointments, dismissedRecs],
  );

  const prioritySummary = [
    {
      severity: "high" as const,
      text: `${attention.filter((a) => a.severity === "high").length} patients need attention`,
    },
    {
      severity: "medium" as const,
      text: `${overdueTasks.length} follow-ups overdue`,
    },
    {
      severity: "info" as const,
      text: `${recommendations.length} appointment${recommendations.length === 1 ? "" : "s"} may need preparation`,
    },
  ];

  const createRecommended = async (rec: (typeof recommendations)[number]) => {
    setBusyId(rec.id);
    try {
      const res = await fetch("/api/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "createTask",
          payload: {
            coupleId: rec.coupleId,
            title: rec.title,
            category: "Preparation",
            description: rec.reason,
            ...(rec.dueDate ? { dueDate: rec.dueDate } : {}),
          },
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Unable to create task.");
      }
      toast.success("Task created");
      setDismissedRecs((prev) => new Set(prev).add(rec.id));
      void reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="surface-card space-y-5 rounded-xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Smrko AI Copilot
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Good morning, {displayName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what needs your attention today — from clinic records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setShowPrepareDay(true);
              ask("Prepare my day using today's appointments and overdue follow-ups.");
            }}
          >
            Prepare My Day
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => ask("Who needs attention today?")}
          >
            View Priorities
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => ask("Give me today's clinic priorities.")}
          >
            Ask Smrko AI
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Today
        </p>
        <ul className="grid gap-2 text-sm grid-cols-2 sm:grid-cols-3 xl:grid-cols-3">
          <ClickStat
            label="Today's appointments"
            value={appointmentsToday.length}
            href="/appointments"
          />
          <ClickStat
            label="Patients needing follow-up"
            value={followUpNeeded}
            onClick={() => ask("Show the follow-up queue")}
          />
          <ClickStat label="Overdue tasks" value={overdueTasks.length} href="/tasks" />
          <ClickStat
            label="Patients at risk (engagement)"
            value={atRiskCount}
            onClick={() => ask("Who needs attention today?")}
          />
          <ClickStat
            label="Unanswered conversations"
            value={unanswered}
            href="/care-loop"
          />
          <ClickStat label="Pending care actions" value={pendingCareActions} href="/tasks" />
        </ul>
        {unassigned > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {unassigned} patient{unassigned === 1 ? "" : "s"} missing doctor or coordinator assignment.
          </p>
        )}
        {activeCouples === 0 && appointmentsToday.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No clinic activity recorded for today yet.</p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Smrko AI priorities
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => ask("Show the follow-up queue and patients needing attention.")}
          >
            View all
          </Button>
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {prioritySummary.map((card) => (
            <li key={card.text} className="rounded-lg border p-3">
              <StatusBadge label={severityLabel[card.severity]} tone={severityTone[card.severity]} />
              <p className="mt-2 text-sm">{card.text}</p>
            </li>
          ))}
        </ul>
      </div>

      {(showPrepareDay || prepareDay.length > 0) && (
        <div>
          <SectionHeading
            title="Your day"
            subtitle="Appointment prep checklist from SmrkoMed records"
            icon={CalendarDays}
            tone="teal"
            action={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowPrepareDay((v) => !v)}
              >
                {showPrepareDay ? "Hide" : "Show"}
              </Button>
            }
          />
          {showPrepareDay && (
            <ul className="mt-3 space-y-3">
              {prepareDay.length === 0 ? (
                <li className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No appointments, overdue tasks, or follow-ups queued for today in clinic records.
                </li>
              ) : (
                prepareDay.map((item) => (
                  <li key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-mono text-sm font-semibold tabular-nums">{item.time}</p>
                      <p className="text-sm font-semibold">
                        {item.coupleLabel}
                        {item.treatment ? ` · ${item.treatment}` : ""}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.kind === "appointment"
                        ? `Dr. consultation · ${item.appointmentType}`
                        : item.kind === "overdue_task"
                          ? `Overdue task · ${item.appointmentType}`
                          : item.appointmentType}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {item.checklist.map((row) => (
                        <li key={row.label} className="flex gap-2">
                          <span
                            className={cn(
                              "shrink-0",
                              row.tone === "warn" && "text-warning",
                              row.tone === "ok" && "text-success",
                              row.tone === "info" && "text-muted-foreground",
                            )}
                          >
                            {row.tone === "warn" ? "⚠" : "✓"}
                          </span>
                          <span>{row.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.coupleSlug ? (
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link href={`/patients/${item.coupleSlug}`}>Open patient</Link>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          ask(
                            item.coupleSlug
                              ? `Prepare me for the consultation with ${item.coupleLabel}`
                              : "Prepare me for today's consultations",
                          )
                        }
                      >
                        Prepare consultation
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {appointmentsToday.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Today&apos;s appointments
          </p>
          <ul className="space-y-2">
            {appointmentsToday.slice(0, 5).map((appt) => {
              const couple = couples.find((c) => c.id === appt.coupleId);
              const label = couple
                ? couple.partner
                  ? `${couple.primary.name} + ${couple.partner.name}`
                  : couple.primary.name
                : "Patient";
              return (
                <li
                  key={appt.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      <span className="font-mono tabular-nums">{appt.time}</span> · {label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appt.type} · {appt.doctor}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      ask(`Prepare me for the consultation with ${label} at ${appt.time}`)
                    }
                  >
                    Prepare consultation
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {attention.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Needs attention
          </p>
          <ul className="space-y-2">
            {attention.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={severityLabel[item.severity]}
                      tone={severityTone[item.severity]}
                    />
                    <p className="truncate text-sm font-semibold">{item.coupleLabel}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.category}: {item.reason}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={`/patients/${item.coupleSlug}`}>Open</Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openTask(item.coupleId)}
                  >
                    Create follow-up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => ask(`Draft a follow-up WhatsApp for ${item.coupleLabel}`)}
                  >
                    Draft message
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Smart task suggestions
          </p>
          <ul className="space-y-2">
            {recommendations.map((rec) => (
              <li
                key={rec.id}
                className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary-soft/30 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {rec.coupleLabel} · {rec.reason}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDismissedRecs((prev) => new Set(prev).add(rec.id))}
                  >
                    Dismiss
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === rec.id}
                    onClick={() => void createRecommended(rec)}
                  >
                    {busyId === rec.id ? "Creating…" : "Create task"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FollowUpQueuePanel items={followUpQueue} />

      {workload.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Today&apos;s team
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {workload.map((member) => (
              <li key={member.id} className="rounded-lg border p-3 text-sm">
                <p className="font-semibold">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.roleHint}</p>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  <li>{member.activePatients} assigned patients</li>
                  <li>{member.openTasks} open tasks</li>
                  <li>{member.appointmentsToday} appointments today</li>
                  <li>{member.overdueTasks} overdue</li>
                  <li>{member.followUpsDue} follow-ups due</li>
                </ul>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => ask("Who on the team has the highest follow-up workload today?")}
          >
            <Bot className="size-3.5" /> Ask Smrko about workload
          </Button>
        </div>
      )}
    </section>
  );
}

function ClickStat({
  label,
  value,
  href,
  onClick,
}: {
  label: string;
  value: number;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="text-muted-foreground leading-snug">{label}</p>
      <p className="num-display mt-1 text-2xl">{value}</p>
    </>
  );
  if (href) {
    return (
      <li>
        <Link
          href={href}
          className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          {body}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
      >
        {body}
      </button>
    </li>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <li className="rounded-lg border p-3">
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="leading-snug">{label}</span>
      </p>
      <p className="num-display mt-1 text-2xl">{value}</p>
    </li>
  );
}
