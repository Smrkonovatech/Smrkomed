"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Grid,
  List,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DoctorAvailabilityDialog } from "@/components/doctors/doctor-availability-dialog";
import { useGlobalActions } from "@/components/actions/global-action-provider";
import { AiInsightCard } from "@/components/ai/ai-insight-card";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState, type AppAppointment, type AppCouple } from "@/lib/app-state";
import { coupleLabel } from "@/lib/demo-data";
import {
  displayNameOf,
  formatTimeLabel,
  generateDaySlots,
  useDoctors,
} from "@/lib/doctors";
import { appointmentTone } from "@/lib/status";
import { cn } from "@/lib/utils";

const tabs = ["Today", "Upcoming", "Calendar", "Availability"] as const;
const views = ["Day", "Week", "Month"] as const;
type DisplayMode = "calendar" | "by-date" | "by-couple" | "table";

/** Get today's date formatted as YYYY-MM-DD in Indian Standard Time (Asia/Kolkata) */
export function getTodayIst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/** Construct YYYY-MM-DD string directly from year, month (0-indexed), and day without UTC drift */
export function formatYmd(year: number, monthZeroIndexed: number, day: number): string {
  const y = String(year);
  const m = String(monthZeroIndexed + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD string into year, month (0-indexed), and day */
export function parseYmd(dateStr: string): { year: number; month: number; day: number } {
  const parts = (dateStr || "").split("-").map(Number);
  const year = parts[0] || 2026;
  const month = Math.max(0, Math.min(11, (parts[1] || 1) - 1));
  const day = Math.max(1, Math.min(31, parts[2] || 1));
  return { year, month, day };
}

/** Parse appointment date + time or startsAt into an exact millisecond timestamp for chronological sorting in IST */
function getAppointmentTimestamp(appointment: AppAppointment): number {
  const startsAt = (appointment as any).startsAt;
  if (startsAt) {
    const ts = new Date(startsAt).getTime();
    if (!isNaN(ts)) return ts;
  }
  const dateStr = appointment.date || getTodayIst();
  const timeStr = (appointment.time || "00:00").trim();
  let hours = 0;
  let minutes = 0;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (match && match[1] && match[2]) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const meridian = match[3]?.toLowerCase();
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
  }
  const { year, month, day } = parseYmd(dateStr);
  return Date.UTC(year, month, day, hours - 5, minutes - 30, 0, 0);
}

/** Provide a clean fallback for room if not explicitly set */
function getAppointmentRoom(appointment: AppAppointment): string {
  if (appointment.room && appointment.room.trim()) {
    return appointment.room;
  }
  return "OPD Room #04";
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Today");
  const [view, setView] = useState<(typeof views)[number]>("Month");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("calendar");
  const [selectedDate, setSelectedDate] = useState(() => getTodayIst());
  const [remindedIds, setRemindedIds] = useState<string[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoupleFilter, setSelectedCoupleFilter] = useState<string>("all");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  const { openAction } = useGlobalActions();
  const { appointments, couples, pushActivity, patchAppointmentStatus, loadState } = useAppState();
  const doctorsCatalog = useDoctors();
  const activeDoctors = useMemo(
    () => doctorsCatalog.filter((d) => d.status === "active" && !d.isDraft),
    [doctorsCatalog],
  );
  const coupleById = useMemo(
    () => new Map(couples.map((couple) => [couple.id, couple])),
    [couples],
  );

  // Set default display mode when switching tabs
  const handleTabChange = (tab: (typeof tabs)[number]) => {
    setActiveTab(tab);
    if (tab === "Today") {
      setSelectedDate(getTodayIst());
      setView("Day");
      setDisplayMode("by-date");
    } else if (tab === "Calendar") {
      setView("Month");
      setDisplayMode("calendar");
    } else if (tab === "Upcoming") {
      setDisplayMode("by-date");
    }
  };

  // Filter appointments according to active tab
  const tabFilteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const appointmentDate = appointment.date ?? selectedDate;
      if (activeTab === "Today") {
        return appointmentDate === selectedDate;
      }
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
  }, [appointments, activeTab, selectedDate, view]);

  // Secondary filters (Couple, Doctor, Status, Search) & strictly chronologically sorted
  const visibleAppointments = useMemo(() => {
    return tabFilteredAppointments
      .filter((appointment) => {
        const couple = coupleById.get(appointment.coupleId);
        const coupleName = couple ? coupleLabel(couple).toLowerCase() : "";
        const primaryName = couple?.primary?.name?.toLowerCase() ?? "";
        const partnerName = couple?.partner?.name?.toLowerCase() ?? "";
        const doctorName = appointment.doctor.toLowerCase();
        const typeName = appointment.type.toLowerCase();

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            coupleName.includes(q) ||
            primaryName.includes(q) ||
            partnerName.includes(q) ||
            doctorName.includes(q) ||
            typeName.includes(q);
          if (!matches) return false;
        }

        // Couple filter
        if (selectedCoupleFilter !== "all" && appointment.coupleId !== selectedCoupleFilter) {
          return false;
        }

        // Doctor filter
        if (selectedDoctorFilter !== "all" && !appointment.doctor.includes(selectedDoctorFilter)) {
          return false;
        }

        // Status filter
        if (selectedStatusFilter !== "all" && appointment.status !== selectedStatusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));
  }, [
    tabFilteredAppointments,
    coupleById,
    searchQuery,
    selectedCoupleFilter,
    selectedDoctorFilter,
    selectedStatusFilter,
  ]);

  const waitingCount = visibleAppointments.filter((a) => a.status === "Waiting").length;

  // Groupings for "By Date" view
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppAppointment[]>();
    for (const appt of visibleAppointments) {
      const d = appt.date ?? selectedDate;
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(appt);
    }
    // Sort dates ascending
    return Array.from(map.entries()).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  }, [visibleAppointments, selectedDate]);

  // Groupings for "By Couple" view
  const appointmentsByCouple = useMemo(() => {
    const map = new Map<string, { couple: AppCouple | undefined; appointments: AppAppointment[] }>();
    for (const appt of visibleAppointments) {
      const cId = appt.coupleId || "unassigned";
      if (!map.has(cId)) {
        map.set(cId, { couple: coupleById.get(appt.coupleId), appointments: [] });
      }
      map.get(cId)!.appointments.push(appt);
    }
    return Array.from(map.entries());
  }, [visibleAppointments, coupleById]);

  // List of unique doctors from visible appointments for filtering
  const availableDoctors = useMemo(() => {
    const names = new Set<string>();
    appointments.forEach((a) => {
      if (a.doctor) names.add(a.doctor);
    });
    return Array.from(names);
  }, [appointments]);

  // List of unique couples for filtering
  const availableCouples = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    couples.forEach((c) => {
      list.push({ id: c.id, label: coupleLabel(c) });
    });
    return list;
  }, [couples]);

  const isFilterActive =
    searchQuery.trim() !== "" ||
    selectedCoupleFilter !== "all" ||
    selectedDoctorFilter !== "all" ||
    selectedStatusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCoupleFilter("all");
    setSelectedDoctorFilter("all");
    setSelectedStatusFilter("all");
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <PageHeader
        title="Appointments"
        subtitle="Run the clinic schedule, patient arrivals, reminders, and doctor availability."
        actions={
          <Button className="rounded-lg shadow-sm" onClick={() => openAction("new-appointment")}>
            <CalendarPlus className="size-4 mr-1.5" /> New Appointment
          </Button>
        }
      />

      <div className="mb-2">
        <AiInsightCard
          message={`${appointments.filter((a) => (a.date ?? selectedDate) === selectedDate && a.status !== "Completed").length} appointments on the selected day may need preparation or arrival checks.`}
          askPrompt="Who has appointments today?"
        />
      </div>

      <section className="overflow-hidden rounded-xl border bg-background shadow-xs">
        {/* Top Navigation & Primary Controls */}
        <div className="flex flex-col gap-3 border-b p-3 xl:flex-row xl:items-center xl:justify-between bg-card">
          <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Appointment sections">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "shrink-0 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {tab}
              </button>
            ))}
          </nav>

          {activeTab !== "Availability" && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Display Mode / Layout Selector */}
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                <button
                  onClick={() => setDisplayMode("calendar")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    displayMode === "calendar"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Interactive Calendar Grid"
                >
                  <Grid className="size-3.5" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
                <button
                  onClick={() => setDisplayMode("by-date")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    displayMode === "by-date"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Grouped Chronologically by Date"
                >
                  <CalendarDays className="size-3.5" />
                  <span className="hidden sm:inline">By Date</span>
                </button>
                <button
                  onClick={() => setDisplayMode("by-couple")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    displayMode === "by-couple"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Organized by Couple"
                >
                  <Users className="size-3.5" />
                  <span className="hidden sm:inline">By Couple</span>
                </button>
                <button
                  onClick={() => setDisplayMode("table")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    displayMode === "table"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Full Table View"
                >
                  <List className="size-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* View scale selector (Day / Week / Month) when in Calendar mode */}
              {displayMode === "calendar" && (
                <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                  {views.map((item) => (
                    <button
                      key={item}
                      onClick={() => setView(item)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        view === item
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-pressed={view === item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}

              {/* Date navigation bar */}
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-r-none shadow-none"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, view, -1))}
                  aria-label={`Previous ${view.toLowerCase()}`}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-8 w-[140px] rounded-none border-x-0 shadow-none text-xs font-medium text-center"
                  aria-label="Schedule date"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-l-none shadow-none"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, view, 1))}
                  aria-label={`Next ${view.toLowerCase()}`}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-8 px-2 text-xs font-medium text-primary hover:bg-primary/10"
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                >
                  Today
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Filter & Search Bar */}
        {activeTab !== "Availability" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/15 px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Search input */}
              <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search couple, doctor, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Filter by Couple */}
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                <select
                  value={selectedCoupleFilter}
                  onChange={(e) => setSelectedCoupleFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Filter by couple"
                >
                  <option value="all">All Couples ({couples.length})</option>
                  {availableCouples.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Doctor */}
              <div className="flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                <select
                  value={selectedDoctorFilter}
                  onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Filter by doctor"
                >
                  <option value="all">All Doctors</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Status */}
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Completed">Completed</option>
                  <option value="No-show">No-show</option>
                </select>
              </div>

              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <X className="size-3" /> Clear filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatDate(selectedDate)}
              </span>
              <span>•</span>
              <span>
                <strong className="text-foreground">{visibleAppointments.length}</strong>{" "}
                {visibleAppointments.length === 1 ? "appointment" : "appointments"}
              </span>
              {waitingCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {waitingCount} waiting
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "Availability" ? (
          <Availability
            selectedDate={selectedDate}
            doctors={activeDoctors}
            onSelectSlot={() => openAction("new-appointment")}
          />
        ) : loadState === "loading" ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading clinic appointments...</p>
          </div>
        ) : loadState === "error" ? (
          <EmptyState
            title="Unable to load appointments"
            description="There was a problem communicating with the clinic server. Try reloading."
            icon={CalendarDays}
          />
        ) : visibleAppointments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                isFilterActive
                  ? "No matching appointments found"
                  : "No appointments scheduled"
              }
              description={
                isFilterActive
                  ? "Try adjusting or clearing your filters to see more results."
                  : `No appointments are booked for ${formatDate(selectedDate)}. Pick another date or create a new booking.`
              }
              icon={CalendarDays}
              action={
                <div className="flex gap-2">
                  {isFilterActive && (
                    <Button variant="outline" onClick={clearFilters} className="rounded-lg">
                      Clear Filters
                    </Button>
                  )}
                  <Button className="rounded-lg" onClick={() => openAction("new-appointment")}>
                    <CalendarPlus className="size-4 mr-1" /> New Appointment
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div>
            {/* 1. VISUAL INTERACTIVE CALENDAR GRID */}
            {displayMode === "calendar" && (
              <VisualCalendarView
                view={view}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                appointments={visibleAppointments}
                coupleById={coupleById}
                remindedIds={remindedIds}
                setRemindedIds={setRemindedIds}
                patchAppointmentStatus={patchAppointmentStatus}
                pushActivity={pushActivity}
              />
            )}

            {/* 2. GROUPED BY DATE */}
            {displayMode === "by-date" && (
              <GroupedByDateView
                appointmentsByDate={appointmentsByDate}
                coupleById={coupleById}
                remindedIds={remindedIds}
                setRemindedIds={setRemindedIds}
                patchAppointmentStatus={patchAppointmentStatus}
                pushActivity={pushActivity}
              />
            )}

            {/* 3. GROUPED BY COUPLE */}
            {displayMode === "by-couple" && (
              <GroupedByCoupleView
                appointmentsByCouple={appointmentsByCouple}
                remindedIds={remindedIds}
                setRemindedIds={setRemindedIds}
                patchAppointmentStatus={patchAppointmentStatus}
                pushActivity={pushActivity}
              />
            )}

            {/* 4. FULL TABLE VIEW */}
            {displayMode === "table" && (
              <AppointmentTableView
                appointments={visibleAppointments}
                coupleById={coupleById}
                remindedIds={remindedIds}
                setRemindedIds={setRemindedIds}
                patchAppointmentStatus={patchAppointmentStatus}
                pushActivity={pushActivity}
                showDateColumn={true}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ========================================================================= */
/* 1. VISUAL INTERACTIVE CALENDAR VIEW (Month Grid, Week View, Day Timeline) */
/* ========================================================================= */

function VisualCalendarView({
  view,
  selectedDate,
  onSelectDate,
  appointments,
  coupleById,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
}: {
  view: (typeof views)[number];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  appointments: AppAppointment[];
  coupleById: Map<string, AppCouple>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
}) {
  if (view === "Week") {
    return (
      <WeekCalendarGrid
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        appointments={appointments}
        coupleById={coupleById}
        remindedIds={remindedIds}
        setRemindedIds={setRemindedIds}
        patchAppointmentStatus={patchAppointmentStatus}
        pushActivity={pushActivity}
      />
    );
  }

  if (view === "Day") {
    return (
      <DayTimelineGrid
        selectedDate={selectedDate}
        appointments={appointments}
        coupleById={coupleById}
        remindedIds={remindedIds}
        setRemindedIds={setRemindedIds}
        patchAppointmentStatus={patchAppointmentStatus}
        pushActivity={pushActivity}
      />
    );
  }

  // Default: Month Grid View
  return (
    <MonthCalendarGrid
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      appointments={appointments}
      coupleById={coupleById}
      remindedIds={remindedIds}
      setRemindedIds={setRemindedIds}
      patchAppointmentStatus={patchAppointmentStatus}
      pushActivity={pushActivity}
    />
  );
}

/** 7-Column Month Calendar Grid */
function MonthCalendarGrid({
  selectedDate,
  onSelectDate,
  appointments,
  coupleById,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  appointments: AppAppointment[];
  coupleById: Map<string, AppCouple>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
}) {
  const { year, month } = parseYmd(selectedDate);

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(year, month, 1, 12, 0, 0);
  const startingDayOfWeek = firstDay.getDay(); // 0 for Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  // Next month
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  // Selected day appointments for preview
  const selectedDayAppointments = useMemo(() => {
    return appointments
      .filter((a) => (a.date ?? selectedDate) === selectedDate)
      .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));
  }, [appointments, selectedDate]);

  // Build calendar matrix cells
  const cells: Array<{
    dayNumber: number;
    dateString: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    dayAppointments: AppAppointment[];
  }> = [];

  const todayStr = getTodayIst();

  // 1. Leading days from previous month
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const dateString = formatYmd(prevYear, prevMonth, dayNum);
    const dayAppts = appointments.filter((a) => (a.date ?? dateString) === dateString);
    cells.push({
      dayNumber: dayNum,
      dateString,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isSelected: dateString === selectedDate,
      dayAppointments: dayAppts,
    });
  }

  // 2. Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = formatYmd(year, month, day);
    const dayAppts = appointments.filter((a) => (a.date ?? dateString) === dateString);
    cells.push({
      dayNumber: day,
      dateString,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      isSelected: dateString === selectedDate,
      dayAppointments: dayAppts,
    });
  }

  // 3. Trailing days for next month to complete the 7-day grid
  const remainingCells = 7 - (cells.length % 7);
  if (remainingCells < 7) {
    for (let day = 1; day <= remainingCells; day++) {
      const dateString = formatYmd(nextYear, nextMonth, day);
      const dayAppts = appointments.filter((a) => (a.date ?? dateString) === dateString);
      cells.push({
        dayNumber: day,
        dateString,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDate,
        dayAppointments: dayAppts,
      });
    }
  }

  const weekHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {/* 7-Column Calendar Grid */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground uppercase py-2">
          {weekHeaders.map((day) => (
            <div key={day} className="py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y border-b text-xs">
          {cells.map((cell, idx) => {
            const hasAppointments = cell.dayAppointments.length > 0;
            return (
              <div
                key={idx}
                onClick={() => onSelectDate(cell.dateString)}
                className={cn(
                  "min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between group",
                  cell.isCurrentMonth ? "bg-background" : "bg-muted/10 text-muted-foreground",
                  cell.isSelected && "bg-primary/5 ring-2 ring-primary ring-inset z-10",
                  cell.isToday && !cell.isSelected && "bg-accent/40 font-semibold",
                  "hover:bg-accent/50",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "inline-grid size-6 place-items-center rounded-full text-xs font-medium",
                      cell.isSelected
                        ? "bg-primary text-primary-foreground font-bold"
                        : cell.isToday
                          ? "bg-foreground text-background font-bold"
                          : "group-hover:bg-muted",
                    )}
                  >
                    {cell.dayNumber}
                  </span>
                  {hasAppointments && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {cell.dayAppointments.length}
                    </span>
                  )}
                </div>

                {/* Mini appointment chips inside the day cell */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {cell.dayAppointments.slice(0, 3).map((appt) => {
                    const couple = coupleById.get(appt.coupleId);
                    const patientLabel = couple ? coupleLabel(couple) : "Patient";
                    const isCompleted = appt.status === "Completed";
                    const isConfirmed = appt.status === "Confirmed";
                    return (
                      <div
                        key={appt.id}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-[10px] font-medium border leading-tight shadow-2xs flex items-center gap-1",
                          isCompleted
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40"
                            : isConfirmed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40"
                              : "bg-muted/80 text-foreground border-border",
                        )}
                        title={`${appt.time} - ${patientLabel} (${appt.type}) with ${appt.doctor}`}
                      >
                        <span className="font-bold shrink-0">{appt.time.split(" ")[0]}</span>
                        <span className="truncate">{patientLabel}</span>
                      </div>
                    );
                  })}
                  {cell.dayAppointments.length > 3 && (
                    <div className="text-[10px] font-medium text-muted-foreground text-center">
                      +{cell.dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda & Detail Card */}
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b gap-2">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" />
              <span>Schedule for {formatDate(selectedDate)}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedDayAppointments.length === 0
                ? "No appointments scheduled for this day."
                : `${selectedDayAppointments.length} appointment${selectedDayAppointments.length > 1 ? "s" : ""} booked on this date.`}
            </p>
          </div>
          {selectedDayAppointments.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary self-start sm:self-auto">
              {selectedDayAppointments.length} Booked
            </span>
          )}
        </div>

        {selectedDayAppointments.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No consultations on this date. Click any highlighted date on the calendar above to view its schedule.
          </div>
        ) : (
          <AppointmentCardsList
            appointments={selectedDayAppointments}
            coupleById={coupleById}
            remindedIds={remindedIds}
            setRemindedIds={setRemindedIds}
            patchAppointmentStatus={patchAppointmentStatus}
            pushActivity={pushActivity}
          />
        )}
      </div>
    </div>
  );
}

/** 7-Day Week Columns Grid */
function WeekCalendarGrid({
  selectedDate,
  onSelectDate,
  appointments,
  coupleById,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  appointments: AppAppointment[];
  coupleById: Map<string, AppCouple>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
}) {
  const { year, month, day } = parseYmd(selectedDate);
  const current = new Date(year, month, day, 12, 0, 0);
  const dayOfWeek = current.getDay(); // 0 = Sunday
  const todayStr = getTodayIst();

  const days = Array.from({ length: 7 }, (_, i) => {
    const diff = i - dayOfWeek;
    const d = new Date(year, month, day + diff, 12, 0, 0);
    const dateString = formatYmd(d.getFullYear(), d.getMonth(), d.getDate());
    const dayAppts = appointments
      .filter((a) => (a.date ?? dateString) === dateString)
      .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));
    return {
      date: d,
      dateString,
      isToday: dateString === todayStr,
      isSelected: dateString === selectedDate,
      appointments: dayAppts,
    };
  });

  return (
    <div className="p-3 sm:p-4 overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 min-w-[960px]">
        {days.map((day) => (
          <div
            key={day.dateString}
            onClick={() => onSelectDate(day.dateString)}
            className={cn(
              "rounded-xl border bg-card p-3 flex flex-col transition-all cursor-pointer",
              day.isSelected && "ring-2 ring-primary border-transparent bg-primary/5",
              day.isToday && !day.isSelected && "border-primary/50 bg-accent/30",
            )}
          >
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <div>
                <p className="text-[11px] uppercase font-bold text-muted-foreground">
                  {day.date.toLocaleDateString("en-IN", { weekday: "short" })}
                </p>
                <p className="text-sm font-bold">{day.date.getDate()}</p>
              </div>
              {day.appointments.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {day.appointments.length}
                </span>
              )}
            </div>

            <div className="space-y-2 flex-1">
              {day.appointments.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 italic py-4 text-center">
                  No slots booked
                </p>
              ) : (
                day.appointments.map((appt) => {
                  const couple = coupleById.get(appt.coupleId);
                  const patientLabel = couple ? coupleLabel(couple) : "Patient";
                  return (
                    <div
                      key={appt.id}
                      className="rounded-lg border bg-background p-2 text-xs space-y-1 shadow-2xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold tabular-nums text-foreground">
                          {appt.time}
                        </span>
                        <StatusBadge
                          label={appt.status}
                          tone={appointmentTone[appt.status] ?? "muted"}
                        />
                      </div>
                      <p className="font-semibold text-foreground truncate">{patientLabel}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {appt.type} · {appt.doctor}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" /> {getAppointmentRoom(appt)}
                        </span>
                        {couple && (
                          <Link
                            href={`/patients/${couple.slug}`}
                            className="text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                          >
                            Open <ExternalLink className="size-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Day Timeline Grid View */
function DayTimelineGrid({
  selectedDate,
  appointments,
  coupleById,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
}: {
  selectedDate: string;
  appointments: AppAppointment[];
  coupleById: Map<string, AppCouple>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
}) {
  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => (a.date ?? selectedDate) === selectedDate)
      .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));
  }, [appointments, selectedDate]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span>Timeline Schedule · {formatDate(selectedDate)}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dayAppointments.length} appointment{dayAppointments.length === 1 ? "" : "s"} booked for today
          </p>
        </div>
      </div>

      <AppointmentCardsList
        appointments={dayAppointments}
        coupleById={coupleById}
        remindedIds={remindedIds}
        setRemindedIds={setRemindedIds}
        patchAppointmentStatus={patchAppointmentStatus}
        pushActivity={pushActivity}
      />
    </div>
  );
}

/* ========================================================================= */
/* 2. GROUPED BY DATE VIEW                                                  */
/* ========================================================================= */

function GroupedByDateView({
  appointmentsByDate,
  coupleById,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
}: {
  appointmentsByDate: Array<[string, AppAppointment[]]>;
  coupleById: Map<string, AppCouple>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
}) {
  const todayStr = getTodayIst();

  return (
    <div className="p-4 space-y-6">
      {appointmentsByDate.map(([dateString, dayAppointments]) => {
        const isToday = dateString === todayStr;
        return (
          <div key={dateString} className="rounded-xl border bg-card overflow-hidden shadow-xs">
            <div className="flex items-center justify-between border-b bg-muted/25 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  {formatDate(dateString)}
                </h3>
                {isToday && (
                  <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Today
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {dayAppointments.length} {dayAppointments.length === 1 ? "appointment" : "appointments"}
              </span>
            </div>

            <div className="p-4">
              <AppointmentCardsList
                appointments={dayAppointments}
                coupleById={coupleById}
                remindedIds={remindedIds}
                setRemindedIds={setRemindedIds}
                patchAppointmentStatus={patchAppointmentStatus}
                pushActivity={pushActivity}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================= */
/* 3. GROUPED BY COUPLE VIEW                                                */
/* ========================================================================= */

function GroupedByCoupleView({
  appointmentsByCouple,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
}: {
  appointmentsByCouple: Array<[string, { couple: AppCouple | undefined; appointments: AppAppointment[] }]>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
}) {
  return (
    <div className="p-4 space-y-6">
      {appointmentsByCouple.map(([coupleId, { couple, appointments }]) => {
        const label = couple ? coupleLabel(couple) : "Unassigned Couple";
        const primary = couple?.primary?.name;
        const partner = couple?.partner?.name;
        const phone = couple?.primary?.phone;

        return (
          <div key={coupleId} className="rounded-xl border bg-card overflow-hidden shadow-xs">
            {/* Couple Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b bg-muted/25 px-4 py-3 gap-2">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-xs uppercase">
                  {label.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">{label}</h3>
                    {couple?.slug && (
                      <Link
                        href={`/patients/${couple.slug}`}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Patient Profile <ExternalLink className="size-3" />
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {primary && partner ? `${primary} & ${partner}` : primary || "Registered Couple"}
                    {phone ? ` · ${phone}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                  {appointments.length} appointment{appointments.length > 1 ? "s" : ""}
                </span>
                {couple?.slug && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
                    <Link href={`/patients/${couple.slug}`}>
                      <ExternalLink className="size-3.5" /> View 360
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Couple's appointments chronologically */}
            <div className="p-4">
              <AppointmentCardsList
                appointments={appointments}
                coupleById={new Map(couple ? [[couple.id, couple]] : [])}
                remindedIds={remindedIds}
                setRemindedIds={setRemindedIds}
                patchAppointmentStatus={patchAppointmentStatus}
                pushActivity={pushActivity}
                showDate={true}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================= */
/* 4. REUSABLE APPOINTMENT CARDS LIST (Chronological & Interactive)          */
/* ========================================================================= */

function AppointmentCardsList({
  appointments,
  coupleById,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
  showDate = false,
}: {
  appointments: AppAppointment[];
  coupleById: Map<string, AppCouple>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
  showDate?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {appointments.map((appointment) => {
        const couple = coupleById.get(appointment.coupleId);
        const reminded = remindedIds.includes(appointment.id);
        const patient = couple ? coupleLabel(couple) : "Patient";
        const room = getAppointmentRoom(appointment);

        return (
          <div
            key={appointment.id}
            className="rounded-xl border bg-background p-3.5 flex flex-col justify-between space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold tabular-nums text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {appointment.time}
                  </p>
                  {showDate && appointment.date && (
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {formatDate(appointment.date)}
                    </p>
                  )}
                </div>
                <StatusBadge
                  label={appointment.status}
                  tone={appointmentTone[appointment.status] ?? "muted"}
                />
              </div>

              <div className="mt-2.5">
                {couple ? (
                  <Link
                    href={`/patients/${couple.slug}`}
                    className="font-bold text-sm text-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {patient}
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </Link>
                ) : (
                  <p className="font-semibold text-sm text-foreground">{patient}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {appointment.type} · {appointment.doctor}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                  <Building2 className="size-3 text-muted-foreground" /> {room}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              {appointment.status === "Confirmed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 shadow-none"
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
                  <CheckCircle2 className="size-3 text-emerald-600" /> Check in
                </Button>
              )}

              {(appointment.status === "Confirmed" || appointment.status === "Waiting") && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={reminded}
                  className="h-7 text-xs gap-1"
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
                  {reminded ? <Check className="size-3 text-emerald-600" /> : <Bell className="size-3" />}
                  {reminded ? "Sent" : "Remind"}
                </Button>
              )}

              {couple && (
                <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" asChild>
                  <Link href={`/patients/${couple.slug}`}>
                    <ExternalLink className="size-3 mr-1" /> Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================= */
/* 5. APPOINTMENT FULL TABLE VIEW                                            */
/* ========================================================================= */

function AppointmentTableView({
  appointments,
  coupleById,
  remindedIds,
  setRemindedIds,
  patchAppointmentStatus,
  pushActivity,
  showDateColumn = false,
}: {
  appointments: AppAppointment[];
  coupleById: Map<string, AppCouple>;
  remindedIds: string[];
  setRemindedIds: React.Dispatch<React.SetStateAction<string[]>>;
  patchAppointmentStatus: (id: string, status: AppAppointment["status"]) => Promise<void>;
  pushActivity: (a: { patient: string; activity: string; time: string; tone: "success" | "info" | "warning" | "danger" }) => void;
  showDateColumn?: boolean;
}) {
  return (
    <div>
      <MobileCards>
        {appointments.map((appointment) => {
          const couple = coupleById.get(appointment.coupleId);
          const reminded = remindedIds.includes(appointment.id);
          const patient = couple ? coupleLabel(couple) : "Patient";
          const room = getAppointmentRoom(appointment);

          return (
            <RecordCard key={appointment.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold tabular-nums">{appointment.time}</p>
                  {showDateColumn && appointment.date && (
                    <p className="text-xs text-muted-foreground">{formatDate(appointment.date)}</p>
                  )}
                </div>
                <StatusBadge
                  label={appointment.status}
                  tone={appointmentTone[appointment.status] ?? "muted"}
                />
              </div>
              <p className="mt-2 font-semibold">{patient}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {appointment.type} · {appointment.doctor}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Room: {room}</p>
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
                    <CheckCircle2 className="size-3.5" /> Check in
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
                    {reminded ? <Check className="size-3.5" /> : <Bell className="size-3.5" />}
                    {reminded ? "Sent" : "Remind"}
                  </Button>
                )}
                {couple && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/patients/${couple.slug}`}>
                      <ExternalLink className="size-3.5" /> Open
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
              {showDateColumn && <th className="px-4 py-2.5 font-medium">Date</th>}
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
            {appointments.map((appointment) => {
              const couple = coupleById.get(appointment.coupleId);
              const reminded = remindedIds.includes(appointment.id);
              const patient = couple ? coupleLabel(couple) : "Patient";
              const room = getAppointmentRoom(appointment);

              return (
                <tr
                  key={appointment.id}
                  className="border-b transition-colors last:border-0 hover:bg-accent/45"
                >
                  {showDateColumn && (
                    <td className="px-4 py-2.5 font-medium text-xs text-muted-foreground whitespace-nowrap">
                      {appointment.date ? formatDate(appointment.date) : "—"}
                    </td>
                  )}
                  <td className="px-4 py-2.5 font-bold tabular-nums text-foreground">
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
                  <td className="px-3 py-2.5 text-muted-foreground">{room}</td>
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
                          <CheckCircle2 className="size-3.5" /> Check in
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
                          {reminded ? <Check className="size-3.5" /> : <Bell className="size-3.5" />}
                          {reminded ? "Sent" : "Remind"}
                        </Button>
                      )}
                      {couple && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/patients/${couple.slug}`}>
                            <ExternalLink className="size-3.5" /> Open
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
    </div>
  );
}

/* ========================================================================= */
/* 6. DOCTOR AVAILABILITY TAB                                                */
/* ========================================================================= */

function Availability({
  selectedDate,
  doctors,
  onSelectSlot,
}: {
  selectedDate: string;
  doctors: ReturnType<typeof useDoctors>;
  onSelectSlot: () => void;
}) {
  const [editingDoctor, setEditingDoctor] = useState<{ id: string; name: string } | null>(null);
  const [dbData, setDbData] = useState<any[] | null>(null);
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    fetch(`/api/doctors/availability?date=${selectedDate}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.doctors) {
          setDbData(json.doctors);
        }
      })
      .catch(() => {});
  }, [selectedDate, fetchTick]);

  const date = new Date(`${selectedDate}T00:00:00`);
  const rows = doctors.map((doctor) => {
    const dbDoc = dbData?.find((d) => d.id === doctor.id || d.name.includes(doctor.lastName));
    const openSlots: Array<{ start: string; end: string; status: string }> = dbDoc
      ? dbDoc.openSlots.map((s: { time: string }) => ({ start: s.time, end: s.time, status: "available" }))
      : generateDaySlots(doctor, date).filter((s) => s.status === "available");

    return {
      doctor,
      slots: openSlots,
      isWorking: dbDoc ? dbDoc.isWorkingDay : openSlots.length > 0,
      bookedCount: dbDoc?.bookedCount || 0,
    };
  });

  const openCount = rows.reduce((sum, row) => sum + row.slots.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>{formatDate(selectedDate)}</span>
        <span>
          {openCount} open slots across {doctors.length} doctors
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-medium">Doctor</th>
              <th className="px-3 py-2.5 font-medium">Availability</th>
              <th className="px-3 py-2.5 font-medium">Open slots</th>
              <th className="px-4 py-2.5 font-medium text-right">Calendar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ doctor, slots, isWorking, bookedCount }) => {
              const name = displayNameOf(doctor);
              return (
                <tr key={doctor.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/doctors/${doctor.id}`} className="block font-semibold hover:text-primary">
                      {name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{doctor.designation}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge
                        label={isWorking && slots.length > 0 ? "Available" : "Unavailable"}
                        tone={isWorking && slots.length > 0 ? "success" : "muted"}
                      />
                      {bookedCount > 0 && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {bookedCount} booked today
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {slots.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {isWorking ? "All slots booked" : "Closed today"}
                        </span>
                      ) : (
                        slots.slice(0, 8).map((slot: { start: string; end: string }) => (
                          <button
                            key={`${slot.start}-${slot.end}`}
                            onClick={onSelectSlot}
                            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                            aria-label={`Book ${formatTimeLabel(slot.start)} with ${name}`}
                          >
                            <Clock className="size-3.5" /> {formatTimeLabel(slot.start)}
                          </button>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDoctor({ id: doctor.id, name })}
                      className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <CalendarDays className="size-3.5" />
                      Set Schedule
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingDoctor && (
        <DoctorAvailabilityDialog
          doctorId={editingDoctor.id}
          doctorName={editingDoctor.name}
          open={Boolean(editingDoctor)}
          onOpenChange={(open) => !open && setEditingDoctor(null)}
          onSaved={() => setFetchTick((t) => t + 1)}
        />
      )}
    </div>
  );
}

/* ========================================================================= */
/* DATE HELPERS                                                              */
/* ========================================================================= */

function shiftDate(dateValue: string, view: (typeof views)[number], direction: number): string {
  const { year, month, day } = parseYmd(dateValue);
  if (view === "Month") {
    const target = new Date(year, month + direction, 1, 12, 0, 0);
    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth();
    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(day, maxDays);
    return formatYmd(targetYear, targetMonth, targetDay);
  }
  const amount = view === "Day" ? 1 : 7;
  const target = new Date(year, month, day + amount * direction, 12, 0, 0);
  return formatYmd(target.getFullYear(), target.getMonth(), target.getDate());
}

function formatDate(dateValue: string): string {
  const { year, month, day } = parseYmd(dateValue);
  const date = new Date(year, month, day, 12, 0, 0);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isDateInView(appointmentDate: string, selectedDate: string, view: (typeof views)[number]): boolean {
  if (view === "Day") return appointmentDate === selectedDate;
  const appt = parseYmd(appointmentDate);
  const sel = parseYmd(selectedDate);
  if (view === "Month") {
    return appt.year === sel.year && appt.month === sel.month;
  }
  const selDate = new Date(sel.year, sel.month, sel.day, 12, 0, 0);
  const selDayOfWeek = selDate.getDay();
  const weekStart = new Date(sel.year, sel.month, sel.day - selDayOfWeek, 0, 0, 0);
  const weekEnd = new Date(sel.year, sel.month, sel.day - selDayOfWeek + 6, 23, 59, 59);
  const apptDate = new Date(appt.year, appt.month, appt.day, 12, 0, 0);
  return apptDate >= weekStart && apptDate <= weekEnd;
}
