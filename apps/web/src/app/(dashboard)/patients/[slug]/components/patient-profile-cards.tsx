"use client";

import { Phone, Globe, ArrowRight } from "lucide-react";
import type { Couple } from "@/lib/demo-data";

export function PatientProfileCards({ couple }: { couple: Couple }) {
  const primary = couple.primary;
  const partner = couple.partner;

  return (
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
          {primary.name?.[0] || 'P'}
        </div>
        
        <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{primary.name}</h2>
          <p className="text-[13px] text-gray-500 mb-6">{primary.age} yrs, Female</p>

          <div className="space-y-3 mb-8 flex-1">
            <div className="flex items-center gap-3 text-[13px] text-gray-700">
              <Phone className="w-4 h-4 text-[#866BE3]" />
              {primary.phone}
            </div>
            <div className="flex items-center gap-3 text-[13px] text-gray-700">
              <Globe className="w-4 h-4 text-[#866BE3]" />
              English
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[13px] text-gray-500">
              Patient ID: <span className="font-semibold text-gray-700">{couple.id}</span>
            </p>
          </div>
          
          <button className="w-full py-2.5 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-[13px] font-bold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2">
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
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{partner.name}</h2>
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
                Patient ID: <span className="font-semibold text-gray-700">{couple.id}</span>
              </p>
            </div>
            
            <button className="w-full py-2.5 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-[13px] font-bold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2">
              View details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
