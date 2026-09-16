"use client";

import Link from "next/link";
import { Zap, Check, AlertTriangle, PlusCircle, HeartPulse, Sparkles } from "lucide-react";

export function AdminRightSidebar() {
  const alerts = [
    {
      id: 1,
      title: "Pre-auth approval received",
      subtitle: (
        <>
          <span className="text-gray-400">Patient:</span> <span className="text-gray-600">Ananya Sharma</span>
        </>
      ),
      time: "5 min ago",
      icon: <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />,
      iconBg: "bg-emerald-50",
    },
    {
      id: 2,
      title: "Critical report requires review",
      subtitle: (
        <>
          <span className="text-gray-400">Patient:</span> <span className="text-gray-600">Meera Iyer</span>
        </>
      ),
      time: "12 min ago",
      icon: <AlertTriangle className="w-4 h-4 text-rose-500 stroke-[2.5]" />,
      iconBg: "bg-rose-50",
    },
    {
      id: 3,
      title: "Pharmacy stock low",
      subtitle: <span className="text-blue-500 font-medium">Gonal-f 450 IU</span>,
      time: "18 min ago",
      icon: <PlusCircle className="w-4 h-4 text-blue-500 stroke-[2.5]" />,
      iconBg: "bg-blue-100",
    },
    {
      id: 4,
      title: "Careloop Escalation",
      subtitle: (
        <>
          <span className="text-gray-400">Patient:</span> <span className="text-orange-600 font-medium">Rahul & Priya</span>
        </>
      ),
      time: "18 min ago",
      icon: <HeartPulse className="w-4 h-4 text-orange-600 stroke-[2.5]" />,
      iconBg: "bg-orange-50",
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Live Alerts & Actions Card */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-500 stroke-[2.5]" />
            </div>
            <h2 className="text-[#1a1c29] font-bold text-[17px]">Live Alerts & Actions</h2>
          </div>
          <Link href="/care-loop" className="text-[#866BE3] font-semibold text-[13px] hover:underline">View all</Link>
        </div>

        <div className="flex flex-col flex-1">
          {alerts.map((alert, idx) => (
            <div key={alert.id} className={`flex items-start gap-4 py-4 ${idx !== alerts.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className={`w-10 h-10 rounded-full ${alert.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                {alert.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[#1a1c29] font-bold text-[15px] truncate">{alert.title}</h3>
                <p className="text-[13px] mt-0.5 truncate">{alert.subtitle}</p>
              </div>
              <span className="text-[#A0ABC0] text-[12px] font-medium whitespace-nowrap pt-1">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Smork AI Assistant Card */}
      <div className="bg-gradient-to-br from-[#866BE3] to-[#515CD3] rounded-[24px] p-7 text-white relative overflow-hidden flex flex-col justify-between shrink-0 min-h-[260px]">
        <div className="relative z-10 w-[65%]">
          <h2 className="text-[22px] font-semibold mb-3 tracking-wide">Smork AI Assistant</h2>
          <p className="text-white/90 text-[14px] leading-relaxed mb-6 font-medium">
            Get instant insights, drafts and recommendations across patient care and operations.
          </p>
          <button className="bg-white text-[#866BE3] px-6 py-2.5 rounded-full font-bold text-[14px] flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm w-fit group">
            Prepare my day 
            <Sparkles className="w-4 h-4 text-[#866BE3] group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* CSS Robot Illustration */}
        <div className="absolute -bottom-2 -right-2 w-[150px] h-[150px] pointer-events-none flex flex-col items-center justify-end">
            <div className="w-[90px] h-[80px] bg-gradient-to-b from-[#344054] to-[#1D2939] rounded-[2rem] border-4 border-[#E2E8F0] shadow-lg relative z-20 flex flex-col items-center justify-center">
                <div className="flex gap-4 mb-2">
                    <div className="w-4 h-2 bg-[#22D3EE] rounded-full shadow-[0_0_8px_#22D3EE]"></div>
                    <div className="w-4 h-2 bg-[#22D3EE] rounded-full shadow-[0_0_8px_#22D3EE]"></div>
                </div>
                <div className="w-3 h-1.5 bg-[#22D3EE] rounded-full opacity-80 mt-1"></div>
            </div>
            {/* Robot Body */}
            <div className="w-[120px] h-[60px] bg-gradient-to-b from-[#F1F5F9] to-[#CBD5E1] rounded-t-[3rem] -mt-4 z-10 border-t-2 border-white/50 relative overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/40 rounded-full blur-md"></div>
            </div>
            {/* Ears */}
            <div className="absolute top-[40px] left-[15px] w-6 h-8 bg-[#94A3B8] rounded-l-full z-10"></div>
            <div className="absolute top-[40px] right-[15px] w-6 h-8 bg-[#94A3B8] rounded-r-full z-10"></div>
        </div>
      </div>
    </div>
  );
}
