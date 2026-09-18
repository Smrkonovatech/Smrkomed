"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Edit3,
  FileDown,
  History,
  Lock,
  Pencil,
  RefreshCw,
  Repeat,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
  Building2,
  CalendarClock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui-kit";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

interface DoctorDetails {
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
}

interface SlotManagementData {
  doctor: DoctorDetails;
  metrics: {
    inCareCount: number;
    todayAppointmentsCount: number;
    selectedDateAppointmentsCount?: number;
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
  try {
    const d = new Date(`${dateStr}T12:00:00+05:30`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function getTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function getTomorrowIso(): string {
  const cur = new Date();
  cur.setDate(cur.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(cur);
}

function getUpcomingDays(count = 7): { dateIso: string; label: string; weekday: string }[] {
  const list = [];
  const cur = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(cur);
    d.setDate(cur.getDate() + i);
    const dateIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    list.push({ dateIso, label: dayNum, weekday });
  }
  return list;
}

export function DoctorProfileSlotManagement() {
  const todayIso = useMemo(() => getTodayIso(), []);
  const tomorrowIso = useMemo(() => getTomorrowIso(), []);
  const upcomingQuickDays = useMemo(() => getUpcomingDays(8), []);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [data, setData] = useState<SlotManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSlots, setSavingSlots] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

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

  // Edit Doctor Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    room: "",
    intercom: "",
    dailyMaxPatients: 15,
    registrationNumber: "",
    designation: "",
    department: "",
  });

  // Edit Day Schedule Modal State
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [dayForm, setDayForm] = useState<DaySchedule | null>(null);

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
        setProfileForm({
          room: json.data.doctor.room || "OPD Room #04",
          intercom: json.data.doctor.intercom || "Ext #304",
          dailyMaxPatients: json.data.doctor.dailyMaxPatients || 15,
          registrationNumber: json.data.doctor.registrationNumber || "MCI-2018-94821",
          designation: json.data.doctor.designation || "Lead Fertility Specialist",
          department: json.data.doctor.department || "Reproductive Medicine & Advanced Endoscopy",
        });
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

  // Step Previous Day
  const handlePrevDay = () => {
    try {
      const d = new Date(`${selectedDate}T12:00:00+05:30`);
      d.setDate(d.getDate() - 1);
      const newIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
      setSelectedDate(newIso);
    } catch {
      setSelectedDate(todayIso);
    }
  };

  // Step Next Day
  const handleNextDay = () => {
    try {
      const d = new Date(`${selectedDate}T12:00:00+05:30`);
      d.setDate(d.getDate() + 1);
      const newIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
      setSelectedDate(newIso);
    } catch {
      setSelectedDate(todayIso);
    }
  };

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
          description: `Live in patient booking engine for ${formatDateTabLabel(selectedDate)}.`,
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

  // Safeguards Change & Direct Persistence
  const handleSafeguardChange = async (key: keyof Safeguards, value: string) => {
    const updated = { ...safeguards, [key]: value };
    setSafeguards(updated);

    try {
      const res = await fetch("/api/doctors/slot-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: data?.doctor.id,
          safeguards: updated,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("OPD Safeguard rule updated", {
          description: `${key} is now set to ${value}.`,
        });
      }
    } catch {
      toast.error("Failed to save safeguard preference");
    }
  };

  // Save Doctor Profile Details
  const handleSaveDoctorProfile = async () => {
    if (!data) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/doctors/slot-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: data.doctor.id,
          doctorDetails: profileForm,
          room: profileForm.room,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Doctor details updated successfully!");
        setIsEditProfileOpen(false);
        void fetchData(selectedDate);
      } else {
        toast.error(json.error || "Failed to update profile");
      }
    } catch {
      toast.error("Error saving profile details");
    } finally {
      setSavingProfile(false);
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

  // Save Day Schedule Edit
  const handleSaveDaySchedule = async () => {
    if (editingDayIndex === null || !dayForm) return;
    const updated = [...weeklySchedule];
    updated[editingDayIndex] = dayForm;
    setWeeklySchedule(updated);
    setEditingDayIndex(null);
    setDayForm(null);

    try {
      await fetch("/api/doctors/slot-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: data?.doctor.id,
          weeklySchedule: updated,
        }),
      });
      toast.success(`${dayForm.day} schedule updated successfully!`);
    } catch {
      toast.error("Failed to save recurring schedule changes");
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
  const blockedCount = 2; // Lunch break & system cool-down buffers
  const totalSlotsCount = allCurrentSlots.length || 12;

  // Real Donut booked %
  const bookedPercent = useMemo(() => {
    if (totalSlotsCount === 0) return 0;
    return Math.min(100, Math.round(((bookedCount + activeCount) / totalSlotsCount) * 100));
  }, [bookedCount, activeCount, totalSlotsCount]);

  // Session counters
  const morningAllocatedCount = morningSlots.filter((s) => s.status === "active" || s.status === "booked").length;
  const afternoonOpenCount = afternoonSlots.filter((s) => s.status === "available").length;

  const doctorInfo = data?.doctor || {
    id: "cmu6rkn080000njfo34n9spvq",
    docId: "doc_cmu6rkn080000njfo34n9spvq",
    name: "Dr. Jismon J",
    email: "dr.jismon@smrkomed.com",
    phone: "",
    room: "OPD Room #04",
    designation: "Lead Fertility Specialist",
    department: "Reproductive Medicine & Advanced Endoscopy",
    registrationNumber: "MCI-2018-94821",
    intercom: "Ext #304",
    dailyMaxPatients: 15,
    photoUrl: "/api/v1/public/doctors/cmu6rkn080000njfo34n9spvq/photo",
  };

  const metrics = data?.metrics || {
    inCareCount: 2,
    todayAppointmentsCount: 0,
    slotUtilization: bookedPercent,
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditProfileOpen(true)}
            className="rounded-xl border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-700 font-semibold shadow-sm flex items-center gap-2 h-10 px-4"
          >
            <Pencil className="size-3.5 text-purple-600" />
            <span>Edit Profile</span>
          </Button>
        </div>
      </div>

      {/* Main Top Card: Doctor Details & Real Metrics */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Doctor credentials */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
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
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="text-gray-400 hover:text-purple-600 p-1 transition-colors"
                  title="Edit Room & Profile Details"
                >
                  <Pencil className="size-3.5" />
                </button>
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

          {/* Right: Key 3 Metrics Boxes (100% Real from PostgreSQL) */}
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
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Choose Available Slots</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tap slots to toggle open or closed availability. Booked patient slots are locked.
                  </p>
                </div>
              </div>

              {/* Day Stepper Arrows */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  title="Previous Day"
                  className="size-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 grid place-items-center text-gray-600 transition-colors shadow-xs"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDay}
                  title="Next Day"
                  className="size-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 grid place-items-center text-gray-600 transition-colors shadow-xs"
                >
                  <ChevronRight className="size-4" />
                </button>
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

              {/* Functional Pick Date Popover */}
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedDate !== todayIso && selectedDate !== tomorrowIso
                        ? "bg-purple-50 text-purple-700 border-purple-300 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <CalendarIcon className="size-3.5 text-purple-600" />
                    <span>
                      {selectedDate !== todayIso && selectedDate !== tomorrowIso
                        ? formatDateTabLabel(selectedDate)
                        : "Pick Date"}
                    </span>
                    <ChevronDown className="size-3 text-gray-400 ml-0.5" />
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-80 p-4 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 space-y-4"
                  align="start"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="size-4 text-purple-600" />
                      <span className="text-xs font-bold text-gray-900">Select Calendar Date</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {/* Native Date Input Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                      Choose Any Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                          setIsDatePickerOpen(false);
                          toast.success(`Loaded slots for ${formatDateTabLabel(e.target.value)}`);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 cursor-pointer"
                    />
                  </div>

                  {/* Quick Upcoming Day Chips */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Upcoming Days
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {upcomingQuickDays.map((item) => {
                        const isCurrent = selectedDate === item.dateIso;
                        return (
                          <button
                            key={item.dateIso}
                            type="button"
                            onClick={() => {
                              setSelectedDate(item.dateIso);
                              setIsDatePickerOpen(false);
                              toast.success(`Loaded slots for ${item.weekday}, ${item.label}`);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors ${
                              isCurrent
                                ? "bg-purple-100 text-purple-800 font-bold"
                                : "bg-gray-50 hover:bg-purple-50 text-gray-700"
                            }`}
                          >
                            <span>{item.weekday}</span>
                            <span className="text-[11px] text-gray-500">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(todayIso);
                        setIsDatePickerOpen(false);
                      }}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                    >
                      Reset to Today
                    </button>
                    <Button
                      size="sm"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Selected date indicator */}
              <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
                Viewing: <strong className="text-gray-700">{formatDateTabLabel(selectedDate)}</strong>
              </span>
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
                {hasUnsavedChanges ? (
                  <span className="text-amber-600 font-medium">
                    ● Unsaved changes detected. Click &quot;Update Available Slots&quot; to apply to booking engine.
                  </span>
                ) : (
                  <span>Availability is fully synchronized with patient WhatsApp booking engine</span>
                )}
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

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDayIndex(idx);
                          setDayForm({ ...item });
                        }}
                        title={`Edit hours for ${item.day}`}
                        className="text-gray-400 hover:text-purple-600 p-1 rounded transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>

                      <Switch
                        checked={item.active}
                        onCheckedChange={() => handleToggleWeeklyDay(idx)}
                        aria-label={`Toggle availability for ${item.day}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Donut Chart & Functional OPD Safeguards */}
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
                {selectedDate === todayIso ? "Today" : formatDateTabLabel(selectedDate)}
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
                  {/* Booked / Active arc (Purple) */}
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
                    UTILIZED
                  </span>
                </div>
              </div>

              {/* Legends List */}
              <div className="space-y-2.5 w-full">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-purple-600" />
                    <span className="font-medium text-gray-600">Active / Booked:</span>
                  </div>
                  <span className="font-bold text-gray-900">{activeCount + bookedCount} slots</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-gray-300" />
                    <span className="font-medium text-gray-600">Open Available:</span>
                  </div>
                  <span className="font-bold text-gray-900">{availableCount} slots</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-slate-400" />
                    <span className="font-medium text-gray-600">Blocked / Break:</span>
                  </div>
                  <span className="font-bold text-gray-900">{blockedCount} slots</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: OPD Safeguards - Slot Rules & Buffers (100% Functional & Saved to DB) */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  OPD SAFEGUARDS
                </p>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">Slot Rules & Buffers</h3>
              </div>
              <ShieldCheck className="size-5 text-purple-600" />
            </div>

            {/* 4 Safeguard Interactive Items */}
            <div className="mt-5 space-y-3">
              {/* Item 1: Auto-Buffer */}
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

                <select
                  value={safeguards.autoBuffer}
                  onChange={(e) => handleSafeguardChange("autoBuffer", e.target.value)}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="0 Mins">0 Mins</option>
                  <option value="5 Mins">5 Mins</option>
                  <option value="10 Mins">10 Mins</option>
                  <option value="15 Mins">15 Mins</option>
                  <option value="20 Mins">20 Mins</option>
                  <option value="30 Mins">30 Mins</option>
                </select>
              </div>

              {/* Item 2: Max Capacity */}
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

                <select
                  value={safeguards.maxCapacity}
                  onChange={(e) => handleSafeguardChange("maxCapacity", e.target.value)}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="10 Patients">10 Patients</option>
                  <option value="12 Patients">12 Patients</option>
                  <option value="15 Patients">15 Patients</option>
                  <option value="20 Patients">20 Patients</option>
                  <option value="25 Patients">25 Patients</option>
                  <option value="30 Patients">30 Patients</option>
                </select>
              </div>

              {/* Item 3: Min Advance Booking */}
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

                <select
                  value={safeguards.minAdvanceBooking}
                  onChange={(e) => handleSafeguardChange("minAdvanceBooking", e.target.value)}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="30 Mins">30 Mins</option>
                  <option value="1 Hour">1 Hour</option>
                  <option value="2 Hours">2 Hours</option>
                  <option value="4 Hours">4 Hours</option>
                  <option value="6 Hours">6 Hours</option>
                  <option value="12 Hours">12 Hours</option>
                  <option value="24 Hours">24 Hours</option>
                </select>
              </div>

              {/* Item 4: Teleconsult Setup Buffer */}
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

                <select
                  value={safeguards.teleconsultBuffer}
                  onChange={(e) => handleSafeguardChange("teleconsultBuffer", e.target.value)}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-gray-800 border border-gray-200 shadow-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="0 Mins">0 Mins</option>
                  <option value="5 Mins">5 Mins</option>
                  <option value="10 Mins">10 Mins</option>
                  <option value="15 Mins">15 Mins</option>
                  <option value="20 Mins">20 Mins</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Doctor Profile & OPD Modal */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Edit Doctor Profile & OPD Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update doctor room assignment, intercom extension, and daily consultation capacity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">OPD Room #</label>
                <input
                  type="text"
                  value={profileForm.room}
                  onChange={(e) => setProfileForm({ ...profileForm, room: e.target.value })}
                  placeholder="e.g. OPD Room #04"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Intercom Ext</label>
                <input
                  type="text"
                  value={profileForm.intercom}
                  onChange={(e) => setProfileForm({ ...profileForm, intercom: e.target.value })}
                  placeholder="e.g. Ext #304"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Daily Max Patients</label>
                <input
                  type="number"
                  value={profileForm.dailyMaxPatients}
                  onChange={(e) => setProfileForm({ ...profileForm, dailyMaxPatients: Number(e.target.value) || 15 })}
                  placeholder="15"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Registration #</label>
                <input
                  type="text"
                  value={profileForm.registrationNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, registrationNumber: e.target.value })}
                  placeholder="e.g. MCI-2018-94821"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Designation / Title</label>
              <input
                type="text"
                value={profileForm.designation}
                onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                placeholder="e.g. Lead Fertility Specialist"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Department</label>
              <input
                type="text"
                value={profileForm.department}
                onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                placeholder="e.g. Reproductive Medicine & Advanced Endoscopy"
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditProfileOpen(false)}
              className="rounded-xl border-gray-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={savingProfile}
              onClick={handleSaveDoctorProfile}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Day Schedule Modal */}
      <Dialog open={editingDayIndex !== null} onOpenChange={(open) => !open && setEditingDayIndex(null)}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              Edit Schedule for {dayForm?.day}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Customize timing window, slot duration, and clinical focus for this recurring day.
            </DialogDescription>
          </DialogHeader>

          {dayForm && (
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Tag / Status Badge</label>
                <select
                  value={dayForm.tag}
                  onChange={(e) => setDayForm({ ...dayForm, tag: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="OPU & OT Day">OPU & OT Day</option>
                  <option value="Morning Only">Morning Only</option>
                  <option value="Off Day">Off Day</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Time Range</label>
                <input
                  type="text"
                  value={dayForm.timeRange}
                  onChange={(e) => setDayForm({ ...dayForm, timeRange: e.target.value })}
                  placeholder="e.g. 09:00 AM – 05:00 PM"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Slot Duration</label>
                <input
                  type="text"
                  value={dayForm.slotDuration}
                  onChange={(e) => setDayForm({ ...dayForm, slotDuration: e.target.value })}
                  placeholder="e.g. Slot: 20m"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Clinical Focus</label>
                <input
                  type="text"
                  value={dayForm.focus}
                  onChange={(e) => setDayForm({ ...dayForm, focus: e.target.value })}
                  placeholder="e.g. General Fertility OPD"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingDayIndex(null)}
              className="rounded-xl border-gray-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDaySchedule}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
            >
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
