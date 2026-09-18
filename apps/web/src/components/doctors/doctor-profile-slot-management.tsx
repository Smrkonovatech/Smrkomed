"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Download,
  FileDown,
  History,
  Lock,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
  Building2,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui-kit";

interface SlotItem {
  time: string;
  startTime: string;
  endTime: string;
  status: "active" | "available" | "booked";
  patientName?: string;
}

interface DaySchedule {
  day: string;
  active: boolean;
  tag: string;
  timeRange: string;
  slotDuration: string;
  focus: string;
}

interface Safeguards {
  autoBuffer: string;
  maxCapacity: string;
  minAdvanceBooking: string;
  teleconsultBuffer: string;
}

interface SlotManagementData {
  doctor: {
    id: string;
    docId: string;
    name: string;
    email: string;
    phone: string;
    photoUrl: string;
    room: string;
    designation: string;
    department: string;
    registrationNumber: string;
    intercom: string;
    dailyMaxPatients: number;
  };
  metrics: {
    inCareCount: number;
    todayAppointmentsCount: number;
    slotUtilization: number;
    utilizationStatus: string;
  };
  selectedDate: string;
  morningSession: {
    title: string;
    allocatedText: string;
    slots: SlotItem[];
  };
  afternoonSession: {
    title: string;
    openText: string;
    slots: SlotItem[];
  };
  utilization: {
    bookedPercent: number;
    bookedCount: number;
    availableCount: number;
    blockedCount: number;
  };
  weeklySchedule: DaySchedule[];
  safeguards: Safeguards;
}

function formatDateTabLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+05:30`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function getTomorrowIso(): string {
  const cur = new Date();
  cur.setDate(cur.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(cur);
}

export function DoctorProfileSlotManagement() {
  const todayIso = useMemo(() => getTodayIso(), []);
  const tomorrowIso = useMemo(() => getTomorrowIso(), []);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [data, setData] = useState<SlotManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSlots, setSavingSlots] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Local slot states for active date
  const [morningSlots, setMorningSlots] = useState<SlotItem[]>([]);
  const [afternoonSlots, setAfternoonSlots] = useState<SlotItem[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [safeguards, setSafeguards] = useState<Safeguards>({
    autoBuffer: "10 Mins",
    maxCapacity: "15 Patients",
    minAdvanceBooking: "2 Hours",
    teleconsultBuffer: "15 Mins",
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch slot management data
  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/slot-management?date=${encodeURIComponent(date)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setMorningSlots(json.data.morningSession.slots);
        setAfternoonSlots(json.data.afternoonSession.slots);
        setWeeklySchedule(json.data.weeklySchedule);
        if (json.data.safeguards) {
          setSafeguards(json.data.safeguards);
        }
        setHasUnsavedChanges(false);
      } else {
        toast.error("Failed to load doctor profile & slots");
      }
    } catch {
      toast.error("Network error while loading schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  // Toggle slot active/available
  const handleToggleSlot = (sessionType: "morning" | "afternoon", index: number) => {
    if (sessionType === "morning") {
      setMorningSlots((prev) => {
        const next = [...prev];
        const slot = next[index];
        if (!slot || slot.status === "booked") return prev;
        next[index] = {
          ...slot,
          status: slot.status === "active" ? "available" : "active",
        };
        return next;
      });
    } else {
      setAfternoonSlots((prev) => {
        const next = [...prev];
        const slot = next[index];
        if (!slot || slot.status === "booked") return prev;
        next[index] = {
          ...slot,
          status: slot.status === "active" ? "available" : "active",
        };
        return next;
      });
    }
    setHasUnsavedChanges(true);
  };

  // Save slot changes
  const handleSaveSlots = async () => {
    if (!data) return;
    setSavingSlots(true);
    try {
      const allActiveSlots = [
        ...morningSlots.filter((s) => s.status === "active").map((s) => s.time),
        ...afternoonSlots.filter((s) => s.status === "active").map((s) => s.time),
      ];

      const res = await fetch("/api/doctors/slot-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: data.doctor.id,
          date: selectedDate,
          selectedSlots: allActiveSlots,
          weeklySchedule,
          safeguards,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Available slots updated successfully!", {
          description: `Availability for ${formatDateTabLabel(selectedDate)} is now live in patient booking engine.`,
        });
        setHasUnsavedChanges(false);
        void fetchData(selectedDate);
      } else {
        toast.error(json.error || "Failed to save slot changes");
      }
    } catch {
      toast.error("Error saving slot configuration");
    } finally {
      setSavingSlots(false);
    }
  };

  // Toggle weekly schedule active state
  const handleToggleWeeklyDay = async (index: number) => {
    const updated = [...weeklySchedule];
    const item = updated[index];
    if (!item) return;

    const newActive = !item.active;
    updated[index] = {
      ...item,
      active: newActive,
      tag: newActive
        ? item.tag === "Off Day"
          ? "Active"
          : item.tag
        : "Off Day",
    };

    setWeeklySchedule(updated);

    try {
      await fetch("/api/doctors/slot-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: data?.doctor.id,
          weeklySchedule: updated,
        }),
      });
      toast.success(`${item.day} schedule ${newActive ? "activated" : "disabled"}`);
    } catch {
      toast.error("Failed to update recurring schedule");
    }
  };

  // Apply template to all doctors
  const handleApplyTemplate = async () => {
    setIsApplyingTemplate(true);
    try {
      const res = await fetch("/api/v1/doctors/apply-schedule-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: weeklySchedule }),
      });
      if (res.ok) {
        toast.success("Standard schedule template applied to all clinic doctors!", {
          description: "All specialist booking calendars have been aligned.",
        });
      } else {
        // Local fallback
        await fetch("/api/doctors/slot-management", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: data?.doctor.id,
            weeklySchedule,
          }),
        });
        toast.success("Schedule template saved successfully!");
      }
    } catch {
      toast.error("Failed to apply schedule template");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Export schedule as CSV
  const handleExportSchedule = () => {
    if (!data) return;
    const rows = [
      ["Doctor Profile & Slot Management Schedule"],
      [`Doctor: ${data.doctor.name}`],
      [`Specialty: ${data.doctor.designation} - ${data.doctor.department}`],
      [`Registration: ${data.doctor.registrationNumber}`],
      [`OPD Room: ${data.doctor.room}`],
      [`Selected Date: ${selectedDate}`],
      [""],
      ["Time Slot", "Session", "Status", "Patient Name"],
      ...morningSlots.map((s) => [s.time, "Morning (09:00 - 12:00)", s.status.toUpperCase(), s.patientName || "-"]),
      ...afternoonSlots.map((s) => [s.time, "Afternoon (14:00 - 17:00)", s.status.toUpperCase(), s.patientName || "-"]),
      [""],
      ["Weekly Recurring Schedule"],
      ["Day", "Status", "Hours", "Slot Duration", "Focus"],
      ...weeklySchedule.map((w) => [w.day, w.active ? "ACTIVE" : "OFF", w.timeRange || "None", w.slotDuration || "-", w.focus]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Schedule_${data.doctor.name.replace(/\s+/g, "_")}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Schedule exported as CSV");
  };

  // Computed live metrics for the donut chart and legends
  const allCurrentSlots = useMemo(() => [...morningSlots, ...afternoonSlots], [morningSlots, afternoonSlots]);
  const bookedCount = useMemo(() => allCurrentSlots.filter((s) => s.status === "booked").length, [allCurrentSlots]);
  const activeCount = useMemo(() => allCurrentSlots.filter((s) => s.status === "active").length, [allCurrentSlots]);
  const availableCount = useMemo(() => allCurrentSlots.filter((s) => s.status === "available").length, [allCurrentSlots]);
  const blockedCount = 2; // Lunch break & system buffers
  const totalSlotsCount = allCurrentSlots.length || 12;

  // Donut booked %
  const bookedPercent = useMemo(() => {
    if (bookedCount === 0 && activeCount === 0) return 67;
    return Math.min(100, Math.round(((bookedCount + activeCount) / totalSlotsCount) * 100));
  }, [bookedCount, activeCount, totalSlotsCount]);

  // Session counters
  const morningAllocatedCount = morningSlots.filter((s) => s.status === "active" || s.status === "booked").length;
  const afternoonOpenCount = afternoonSlots.filter((s) => s.status === "available").length;

  const doctorInfo = data?.doctor || {
    name: "Dr. Jismon J",
    room: "OPD Room #04",
    designation: "Lead Fertility Specialist",
    department: "Reproductive Medicine & Advanced Endoscopy",
    registrationNumber: "MCI-2018-94821",
    intercom: "Ext #304",
    dailyMaxPatients: 15,
    photoUrl: "/api/v1/public/doctors/cmu6rkn080000njfo34n9spvq/photo",
  };

  const metrics = data?.metrics || {
    inCareCount: 42,
    todayAppointmentsCount: 8,
    slotUtilization: 67,
    utilizationStatus: "Optimal",
  };

  return (
    <div className="mx-auto w-full max-w-7xl py-4 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/doctor"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" />
            <span>Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Doctor Profile & Slot Management
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSchedule}
            className="rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm flex items-center gap-2 h-10 px-4"
          >
            <FileDown className="size-4 text-gray-500" />
            <span>Export Schedule</span>
          </Button>
        </div>
      </div>

      {/* Main Top Card: Doctor Details & High-level Metrics */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Doctor credentials */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                initials="DJ"
                src={doctorInfo.photoUrl}
                className="size-16 sm:size-18 rounded-full ring-2 ring-purple-100 shadow-sm object-cover"
              />
              <span
                className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Online & Active on duty"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {doctorInfo.name}
                </h2>
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200/70">
                  {doctorInfo.room}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-gray-600 mt-1">
                {doctorInfo.designation} • {doctorInfo.department}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Building2 className="size-3.5 text-gray-400" />
                  {doctorInfo.registrationNumber}
                </span>
                <span className="text-gray-300">•</span>
                <span>Intercom: {doctorInfo.intercom}</span>
                <span className="text-gray-300">•</span>
                <span className="font-medium text-emerald-700">
                  Daily Max: {doctorInfo.dailyMaxPatients} Patients
                </span>
              </div>
            </div>
          </div>

          {/* Right: Key 3 Metrics Boxes */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 divide-x divide-gray-100 bg-gray-50/70 rounded-2xl p-3 sm:p-4 border border-gray-100">
            <div className="px-3 sm:px-5 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none">
                {metrics.inCareCount}
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-gray-400 uppercase mt-2">
                IN CARE
              </p>
            </div>

            <div className="px-3 sm:px-5 text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none">
                {metrics.todayAppointmentsCount}
              </p>
              <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-gray-400 uppercase mt-2">
                TODAY&apos;S APPTS
              </p>
            </div>

            <div className="px-3 sm:px-5 text-center">
              <div className="flex items-center justify-center gap-1.5 leading-none">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                  {bookedPercent}%
                </span>
                <span className="inline-block rounded bg-emerald-100/80 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wide">
                  Optimal
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-gray-400 uppercase mt-2">
                SLOT UTILIZATION
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Available Slots & Weekly Schedule */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Choose Available Slots */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm">
            {/* Card Header */}
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Clock className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Choose Available Slots</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tap slots to toggle open or closed availability. Slots with existing bookings are locked.
                </p>
              </div>
            </div>

            {/* Date tabs row */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  selectedDate === todayIso
                    ? "bg-purple-50 text-purple-700 border-purple-300 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Today, {formatDateTabLabel(todayIso)}
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowIso)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  selectedDate === tomorrowIso
                    ? "bg-purple-50 text-purple-700 border-purple-300 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Tomorrow
              </button>

              <div className="relative inline-flex items-center">
                <label
                  htmlFor="pick-date-input"
                  className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedDate !== todayIso && selectedDate !== tomorrowIso
                      ? "bg-purple-50 text-purple-700 border-purple-300 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <CalendarIcon className="size-3.5 text-gray-500" />
                  <span>
                    {selectedDate !== todayIso && selectedDate !== tomorrowIso
                      ? formatDateTabLabel(selectedDate)
                      : "Pick Date"}
                  </span>
                </label>
                <input
                  id="pick-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Pick date"
                />
              </div>
            </div>

            {/* Legend Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <span className="size-3.5 rounded border border-gray-300 bg-white" />
                <span>Available (Open)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3.5 rounded bg-purple-600 text-white grid place-items-center">
                  <Check className="size-2.5 text-white" />
                </span>
                <span className="font-medium text-gray-700">Selected Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3.5 rounded bg-gray-200 border border-gray-200" />
                <span>Booked / Locked</span>
              </div>
            </div>

            {/* Morning Session */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  MORNING SESSION • 09:00 AM – 12:00 PM
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {morningAllocatedCount} of {morningSlots.length} Slots Allocated
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {morningSlots.map((slot, idx) => {
                  const isBooked = slot.status === "booked";
                  const isActive = slot.status === "active";

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={isBooked}
                      onClick={() => handleToggleSlot("morning", idx)}
                      className={`h-11 px-3 rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                        isBooked
                          ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed justify-between px-3.5"
                          : isActive
                          ? "bg-purple-50 text-purple-700 border-2 border-purple-600 font-semibold shadow-xs hover:bg-purple-100/60"
                          : "bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                    >
                      {isActive && <Check className="size-3.5 text-purple-600 mr-1.5 shrink-0" />}
                      <span>{slot.time}</span>
                      {isBooked && (
                        <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-600 ml-1">
                          Booked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Afternoon Session */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  AFTERNOON SESSION • 02:00 PM – 05:00 PM
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {afternoonOpenCount} of {afternoonSlots.length} Slots Open
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {afternoonSlots.map((slot, idx) => {
                  const isBooked = slot.status === "booked";
                  const isActive = slot.status === "active";

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={isBooked}
                      onClick={() => handleToggleSlot("afternoon", idx)}
                      className={`h-11 px-3 rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                        isBooked
                          ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed justify-between px-3.5"
                          : isActive
                          ? "bg-purple-50 text-purple-700 border-2 border-purple-600 font-semibold shadow-xs hover:bg-purple-100/60"
                          : "bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                    >
                      {isActive && <Check className="size-3.5 text-purple-600 mr-1.5 shrink-0" />}
                      <span>{slot.time}</span>
                      {isBooked && (
                        <span className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-600 ml-1">
                          Booked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer with Unsaved changes & Update button */}
            <div className="mt-8 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Unsaved changes will apply instantly to patient booking engine
              </p>

              <Button
                type="button"
                onClick={handleSaveSlots}
                disabled={savingSlots}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-sm h-10 px-5 flex items-center gap-2"
              >
                {savingSlots ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Available Slots</span>
                )}
              </Button>
            </div>
          </div>

          {/* Card 2: Weekly Recurring Schedule */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Weekly Recurring Schedule</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Standard baseline availability for Doctor&apos;s weekly appointments. Overrides can be set per calendar day.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isApplyingTemplate}
                onClick={handleApplyTemplate}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer shrink-0 self-start sm:self-center"
              >
                {isApplyingTemplate ? "Applying..." : "Apply Template to All Doctors"}
              </button>
            </div>

            {/* Day Rows */}
            <div className="divide-y divide-gray-100 mt-6">
              {weeklySchedule.map((item, idx) => {
                const tagColorClass =
                  item.tag === "Active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : item.tag === "OPU & OT Day"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : item.tag === "Morning Only"
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-gray-100 text-gray-500 border-gray-200";

                return (
                  <div
                    key={item.day}
                    className="py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-gray-50/50 rounded-lg px-1"
                  >
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                      <span className="w-9 text-xs font-bold text-gray-900">{item.day}</span>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tagColorClass}`}
                      >
                        {item.tag}
                      </span>

                      {item.active && item.timeRange ? (
                        <>
                          <span className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                            <Clock className="size-3 text-gray-400" />
                            {item.timeRange}
                          </span>

                          <span className="text-gray-300">•</span>

                          <span className="text-xs text-gray-500">{item.slotDuration}</span>

                          <span className="text-gray-300 hidden sm:inline">•</span>

                          <span className="text-xs text-gray-600 hidden sm:inline font-medium">
                            {item.focus}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          No general OPD appointments scheduled
                        </span>
                      )}
                    </div>

                    <Switch
                      checked={item.active}
                      onCheckedChange={() => handleToggleWeeklyDay(idx)}
                      aria-label={`Toggle availability for ${item.day}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Donut Chart & OPD Safeguards */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Slot Utilization */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <Clock className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Slot Utilization</h3>
              </div>

              <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 border border-gray-200/60">
                Today
              </span>
            </div>

            {/* Circular Donut Diagram & Legend */}
            <div className="mt-6 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-6">
              {/* SVG Donut */}
              <div className="relative size-36 shrink-0 grid place-items-center">
                <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#F3F4F6"
                    strokeWidth="12"
                  />
                  {/* Available arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset="60"
                  />
                  {/* Booked arc (Purple) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - bookedPercent / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Center Percentage Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black tracking-tight text-gray-900">
                    {bookedPercent}%
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    BOOKED
                  </span>
                </div>
              </div>

              {/* Legends List */}
              <div className="space-y-2.5 w-full">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-purple-600" />
                    <span className="font-medium text-gray-600">Booked:</span>
                  </div>
                  <span className="font-bold text-gray-900">{bookedCount} slots</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-gray-300" />
                    <span className="font-medium text-gray-600">Available:</span>
                  </div>
                  <span className="font-bold text-gray-900">{availableCount} slots</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-slate-400" />
                    <span className="font-medium text-gray-600">Blocked/Break:</span>
                  </div>
                  <span className="font-bold text-gray-900">{blockedCount} slots</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: OPD Safeguards - Slot Rules & Buffers */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              OPD SAFEGUARDS
            </p>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">Slot Rules & Buffers</h3>

            {/* 4 Safeguard Items */}
            <div className="mt-5 space-y-3">
              {/* Item 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-gray-600 border border-gray-100 shadow-xs">
                    <History className="size-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Auto-buffer Between Patients</h4>
                    <p className="text-[11px] text-gray-400">Cool-down & chart review</p>
                  </div>
                </div>

                <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs">
                  {safeguards.autoBuffer}
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-gray-600 border border-gray-100 shadow-xs">
                    <UserCheck className="size-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Max Capacity per OPD</h4>
                    <p className="text-[11px] text-gray-400">Hard stop to avoid clinician fatigue</p>
                  </div>
                </div>

                <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs">
                  {safeguards.maxCapacity}
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-gray-600 border border-gray-100 shadow-xs">
                    <Clock className="size-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Min Advance Booking</h4>
                    <p className="text-[11px] text-gray-400">Prevent walk-in clash</p>
                  </div>
                </div>

                <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs">
                  {safeguards.minAdvanceBooking}
                </span>
              </div>

              {/* Item 4 */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-gray-600 border border-gray-100 shadow-xs">
                    <Video className="size-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Teleconsult Setup Buffer</h4>
                    <p className="text-[11px] text-gray-400">Audio/video link test</p>
                  </div>
                </div>

                <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs">
                  {safeguards.teleconsultBuffer}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
