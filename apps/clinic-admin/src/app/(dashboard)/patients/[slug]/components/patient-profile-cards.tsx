"use client";

import { Phone, Globe, ArrowRight, User } from "lucide-react";
import type { Couple } from "@/lib/demo-data";

export function PatientProfileCards({ couple, p360 }: { couple: { id: string, slug?: string } | any, p360?: any }) {
  const primary = couple?.primary || p360?.primaryPatient || {
    name: p360?.header?.patientName || "Patient",
    age: p360?.header?.age || 29,
    gender: p360?.header?.gender || "Female",
    phone: p360?.header?.contact || "",
  };

  const hasPartner = Boolean(
    (couple?.partner && couple.partner.name && couple.partner.name.trim()) ||
    (p360?.partnerPatient && (p360.partnerPatient.firstName || p360.partnerPatient.name)) ||
    (p360?.header?.partnerName && p360.header.partnerName.trim())
  );

  const partner = hasPartner ? (couple?.partner || p360?.partnerPatient) : null;

  return (
    <div className="flex flex-col sm:flex-row gap-4 h-full">
      {/* Primary Card */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
        {/* Top Banner */}
        <div className="h-28 bg-[#F3F0FF] w-full relative">
          <div className="absolute top-4 right-4 bg-white/50 text-[#866BE3] text-[11px] font-bold px-3 py-1 rounded-full border border-[#866BE3]/20">
            {hasPartner ? "Primary" : "Individual Patient"}
          </div>
        </div>
        
        {/* Overlapping Avatar */}
        <div className="absolute top-[80px] left-5 w-16 h-16 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-xl font-bold border-4 border-white shadow-sm">
          {primary?.name?.[0] || 'P'}
        </div>
        
        <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{p360?.header?.patientName || primary?.name}</h2>
          <p className="text-[13px] text-gray-500 mb-6">{p360?.header?.age || primary?.age} yrs, {p360?.header?.gender || "Female"}</p>

          <div className="space-y-3 mb-8 flex-1">
            <div className="flex items-center gap-3 text-[13px] text-gray-700">
              <Phone className="w-4 h-4 text-[#866BE3]" />
              {p360?.header?.contact || primary?.phone}
            </div>
            <div className="flex items-center gap-3 text-[13px] text-gray-700">
              <Globe className="w-4 h-4 text-[#866BE3]" />
              English
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[13px] text-gray-500">
              Patient ID: <span className="font-semibold text-gray-700">{p360?.header?.patientId || couple?.id}</span>
            </p>
          </div>
          
          <button className="w-full py-2.5 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-[13px] font-bold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2">
            View details
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Partner Card or Individual State */}
      {partner ? (
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">
          {/* Top Banner */}
          <div className="h-28 bg-[#F3F0FF] w-full relative">
            <div className="absolute top-4 right-4 bg-white/50 text-[#866BE3] text-[11px] font-bold px-3 py-1 rounded-full border border-[#866BE3]/20">
              Partner
            </div>
          </div>
          
          {/* Overlapping Avatar */}
          <div className="absolute top-[80px] left-5 w-16 h-16 rounded-full bg-[#866BE3] text-white flex items-center justify-center text-xl font-bold border-4 border-white shadow-sm">
            {partner.name?.[0] || 'P'}
          </div>
          
          <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{p360?.header?.partnerName || partner.name}</h2>
            <p className="text-[13px] text-gray-500 mb-6">{partner.age} yrs, Male</p>

            <div className="space-y-3 mb-8 flex-1">
              <div className="flex items-center gap-3 text-[13px] text-gray-700">
                <Phone className="w-4 h-4 text-[#866BE3]" />
                {partner.phone}
              </div>
              <div className="flex items-center gap-3 text-[13px] text-gray-700">
                <Globe className="w-4 h-4 text-[#866BE3]" />
                English
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[13px] text-gray-500">
                Patient ID: <span className="font-semibold text-gray-700">{p360?.header?.partnerId || couple?.id}</span>
              </p>
            </div>
            
            <button className="w-full py-2.5 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-[13px] font-bold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2">
              View details
              <ArrowRight className="w-4 h-4" />
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
  );
}
