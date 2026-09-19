"use client";

import { useState } from "react";
import { Phone, CheckCircle2, ArrowRight, User } from "lucide-react";
import type { Couple } from "@/lib/demo-data";
import { PatientDetailsModal } from "./patient-details-modal";

export function PatientProfileCards({
  couple,
  p360,
  onPatientUpdated,
}: {
  couple: { id: string; slug?: string } | any;
  p360?: any;
  onPatientUpdated?: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPartnerModal, setIsPartnerModal] = useState(false);

  const primary = couple?.primary || p360?.primaryPatient || {
    name: p360?.header?.patientName || "Patient",
    age: p360?.header?.age || 29,
    gender: p360?.header?.gender || "Female",
    phone: p360?.header?.contact || "",
  };

  // Determine if there is a real registered partner
  const hasPartner = Boolean(
    (couple?.partner && couple.partner.name && couple.partner.name.trim()) ||
    (p360?.partnerPatient && (p360.partnerPatient.firstName || p360.partnerPatient.name)) ||
    (p360?.header?.partnerName && p360.header.partnerName.trim())
  );

  const partner = hasPartner
    ? couple?.partner || p360?.partnerPatient || {
        name: p360?.header?.partnerName || "Partner",
        age: 30,
        gender: "Male",
        phone: p360?.header?.contact || "",
      }
    : null;

  const handleOpenPrimary = () => {
    setIsPartnerModal(false);
    setModalOpen(true);
  };

  const handleOpenPartner = () => {
    setIsPartnerModal(true);
    setModalOpen(true);
  };

  const primaryAbdmConnected =
    primary?.abdmConnected === true ||
    couple?.primary?.abdmConnected === true ||
    p360?.primaryPatient?.abdmConnected === true ||
    p360?.header?.abhaStatus === "LINKED" ||
    p360?.header?.abhaStatus === "VERIFIED";

  const partnerAbdmConnected =
    partner?.abdmConnected === true ||
    couple?.partner?.abdmConnected === true ||
    p360?.partnerPatient?.abdmConnected === true ||
    p360?.header?.partnerAbhaStatus === "LINKED" ||
    p360?.header?.partnerAbhaStatus === "VERIFIED";

  const coupleIdDisplay = p360?.header?.patientId || couple?.id || couple?.slug || "SMR1029";

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 h-full">
        {/* Primary Patient Card (Left) */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
          {/* Top Banner */}
          <div className="h-20 bg-[#F3F0FF] w-full relative">
            <div className="absolute top-3 right-3 bg-white/60 text-[#866BE3] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#866BE3]/20">
              {hasPartner ? "Primary" : "Individual Patient"}
            </div>
          </div>
          
          {/* Overlapping Avatar */}
          <div className="absolute top-[52px] left-4 w-14 h-14 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-lg font-bold border-4 border-white shadow-sm">
            {primary?.name?.[0] || "P"}
          </div>
          
          <div className="pt-10 px-4 pb-4 flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {p360?.header?.patientName || primary?.name || "Patient"}
              </h2>
              <p className="text-xs text-gray-500 mb-4 mt-0.5">
                {p360?.header?.age || primary?.age || "29"} yrs, {p360?.header?.gender || primary?.gender || "Female"}
              </p>

              <div className="space-y-2 mb-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#866BE3]" />
                  <span>{p360?.header?.contact || primary?.phone || "Phone not provided"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">ABDM:</span>
                  {primaryAbdmConnected ? (
                    <span className="flex items-center gap-1 font-semibold text-[#00A89D]">
                      <CheckCircle2 className="w-3 h-3 text-[#00A89D]" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4 text-xs text-gray-500">
                Patient ID: <span className="font-semibold text-gray-800">{coupleIdDisplay}</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleOpenPrimary}
              className="w-full py-2 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              View details
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Partner Card (Right) or Individual Status Card */}
        {partner ? (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
            {/* Top Banner */}
            <div className="h-20 bg-[#F3F0FF] w-full relative">
              <div className="absolute top-3 right-3 bg-white/60 text-[#866BE3] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#866BE3]/20">
                Partner
              </div>
            </div>
            
            {/* Overlapping Avatar */}
            <div className="absolute top-[52px] left-4 w-14 h-14 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-lg font-bold border-4 border-white shadow-sm">
              {partner.name?.[0] || "P"}
            </div>
            
            <div className="pt-10 px-4 pb-4 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {p360?.header?.partnerName || partner?.name || "Partner"}
                </h2>
                <p className="text-xs text-gray-500 mb-4 mt-0.5">
                  {partner?.age || "30"} yrs, {partner?.gender || "Male"}
                </p>

                <div className="space-y-2 mb-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#866BE3]" />
                    <span>{partner?.phone || "Phone not provided"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">ABDM:</span>
                    {partnerAbdmConnected ? (
                      <span className="flex items-center gap-1 font-semibold text-[#00A89D]">
                        <CheckCircle2 className="w-3 h-3 text-[#00A89D]" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4 text-xs text-gray-500">
                  Partner ID: <span className="font-semibold text-gray-800">{p360?.header?.partnerId || coupleIdDisplay}</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleOpenPartner}
                className="w-full py-2 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                View details
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white/70 rounded-2xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center mb-3">
              <User className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 mb-2">
              QR Scanner Registration
            </span>
            <h3 className="text-sm font-bold text-gray-800">Individual Patient Registration</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              This patient checked in as an individual via the reception QR scanner. No spouse or partner profile is linked.
            </p>
          </div>
        )}
      </div>

      <PatientDetailsModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        patient={isPartnerModal ? partner : primary}
        p360={p360}
        isPartner={isPartnerModal}
        onPatientUpdated={onPatientUpdated}
      />
    </>
  );
}
