"use client";

import { useState } from "react";
import { Wand2, ArrowRight, Activity, Plus, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoopActivity, Appointment } from "@/lib/demo-data";
import { ConsultationSummaryModal } from "./consultation-summary-modal";
import { ConsultationHistoryModal } from "./consultation-history-modal";
import { AddPrescriptionModal } from "./add-prescription-modal";
import { ConsultationModal } from "./consultation-modal";

export function LastSessionSummaryWidget({
  p360,
  couple,
  onConsultationSaved,
}: {
  p360?: any;
  couple?: any;
  onConsultationSaved?: () => void;
}) {
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [newConsultModalOpen, setNewConsultModalOpen] = useState(false);

  const latestConsultation =
    p360?.timeline?.items?.find((i: any) => i.type === "Consultation") ||
    p360?.timeline?.items?.[0];

  const hasConsultation = Boolean(latestConsultation && (latestConsultation.content || latestConsultation.description));

  return (
    <>
      <div className="bg-gradient-to-br from-[#866BE3] to-[#6049C5] rounded-2xl shadow-sm p-6 flex flex-col h-full text-white relative overflow-hidden">
        {/* Decorative bg blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00A89D]/20 rounded-full blur-xl -ml-5 -mb-5" />

        <div className="flex items-center gap-2 mb-6 relative z-10">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold">Last Session Summary</h2>
        </div>

        <div className="flex-1 relative z-10">
          {hasConsultation ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg max-w-[200px] truncate">
                  {latestConsultation.title || "Consultation Notes"}
                </h3>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Clinical Summary
                </span>
              </div>
              
              <p className="text-xs text-white/80 mb-4">
                {latestConsultation.date ? new Date(latestConsultation.date).toLocaleDateString() : "Recent"}
              </p>
              
              <p className="text-sm text-white/90 leading-relaxed font-medium line-clamp-4">
                {latestConsultation.content || latestConsultation.description}
              </p>
            </>
          ) : (
            <div className="py-4">
              <p className="text-sm font-semibold text-white/90 mb-1">No recorded session summary yet</p>
              <p className="text-xs text-white/70 leading-relaxed">
                Consultation findings and clinical advice recorded by the doctor will appear here automatically.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2 relative z-10">
          {hasConsultation ? (
            <button
              type="button"
              onClick={() => setSummaryModalOpen(true)}
              className="py-2 px-4 rounded-full bg-white text-[#866BE3] text-xs font-semibold hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
            >
              View detailed summary
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setNewConsultModalOpen(true)}
              className="py-2 px-4 rounded-full bg-white text-[#866BE3] text-xs font-semibold hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Start Consultation
            </button>
          )}
        </div>
      </div>

      <ConsultationSummaryModal
        isOpen={summaryModalOpen}
        onOpenChange={setSummaryModalOpen}
        consultation={latestConsultation}
        p360={p360}
      />

      <ConsultationModal
        isOpen={newConsultModalOpen}
        onOpenChange={setNewConsultModalOpen}
        patientName={p360?.header?.patientName || couple?.primary?.name || "Patient"}
        patientId={p360?.primaryPatient?.id || couple?.primary?.id}
        coupleId={couple?.id}
        treatmentName={p360?.header?.currentTreatment?.label || couple?.treatment}
        onCompleted={onConsultationSaved}
      />
    </>
  );
}

export function ConsultationHistoryWidget({
  p360,
  couple,
  onConsultationSaved,
}: {
  p360?: any;
  couple?: any;
  onConsultationSaved?: () => void;
}) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [newConsultModalOpen, setNewConsultModalOpen] = useState(false);

  const history =
    p360?.timeline?.items?.filter(
      (i: any) => i.type === "Consultation" || i.type === "Appointment"
    ).slice(0, 5) || [];

  const handleRowClick = (item: any) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Consultation History</h2>
          </div>
          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1] cursor-pointer"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-3">
          {history.length > 0 ? (
            history.map((item: any, i: number) => (
              <div
                key={item.id || i}
                onClick={() => handleRowClick(item)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group border border-transparent hover:border-gray-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400 shrink-0 w-12">
                    {item.date ? new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Visit"}
                  </span>
                  <span className="font-medium text-xs text-gray-800 truncate group-hover:text-[#866BE3] transition-colors">
                    {item.title}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#866BE3] transition-colors shrink-0" />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <p className="text-xs text-gray-500 font-medium">No past visits recorded</p>
              <button
                type="button"
                onClick={() => setNewConsultModalOpen(true)}
                className="text-xs text-[#866BE3] font-semibold mt-2 hover:underline"
              >
                + Conduct Consultation
              </button>
            </div>
          )}
        </div>
      </div>

      <ConsultationHistoryModal
        isOpen={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        p360={p360}
        onStartNewSession={() => setNewConsultModalOpen(true)}
      />

      <ConsultationSummaryModal
        isOpen={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        consultation={selectedItem}
        p360={p360}
      />

      <ConsultationModal
        isOpen={newConsultModalOpen}
        onOpenChange={setNewConsultModalOpen}
        patientName={p360?.header?.patientName || couple?.primary?.name || "Patient"}
        patientId={p360?.primaryPatient?.id || couple?.primary?.id}
        coupleId={couple?.id}
        treatmentName={p360?.header?.currentTreatment?.label || couple?.treatment}
        onCompleted={onConsultationSaved}
      />
    </>
  );
}

export function MedicationsWidget({
  coupleId,
  p360,
  onMedicationAdded,
}: {
  coupleId: string;
  p360?: any;
  onMedicationAdded?: () => void;
}) {
  const [addPrescriptionOpen, setAddPrescriptionOpen] = useState(false);
  const meds = p360?.medications?.current || [];
  const primaryPatientId = p360?.primaryPatient?.id || p360?.header?.patientId || "";

  return (
    <>
      <div id="medications-widget" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 19 12a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Medications</h2>
          </div>
          {meds.length > 0 && (
            <span className="text-[11px] font-semibold bg-[#866BE3]/10 text-[#866BE3] px-2 py-0.5 rounded-full">
              {meds.length} active
            </span>
          )}
        </div>

        <div className="flex-1 space-y-3 mb-6 overflow-y-auto max-h-56">
          {meds.length > 0 ? (
            meds.map((med: any, i: number) => (
              <div key={med.prescriptionId || i} className="flex justify-between items-start text-sm border-b border-gray-50 pb-2">
                <div>
                  <span className="font-medium text-gray-800 block text-xs">{med.medicineName || med.medication}</span>
                  <span className="text-[11px] text-gray-400">
                    {[med.frequency, med.timeOfDay, med.instructions].filter(Boolean).join(" • ") || "As prescribed"}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-semibold text-[#866BE3] block">{med.dosage}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 ${
                    med.dispenseLabel === "Dispensed" || med.dispenseLabel === "DISPENSED"
                      ? "bg-emerald-50 text-emerald-700"
                      : med.dispenseLabel?.includes("Partially") || med.dispenseLabel?.includes("PARTIALLY")
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                  }`}>
                    {med.dispenseLabel || "Prescribed"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <p className="text-xs text-gray-500 font-medium">No active medications prescribed</p>
              <p className="text-[10px] text-gray-400 mt-1">Prescriptions track medication adherence via WhatsApp.</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAddPrescriptionOpen(true)}
          className="mt-auto w-full py-2 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          Add prescription
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <AddPrescriptionModal
        isOpen={addPrescriptionOpen}
        onOpenChange={setAddPrescriptionOpen}
        patientId={primaryPatientId}
        coupleId={coupleId}
        onPrescriptionAdded={onMedicationAdded}
      />
    </>
  );
}
