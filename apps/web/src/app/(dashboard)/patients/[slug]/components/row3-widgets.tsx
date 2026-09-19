"use client";

import { useState } from "react";
import { Wand2, ArrowRight, Activity, Plus, Stethoscope, Sparkles } from "lucide-react";
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
    p360?.timeline?.items?.[0] || {
      title: "IVF Monitoring - Day 5",
      date: "2026-03-12",
      content: "Couples reviewed. Follicular growth appropriate. Medication dose continued. Next scan in..",
    };

  return (
    <>
      <div className="bg-gradient-to-br from-[#7C5CEB] to-[#5434BD] rounded-2xl shadow-sm p-6 flex flex-col justify-between h-full text-white relative overflow-hidden">
        {/* Decorative background aura */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Last Consultation Summary</h2>
          </div>

          {/* Subtitle & AI Generated Badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-bold text-base text-white">
              {latestConsultation.title || "IVF Monitoring - Day 5"}
            </h3>
            <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
              AI Generated
            </span>
          </div>

          {/* Date */}
          <p className="text-xs text-white/70 mb-3">
            {latestConsultation.date
              ? new Date(latestConsultation.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "12 Mar 2026"}
          </p>

          {/* Body */}
          <p className="text-xs text-white/90 leading-relaxed font-normal">
            {latestConsultation.content || "Couples reviewed. Follicular growth appropriate. Medication dose continued. Next scan in.."}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setSummaryModalOpen(true)}
            className="py-2 px-5 rounded-full bg-white text-[#7C5CEB] text-xs font-semibold hover:bg-white/90 transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
          >
            <span>View detailed summary</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
            <h2 className="text-base font-bold text-gray-900">Consultation History</h2>
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

import { PrescriptionDetailsModal } from "./prescription-details-modal";

export function MedicationsWidget({
  coupleId,
  couple,
  p360,
  onMedicationAdded,
}: {
  coupleId: string;
  couple?: any;
  p360?: any;
  onMedicationAdded?: () => void;
}) {
  const [addPrescriptionOpen, setAddPrescriptionOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<any | null>(null);
  
  const currentMeds: any[] = Array.isArray(p360?.medications?.current)
    ? p360.medications.current
    : [];

  const primaryPatientId =
    p360?.header?.patientId ||
    p360?.primaryPatient?.id ||
    p360?.couple?.primaryPatientId ||
    couple?.primary?.id ||
    "";

  const partnerPatientId =
    p360?.header?.partnerId ||
    p360?.partnerPatient?.id ||
    p360?.couple?.partnerPatientId ||
    couple?.partner?.id ||
    "";

  const primaryName =
    couple?.primary?.name ||
    p360?.header?.patientName ||
    (p360?.primaryPatient
      ? `${p360.primaryPatient.firstName || ""} ${p360.primaryPatient.lastName || ""}`.trim()
      : "") ||
    "Primary Partner";

  const partnerName =
    couple?.partner?.name ||
    p360?.header?.partnerName ||
    (p360?.partnerPatient
      ? `${p360.partnerPatient.firstName || ""} ${p360.partnerPatient.lastName || ""}`.trim()
      : "") ||
    "";

  const primaryPhone =
    p360?.header?.contact ||
    p360?.header?.phone ||
    p360?.primaryPatient?.phone ||
    couple?.primary?.phone ||
    "";

  const partnerPhone =
    p360?.partnerPatient?.phone ||
    couple?.partner?.phone ||
    p360?.header?.partnerPhone ||
    "";

  const couplePatients = [
    {
      id: primaryPatientId,
      name: primaryName,
      role: "Primary Partner",
      gender: couple?.primary?.gender || p360?.header?.gender || p360?.primaryPatient?.gender || "Female",
      phone: primaryPhone,
    },
    ...(partnerName && (partnerPatientId || partnerName !== "Partner")
      ? [
          {
            id: partnerPatientId || (partnerName ? `partner_${partnerName}` : ""),
            name: partnerName,
            role: "Partner / Spouse",
            gender: couple?.partner?.gender || p360?.partnerPatient?.gender || "Male",
            phone: partnerPhone,
          },
        ]
      : []),
  ].filter((p) => Boolean(p.name));

  const handleMedClick = (med: any) => {
    setSelectedPrescription(med);
    setDetailsModalOpen(true);
  };

  const handleEdit = (med: any) => {
    setEditingPrescription(med);
    setAddPrescriptionOpen(true);
  };

  const handleAddNew = () => {
    setEditingPrescription(null);
    setAddPrescriptionOpen(true);
  };

  return (
    <>
      <div id="medications-widget" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between h-full">
        <div>
          {/* Header matching Image 4 */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.5 20.5 19 12a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"/>
                <path d="m8.5 8.5 7 7"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">Medications</h2>
          </div>

          {/* Clean Interactive Row-by-Row List */}
          {currentMeds.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {currentMeds.map((med: any, idx: number) => {
                const medPatientName =
                  med.patientName ||
                  (med.patientId === partnerPatientId ? partnerName : med.patientId === primaryPatientId ? primaryName : null);
                const isForPartner = med.patientId === partnerPatientId;

                return (
                  <div
                    key={med.prescriptionId || med.id || idx}
                    onClick={() => handleMedClick(med)}
                    className="flex items-center justify-between py-3 text-xs hover:bg-slate-50/80 px-2.5 -mx-2.5 rounded-xl transition-all cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#866BE3]/40 group-hover:bg-[#866BE3] transition-colors" />
                      <span className="font-semibold text-gray-800 group-hover:text-[#866BE3] transition-colors">
                        {med.medicineName || med.medication} {med.dosage ? `(${med.dosage})` : ""}
                      </span>
                      {medPatientName && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isForPartner
                              ? "bg-amber-50 text-amber-700 border-amber-200/70"
                              : "bg-purple-50 text-[#866BE3] border-purple-100"
                          }`}
                        >
                          {medPatientName.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 font-medium group-hover:text-gray-700">
                      {med.frequency || "Once daily"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-gray-100 my-2">
              <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-gray-100 flex items-center justify-center text-[#866BE3] mb-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 20.5 19 12a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"/>
                  <path d="m8.5 8.5 7 7"/>
                </svg>
              </div>
              <p className="text-xs font-bold text-gray-800">No active medications</p>
              <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs">
                No active prescriptions recorded for this patient cycle.
              </p>
            </div>
          )}
        </div>

        {/* Add Prescription Button at bottom right */}
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleAddNew}
            className="py-1.5 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
          >
            <span>Add prescription</span>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Prescription Details Modal matching Screenshot 1 */}
      <PrescriptionDetailsModal
        isOpen={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        prescription={selectedPrescription}
        couple={couple}
        p360={p360}
        onEdit={handleEdit}
        onPrescriptionUpdated={onMedicationAdded}
      />

      {/* Add / Edit Prescription Modal */}
      <AddPrescriptionModal
        isOpen={addPrescriptionOpen}
        onOpenChange={setAddPrescriptionOpen}
        patientId={primaryPatientId}
        coupleId={coupleId}
        couplePatients={couplePatients}
        couple={couple}
        p360={p360}
        initialPrescription={editingPrescription}
        onPrescriptionAdded={onMedicationAdded}
      />
    </>
  );
}
