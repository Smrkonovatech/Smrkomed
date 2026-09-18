"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Calendar, ChevronDown, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";
import { CalendarEvent } from "./care-calendar";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onSaved?: (() => void) | undefined;
}

const CATEGORIES = [
  "Investigations",
  "Appointments",
  "Medications",
  "Doctor Tasks",
  "Follow-ups",
];

const TIME_OPTIONS = [
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "09:45 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

export function EditEventModal({
  isOpen,
  onClose,
  event,
  onSaved,
}: EditEventModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Investigations");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("09:45 AM");
  const [location, setLocation] = useState("Ultrasound Bay 3 • Central IVF");
  const [protocolCycle, setProtocolCycle] = useState("IVF Stimulation #2");
  const [cycleDay, setCycleDay] = useState("Day 6/12");
  const [instructions, setInstructions] = useState(
    "Fasting not required. Full bladder mandatory 30 mins prior. Measure bilateral lead follicle cohort (≥10mm) and endometrial thickness.",
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title || "Ultrasound Scan : Follicular Monitoring");
      const cat = event.category || "Investigations";
      const matchedCat = CATEGORIES.find(
        (c) => c.toLowerCase() === cat.toLowerCase() || cat.toLowerCase().includes(c.toLowerCase().slice(0, 4)),
      );
      setCategory(matchedCat || "Investigations");

      if (event.date && !isNaN(event.date.getTime())) {
        setEventDate(format(event.date, "yyyy-MM-dd"));
      } else {
        setEventDate(format(new Date(), "yyyy-MM-dd"));
      }

      if (event.time) {
        setStartTime(event.time);
      }

      const raw = event.raw as any;
      if (raw?.description || raw?.notes || raw?.note) {
        setInstructions(raw?.description || raw?.notes || raw?.note);
      }
      if (raw?.room) {
        setLocation(raw.room);
      }
    }
  }, [event]);

  if (!event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Event title is required");
      return;
    }

    setIsSaving(true);
    try {
      if (event.type === "task") {
        await clinicApi.patchTask(event.id, {
          title: title.trim(),
          description: instructions.trim(),
          dueDate: eventDate,
          dueTime: startTime,
        });
      } else {
        await clinicApi.patchAppointment(event.id, {
          type: title.trim(),
          room: location,
          notes: instructions.trim(),
          startsAt: `${eventDate}T${startTime.includes("PM") ? "14:00:00" : "09:00:00"}.000Z`,
        });
      }

      toast.success(`Event "${title}" updated successfully`);
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to update event:", err);
      toast.error(err?.message || "Failed to save event changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-[28px]">
        {/* Header matching Image 4 */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">
            Edit event
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body matching Image 4 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Event Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-800 block">
              Event title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full h-11 px-3.5 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] shadow-2xs transition-all"
            />
          </div>

          {/* Category Filter Pills matching Image 4 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-800 block">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-2 border-[#866BE3] bg-[#F8F5FF] text-[#866BE3] font-semibold shadow-2xs"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Schedule Boxed Section matching Image 4 */}
          <div className="border border-gray-200/80 rounded-2xl p-4 bg-white space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Date & Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Date */}
              <div className="relative">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full h-10 px-3 pr-7 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] cursor-pointer"
                />
                <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Start Time */}
              <div className="relative">
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-10 px-3 pr-7 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* End Time */}
              <div className="relative">
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-10 px-3 pr-7 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Location / Room | Protocol Cycle matching Image 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Location / Room
              </label>
              <div className="relative">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="Ultrasound Bay 3 • Central IVF">Ultrasound Bay 3 • Central IVF</option>
                  <option value="Consultation Room 1">Consultation Room 1</option>
                  <option value="Diagnostics Lab 2">Diagnostics Lab 2</option>
                  <option value="OPD Wing B">OPD Wing B</option>
                  <option value="Virtual / Teleconsult">Virtual / Teleconsult</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Protocol Cycle
              </label>
              <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-medium text-gray-800 bg-gray-50/70 border border-gray-200 rounded-xl shadow-2xs">
                <span>{protocolCycle}</span>
                <span className="text-[11px] text-gray-400 font-normal">{cycleDay}</span>
              </div>
            </div>
          </div>

          {/* Clinical Instructions (Optional) with counter matching Image 4 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-800">
                Clinical Instructions <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                {instructions.length} / 300
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-3 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] placeholder:text-gray-400 transition-all resize-none shadow-2xs leading-relaxed"
            />
          </div>

          {/* Footer matching Image 4 */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-full bg-[#7C5CE5] hover:bg-[#6D4CD4] text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
