"use client";

import { useState, useMemo, useEffect } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { clinicApi, type ClinicAppointment, type ClinicTask } from "@/lib/clinic-api";
import { CalendarDayPanel } from "./calendar-day-panel";
import { AddCareTaskModal } from "./add-care-task-modal";
import { EventDetailsModal } from "./event-details-modal";

interface CareCalendarProps {
  couple: { id: string; stage?: string; treatment?: string; slug?: string } | any;
  p360?: any;
}

export type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: "task" | "appointment" | "milestone";
  status: string;
  category: string;
  assignedTo?: string;
  isCareLoop: boolean;
  isMilestone?: boolean;
  raw: ClinicTask | ClinicAppointment;
};

function parseSafeDateAndTime(dueStr: string | null | undefined, raw?: any): { date: Date; time: string } {
  const now = new Date();
  if (!dueStr && !raw?.dueDate && !raw?.date) {
    return { date: now, time: "" };
  }

  if (raw?.dueDate) {
    const d = new Date(raw.dueDate);
    if (!isNaN(d.getTime())) {
      return {
        date: d,
        time: raw.dueTime || (dueStr && dueStr.includes("·") ? (dueStr.split("·")[1]?.trim() ?? "") : ""),
      };
    }
  }

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
    const normalized = datePart.replace(/Sept/i, "Sep");
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    } else {
      const withYear = new Date(`${normalized} ${now.getFullYear()}`);
      if (!isNaN(withYear.getTime())) {
        d = withYear;
      } else {
        d = new Date();
      }
    }
  }

  if (!time && dueStr) {
    const timeRegex = /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/;
    const match = dueStr.match(timeRegex);
    if (match && match[1]) {
      time = match[1];
    }
  }

  return { date: d, time };
}

function getPillStyle(e: CalendarEvent) {
  const cat = (e.category || "").toLowerCase();
  const t = (e.title || "").toLowerCase();

  if (cat.includes("blood") || cat.includes("diagnostic") || t.includes("blood") || t.includes("lab")) {
    return {
      badge: "bg-[#FFF0F0] text-[#D93838] border border-[#FCD6D6]",
      dot: "bg-[#D93838]",
    };
  }
  if (cat.includes("ultrasound") || t.includes("ultrasound") || t.includes("scan")) {
    if (t.includes("review") || t.includes("monitoring")) {
      return {
        badge: "bg-[#F6F2FF] text-[#7C5CE5] border border-[#E8DDFF]",
        dot: "bg-[#7C5CE5]",
      };
    }
    return {
      badge: "bg-[#EEF6FF] text-[#2563EB] border border-[#D0E6FF]",
      dot: "bg-[#2563EB]",
    };
  }
  if (cat.includes("consultation") || t.includes("consultation") || cat.includes("appointment")) {
    return {
      badge: "bg-[#E6F8FA] text-[#0891B2] border border-[#CFEDF2]",
      dot: "bg-[#0891B2]",
    };
  }
  if (cat.includes("medication") || t.includes("medication") || t.includes("stimulation")) {
    return {
      badge: "bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]",
      dot: "bg-[#16A34A]",
    };
  }
  return {
    badge: "bg-[#F6F2FF] text-[#7C5CE5] border border-[#E8DDFF]",
    dot: "bg-[#7C5CE5]",
  };
}

function getShortEventTitle(title: string): string {
  if (!title) return "Event";
  const lower = title.toLowerCase();
  if (lower.includes("blood test")) return "Blood Test";
  if (lower.includes("ultrasound")) return "Ultrasound";
  if (lower.includes("consultation")) return "Consultation";
  if (lower.includes("scan") && lower.includes("review")) return "Scan + Review";
  if (lower.includes("review report") || lower.includes("report review")) return "Review Report";
  if (lower.includes("medication")) {
    const medName = title.replace(/^medication:\s*/i, "").split(" ")[0];
    return `Medication: ${medName}`;
  }
  return title;
}

export function CareCalendarWidget({ couple, p360 }: CareCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [tasks, setTasks] = useState<ClinicTask[]>([]);
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [, setLoading] = useState(true);

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
  }, [
    couple.id,
    (couple as any).slug,
    p360?.header?.currentTreatment?.stageName,
    p360?.header?.currentTreatment?.status,
    p360?.header?.currentCarePlan?.id,
    p360?.updatedAt,
  ]);

  const default15Stages = useMemo(
    () => [
      "01. Lead / Appointment",
      "02. Initial Consultation",
      "03. Fertility Investigation / Workup",
      "04. IVF Decision",
      "05. Treatment Planning & Consent",
      "06. Cycle Preparation",
      "07. Ovarian Stimulation",
      "08. Follicular Monitoring",
      "09. Trigger",
      "10. OPU (Oocyte Pick-Up)",
      "11. Embryology",
      "12. Transfer / FET",
      "13. Post-Transfer (Two-Week Wait)",
      "14. Pregnancy Test",
      "15. Outcome",
    ],
    []
  );

  const events: CalendarEvent[] = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks.map((t) => {
      const { date, time } = parseSafeDateAndTime(t.due, t);
      const isMilestone =
        t.category === "Milestone" ||
        t.category === "Procedure" ||
        (t as any).taskType === "CLINICAL_MILESTONE" ||
        (t as any).isMilestone === true ||
        /^\d{2}\.\s*/.test(t.title) ||
        t.title.toLowerCase().includes("retrieval") ||
        t.title.toLowerCase().includes("transfer") ||
        t.title.toLowerCase().includes("trigger") ||
        t.title.toLowerCase().includes("baseline") ||
        t.title.toLowerCase().includes("beta hcg");

      return {
        id: t.id,
        title: t.title,
        date,
        time: time || (t.due && !t.due.includes("·") ? t.due : ""),
        type: isMilestone ? "milestone" : "task",
        status: t.status,
        category: isMilestone ? "Milestone" : (t.category || "Task"),
        assignedTo: t.assignedTo,
        isCareLoop: t.targetRole !== null,
        isMilestone,
        raw: t,
      };
    });

    const apptEvents: CalendarEvent[] = appointments.map((a) => {
      const { date, time } = parseSafeDateAndTime(a.date, a);
      const isConsultation =
        a.type?.toLowerCase().includes("consultation") ||
        ((a as any).category && String((a as any).category).toLowerCase().includes("consultation"));
      return {
        id: a.id,
        title: a.type?.includes("Appointment") || a.type?.includes("Consultation") ? a.type : `${a.type} Appointment`,
        date,
        time: a.time || time,
        type: "appointment",
        status: a.status,
        category: isConsultation ? "Consultation" : "Appointment",
        assignedTo: a.doctor,
        isCareLoop: false,
        isMilestone: false,
        raw: a,
      };
    });

    // Check if patient has active journey
    const hasAssignedJourney = Boolean(
      p360?.header?.currentCarePlan ||
      (p360?.header?.currentTreatment && p360.header.currentTreatment.status !== "PENDING" && p360.header.currentTreatment.stageName) ||
      (couple?.stage && couple.stage !== "Pending" && couple.stage !== "Unassigned") ||
      (couple?.treatment && couple.treatment !== "Pending" && couple.treatment !== "Unassigned")
    );

    let rawSteps = p360?.header?.currentCarePlan?.steps || [];
    if (rawSteps.length === 0 && hasAssignedJourney) {
      const activeStageName =
        p360?.header?.currentCarePlan?.stageName ||
        p360?.header?.currentTreatment?.stageName ||
        couple?.stage ||
        "01. Lead / Appointment";
      const cleanActive = activeStageName.toLowerCase().replace(/^\d+\.\s*/, "").trim();
      const currentIdx = Math.max(
        0,
        default15Stages.findIndex((s) => s.toLowerCase().includes(cleanActive))
      );

      rawSteps = default15Stages.map((stName, idx) => ({
        id: `tpl-stage-${idx}`,
        sortOrder: idx,
        name: stName,
        status: idx < currentIdx ? "DONE" : idx === currentIdx ? "CURRENT" : "PENDING",
      }));
    }

    const defaultStageOffsets = [0, 3, 6, 9, 12, 15, 18, 23, 27, 29, 31, 34, 36, 48, 50];
    const planStartDate = p360?.header?.currentCarePlan?.startDate
      ? new Date(p360.header.currentCarePlan.startDate)
      : p360?.header?.currentTreatment?.startedAt
      ? new Date(p360.header.currentTreatment.startedAt)
      : new Date();

    const planStepEvents: CalendarEvent[] = [];
    for (const step of rawSteps) {
      const stepClean = step.name.toLowerCase().replace(/^\d+\.\s*/, "").trim();
      const exists = taskEvents.some(
        (te) => te.id === `milestone-${step.id}` || te.title.toLowerCase().includes(stepClean)
      );
      if (!exists) {
        const offsetDays = defaultStageOffsets[step.sortOrder] ?? (step.sortOrder * 3);
        const milestoneDate = new Date(planStartDate.getTime() + offsetDays * 86_400_000);
        planStepEvents.push({
          id: `step-${step.id || step.sortOrder}`,
          title: step.name,
          date: milestoneDate,
          time: "09:00 AM",
          type: "milestone",
          status: step.status === "DONE" ? "Completed" : step.status === "CURRENT" ? "In Progress" : "Scheduled",
          category: "Milestone",
          isCareLoop: true,
          isMilestone: true,
          raw: {
            id: `step-${step.id || step.sortOrder}`,
            title: step.name,
            status: step.status,
            category: "Milestone",
            due: milestoneDate.toISOString(),
            priority: "NORMAL",
            targetRole: "DOCTOR",
          } as any,
        });
      }
    }

    return [...taskEvents, ...planStepEvents, ...apptEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [tasks, appointments, p360?.header?.currentCarePlan, p360?.header?.currentTreatment, couple?.stage, default15Stages]);

  const handlePrev = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNext = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStartDate, end: calendarEndDate });

  const getEventsForDate = (date: Date) => events.filter((e) => isSameDay(e.date, date));

  const safeSelectedDate = selectedDate || currentDate || new Date();
  const selectedDayEvents = useMemo(() => getEventsForDate(safeSelectedDate), [events, safeSelectedDate]);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Card (8 cols): Care Calendar matching Image 2 */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
        <div>
          {/* Header matching Image 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F5F2FD] flex items-center justify-center text-[#7C5CE5]">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Care Calendar</h2>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleToday}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-gray-700 bg-gray-100/80 hover:bg-gray-100 border border-gray-200/50 cursor-pointer transition-colors"
              >
                Today
              </button>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80 border border-gray-200/50">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-gray-800 min-w-[70px] text-center">
                  {format(currentDate, "MMM") === "Sep" ? `Sept ${format(currentDate, "yyyy")}` : format(currentDate, "MMM yyyy")}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-1.5 rounded-full bg-[#7C5CE5] hover:bg-[#6D4CD4] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          </div>

          {/* Weekday headers: MON TUE WED THU FRI SAT SUN */}
          <div className="grid grid-cols-7 mb-2 px-1">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
              <div key={day} className="text-left px-2 py-1 text-[11px] font-bold text-gray-400 tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Month Grid */}
          <div className="grid grid-cols-7 border border-gray-100 rounded-2xl bg-gray-100/60 p-1 gap-px">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`p-2 min-h-[92px] bg-white transition-all flex flex-col justify-start gap-1 relative cursor-pointer ${
                    isSelected
                      ? "border-2 border-[#7C5CE5] rounded-xl bg-purple-50/20 z-10 shadow-xs"
                      : "border-2 border-transparent rounded-xl hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-center justify-start mb-0.5">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#7C5CE5] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                        {format(day, "d")}
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-medium pl-1 ${
                          !isCurrentMonth ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((e) => {
                      const style = getPillStyle(e);
                      const shortTitle = getShortEventTitle(e.title);
                      return (
                        <div
                          key={e.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedDate(day);
                            setSelectedEvent(e);
                          }}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-lg truncate flex items-center gap-1.5 transition-all hover:opacity-90 cursor-pointer ${style.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                          <span className="truncate">{shortTitle}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-gray-400 font-semibold pl-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Card (4 cols): Selected Day Details Companion Panel matching Image 2 */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
        <CalendarDayPanel
          date={safeSelectedDate}
          events={selectedDayEvents}
          onAddTask={() => setIsAddModalOpen(true)}
          couple={couple}
          p360={p360}
          onSaved={fetchCalendarData}
        />
      </div>

      {/* Add Care Task Modal */}
      <AddCareTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        couple={couple}
        defaultDate={selectedDate || currentDate}
        onSaved={fetchCalendarData}
      />

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onSaved={fetchCalendarData}
      />
    </div>
  );
}
