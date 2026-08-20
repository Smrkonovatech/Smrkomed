"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  ListChecks,
  TriangleAlert,
  Users,
} from "lucide-react";

import { useCreateTask } from "@/components/create-task-drawer";
import { DemoRunner } from "@/components/demo-runner";
import { SmrkoAiBrief } from "@/components/ai/smrko-ai-brief";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard, PageHeader, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { useAppState } from "@/lib/app-state";
import {
  coupleLabel,
  findCouple,
  type Couple,
  type ExceptionKind,
} from "@/lib/demo-data";
import {
  appointmentTone,
  exceptionMeta,
  patientStatusTone,
  toneClasses,
  toneDot,
  type Tone,
} from "@/lib/status";
import { cn } from "@/lib/utils";

const attentionOrder: ExceptionKind[] = [
  "clinical_review",
  "missing_report",
  "no_response",
  "appointment_issue",
];

const exceptionRoutes: Record<ExceptionKind, string> = {
  clinical_review: "/care-loop",
  missing_report: "/documents",
  no_response: "/care-loop",
  appointment_issue: "/appointments",
  ai_escalation: "/care-loop",
};

const activityTone: Record<string, Tone> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

export default function Dashboard() {
  const appState = useAppState() as ReturnType<typeof useAppState> & {
    couples?: Couple[];
  };
  const { activity, exceptions, kpis, tasks } = appState;
  const { open: openTask } = useCreateTask();
  const couples = appState.couples;
  const appointments = appState.appointments;

  const attentionItems = attentionOrder
    .map((kind) => exceptions.find((exception) => exception.kind === kind))
    .filter((exception): exception is NonNullable<typeof exception> => Boolean(exception));

  const tasksDueToday = tasks.filter(
    (task) => task.status !== "completed",
  ).length;

  const attentionPatients = new Set(
    attentionItems.flatMap((item) => {
      const couple = findCouple(item.coupleId, couples);
      if (!couple) return [];
      return [couple.primary.name, couple.partner?.name].filter(Boolean);
    }),
  );
  const recentActivity = activity
    .filter((item) => !attentionPatients.has(item.patient))
    .slice(0, 5);

  const kpiCards = [
    {
      label: "Active Couples",
      value: String(kpis.active),
      hint: "Currently in care",
      icon: Users,
      tone: "primary" as Tone,
    },
    {
      label: "Today's Appointments",
      value: "24",
      hint: `${appointments.filter((item) => item.status !== "Completed").length} in the live schedule`,
      icon: CalendarDays,
      tone: "teal" as Tone,
    },
    {
      label: "Care Loop Exceptions",
      value: String(exceptions.length),
      hint: "Require team review",
      icon: TriangleAlert,
      tone: "danger" as Tone,
    },
    {
      label: "Tasks Due Today",
      value: String(tasksDueToday),
      hint: "Open before end of day",
      icon: ListChecks,
      tone: "warning" as Tone,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Good morning, Dr. Ananya"
        subtitle="Today at ABC Fertility Centre"
        actions={
          <>
            <DemoRunner />
            <Button className="rounded-xl" onClick={() => openTask()}>
              <ListChecks className="size-4" />
              New task
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} className="rounded-xl p-3.5" />
        ))}
      </div>

      <SmrkoAiBrief />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
        <section className="surface-card rounded-xl p-4">
          <SectionHeading
            title="Today's clinic activity"
            subtitle="Monday, 17 August · Bangalore"
            icon={Clock3}
            tone="teal"
            action={
              <Button asChild variant="ghost" size="sm" className="rounded-lg">
                <Link href="/appointments">
                  Open schedule
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
          <ol className="relative ml-2 border-l">
            {appointments.slice(0, 5).map((appointment) => {
              const couple = findCouple(appointment.coupleId, couples);
              if (!couple) return null;
              return (
                <li key={appointment.id} className="relative pb-3 pl-6 last:pb-0">
                  <span
                    className={cn(
                      "absolute top-1.5 -left-1.5 size-3 rounded-full border-2 border-background",
                      toneDot[appointmentTone[appointment.status] ?? "muted"],
                    )}
                    aria-hidden
                  />
                  <Link
                    href="/appointments"
                    className="group grid gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="text-xs font-semibold tabular-nums">{appointment.time}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium group-hover:text-primary">
                        {appointment.type}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {coupleLabel(couple)} · {appointment.room}
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
          </ol>
        </section>

        <section className="surface-card rounded-xl p-4">
          <SectionHeading
            title="Needs attention"
            subtitle="Highest-priority Care Loop exceptions"
            icon={TriangleAlert}
            tone="danger"
            action={
              <Button asChild variant="ghost" size="sm" className="rounded-lg">
                <Link href="/care-loop">
                  View all
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="divide-y">
            {attentionItems.map((item) => {
              const couple = findCouple(item.coupleId, couples);
              if (!couple) return null;
              const meta = exceptionMeta[item.kind];
              return (
                <Link
                  key={item.id}
                  href={exceptionRoutes[item.kind]}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={cn("mt-1 size-2 rounded-full", toneDot[meta.tone])}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold group-hover:text-primary">
                        {meta.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          toneClasses[meta.tone],
                        )}
                      >
                        {item.owner}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-medium">
                      {coupleLabel(couple)} · {item.task}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                      {item.reason}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section className="surface-card rounded-xl p-4">
        <SectionHeading
          title="Active Fertility Journeys"
          subtitle="Current treatment progress and the next required step"
          icon={Activity}
          tone="purple"
          action={
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link href="/patients">
                All couples
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Couple</TableHead>
              <TableHead>Treatment</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Next Step</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {couples.slice(0, 5).map((couple) => (
              <TableRow key={couple.id}>
                <TableCell className="font-semibold">
                  <Link href={`/patients/${couple.slug}`} className="hover:text-primary">
                    {coupleLabel(couple)}
                  </Link>
                </TableCell>
                <TableCell>{couple.treatment}</TableCell>
                <TableCell className="text-muted-foreground">{couple.stage}</TableCell>
                <TableCell>
                  <Link href={`/patients/${couple.slug}`} className="hover:text-primary">
                    {couple.nextStep}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{couple.coordinator}</TableCell>
                <TableCell className="text-right">
                  <StatusBadge
                    label={couple.status}
                    tone={patientStatusTone[couple.status] ?? "muted"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="surface-card rounded-xl p-4">
        <SectionHeading
          title="Today's Appointments"
          subtitle="Next five bookings across the clinic"
          icon={CalendarDays}
          tone="teal"
          action={
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link href="/appointments">
                Full calendar
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Couple</TableHead>
              <TableHead>Appointment</TableHead>
              <TableHead>Clinician</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.slice(0, 5).map((appointment) => {
              const couple = findCouple(appointment.coupleId, couples);
              if (!couple) return null;
              return (
                <TableRow key={appointment.id}>
                  <TableCell className="font-semibold tabular-nums">{appointment.time}</TableCell>
                  <TableCell>
                    <Link
                      href={`/patients/${couple.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {coupleLabel(couple)}
                    </Link>
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell className="text-muted-foreground">{appointment.doctor}</TableCell>
                  <TableCell className="text-muted-foreground">{appointment.room}</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge
                      label={appointment.status}
                      tone={appointmentTone[appointment.status] ?? "muted"}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-xl border bg-card px-4 py-3">
        <SectionHeading
          title="Recent activity"
          subtitle="Latest updates outside the attention queue"
          icon={Activity}
          tone="info"
          action={
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link href="/care-loop">
                Care Loop
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        />
        <ul className="grid gap-x-6 gap-y-2 md:grid-cols-2">
          {recentActivity.map((item) => (
            <li key={item.id}>
              <Link
                href="/care-loop"
                className="group flex items-start gap-2 rounded-lg py-1.5 hover:text-primary"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    toneDot[activityTone[item.tone] ?? "muted"],
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    <span className="font-semibold">{item.patient}</span>{" "}
                    <span className="text-muted-foreground group-hover:text-primary/80">
                      {item.activity}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">{item.time}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
