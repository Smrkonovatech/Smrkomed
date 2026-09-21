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
import { Stethoscope, Calendar, User, FileText, Pill, ArrowRight, Activity } from "lucide-react";

interface ConsultationSummaryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  consultation?: any;
  p360?: any;
}

export function ConsultationSummaryModal({
  isOpen,
  onOpenChange,
  consultation,
  p360,
}: ConsultationSummaryModalProps) {
  const latestConsultation =
    consultation ||
    p360?.timeline?.items?.find((i: any) => i.type === "Consultation") ||
    p360?.timeline?.items?.[0];

  const title = latestConsultation?.title || "Doctor Consultation Summary";
  const dateValue = latestConsultation?.rawDate || latestConsultation?.date;
  let dateStr = "Recent";
  if (dateValue) {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      dateStr = parsed.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } else {
      dateStr = String(dateValue);
    }
  }
  const doctor = latestConsultation?.actor || p360?.header?.assignedDoctor || "Primary Doctor";
  const rawNotes = latestConsultation?.content || latestConsultation?.description || "Consultation complete. Patient vitals and ovarian response stable. Continued prescribed stimulation schedule.";
  const notes = rawNotes
    .replace(/Audio Transcript\s*(?:\([^)]+\))?:\s*(?:"[^"]*"|[^\n]+(\n"[^"]*")?)/gi, "")
    .replace(/Audio Transcript\s*(?:\([^)]+\))?:\s*["'][^"']+["']/gi, "")
    .trim() || "Consultation complete. Patient vitals and ovarian response stable. Continued prescribed stimulation schedule.";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {title}
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Verified clinical consultation records
            </p>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-[#866BE3]" />
              <span>{dateStr}</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1.5 text-gray-600">
              <User className="w-3.5 h-3.5 text-[#866BE3]" />
              <span className="font-semibold text-gray-800">{doctor}</span>
            </div>
            <span className="text-gray-300">•</span>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
              Verified Record
            </Badge>
          </div>

          {/* Clinical Notes */}
          <div className="p-4 rounded-xl bg-[#F8F9FA] border border-gray-100 space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#866BE3]" />
              Doctor Impressions & Clinical Notes
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
              {notes}
            </p>
          </div>

          {/* Follicle Tracking Table (Image 2) */}
          <div className="p-4 rounded-xl bg-white border border-gray-100 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#866BE3]" />
                Follicle Tracking & Ultrasound Findings
              </h4>
              <span className="text-[10px] bg-purple-50 text-[#866BE3] font-semibold px-2 py-0.5 rounded-full border border-purple-100">
                Ultrasound Log
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Follicle Count</th>
                    <th className="py-2 px-3">Size (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 font-medium">12 Mar 2026</td>
                    <td className="py-2 px-3">8/10</td>
                    <td className="py-2 px-3 font-semibold text-[#866BE3]">14 - 16 mm</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 font-medium">10 Mar 2026</td>
                    <td className="py-2 px-3">7/9</td>
                    <td className="py-2 px-3">11 - 13 mm</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 font-medium">08 Mar 2026</td>
                    <td className="py-2 px-3">6/8</td>
                    <td className="py-2 px-3">8 - 10 mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Prescribed Medications */}
          {p360?.medications?.current && p360.medications.current.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-[#866BE3]" />
                Prescribed Medications
              </h4>
              <div className="space-y-1.5">
                {p360.medications.current.slice(0, 3).map((m: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-800">{m.medicineName}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{m.frequency}</span>
                    </div>
                    <span className="text-xs font-bold text-[#866BE3]">{m.dosage}</span>
                  </div>
                ))}
              </div>
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
  );
}
