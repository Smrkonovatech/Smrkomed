"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Activity, Calendar, CheckCircle2, Clock, Plus, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { clinicApi, type ClinicTask } from "@/lib/clinic-api";
import { EditTreatmentModal } from "./edit-treatment-modal";
import { toast } from "sonner";

const fallbackSteps = [
  "01 Lead Appointment",
  "02 Initial Consultation",
  "03 Fertility Workup (Tests)",
  "04 Treatment Decision",
  "05 Treatment Planning & Consent",
  "06 Cycle preparation",
  "07 Ovarian Stimulation",
  "08 Follicular Monitoring",
  "09 Trigger",
  "10 OPU / Egg Retrieval",
  "11 Embryology",
  "12 Transfer / FET",
  "13 Post-Transfer Care",
  "14 Pregnancy Test",
  "15 Outcome",
];

interface IvfJourneyModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentStage?: string;
  steps?: string[];
  couple?: any;
  p360?: any;
  onTreatmentUpdated?: (() => void) | undefined;
}

export function IvfJourneyModal({
  isOpen,
  setIsOpen,
  currentStage,
  steps,
  couple,
  p360,
  onTreatmentUpdated,
}: IvfJourneyModalProps) {
  const activeSteps = steps && steps.length > 0 ? steps : fallbackSteps;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Normalize and find current step index
  const normalizedStage = (currentStage || "").replace(/^\d+\.\s*/, "").toLowerCase();
  let currentStepIdx = activeSteps.findIndex((s) => s.toLowerCase().includes(normalizedStage) || normalizedStage.includes(s.toLowerCase()));
  if (currentStepIdx === -1) currentStepIdx = 0;

  const [selectedStepIdx, setSelectedStepIdx] = useState(currentStepIdx);
  const [tasks, setTasks] = useState<ClinicTask[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStepIdx(currentStepIdx);
    }
  }, [isOpen, currentStepIdx]);

  useEffect(() => {
    if (isOpen && (couple?.id || couple?.slug)) {
      const coupleKey = couple.id || couple.slug;
      clinicApi
        .careCalendar(coupleKey)
        .then((res) => {
          setTasks(res.tasks || []);
        })
        .catch(console.error);
    }
  }, [isOpen, couple?.id, couple?.slug]);

  const handleCompleteTask = async (taskId: string, taskTitle: string) => {
    setCompletingTaskId(taskId);
    try {
      await clinicApi.completeTask(taskId);
      toast.success(`"${taskTitle}" marked as completed`);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "completed" as const } : t))
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to complete task");
    } finally {
      setCompletingTaskId(null);
    }
  };

  const selectedStepName = activeSteps[selectedStepIdx]?.replace(/^\d+\.?\s*/, "") || "Unknown Stage";
  const isSelectedCurrent = selectedStepIdx === currentStepIdx;

  // Real care plan timing
  const carePlanCreatedAt = p360?.header?.currentCarePlan?.createdAt || couple?.since;
  const startDateStr = carePlanCreatedAt
    ? new Date(carePlanCreatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Day 1";
  
  const estimatedDays = 28;
  const daysPassed = carePlanCreatedAt
    ? Math.max(1, Math.floor((Date.now() - new Date(carePlanCreatedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  const coordinatorName = p360?.header?.assignedCoordinator || couple?.coordinator || "Care Coordinator";
  const nextAppt = p360?.summaryCards?.nextAppointment;

  // Real diagnostic findings
  const diagnosticTimelineItems = p360?.timeline?.items?.filter(
    (item: any) => item.type === "Diagnostic" || item.type === "Lab" || item.type === "Scan"
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[1100px] w-full h-[85vh] p-0 overflow-hidden flex flex-col bg-white border-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 shrink-0 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">
              IVF Cycle Journey & Clinical Milestones
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 bg-[#866BE3]/10 text-[#866BE3] rounded-full">
                {couple?.treatment || p360?.header?.currentTreatment?.label || "IVF"} • Stage {selectedStepIdx + 1} of {activeSteps.length}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs h-7 gap-1 border-[#866BE3]/30 text-[#866BE3] hover:bg-[#866BE3]/10 rounded-lg cursor-pointer"
                title="Doctor: Edit Treatment Protocol & Stage"
              >
                <Pencil className="w-3 h-3" />
                Edit Treatment
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Timeline List */}
          <div className="w-[360px] shrink-0 overflow-y-auto px-6 py-4 border-r border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">15 Cycle Milestones</p>
            <div className="flex flex-col gap-1.5">
              {activeSteps.map((step, idx) => {
                const isCompleted = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isSelected = idx === selectedStepIdx;

                return (
                  <button
                    type="button"
                    key={step}
                    onClick={() => setSelectedStepIdx(idx)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer w-full border border-transparent",
                      isSelected ? "bg-[#F3F0FF] border-[#866BE3]/20" : "hover:bg-gray-50",
                      isSelected && !isCurrent && "bg-gray-100 border-gray-200"
                    )}
                  >
                    <div className="text-gray-400 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <User className="w-4 h-4 text-[#866BE3]" />
                      ) : (
                        <Activity className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex-1 font-semibold text-[13px] truncate",
                        isSelected && isCurrent ? "text-[#866BE3]" : 
                        isSelected ? "text-gray-900" :
                        isCurrent ? "text-[#866BE3]" : 
                        isCompleted ? "text-gray-700" : "text-gray-400"
                      )}
                    >
                      {step}
                    </span>

                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full border border-green-200 text-green-700 text-[10px] font-bold bg-green-50 shrink-0">
                        Done
                      </span>
                    )}

                    {isCurrent && (
                      <span className="text-[#866BE3] text-[10px] font-bold shrink-0 bg-[#866BE3]/10 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column - Dashboard */}
          <div className="flex-1 bg-white p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">{selectedStepName}</h2>
              {isSelectedCurrent ? (
                <span className="bg-[#866BE3]/10 text-[#866BE3] text-xs font-bold px-3 py-1 rounded-full">Current Active Stage</span>
              ) : selectedStepIdx < currentStepIdx ? (
                 <span className="px-3 py-1 rounded-full border border-green-200 text-green-700 text-xs font-bold bg-green-50">Completed</span>
              ) : (
                 <span className="px-3 py-1 rounded-full border border-gray-200 text-gray-500 text-xs font-bold bg-gray-50">Upcoming Stage</span>
              )}
            </div>

            {/* Stage Info Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#866BE3]" />
                  <span>Cycle Start</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">{startDateStr}</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs">
                  <Clock className="w-3.5 h-3.5 text-[#866BE3]" />
                  <span>Cycle Timeline</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">Day {daysPassed} of ~{estimatedDays} days</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1 text-xs">
                  <User className="w-3.5 h-3.5 text-[#866BE3]" />
                  <span>Care Coordinator</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">{coordinatorName}</p>
              </div>
            </div>

            {/* Next Appointment Callout */}
            {nextAppt && (
              <div className="mb-6 p-4 rounded-xl bg-[#F8F5FF] border border-[#866BE3]/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#866BE3]">Next Scheduled Appointment</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{nextAppt.type}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {nextAppt.startsAt ? new Date(nextAppt.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Today"} • With {nextAppt.doctorName || "Doctor"}
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-xs">
                  {nextAppt.status}
                </Badge>
              </div>
            )}

            {/* Bottom Cards: Clinical Data & Tasks */}
            <div className="grid grid-cols-2 gap-6 pb-6">
              {/* Clinical Records for this Stage */}
              <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-gray-100 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-[#866BE3]" />
                  <h3 className="font-bold text-gray-900 text-sm">Clinical & Lab Findings</h3>
                </div>

                <div className="flex-1 space-y-3">
                  {diagnosticTimelineItems.length > 0 ? (
                    diagnosticTimelineItems.slice(0, 4).map((diag: any, i: number) => (
                      <div key={diag.id || i} className="p-3 bg-white rounded-xl border border-gray-100 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-800">{diag.title}</span>
                          <span className="text-[10px] text-gray-400">
                            {diag.date ? new Date(diag.date).toLocaleDateString() : ""}
                          </span>
                        </div>
                        {diag.content && (
                          <p className="text-gray-600 text-[11px]">{diag.content}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-xs border border-dashed rounded-xl bg-white/50">
                      <Activity className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                      <p>No lab measurements logged for this stage yet.</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Diagnostic orders reflect here automatically.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Real Tasks for this Stage */}
              <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#866BE3]" />
                    <h3 className="font-bold text-gray-900 text-sm">Active Stage Tasks</h3>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {tasks.filter((t) => t.status !== "completed").length} active
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 max-h-[300px] overflow-y-auto">
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-semibold truncate text-gray-800", task.status === "completed" && "line-through text-gray-400")}>
                            {task.title}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {task.category || "Care Task"} • {task.due || "Pending"}
                          </p>
                        </div>

                        {task.status !== "completed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={completingTaskId === task.id}
                            onClick={() => handleCompleteTask(task.id, task.title)}
                            className="h-7 text-[11px] font-semibold text-[#866BE3] border-[#866BE3]/30 hover:bg-[#866BE3]/10"
                          >
                            {completingTaskId === task.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Mark Done"
                            )}
                          </Button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Done
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-xs border border-dashed rounded-xl bg-white/50">
                      <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                      <p>All care loop tasks up to date.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>

      <EditTreatmentModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        coupleId={couple?.id || couple?.slug}
        patientName={p360?.header?.patientName}
        currentTreatment={p360?.header?.currentTreatment}
        onSaved={() => {
          onTreatmentUpdated?.();
        }}
      />
    </Dialog>
  );
}
