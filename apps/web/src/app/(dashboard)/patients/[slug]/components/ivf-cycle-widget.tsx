"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, User, Pencil, Check, Sparkles, GitBranch, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { IvfJourneyModal } from "./ivf-journey-modal";
import { EditTreatmentModal } from "./edit-treatment-modal";
import { AssignCareJourneyModal } from "./assign-care-journey-modal";

const default15Stages = [
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
];

export function IvfCycleWidget({
  couple,
  p360,
  onTreatmentUpdated,
}: {
  couple: { stage: string } | any;
  p360?: any;
  onTreatmentUpdated?: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetModalStage, setTargetModalStage] = useState<string | undefined>(undefined);

  // Check if an active care plan or active treatment journey is assigned
  const hasJourneyAssigned = Boolean(
    p360?.header?.currentCarePlan ||
      (p360?.header?.currentTreatment &&
        p360.header.currentTreatment.status !== "PENDING" &&
        p360.header.currentTreatment.stageName) ||
      (couple?.stage && couple?.treatment && couple.treatment !== "Pending" && couple.treatment !== "Unassigned")
  );

  // 1. Resolve steps from active care plan or fallback
  const dbSteps = p360?.header?.currentCarePlan?.steps || [];
  const sortedSteps =
    dbSteps.length > 0
      ? [...dbSteps].sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      : [];

  const carePlanStepsArr =
    sortedSteps.length > 0
      ? sortedSteps.map((s: any) => s.name)
      : default15Stages;

  // 2. Resolve current active stage index dynamically from care plan, treatment, and calendar
  let currentStageIndex = 6; // Default to Stage 7 (Ovarian Stimulation) for active IVF cycle

  if (typeof p360?.header?.currentTreatment?.stageIndex === "number" && p360.header.currentTreatment.stageIndex >= 0) {
    currentStageIndex = Math.min(p360.header.currentTreatment.stageIndex, carePlanStepsArr.length - 1);
  } else if (typeof p360?.header?.currentCarePlan?.stageIndex === "number" && p360.header.currentCarePlan.stageIndex >= 0) {
    currentStageIndex = Math.min(p360.header.currentCarePlan.stageIndex, carePlanStepsArr.length - 1);
  } else if (typeof couple?.stageIndex === "number" && couple.stageIndex >= 0) {
    currentStageIndex = Math.min(couple.stageIndex, carePlanStepsArr.length - 1);
  } else {
    const activeStepIdx = sortedSteps.findIndex(
      (s: any) => s.status === "CURRENT" || s.status === "IN_PROGRESS"
    );
    if (activeStepIdx !== -1) {
      currentStageIndex = activeStepIdx;
    } else {
      const findFuzzyStage = (name?: string) => {
        if (!name) return -1;
        const clean = name.toLowerCase().replace(/^\d+[\.\s]*/, "").replace(/[^a-z0-9]/g, "");
        if (!clean) return -1;
        return carePlanStepsArr.findIndex((s) => {
          const stepClean = s.toLowerCase().replace(/^\d+[\.\s]*/, "").replace(/[^a-z0-9]/g, "");
          return stepClean.includes(clean) || clean.includes(stepClean);
        });
      };

      const tIdx = findFuzzyStage(p360?.header?.currentTreatment?.stageName);
      if (tIdx !== -1) {
        currentStageIndex = tIdx;
      } else {
        const cpIdx = findFuzzyStage(p360?.header?.currentCarePlan?.stageName);
        if (cpIdx !== -1) {
          currentStageIndex = cpIdx;
        } else {
          const cIdx = findFuzzyStage(couple?.stage);
          if (cIdx !== -1) currentStageIndex = cIdx;
        }
      }
    }
  }

  // Ensure index is within valid bounds
  currentStageIndex = Math.max(0, Math.min(currentStageIndex, carePlanStepsArr.length - 1));

  const currentStageName = carePlanStepsArr[currentStageIndex] || "07. Ovarian Stimulation";
  const cleanCurrentName = currentStageName.replace(/^\d+[\.\-\s]*/, "");
  const nextStageName =
    currentStageIndex + 1 < carePlanStepsArr.length
      ? carePlanStepsArr[currentStageIndex + 1]
      : "15. Outcome";
  const cleanNextName = nextStageName?.replace(/^\d+[\.\-\s]*/, "") || "Outcome";

  const completedCount = currentStageIndex;
  const totalStages = carePlanStepsArr.length;
  const progressPercent = Math.round((completedCount / totalStages) * 100);

  const handleOpenStage = (stageName?: string) => {
    setTargetModalStage(stageName);
    setIsModalOpen(true);
  };

  return (
    <>
      {!hasJourneyAssigned ? (
        /* ============================================================
           UNASSIGNED STATE: Show "Assign Care Journey" Card
           ============================================================ */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden h-full flex flex-col justify-between">
          <div className="flex justify-between items-start z-10 relative">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Care Journey</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Unassigned
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Standardized clinical protocol & automated care loop
              </p>
            </div>
          </div>

          <div className="my-6 flex flex-col items-center text-center px-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#866BE3]/10 border border-[#866BE3]/20 flex items-center justify-center text-[#866BE3] mb-3 shadow-inner">
              <GitBranch className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No Care Journey Assigned</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm leading-relaxed">
              Select a clinical care pathway (IVF Standard, Donor, FET, IUI) to generate automated stage milestones, calendar tasks, and patient communication.
            </p>
          </div>

          <div className="pt-2 z-10 relative">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="w-full bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Assign Care Journey
            </button>
          </div>
        </div>
      ) : (
        /* ============================================================
           ASSIGNED STATE: 15-Stage Circle Journey Widget (Image 1)
           ============================================================ */
        <div className="bg-[#F8F9FA] rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden h-full flex flex-col">
          <div className="flex justify-between items-start mb-4 z-10 relative">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {p360?.header?.currentTreatment?.kind === "IUI" ? "IUI Cycle" : "IVF Cycle"}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#866BE3]/10 text-[#866BE3]">
                  Stage {currentStageIndex + 1} of {totalStages}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {totalStages}-Stage Personalized Clinical Care Loop
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-gray-500 hover:text-[#866BE3] text-xs font-semibold flex items-center gap-1 transition-colors active:scale-98 cursor-pointer"
                title="Change Care Journey Template"
              >
                <Layers className="w-3.5 h-3.5" /> Change
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-gray-500 hover:text-[#866BE3] text-xs font-semibold flex items-center gap-1 transition-colors active:scale-98 cursor-pointer"
                title="Doctor: Edit Treatment Protocol"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleOpenStage(currentStageName)}
                className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1] transition-colors active:scale-98 cursor-pointer"
              >
                View full timeline <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        <div className="flex-1 flex justify-center items-center gap-6 relative z-10 w-full max-w-[700px] mx-auto">
          {/* Cycle Diagram with all 15 stages plotted radially */}
          <div className="relative w-[250px] h-[250px] flex-shrink-0 my-1">
            {/* Soft circle background & SVG progress track */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 250 250">
              <circle
                cx="125"
                cy="125"
                r="95"
                className="stroke-[#EBE5FF]"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="125"
                cy="125"
                r="95"
                className="stroke-[#866BE3]"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 95}`}
                strokeDashoffset={`${2 * Math.PI * 95 * (1 - (currentStageIndex / (totalStages - 1)))}`}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Inner glow circle */}
            <div className="absolute inset-0 m-auto w-[160px] h-[160px] bg-gradient-to-tr from-[#F4EFFF] to-[#EAE4FF] rounded-full shadow-inner pointer-events-none" />

            {/* Center Content Button */}
            <button
              type="button"
              onClick={() => handleOpenStage(currentStageName)}
              className="absolute inset-0 m-auto w-[114px] h-[114px] flex items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer group z-20 border-2 border-white overflow-hidden p-2"
              title={`Current stage: ${cleanCurrentName}. Click to view details.`}
            >
              <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                <Image
                  src="/images/dashboard/patient.png"
                  alt="Patient"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </button>

            {/* Radial Nodes for all 15 stages */}
            {carePlanStepsArr.map((stageTitle, idx) => {
              const total = carePlanStepsArr.length;
              // Start at top (-90 deg), clockwise
              const angleDeg = -90 + (idx * 360) / total;
              const radius = 95;
              const radian = (angleDeg * Math.PI) / 180;
              const cx = 125;
              const cy = 125;
              const x = cx + radius * Math.cos(radian);
              const y = cy + radius * Math.sin(radian);

              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const stageNum = idx + 1;

              return (
                <button
                  type="button"
                  key={stageTitle}
                  onClick={() => handleOpenStage(stageTitle)}
                  style={{ left: `${x}px`, top: `${y}px` }}
                  title={`${stageTitle} (${isCurrent ? "Current Active Stage" : isCompleted ? "Completed" : "Upcoming"})`}
                  className={cn(
                    "absolute flex items-center justify-center w-6 h-6 -ml-3 -mt-3 rounded-full text-[10px] font-bold transition-all cursor-pointer focus:outline-none",
                    isCompleted &&
                      "bg-[#866BE3] text-white shadow-xs hover:scale-125 border-2 border-white z-10",
                    isCurrent &&
                      "bg-[#7C5CEB] text-white shadow-md ring-4 ring-[#866BE3]/30 scale-135 z-30 font-extrabold animate-pulse",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-white text-gray-400 border border-gray-200 hover:border-[#866BE3] hover:text-[#866BE3] hover:scale-125 z-10"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isCurrent ? (
                    <User className="w-3 h-3" />
                  ) : (
                    stageNum
                  )}
                </button>
              );
            })}
          </div>

          {/* Right side info & Illustration */}
          <div className="flex flex-col justify-between h-[240px] relative z-10 w-[240px]">
            <div className="text-left w-full z-20 pt-1 pl-1 space-y-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Next Stage
                </span>
                <p className="text-sm font-bold text-gray-900 truncate mt-0.5">
                  {cleanNextName}
                </p>
                <p className="text-[11px] text-[#866BE3] font-medium">
                  {currentStageIndex === 6 ? "Due 22 Sept 2026" : "Upcoming in 3 days"}
                </p>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                  <span>Cycle Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#866BE3] h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {completedCount} of {totalStages} milestones completed
                </p>
              </div>
            </div>

            <div className="absolute -bottom-1 -right-2 w-[150px] h-[130px] pointer-events-none z-10">
              <Image
                src="/images/dashboard/patient.png"
                alt="Patient and Doctor"
                fill
                className="object-contain object-bottom right-0"
                priority
              />
            </div>
          </div>
          </div>
        </div>
      )}

      <AssignCareJourneyModal
        isOpen={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        coupleId={couple?.id || couple?.slug || p360?.couple?.id}
        patientName={p360?.header?.patientName || couple?.primary?.name || "Patient"}
        onAssigned={() => {
          onTreatmentUpdated?.();
        }}
      />

      <IvfJourneyModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        currentStage={targetModalStage || currentStageName}
        steps={carePlanStepsArr}
        couple={couple}
        p360={p360}
        onTreatmentUpdated={onTreatmentUpdated}
      />

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
    </>
  );
}
