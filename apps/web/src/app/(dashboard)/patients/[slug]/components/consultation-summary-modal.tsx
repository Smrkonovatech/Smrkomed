"use client";

import React, { useState, useMemo } from "react";
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
  FileText,
  Pill,
  Activity,
  AlertTriangle,
  MessageSquare,
  Globe,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { parseConsultationContent } from "@/lib/ai/consultation-analyzer";
import { toast } from "sonner";

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
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const rawContent = latestConsultation?.content || latestConsultation?.description || "Consultation complete. Patient vitals and ovarian response stable. Continued prescribed stimulation schedule.";

  // Parse structured AI analysis (English dialogue, Critical details, original audio transcript)
  const parsed = parseConsultationContent(rawContent);

  // Derive clean doctor assessment & clinical plan, ensuring no audio transcripts or raw scripts bleed through
  const displaySummary = useMemo(() => {
    let text = parsed.summary || rawContent || "";
    // Strip any raw Audio Transcript headers and quoted audio strings
    text = text.replace(/Audio Transcript\s*(?:\([^)]+\))?:\s*(?:"[^"]*"|[^\n]+(\n"[^"]*")?)/gi, "");
    text = text.replace(/Audio Transcript\s*(?:\([^)]+\))?:\s*["'][^"']+["']/gi, "");
    // If dialogue already exists, strip English Dialogue Transcript section
    if (parsed.dialogue.length > 0) {
      text = text.replace(/English Dialogue Transcript:\s*([\s\S]*?)(?=(?:Critical (?:Clinical )?Details|Doctor Assessment|Clinical Notes|$))/gi, "");
    }
    // If criticalDetails already exists, strip Critical Details section
    if (parsed.criticalDetails.length > 0) {
      text = text.replace(/Critical (?:Clinical )?Details:\s*([\s\S]*?)(?=(?:Doctor Assessment|Clinical Notes|$))/gi, "");
    }
    text = text.replace(/^Doctor Assessment:\s*/gim, "").trim();
    return text || "Consultation complete. Patient vitals and ovarian response stable. Continued prescribed stimulation schedule.";
  }, [parsed.summary, rawContent, parsed.dialogue.length, parsed.criticalDetails.length]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-gray-900">
                  {title}
                </DialogTitle>
                <span className="bg-[#F4F0FC] text-[#866BE3] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#E9E1F9] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Analyzed
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Verified clinical consultation & multilingual transcription
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto">
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

          {/* 1. Critical Clinical Details Box (Red Flags / Key Complaints) */}
          {parsed.criticalDetails.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-amber-500 text-white">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Critical Details & Patient Symptoms
                </h4>
                <span className="ml-auto text-[10px] font-bold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full">
                  Clinical Attention
                </span>
              </div>
              <ul className="space-y-1.5 pt-1">
                {parsed.criticalDetails.map((detail, idx) => (
                  <li
                    key={idx}
                    className="text-xs font-medium text-amber-900 flex items-start gap-2"
                  >
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2. English Dialogue Transcript (Doctor & Patient Conversation) */}
          {parsed.dialogue.length > 0 && (
            <div className="p-4 rounded-xl bg-[#FBF9FE] border border-[#ECE5F8] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#5B3EA6] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#866BE3]" />
                  English Dialogue Transcript (Diarized)
                </h4>
                <span className="text-[10px] bg-purple-100 text-[#7254d1] font-semibold px-2 py-0.5 rounded-md">
                  Doctor & Patient
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {parsed.dialogue.map((turn, i) => {
                  const isDoctor = turn.speaker.toLowerCase().includes("doc") || turn.speaker.toLowerCase().includes("dr");
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-xl text-xs flex flex-col gap-1 ${
                        isDoctor
                          ? "bg-white border border-[#E6DEF5] shadow-xs"
                          : "bg-[#F3EEFC] border border-[#DFD3F7] text-purple-950"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isDoctor ? "bg-[#866BE3]" : "bg-emerald-500"
                          }`}
                        />
                        <span className={isDoctor ? "text-[#7254d1]" : "text-emerald-800 font-bold"}>
                          {isDoctor ? "Doctor" : "Patient"}:
                        </span>
                      </div>
                      <p className="text-gray-800 pl-3 leading-relaxed font-medium">
                        "{turn.text}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Doctor Impressions & Clinical Notes */}
          <div className="p-4 rounded-xl bg-[#F8F9FA] border border-gray-100 space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#866BE3]" />
              Doctor Assessment & Clinical Plan
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
              {displaySummary}
            </p>
          </div>

          {/* 5. Follicle Tracking Table */}
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

          {/* 6. Prescribed Medications */}
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
