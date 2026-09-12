"use client";

import { Wand2, ArrowRight, Activity, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoopActivity, Appointment } from "@/lib/demo-data";

export function LastSessionSummaryWidget({ activity }: { activity: LoopActivity[] }) {
  const latestSummary = activity[0];

  return (
    <div className="bg-gradient-to-br from-[#866BE3] to-[#6049C5] rounded-2xl shadow-sm p-6 flex flex-col h-full text-white relative overflow-hidden">
      {/* Decorative bg blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00A89D]/20 rounded-full blur-xl -ml-5 -mb-5" />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Wand2 className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold">Last Session Summary</h2>
      </div>

      <div className="flex-1 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-lg max-w-[200px] truncate">{latestSummary?.activity || "No recent summary"}</h3>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            AI Generated
          </span>
        </div>
        
        <p className="text-xs text-white/80 mb-4">{latestSummary?.time || ""}</p>
        
        <p className="text-sm text-white/90 leading-relaxed font-medium">
          {"Couples reviewed. Follicular growth appropriate. Medication dose continued. Next scan in 3 days. Patient advised regarding hydration and rest."}
        </p>
      </div>

      <button className="mt-6 w-fit py-2 px-4 rounded-full bg-white text-[#866BE3] text-xs font-semibold hover:bg-white/90 transition-colors flex items-center gap-2 relative z-10">
        View detailed summary
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ConsultationHistoryWidget({ appointments }: { appointments: Appointment[] }) {
  const history = appointments.filter(a => a.status === "Completed").slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Consultation History</h2>
        </div>
        <button className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1]">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-4">
        {history.length > 0 ? history.map((item, i) => (
          <div key={item.id || i} className="flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-12">{item.time || "Past"}</span>
              <span className="font-medium text-sm text-gray-800">{item.type}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#866BE3] transition-colors" />
          </div>
        )) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No consultation history</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MedicationsWidget({ coupleId }: { coupleId: string }) {
  // Mocking medications since the query isn't available
  const meds = [
    { id: '1', medication: "Gonal-F", dosage: "225 IU" },
    { id: '2', medication: "Menopur", dosage: "75 IU" },
    { id: '3', medication: "Cetrotide", dosage: "0.25 mg" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 19 12a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Medications</h2>
      </div>

      <div className="flex-1 space-y-4 mb-6">
        {meds.length > 0 ? meds.map((med, i) => (
          <div key={med.id || i} className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-800">{med.medication}</span>
            <span className="text-xs font-medium text-[#866BE3]">{med.dosage}</span>
          </div>
        )) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No active medications</p>
          </div>
        )}
      </div>

      <button className="mt-auto w-full py-2 px-4 rounded-full border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-2">
        Add prescription
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
