"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, History, Activity, Stethoscope, AlertTriangle } from "lucide-react";

interface PatientHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  p360?: any;
  couple?: any;
}

export function PatientHistoryModal({
  isOpen,
  onOpenChange,
  p360,
  couple,
}: PatientHistoryModalProps) {
  const patientName = p360?.header?.patientName || couple?.primary?.name || "Patient";
  const partnerName = p360?.header?.partnerName || couple?.partner?.name;
  const historyItems = p360?.timeline?.items || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Patient Medical History & Timeline
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive clinical chronological chart for {patientName} {partnerName ? `& ${partnerName}` : ""}
            </p>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Baseline summary info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500 font-medium">Treatment Regimen</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">
                {p360?.header?.currentTreatment?.label || couple?.treatment || "Fertility Protocol"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500 font-medium">Attending Physician</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">
                {p360?.header?.assignedDoctor || couple?.doctor || "Doctor"}
              </p>
            </div>
          </div>

          {/* Past Clinical Events */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#866BE3]" />
              Historical Records & Consultations
            </h4>

            {historyItems.length > 0 ? (
              <div className="relative pl-6 space-y-4 border-l-2 border-purple-100 ml-2">
                {historyItems.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#866BE3] group-hover:scale-125 transition-transform" />
                    <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900">{item.title}</span>
                        <span className="text-[10px] text-gray-400">
                          {item.date ? new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </span>
                      </div>
                      {item.content && (
                        <p className="text-gray-600 text-[11px] leading-relaxed mt-1">{item.content}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-gray-500">
                          {item.type || "Clinical Event"}
                        </Badge>
                        {item.actor && (
                          <span className="text-[10px] text-gray-400">• By {item.actor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed rounded-xl border-gray-200">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-600">No prior clinical history entries</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Recorded consultations and diagnostic updates will populate this chronological ledger.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
