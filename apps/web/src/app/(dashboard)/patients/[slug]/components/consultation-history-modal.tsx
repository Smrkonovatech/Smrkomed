"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  Calendar,
  User,
  ArrowRight,
  Activity,
  Plus,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";
import { ConsultationSummaryModal } from "./consultation-summary-modal";

interface ConsultationHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  p360?: any;
  coupleId?: string;
  onStartNewSession?: () => void;
}

export function ConsultationHistoryModal({
  isOpen,
  onOpenChange,
  p360,
  coupleId,
  onStartNewSession,
}: ConsultationHistoryModalProps) {
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [dbHistory, setDbHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Fetch consultation history from database when modal opens
  useEffect(() => {
    if (!isOpen || fetched) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const url = coupleId
          ? `/api/consultations/history?coupleId=${encodeURIComponent(coupleId)}`
          : "/api/consultations/history";
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDbHistory(json.data);
        }
      } catch (e) {
        console.warn("Failed to fetch consultation history:", e);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    };

    fetchHistory();
  }, [isOpen, coupleId, fetched]);

  // Reset fetched state when coupleId changes
  useEffect(() => {
    setFetched(false);
  }, [coupleId]);

  // Merge DB history with timeline items (DB records take priority)
  const timelineItems =
    p360?.timeline?.items?.filter(
      (i: any) => i.type === "Consultation" || i.type === "Appointment"
    ) || [];

  // Use DB history if available, otherwise fall back to timeline items
  const history = dbHistory.length > 0 ? dbHistory : timelineItems;

  const handleSelect = (item: any) => {
    setSelectedConsultation(item);
    setSummaryModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Previous Consultations
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete history of clinical consultations &amp; doctor visits
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <span className="text-[11px] font-semibold text-[#866BE3] bg-[#F4F0FC] px-2.5 py-1 rounded-full border border-[#E9E1F9]">
                  {history.length} {history.length === 1 ? "record" : "records"}
                </span>
              )}
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
            </div>
          </DialogHeader>

          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#866BE3] animate-spin mb-2" />
                <p className="text-xs text-gray-500 font-medium">Loading consultation history...</p>
              </div>
            ) : history.length > 0 ? (
              history.map((item: any, idx: number) => {
                const dateStr = item.rawDate
                  ? new Date(item.rawDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : item.date
                    ? (typeof item.date === "string" && item.date.includes(",")
                        ? item.date
                        : new Date(item.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }))
                    : "Recorded visit";

                const contentPreview = item.content
                  ? item.content.length > 150
                    ? item.content.substring(0, 150) + "..."
                    : item.content
                  : null;

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handleSelect(item)}
                    className="p-4 rounded-xl border border-gray-100 hover:border-[#866BE3]/40 bg-white hover:bg-[#FDFBFF] transition-all cursor-pointer flex items-start gap-4 group hover:shadow-sm"
                  >
                    {/* Date circle */}
                    <div className="flex flex-col items-center shrink-0 w-14 pt-0.5">
                      <div className="w-10 h-10 rounded-full bg-[#F4F0FC] text-[#866BE3] flex items-center justify-center border border-[#E9E1F9] group-hover:bg-[#866BE3] group-hover:text-white transition-colors">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 font-medium text-center leading-tight">
                        {item.rawDate
                          ? new Date(item.rawDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : item.date
                            ? item.date.split(" ").slice(0, 2).join(" ")
                            : ""}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-sm text-gray-900 truncate group-hover:text-[#866BE3] transition-colors">
                          {item.title || "Consultation"}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 font-semibold bg-[#F4F0FC] text-[#866BE3] border border-[#E9E1F9] shrink-0"
                        >
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                          {item.type || "Consultation"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {dateStr}
                        </span>
                        {item.actor && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="font-medium text-gray-700">{item.actor}</span>
                            </span>
                          </>
                        )}
                        {item.patientName && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-600 font-medium">{item.patientName}</span>
                          </>
                        )}
                      </div>

                      {contentPreview && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                          {contentPreview}
                        </p>
                      )}

                      {item.nextSteps && (
                        <div className="mt-1.5 text-[10px] text-[#866BE3] font-semibold flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Next steps recorded
                        </div>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#866BE3] transition-colors shrink-0 mt-3" />
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center border border-dashed rounded-xl border-gray-200 bg-gray-50/50">
                <div className="w-14 h-14 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">No consultation history recorded yet</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Start a consultation session to record doctor notes, prescriptions, and clinical summaries.
                </p>
                {onStartNewSession && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onStartNewSession();
                    }}
                    className="mt-4 text-xs text-[#866BE3] font-semibold hover:underline flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Start your first consultation
                  </button>
                )}
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
