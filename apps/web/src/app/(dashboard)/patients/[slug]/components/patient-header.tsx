"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Pencil, Copy, Check, CreditCard, Pill } from "lucide-react";
import { AssignTeamModal } from "./assign-team-modal";
import { BillingSummaryModal } from "./billing-summary-modal";
import { toast } from "sonner";

export function PatientHeader({
  couple,
  p360,
  onTeamUpdated,
  onOpenTreatmentJourney,
}: {
  couple: { id: string; slug?: string } | any;
  p360?: any;
  onTeamUpdated?: () => void;
  onOpenTreatmentJourney?: () => void;
}) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [doctorName, setDoctorName] = useState(
    p360?.header?.assignedDoctor || couple?.doctor || "Unassigned",
  );
  const [coordinatorName, setCoordinatorName] = useState(
    p360?.header?.assignedCoordinator || couple?.coordinator || "Unassigned",
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

  const coupleId = couple?.id || couple?.slug || "";

  const handleCopyCoupleId = () => {
    if (coupleId) {
      navigator.clipboard.writeText(coupleId);
      setCopiedId(true);
      toast.success("Couple ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleScrollToMedications = () => {
    const el = document.getElementById("medications-widget");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      toast.info(`Current active medications: ${p360?.summaryCards?.currentMedications ?? 0}`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/patients" className="flex items-center gap-2 text-sm font-medium text-[#866BE3] hover:text-[#7254d1] w-fit">
        <ArrowLeft className="w-4 h-4" />
        Patients
      </Link>
      
      <h1 className="text-2xl font-bold text-gray-800">Patient Overview</h1>

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/60 border border-gray-100 shadow-sm mt-2 backdrop-blur-md">
        <div className="flex flex-wrap gap-8 items-center">
          {/* Treatment Button */}
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Treatment:</p>
            <button
              type="button"
              onClick={onOpenTreatmentJourney}
              className="bg-[#F8F5FF] hover:bg-[#866BE3]/15 text-[#866BE3] text-xs font-semibold px-3 py-1 rounded-full border border-[#866BE3]/20 transition-colors cursor-pointer active:scale-95 text-left"
              title="Click to view IVF cycle journey"
            >
              {p360?.header?.currentTreatment?.label || couple?.treatment || "Fertility Evaluation"}
            </button>
          </div>

          {/* Billing & Payment Button */}
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Billing & Payment:</p>
            <button
              type="button"
              onClick={() => setIsBillingModalOpen(true)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                p360?.summaryCards?.paymentStatus === "OUTSTANDING"
                  ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
              }`}
              title="Click to view invoices and financial details"
            >
              <CreditCard className="w-3 h-3" />
              {p360?.summaryCards?.paymentStatus === "OUTSTANDING"
                ? `Outstanding: ₹${Number(p360?.summaryCards?.outstandingAmountInr || 0).toLocaleString("en-IN")}`
                : "Billing: Clear (₹0 due)"}
            </button>
          </div>

          {/* Pharmacy Button */}
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Pharmacy:</p>
            <button
              type="button"
              onClick={handleScrollToMedications}
              className="bg-[#F8F5FF] hover:bg-[#866BE3]/15 text-[#866BE3] text-xs font-semibold px-3 py-1 rounded-full border border-[#866BE3]/20 transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
              title="Click to view active medications"
            >
              <Pill className="w-3 h-3" />
              {p360?.summaryCards?.currentMedications ?? 0} active meds
            </button>
          </div>

          {/* Couple ID Button */}
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Couple ID:</p>
            <button
              type="button"
              onClick={handleCopyCoupleId}
              className="text-sm font-bold text-gray-800 hover:text-[#866BE3] flex items-center gap-1.5 transition-colors group cursor-pointer"
              title="Click to copy Couple ID"
            >
              <span>{coupleId}</span>
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#866BE3] shrink-0" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Primary Doctor Button / Card */}
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/80 transition-colors border border-transparent hover:border-gray-200 text-left group"
            title="Click to assign or change primary doctor"
          >
            <div className="w-9 h-9 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {doctorName?.[0] && doctorName !== "Unassigned" ? doctorName[0] : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-[#866BE3] transition-colors">
                  {doctorName}
                </p>
                <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-500">
                {doctorName === "Unassigned" ? "Assign Doctor" : "Primary Doctor"}
              </p>
            </div>
          </button>
          
          {/* Care Coordinator Button / Card */}
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/80 transition-colors border border-transparent hover:border-gray-200 text-left group"
            title="Click to assign or change care coordinator"
          >
            <div className="w-9 h-9 rounded-full bg-[#C178F5] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {coordinatorName?.[0] && coordinatorName !== "Unassigned" ? coordinatorName[0] : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-[#C178F5] transition-colors">
                  {coordinatorName}
                </p>
                <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-500">
                {coordinatorName === "Unassigned" ? "Assign Coordinator" : "Care Coordinator"}
              </p>
            </div>
          </button>
        </div>
      </div>

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
    </div>
  );
}
