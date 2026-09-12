"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Activity, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const carePlanSteps = [
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
}

export function IvfJourneyModal({ isOpen, setIsOpen, currentStage }: IvfJourneyModalProps) {
  // Normalize and find the current step index
  const normalizedStage = (currentStage || "").replace(/^\d+\.\s*/, "");
  let currentStepIdx = carePlanSteps.findIndex(s => s.includes(normalizedStage));
  if (currentStepIdx === -1) currentStepIdx = 6; // Fallback to 6 if not found

  const [selectedStepIdx, setSelectedStepIdx] = useState(currentStepIdx);

  // Reset selected step to current stage when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStepIdx(currentStepIdx);
    }
  }, [isOpen, currentStepIdx]);

  const selectedStepName = carePlanSteps[selectedStepIdx]?.replace(/^\d+\s*/, "") || "Unknown Stage";
  const isSelectedCurrent = selectedStepIdx === currentStepIdx;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[1100px] w-full h-[85vh] p-0 overflow-hidden flex flex-col bg-white border-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            IVF Cycle Journey
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Timeline List */}
          <div className="w-[360px] shrink-0 overflow-y-auto px-6 pb-6">
            <div className="flex flex-col gap-1.5 mt-2">
              {carePlanSteps.map((step, idx) => {
                const isCompleted = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isSelected = idx === selectedStepIdx;

                return (
                  <div
                    key={step}
                    onClick={() => setSelectedStepIdx(idx)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      isSelected ? "bg-[#F3F0FF]" : "hover:bg-gray-50",
                      isSelected && !isCurrent && "bg-gray-100" // differentiate selected past/future from current
                    )}
                  >
                    <div className="text-gray-400 shrink-0">
                      {isCompleted || isCurrent ? (
                        <User className={cn("w-4 h-4", isSelected ? "text-[#866BE3]" : "text-gray-500")} />
                      ) : (
                        <Activity className={cn("w-4 h-4", isSelected ? "text-gray-600" : "text-gray-400")} />
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex-1 font-semibold text-[13px] truncate",
                        isSelected && isCurrent ? "text-[#866BE3]" : 
                        isSelected ? "text-gray-900" :
                        isCurrent ? "text-[#866BE3]" : 
                        isCompleted ? "text-gray-600" : "text-gray-400"
                      )}
                    >
                      {step}
                    </span>

                    {isCompleted && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full border border-green-200 text-green-600 text-[10px] font-bold tracking-wide bg-green-50">
                          Completed
                        </span>
                        {/* Mock Date */}
                      </div>
                    )}

                    {isCurrent && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#866BE3] text-[10px] font-bold tracking-wide">
                          Current Stage
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Dashboard */}
          <div className="flex-1 bg-white rounded-tl-[32px] shadow-[inset_1px_1px_4px_rgba(0,0,0,0.02)] border-l border-t border-gray-100 p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedStepName}</h2>
              {isSelectedCurrent ? (
                <span className="text-[#866BE3] text-[11px] font-bold tracking-wide">Current Stage</span>
              ) : selectedStepIdx < currentStepIdx ? (
                 <span className="px-2 py-0.5 rounded-full border border-green-200 text-green-600 text-[10px] font-bold tracking-wide bg-green-50">Completed</span>
              ) : (
                 <span className="px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 text-[10px] font-bold tracking-wide bg-gray-50">Upcoming</span>
              )}
            </div>

            <div className="flex gap-16 mb-8">
              <div>
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[13px]">Started</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">25 Aug 2026</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[13px]">Expected Completion</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">14 Sep 2026</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-[13px]">Coordinator</span>
                </div>
                <p className="font-bold text-gray-900 text-sm">Priya Sharma</p>
              </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-2 gap-6 mb-6 mt-2">
              <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col relative overflow-hidden">
                {/* Top Banner */}
                <div className="h-12 bg-[#F3F0FF] w-full" />
                
                {/* Overlapping Icon */}
                <div className="absolute top-6 left-5 w-12 h-12 rounded-full bg-[#866BE3] text-white flex items-center justify-center ring-4 ring-white shadow-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                
                <div className="pt-8 px-6 pb-6 mt-1">
                  <p className="text-[13px] text-gray-500 mb-0.5">Cycle Day</p>
                  <p className="text-xl font-bold text-gray-900">Day 7</p>
                  <p className="text-[12px] font-medium text-gray-400 mt-1">Total length: 14 days</p>
                </div>
              </div>

              <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col relative overflow-hidden">
                {/* Top Banner */}
                <div className="h-12 bg-[#F3F0FF] w-full" />
                
                {/* Overlapping Icon */}
                <div className="absolute top-6 left-5 w-12 h-12 rounded-full bg-[#866BE3] text-white flex items-center justify-center ring-4 ring-white shadow-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                
                <div className="pt-8 px-6 pb-6 mt-1">
                  <p className="text-[13px] text-gray-500 mb-0.5">Next Appointment</p>
                  <p className="text-xl font-bold text-gray-900">Follicular Scan</p>
                  <p className="text-[12px] font-medium text-gray-400 mt-1">10 Sep 2026</p>
                </div>
              </div>
            </div>

            {/* Bottom Cards */}
            <div className="grid grid-cols-2 gap-4 pb-8">
              {/* Clinical Data */}
              <div className="bg-[#F8F9FA] rounded-[20px] p-6 border border-gray-100 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-4 h-4 text-[#866BE3]" />
                  <h3 className="font-bold text-gray-900 text-[15px]">Clinical Data</h3>
                  <span className="text-[11px] text-gray-400">Latest</span>
                </div>

                <div className="flex flex-col gap-4 text-[13px] flex-1">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="font-bold text-gray-800">Right Ovary <span className="text-gray-500 font-medium">(Largest follicle)</span></span>
                    <span className="text-gray-900">18 mm</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="font-bold text-gray-800">Right Ovary <span className="text-gray-500 font-medium">(Total follicle)</span></span>
                    <span className="text-gray-900">4</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="font-bold text-gray-800">Left Ovary <span className="text-gray-500 font-medium">(Total follicle)</span></span>
                    <span className="text-gray-900">16 mm</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="font-bold text-gray-800">Left Ovary <span className="text-gray-500 font-medium">(Total follicle)</span></span>
                    <span className="text-gray-900">3</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="font-bold text-gray-800">Endometrium</span>
                    <span className="text-gray-900">8.2 mm</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="font-bold text-gray-800">Estradiol (E2)</span>
                    <span className="text-gray-900">14560 pg/mL</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Progesterone</span>
                    <span className="text-gray-900">0.4 ng/mL</span>
                  </div>
                </div>
              </div>

              {/* Today's Tasks */}
              <div className="bg-[#F8F9FA] rounded-[20px] p-6 border border-gray-100 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-4 h-4 text-[#866BE3]" />
                  <h3 className="font-bold text-gray-900 text-[15px]">Today's Tasks</h3>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <div>
                      <p className="font-bold text-[13px] text-gray-900 mb-0.5">Morning Injection</p>
                      <p className="text-[11px] text-gray-500">10:00 PM</p>
                    </div>
                    <button className="text-[#866BE3] text-[11px] font-bold hover:underline">Mark as completed</button>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-gray-200 relative">
                    <div>
                      <p className="font-bold text-[13px] text-gray-900 mb-0.5">Evening Injection</p>
                      <p className="text-[11px] text-gray-500">4:00 PM</p>
                    </div>
                    <button className="text-[#866BE3] text-[11px] font-bold hover:underline">Mark as completed</button>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[13px] text-gray-900 mb-0.5">Monitor for side effects</p>
                      <p className="text-[11px] text-gray-500">Repeating</p>
                    </div>
                    <button className="text-[#866BE3] text-[11px] font-bold hover:underline">Mark as completed</button>
                  </div>

                  <div className="mt-auto text-center pt-8">
                    <p className="text-[11px] text-gray-400">End of today's tasks</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
