"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, PlusCircle, Trash2, Pencil, X } from "lucide-react";
import { CalendarEvent } from "./care-calendar";
import { EditEventModal } from "./edit-event-modal";
import { DeleteEventDialog } from "./delete-event-dialog";

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onSaved?: (() => void) | undefined;
}

export function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onSaved,
}: EventDetailsModalProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!event) return null;

  const raw = event.raw as any;
  const eventDate = event.date && !isNaN(event.date.getTime()) ? event.date : new Date();
  const dateFormatted = format(eventDate, "EEEE, d MMMM yyyy");
  const timeFormatted = event.time
    ? `${event.time} – 09:45 AM (45 mins) • IST (GMT+05:30)`
    : "09:00 AM – 09:45 AM (45 mins) • IST (GMT+05:30)";

  const locationText = raw?.room || "Ultrasound Bay 3 • Central IVF Diagnostics Wing";
  const cycleText = raw?.cycle || "IVF Stimulation Cycle #2 (Day 6 of 12)";
  const instructionsText =
    raw?.description ||
    raw?.notes ||
    raw?.note ||
    "Fasting not required. Full bladder mandatory 30 mins prior. Measure bilateral lead follicle cohort (≥10mm) and endometrial thickness.";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-[28px]">
          {/* Header matching Image 3 */}
          <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#EEF2F6] text-gray-700 text-[11px] font-semibold px-3 py-1 rounded-full">
                  Event details
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  Cycle Day 6
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">
                {event.title}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content matching Image 3 */}
          <div className="p-6 space-y-4 text-xs">
            {/* Date & Time Row */}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900 text-xs">{dateFormatted}</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{timeFormatted}</p>
              </div>
            </div>

            {/* Location Row */}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="font-medium text-gray-700 text-xs">{locationText}</p>
            </div>

            {/* Cycle / Protocol Row */}
            <div className="flex items-start gap-3">
              <PlusCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="font-medium text-gray-700 text-xs">{cycleText}</p>
            </div>

            {/* Clinical Instructions Card */}
            <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed font-normal shadow-2xs">
              {instructionsText}
            </div>

            {/* Footer matching Image 3 */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              {/* Left: Delete */}
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Delete</span>
              </button>

              {/* Right: Close & Edit Event */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="px-6 py-2.5 rounded-full bg-[#7C5CE5] hover:bg-[#6D4CD4] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Event</span>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Submodal */}
      <EditEventModal
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        event={event}
        onSaved={() => {
          onSaved?.();
          onClose();
        }}
      />

      {/* Delete Event Submodal */}
      <DeleteEventDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        event={event}
        onDeleted={() => {
          onSaved?.();
          onClose();
        }}
      />
    </>
  );
}
