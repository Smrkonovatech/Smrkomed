"use client";

import { useState } from "react";
import { Phone, CheckCircle2, ArrowRight } from "lucide-react";
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
    name: p360?.header?.patientName || "Mohit",
    age: p360?.header?.age || 29,
    gender: "Male",
    phone: p360?.header?.contact || "+91 9822419302",
  };

  const partner = couple?.partner || p360?.partnerPatient || (p360?.header?.partnerName ? {
    name: p360.header.partnerName,
    age: 29,
    gender: "Female",
    phone: "+91 9822419302",
  } : {
    name: "Shruti",
    age: 29,
    gender: "Female",
    phone: "+91 9822419302",
  });

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
              Primary
            </div>
          </div>
          
          {/* Overlapping Avatar */}
          <div className="absolute top-[52px] left-4 w-14 h-14 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-lg font-bold border-4 border-white shadow-sm">
            {primary?.name?.[0] || "M"}
          </div>
          
          <div className="pt-10 px-4 pb-4 flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {p360?.header?.patientName || primary?.name || "Mohit"}
              </h2>
              <p className="text-xs text-gray-500 mb-4 mt-0.5">
                {p360?.header?.age || primary?.age || "29"} yrs, {p360?.header?.gender || primary?.gender || "Male"}
              </p>

              <div className="space-y-2 mb-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#866BE3]" />
                  <span>{p360?.header?.contact || primary?.phone || "+91 9822419302"}</span>
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

        {/* Partner Card (Right) */}
        {partner && (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
            {/* Top Banner */}
            <div className="h-20 bg-[#F3F0FF] w-full relative" />
            
            {/* Overlapping Avatar */}
            <div className="absolute top-[52px] left-4 w-14 h-14 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-lg font-bold border-4 border-white shadow-sm">
              {partner.name?.[0] || "S"}
            </div>
            
            <div className="pt-10 px-4 pb-4 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {p360?.header?.partnerName || partner?.name || "Shruti"}
                </h2>
                <p className="text-xs text-gray-500 mb-4 mt-0.5">
                  {partner?.age || "29"} yrs, {partner?.gender || "Female"}
                </p>

                <div className="space-y-2 mb-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#866BE3]" />
                    <span>{partner?.phone || "+91 9822419302"}</span>
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
                  Patient ID: <span className="font-semibold text-gray-800">{coupleIdDisplay}</span>
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
