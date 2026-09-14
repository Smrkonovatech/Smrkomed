"use client";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AppointmentSettingsForm,
  AvailabilityWeekEditor,
} from "@/components/doctors/availability-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dayHasAvailability,
  doctorsStore,
  formatTimeLabel,
  generateDaySlots,
  isBlocked,
  isOnLeave,
  toIsoDate,
  type DoctorProfile,
  WEEKDAY_LABELS,
  weekdayFromDate,
} from "@/lib/doctors";
import { cn } from "@/lib/utils";

type CalView = "day" | "week" | "month";

export function DoctorAvailabilityPanel({ doctor }: { doctor: DoctorProfile }) {
  const [view, setView] = useState<CalView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toIsoDate(new Date()));
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockReason, setBlockReason] = useState("");

  const selectedDate = useMemo(() => new Date(`${selected}T00:00:00`), [selected]);
  const daySlots = useMemo(() => generateDaySlots(doctor, selectedDate), [doctor, selectedDate]);

  function shift(dir: number) {
    const next = new Date(anchor);
    if (view === "day") next.setDate(next.getDate() + dir);
    else if (view === "week") next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir);
    setAnchor(next);
    if (view === "day") setSelected(toIsoDate(next));
  }

  function addBlock() {
    if (!blockDate || !blockReason.trim()) {
      toast.error("Date and reason are required.");
      return;
    }
    if (blockEnd <= blockStart) {
      toast.error("End time must be after start time.");
      return;
    }
    doctorsStore.addBlock(doctor.id, {
      date: blockDate,
      startTime: blockStart,
      endTime: blockEnd,
      reason: blockReason.trim(),
    });
    toast.success("Time blocked.");
    setBlockReason("");
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Weekly schedule</h3>
            <p className="text-sm text-muted-foreground">Regular clinic hours for this doctor.</p>
          </div>
        </div>
        <AvailabilityWeekEditor
          schedule={doctor.weeklySchedule}
          onChange={(weeklySchedule) => {
            doctorsStore.updateSchedule(doctor.id, weeklySchedule);
            toast.success("Availability updated.");
          }}
        />
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Appointment settings</h3>
        <AppointmentSettingsForm
          settings={doctor.appointmentSettings}
          onChange={(appointmentSettings) => {
            doctorsStore.upsert(
              { ...doctor, appointmentSettings },
              { kind: "availability_updated", message: "Appointment settings updated" },
            );
            toast.success("Appointment settings saved.");
          }}
        />
      </div>

      <div className="rounded-xl border p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">Availability calendar</h3>
            <p className="text-sm text-muted-foreground">
              Green available · Blue booked context · Orange blocked · Red leave
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border p-0.5">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize",
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => shift(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => shift(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {view === "month" && (
          <MonthGrid
            anchor={anchor}
            doctor={doctor}
            selected={selected}
            onSelect={setSelected}
          />
        )}
        {view === "week" && (
          <WeekGrid
            anchor={anchor}
            doctor={doctor}
            selected={selected}
            onSelect={setSelected}
          />
        )}
        {view === "day" && (
          <DayDetail doctor={doctor} date={selectedDate} slots={daySlots} />
        )}

        {view !== "day" && (
          <div className="mt-4 border-t pt-4">
            <DayDetail doctor={doctor} date={selectedDate} slots={daySlots} />
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">Leave & exceptions</h3>
          {doctor.leaves.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No leave recorded.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {doctor.leaves.map((leave) => (
                <li
                  key={leave.id}
                  className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {leave.date}
                      {leave.endDate ? ` → ${leave.endDate}` : ""}
                      {leave.fullDay ? " · Full day" : ` · ${leave.startTime}–${leave.endTime}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {leave.reason}
                      {leave.notes ? ` — ${leave.notes}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => {
                      doctorsStore.removeLeave(doctor.id, leave.id);
                      toast.success("Leave removed.");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">Block time</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" className="mt-1" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Input className="mt-1" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Start</Label>
              <Input type="time" className="mt-1" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input type="time" className="mt-1" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
            </div>
          </div>
          <Button type="button" className="mt-3" size="sm" onClick={addBlock}>
            <Plus className="size-3.5" /> Block Time
          </Button>
          {doctor.blockedTimes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {doctor.blockedTimes.map((block) => (
                <li
                  key={block.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    {block.date} · {formatTimeLabel(block.startTime)}–{formatTimeLabel(block.endTime)} ·{" "}
                    {block.reason}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => {
                      doctorsStore.removeBlock(doctor.id, block.id);
                      toast.success("Block removed.");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DayDetail({
  doctor,
  date,
  slots,
}: {
  doctor: DoctorProfile;
  date: Date;
  slots: ReturnType<typeof generateDaySlots>;
}) {
  const iso = toIsoDate(date);
  const day = weekdayFromDate(date);
  const label = date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">
        {WEEKDAY_LABELS[day]} ·{" "}
        {doctor.weeklySchedule[day].enabled
          ? `${doctor.weeklySchedule[day].slots.length} window(s)`
          : "Unavailable in weekly schedule"}
      </p>
      {isOnLeave(doctor, iso) && (
        <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">Leave / unavailable</p>
      )}
      {isBlocked(doctor, iso) && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Blocked time exists</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No slots generated for this day.</p>
        ) : (
          slots.map((slot) => (
            <span
              key={`${slot.start}-${slot.end}`}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                slot.status === "available" && "border-success/30 bg-success-soft text-success",
                slot.status === "leave" && "border-danger/30 bg-danger-soft text-danger",
                slot.status === "blocked" && "border-amber-300 bg-amber-50 text-amber-800",
              )}
            >
              {formatTimeLabel(slot.start)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  doctor,
  selected,
  onSelect,
}: {
  anchor: Date;
  doctor: DoctorProfile;
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        {anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const iso = toIsoDate(date);
          const available = dayHasAvailability(doctor, date);
          const leave = isOnLeave(doctor, iso);
          const blocked = isBlocked(doctor, iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "rounded-lg py-2 text-xs font-medium",
                selected === iso && "ring-2 ring-primary",
                leave && "bg-danger-soft text-danger",
                !leave && blocked && "bg-amber-50 text-amber-800",
                !leave && !blocked && available && "bg-success-soft text-success",
                !leave && !blocked && !available && "bg-muted/40 text-muted-foreground",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  anchor,
  doctor,
  selected,
  onSelect,
}: {
  anchor: Date;
  doctor: DoctorProfile;
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map((date) => {
        const iso = toIsoDate(date);
        const slots = generateDaySlots(doctor, date);
        const available = slots.filter((s) => s.status === "available").length;
        const leave = isOnLeave(doctor, iso);
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(iso)}
            className={cn(
              "rounded-xl border p-2 text-left",
              selected === iso && "border-primary bg-primary-soft/40",
            )}
          >
            <p className="text-[11px] font-medium text-muted-foreground">
              {date.toLocaleDateString("en-IN", { weekday: "short" })}
            </p>
            <p className="text-sm font-semibold">{date.getDate()}</p>
            <p
              className={cn(
                "mt-1 text-[10px]",
                leave ? "text-danger" : available ? "text-success" : "text-muted-foreground",
              )}
            >
              {leave ? "Leave" : available ? `${available} open` : "Closed"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
