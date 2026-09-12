"use client";

import { Calendar, RefreshCcw, FileText, Activity, ArrowRight, Play, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Couple, Appointment, CareTask } from "@/lib/demo-data";

export function AbdmStatusWidget({ couple }: { couple: Couple }) {
  const primaryName = couple.primary.name?.split(" ")[0] || "Primary";
  const partnerName = couple.partner?.name?.split(" ")[0] || "Partner";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-lg font-bold text-gray-900">ABDM Status</h2>
        <button className="text-[#866BE3] hover:text-[#7254d1] transition-colors">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-[#866BE3] font-medium text-sm">{primaryName}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[#00A89D]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Connected
          </span>
          
          {couple.partner && (
            <>
              <span className="text-[#866BE3] font-medium text-sm ml-4">{partnerName}</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#00A89D]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Connected
              </span>
            </>
          )}
        </div>
        
        <p className="text-xs text-gray-500">Last synced: 30 August 2026</p>
      </div>

      <div className="mt-auto flex gap-3">
        <button className="flex-1 py-2 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-[11px] font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5">
          Documents
          <ArrowRight className="w-3 h-3" />
        </button>
        <button className="flex-1 py-2 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-[11px] font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5">
          Patient History
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function UpcomingSessionWidget({ appointments }: { appointments: Appointment[] }) {
  const upcoming = appointments.filter(a => a.status !== "Completed")[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
          <Calendar className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Upcoming Session</h2>
      </div>

      {upcoming ? (
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2">{upcoming.time || "Today"}</p>
          
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-semibold text-gray-900">{upcoming.type}</h3>
            <span className="bg-[#00A89D]/10 text-[#00A89D] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#00A89D]/20">
              {upcoming.status}
            </span>
          </div>
          
          <p className="text-xs text-gray-500">{upcoming.doctor}</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">No upcoming sessions</p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button className="flex-1 py-2.5 px-3 rounded-full bg-[#866BE3] text-white text-[11px] font-semibold hover:bg-[#7254d1] transition-colors flex items-center justify-center gap-1.5 shadow-sm">
          Start Session
          <Play className="w-3 h-3 fill-current" />
        </button>
        <button className="flex-1 py-2.5 px-3 rounded-full border border-[#866BE3] text-[#866BE3] text-[11px] font-semibold hover:bg-[#866BE3]/5 transition-colors flex items-center justify-center gap-1.5">
          Prepare me
          <Wand2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function UpcomingTasksWidget({ tasks }: { tasks: CareTask[] }) {
  const displayTasks = tasks.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
          <Activity className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Upcoming Couple Tasks</h2>
      </div>

      <div className="flex-1 space-y-4">
        {displayTasks.length > 0 ? displayTasks.map((task, i) => (
          <div key={task.id || i} className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-800 truncate pr-4">{task.title}</span>
            <span className="text-xs font-medium text-[#866BE3] whitespace-nowrap">{task.due}</span>
          </div>
        )) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No upcoming tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
