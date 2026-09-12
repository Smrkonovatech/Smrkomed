"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Couple } from "@/lib/demo-data";
import { IvfJourneyModal } from "./ivf-journey-modal";

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

export function IvfCycleWidget({ couple }: { couple: Couple }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentStage = couple.stage;
  const currentStepIdx = carePlanSteps.findIndex(s => s === currentStage);
  const nextStage = currentStepIdx >= 0 && currentStepIdx < carePlanSteps.length - 1 ? carePlanSteps[currentStepIdx + 1] : "Complete";

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
          <div className="absolute inset-0 m-auto w-24 h-24 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white overflow-hidden shadow-sm flex items-center justify-center mb-1 z-10">
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
            <div className="text-center text-[13px] font-bold text-[#4B3F72] leading-tight max-w-[100px] truncate">
              {currentStage.split('. ')[1] || currentStage}
            </div>
          </div>

          {/* Nodes around the circle (Radius = 100, Center = 120,120) */}
          <CycleNode label="Consultation" angle={-90} active={currentStage.includes("Consultation") || currentStage.includes("Initial")} labelPos="top" />
          <CycleNode label="Baseline" angle={-30} active={currentStage.includes("Baseline")} />
          <CycleNode label="Monitoring" angle={30} active={currentStage.includes("Monitoring")} />
          <CycleNode label="Procedure" angle={90} active={currentStage.includes("OPU") || currentStage.includes("Retrieval")} labelPos="bottom" />
          <CycleNode label="Transfer" angle={150} active={currentStage.includes("Transfer")} />
          <CycleNode label="Follow up" angle={210} active={currentStage.includes("Beta HCG")} />
        </div>

        {/* Right side info & Illustration */}
        <div className="flex flex-col justify-start h-[240px] relative z-10 w-[220px]">
          <div className="text-left w-full z-20 pt-4 pl-4">
            <p className="text-xs text-gray-600 mb-1">Next Stage:</p>
            <p className="text-sm font-bold text-gray-900 truncate">
              {nextStage?.split('. ')?.[1] || nextStage || "Complete"}
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
    <IvfJourneyModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} currentStage={currentStage} />
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
