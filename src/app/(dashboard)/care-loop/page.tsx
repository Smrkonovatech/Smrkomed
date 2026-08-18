"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  FileUp,
  HeartPulse,
  ListChecks,
  type LucideIcon,
  MessageCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ExceptionCard } from "@/components/care-loop/exception-card";
import { useCreateTask } from "@/components/create-task-drawer";
import { DemoRunner } from "@/components/demo-runner";
import { CycleJourney } from "@/components/journey-strip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/app-state";
import {
  coupleFullLabel,
  findCouple,
  type ExceptionItem,
  type ExceptionKind,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const filters = [
  "All",
  "Clinical",
  "No response",
  "Missing report",
  "Appointment",
  "Overdue",
] as const;

type Filter = (typeof filters)[number];
type View = "Attention" | "Activity" | "Completed";

const filterByKind: Partial<Record<Filter, ExceptionKind>> = {
  "No response": "no_response",
  "Missing report": "missing_report",
  Appointment: "appointment_issue",
};

function matchesFilter(item: ExceptionItem, filter: Filter) {
  if (filter === "All") return true;
  if (filter === "Clinical") {
    return item.kind === "clinical_review" || item.kind === "ai_escalation";
  }
  if (filter === "Overdue") return item.taskStatus === "overdue";
  return item.kind === filterByKind[filter];
}

const metricStyles = {
  danger: {
    icon: "bg-danger-soft text-danger",
    value: "text-danger",
    active: "ring-danger/25",
  },
  success: {
    icon: "bg-success-soft text-success",
    value: "text-success",
    active: "ring-success/25",
  },
  warning: {
    icon: "bg-warning-soft text-warning-foreground",
    value: "text-warning-foreground",
    active: "ring-warning/25",
  },
  purple: {
    icon: "bg-purple-soft text-purple",
    value: "text-purple",
    active: "ring-purple/25",
  },
} as const;

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: keyof typeof metricStyles;
  active?: boolean;
  onClick: () => void;
}) {
  const styles = metricStyles[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "animate-rise rounded-2xl bg-card p-4 text-left shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-24px_rgb(91_42_104/0.4)]",
        active && `ring-2 ${styles.active}`,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", styles.value)}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className={cn("grid size-9 place-items-center rounded-xl", styles.icon)}>
          <Icon className="size-4" />
        </span>
      </div>
    </button>
  );
}

function AutomationPanel() {
  const steps = [
    { label: "Patient task", icon: ListChecks },
    { label: "WhatsApp", icon: MessageCircle },
    { label: "AI follow-up", icon: Bot },
    { label: "Completed", icon: CheckCircle2 },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70 sm:p-6">
      <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-purple/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-8 size-64 rounded-full bg-rose/8 blur-3xl" />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-35" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-success">
              Care Loop is working
            </p>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Routine patient follow-up is being handled automatically.
          </h2>
          <div className="mt-5 flex items-center overflow-x-auto pb-1">
            {steps.map((step, index) => (
              <div key={step.label} className="flex shrink-0 items-center">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={cn(
                      "grid size-10 place-items-center rounded-xl",
                      index === steps.length - 1
                        ? "bg-success-soft text-success"
                        : "bg-primary-soft text-primary",
                    )}
                  >
                    <step.icon className="size-4.5" />
                  </span>
                  <span className="text-xs font-medium">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <span className="mx-3 mb-5 h-px w-7 bg-gradient-to-r from-primary/25 to-rose/30 sm:w-12" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x rounded-2xl bg-muted/45 p-4">
          {[
            ["186", "Active journeys"],
            ["84", "AI handled"],
            ["3", "Human attention"],
          ].map(([value, label]) => (
            <div key={label} className="px-3 text-center first:pl-0 last:pr-0">
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InsightPanel() {
  const health = [
    ["WhatsApp", "Healthy"],
    ["AI conversations", "Healthy"],
    ["Voice", "Healthy"],
  ];

  return (
    <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
      <section className="rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70">
        <h2 className="text-base font-semibold">Care Loop today</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Automation across active fertility journeys
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
          {[
            ["84", "Tasks handled automatically"],
            ["18", "Patient responses"],
            ["6", "Reports collected"],
            ["3", "Exceptions surfaced"],
          ].map(([value, label]) => (
            <div key={label}>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
              <dt className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70">
        <h2 className="text-base font-semibold">Automation health</h2>
        <ul className="mt-3 divide-y">
          {health.map(([label, status]) => (
            <li
              key={label}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm">{label}</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <span className="size-2 rounded-full bg-success" />
                {status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

export default function CareLoopPage() {
  const { exceptions, tasks, activity, couples, cycles, kpis } = useAppState();
  const { open: openTask } = useCreateTask();
  const [view, setView] = useState<View>("Attention");
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return exceptions.filter((item) => {
      const couple = findCouple(item.coupleId, couples);
      if (!couple) return false;
      const searchable = [
        coupleFullLabel(couple),
        couple.treatment,
        couple.cycleLabel,
        couple.stage,
        item.task,
        item.reason,
        item.suggested,
        item.lastAction,
        item.owner === "doctor" ? couple.doctor : couple.coordinator,
      ]
        .join(" ")
        .toLowerCase();
      return matchesFilter(item, filter) && (!search || searchable.includes(search));
    });
  }, [couples, exceptions, filter, query]);

  const waiting = tasks.filter((task) => task.status === "waiting").length;
  const escalated = exceptions.filter(
    (item) => item.kind === "clinical_review" || item.kind === "ai_escalation",
  ).length;
  const completed = tasks.filter((task) => task.status === "completed");

  const showAttention = (nextFilter: Filter = "All") => {
    setView("Attention");
    setFilter(nextFilter);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-8">
      <header className="animate-rise flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-[-0.035em]">Care Loop</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            AI follows every patient step. Your team handles what needs a human.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-35" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Care Loop active
            </span>
            <span>{kpis.active} active journeys</span>
            <span>97% automation running</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openTask()}>
            <ListChecks className="size-4" /> Create Task
          </Button>
          <DemoRunner />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Needs attention"
          value={exceptions.length}
          detail="Requires human action"
          icon={ShieldAlert}
          tone="danger"
          active={view === "Attention" && filter === "All"}
          onClick={() => showAttention()}
        />
        <MetricCard
          label="AI handled"
          value="84"
          detail="Resolved automatically today"
          icon={Sparkles}
          tone="success"
          active={view === "Activity"}
          onClick={() => setView("Activity")}
        />
        <MetricCard
          label="Waiting"
          value={waiting}
          detail="Waiting for patient response"
          icon={Clock3}
          tone="warning"
          active={view === "Attention" && filter === "No response"}
          onClick={() => showAttention("No response")}
        />
        <MetricCard
          label="Escalated"
          value={escalated}
          detail="Requires clinical attention"
          icon={HeartPulse}
          tone="purple"
          active={view === "Attention" && filter === "Clinical"}
          onClick={() => showAttention("Clinical")}
        />
      </section>

      <AutomationPanel />

      <div className="border-b">
        <nav className="-mb-px flex gap-6" aria-label="Care Loop views">
          {(["Attention", "Activity", "Completed"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={cn(
                "border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors",
                view === item
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
              {item === "Attention" && (
                <span className="ml-2 rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] text-danger">
                  {exceptions.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {view === "Attention" && (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
            <main className="min-w-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Needs your attention</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Care Loop handled the routine work. These are the exceptions.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search patients, tasks..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="mt-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1">
                {filters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={cn(
                      "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      filter === item
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <section className="mt-5 rounded-2xl bg-card px-6 py-12 text-center shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success">
                    <CheckCircle2 className="size-7" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">You&apos;re all caught up.</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    Care Loop is handling routine follow-up. No patient exceptions need your
                    attention.
                  </p>
                  <p className="mt-4 text-sm font-medium">84 tasks handled automatically today</p>
                  <Button variant="outline" className="mt-4" onClick={() => setView("Completed")}>
                    View completed activity
                  </Button>
                </section>
              ) : (
                <div className="mt-5 space-y-3">
                  {filtered.map((item) => (
                    <ExceptionCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </main>
            <InsightPanel />
          </div>

          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Active patient journeys</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Exceptions connected to the couple&apos;s current fertility stage.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/ivf-cycles">
                  All cycles <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {couples.slice(0, 4).map((couple) => {
                const cycle = cycles.find((item) => item.coupleId === couple.id);
                return (
                  <article
                    key={couple.id}
                    className="rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{coupleFullLabel(couple)}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {couple.cycleLabel} · {couple.stage}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/patients/${couple.slug}`}>Open journey</Link>
                      </Button>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <CycleJourney stageIndex={cycle?.stageIndex ?? couple.stageIndex} size="sm" />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {view === "Activity" && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Live Care Loop activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Routine follow-through handled across active fertility journeys.
            </p>
            <ol className="mt-5 overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70">
              {activity.map((item, index) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[72px_28px_minmax(0,1fr)] gap-2 border-b px-4 py-3 last:border-0"
                >
                  <span className="text-xs tabular-nums text-muted-foreground">{item.time}</span>
                  <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Activity className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.activity}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.patient}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <InsightPanel />
        </section>
      )}

      {view === "Completed" && (
        <section>
          <h2 className="text-xl font-semibold tracking-tight">Completed follow-through</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Patient tasks resolved by Care Loop or clinic staff.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {completed.map((task) => {
              const couple = findCouple(task.coupleId, couples);
              if (!couple) return null;
              return (
                <article
                  key={task.id}
                  className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgb(41_35_45/0.05)] ring-1 ring-border/70"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
                    <Check className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {coupleFullLabel(couple)} · {couple.cycleLabel}
                    </p>
                    <p className="mt-2 text-xs font-medium text-success">Completed</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
