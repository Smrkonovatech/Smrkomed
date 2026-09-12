import Image from "next/image";
import { Mic, Clock, Users, Leaf, Calendar, ArrowRight, User } from "lucide-react";

export function RightSidebar() {
  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* Alerts List */}
      <div className="flex flex-col gap-1.5">
        {[
          { label: 'Clinical Escalations', count: 2, badgeColor: 'bg-[#F48484]' },
          { label: 'Reports Awaiting Review', count: 2, badgeColor: 'bg-[#F48484]' },
          { label: 'Care Loop Exceptions', count: 3, badgeColor: 'bg-[#F5B575]' },
          { label: 'Patient Questions', count: 2, badgeColor: 'bg-[#71A021]' }
        ].map((alert, i) => (
          <div key={i} className="flex items-center justify-between p-1 pr-4 rounded-full bg-[#EFEAF6]">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-medium ${alert.badgeColor}`}>
                {alert.count}
              </span>
              <span className="text-[13px] text-[#866BE3]">{alert.label}</span>
            </div>
            <button className="text-[11px] text-[#866BE3] underline hover:text-[#7254d1] decoration-1 underline-offset-2">View</button>
          </div>
        ))}
      </div>

      {/* Voice Consultation Card */}
      <div className="rounded-[24px] p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 isolate bg-white">

        <div className="flex items-center justify-between w-full z-10">
          <span className="text-[9px] font-bold tracking-[0.15em] text-[#A694E8] uppercase">Next Patient</span>
          <div className="bg-[#F4F0FC] text-[#866BE3] px-2.5 py-1 rounded-full text-[9px] font-semibold flex items-center gap-1 shadow-sm">
            <Clock className="w-3 h-3" /> In 12 minutes
          </div>
        </div>

        {/* Avatar & Info */}
        <div className="flex flex-col items-center gap-1.5 mt-0.5 z-10">
          <div className="relative">
            {/* Large purple glow behind avatar */}
            <div className="absolute inset-0 bg-[#C178F5] opacity-25 blur-lg rounded-full scale-125"></div>

            {/* Two Overlapping Avatars */}
            <div className="relative z-10 flex -space-x-3 items-center justify-center">
              <div className="w-[48px] h-[48px] rounded-full border-2 border-white shadow-sm relative z-20 overflow-hidden bg-white">
                <Image src="/images/dashboard/patient.png" alt="Patient 1" fill className="object-cover" />
              </div>
              <div className="w-[48px] h-[48px] rounded-full border-2 border-white shadow-sm relative z-10 overflow-hidden bg-white">
                <Image src="/images/dashboard/patient.png" alt="Patient 2" fill className="object-cover" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-[16px] font-bold text-[#1f1830] leading-tight">Geethu & Arjun</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5 tracking-wide">IVF Consultation • 11:00 AM - 11:30 AM</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full z-10">
          <button className="bg-gradient-to-r from-[#A784F3] to-[#866BE3] text-white rounded-full p-1 flex items-center justify-between flex-[65%] shadow-[0_12px_24px_rgb(134,107,227,0.35)] relative overflow-hidden group">
            <div className="w-7 h-7 rounded-full border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
              <Mic className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium text-[11px] whitespace-nowrap pl-1">Start Consultation</span>
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </div>
          </button>

          <button className="bg-gradient-to-r from-[#FBF9FF] to-[#F3EEFC] text-[#866BE3] rounded-full p-1 pl-2.5 flex items-center justify-between flex-[35%] shadow-[0_8px_16px_rgb(134,107,227,0.08)] border border-white relative overflow-hidden group hover:shadow-[0_8px_20px_rgb(134,107,227,0.12)] transition-shadow">
            <span className="font-medium text-[11px] whitespace-nowrap mx-auto">View</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-3.5 h-3.5 text-[#866BE3]" />
            </div>
          </button>
        </div>

      </div>

      {/* AI Prep Card */}
      <div className="rounded-[24px] p-4 text-white text-center flex flex-col items-center justify-center relative z-0 overflow-hidden shadow-sm flex-1 min-h-[140px] mt-auto">
         <Image src="/images/dashboard/prepare-bg.png" alt="Prepare Background" fill className="object-cover z-0" />

        <p className="text-[13px] leading-[1.3] relative z-10">
          <span className="font-semibold drop-shadow-sm">You have 8 patient visits today</span><br />
          <span className="font-medium opacity-90 drop-shadow-sm text-[12px]">and 1 of them reported emergency</span>
        </p>

        <button className="mt-4 bg-white text-[#866BE3] px-4 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 hover:bg-gray-50 transition-colors relative z-10 shadow-sm">
          <Image src="/images/dashboard/bot.svg" alt="Bot Icon" width={14} height={14} />
          Prepare my day
        </button>
      </div>
    </div>
  );
}
