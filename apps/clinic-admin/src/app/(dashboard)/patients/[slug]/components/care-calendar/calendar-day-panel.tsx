"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { type CalendarEvent } from "./care-calendar";
import { EventDetailsModal } from "./event-details-modal";

interface CalendarDayPanelProps {
  date: Date;
  events: CalendarEvent[];
  onClose?: () => void;
  onAddTask: () => void;
  couple: { id: string; primaryPatient?: { firstName: string; lastName: string } } | any;
  p360?: any;
  onSaved?: () => void;
}

export function CalendarDayPanel({
  date,
  events,
  onAddTask,
  couple,
  p360,
  onSaved,
}: CalendarDayPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const safeDate = date && !isNaN(date.getTime()) ? date : new Date();
  const dayNum = format(safeDate, "d");
  const monthYear = format(safeDate, "MMM yyyy");

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("confirm") || s.includes("complet") || s === "done") {
      return {
        label: "Confirmed",
        className: "bg-emerald-50 text-emerald-600 border-emerald-200/70",
      };
    }
    if (s.includes("schedul") || s.includes("waiting") || s.includes("booked")) {
      return {
        label: "Scheduled",
        className: "bg-blue-50 text-blue-600 border-blue-200/70",
      };
    }
    return {
      label: "Pending",
      className: "bg-amber-50 text-amber-600 border-amber-200/70",
    };
  };

  const getDotColor = (event: CalendarEvent) => {
    const cat = (event.category || "").toLowerCase();
    const t = (event.title || "").toLowerCase();
    const s = (event.status || "").toLowerCase();

    if (s.includes("confirm") || t.includes("ultrasound") || cat.includes("ultrasound")) return "bg-emerald-500";
    if (cat.includes("blood") || t.includes("blood") || s.includes("schedul")) return "bg-blue-500";
    if (t.includes("review") || cat.includes("consultation") || event.isMilestone) return "bg-[#7C5CE5]";
    return "bg-[#7C5CE5]";
  };

  const getPatientName = (event: CalendarEvent) => {
    if (event.raw && (event.raw as any).patientName) {
      return (event.raw as any).patientName;
    }
    const t = (event.title || "").toLowerCase();
    if (t.includes("review") || t.includes("couples") || t.includes("both")) {
      return "Both";
    }
    const name =
      couple?.primary?.name ||
      p360?.header?.patientName ||
      (couple?.primaryPatient ? `${couple.primaryPatient.firstName || ""} ${couple.primaryPatient.lastName || ""}`.trim() : null) ||
      "Geethu";
    return name.split(" ")[0];
  };

  return (
    <>
      <div className="h-full flex flex-col justify-between bg-white">
        <div>
          {/* Header matching Image 2 */}
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100/90 flex items-center justify-center font-bold text-base text-gray-900">
                {dayNum}
              </div>
              <span className="text-sm font-bold text-gray-900">
                {monthYear}
              </span>
            </div>
            <span className="px-3 py-1 rounded-full bg-gray-100/80 text-gray-600 text-xs font-semibold">
              {events.length} {events.length === 1 ? "task" : "tasks"}
            </span>
          </div>

          {/* List of Tasks matching Image 2 */}
          <div
            className="divide-y divide-gray-100/80 max-h-[380px] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {events.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-[#866BE3] flex items-center justify-center mb-2">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-gray-800">No care activities scheduled</p>
                <p className="text-[11px] text-gray-400 mt-0.5 max-w-[200px]">
                  No appointments or tasks set for this date.
                </p>
              </div>
            ) : (
              events.map((event) => {
                const statusInfo = getStatusBadge(event.status);
                const dotColor = getDotColor(event);
                const patient = getPatientName(event);

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="py-3 px-2 group cursor-pointer hover:bg-slate-50/80 rounded-xl transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                        <span className="text-xs font-semibold text-gray-500 w-16 shrink-0 pt-0.5">
                          {event.time || "09:00 AM"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-gray-900 group-hover:text-[#7C5CE5] transition-colors leading-snug line-clamp-1 break-words">
                            {event.title}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">
                            Patient: <span className="text-gray-600 font-semibold">{patient}</span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Button matching Image 2 */}
        <div className="pt-4 mt-auto">
          <button
            type="button"
            onClick={onAddTask}
            className="w-full py-2.5 rounded-full border border-[#7C5CE5] text-[#7C5CE5] hover:bg-[#7C5CE5]/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task for this date</span>
          </button>
        </div>
      </div>

      {/* Event Details Modal matching Image 3 */}
      <EventDetailsModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onSaved={onSaved}
      />
    </>
  );
}
