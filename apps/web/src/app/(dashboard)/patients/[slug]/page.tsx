"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  HeartHandshake,
  ListChecks,
  MessageCircle,
  Phone,
  Stethoscope,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { useCreateTask } from "@/components/create-task-drawer";
import { JourneyStrip } from "@/components/journey-strip";
import { WhatsAppThread, conversationFor } from "@/components/whatsapp-thread";
import { Avatar, EmptyState, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppState } from "@/lib/app-state";
import { carePlanSteps, coupleFullLabel, findCouple, type Couple } from "@/lib/demo-data";
import { appointmentTone, patientStatusTone, taskStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

const tabs = [
  ["overview", "Overview"],
  ["journey", "Care Journey"],
  ["appointments", "Appointments"],
  ["tasks", "Tasks"],
  ["documents", "Documents"],
  ["conversation", "Conversation"],
  ["billing", "Billing"],
] as const;

export default function PatientProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [messageOpen, setMessageOpen] = useState(false);
  const [automationPaused, setAutomationPaused] = useState(false);
  const { open: openTask } = useCreateTask();
  const { openAction } = useGlobalActions();
  const appState = useAppState() as ReturnType<typeof useAppState> & {
    couples?: Couple[];
  };

  const couples = appState.couples ?? [];
  const couple = findCouple(slug, couples);
  const savedPhone = couple?.primary.phone ?? "";
  const [phoneDraft, setPhoneDraft] = useState<string | undefined>(undefined);
  const [savingPhone, setSavingPhone] = useState(false);
  const phoneValue = phoneDraft ?? savedPhone;

  if (appState.loadState === "loading") {
    return <p className="p-6 text-sm text-muted-foreground">Loading patient...</p>;
  }
  if (appState.loadState === "error") {
    return (
      <EmptyState
        title="Unable to load patient"
        description={appState.loadError ?? "Try again."}
        icon={Users}
        action={
          <Button variant="outline" onClick={() => void appState.reload()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!couple) notFound();
  const coupleTasks = appState.tasks.filter((task) => task.coupleId === couple.id);
  const coupleAppointments = appState.appointments.filter(
    (appointment) => appointment.coupleId === couple.id,
  );
  const coupleDocs = appState.documents.filter((document) => document.coupleId === couple.id);
  const coupleInvoices = appState.invoices.filter((invoice) => invoice.coupleId === couple.id);
  const coupleAlerts = appState.exceptions.filter((item) => item.coupleId === couple.id);
  const people = [couple.primary.name, couple.partner?.name].filter(Boolean) as string[];
  const recentActivity = appState.activity
    .filter((item) => people.includes(item.patient))
    .slice(0, 5);
  const messages = conversationFor(couple.id);

  const requestHuman = () => {
    if (automationPaused) return;
    setAutomationPaused(true);
    toast.info("Care Loop paused for this conversation. The care team can now take over.");
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 rounded-lg text-muted-foreground"
      >
        <Link href="/patients">
          <ArrowLeft className="size-4" /> All patients
        </Link>
      </Button>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b bg-gradient-to-br from-primary/10 via-background to-teal-500/5 px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={couple.status}
                  tone={patientStatusTone[couple.status] ?? "muted"}
                />
                <StatusBadge
                  label={`Care Loop ${automationPaused ? "Paused" : couple.careLoop}`}
                  tone={automationPaused || couple.careLoop === "Paused" ? "warning" : "purple"}
                />
              </div>
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {coupleFullLabel(couple)}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <HeartHandshake className="size-4 text-primary" />
                  {couple.treatment} · {couple.cycleLabel}
                </span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" />
                  Current stage:{" "}
                  <strong className="font-semibold text-foreground">{couple.stage}</strong>
                </span>
              </div>
            </div>

            <div className="flex max-w-3xl flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-lg bg-background/80"
                onClick={() => setMessageOpen(true)}
              >
                <MessageCircle className="size-4" /> Message
              </Button>
              <Button
                variant="outline"
                className="rounded-lg bg-background/80"
                onClick={() => openTask(couple.id)}
              >
                <ListChecks className="size-4" /> Create Task
              </Button>
              <Button
                variant="outline"
                className="rounded-lg bg-background/80"
                onClick={() => openAction("new-appointment", { coupleId: couple.id })}
              >
                <CalendarDays className="size-4" /> New Appointment
              </Button>
              <Button
                className="rounded-lg"
                onClick={() => openAction("upload-document", { coupleId: couple.id })}
              >
                <Upload className="size-4" /> Upload Document
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2">
          {[couple.primary, couple.partner].filter(Boolean).map((partner, index) => (
            <div
              key={partner!.name}
              className={cn(
                "flex items-center gap-3 px-5 py-3.5 lg:px-6",
                index === 0 ? "border-b md:border-r md:border-b-0" : "",
              )}
            >
              <Avatar
                initials={initials(partner!.name)}
                tone={index === 0 ? "primary" : "teal"}
                className="size-10"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{partner!.name}</p>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {index === 0 ? "Primary partner" : "Partner"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{partner!.age} years</span>
                  {index === 0 && "id" in partner! && partner.id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3" />
                      <Input
                        value={phoneValue}
                        onChange={(event) => setPhoneDraft(event.target.value)}
                        className="h-7 w-36 text-xs"
                        aria-label="Primary phone"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2"
                        disabled={savingPhone || phoneValue === partner.phone}
                        onClick={() => {
                          const patientId = (partner as { id?: string }).id;
                          if (!patientId) return;
                          setSavingPhone(true);
                          void appState
                            .updatePatient(patientId, { phone: phoneValue })
                            .then(() => {
                              setPhoneDraft(undefined);
                              toast.success("Phone number updated");
                            })
                            .catch((error: unknown) =>
                              toast.error(error instanceof Error ? error.message : "Unable to update patient."),
                            )
                            .finally(() => setSavingPhone(false));
                        }}
                      >
                        Save
                      </Button>
                    </span>
                  ) : (
                    <a
                      href={`tel:${partner!.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Phone className="size-3" />
                      {partner!.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto rounded-xl border bg-card p-1">
          <TabsList className="h-9 min-w-max justify-start bg-transparent">
            {tabs.map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-8 rounded-lg px-3 text-xs">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <OverviewCard
                icon={HeartHandshake}
                label="Current stage"
                value={couple.stage}
                detail={`${couple.treatment} · ${couple.cycleLabel}`}
                tone="primary"
              />
              <OverviewCard
                icon={Clock3}
                label="Next step"
                value={couple.nextStep}
                detail="Next care-plan milestone"
                tone="teal"
              />
              <OverviewCard
                icon={Stethoscope}
                label="Assigned doctor"
                value={couple.doctor}
                detail="Clinical owner"
                tone="purple"
              />
              <OverviewCard
                icon={UserRound}
                label="Coordinator"
                value={couple.coordinator}
                detail="Care coordination"
                tone="warning"
              />
            </div>

            <div className="space-y-4">
              <section className="surface-card p-4">
                <SectionHeading
                  title="Important alerts"
                  subtitle={`${coupleAlerts.length} item${coupleAlerts.length === 1 ? "" : "s"} requiring attention`}
                  icon={AlertTriangle}
                  tone={coupleAlerts.length ? "warning" : "success"}
                />
                {coupleAlerts.length ? (
                  <ul className="space-y-2">
                    {coupleAlerts.map((alert) => (
                      <li
                        key={alert.id}
                        className="rounded-xl border border-warning/20 bg-warning-soft/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{alert.task}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{alert.reason}</p>
                          </div>
                          <StatusBadge label={alert.owner} tone="warning" className="capitalize" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl bg-success-soft/50 p-3 text-sm text-success">
                    No important alerts for this couple.
                  </p>
                )}
              </section>

              <section className="surface-card p-4">
                <SectionHeading
                  title="Recent activity"
                  subtitle="Latest couple-specific events"
                  icon={Clock3}
                />
                {recentActivity.length ? (
                  <ul className="space-y-3">
                    {recentActivity.map((item) => (
                      <li
                        key={item.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5"
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-2 rounded-full",
                            item.tone === "success" && "bg-success",
                            item.tone === "warning" && "bg-warning",
                            item.tone === "danger" && "bg-danger",
                            item.tone === "info" && "bg-primary",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.activity}</p>
                          <p className="text-xs text-muted-foreground">{item.patient}</p>
                        </div>
                        <span className="text-xs whitespace-nowrap text-muted-foreground">
                          {item.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
                )}
              </section>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="journey" className="mt-4">
          <section className="surface-card p-4 lg:p-5">
            <SectionHeading
              title="Care journey"
              subtitle="Complete doctor-defined plan and current progress"
              icon={HeartHandshake}
              tone="teal"
            />
            <JourneyStrip
              stages={carePlanSteps.map((step) => ({
                label: step.title,
                state: step.state,
                detail: step.detail,
              }))}
            />
            <ol className="mt-5 grid gap-2">
              {carePlanSteps.map((step) => (
                <li
                  key={step.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3"
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-xs font-bold",
                      step.state === "done"
                        ? "bg-success-soft text-success"
                        : step.state === "attention"
                          ? "bg-warning-soft text-warning"
                          : step.state === "current"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {step.state === "done" ? <CheckCircle2 className="size-4" /> : step.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{step.title}</span>
                    <span className="block text-xs text-muted-foreground">{step.detail}</span>
                  </span>
                  <StatusBadge
                    label={step.meta}
                    tone={
                      step.state === "done"
                        ? "success"
                        : step.state === "attention"
                          ? "warning"
                          : step.state === "current"
                            ? "primary"
                            : "muted"
                    }
                  />
                </li>
              ))}
            </ol>
          </section>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <RecordSection
            title="Appointments"
            subtitle="Past and upcoming visits for this couple"
            icon={CalendarDays}
            empty="No appointments recorded."
            count={coupleAppointments.length}
          >
            {coupleAppointments.map((appointment) => (
              <li
                key={appointment.id}
                className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <span className="text-sm font-semibold tabular-nums">{appointment.time}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{appointment.type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {appointment.doctor} · {appointment.room}
                  </p>
                </div>
                <StatusBadge
                  label={appointment.status}
                  tone={appointmentTone[appointment.status] ?? "muted"}
                />
              </li>
            ))}
          </RecordSection>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <RecordSection
            title="Tasks"
            subtitle="Live tasks assigned to either partner"
            icon={ListChecks}
            empty="No tasks assigned."
            count={coupleTasks.length}
            action={
              <Button size="sm" className="h-8 rounded-lg" onClick={() => openTask(couple.id)}>
                Create Task
              </Button>
            }
          >
            {coupleTasks.map((task) => (
              <li
                key={task.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {task.assignedTo} · due {task.due}
                    {task.note ? ` · ${task.note}` : ""}
                  </p>
                </div>
                <StatusBadge
                  label={taskStatusMeta[task.status].label}
                  tone={taskStatusMeta[task.status].tone}
                />
              </li>
            ))}
          </RecordSection>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <RecordSection
            title="Documents"
            subtitle="Reports, consents, prescriptions, and invoices"
            icon={FileText}
            empty="No documents uploaded."
            count={coupleDocs.length}
            action={
              <Button
                size="sm"
                className="h-8 rounded-lg"
                onClick={() => openAction("upload-document", { coupleId: couple.id })}
              >
                <Upload className="size-3.5" /> Upload
              </Button>
            }
          >
            {coupleDocs.map((document) => (
              <li
                key={document.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{document.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {document.category} · {document.uploadedBy} · {document.uploaded}
                  </p>
                </div>
                <StatusBadge
                  label={document.status}
                  tone={
                    document.status === "Reviewed"
                      ? "success"
                      : document.status === "Doctor Review"
                        ? "warning"
                        : "muted"
                  }
                />
              </li>
            ))}
          </RecordSection>
        </TabsContent>

        <TabsContent value="conversation" className="mt-4">
          <div className="grid min-h-[560px] gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
            <WhatsAppThread messages={messages} patientName={couple.primary.name} />
            <section className="surface-card h-fit p-4">
              <SectionHeading
                title="Conversation controls"
                subtitle="Human oversight for Care Loop"
                icon={Users}
                tone="purple"
              />
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Automation</span>
                  <StatusBadge
                    label={automationPaused ? "Paused" : "Active"}
                    tone={automationPaused ? "warning" : "success"}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  A human can take over the conversation at any time. Care Loop does not provide
                  clinical diagnosis.
                </p>
              </div>
              <Button
                variant={automationPaused ? "secondary" : "outline"}
                className="mt-3 w-full rounded-lg"
                disabled={automationPaused}
                onClick={requestHuman}
              >
                <UserRound className="size-4" />
                {automationPaused ? "Human takeover requested" : "Talk to a human"}
              </Button>
              {automationPaused && (
                <p className="mt-3 rounded-xl bg-warning-soft p-3 text-xs font-medium text-warning">
                  Automated replies are paused locally for this conversation. The care team can
                  continue from here.
                </p>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <RecordSection
            title="Billing"
            subtitle="Invoices linked to this couple"
            icon={CircleDollarSign}
            empty="No billing records."
            count={coupleInvoices.length}
          >
            {coupleInvoices.map((invoice) => (
              <li
                key={invoice.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invoice.item}</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.id} · {invoice.date}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  ₹{invoice.amount.toLocaleString("en-IN")}
                </span>
                <StatusBadge
                  label={invoice.status}
                  tone={
                    invoice.status === "Paid"
                      ? "success"
                      : invoice.status === "Overdue"
                        ? "danger"
                        : "warning"
                  }
                />
              </li>
            ))}
          </RecordSection>
        </TabsContent>
      </Tabs>

      <Sheet open={messageOpen} onOpenChange={setMessageOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4 pr-12">
            <SheetTitle>WhatsApp conversation</SheetTitle>
            <SheetDescription>
              {coupleFullLabel(couple)} · {couple.treatment} · {couple.stage}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 p-4">
            <WhatsAppThread messages={messages} patientName={couple.primary.name} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof HeartHandshake;
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "teal" | "purple" | "warning";
}) {
  return (
    <div className="surface-card p-4">
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl",
          tone === "primary" && "bg-primary-soft text-primary",
          tone === "teal" && "bg-teal-soft text-teal",
          tone === "purple" && "bg-purple-soft text-purple",
          tone === "warning" && "bg-warning-soft text-warning",
        )}
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function RecordSection({
  title,
  subtitle,
  icon,
  empty,
  count,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof CalendarDays;
  empty: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-4">
      <SectionHeading title={title} subtitle={subtitle} icon={icon} action={action} />
      {count ? (
        <ul className="divide-y">{children}</ul>
      ) : (
        <EmptyState
          title={empty}
          description="New records will appear here when they are added."
          icon={icon}
        />
      )}
    </section>
  );
}
