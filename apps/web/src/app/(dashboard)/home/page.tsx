"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  ClipboardList,
  FilePlus2,
  HeartPulse,
  IndianRupee,
  ListChecks,
  ListPlus,
  MessageCircle,
  Package,
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useSession } from "next-auth/react";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { DemoRunner } from "@/components/demo-runner";
import {
  ActivityDot,
  CareLoopDonut,
  CoupleAvatar,
  DashCard,
  DashCardHeader,
  MetricCard,
  StatusBadge,
  ViewLink,
} from "@/components/dashboard/widgets";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { apiGet } from "@/lib/api/client";
import { daysInRange, useDashboardDateRange } from "@/lib/dashboard-date-range";
import {
  coupleLabel,
  currentUser,
  findCouple,
  invoices,
  type Couple,
  type ExceptionKind,
} from "@/lib/demo-data";
import { appointmentTone, exceptionMeta, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const exceptionRoutes: Record<ExceptionKind, string> = {
  clinical_review: "/care-loop",
  missing_report: "/documents",
  no_response: "/care-loop",
  appointment_issue: "/appointments",
  ai_escalation: "/care-loop",
};

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const appState = useAppState() as ReturnType<typeof useAppState> & { couples?: Couple[] };
  const { activity, exceptions, kpis, tasks, appointments } = appState;
  const couples = appState.couples ?? [];
  const { openAction } = useGlobalActions();
  const { ask } = useSmrkoAiBuddy();
  const { data: session } = useSession();
  const { mode, label: periodLabel, from, to, setToday } = useDashboardDateRange();

  const firstName =
    (session?.user?.name ?? currentUser.name).split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);

  const spanDays = mode === "all" ? 30 : mode === "today" ? 1 : daysInRange(from, to);
  const scale = mode === "all" ? 1.35 : mode === "today" ? 1 : Math.min(2.2, 0.85 + spanDays * 0.12);

  const visibleAppointments = useMemo(() => {
    if (mode === "all") return appointments;
    if (mode === "today") return appointments.slice(0, 5);
    const count = Math.min(appointments.length, Math.max(2, Math.round(spanDays * 0.9)));
    return appointments.slice(0, count);
  }, [appointments, mode, spanDays]);

  const visibleExceptions = useMemo(() => {
    if (mode === "all") return exceptions;
    if (mode === "today") return exceptions.slice(0, 4);
    return exceptions.slice(0, Math.min(exceptions.length, Math.max(2, Math.ceil(spanDays / 2))));
  }, [exceptions, mode, spanDays]);

  const visibleActivity = useMemo(() => {
    if (mode === "all") return activity.slice(0, 8);
    if (mode === "today") return activity.slice(0, 6);
    return activity.slice(0, Math.min(activity.length, 4 + Math.ceil(spanDays / 2)));
  }, [activity, mode, spanDays]);

  const overdueTasks = tasks.filter((t) => t.status === "overdue" || t.status === "escalated").length;
  const dueToday = tasks.filter((t) => t.status === "waiting" || t.status === "in_progress").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  const careTotal = Math.max(Math.round(kpis.active * (mode === "all" ? 1 : Math.min(1, scale))), 1);
  const careOverdue = Math.max(
    Math.round(overdueTasks * scale),
    visibleExceptions.filter((e) => e.kind !== "ai_escalation").length,
  );
  const careDueSoon = Math.min(24, Math.round((dueToday || 12) * scale));
  const careInProgress = Math.min(64, Math.round((inProgress * 6 || 18) * scale));
  const careCompleted = Math.max(8, Math.round((kpis.completion / 100) * 40 * scale));

  const schedule = visibleAppointments;

  const attention = visibleExceptions.slice(0, 4);

  const overdueAmount = invoices
    .filter((i) => i.status === "Overdue")
    .reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = invoices
    .filter((i) => i.status === "Pending")
    .reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = invoices
    .filter((i) => i.status === "Paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const receivables = overdueAmount + pendingAmount + paidAmount;

  const formatInr = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${Math.round(n / 1000)}K`;

  const collectionValue = Math.round((paidAmount || 248000) * (mode === "today" ? 1 : scale));
  const appointmentsMetric = Math.round(
    (appointments.length || 22) * (mode === "today" ? 1 : mode === "all" ? 1.8 : Math.min(2.5, spanDays * 0.35)),
  );

  const aiInsight = `${visibleExceptions.length} patients need attention and ${overdueTasks} tasks are overdue for ${periodLabel.toLowerCase()}. ${visibleAppointments.filter((a) => a.status === "Confirmed").length} appointments are confirmed in this period.`;

  const quickActions = [
    { label: "Add Patient", icon: UserPlus, action: () => openAction("add-couple") },
    { label: "Appointment", icon: CalendarPlus, action: () => openAction("new-appointment") },
    { label: "Care Plan", icon: HeartPulse, action: () => openAction("start-cycle") },
    { label: "Create Task", icon: ListPlus, action: () => openAction("create-task") },
    { label: "WhatsApp", icon: MessageCircle, href: "/whatsapp/inbox" },
    { label: "Upload Report", icon: FilePlus2, action: () => openAction("upload-document") },
  ] as const;

  const priorityAlerts = [
    {
      label: `${appointments.filter((a) => a.status === "Waiting").length || 2} appointments`,
      detail: "Awaiting confirmation",
      tone: "warning" as Tone,
      href: "/appointments",
    },
    {
      label: "7 medications",
      detail: "Low stock",
      tone: "danger" as Tone,
      href: "/pharmacy/inventory",
    },
    {
      label: `${overdueTasks} tasks`,
      detail: "Overdue",
      tone: "danger" as Tone,
      href: "/tasks",
    },
    {
      label: "3 documents",
      detail: "Expiring soon",
      tone: "warning" as Tone,
      href: "/documents",
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-gradient-to-br from-[#efe8fb] via-white to-[#f7ebe4] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-16 bottom-0 size-40 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.7fr)] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm">
                ABC Fertility Centre · Bangalore
              </span>
              <span className="text-xs text-muted-foreground">
                {(from ?? new Date()).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-foreground/80 shadow-sm">
                Showing: {periodLabel}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening in your clinic for{" "}
              <span className="font-medium text-foreground">{periodLabel.toLowerCase()}</span>. Use the
              calendar icon next to the clock to switch All, Today, or a custom From–To range.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button className="rounded-xl" onClick={() => ask("Prepare my clinic day summary with overdue tasks and appointments.")}>
                <Sparkles className="size-4" />
                Prepare my day
              </Button>
              <DemoRunner />
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setToday()}>
                Reset to Today
              </Button>
            </div>
          </div>
          <div className="relative hidden justify-self-end lg:block">
            <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/50 shadow-sm">
              <img
                src="/branding/careloop-doctor.jpg"
                alt=""
                className="h-40 w-[260px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Priority alerts */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {priorityAlerts.map((alert) => (
          <Link
            key={alert.label}
            href={alert.href}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                alert.tone === "danger" ? "bg-rose-50 text-rose-700" : "bg-orange-50 text-orange-700",
              )}
            >
              <TriangleAlert className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{alert.label}</span>
              <span className="block text-xs text-muted-foreground">{alert.detail}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Active Couples"
          value={String(Math.round(kpis.active * (mode === "all" ? 1 : Math.min(1, 0.7 + scale * 0.2))))}
          hint={mode === "all" ? "All active journeys" : `In period · ${periodLabel}`}
          icon={Users}
          tone="primary"
          trend={{ label: "+3%", direction: "up" }}
        />
        <MetricCard
          label="Appointments"
          value={String(appointmentsMetric)}
          hint={`${visibleAppointments.filter((a) => a.status !== "Completed").length} in view`}
          icon={CalendarPlus}
          tone="teal"
        />
        <MetricCard
          label="Care Loop"
          value={String(careTotal)}
          hint={`${visibleExceptions.length} need attention`}
          icon={HeartPulse}
          tone="purple"
          trend={{ label: `${kpis.completion}%`, direction: "up" }}
        />
        <MetricCard
          label="Tasks"
          value={String(Math.round(tasks.filter((t) => t.status !== "completed").length * scale))}
          hint={`${Math.round(overdueTasks * scale)} overdue`}
          icon={ListChecks}
          tone="warning"
        />
        <MetricCard
          label="Collection"
          value={formatInr(collectionValue)}
          hint={mode === "today" ? "+12% vs yesterday" : `For ${periodLabel.toLowerCase()}`}
          icon={IndianRupee}
          tone="success"
          trend={{ label: "+12%", direction: "up" }}
        />
      </div>

      {/* Schedule */}
      <DashCard>
        <DashCardHeader
          title="Today at a Glance"
          subtitle={`${periodLabel} · ${schedule.length} appointments`}
          action={<ViewLink href="/appointments" label="View full schedule" />}
        />
        <ul className="grid gap-1 md:grid-cols-2">
          {schedule.map((appointment) => {
            const couple = findCouple(appointment.coupleId, couples);
            if (!couple) return null;
            return (
              <li key={appointment.id}>
                <Link
                  href="/appointments"
                  className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-primary-soft/50"
                >
                  <span className="text-xs font-semibold tabular-nums text-foreground">{appointment.time}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{coupleLabel(couple)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {appointment.type} · {appointment.doctor}
                    </span>
                  </span>
                  <StatusBadge
                    label={appointment.status}
                    tone={appointmentTone[appointment.status] ?? "muted"}
                    className="w-fit"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </DashCard>

      {/* Care Loop + Attention */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DashCard>
          <DashCardHeader
            title="Care Loop Overview"
            subtitle="Journey health across active patients"
            action={<ViewLink href="/care-loop" label="View Care Loop" />}
          />
          <CareLoopDonut
            total={careTotal}
            overdue={careOverdue}
            dueSoon={careDueSoon}
            inProgress={careInProgress}
            completed={careCompleted}
          />
        </DashCard>

        <DashCard>
          <DashCardHeader
            title="Clinical Decisions & Exceptions"
            subtitle="Prioritized clinical reviews & patient exceptions"
            action={<ViewLink href="/care-loop" label="Care Loop Hub" />}
          />
          <div className="space-y-3">
            {/* Clinical Review section for doctors */}
            <div className="rounded-xl border border-purple-200/80 bg-purple-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="size-3.5 text-purple-700" />
                  Clinical Review
                </span>
                <span className="rounded bg-purple-200/70 px-1.5 py-0.2 text-[10px] text-purple-900">
                  Doctor Decision Required
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 text-xs">
                <div>
                  <Link href="/patients/anita-rahul" className="font-bold text-foreground hover:underline text-sm block">
                    Anita + Rahul
                  </Link>
                  <span className="text-muted-foreground block text-[11px]">
                    IVF — Follicular Monitoring (Cycle 01)
                  </span>
                  <p className="text-foreground/90 font-medium mt-0.5 text-xs">
                    Monitoring report ready: lead follicles 18mm &amp; 17mm. Doctor review required for trigger.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 border-purple-300 text-purple-900 font-semibold" asChild>
                  <Link href="/patients/anita-rahul">Review &amp; Trigger</Link>
                </Button>
              </div>
            </div>

            {/* Needs Attention section for care team */}
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-700" />
                  Needs Attention
                </span>
                <span className="rounded bg-amber-200/70 px-1.5 py-0.2 text-[10px] text-amber-900">
                  Care Coordinator
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 text-xs">
                <div>
                  <Link href="/patients/priya-rahul" className="font-bold text-foreground hover:underline text-sm block">
                    Priya + Rahul
                  </Link>
                  <span className="text-muted-foreground block text-[11px]">
                    IVF — Ovarian Stimulation (Stage 5)
                  </span>
                  <p className="text-amber-900 font-medium mt-0.5 text-xs">
                    Medication confirmation missing — 2 hours overdue.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 border-amber-300 text-amber-900 font-semibold" asChild>
                  <Link href="/patients/priya-rahul">Open Patient</Link>
                </Button>
              </div>
            </div>
          </div>
        </DashCard>
      </div>

      {/* Quick actions + Tasks */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <DashCard>
          <DashCardHeader title="Quick Actions" subtitle="Common clinic workflows" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickActions.map((item) => {
              const Icon = item.icon;
              const className =
                "flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-background px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary-soft/40";
              if ("href" in item) {
                return (
                  <Link key={item.label} href={item.href} className={className}>
                    <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              }
              return (
                <button key={item.label} type="button" className={className} onClick={item.action}>
                  <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </DashCard>

        <DashCard>
          <DashCardHeader
            title="Tasks Today"
            subtitle="Care coordination workload"
            action={<ViewLink href="/tasks" label="View all tasks" />}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Overdue", value: overdueTasks, tone: "bg-rose-50 text-rose-800" },
              { label: "Due today", value: dueToday, tone: "bg-orange-50 text-orange-800" },
              { label: "In progress", value: inProgress, tone: "bg-primary-soft text-primary" },
              { label: "Completed", value: completed, tone: "bg-emerald-50 text-emerald-800" },
            ].map((item) => (
              <div key={item.label} className={cn("rounded-2xl px-3 py-3", item.tone)}>
                <p className="text-xl font-semibold tabular-nums">{item.value}</p>
                <p className="text-[11px] font-medium opacity-80">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="flex h-full">
              <span className="bg-rose-500" style={{ width: `${Math.min(40, overdueTasks * 8)}%` }} />
              <span className="bg-orange-400" style={{ width: `${Math.min(30, dueToday * 4)}%` }} />
              <span className="bg-primary" style={{ width: `${Math.min(25, inProgress * 8)}%` }} />
              <span className="bg-emerald-500" style={{ width: `${Math.min(40, completed * 10)}%` }} />
            </div>
          </div>
        </DashCard>
      </div>

      {/* Finance + Pharmacy + ABDM */}
      <div className="grid gap-4 lg:grid-cols-3">
        <DashCard className="bg-gradient-to-br from-white via-[#f8f5fc] to-[#f7ebe4] lg:col-span-1">
          <DashCardHeader
            title="Financial Overview"
            subtitle="Cross-module receivables snapshot"
            action={<ViewLink href="/billing" label="View all" />}
          />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total receivables</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatInr(receivables || 1862000)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="font-semibold text-rose-700">{formatInr(overdueAmount || 724000)}</p>
                <p className="text-muted-foreground">Overdue</p>
              </div>
              <div>
                <p className="font-semibold text-orange-700">{formatInr(pendingAmount || 618000)}</p>
                <p className="text-muted-foreground">Due soon</p>
              </div>
              <div>
                <p className="font-semibold text-sky-700">{formatInr(paidAmount || 520000)}</p>
                <p className="text-muted-foreground">Collected</p>
              </div>
            </div>
          </div>
        </DashCard>

        <DashCard>
          <DashCardHeader
            title="Pharmacy"
            subtitle="Inventory pulse"
            action={<ViewLink href="/pharmacy" label="View Pharmacy" />}
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Low stock", value: "7", icon: Package, tone: "bg-orange-50 text-orange-800" },
              { label: "Out of stock", value: "2", icon: TriangleAlert, tone: "bg-rose-50 text-rose-800" },
              { label: "Expiring soon", value: "11", icon: ClipboardList, tone: "bg-amber-50 text-amber-800" },
              { label: "Dispensed today", value: "23", icon: Pill, tone: "bg-emerald-50 text-emerald-800" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={cn("rounded-2xl px-3 py-3", item.tone)}>
                  <Icon className="mb-2 size-4 opacity-80" />
                  <p className="text-xl font-semibold tabular-nums">{item.value}</p>
                  <p className="text-[11px] font-medium opacity-80">{item.label}</p>
                </div>
              );
            })}
          </div>
        </DashCard>

        <AbdmHomeCard />
      </div>

      {/* AI + Activity */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DashCard className="relative overflow-hidden bg-gradient-to-br from-primary to-[#5b35b8] text-primary-foreground">
          <div className="pointer-events-none absolute -right-6 -bottom-8 size-36 rounded-full bg-white/10 blur-2xl" />
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/80 uppercase">Smrko AI</p>
          <p className="mt-3 text-base font-medium leading-relaxed text-white/95">{aiInsight}</p>
          <Button
            variant="secondary"
            className="mt-4 rounded-xl bg-white text-primary hover:bg-white/90"
            onClick={() => ask("Prepare my day: summarize overdue Care Loop tasks, appointments needing confirmation, and patients needing attention.")}
          >
            <Sparkles className="size-4" />
            Prepare my day
          </Button>
        </DashCard>

        <DashCard>
          <DashCardHeader
            title="Recent Activity"
            subtitle="Latest clinic events"
            action={<ViewLink href="/care-loop" label="Care Loop" />}
          />
          <ul className="space-y-1">
            {visibleActivity.map((item) => (
              <li key={item.id}>
                <Link
                  href="/care-loop"
                  className="flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <ActivityDot tone={item.tone} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      <span className="font-semibold">{item.patient}</span>{" "}
                      <span className="text-muted-foreground">{item.activity}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">{item.time}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DashCard>
      </div>

      {/* Performance */}
      <DashCard>
        <DashCardHeader
          title="Clinic Performance"
          subtitle={`Quick health check · ${periodLabel}`}
          action={<ViewLink href="/analytics" label="Open analytics" />}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "New couples", value: "14", hint: "+2 vs last week", icon: Users },
            { label: "Treatments started", value: "9", hint: "IVF / IUI / FET", icon: HeartPulse },
            { label: "Consultations", value: String(appointments.length * 3 || 48), hint: "Completed + upcoming", icon: CalendarPlus },
            { label: "Care completion", value: `${kpis.completion}%`, hint: "Automated follow-through", icon: Wallet },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-border/50 bg-background px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </p>
                  <Icon className="size-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </div>
            );
          })}
        </div>
      </DashCard>
    </div>
  );
}

function AbdmHomeCard() {
  const [totals, setTotals] = useState<{
    patientsLinkedToAbha: number;
    pendingVerification: number;
    pendingConsentRequests: number;
    failedExchanges: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiGet<{
      totals: {
        patientsLinkedToAbha: number;
        pendingVerification: number;
        pendingConsentRequests: number;
        failedExchanges: number;
      };
    }>("/api/v1/digital-health/dashboard")
      .then((res) => {
        if (!cancelled) setTotals(res.totals);
      })
      .catch(() => {
        if (!cancelled) setTotals(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashCard>
      <DashCardHeader
        title="ABDM & Digital Health"
        subtitle="Actionable identity & consent"
        action={<ViewLink href="/digital-health" label="Open ABDM" />}
      />
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "ABHA Linked", value: totals?.patientsLinkedToAbha ?? "—", tone: "bg-emerald-50 text-emerald-800" },
          { label: "Pending verification", value: totals?.pendingVerification ?? "—", tone: "bg-amber-50 text-amber-800" },
          { label: "Consent required", value: totals?.pendingConsentRequests ?? "—", tone: "bg-orange-50 text-orange-800" },
          { label: "Record requests", value: totals?.failedExchanges ?? "—", tone: "bg-sky-50 text-sky-800" },
        ].map((item) => (
          <div key={item.label} className={cn("rounded-2xl px-3 py-3", item.tone)}>
            <Shield className="mb-2 size-4 opacity-80" />
            <p className="text-xl font-semibold tabular-nums">{item.value}</p>
            <p className="text-[11px] font-medium opacity-80">{item.label}</p>
          </div>
        ))}
      </div>
      <Button asChild variant="outline" size="sm" className="mt-3 w-full">
        <Link href="/digital-health/tasks">View ABDM tasks</Link>
      </Button>
    </DashCard>
  );
}
