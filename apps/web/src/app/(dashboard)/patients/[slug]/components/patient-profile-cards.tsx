"use client";

import { useState } from "react";
import { Phone, Globe, ArrowRight } from "lucide-react";
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
    name: p360?.header?.patientName || "Primary Patient",
    age: p360?.header?.age || 30,
    phone: p360?.header?.contact || "",
  };

  const partner = couple?.partner || p360?.partnerPatient || (p360?.header?.partnerName ? {
    name: p360.header.partnerName,
    age: 32,
    phone: "",
  } : null);

  const primaryLang = primary?.preferredLanguage || p360?.primaryPatient?.preferredLanguage || p360?.header?.language || "English";
  const partnerLang = partner?.preferredLanguage || p360?.partnerPatient?.preferredLanguage || "English";

  const handleOpenPrimary = () => {
    setIsPartnerModal(false);
    setModalOpen(true);
  };

  const handleOpenPartner = () => {
    setIsPartnerModal(true);
    setModalOpen(true);
  };

  return (
    <>
      <div className="flex gap-4 h-full">
        {/* Primary Card */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
          {/* Top Banner */}
          <div className="h-28 bg-[#F3F0FF] w-full relative">
            <div className="absolute top-4 right-4 bg-white/50 text-[#866BE3] text-[11px] font-bold px-3 py-1 rounded-full border border-[#866BE3]/20">
              Primary
            </div>
          </div>
          
          {/* Overlapping Avatar */}
          <div className="absolute top-[80px] left-5 w-16 h-16 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-xl font-bold border-4 border-white shadow-sm">
            {primary?.name?.[0] || 'P'}
          </div>
          
          <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">
              {p360?.header?.patientName || primary?.name || "Patient"}
            </h2>
            <p className="text-[13px] text-gray-500 mb-6">
              {p360?.header?.age || primary?.age || "-"} yrs, {p360?.header?.gender || primary?.gender || "Female"}
            </p>

            <div className="space-y-3 mb-8 flex-1">
              <div className="flex items-center gap-3 text-[13px] text-gray-700">
                <Phone className="w-4 h-4 text-[#866BE3]" />
                {p360?.header?.contact || primary?.phone || "No contact"}
              </div>
              <div className="flex items-center gap-3 text-[13px] text-gray-700">
                <Globe className="w-4 h-4 text-[#866BE3]" />
                {primaryLang}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[13px] text-gray-500">
                Patient ID: <span className="font-semibold text-gray-700">{p360?.header?.patientId || couple?.id || couple?.slug || ""}</span>
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleOpenPrimary}
              className="w-full py-2.5 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-[13px] font-bold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2 active:scale-98"
            >
              View details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Partner Card */}
        {partner && (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
            {/* Top Banner */}
            <div className="h-28 bg-[#F3F0FF] w-full relative" />
            
            {/* Overlapping Avatar */}
            <div className="absolute top-[80px] left-5 w-16 h-16 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-xl font-bold border-4 border-white shadow-sm">
              {partner.name?.[0] || 'P'}
            </div>
            
            <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">
                {p360?.header?.partnerName || partner?.name || "Partner"}
              </h2>
              <p className="text-[13px] text-gray-500 mb-6">
                {partner?.age || "-"} yrs, {partner?.gender || "Male"}
              </p>

              <div className="space-y-3 mb-8 flex-1">
                <div className="flex items-center gap-3 text-[13px] text-gray-700">
                  <Phone className="w-4 h-4 text-[#866BE3]" />
                  {partner?.phone || "No contact"}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-gray-700">
                  <Globe className="w-4 h-4 text-[#866BE3]" />
                  {partnerLang}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[13px] text-gray-500">
                  Patient ID: <span className="font-semibold text-gray-700">{p360?.header?.partnerId || couple?.id || couple?.slug || ""}</span>
                </p>
              </div>
              
              <button
                type="button"
                onClick={handleOpenPartner}
                className="w-full py-2.5 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-[13px] font-bold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2 active:scale-98"
              >
                View details
                <ArrowRight className="w-4 h-4" />
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
