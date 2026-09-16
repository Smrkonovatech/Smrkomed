"use client";

import { useState } from "react";
import { Info, ArrowRight } from "lucide-react";
import { FertilityEstimateModal } from "./fertility-estimate-modal";

export function FertilityEstimateWidget({ p360, couple }: { p360?: any; couple?: any }) {
  const [modalOpen, setModalOpen] = useState(false);

  const patientAge = p360?.header?.age || couple?.primary?.age || 25;
  
  // Clinically grounded age-stratified IVF success probability
  const percentage =
    patientAge < 30 ? 72 :
    patientAge < 35 ? 65 :
    patientAge < 38 ? 52 :
    patientAge < 40 ? 38 :
    patientAge < 43 ? 24 : 15;

  const stroke = 12;
  const arcLength = Math.PI * 60;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Fertility Estimate
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Click to view estimate breakdown"
            >
              <Info className="w-4 h-4" />
            </button>
          </h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {/* SVG Semi-Circle Gauge */}
          <div className="relative w-[140px] h-[80px] flex items-end justify-center mb-6 mt-4">
            <svg
              width="140"
              height="80"
              viewBox="0 0 140 80"
              className="absolute top-0 left-0"
            >
              {/* Background Track */}
              <path
                d="M 10 70 A 60 60 0 0 1 130 70"
                fill="none"
                stroke="#F3F0FF"
                strokeWidth={stroke}
                strokeLinecap="round"
              />
              {/* Progress Track */}
              <path
                d="M 10 70 A 60 60 0 0 1 130 70"
                fill="none"
                stroke="#866BE3"
                strokeWidth={stroke}
                strokeDasharray={arcLength}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            
            <div className="z-10 pb-1">
              <span className="text-3xl font-bold text-[#111827] leading-none tracking-tight">{percentage}%</span>
            </div>
          </div>

          <p className="text-sm text-center text-gray-500 max-w-[160px] leading-relaxed mb-6 font-medium">
            Estimated chance of successful pregnancy
          </p>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-auto w-full py-2 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2 active:scale-98"
          >
            View details
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <FertilityEstimateModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        percentage={percentage}
        patientAge={patientAge}
        treatmentName={p360?.header?.currentTreatment?.label || couple?.treatment || "IVF Cycle"}
      />
    </>
  );
}
