"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  HeartHandshake,
  ListChecks,
  MessageCircle,
  Mic,
  Phone,
  Pill,
  ShieldCheck,
  Stethoscope,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AiPatientSummary } from "@/components/ai/ai-patient-summary";
import { PatientJourneySummary } from "@/components/ai/patient-journey-summary";
import { PrepareConsultation } from "@/components/ai/prepare-consultation";
import { Patient360Panel } from "@/components/patients/patient-360-panel";
import { useGlobalActions } from "@/components/actions/global-action-provider";
import { useCreateTask } from "@/components/create-task-drawer";
import { JourneyStrip } from "@/components/journey-strip";
import { VoiceNotesPanel } from "@/components/voice/voice-notes";
import { WhatsAppThread, conversationFor } from "@/components/whatsapp-thread";
import { Avatar, EmptyState, LoadingRows, SectionHeading, StatusBadge } from "@/components/ui-kit";
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
import { ApiError, apiGet } from "@/lib/api/client";
import { PatientInsuranceTab } from "@/components/insurance/patient-insurance-tab";
import { PatientFinancialsTab } from "@/components/payments/patient-financials-tab";
import { PatientDigitalHealthTab } from "@/components/digital-health/patient-digital-health-tab";
import { formatDate, formatDateTime, formatINR, prescriptionStatusTone, reminderStatusTone } from "@/components/pharmacy/format";
import { ProductThumb } from "@/components/pharmacy/product-thumb";
import { ReminderMessageDialog } from "@/components/pharmacy/reminder-message-dialog";
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
  ["consultation", "Consultation"],
  ["conversation", "Conversation"],
  ["billing", "Billing"],
  ["pharmacy", "Pharmacy"],
  ["insurance", "Insurance"],
  ["digital-health", "Digital Health"],
] as const;

export default function PatientProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [messageOpen, setMessageOpen] = useState(false);
  const [automationPaused, setAutomationPaused] = useState(false);
  const [voiceConsentOpen, setVoiceConsentOpen] = useState(false);
  const [consultTab, setConsultTab] = useState("overview");
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
  const insurancePatientId =
    "id" in couple.primary ? (couple.primary as { id?: string }).id : undefined;
  const coupleTasks = appState.tasks.filter((task) => task.coupleId === couple.id);
  const coupleAppointments = appState.appointments.filter(
    (appointment) => appointment.coupleId === couple.id,
  );
  const coupleDocs = appState.documents.filter((document) => document.coupleId === couple.id);
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
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
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
                <Upload className="size-4" /> Upload
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
                        className="h-11 w-full max-w-xs text-sm sm:h-7 sm:w-36 sm:text-xs"
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

      <Tabs value={consultTab} onValueChange={setConsultTab}>
        <div className="overflow-x-auto rounded-xl border bg-card p-1">
          <TabsList className="h-11 min-w-max justify-start bg-transparent sm:h-9">
            {tabs.map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="h-8 rounded-lg px-3 text-xs">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <div className="mb-4 space-y-4">
            <Patient360Panel coupleIdOrSlug={couple.slug || couple.id} />
            <AiPatientSummary
              couple={couple}
              tasks={coupleTasks}
              appointments={coupleAppointments}
              activity={recentActivity}
              noResponse={coupleAlerts.some((a) => a.kind === "no_response")}
            />
            <PatientJourneySummary
              couple={couple}
              tasks={coupleTasks}
              appointments={coupleAppointments}
              documents={coupleDocs}
              activity={recentActivity}
            />
          </div>
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

        <TabsContent value="consultation" className="mt-4 space-y-4">
          <PrepareConsultation
            couple={couple}
            tasks={coupleTasks}
            appointments={coupleAppointments}
            documents={coupleDocs}
            activity={recentActivity}
            onStartVoice={() => {
              setConsultTab("consultation");
              setVoiceConsentOpen(true);
            }}
          />
          <section className="surface-card space-y-4 p-4">
            <SectionHeading
              title="Voice consultation notes"
              subtitle="Record, summarise, and save — audio is never stored"
              icon={Mic}
              tone="teal"
            />
            <VoiceNotesPanel
              coupleId={couple.id}
              coupleLabel={coupleFullLabel(couple)}
              consentOpen={voiceConsentOpen}
              onConsentOpenChange={setVoiceConsentOpen}
            />
          </section>
        </TabsContent>

        <TabsContent value="conversation" className="mt-4">
          <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,360px)]">
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
          <PatientFinancialsTab coupleId={couple.id} />
        </TabsContent>

        <TabsContent value="pharmacy" className="mt-4">
          <PatientPharmacyTab coupleId={couple.id} />
        </TabsContent>

        <TabsContent value="insurance" className="mt-4">
          <PatientInsuranceTab
            coupleId={couple.id}
            {...(insurancePatientId ? { patientId: insurancePatientId } : {})}
          />
        </TabsContent>

        <TabsContent value="digital-health" className="mt-4">
          {insurancePatientId ? (
            <PatientDigitalHealthTab patientId={insurancePatientId} />
          ) : (
            <EmptyState
              title="Digital health needs a patient record."
              description="Link a primary patient on this couple profile to manage ABHA and consents."
              icon={ShieldCheck}
            />
          )}
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

function PatientPharmacyTab({ coupleId }: { coupleId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewReminder, setViewReminder] = useState<{
    medicineName: string;
    scheduledAt: string;
    demoMessageBody: string | null;
  } | null>(null);
  const [history, setHistory] = useState<{
    prescriptions: Array<{
      id: string;
      prescriptionDate: string;
      status: string;
      doctorName: string | null;
      items: Array<{
        medicineName: string;
        quantityPrescribed: number;
        quantityDispensed: number;
        dosage: string | null;
        frequency: string | null;
        duration: string | null;
        instructions: string | null;
        timeOfDay: string | null;
        beforeAfterFood: string | null;
        productImageUrl?: string | null;
        reminders?: Array<{
          id: string;
          scheduledAt: string;
          status: string;
          demoMessageBody: string | null;
        }>;
      }>;
    }>;
    sales: Array<{
      id: string;
      invoiceNumber: string;
      soldAt: string;
      totalAmount: number;
      itemCount: number;
    }>;
    medications?: {
      schedule?: {
        upcoming?: Array<{
          id: string;
          medicineName?: string | null;
          dosage?: string | null;
          scheduledAt: string;
          adherenceStatus: string;
          status: string;
          demoMessageBody: string | null;
          productImageUrl?: string | null;
        }>;
        due?: Array<{
          id: string;
          medicineName?: string | null;
          dosage?: string | null;
          scheduledAt: string;
          adherenceStatus: string;
          status: string;
          demoMessageBody: string | null;
          productImageUrl?: string | null;
        }>;
        missed?: Array<{
          id: string;
          medicineName?: string | null;
          dosage?: string | null;
          scheduledAt: string;
          adherenceStatus: string;
          status: string;
          demoMessageBody: string | null;
          productImageUrl?: string | null;
        }>;
      };
      reminders?: Array<{
        id: string;
        medicineName?: string | null;
        scheduledAt: string;
        status: string;
        adherenceStatus?: string;
        demoMessageBody: string | null;
        productImageUrl?: string | null;
      }>;
    };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!coupleId) {
        setLoading(false);
        return;
      }
      try {
        const next = await apiGet<NonNullable<typeof history>>(`/api/v1/pharmacy/couples/${coupleId}/history`);
        if (!cancelled) setHistory(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load pharmacy history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coupleId]);

  if (loading) return <LoadingRows rows={3} />;

  if (error || !history) {
    return (
      <EmptyState
        title="Pharmacy history will appear for patients linked in clinic records."
        description={error ?? "No pharmacy records are linked to this couple yet."}
        icon={Pill}
      />
    );
  }

  const activePrescriptions = history.prescriptions.filter(
    (rx) => rx.status === "PENDING" || rx.status === "PARTIALLY_DISPENSED",
  );

  const currentMedications = activePrescriptions.flatMap((rx) =>
    rx.items.map((item) => ({ ...item, prescriptionDate: rx.prescriptionDate, doctorName: rx.doctorName })),
  );

  const allReminders =
    history.medications?.reminders?.map((reminder) => ({
      ...reminder,
      medicineName: reminder.medicineName ?? "Medication",
      productImageUrl: reminder.productImageUrl,
    })) ??
    history.prescriptions.flatMap((rx) =>
      rx.items.flatMap((item) =>
        (item.reminders ?? []).map((reminder) => ({
          ...reminder,
          medicineName: item.medicineName,
          productImageUrl: item.productImageUrl,
        })),
      ),
    );

  const upcoming = history.medications?.schedule?.upcoming ?? [];
  const due = history.medications?.schedule?.due ?? [];
  const missed = history.medications?.schedule?.missed ?? [];
  const completedRx = history.prescriptions.filter(
    (rx) => rx.status === "DISPENSED" || rx.status === "CANCELLED",
  );

  function itemScheduleSummary(item: (typeof currentMedications)[number]) {
    return [item.dosage, item.frequency, item.timeOfDay, item.beforeAfterFood, item.instructions]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div className="space-y-4">
      <RecordSection
        title="Current medicines"
        subtitle={`${currentMedications.length} active medicine${currentMedications.length === 1 ? "" : "s"}`}
        icon={Pill}
        empty="No active medications for this couple."
        count={currentMedications.length}
      >
        {currentMedications.map((item, index) => (
          <li key={`${item.medicineName}-${index}`} className="flex items-start gap-3 py-3">
            <ProductThumb name={item.medicineName} imageUrl={item.productImageUrl ?? null} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.medicineName}</p>
              {itemScheduleSummary(item) && (
                <p className="text-xs text-muted-foreground">{itemScheduleSummary(item)}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Prescribed by {item.doctorName ?? "Doctor"} · Qty {item.quantityDispensed}/{item.quantityPrescribed}
                {item.duration ? ` · ${item.duration}` : ""}
              </p>
            </div>
          </li>
        ))}
      </RecordSection>

      <div className="grid gap-4 xl:grid-cols-3">
        <RecordSection
          title="Upcoming"
          subtitle={`${upcoming.length} dose${upcoming.length === 1 ? "" : "s"}`}
          icon={Bell}
          empty="No upcoming doses."
          count={upcoming.length}
        >
          {upcoming.map((r) => (
            <li key={r.id} className="py-2 text-sm">
              <p className="font-medium">{r.medicineName ?? "Medicine"}</p>
              <p className="text-xs text-muted-foreground">
                {[r.dosage, formatDateTime(r.scheduledAt)].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </RecordSection>
        <RecordSection
          title="Due / missed"
          subtitle={`${due.length + missed.length} item${due.length + missed.length === 1 ? "" : "s"}`}
          icon={AlertTriangle}
          empty="No due or missed doses."
          count={due.length + missed.length}
        >
          {[...due, ...missed].map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-medium">{r.medicineName ?? "Medicine"}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(r.scheduledAt)}</p>
              </div>
              <StatusBadge
                label={(r.adherenceStatus ?? r.status).replaceAll("_", " ")}
                tone={reminderStatusTone(r.adherenceStatus ?? r.status)}
              />
            </li>
          ))}
        </RecordSection>
        <RecordSection
          title="Completed / history"
          subtitle={`${completedRx.length} prescription${completedRx.length === 1 ? "" : "s"}`}
          icon={ClipboardList}
          empty="No completed prescriptions yet."
          count={completedRx.length}
        >
          {completedRx.map((rx) => (
            <li key={rx.id} className="py-2 text-sm">
              <p className="font-medium">{rx.items.map((i) => i.medicineName).join(", ") || "Prescription"}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(rx.prescriptionDate)} · {rx.status.replaceAll("_", " ")}
              </p>
            </li>
          ))}
        </RecordSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RecordSection
          title="Prescription history"
          subtitle={`${history.prescriptions.length} prescription${history.prescriptions.length === 1 ? "" : "s"}`}
          icon={Pill}
          empty="No prescriptions for this couple."
          count={history.prescriptions.length}
        >
          {history.prescriptions.map((rx) => (
            <li key={rx.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                {rx.items[0]?.productImageUrl && (
                  <ProductThumb name={rx.items[0].medicineName} imageUrl={rx.items[0].productImageUrl} size="sm" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{rx.items.map((i) => i.medicineName).join(", ") || "Prescription"}</p>
                  <p className="text-xs text-muted-foreground">
                    {rx.doctorName ?? "Doctor"} · {formatDate(rx.prescriptionDate)}
                  </p>
                </div>
              </div>
              <StatusBadge label={rx.status.replaceAll("_", " ")} tone={prescriptionStatusTone(rx.status)} />
            </li>
          ))}
        </RecordSection>

        <RecordSection
          title="Dispensing history"
          subtitle={`${history.sales.length} sale${history.sales.length === 1 ? "" : "s"}`}
          icon={CircleDollarSign}
          empty="No pharmacy sales for this couple."
          count={history.sales.length}
        >
          {history.sales.map((sale) => (
            <li key={sale.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{sale.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {sale.itemCount} item{sale.itemCount === 1 ? "" : "s"} · {formatDate(sale.soldAt)}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatINR(sale.totalAmount)}</span>
            </li>
          ))}
        </RecordSection>
      </div>

      <RecordSection
        title="Medication schedule"
        subtitle={`${allReminders.length} reminder${allReminders.length === 1 ? "" : "s"}`}
        icon={MessageCircle}
        empty="No medication reminders scheduled for this couple."
        count={allReminders.length}
      >
        {allReminders.map((reminder) => (
          <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {reminder.productImageUrl && (
                <ProductThumb name={reminder.medicineName} imageUrl={reminder.productImageUrl} size="sm" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{reminder.medicineName}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(reminder.scheduledAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                label={(("adherenceStatus" in reminder && reminder.adherenceStatus) || reminder.status).toString().replaceAll("_", " ")}
                tone={reminderStatusTone(
                  (("adherenceStatus" in reminder && reminder.adherenceStatus) || reminder.status) as string,
                )}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setViewReminder({
                    medicineName: reminder.medicineName,
                    scheduledAt: reminder.scheduledAt,
                    demoMessageBody: reminder.demoMessageBody,
                  })
                }
              >
                View message
              </Button>
            </div>
          </li>
        ))}
      </RecordSection>

      <ReminderMessageDialog
        open={Boolean(viewReminder)}
        onOpenChange={(open) => { if (!open) setViewReminder(null); }}
        title={viewReminder?.medicineName ?? "WhatsApp reminder"}
        description={viewReminder ? formatDateTime(viewReminder.scheduledAt) : undefined}
        messageBody={viewReminder?.demoMessageBody ?? null}
      />
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
