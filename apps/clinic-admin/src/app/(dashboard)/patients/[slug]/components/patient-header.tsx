"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Play, Wand2 } from "lucide-react";

export function PatientHeader({ couple, p360 }: { couple: { id: string, slug?: string } | any, p360?: any }) {
  const upcoming = p360?.summaryCards?.nextAppointment;
  const sessionTitle = upcoming?.type || "Ultrasound Review";
  const sessionStatus = upcoming?.status || "Confirmed";
  const sessionTime = upcoming?.startsAt
    ? `Today ${new Date(upcoming.startsAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${new Date(upcoming.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Today 03 Sept 2026. 09:00 AM";

  const doctorName = p360?.header?.assignedDoctor || couple?.doctor || "Dr. Shreyas Iyer";
  const coordinatorName = p360?.header?.assignedCoordinator || couple?.coordinator || "Anjali Desai";
  const treatmentName = p360?.header?.currentTreatment?.label || couple?.treatment || "IVF Journey";
  const coupleId = couple?.id || couple?.slug || "SMR-1025";

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
              <p className="text-[11px] text-gray-500 font-medium mb-1">Treatment:</p>
              <div className="bg-[#F8F5FF] text-[#866BE3] text-xs font-semibold px-3 py-1 rounded-full border border-[#866BE3]/20">
                {treatmentName}
              </div>
            </div>

            {/* Couple ID */}
            <div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">Couple ID:</p>
              <p className="text-xs font-bold text-gray-800">{coupleId}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Primary Doctor */}
            <div className="flex items-center gap-2.5 p-1.5">
              <div className="w-8 h-8 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {doctorName?.replace(/^Dr\.?\s*/i, "")?.[0] || "S"}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{doctorName}</p>
                <p className="text-[11px] text-gray-400 font-medium">Primary Doctor</p>
              </div>
            </div>
            
            {/* Care Coordinator */}
            <div className="flex items-center gap-2.5 p-1.5">
              <div className="w-8 h-8 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {coordinatorName?.[0] || "A"}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{coordinatorName}</p>
                <p className="text-[11px] text-gray-400 font-medium">Care Coordinator</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Upcoming Session */}
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

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className="flex-1 py-2 px-4 rounded-full bg-[#866BE3] text-white text-xs font-semibold hover:bg-[#7254d1] transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Start Session</span>
              <Play className="w-3 h-3 fill-current" />
            </button>
            <button
              type="button"
              className="flex-1 py-2 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Prepare me</span>
              <Wand2 className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
