"use client";

import { Info, ArrowRight } from "lucide-react";

export function FertilityEstimateWidget() {
  const percentage = 65;
  const stroke = 12;
  // For the path: M 10 70 A 60 60 0 0 1 130 70
  // Radius is 60, arc length of half circle = pi * r
  const arcLength = Math.PI * 60;
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Fertility Estimate
          <Info className="w-4 h-4 text-gray-400" />
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

        <button className="mt-auto w-full py-2 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2">
          View details
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
