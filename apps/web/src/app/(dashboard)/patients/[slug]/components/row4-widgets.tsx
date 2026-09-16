"use client";

import { useState } from "react";
import { MessageCircle, ArrowRight, Activity, Upload, AlertCircle, FileText, Calendar } from "lucide-react";
import type { LoopActivity } from "@/lib/demo-data";
import type { ChatMessage } from "@/components/whatsapp-thread";
import { WhatsAppConversationModal } from "./whatsapp-conversation-modal";
import { ActivityTimelineModal } from "./activity-timeline-modal";

export function ViewConversationWidget({
  messages,
  patientName = "Patient",
}: {
  messages: ChatMessage[];
  patientName?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const displayMsgs = messages.slice(0, 5);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
              <MessageCircle className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">View conversation</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1] cursor-pointer"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto max-h-[220px]">
          {displayMsgs.length > 0 ? (
            displayMsgs.map((c, i) => (
              <div
                key={i}
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="font-medium text-xs text-gray-800 flex-1 truncate pr-4">{c.text}</span>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-gray-400">{c.time}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.from === "loop" 
                      ? "bg-[#00A89D]/10 text-[#00A89D] border-[#00A89D]/20" 
                      : "bg-[#F39C12]/10 text-[#F39C12] border-[#F39C12]/20"
                  }`}>
                    {c.from === "loop" ? "Automated" : "Patient"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <p className="text-xs text-gray-500 font-medium">No messages sent yet</p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-xs text-[#866BE3] font-semibold mt-2 hover:underline"
              >
                + Send WhatsApp Message
              </button>
            </div>
          )}
        </div>
      </div>

      <WhatsAppConversationModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        messages={messages}
        patientName={patientName}
      />
    </>
  );
}

export function RecentActivitiesWidget({ p360 }: { p360?: any }) {
  const [modalOpen, setModalOpen] = useState(false);
  const displayActivities = p360?.timeline?.items?.slice(0, 5) || [];

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1] cursor-pointer"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px]">
          {displayActivities.length > 0 ? (
            displayActivities.map((a: any, i: number) => {
              return (
                <div
                  key={a.id || i}
                  onClick={() => setModalOpen(true)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <Activity className="w-3 h-3 text-[#866BE3]" />
                    </div>
                    <span className="font-medium text-xs text-gray-800 truncate">{a.title}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                    {a.date ? new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-gray-500">No recent activities logged</p>
            </div>
          )}
        </div>
      </div>

      <ActivityTimelineModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        p360={p360}
      />
    </>
  );
}
