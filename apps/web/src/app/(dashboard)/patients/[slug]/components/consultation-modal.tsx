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
import { Stethoscope, Wand2, CheckCircle2, Play, Loader2, Sparkles, FileText } from "lucide-react";
import { clinicApi } from "@/lib/clinic-api";

interface ConsultationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: {
    id: string;
    type: string;
    doctorName?: string;
    status: string;
    startsAt?: string;
  } | null | undefined;
  patientName: string;
  patientId?: string | undefined;
  coupleId?: string | undefined;
  partnerName?: string | undefined;
  treatmentName?: string | undefined;
  currentStage?: string | undefined;
  onCompleted?: (() => void) | undefined;
}

export function ConsultationModal({
  isOpen,
  onOpenChange,
  appointment,
  patientName,
  patientId,
  coupleId,
  partnerName,
  treatmentName = "Evaluation",
  currentStage = "Consultation",
  onCompleted,
}: ConsultationModalProps) {
  const [reasonForVisit, setReasonForVisit] = useState(
    appointment?.type || "Fertility Initial Consultation",
  );
  const [impression, setImpression] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  const handleAiDraft = () => {
    setIsAiDrafting(true);
    setTimeout(() => {
      setImpression(
        `Couple presented for ${treatmentName} evaluation (${currentStage}). Primary partner ${patientName} reviewed. Baseline endocrine profile and pelvic scan indicated appropriate ovarian reserve.`,
      );
      setClinicalNotes(
        `Discussed protocol choices for ${treatmentName}. Advised on dietary antioxidants, lifestyle modifications, and medication schedule. Couple understands cycle milestones and WhatsApp care loop checkpoints.`,
      );
      setPrescriptionNotes(
        "Folic Acid 5mg OD, CoQ10 200mg BD, Vitamin D3 60,000 IU weekly.",
      );
      setNextSteps(
        "Schedule baseline Day 2 ultrasound and follow-up consultation upon lab result verification.",
      );
      setIsAiDrafting(false);
    }, 600);
  };

  const handleSave = async (status: "IN_PROGRESS" | "COMPLETED") => {
    if (!clinicalNotes && !impression) {
      setError("Please provide consultation notes or clinical impression.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const summary = [
        impression ? `Impression: ${impression}` : null,
        clinicalNotes ? `Notes: ${clinicalNotes}` : null,
        prescriptionNotes ? `Prescriptions: ${prescriptionNotes}` : null,
        nextSteps ? `Next Steps: ${nextSteps}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      let apptId = appointment?.id;
      if (!apptId) {
        try {
          const newAppt = await clinicApi.createAppointment({
            coupleId: coupleId || undefined,
            patientId: patientId || undefined,
            type: reasonForVisit || "Doctor Consultation",
            doctor: "Doctor",
            date: new Date().toISOString(),
            status: status === "COMPLETED" ? "COMPLETED" : "CONFIRMED",
            notes: clinicalNotes,
          });
          apptId = (newAppt as any)?.id;
        } catch {
          // If appointment creation endpoint fails, continue with fallback
        }
      }

      const targetId = apptId || coupleId || patientId;
      if (targetId) {
        await clinicApi.recordConsultation(targetId, {
          summary: summary || "Clinical consultation recorded",
          status,
          reasonForVisit,
          impression,
          clinicalNotes,
          prescriptionNotes,
          nextSteps,
          notes: clinicalNotes,
          diagnosis: impression,
        });
      }

      onCompleted?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to record consultation:", err);
      setError(err?.message || "Failed to record consultation. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-6 bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#866BE3]" />
              Doctor Consultation Session
            </DialogTitle>
            <button
              type="button"
              onClick={handleAiDraft}
              disabled={isAiDrafting}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#866BE3]/10 text-[#866BE3] hover:bg-[#866BE3]/20 text-xs font-semibold transition-colors"
            >
              {isAiDrafting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Draft with Smrko AI
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl">
            <div>
              <span className="text-gray-400">Patient:</span>{" "}
              <strong className="text-gray-800">{patientName}</strong>
              {partnerName && ` & ${partnerName}`}
            </div>
            <span>•</span>
            <div>
              <span className="text-gray-400">Treatment:</span>{" "}
              <span className="font-semibold text-[#866BE3]">{treatmentName}</span>
            </div>
            <span>•</span>
            <div>
              <span className="text-gray-400">Stage:</span>{" "}
              <span className="font-semibold text-gray-700">{currentStage}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Reason for Visit */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Reason for Visit
            </label>
            <input
              type="text"
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3]"
              placeholder="e.g. Initial Fertility Assessment"
            />
          </div>

          {/* Clinical Impression */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Clinical Impression / Diagnosis
            </label>
            <input
              type="text"
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3]"
              placeholder="e.g. Primary subfertility, ovarian reserve appropriate, partner evaluation requested"
            />
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Doctor Clinical Notes & Observations
            </label>
            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3] resize-none"
              placeholder="Record clinical history, findings, ultrasound assessment, and protocol rationale..."
            />
          </div>

          {/* Prescriptions & Medications */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Prescription & Medication Instructions
            </label>
            <textarea
              rows={2}
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3] resize-none"
              placeholder="Medications, dosage, frequency, duration (e.g. Gonal-F 225 IU daily at 8:00 PM)"
            />
          </div>

          {/* Next Steps & Patient Advice */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Next Clinical Step & WhatsApp Care Loop Tasks
            </label>
            <input
              type="text"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3]"
              placeholder="e.g. Blood test on Day 3, baseline scan scheduled for next Monday"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2 sm:justify-between items-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave("IN_PROGRESS")}
              disabled={saving}
              className="rounded-xl border-[#866BE3] text-[#866BE3] hover:bg-[#866BE3]/5 text-xs font-semibold"
            >
              Save In Progress
            </Button>
            <Button
              onClick={() => handleSave("COMPLETED")}
              disabled={saving}
              className="rounded-xl bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold px-5 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Complete Consultation
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
