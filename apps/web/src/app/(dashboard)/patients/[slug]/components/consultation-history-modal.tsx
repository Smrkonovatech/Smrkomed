"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Calendar, User, ArrowRight, Activity, Plus } from "lucide-react";
import { ConsultationSummaryModal } from "./consultation-summary-modal";

interface ConsultationHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  p360?: any;
  onStartNewSession?: () => void;
}

export function ConsultationHistoryModal({
  isOpen,
  onOpenChange,
  p360,
  onStartNewSession,
}: ConsultationHistoryModalProps) {
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  const history = p360?.timeline?.items?.filter(
    (i: any) => i.type === "Consultation" || i.type === "Appointment"
  ) || [];

  const handleSelect = (item: any) => {
    setSelectedConsultation(item);
    setSummaryModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Doctor Consultations & Visits
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete history of clinical appointments and doctor interactions
                </p>
              </div>
            </div>

            {onStartNewSession && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onStartNewSession();
                }}
                className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs h-8 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Session
              </Button>
            )}
          </DialogHeader>

          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {history.length > 0 ? (
              history.map((item: any, idx: number) => {
                const dateStr = item.date
                  ? new Date(item.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Recorded visit";

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelect(item)}
                    className="p-4 rounded-xl border border-gray-100 hover:border-[#866BE3]/40 bg-white hover:bg-gray-50/50 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-gray-900 truncate">{item.title}</span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 font-medium bg-purple-50 text-[#866BE3]"
                        >
                          {item.type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {dateStr}
                        </span>
                        {item.actor && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" />
                            {item.actor}
                          </span>
                        )}
                      </div>

                      {item.content && (
                        <p className="text-[11px] text-gray-600 line-clamp-1 mt-1.5">{item.content}</p>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#866BE3] transition-colors shrink-0" />
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center border border-dashed rounded-xl border-gray-200">
                <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-600">No consultation history recorded yet</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Start a consultation session to record doctor notes and prescriptions.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsultationSummaryModal
        isOpen={summaryModalOpen}
        onOpenChange={setSummaryModalOpen}
        consultation={selectedConsultation}
        p360={p360}
      />
    </>
  );
}
