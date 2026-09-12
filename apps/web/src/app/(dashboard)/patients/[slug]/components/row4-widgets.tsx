"use client";

import { MessageCircle, ArrowRight, Activity, Upload, AlertCircle, FileText, Calendar } from "lucide-react";
import type { LoopActivity } from "@/lib/demo-data";
import type { ChatMessage } from "@/components/whatsapp-thread";

export function ViewConversationWidget({ messages }: { messages: ChatMessage[] }) {
  const displayMsgs = messages.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
            <MessageCircle className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">View conversation</h2>
        </div>
        <button className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1]">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-5">
        {displayMsgs.length > 0 ? displayMsgs.map((c, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="font-medium text-sm text-gray-800 flex-1 truncate pr-4">{c.text}</span>
            <div className="flex items-center gap-6 w-[200px] justify-end">
              <span className="text-xs text-gray-500 w-12 text-right">{c.time}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border w-[70px] text-center ${
                c.from === "loop" 
                  ? "bg-[#00A89D]/10 text-[#00A89D] border-[#00A89D]/20" 
                  : "bg-[#F39C12]/10 text-[#F39C12] border-[#F39C12]/20"
              }`}>
                {c.from === "loop" ? "Automated" : "Manual"}
              </span>
            </div>
          </div>
        )) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No recent messages</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function RecentActivitiesWidget({ activity }: { activity: LoopActivity[] }) {
  const displayActivities = activity.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
        </div>
        <button className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1]">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-5">
        {displayActivities.length > 0 ? displayActivities.map((a, i) => {
          return (
            <div key={a.id || i} className="flex items-center justify-between">
              <div className="flex items-center gap-3 w-3/4">
                <div className="w-6 h-6 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <Activity className="w-3 h-3" />
                </div>
                <span className="font-medium text-sm text-gray-800 truncate">{a.activity}</span>
              </div>
              <span className="text-xs text-gray-500">{a.time}</span>
            </div>
          );
        }) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No recent activities</p>
          </div>
        )}
      </div>
    </div>
  );
}
