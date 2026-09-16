"use client";

import { useState, useEffect } from "react";
import { Calendar, RefreshCcw, FileText, Activity, ArrowRight, Play, Wand2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Couple, Appointment, CareTask } from "@/lib/demo-data";
import { AbhaSetupWizard } from "@/components/digital-health/abha-setup-wizard";
import { ConsultationModal } from "./consultation-modal";
import { PatientDocumentsModal } from "./patient-documents-modal";
import { PatientHistoryModal } from "./patient-history-modal";
import { clinicApi, type ClinicTask } from "@/lib/clinic-api";
import { toast } from "sonner";

export function AbdmStatusWidget({
  couple,
  p360,
  onRefresh,
}: {
  couple: Couple | any;
  p360?: any;
  onRefresh?: () => void;
}) {
  const primaryName = couple?.primary?.name?.split(" ")[0] || "Primary";
  const partnerName = couple?.partner?.name?.split(" ")[0] || "Partner";
  const [wizardOpen, setWizardOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleOpenWizard = (patientId: string) => {
    setActivePatientId(patientId);
    setWizardOpen(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
      toast.success("ABDM status and digital health records synced");
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const syncTimestamp = p360?.digitalHealth?.lastSynced
    ? new Date(p360.digitalHealth.lastSynced).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Today";

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-bold text-gray-900">ABDM Status</h2>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-[#866BE3] hover:text-[#7254d1] transition-colors p-1 rounded-md hover:bg-[#866BE3]/10"
            title="Refresh ABDM status"
          >
            <RefreshCcw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap items-center gap-y-3 gap-x-4">
            <div className="flex items-center gap-3">
              <span className="text-[#866BE3] font-medium text-sm">{primaryName}</span>
              {couple?.primary?.abdmConnected !== false ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-[#00A89D]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Connected
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenWizard(couple?.primary?.id || (couple?.id || "patient") + "_primary")}
                    className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors shadow-sm cursor-pointer active:scale-95"
                  >
                    Connect ABDM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenWizard(couple?.primary?.id || (couple?.id || "patient") + "_primary")}
                    className="border border-[#866BE3] text-[#866BE3] hover:bg-[#866BE3]/5 text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer active:scale-95"
                  >
                    Create ABHA
                  </button>
                </div>
              )}
            </div>
            
            {couple?.partner && (
              <div className="flex items-center gap-3">
                <span className="text-[#866BE3] font-medium text-sm">{partnerName}</span>
                {couple.partner.abdmConnected !== false ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#00A89D]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Connected
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenWizard(couple?.partner?.id || (couple?.id || "patient") + "_partner")}
                      className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors shadow-sm cursor-pointer active:scale-95"
                    >
                      Connect ABDM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenWizard(couple?.partner?.id || (couple?.id || "patient") + "_partner")}
                      className="border border-[#866BE3] text-[#866BE3] hover:bg-[#866BE3]/5 text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer active:scale-95"
                    >
                      Create ABHA
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500">Last synced: {syncTimestamp}</p>
        </div>

        <div className="mt-auto flex gap-3">
          <button
            type="button"
            onClick={() => setDocsModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-[11px] font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            Documents
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-[11px] font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            Patient History
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <AbhaSetupWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          patientId={activePatientId}
          connection={{
            connected: true,
            environment: "sandbox",
            demoLinkAllowed: true,
            message: "Connected to ABDM Sandbox",
            authMethods: []
          }}
          onCompleted={() => {
            setWizardOpen(false);
            onRefresh?.();
          }}
        />
      </div>

      <PatientDocumentsModal
        isOpen={docsModalOpen}
        onOpenChange={setDocsModalOpen}
        p360={p360}
        coupleId={couple?.id}
        patientId={couple?.primary?.id}
      />

      <PatientHistoryModal
        isOpen={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        p360={p360}
        couple={couple}
      />
    </>
  );
}

export function UpcomingSessionWidget({
  p360,
  couple,
  onSessionUpdated,
}: {
  p360?: any;
  couple?: any;
  onSessionUpdated?: () => void;
}) {
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [prepareMessage, setPrepareMessage] = useState<string | null>(null);

  const upcoming = p360?.summaryCards?.nextAppointment;
  const patientName = p360?.header?.patientName || couple?.primary?.name || "Patient";
  const partnerName = p360?.header?.partnerName || couple?.partner?.name;
  const treatmentName = p360?.header?.currentTreatment?.label || couple?.treatment || "Evaluation";
  const currentStage = p360?.header?.currentCarePlan?.stageName || couple?.stage || "Consultation";

  const handlePrepareMe = () => {
    setPrepareMessage(
      `Patient ${patientName} is in ${treatmentName} (${currentStage}). Review follicular tracking scan and confirm stimulation injections before starting consultation.`,
    );
    setTimeout(() => setPrepareMessage(null), 8000);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Upcoming Session</h2>
        </div>

        {upcoming ? (
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-2">
              {upcoming.startsAt ? new Date(upcoming.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Today"}
            </p>
            
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-gray-900">{upcoming.type}</h3>
              <span className="bg-[#00A89D]/10 text-[#00A89D] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#00A89D]/20">
                {upcoming.status}
              </span>
            </div>
            
            <p className="text-xs text-gray-500">{upcoming.doctorName}</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-500">No upcoming sessions</p>
          </div>
        )}

        {prepareMessage && (
          <div className="mt-3 p-2.5 bg-[#866BE3]/10 text-[#866BE3] border border-[#866BE3]/20 rounded-xl text-xs leading-relaxed">
            {prepareMessage}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setIsConsultModalOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-full bg-[#866BE3] text-white text-[11px] font-semibold hover:bg-[#7254d1] transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            Start Session
            <Play className="w-3 h-3 fill-current" />
          </button>
          <button
            type="button"
            onClick={handlePrepareMe}
            className="flex-1 py-2.5 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-[11px] font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            Prepare me
            <Wand2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <ConsultationModal
        isOpen={isConsultModalOpen}
        onOpenChange={setIsConsultModalOpen}
        appointment={upcoming}
        patientName={patientName}
        patientId={p360?.primaryPatient?.id || couple?.primary?.id}
        coupleId={couple?.id}
        partnerName={partnerName}
        treatmentName={treatmentName}
        currentStage={currentStage}
        onCompleted={onSessionUpdated}
      />
    </>
  );
}

export function UpcomingTasksWidget({
  p360,
  couple,
  onAddTask,
}: {
  p360?: any;
  couple?: any;
  onAddTask?: () => void;
}) {
  const [tasks, setTasks] = useState<ClinicTask[]>([]);
  const [loading, setLoading] = useState(false);

  const targetCoupleId = couple?.id || couple?.slug || p360?.couple?.id || p360?.couple?.slug;

  const loadTasks = () => {
    if (!targetCoupleId) return;
    setLoading(true);
    clinicApi
      .careCalendar(targetCoupleId)
      .then((res) => {
        const activeTasks = (res.tasks || []).filter(
          (t: ClinicTask) => t.status !== "completed",
        );
        setTasks(activeTasks);
      })
      .catch((err) => console.error("Failed to load couple tasks:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, [targetCoupleId]);

  const displayTasks = tasks.slice(0, 5);

  const handleToggleTask = async (task: ClinicTask) => {
    const nextStatus = task.status === "completed" ? "waiting" : "completed";
    try {
      await clinicApi.patchTask(task.id, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
      );
      toast.success(`Task marked as ${nextStatus}`);
    } catch (e) {
      console.error("Failed to toggle task status", e);
      toast.error("Failed to update task status");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Upcoming Tasks</h2>
        </div>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <span className="text-[11px] font-semibold bg-[#866BE3]/10 text-[#866BE3] px-2 py-0.5 rounded-full">
              {tasks.length} active
            </span>
          )}
          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="w-6 h-6 rounded-full border border-[#866BE3]/30 text-[#866BE3] hover:bg-[#866BE3]/10 flex items-center justify-center transition-colors"
              title="Add task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px]">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            Loading tasks...
          </div>
        ) : displayTasks.length > 0 ? (
          displayTasks.map((task, i) => (
            <div
              key={task.id || i}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100 gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggleTask(task)}
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    task.status === "completed"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-gray-300 hover:border-[#866BE3]"
                  }`}
                  title="Mark task completed"
                >
                  {task.status === "completed" && <span className="text-[10px]">✓</span>}
                </button>
                <div className="min-w-0">
                  <span className="font-medium text-xs text-gray-800 truncate block">
                    {task.title}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {task.category || "Care Task"}
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap shrink-0 px-2 py-0.5 rounded-full ${
                  task.status === "overdue" || task.status === "escalated"
                    ? "bg-red-50 text-red-600"
                    : "bg-purple-50 text-[#866BE3]"
                }`}
              >
                {task.due}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No upcoming tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
