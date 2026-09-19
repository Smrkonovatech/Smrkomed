"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { IvfJourneyModal } from "./ivf-journey-modal";

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

export function IvfCycleWidget({ couple, p360 }: { couple: { stage: string } | any, p360?: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  let currentStageName = p360?.header?.currentTreatment?.stageName || p360?.header?.currentCarePlan?.stageName || couple?.stage || "07. Ovarian Stimulation";
  let nextStageName = "08. Follicular Monitoring";
  let carePlanStepsArr = default15Stages;

  if (typeof p360?.header?.currentTreatment?.stageIndex === "number" && p360.header.currentTreatment.stageIndex >= 0) {
    const idx = Math.min(p360.header.currentTreatment.stageIndex, carePlanStepsArr.length - 1);
    currentStageName = carePlanStepsArr[idx] || currentStageName;
    nextStageName = idx + 1 < carePlanStepsArr.length ? (carePlanStepsArr[idx + 1] || "Complete") : "Complete";
  } else if (p360?.header?.currentCarePlan) {
    const steps = p360.header.currentCarePlan.steps || [];
    const sortedSteps = [...steps].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    if (sortedSteps.length > 0) {
      carePlanStepsArr = sortedSteps.map((s: any) => s.name);
    }
    
    const currentIndex = sortedSteps.findIndex((s: any) => s.status === "CURRENT" || s.status === "IN_PROGRESS");
    if (currentIndex !== -1) {
      currentStageName = sortedSteps[currentIndex].name;
      if (currentIndex + 1 < sortedSteps.length) {
        nextStageName = sortedSteps[currentIndex + 1].name;
      }
    } else {
      const pendingIndex = sortedSteps.findIndex((s: any) => s.status === "PENDING");
      if (pendingIndex !== -1) {
        currentStageName = sortedSteps[pendingIndex].name;
        if (pendingIndex + 1 < sortedSteps.length) {
          nextStageName = sortedSteps[pendingIndex + 1].name;
        }
      }
    }
  } else {
    const currentStepIdx = carePlanStepsArr.findIndex(s => s === currentStageName);
    nextStageName = currentStepIdx >= 0 && currentStepIdx < carePlanStepsArr.length - 1 ? (carePlanStepsArr[currentStepIdx + 1] || "Complete") : "Complete";
  }

  return (
    <>
    <div className="bg-[#F8F9FA] rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden h-full flex flex-col">
      <div className="flex justify-between items-start mb-6 z-10 relative">
        <h2 className="text-lg font-bold text-gray-900">IVF Cycle</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1] transition-colors"
        >
          View full timeline <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 flex justify-center items-center gap-10 relative z-10 w-full max-w-[700px] mx-auto mt-2">
        
        {/* Cycle Diagram */}
        <div className="relative w-[240px] h-[240px] flex-shrink-0 mt-2 mb-2">
          {/* Main filled circle background */}
          <div className="absolute inset-0 m-auto w-[180px] h-[180px] bg-[#EBE5FF] rounded-full" />
          
          {/* Center Content */}
          <div className="absolute inset-0 m-auto w-24 h-24 rounded-full overflow-hidden flex items-center justify-center p-2 bg-white shadow-md border-2 border-white">
            <Image 
              src="/images/dashboard/patient.png" 
              alt="Patient" 
              fill 
              className="object-contain"
            />
          </div>

          {/* Nodes around the circle (Radius = 100, Center = 120,120) */}
          <CycleNode label="Consultation" angle={-90} active={currentStageName.includes("Consultation") || currentStageName.includes("Initial")} labelPos="top" />
          <CycleNode label="Baseline" angle={-30} active={currentStageName.includes("Baseline")} />
          <CycleNode label="Monitoring" angle={30} active={currentStageName.includes("Monitoring")} />
          <CycleNode label="Procedure" angle={90} active={currentStageName.includes("OPU") || currentStageName.includes("Retrieval")} labelPos="bottom" />
          <CycleNode label="Transfer" angle={150} active={currentStageName.includes("Transfer")} />
          <CycleNode label="Follow up" angle={210} active={currentStageName.includes("Beta HCG")} />
        </div>

        {/* Right side info & Illustration */}
        <div className="flex flex-col justify-start h-[240px] relative z-10 w-[220px]">
          <div className="text-left w-full z-20 pt-1 pl-2 space-y-1">
            <p className="text-xs text-gray-600 font-medium">Next Stage:</p>
            <p className="text-sm font-bold text-gray-900 truncate">
              {nextStageName?.split('. ')?.[1] || nextStageName || "Complete"}
            </p>
          </div>
          
          <div className="absolute -bottom-2 -right-2 w-[160px] h-[140px] pointer-events-none z-10">
            <Image 
              src="/images/dashboard/patient.png" 
              alt="Patient and Doctor" 
              fill 
              className="object-contain object-bottom right-0" 
            />
          </div>
        </div>

      </div>
    </div>
    <IvfJourneyModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} currentStage={currentStageName} steps={carePlanStepsArr} />
    </>
  );
}

function CycleNode({ 
  label, 
  angle, 
  active, 
  labelPos = "bottom" 
}: { 
  label: string, 
  angle: number, 
  active: boolean,
  labelPos?: "top" | "bottom"
}) {
  // Radius of the track is 100
  const radius = 100;
  const radian = (angle * Math.PI) / 180;
  // center is 120, 120 (since container is 240x240)
  const cx = 120;
  const cy = 120;
  
  const x = cx + radius * Math.cos(radian);
  const y = cy + radius * Math.sin(radian);

  return (
    <div 
      className="absolute flex flex-col items-center justify-center w-20 -ml-10 -mt-10"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {labelPos === "top" && (
        <span className={cn(
          "text-[10px] mb-1.5 text-center font-bold px-1 rounded-sm whitespace-nowrap",
          active ? "text-[#866BE3]" : "text-gray-700"
        )}>
          {label}
        </span>
      )}

      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10 transition-colors border",
        active 
          ? "bg-[#866BE3] border-[#866BE3] text-white shadow-[#866BE3]/30 shadow-md scale-110 ring-4 ring-[#866BE3]/20" 
          : "bg-white border-gray-200 text-[#866BE3]"
      )}>
        {active ? (
          <User className="w-4 h-4" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        )}
      </div>

      {labelPos === "bottom" && (
        <span className={cn(
          "text-[10px] mt-1.5 text-center font-bold px-1 rounded-sm whitespace-nowrap",
          active ? "text-[#866BE3]" : "text-gray-700"
        )}>
          {label}
        </span>
      )}
    </div>
  );
}
