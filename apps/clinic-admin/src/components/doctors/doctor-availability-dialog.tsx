"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Loader2,
  Save,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Weekday, WeeklySchedule } from "@/lib/doctors/types";
import { WEEKDAYS } from "@/lib/doctors/types";

const DAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export type DoctorAvailabilityDialogProps = {
  doctorId: string;
  doctorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function DoctorAvailabilityDialog({
  doctorId,
  doctorName,
  open,
  onOpenChange,
  onSaved,
}: DoctorAvailabilityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [bufferMins, setBufferMins] = useState<number>(5);

  useEffect(() => {
    if (!open || !doctorId) return;
    setLoading(true);
    fetch(`/api/doctors/${doctorId}/availability`)
      .then(async (res) => {
        const json = await res.json();
        if (json.success && json.data?.weeklySchedule) {
          setSchedule(json.data.weeklySchedule);
          if (json.data.settings?.consultationMinutes) {
            setSlotDuration(json.data.settings.consultationMinutes);
          }
          if (json.data.settings?.bufferMinutes) {
            setBufferMins(json.data.settings.bufferMinutes);
          }
        }
      })
      .catch((err) => {
        toast.error("Failed to load doctor schedule from database");
      })
      .finally(() => setLoading(false));
  }, [open, doctorId]);

  function toggleDay(day: Weekday) {
    if (!schedule) return;
    const current = schedule[day];
    const willEnable = !current.enabled;

    setSchedule({
      ...schedule,
      [day]: {
        ...current,
        enabled: willEnable,
        slots: willEnable && current.slots.length === 0
          ? [{ id: `${day}-default`, start: "09:00", end: "17:00" }]
          : current.slots,
      },
    });
  }

  function updateSlotTime(
    day: Weekday,
    slotIndex: number,
    field: "start" | "end",
    value: string,
  ) {
    if (!schedule) return;
    const dayConfig = schedule[day];
    const nextSlots = [...dayConfig.slots];
    if (nextSlots[slotIndex]) {
      nextSlots[slotIndex] = {
        ...nextSlots[slotIndex]!,
        [field]: value,
      };
      setSchedule({
        ...schedule,
        [day]: {
          ...dayConfig,
          slots: nextSlots,
        },
      });
    }
  }

  function addShift(day: Weekday) {
    if (!schedule) return;
    const dayConfig = schedule[day];
    setSchedule({
      ...schedule,
      [day]: {
        ...dayConfig,
        slots: [
          ...dayConfig.slots,
          { id: `${day}-${Date.now().toString(36)}`, start: "14:00", end: "17:00" },
        ],
      },
    });
  }

  function removeShift(day: Weekday, index: number) {
    if (!schedule) return;
    const dayConfig = schedule[day];
    const nextSlots = dayConfig.slots.filter((_, i) => i !== index);
    setSchedule({
      ...schedule,
      [day]: {
        ...dayConfig,
        slots: nextSlots,
      },
    });
  }

  async function handleSave() {
    if (!schedule) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorName,
          weeklySchedule: schedule,
          settings: {
            consultationMinutes: slotDuration,
            bufferMinutes: bufferMins,
            maxPerSlot: 1,
            onlineConsultation: true,
            inClinicConsultation: true,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Schedule saved to database for ${doctorName}!`);
        onOpenChange(false);
        onSaved?.();
      } else {
        toast.error(json.error || "Failed to save schedule to database");
      }
    } catch (err) {
      toast.error("Network error while saving schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Doctor Availability & Calendar
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set working hours and open booking slots for <strong className="text-foreground">{doctorName}</strong>. Changes persist directly to the database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin mb-2 text-primary" />
            Loading schedule from database...
          </div>
        ) : schedule ? (
          <div className="space-y-4 py-2">
            {/* Consultation Duration Settings */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 text-xs">
              <div>
                <Label htmlFor="slot-duration" className="text-xs font-medium text-foreground">
                  Consultation Slot Duration
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="slot-duration"
                    type="number"
                    min={15}
                    max={120}
                    step={5}
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value) || 30)}
                    className="h-8 text-xs font-semibold"
                  />
                  <span className="text-muted-foreground whitespace-nowrap">minutes</span>
                </div>
              </div>

              <div>
                <Label htmlFor="buffer-duration" className="text-xs font-medium text-foreground">
                  Buffer Time Between Slots
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="buffer-duration"
                    type="number"
                    min={0}
                    max={30}
                    step={5}
                    value={bufferMins}
                    onChange={(e) => setBufferMins(Number(e.target.value) || 0)}
                    className="h-8 text-xs font-semibold"
                  />
                  <span className="text-muted-foreground whitespace-nowrap">minutes</span>
                </div>
              </div>
            </div>

            {/* Weekly Days Schedule */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Weekly Working Hours (Monday – Sunday)
              </Label>

              <div className="divide-y divide-border/40 rounded-lg border border-border/60 bg-card">
                {WEEKDAYS.map((day) => {
                  const dayConfig = schedule[day];
                  const isEnabled = dayConfig.enabled;

                  return (
                    <div
                      key={day}
                      className={`p-3 transition-colors ${
                        isEnabled ? "bg-background" : "bg-muted/15 opacity-70"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`check-${day}`}
                            checked={isEnabled}
                            onChange={() => toggleDay(day)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <label
                            htmlFor={`check-${day}`}
                            className="text-sm font-semibold cursor-pointer select-none"
                          >
                            {DAY_LABELS[day]}
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold uppercase tracking-wider ${
                              isEnabled
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-muted text-muted-foreground border-transparent"
                            }`}
                          >
                            {isEnabled ? "Available" : "Closed"}
                          </Badge>

                          {isEnabled && dayConfig.slots.length < 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addShift(day)}
                              className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10"
                            >
                              + Add Shift
                            </Button>
                          )}
                        </div>
                      </div>

                      {isEnabled && dayConfig.slots.length > 0 && (
                        <div className="mt-3 pl-7 space-y-2">
                          {dayConfig.slots.map((slot, sIdx) => (
                            <div key={slot.id || sIdx} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-medium w-12">
                                Shift {sIdx + 1}:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) =>
                                    updateSlotTime(day, sIdx, "start", e.target.value)
                                  }
                                  className="h-7 w-28 text-xs font-semibold tabular-nums"
                                />
                                <span className="text-xs text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) =>
                                    updateSlotTime(day, sIdx, "end", e.target.value)
                                  }
                                  className="h-7 w-28 text-xs font-semibold tabular-nums"
                                />
                              </div>

                              {dayConfig.slots.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeShift(day, sIdx)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !schedule}
            className="gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving to Database...
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                Save Schedule to Database
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
