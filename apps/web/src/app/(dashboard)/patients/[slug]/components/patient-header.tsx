"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Copy, Check, Calendar, Play, Wand2, Mic, ArrowRight } from "lucide-react";
import { AssignTeamModal } from "./assign-team-modal";
import { BillingSummaryModal } from "./billing-summary-modal";
import { EditTreatmentModal } from "./edit-treatment-modal";
import { ConsultationModal } from "./consultation-modal";
import { toast } from "sonner";

export function PatientHeader({
  couple,
  p360,
  onTeamUpdated,
  onOpenTreatmentJourney,
  onSessionUpdated,
}: {
  couple: { id: string; slug?: string } | any;
  p360?: any;
  onTeamUpdated?: () => void;
  onOpenTreatmentJourney?: () => void;
  onSessionUpdated?: () => void;
}) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isEditTreatmentOpen, setIsEditTreatmentOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [prepareMessage, setPrepareMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [doctorName, setDoctorName] = useState(
    p360?.header?.assignedDoctor || couple?.doctor || "Dr. Shreyas Iyer",
  );
  const [coordinatorName, setCoordinatorName] = useState(
    p360?.header?.assignedCoordinator || couple?.coordinator || "Anjali Desai",
  );

  useEffect(() => {
    if (p360?.header?.assignedDoctor) {
      setDoctorName(p360.header.assignedDoctor);
    } else if (couple?.doctor) {
      setDoctorName(couple.doctor);
    }
    if (p360?.header?.assignedCoordinator) {
      setCoordinatorName(p360.header.assignedCoordinator);
    } else if (couple?.coordinator) {
      setCoordinatorName(couple.coordinator);
    }
  }, [p360, couple]);

  const coupleId = couple?.id || couple?.slug || "SMR-1025";
  const partnerName = p360?.header?.partnerName || couple?.partner?.name;
  const isIndividual = !partnerName;

  const handleCopyCoupleId = () => {
    if (coupleId) {
      navigator.clipboard.writeText(coupleId);
      setCopiedId(true);
      toast.success(`${isIndividual ? "Patient" : "Couple"} ID copied to clipboard`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const upcoming = p360?.summaryCards?.nextAppointment;
  const sessionTitle = upcoming?.type || "Ultrasound Review";
  const sessionStatus = upcoming?.status || "Confirmed";
  const sessionTime = upcoming?.startsAt
    ? `Today ${new Date(upcoming.startsAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${new Date(upcoming.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Today 03 Sept 2026. 09:00 AM";

  const patientName = p360?.header?.patientName || couple?.primary?.name || "Patient";
  const treatmentName = p360?.header?.currentTreatment?.label || couple?.treatment || "IVF Journey";
  const currentStage = p360?.header?.currentCarePlan?.stageName || couple?.stage || "Consultation";

  const handlePrepareMe = () => {
    setPrepareMessage(
      `Patient ${patientName} is in ${treatmentName} (${currentStage}). Review follicular tracking scan and confirm stimulation injections before starting consultation.`,
    );
    setTimeout(() => setPrepareMessage(null), 8000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Back Link */}
      <Link href="/patients" className="flex items-center gap-1.5 text-xs font-semibold text-[#866BE3] hover:text-[#7254d1] w-fit transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Patients
      </Link>
      
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Patient 360</h1>

      {/* Header Info & Upcoming Session Split Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Left Card: Treatment, Couple ID, Primary Doctor, Care Coordinator */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Treatment */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-[11px] text-gray-500 font-medium">Treatment:</p>
                <button
                  type="button"
                  onClick={() => setIsEditTreatmentOpen(true)}
                  className="text-gray-400 hover:text-[#866BE3] transition-colors p-0.5 rounded cursor-pointer"
                  title="Doctor: Edit Treatment Protocol"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenTreatmentJourney}
                  className="bg-[#F8F5FF] hover:bg-[#866BE3]/15 text-[#866BE3] text-xs font-semibold px-3 py-1 rounded-full border border-[#866BE3]/20 transition-colors cursor-pointer active:scale-95 text-left"
                  title="Click to view treatment journey"
                >
                  {treatmentName}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditTreatmentOpen(true)}
                  className="bg-white hover:bg-gray-50 text-gray-600 hover:text-[#866BE3] text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Doctor: Edit Treatment"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  Edit
                </button>
              </div>
            </div>

            {/* Patient or Couple ID */}
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">{isIndividual ? "Patient ID:" : "Couple ID:"}</p>
              <button
                type="button"
                onClick={handleCopyCoupleId}
                className="text-xs font-bold text-gray-800 hover:text-[#866BE3] flex items-center gap-1.5 transition-colors group cursor-pointer"
                title={`Click to copy ${isIndividual ? "Patient" : "Couple"} ID`}
              >
                <span>{coupleId}</span>
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400 group-hover:text-[#866BE3] shrink-0" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Primary Doctor */}
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer"
              title="Click to assign primary doctor"
            >
              <div className="w-8 h-8 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {doctorName?.replace(/^Dr\.?\s*/i, "")?.[0] || "S"}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-gray-900 group-hover:text-[#866BE3] transition-colors">
                    {doctorName}
                  </p>
                </div>
                <p className="text-[11px] text-gray-400 font-medium">Primary Doctor</p>
              </div>
            </button>
            
            {/* Care Coordinator */}
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer"
              title="Click to assign care coordinator"
            >
              <div className="w-8 h-8 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {coordinatorName?.[0] || "A"}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-gray-900 group-hover:text-[#866BE3] transition-colors">
                    {coordinatorName}
                  </p>
                </div>
                <p className="text-[11px] text-gray-400 font-medium">Care Coordinator</p>
              </div>
            </button>
          </div>
        </div>

        {/* Right Card: Upcoming Session (Ultrasound Review) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">{sessionTitle}</h2>
            </div>
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {sessionStatus}
            </span>
          </div>

          <p className="text-[11px] text-gray-500 pl-10 mb-3">
            {sessionTime}
          </p>

          {prepareMessage && (
            <div className="mb-2 p-2 bg-[#866BE3]/10 text-[#866BE3] border border-[#866BE3]/20 rounded-xl text-[11px] leading-relaxed">
              {prepareMessage}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsConsultModalOpen(true)}
              className="flex-1 py-1.5 px-3 rounded-full bg-gradient-to-r from-[#A784F3] to-[#866BE3] text-white text-xs font-semibold hover:opacity-95 transition-all flex items-center justify-between gap-1.5 shadow-[0_8px_16px_rgba(134,107,227,0.25)] active:scale-95 cursor-pointer group"
            >
              <div className="w-5 h-5 rounded-full border border-white/25 bg-white/15 flex items-center justify-center shrink-0">
                <Mic className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-xs whitespace-nowrap px-1">Start Consultation</span>
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
                <ArrowRight className="w-3 h-3 text-white" />
              </div>
            </button>
            <button
              type="button"
              onClick={handlePrepareMe}
              className="flex-1 py-2 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Prepare me</span>
              <Wand2 className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Modals */}
      <AssignTeamModal
        isOpen={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        coupleId={couple.id || couple.slug}
        currentDoctorName={doctorName}
        currentCoordinatorName={coordinatorName}
        onSaved={({ doctorName: nextDoc, coordinatorName: nextCoord }) => {
          setDoctorName(nextDoc);
          setCoordinatorName(nextCoord);
          onTeamUpdated?.();
        }}
      />

      <BillingSummaryModal
        isOpen={isBillingModalOpen}
        onOpenChange={setIsBillingModalOpen}
        p360={p360}
        coupleId={coupleId}
      />

      <EditTreatmentModal
        isOpen={isEditTreatmentOpen}
        onOpenChange={setIsEditTreatmentOpen}
        coupleId={couple.id || couple.slug}
        patientName={p360?.header?.patientName}
        currentTreatment={p360?.header?.currentTreatment}
        onSaved={() => {
          onTeamUpdated?.();
        }}
      />

      <ConsultationModal
        isOpen={isConsultModalOpen}
        onOpenChange={setIsConsultModalOpen}
        appointment={upcoming}
        patientName={patientName}
        patientId={p360?.primaryPatient?.id || couple?.primary?.id}
        coupleId={couple?.id}
        partnerName={partnerName}
        treatmentName={treatmentName}
        currentStage={currentStage}
        onCompleted={onSessionUpdated}
      />
    </div>
  );
}
