"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Couple } from "@/lib/demo-data";

export function PatientHeader({ couple }: { couple: Couple }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/patients" className="flex items-center gap-2 text-sm font-medium text-[#866BE3] hover:text-[#7254d1] w-fit">
        <ArrowLeft className="w-4 h-4" />
        Patients
      </Link>
      
      <h1 className="text-2xl font-bold text-gray-800">Patient Overview</h1>

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/60 border border-gray-100 shadow-sm mt-2 backdrop-blur-md">
        <div className="flex gap-10">
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Treatment:</p>
            <div className="bg-[#F8F5FF] text-[#866BE3] text-xs font-semibold px-3 py-1 rounded-full border border-[#866BE3]/20">
              {couple.treatment}
            </div>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Couple ID:</p>
            <p className="text-sm font-bold text-gray-800">{couple.id || couple.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-xs">
              {couple.doctor?.[0] || 'D'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{couple.doctor}</p>
              <p className="text-xs text-gray-500">Primary Doctor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C178F5] text-white flex items-center justify-center font-bold text-xs">
              {couple.coordinator?.[0] || 'C'}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{couple.coordinator}</p>
              <p className="text-xs text-gray-500">Care Coordinator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
