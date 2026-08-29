"use client";

import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  FileText,
  MessageCircle,
  Pill,
  ShieldCheck,
  CircleDollarSign,
  Clock3,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SectionHeading, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Patient360 = {
  header: {
    patientName: string;
    patientId: string;
    age: number | null;
    gender: string;
    contact: string | null;
    abhaStatus: string;
    abhaMasked: string | null;
    assignedDoctor: string;
    assignedCoordinator: string;
    currentTreatment: { label: string; kind: string; status: string } | null;
    currentCarePlan: { name: string; type: string; status: string } | null;
    attentionStatus: string;
    careLoopActive: boolean;
  };
  summaryCards: {
    nextAppointment: {
      type: string;
      startsAt: string;
      doctorName: string | null;
      status: string;
    } | null;
    pendingTasks: number;
    overdueTasks: number;
    followUpsDueSoon: number;
    currentMedications: number;
    paymentStatus: string;
    outstandingAmountInr: number;
    insuranceStatus: string;
    documentsCount: number;
    documentsAwaiting: number;
    documentStorageConfigured: boolean;
    whatsappStatus: string;
  };
  attention: {
    level: string;
    label: string;
    note: string;
    alerts: Array<{ id: string; level: string; title: string; reason: string; category: string }>;
  };
  medications: {
    current: Array<{
      medicineName: string;
      dosage: string | null;
      frequency: string | null;
      timeOfDay: string | null;
      beforeAfterFood: string | null;
      dispenseLabel: string;
    }>;
    note: string;
  };
  digitalHealth: {
    abha: { status: string; abhaMasked: string | null };
    pendingConsents: number;
    note: string;
  };
  preparePatient: {
    whyHere: string | null;
    lastConsultationHint: string | null;
    followUpPrompts: string[];
    disclaimer: string;
  };
  timeline: {
    documentStorageNote: string | null;
    items: Array<{
      id: string;
      date: string;
      type: string;
      title: string;
      sourceModule: string;
      actor: string | null;
      recordStatus: string | null;
    }>;
  };
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function alertTone(level: string) {
  if (level === "HIGH") return "danger" as const;
  if (level === "MEDIUM") return "warning" as const;
  return "muted" as const;
}

export function Patient360Panel({ coupleIdOrSlug }: { coupleIdOrSlug: string }) {
  const [data, setData] = useState<Patient360 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [prepareOpen, setPrepareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await apiGet<Patient360>(
          `/api/v1/couples/${encodeURIComponent(coupleIdOrSlug)}/360`,
        );
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load Patient 360.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coupleIdOrSlug]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading Patient 360…</p>;
  }
  if (error || !data) {
    return (
      <p className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
        {error ?? "Patient 360 unavailable."}
      </p>
    );
  }

  const { header, summaryCards, attention, medications, digitalHealth, preparePatient, timeline } =
    data;

  const cards = [
    {
      icon: CalendarDays,
      label: "Next appointment",
      value: summaryCards.nextAppointment
        ? summaryCards.nextAppointment.type
        : "None scheduled",
      detail: summaryCards.nextAppointment
        ? formatWhen(summaryCards.nextAppointment.startsAt)
        : "No upcoming visit",
    },
    {
      icon: ClipboardList,
      label: "Pending tasks",
      value: String(summaryCards.pendingTasks),
      detail:
        summaryCards.overdueTasks > 0
          ? `${summaryCards.overdueTasks} overdue`
          : `${summaryCards.followUpsDueSoon} due soon`,
    },
    {
      icon: Pill,
      label: "Current medications",
      value: String(summaryCards.currentMedications),
      detail: medications.note,
    },
    {
      icon: CircleDollarSign,
      label: "Payment",
      value: summaryCards.paymentStatus,
      detail:
        summaryCards.outstandingAmountInr > 0
          ? `₹${Math.round(summaryCards.outstandingAmountInr).toLocaleString("en-IN")} outstanding`
          : "No balance",
    },
    {
      icon: ShieldCheck,
      label: "Insurance",
      value: summaryCards.insuranceStatus,
      detail: "From insurance module",
    },
    {
      icon: FileText,
      label: "Documents",
      value: String(summaryCards.documentsCount),
      detail: summaryCards.documentStorageConfigured
        ? `${summaryCards.documentsAwaiting} awaiting`
        : "Storage not configured (metadata only)",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: summaryCards.whatsappStatus.replaceAll("_", " "),
      detail: "Existing conversation thread",
    },
    {
      icon: Stethoscope,
      label: "ABHA",
      value: header.abhaStatus.replaceAll("_", " "),
      detail: header.abhaMasked ?? "Not linked",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="surface-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <SectionHeading
              title="Patient 360"
              subtitle="Unified operational view across Care Loop, pharmacy, billing, WhatsApp, and digital health"
              icon={Stethoscope}
              tone="primary"
            />
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>ID {header.patientId.slice(0, 8)}…</span>
              {header.age != null ? <span>· {header.age} yrs</span> : null}
              <span>· {header.gender}</span>
              {header.contact ? <span>· {header.contact}</span> : null}
              <span>· Dr {header.assignedDoctor}</span>
              <span>· Coord {header.assignedCoordinator}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={attention.label}
              tone={
                attention.level === "HIGH"
                  ? "danger"
                  : attention.level === "MEDIUM"
                    ? "warning"
                    : attention.level === "LOW"
                      ? "primary"
                      : "success"
              }
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => setPrepareOpen((v) => !v)}
            >
              Prepare Patient
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => setTimelineOpen((v) => !v)}
            >
              {timelineOpen ? "Hide timeline" : "Unified timeline"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border bg-background/60 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <card.icon className="size-3.5" />
                {card.label}
              </div>
              <p className="mt-1 truncate text-sm font-semibold">{card.value}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-4">
          <SectionHeading
            title="Operational alerts"
            subtitle={attention.note}
            icon={AlertTriangle}
            tone={attention.alerts.length ? "warning" : "success"}
          />
          {attention.alerts.length ? (
            <ul className="mt-3 space-y-2">
              {attention.alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-start justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{alert.reason}</p>
                  </div>
                  <StatusBadge label={alert.level} tone={alertTone(alert.level)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-success-soft/50 p-3 text-sm text-success">
              No operational attention items.
            </p>
          )}
        </section>

        <section className="surface-card p-4">
          <SectionHeading
            title="Current medications"
            subtitle="PRESCRIBED / DISPENSED from pharmacy — AI cannot prescribe"
            icon={Pill}
            tone="teal"
          />
          {medications.current.length ? (
            <ul className="mt-3 space-y-2">
              {medications.current.slice(0, 6).map((med, idx) => (
                <li
                  key={`${med.medicineName}-${idx}`}
                  className="rounded-xl border p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{med.medicineName}</p>
                    <StatusBadge label={med.dispenseLabel} tone="primary" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[med.dosage, med.frequency, med.timeOfDay, med.beforeAfterFood]
                      .filter(Boolean)
                      .join(" · ") || "No schedule detail"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No active medications on record.</p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{digitalHealth.note}</p>
        </section>
      </div>

      {prepareOpen ? (
        <section className="surface-card border-primary/20 p-4">
          <SectionHeading
            title="Prepare Patient"
            subtitle="Deterministic briefing from live records"
            icon={ClipboardList}
          />
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Why here</dt>
              <dd className="font-medium">{preparePatient.whyHere ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last consultation</dt>
              <dd className="font-medium">{preparePatient.lastConsultationHint ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Follow-up prompts</dt>
              <dd className="font-medium">
                {preparePatient.followUpPrompts.length
                  ? preparePatient.followUpPrompts.join(" · ")
                  : "None"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">{preparePatient.disclaimer}</p>
        </section>
      ) : null}

      {timelineOpen ? (
        <section className="surface-card p-4">
          <SectionHeading
            title="Unified health timeline"
            subtitle="Events from existing modules only — not manufactured history"
            icon={Clock3}
          />
          {timeline.documentStorageNote ? (
            <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {timeline.documentStorageNote}
            </p>
          ) : null}
          <ul className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
            {timeline.items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border px-3 py-2.5",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.type} · {item.sourceModule}
                    {item.actor ? ` · ${item.actor}` : ""}
                    {item.recordStatus ? ` · ${item.recordStatus}` : ""}
                  </p>
                </div>
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                  {formatWhen(item.date)}
                </span>
              </li>
            ))}
          </ul>
          {!timeline.items.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No timeline events yet.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
