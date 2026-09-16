"use client";

import { useState, useMemo, useEffect } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Bot, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/lib/app-state";
import { clinicApi, type ClinicAppointment, type ClinicTask } from "@/lib/clinic-api";
import { CalendarDayPanel } from "./calendar-day-panel";
import { AddCareTaskModal } from "./add-care-task-modal";

interface CareCalendarProps {
  couple: { id: string };
}

export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: "task" | "appointment";
  status: string;
  category: string;
  assignedTo?: string;
  isCareLoop: boolean;
  raw: ClinicTask | ClinicAppointment;
};

function parseSafeDateAndTime(dueStr: string | null | undefined, raw?: any): { date: Date; time: string } {
  const now = new Date();
  if (!dueStr && !raw?.dueDate && !raw?.date) {
    return { date: now, time: "" };
  }

  // If raw object has dueDate or date
  if (raw?.dueDate) {
    const d = new Date(raw.dueDate);
    if (!isNaN(d.getTime())) {
      return {
        date: d,
        time: raw.dueTime || (dueStr && dueStr.includes("·") ? (dueStr.split("·")[1]?.trim() ?? "") : ""),
      };
    }
  }

  // If dueStr has time part after "·" e.g. "Today · 08:00 PM" or "15 Sep · 10:00 AM"
  let time = "";
  let datePart = dueStr || "";
  if (dueStr && dueStr.includes("·")) {
    const parts = dueStr.split("·");
    datePart = (parts[0] || "").trim();
    time = (parts[1] || "").trim();
  }

  const lowerDate = datePart.toLowerCase();
  let d = new Date();
  if (lowerDate.includes("today")) {
    d = new Date();
  } else if (lowerDate.includes("tomorrow")) {
    d = new Date();
    d.setDate(d.getDate() + 1);
  } else if (lowerDate.includes("yesterday")) {
    d = new Date();
    d.setDate(d.getDate() - 1);
  } else if (datePart) {
    const parsed = new Date(datePart);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    } else {
      const withYear = new Date(`${datePart} ${now.getFullYear()}`);
      if (!isNaN(withYear.getTime())) {
        d = withYear;
      } else {
        d = new Date();
      }
    }
  }

  if (!time && dueStr) {
    const parsed = new Date(dueStr);
    if (!isNaN(parsed.getTime())) {
      try {
        time = format(parsed, "hh:mm a");
      } catch {
        time = "";
      }
    }
  }

  return { date: d, time };
}

function formatSafeDate(date: Date | null | undefined, formatStr: string, fallback = ""): string {
  if (!date || isNaN(date.getTime())) return fallback;
  try {
    return format(date, formatStr);
  } catch {
    return fallback;
  }
}

export function CareCalendarWidget({ couple }: CareCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true); // Open by default
  const [tasks, setTasks] = useState<ClinicTask[]>([]);
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = async () => {
    const coupleKey = couple.id || (couple as any).slug;
    if (!coupleKey) return;
    try {
      setLoading(true);
      const res = await clinicApi.careCalendar(coupleKey);
      setTasks(res.tasks || []);
      setAppointments(res.appointments || []);
    } catch (error) {
      console.error("Failed to load care calendar", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [couple.id, (couple as any).slug]);

  const events: CalendarEvent[] = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks.map((t) => {
      const { date, time } = parseSafeDateAndTime(t.due, t);
      return {
        id: t.id,
        title: t.title,
        date,
        time: time || (t.due && !t.due.includes("·") ? t.due : ""),
        type: "task",
        status: t.status,
        category: t.category || "Task",
        assignedTo: t.assignedTo,
        isCareLoop: t.targetRole !== null,
        raw: t,
      };
    });

    const apptEvents: CalendarEvent[] = appointments.map((a) => {
      const { date, time } = parseSafeDateAndTime(a.date, a);
      return {
        id: a.id,
        title: `${a.type} Appointment`,
        date,
        time: a.time || time,
        type: "appointment",
        status: a.status,
        category: "Appointment",
        assignedTo: a.doctor,
        isCareLoop: false,
        raw: a,
      };
    });

    return [...taskEvents, ...apptEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks, appointments]);

  const handlePrev = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNext = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsPanelOpen(true);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStartDate, end: calendarEndDate });

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const listEvents = useMemo(() => {
    return events.filter(e => {
      // For list view, show events from the start of current month onwards
      return e.date >= monthStart;
    }).slice(0, 50); // limit to 50
  }, [events, monthStart]);

  const getEventsForDate = (date: Date) => events.filter(e => isSameDay(e.date, date));

  const getEventColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("appointment")) return "bg-blue-100 text-blue-800 border-none before:bg-blue-500";
    if (cat.includes("blood") || cat.includes("diagnostic") || cat.includes("test")) return "bg-rose-100 text-rose-800 border-none before:bg-rose-500";
    if (cat.includes("medication")) return "bg-emerald-100 text-emerald-800 border-none before:bg-emerald-500";
    if (cat.includes("review") || cat.includes("scan")) return "bg-purple-100 text-purple-800 border-none before:bg-purple-500";
    return "bg-slate-100 text-slate-800 border-none before:bg-slate-500"; 
  };

  return (
    <div className="w-full bg-white p-3 rounded-xl border shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 p-1.5 rounded-lg text-purple-700">
            <CalendarIcon className="size-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Care Calendar</h2>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday} className="h-7 rounded-full px-3 text-xs font-medium bg-white text-slate-600 border-slate-200">Today</Button>
            <div className="flex items-center bg-white rounded-full border border-slate-200 overflow-hidden h-7">
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7 rounded-none hover:bg-slate-50 text-slate-500"><ChevronLeft className="size-3" /></Button>
              <div className="h-3 w-px bg-slate-200 mx-0.5"></div>
              <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7 rounded-none hover:bg-slate-50 text-slate-500"><ChevronRight className="size-3" /></Button>
            </div>
            <span className="text-xs font-bold text-slate-700 w-28 text-center">{format(currentDate, "MMMM yyyy")}</span>
          </div>

          <div className="flex items-center bg-white rounded-full p-0.5 border border-slate-200 shadow-sm h-7">
            {(["Month", "Week", "List"] as const).map(view => (
              <Button 
                key={view}
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode(view.toLowerCase() as any)}
                className={`h-6 px-3 rounded-full text-[10px] font-medium transition-colors ${viewMode === view.toLowerCase() ? 'bg-indigo-500 text-white hover:bg-indigo-600 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {view}
              </Button>
            ))}
          </div>

          <Button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 h-7 rounded-full px-4 shadow-sm text-white border-none text-xs">
            <Plus className="size-3 mr-1" /> Add Task
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        {/* Main Calendar Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          
          {viewMode === "month" && (
            <>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 border-b bg-white">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                  <div key={day} className="text-center py-2 text-[10px] font-medium text-slate-400">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-slate-50 gap-px border-t border-slate-100">
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleDayClick(day)}
                      className={`bg-white p-1 relative cursor-pointer min-h-[75px] transition-all hover:bg-slate-50 ${!isCurrentMonth ? 'opacity-40' : ''}`}
                    >
                      <div className="flex justify-center mb-0.5">
                        <span className={`text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full ${isSelected ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' : isToday ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} className={`text-[9px] px-1.5 py-0.5 rounded-full leading-tight truncate flex items-center gap-1 relative before:content-[''] before:w-1 before:h-1 before:rounded-full ${getEventColor(e.category)}`}>
                            <span className="truncate flex-1">{e.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] text-slate-400 font-medium px-1.5">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === "week" && (
            <>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 border-b bg-white">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
                  <div key={day} className={`text-center py-2 text-[10px] font-medium ${isSameDay(weekDays[idx]!, new Date()) ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                    <div>{day}</div>
                    <div className="text-xs mt-0.5">{format(weekDays[idx]!, "d")}</div>
                  </div>
                ))}
              </div>
              
              {/* Weekly Grid */}
              <div className="flex-1 grid grid-cols-7 bg-slate-50 gap-px border-t border-slate-100">
                {weekDays.map((day, idx) => {
                  const dayEvents = getEventsForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleDayClick(day)}
                      className={`bg-white p-2 relative cursor-pointer min-h-[300px] transition-all hover:bg-slate-50 ${isSelected ? 'ring-1 ring-inset ring-purple-200' : ''}`}
                    >
                      <div className="space-y-1.5 mt-2">
                        {dayEvents.map(e => (
                          <div key={e.id} className={`text-[10px] px-2 py-1 rounded border leading-tight flex flex-col gap-1 ${getEventColor(e.category)}`}>
                            <span className="font-semibold line-clamp-2">{e.title}</span>
                            {e.time && <span className="text-[9px] opacity-80 flex items-center"><Clock className="size-2.5 mr-1" />{e.time}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === "list" && (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
              <div className="max-w-2xl mx-auto space-y-3">
                {listEvents.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">No events found.</div>
                ) : (
                  listEvents.map(e => (
                    <div key={e.id} className="bg-white border rounded-xl p-3 shadow-sm flex items-start gap-3 hover:border-indigo-200 cursor-pointer transition-colors" onClick={() => handleDayClick(e.date)}>
                      <div className={`mt-1 size-2.5 rounded-full shrink-0 ${
                        e.category.toLowerCase().includes("blood") ? "bg-rose-500" :
                        e.category.toLowerCase().includes("appointment") ? "bg-blue-500" :
                        e.category.toLowerCase().includes("medication") ? "bg-emerald-500" : "bg-purple-500"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-slate-800">{e.title}</span>
                          {e.isCareLoop && <Bot className="size-3 text-purple-400" />}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span className="font-medium text-slate-700">{formatSafeDate(e.date, "EEE, d MMM yyyy")}</span>
                          {e.time && <span>• {e.time}</span>}
                          <span>• {e.category}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-normal">{e.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Selected Day Panel */}
        <div className={`w-full lg:w-72 transition-all ${isPanelOpen ? 'block' : 'hidden'} bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col`}>
          <CalendarDayPanel 
            date={selectedDate || new Date()} 
            events={getEventsForDate(selectedDate || new Date())} 
            onClose={() => setIsPanelOpen(false)}
            onAddTask={() => setIsAddModalOpen(true)}
            couple={couple}
            onSaved={fetchCalendarData}
          />
        </div>
      </div>

      <AddCareTaskModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        couple={couple}
        defaultDate={selectedDate || currentDate}
        onSaved={fetchCalendarData}
      />
    </div>
  );
}
