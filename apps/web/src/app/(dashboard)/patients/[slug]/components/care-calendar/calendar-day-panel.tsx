"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, Plus, Bot, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type CalendarEvent } from "./care-calendar";
import { clinicApi } from "@/lib/clinic-api";
import { toast } from "sonner";
import { EventDetailsModal } from "./event-details-modal";

interface CalendarDayPanelProps {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onAddTask: () => void;
  couple: { id: string; primaryPatient?: { firstName: string; lastName: string } } | any;
  onSaved?: () => void;
}

export function CalendarDayPanel({
  date,
  events,
  onClose,
  onAddTask,
  couple,
  onSaved,
}: CalendarDayPanelProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleMarkComplete = async (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (event.type === "task") {
      setProcessingId(event.id);
      try {
        await clinicApi.completeTask(event.id);
        toast.success(`"${event.title}" marked as completed.`);
        if (onSaved) onSaved();
      } catch (err) {
        toast.error("Failed to complete task.");
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleEscalate = async (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (event.type === "task") {
      setProcessingId(event.id);
      try {
        await clinicApi.escalateTask(event.id, "Manual escalation from Care Calendar.");
        toast.success(`"${event.title}" escalated for assistance.`);
        if (onSaved) onSaved();
      } catch (err) {
        toast.error("Failed to escalate task.");
      } finally {
        setProcessingId(null);
      }
    }
  };

  const safeDate = date && !isNaN(date.getTime()) ? date : new Date();
  const dayNum = format(safeDate, "d");
  const monthYear = format(safeDate, "MMM yyyy");

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-indigo-700 text-lg">
              {dayNum} <span className="text-slate-700">{monthYear}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 font-medium">
              {events.length} {events.length === 1 ? "task" : "tasks"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-0">
          {events.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center">
              <Clock className="size-6 text-slate-200 mb-2" />
              <p className="text-xs font-medium text-slate-500">
                No care activities scheduled
              </p>
            </div>
          ) : (
            events.map((event, idx) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`py-3 group cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition-colors ${
                  idx !== events.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-1 size-2 rounded-full shrink-0 ${
                        event.isMilestone || event.category.toLowerCase().includes("milestone")
                          ? "bg-[#866BE3]"
                          : event.category.toLowerCase().includes("blood")
                            ? "bg-rose-500"
                            : event.category.toLowerCase().includes("appointment") || event.category.toLowerCase().includes("consultation")
                              ? "bg-blue-500"
                              : event.category.toLowerCase().includes("medication")
                                ? "bg-emerald-500"
                                : "bg-purple-500"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {event.time && (
                          <span className="text-xs text-slate-500 font-medium">
                            {event.time}
                          </span>
                        )}
                        <span className="font-semibold text-sm text-slate-800 group-hover:text-[#866BE3] transition-colors">
                          {event.title}
                        </span>
                        {(event.isMilestone || event.category.toLowerCase().includes("milestone")) && (
                          <span className="text-[10px] bg-purple-50 text-[#7C5CEB] font-semibold px-2 py-0.5 rounded-full border border-purple-200">
                            Cycle Milestone
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {event.assignedTo || "Unassigned"}
                      </div>
                      {event.type === "task" &&
                        event.status !== "completed" &&
                        event.status !== "escalated" && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleMarkComplete(e, event)}
                              disabled={processingId === event.id}
                              className="h-6 px-2 text-[10px] font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-emerald-50/50 cursor-pointer"
                            >
                              <CheckCircle2 className="size-3 mr-1" /> Done
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleEscalate(e, event)}
                              disabled={processingId === event.id}
                              className="h-6 px-2 text-[10px] font-medium text-rose-600 border-rose-200 hover:bg-rose-50 bg-rose-50/50 cursor-pointer"
                            >
                              <AlertCircle className="size-3 mr-1" /> Need Help
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {event.isCareLoop && <Bot className="size-3 text-purple-400" />}
                    {event.status === "completed" || event.status === "Completed" ? (
                      <Badge className="text-[10px] font-normal bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 rounded-full px-2">
                        Completed
                      </Badge>
                    ) : event.status === "waiting" ||
                      event.status === "Waiting" ||
                      event.status === "Scheduled" ? (
                      <Badge className="text-[10px] font-normal bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 rounded-full px-2">
                        Scheduled
                      </Badge>
                    ) : event.status === "overdue" ? (
                      <Badge className="text-[10px] font-normal bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 rounded-full px-2">
                        Overdue
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] font-normal bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 rounded-full px-2">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50/50 mt-auto">
          <Button
            onClick={onAddTask}
            variant="outline"
            className="w-full text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 border-indigo-200 rounded-full h-8 text-xs shadow-sm bg-white cursor-pointer"
          >
            <Plus className="size-3 mr-1.5" /> Add Task for this date
          </Button>
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
