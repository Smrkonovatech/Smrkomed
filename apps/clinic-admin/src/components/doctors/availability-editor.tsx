"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  copyDaySchedule,
  formatTimeLabel,
  newId,
  type AppointmentSettings,
  type DoctorProfile,
  type TimeSlot,
  type Weekday,
  type WeeklySchedule,
} from "@/lib/doctors";
import { cn } from "@/lib/utils";

export function AvailabilityWeekEditor({
  schedule,
  onChange,
  errors = {},
}: {
  schedule: WeeklySchedule;
  onChange: (next: WeeklySchedule) => void;
  errors?: Record<string, string>;
}) {
  const [copyFrom, setCopyFrom] = useState<Weekday>("monday");
  const [copyTargets, setCopyTargets] = useState<Weekday[]>([]);

  function updateDay(day: Weekday, patch: Partial<WeeklySchedule[Weekday]>) {
    onChange({
      ...schedule,
      [day]: { ...schedule[day], ...patch },
    });
  }

  function updateSlot(day: Weekday, slotId: string, patch: Partial<TimeSlot>) {
    updateDay(day, {
      slots: schedule[day].slots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)),
    });
  }

  function addSlot(day: Weekday) {
    updateDay(day, {
      enabled: true,
      slots: [...schedule[day].slots, { id: newId("slot"), start: "09:00", end: "13:00" }],
    });
  }

  function removeSlot(day: Weekday, slotId: string) {
    updateDay(day, {
      slots: schedule[day].slots.filter((s) => s.id !== slotId),
    });
  }

  function applyCopy() {
    if (copyTargets.length === 0) return;
    onChange(copyDaySchedule(schedule, copyFrom, copyTargets));
    setCopyTargets([]);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="text-sm font-medium">Copy schedule</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Copy one day&apos;s slots to other days to avoid re-entering the same hours.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <select
              className="mt-1 flex h-9 rounded-md border bg-background px-2 text-sm"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value as Weekday)}
            >
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {WEEKDAY_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.filter((d) => d !== copyFrom).map((d) => {
              const checked = copyTargets.includes(d);
              return (
                <label key={d} className="inline-flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setCopyTargets((prev) =>
                        v ? [...prev, d] : prev.filter((x) => x !== d),
                      )
                    }
                  />
                  {WEEKDAY_LABELS[d].slice(0, 3)}
                </label>
              );
            })}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={applyCopy} disabled={!copyTargets.length}>
            <Copy className="size-3.5" /> Copy {WEEKDAY_LABELS[copyFrom]}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {WEEKDAYS.map((day) => {
          const daySchedule = schedule[day];
          const error = errors[`schedule.${day}`];
          return (
            <div
              key={day}
              className={cn(
                "rounded-xl border p-3 sm:p-4",
                !daySchedule.enabled && "bg-muted/15 opacity-80",
                error && "border-destructive/50",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={daySchedule.enabled}
                    onCheckedChange={(enabled) =>
                      updateDay(day, {
                        enabled,
                        slots:
                          enabled && daySchedule.slots.length === 0
                            ? [{ id: newId("slot"), start: "09:00", end: "13:00" }]
                            : daySchedule.slots,
                      })
                    }
                  />
                  <div>
                    <p className="text-sm font-semibold">{WEEKDAY_LABELS[day]}</p>
                    {!daySchedule.enabled && (
                      <p className="text-xs text-muted-foreground">Unavailable</p>
                    )}
                  </div>
                </div>
                {daySchedule.enabled && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => addSlot(day)}>
                    <Plus className="size-3.5" /> Add slot
                  </Button>
                )}
              </div>

              {daySchedule.enabled && (
                <div className="mt-3 space-y-2">
                  {daySchedule.slots.map((slot) => (
                    <div key={slot.id} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(day, slot.id, { start: e.target.value })}
                        className="w-[8.5rem]"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(day, slot.id, { end: e.target.value })}
                        className="w-[8.5rem]"
                      />
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatTimeLabel(slot.start)} – {formatTimeLabel(slot.end)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        onClick={() => removeSlot(day, slot.id)}
                        aria-label="Remove slot"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AppointmentSettingsForm({
  settings,
  onChange,
  errors = {},
}: {
  settings: AppointmentSettings;
  onChange: (next: AppointmentSettings) => void;
  errors?: Record<string, string>;
}) {
  function set<K extends keyof AppointmentSettings>(key: K, value: AppointmentSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="Consultation duration (min)"
        error={errors["consultationMinutes"]}
      >
        <Input
          type="number"
          min={5}
          value={settings.consultationMinutes}
          onChange={(e) => set("consultationMinutes", Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Follow-up duration (min)" error={errors["followUpMinutes"]}>
        <Input
          type="number"
          min={5}
          value={settings.followUpMinutes}
          onChange={(e) => set("followUpMinutes", Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Buffer time (min)">
        <Input
          type="number"
          min={0}
          value={settings.bufferMinutes}
          onChange={(e) => set("bufferMinutes", Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Max appointments per slot">
        <Input
          type="number"
          min={1}
          value={settings.maxPerSlot}
          onChange={(e) => set("maxPerSlot", Number(e.target.value) || 1)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox
          checked={settings.inClinicConsultation}
          onCheckedChange={(v) => set("inClinicConsultation", Boolean(v))}
        />
        In-clinic consultation
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox
          checked={settings.onlineConsultation}
          onCheckedChange={(v) => set("onlineConsultation", Boolean(v))}
        />
        Online consultation
      </label>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function applyDoctorSchedule(
  doctor: DoctorProfile,
  weeklySchedule: WeeklySchedule,
  appointmentSettings: AppointmentSettings,
): DoctorProfile {
  return { ...doctor, weeklySchedule, appointmentSettings };
}
