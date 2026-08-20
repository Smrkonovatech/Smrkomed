"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { AiInsightCard } from "@/components/ai/ai-insight-card";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/app-state";
import { coupleLabel, team, type Appointment } from "@/lib/demo-data";
import { appointmentTone } from "@/lib/status";
import { cn } from "@/lib/utils";

const tabs = ["Today", "Upcoming", "Calendar", "Availability"] as const;
const views = ["Day", "Week", "Month"] as const;
const hours = ["09:00 AM", "10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];
const doctors = team.filter((member) => member.name.startsWith("Dr."));

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Today");
  const [view, setView] = useState<(typeof views)[number]>("Day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remindedIds, setRemindedIds] = useState<string[]>([]);
  const { openAction } = useGlobalActions();
  const { appointments, couples, pushActivity, patchAppointmentStatus, loadState } = useAppState();
  const coupleById = useMemo(
    () => new Map(couples.map((couple) => [couple.id, couple])),
    [couples],
  );

  const visibleAppointments = appointments
    .filter((appointment) => {
      const appointmentDate = appointment.date ?? selectedDate;
      if (activeTab === "Today") return appointmentDate === selectedDate;
      if (activeTab === "Upcoming") {
        return (
          appointmentDate > selectedDate &&
          appointment.status !== "Completed" &&
          appointment.status !== "No-show"
        );
      }
      if (activeTab === "Calendar") {
        return isDateInView(appointmentDate, selectedDate, view);
      }
      return true;
    });

  const waitingCount = visibleAppointments.filter(
    (appointment) => appointment.status === "Waiting",
  ).length;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Appointments"
        subtitle="Run the clinic schedule, patient arrivals, reminders, and doctor availability."
        actions={
          <Button className="rounded-lg" onClick={() => openAction("new-appointment")}>
            <CalendarPlus className="size-4" /> New Appointment
          </Button>
        }
      />

      <div className="mb-4">
        <AiInsightCard
          message={`${appointments.filter((a) => (a.date ?? selectedDate) === selectedDate && a.status !== "Completed").length} appointments on the selected day may need preparation or arrival checks.`}
          askPrompt="Who has appointments today?"
        />
      </div>

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-col gap-3 border-b p-3 xl:flex-row xl:items-center xl:justify-between">
          <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Appointment sections">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "Today") setSelectedDate(new Date().toISOString().slice(0, 10));
                }}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border p-0.5">
              {views.map((item) => (
                <button
                  key={item}
                  onClick={() => setView(item)}
                  className={cn(
                    "min-h-11 rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:min-h-0",
                    item === "Day" ? "inline-flex" : "hidden md:inline-flex",
                    view === item
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={view === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-r-none shadow-none"
                onClick={() => setSelectedDate(shiftDate(selectedDate, view, -1))}
                aria-label={`Previous ${view.toLowerCase()}`}
              >
                <ChevronLeft />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-9 w-[150px] rounded-none border-x-0 shadow-none"
                aria-label="Schedule date"
              />
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-l-none shadow-none"
                onClick={() => setSelectedDate(shiftDate(selectedDate, view, 1))}
                aria-label={`Next ${view.toLowerCase()}`}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>

        {activeTab === "Availability" ? (
          <Availability
            selectedDate={selectedDate}
            onSelectSlot={() => openAction("new-appointment")}
          />
        ) : loadState === "loading" ? (
          <p className="p-6 text-sm text-muted-foreground">Loading appointments...</p>
        ) : loadState === "error" ? (
          <EmptyState
            title="Unable to load appointments"
            description="Try again."
            icon={CalendarDays}
          />
        ) : visibleAppointments.length === 0 ? (
          <EmptyState
            title="No appointments scheduled"
            description="Choose another date or create a new appointment."
            icon={CalendarDays}
            action={
              <Button className="rounded-lg" onClick={() => openAction("new-appointment")}>
                <CalendarPlus /> New Appointment
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              <span>
                {formatDate(selectedDate)} · {view} view
              </span>
              <span>
                {visibleAppointments.length} appointments · {waitingCount} waiting
              </span>
            </div>
            <MobileCards>
              {visibleAppointments.map((appointment) => {
                const couple = coupleById.get(appointment.coupleId);
                const reminded = remindedIds.includes(appointment.id);
                const patient = couple ? coupleLabel(couple) : "Patient";
                return (
                  <RecordCard key={appointment.id}>
                    <p className="text-sm font-semibold tabular-nums">{appointment.time}</p>
                    <p className="mt-1 font-semibold">{patient}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {appointment.type} · {appointment.doctor}
                    </p>
                    <div className="mt-2">
                      <StatusBadge
                        label={appointment.status}
                        tone={appointmentTone[appointment.status] ?? "muted"}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {appointment.status === "Confirmed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void patchAppointmentStatus(appointment.id, "Waiting").then(() =>
                              pushActivity({
                                patient,
                                activity: `Checked in for ${appointment.type}`,
                                time: "just now",
                                tone: "success",
                              }),
                            );
                          }}
                        >
                          <CheckCircle2 /> Check in
                        </Button>
                      )}
                      {(appointment.status === "Confirmed" || appointment.status === "Waiting") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={reminded}
                          onClick={() => {
                            setRemindedIds((current) => [...current, appointment.id]);
                            pushActivity({
                              patient,
                              activity: `Appointment reminder sent — ${appointment.type}`,
                              time: "just now",
                              tone: "info",
                            });
                          }}
                        >
                          {reminded ? <Check /> : <Bell />}
                          {reminded ? "Sent" : "Remind"}
                        </Button>
                      )}
                      {couple && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/patients/${couple.slug}`}>
                            <ExternalLink /> Open
                          </Link>
                        </Button>
                      )}
                    </div>
                  </RecordCard>
                );
              })}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-2.5 font-medium">Time</th>
                    <th className="px-3 py-2.5 font-medium">Couple</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Doctor</th>
                    <th className="px-3 py-2.5 font-medium">Room</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAppointments.map((appointment) => {
                    const couple = coupleById.get(appointment.coupleId);
                    const reminded = remindedIds.includes(appointment.id);
                    const patient = couple ? coupleLabel(couple) : "Patient";
                    return (
                      <tr
                        key={appointment.id}
                        className="border-b transition-colors last:border-0 hover:bg-accent/45"
                      >
                        <td className="px-4 py-2.5 font-semibold tabular-nums">
                          {appointment.time}
                        </td>
                        <td className="px-3 py-2.5">
                          {couple ? (
                            <Link
                              href={`/patients/${couple.slug}`}
                              className="font-semibold hover:text-primary hover:underline"
                            >
                              {coupleLabel(couple)}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Unknown couple</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-medium">{appointment.type}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{appointment.doctor}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{appointment.room}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge
                            label={appointment.status}
                            tone={appointmentTone[appointment.status] ?? "muted"}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            {appointment.status === "Confirmed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="shadow-none"
                                onClick={() => {
                                  void patchAppointmentStatus(appointment.id, "Waiting").then(() =>
                                    pushActivity({
                                      patient,
                                      activity: `Checked in for ${appointment.type}`,
                                      time: "just now",
                                      tone: "success",
                                    }),
                                  );
                                }}
                              >
                                <CheckCircle2 /> Check in
                              </Button>
                            )}
                            {(appointment.status === "Confirmed" ||
                              appointment.status === "Waiting") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={reminded}
                                onClick={() => {
                                  setRemindedIds((current) => [...current, appointment.id]);
                                  pushActivity({
                                    patient,
                                    activity: `Appointment reminder sent — ${appointment.type}`,
                                    time: "just now",
                                    tone: "info",
                                  });
                                }}
                              >
                                {reminded ? <Check /> : <Bell />}
                                {reminded ? "Sent" : "Remind"}
                              </Button>
                            )}
                            {couple && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/patients/${couple.slug}`}>
                                  <ExternalLink /> Open
                                </Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </MdTableWrap>
          </>
        )}
      </section>
    </div>
  );
}

function Availability({
  selectedDate,
  onSelectSlot,
}: {
  selectedDate: string;
  onSelectSlot: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>{formatDate(selectedDate)}</span>
        <span>
          {hours.length} open slots across {doctors.length} doctors
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-medium">Doctor</th>
              <th className="px-3 py-2.5 font-medium">Availability</th>
              <th className="px-3 py-2.5 font-medium">Open slots</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor, doctorIndex) => (
              <tr key={doctor.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <span className="block font-semibold">{doctor.name}</span>
                  <span className="text-xs text-muted-foreground">{doctor.role}</span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge label="Available" tone="success" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {hours
                      .filter((_, index) => index % doctors.length === doctorIndex)
                      .map((hour) => (
                        <button
                          key={hour}
                          onClick={onSelectSlot}
                          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                          aria-label={`Book ${hour} with ${doctor.name}`}
                        >
                          <Clock className="size-3.5" /> {hour}
                        </button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function shiftDate(dateValue: string, view: (typeof views)[number], direction: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  const amount = view === "Day" ? 1 : view === "Week" ? 7 : 30;
  date.setDate(date.getDate() + amount * direction);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function isDateInView(appointmentDate: string, selectedDate: string, view: (typeof views)[number]) {
  if (view === "Day") return appointmentDate === selectedDate;
  const appointment = new Date(`${appointmentDate}T00:00:00`);
  const selected = new Date(`${selectedDate}T00:00:00`);
  if (view === "Month") {
    return (
      appointment.getFullYear() === selected.getFullYear() &&
      appointment.getMonth() === selected.getMonth()
    );
  }
  const end = new Date(selected);
  end.setDate(end.getDate() + 6);
  return appointment >= selected && appointment <= end;
}
