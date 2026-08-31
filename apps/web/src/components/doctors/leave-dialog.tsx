"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LEAVE_TYPE_LABELS,
  doctorsStore,
  type LeaveType,
  type DoctorProfile,
} from "@/lib/doctors";
import type { Appointment } from "@/lib/demo-data";

const LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABELS) as LeaveType[];

export function LeaveDialog({
  open,
  onOpenChange,
  doctor,
  appointments = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: DoctorProfile;
  appointments?: Appointment[];
}) {
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fullDay, setFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [type, setType] = useState<LeaveType>("personal");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const affected = useMemo(() => {
    if (!date) return [];
    const end = endDate || date;
    return appointments.filter((a) => {
      // Demo appointments are "today" oriented — match by doctor name loosely.
      // When appointment dates exist in future models, filter by date range.
      return a.doctor === doctor.displayName || a.doctor.includes(doctor.lastName);
    }).filter(() => Boolean(date && end));
  }, [appointments, date, endDate, doctor]);

  function reset() {
    setDate("");
    setEndDate("");
    setFullDay(true);
    setStartTime("09:00");
    setEndTime("17:00");
    setType("personal");
    setReason("");
    setNotes("");
    setError(null);
  }

  function submit() {
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    if (!fullDay) {
      if (!startTime || !endTime) {
        setError("Start and end time are required for partial leave.");
        return;
      }
      if (endTime <= startTime) {
        setError("End time must be after start time.");
        return;
      }
    }

    const overlap = doctor.leaves.some((leave) => {
      const leaveEnd = leave.endDate || leave.date;
      const newEnd = endDate || date;
      return date <= leaveEnd && newEnd >= leave.date;
    });
    if (overlap) {
      setError("This leave overlaps an existing leave period.");
      return;
    }

    if (affected.length > 0) {
      const confirmed = window.confirm(
        `This time has ${affected.length} existing appointment${affected.length === 1 ? "" : "s"}. Please review affected appointments before confirming the leave.\n\nExisting appointments will not be deleted automatically.`,
      );
      if (!confirmed) return;
    }

    doctorsStore.addLeave(doctor.id, {
      date,
      ...(endDate ? { endDate } : {}),
      fullDay,
      ...(fullDay ? {} : { startTime, endTime }),
      type,
      reason: reason.trim(),
      notes: notes.trim(),
    });
    toast.success("Leave added. Availability updated.");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add leave / exception</DialogTitle>
          <DialogDescription>
            Block {doctor.displayName}&apos;s availability for leave, conferences, or custom
            unavailability. Existing appointments are not deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>End date (optional)</Label>
            <Input
              type="date"
              className="mt-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Type</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={fullDay} onCheckedChange={(v) => setFullDay(Boolean(v))} />
            Full day
          </label>
          {!fullDay && (
            <>
              <div>
                <Label>Start time</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Label>Reason</Label>
            <Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {affected.length > 0 && date && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            This time has existing appointments. Please review affected appointments before confirming
            the leave. Appointments will not be deleted automatically.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add Leave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeactivateDoctorDialog({
  open,
  onOpenChange,
  doctor,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: DoctorProfile;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate Doctor</DialogTitle>
          <DialogDescription>
            {doctor.displayName} will no longer be available for new appointments. Existing
            appointments and historical records will remain unchanged.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Deactivate Doctor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
