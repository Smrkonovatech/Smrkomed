"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, User, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { IvfJourneyModal } from "./ivf-journey-modal";
import { EditTreatmentModal } from "./edit-treatment-modal";

const carePlanSteps = [
  "01. Baseline",
  "02. Initial Consultation",
  "03. Pre-IVF Workup",
  "04. Monitoring",
  "05. Ovarian Stimulation",
  "06. Trigger Shot",
  "07. Egg Retrieval",
  "08. ICSI",
  "09. Embryo Culture",
  "10. Embryo Transfer",
  "11. Luteal Phase Support",
  "12. Beta HCG",
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
  const [targetModalStage, setTargetModalStage] = useState<string | undefined>(undefined);

  let currentStageName = couple?.stage || "Consultation";
  let nextStageName = "Complete";
  let carePlanStepsArr = carePlanSteps;

  if (p360?.header?.currentCarePlan) {
    const steps = p360.header.currentCarePlan.steps || [];
    const sortedSteps = [...steps].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    if (sortedSteps.length > 0) {
      carePlanStepsArr = sortedSteps.map((s: any) => s.name);
    }
    
    const currentIndex = sortedSteps.findIndex((s: any) => s.status === "IN_PROGRESS");
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
    const currentStepIdx = carePlanSteps.findIndex((s) => s === currentStageName);
    nextStageName = currentStepIdx >= 0 && currentStepIdx < carePlanSteps.length - 1 ? (carePlanSteps[currentStepIdx + 1] || "Complete") : "Complete";
  }

  const handleOpenStage = (stageName?: string) => {
    setTargetModalStage(stageName);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-[#F8F9FA] rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden h-full flex flex-col">
        <div className="flex justify-between items-start mb-6 z-10 relative">
          <h2 className="text-lg font-bold text-gray-900">IVF Cycle</h2>
          <div className="flex items-center gap-3">
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

        <div className="flex-1 flex justify-center items-center gap-10 relative z-10 w-full max-w-[700px] mx-auto mt-2">
          {/* Cycle Diagram */}
          <div className="relative w-[240px] h-[240px] flex-shrink-0 mt-2 mb-2">
            {/* Main filled circle background */}
            <div className="absolute inset-0 m-auto w-[180px] h-[180px] bg-[#EBE5FF] rounded-full" />
            
            {/* Center Content */}
            <button
              type="button"
              onClick={() => handleOpenStage(currentStageName)}
              className="absolute inset-0 m-auto w-24 h-24 flex flex-col items-center justify-center rounded-full hover:scale-105 transition-transform cursor-pointer group"
              title="Click to view current cycle stage details"
            >
              <div className="w-12 h-12 rounded-full bg-white overflow-hidden shadow-sm flex items-center justify-center mb-1 z-10 group-hover:ring-2 group-hover:ring-[#866BE3]">
                <Image 
                  src="/images/dashboard/patient.png" 
                  alt="Patient" 
                  width={48} 
                  height={48} 
                  className="object-cover"
                />
              </div>
              <div className="text-center text-[11px] text-gray-600 font-medium leading-none mb-0.5">
                Current:
              </div>
              <div className="text-center text-[13px] font-bold text-[#4B3F72] leading-tight max-w-[100px] truncate group-hover:text-[#866BE3]">
                {currentStageName.split('. ')[1] || currentStageName}
              </div>
            </button>

            {/* Nodes around the circle (Radius = 100, Center = 120,120) */}
            <CycleNode 
              label="Consultation" 
              angle={-90} 
              active={currentStageName.toLowerCase().includes("consultation") || currentStageName.toLowerCase().includes("initial")} 
              labelPos="top" 
              onClick={() => handleOpenStage("Consultation")}
            />
            <CycleNode 
              label="Baseline" 
              angle={-30} 
              active={currentStageName.toLowerCase().includes("baseline")} 
              onClick={() => handleOpenStage("Baseline")}
            />
            <CycleNode 
              label="Monitoring" 
              angle={30} 
              active={currentStageName.toLowerCase().includes("monitoring")} 
              onClick={() => handleOpenStage("Monitoring")}
            />
            <CycleNode 
              label="Procedure" 
              angle={90} 
              active={currentStageName.toLowerCase().includes("opu") || currentStageName.toLowerCase().includes("retrieval") || currentStageName.toLowerCase().includes("procedure")} 
              labelPos="bottom" 
              onClick={() => handleOpenStage("Procedure")}
            />
            <CycleNode 
              label="Transfer" 
              angle={150} 
              active={currentStageName.toLowerCase().includes("transfer")} 
              onClick={() => handleOpenStage("Transfer")}
            />
            <CycleNode 
              label="Follow up" 
              angle={210} 
              active={currentStageName.toLowerCase().includes("beta") || currentStageName.toLowerCase().includes("follow")} 
              onClick={() => handleOpenStage("Follow up")}
            />
          </div>

          {/* Right side info & Illustration */}
          <div className="flex flex-col justify-start h-[240px] relative z-10 w-[220px]">
            <div className="text-left w-full z-20 pt-4 pl-4">
              <p className="text-xs text-gray-600 mb-1">Next Stage:</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {nextStageName?.split('. ')?.[1] || nextStageName || "Complete"}
              </p>
            </div>
            
            <div className="absolute -bottom-6 -right-4 w-[220px] h-[220px] pointer-events-none z-0">
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

function CycleNode({ 
  label, 
  angle, 
  active, 
  labelPos = "bottom",
  onClick,
}: { 
  label: string; 
  angle: number; 
  active: boolean;
  labelPos?: "top" | "bottom";
  onClick?: () => void;
}) {
  const radius = 100;
  const radian = (angle * Math.PI) / 180;
  const cx = 120;
  const cy = 120;
  
  const x = cx + radius * Math.cos(radian);
  const y = cy + radius * Math.sin(radian);

  return (
    <button 
      type="button"
      onClick={onClick}
      className="absolute flex flex-col items-center justify-center w-20 -ml-10 -mt-10 cursor-pointer group hover:scale-110 transition-transform focus:outline-none"
      style={{ left: `${x}px`, top: `${y}px` }}
      title={`View ${label} stage`}
    >
      {labelPos === "top" && (
        <span className={cn(
          "text-[10px] mb-1.5 text-center font-bold px-1 rounded-sm whitespace-nowrap transition-colors",
          active ? "text-[#866BE3]" : "text-gray-700 group-hover:text-[#866BE3]"
        )}>
          {label}
        </span>
      )}

      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10 transition-all border",
        active 
          ? "bg-[#866BE3] border-[#866BE3] text-white shadow-[#866BE3]/30 shadow-md scale-110 ring-4 ring-[#866BE3]/20" 
          : "bg-white border-gray-200 text-[#866BE3] group-hover:border-[#866BE3]"
      )}>
        {active ? (
          <User className="w-4 h-4" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        )}
      </div>

      {labelPos === "bottom" && (
        <span className={cn(
          "text-[10px] mt-1.5 text-center font-bold px-1 rounded-sm whitespace-nowrap transition-colors",
          active ? "text-[#866BE3]" : "text-gray-700 group-hover:text-[#866BE3]"
        )}>
          {label}
        </span>
      )}
    </button>
  );
}
