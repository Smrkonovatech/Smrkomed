"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Info, Activity, HeartHandshake } from "lucide-react";

interface FertilityEstimateModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  percentage: number;
  patientAge?: number;
  treatmentName?: string;
}

export function FertilityEstimateModal({
  isOpen,
  onOpenChange,
  percentage,
  patientAge = 25,
  treatmentName = "IVF Cycle",
}: FertilityEstimateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Fertility Estimate Breakdown
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Clinical success probability model for {treatmentName}
            </p>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Main gauge score */}
          <div className="p-4 rounded-xl bg-[#F8F5FF] border border-[#866BE3]/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#866BE3] uppercase tracking-wider">
                Predicted Success Rate
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{percentage}%</p>
              <p className="text-xs text-gray-500 mt-1">
                Estimated chance of clinical pregnancy per embryo transfer cycle
              </p>
            </div>
            <div className="w-14 h-14 rounded-full bg-white border-2 border-[#866BE3] flex items-center justify-center font-extrabold text-lg text-[#866BE3] shadow-sm">
              {percentage}%
            </div>
          </div>

          {/* Key Clinical Determinants */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#866BE3]" />
              Contributing Factors
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">Maternal Age ({patientAge} years)</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    {patientAge < 35
                      ? "Favorable physiological ovarian reserve with optimal oocyte quality profile."
                      : "Standard ovarian stimulation protocol recommended based on maternal age."}
                  </p>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] shrink-0">
                  {patientAge < 30 ? "+15% High" : patientAge < 35 ? "+10% Optimal" : "Standard"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">Antral Follicle & Endocrine Profile</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Continuous follicular tracking during stimulation optimizes trigger timing and mature egg yield.
                  </p>
                </div>
                <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px] shrink-0">
                  Monitored
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">Care Loop & Medication Adherence</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Automated daily WhatsApp reminders ensure 100% timeliness for critical trigger and stimulation shots.
                  </p>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] shrink-0">
                  Active Loop
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Estimates are derived from age-stratified clinical IVF outcomes and patient baseline metrics. They serve as guidance for discussion with the primary physician.
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs"
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
