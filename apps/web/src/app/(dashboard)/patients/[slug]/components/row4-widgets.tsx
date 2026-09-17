"use client";

import { useState } from "react";
import { MessageCircle, ArrowRight, Activity, Upload, User, Calendar } from "lucide-react";
import type { ChatMessage } from "@/components/whatsapp-thread";
import { WhatsAppConversationModal } from "./whatsapp-conversation-modal";
import { ActivityTimelineModal } from "./activity-timeline-modal";

export function ViewConversationWidget({
  messages = [],
  patientName = "Patient",
}: {
  messages?: ChatMessage[];
  patientName?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const defaultConversations = [
    { text: "AI Sent Ultrasound reminder", date: "28 Aug", status: "Completed", statusType: "success" },
    { text: "AI followed up for report", date: "20 Aug", status: "Completed", statusType: "success" },
    { text: "AI answered patient question", date: "18 Aug", status: "Completed", statusType: "success" },
    { text: "AI escalated spotting concern", date: "12 Aug", status: "In Review", statusType: "warning" },
    { text: "Care Coordinator reached out", date: "5 Aug", status: "In Review", statusType: "warning" },
  ];

  const displayList = messages.length > 0
    ? messages.slice(0, 5).map((m, idx) => ({
        text: m.text,
        date: m.time || "Recent",
        status: m.from === "loop" ? "Completed" : "In Review",
        statusType: m.from === "loop" ? "success" : "warning",
      }))
    : defaultConversations;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between h-full">
        <div>
          {/* Header matching Image 4 */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-gray-900">View conversation</h2>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1] cursor-pointer"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List matching Image 4 */}
          <div className="space-y-3">
            {displayList.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-between py-1 text-xs cursor-pointer hover:bg-gray-50/80 px-2 rounded-lg transition-colors"
              >
                <span className="font-semibold text-gray-800 truncate pr-4 max-w-[280px] sm:max-w-md">
                  {item.text}
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-gray-400 text-xs font-normal">{item.date}</span>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      item.statusType === "success"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
  const [activeTab, setActiveTab] = useState<"All" | "Consultations" | "Tests" | "Completed">("All");

  const defaultActivities = [
    {
      title: "Ultrasound report uploaded",
      date: "03 Sep",
      type: "upload",
      category: "Tests",
    },
    {
      title: "Blood Test Completed",
      date: "08 Sep",
      type: "activity",
      category: "Tests",
    },
    {
      title: "Continue Medication",
      date: "Daily",
      type: "user",
      category: "Consultations",
    },
    {
      title: "Appointment Scheduled",
      date: "Weekly",
      type: "calendar",
      category: "Consultations",
    },
  ];

  const filteredActivities = activeTab === "All"
    ? defaultActivities
    : activeTab === "Completed"
    ? defaultActivities.slice(0, 2)
    : defaultActivities.filter((a) => a.category === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case "upload":
        return <Upload className="w-3.5 h-3.5 text-gray-500" />;
      case "user":
        return <User className="w-3.5 h-3.5 text-gray-500" />;
      case "calendar":
        return <Calendar className="w-3.5 h-3.5 text-gray-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between h-full">
        <div>
          {/* Header matching Image 5 */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Recent Activities</h2>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[#866BE3] text-xs font-semibold flex items-center gap-1 hover:text-[#7254d1] cursor-pointer"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Tabs matching Image 5 */}
          <div className="flex items-center gap-4 border-b border-gray-100 mb-4 text-xs font-medium pb-2">
            {(["All", "Consultations", "Tests", "Completed"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`transition-colors relative pb-1 ${
                  activeTab === tab
                    ? "text-[#866BE3] font-bold after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-[#866BE3]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Activities List matching Image 5 */}
          <div className="space-y-3.5">
            {filteredActivities.map((a, i) => (
              <div
                key={i}
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50/80 p-1.5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                    {getIcon(a.type)}
                  </div>
                  <span className="font-semibold text-gray-800 truncate">{a.title}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2 font-normal">
                  {a.date}
                </span>
              </div>
            ))}
          </div>
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
