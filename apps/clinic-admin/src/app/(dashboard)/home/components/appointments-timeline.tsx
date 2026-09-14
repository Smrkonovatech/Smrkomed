"use client";

import { User, FileText, AlertTriangle, Target, Calendar, CheckCircle2, X, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useAppState } from "@/lib/app-state";
import { findCouple } from "@/lib/demo-data";
import type { Appointment, Couple } from "@/lib/demo-data";

interface TooltipCardProps {
   appointment: Appointment;
   couple: Couple | undefined;
   color: string;
   initial: string;
   leftPercent: number;
}

const TooltipCard = ({ appointment, couple, color, initial, leftPercent }: TooltipCardProps) => {
   let tooltipPosClass = "left-1/2 -translate-x-1/2";
   if (leftPercent < 20) {
      tooltipPosClass = "left-0 -translate-x-4";
   } else if (leftPercent > 80) {
      tooltipPosClass = "right-0 translate-x-4";
   }

   return (
   <div className={`absolute bottom-full ${tooltipPosClass} mb-4 w-[400px] lg:w-[500px] bg-white rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.15)] border border-gray-100 p-5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex flex-col gap-5 z-50`}>
      {/* Header */}
      <div className="flex items-start justify-between">
         <div className="flex items-center gap-3">
            {/* Avatars */}
            <div className="flex -space-x-3">
               <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
                  <User className="w-5 h-5 text-gray-400" />
               </div>
               {couple?.partner && (
                  <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
                     <User className="w-5 h-5 text-gray-400" />
                  </div>
               )}
            </div>

            <div>
               <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-bold text-gray-800">
                     {couple?.primary?.name} {couple?.partner && `& ${couple.partner.name.split(' ')[0]}`}
                  </h4>
                  <div className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold" style={{ backgroundColor: color }}>{initial}</div>
               </div>
               <p className="text-[12px] text-gray-500 font-medium">{appointment.type} • {appointment.time}</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#E6F4EA] text-[#1E8E3E] px-3 py-1 rounded-full text-[11px] font-bold">
               <CheckCircle2 className="w-3.5 h-3.5" />
               {appointment.status}
            </div>
            <button className="text-gray-400 hover:text-gray-600">
               <X className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-[1fr_200px] gap-6 border-t border-gray-100 pt-4">
         {/* Left Column */}
         <div className="flex flex-col gap-4">
            <div className="flex gap-3">
               <User className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
               <div>
                  <h5 className="text-[12px] font-bold mb-0.5" style={{ color }}>Appointment for</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">{appointment.type} discussion</p>
               </div>
            </div>

            <div className="flex gap-3">
               <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
               <div>
                  <h5 className="text-[12px] font-bold mb-0.5" style={{ color }}>Recent updates</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">Patient progressing well in current care loop.</p>
               </div>
            </div>

            {couple?.status === "Needs Attention" && (
               <div className="flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                     <h5 className="text-[12px] font-bold text-gray-800 mb-0.5">Important for doctor</h5>
                     <p className="text-[12px] text-gray-600 leading-tight">Couple is anxious. Discuss next steps and medication plan.</p>
                  </div>
               </div>
            )}
         </div>

         {/* Right Column */}
         <div className="flex flex-col gap-4 border-l border-gray-100 pl-6">
            <div className="flex gap-3">
               <Target className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
               <div>
                  <h5 className="text-[12px] font-bold mb-0.5" style={{ color }}>Journey stage</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">{couple?.stage || "Pending"}</p>
               </div>
            </div>

            <div className="flex gap-3">
               <Calendar className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
               <div>
                  <h5 className="text-[12px] font-bold mb-0.5" style={{ color }}>Status</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">{couple?.status || "Pending"}</p>
               </div>
            </div>

            <button className="mt-auto bg-[#F0ECF9] font-semibold text-[12px] py-2 rounded-full flex items-center justify-center gap-2 hover:bg-[#e4dcf4] transition-colors w-full" style={{ color }}>
               Open Patient <ArrowRight className="w-3.5 h-3.5" />
            </button>
         </div>
      </div>
   </div>
   );
};

export function AppointmentsTimeline() {
   const { appointments, couples } = useAppState();

   const getMinutesFrom8AM = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(" ");
      const timePart = parts[0] || "08:00";
      const periodPart = parts[1] || "AM";
      
      const timeSplit = timePart.split(":");
      const h = parseInt(timeSplit[0] || "8", 10);
      const m = parseInt(timeSplit[1] || "0", 10);
      
      let hours24 = h;
      if (periodPart === "PM" && h !== 12) hours24 += 12;
      if (periodPart === "AM" && h === 12) hours24 = 0;
      
      return (hours24 - 8) * 60 + m;
   };

   const getLeftPercentage = (timeStr: string) => {
      const mins = getMinutesFrom8AM(timeStr);
      // 11 hours * 60 = 660 total minutes (08:00 to 19:00)
      const percentage = (mins / 660) * 100;
      return Math.max(0, Math.min(100, percentage));
   };

   const colors = ["#866BE3", "#C178F5", "#00A89D", "#00A89D", "#F39C12"];

   return (
      <div className="px-4 pt-4 pb-0">
         <h3 className="text-[#866BE3] font-medium mb-6">Todays Appointments</h3>

         <div className="overflow-x-auto pb-6 -mt-[350px] pt-[350px]">
            <div className="min-w-[1000px] lg:min-w-full px-6">
               <div className="relative mx-[100px]">
                  {/* Timeline intervals */}
                  <div className="flex justify-between relative z-0">
                     {Array.from({ length: 23 }, (_, i) => {
                        const totalMins = 8 * 60 + i * 30;
                        const h = Math.floor(totalMins / 60);
                        const m = totalMins % 60;
                        const isHour = m === 0;
                        const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        return (
                           <div key={i} className="flex flex-col items-center">
                              <span className={`mb-8 text-gray-400 ${isHour ? 'text-[11px]' : 'text-[11px]'}`}>{label}</span>
                              <div className={`rounded-full bg-gray-300 ${isHour ? 'w-[2px] h-16' : 'w-[2px] h-16'}`}></div>
                           </div>
                        );
                     })}
                  </div>

                  {/* Appointment Pills */}
                  {appointments.map((app, index) => {
                     const couple = findCouple(app.coupleId, couples ?? []);
                     const leftPercent = getLeftPercentage(app.time);
                     const color = colors[index % colors.length] || "#866BE3";
                     const initial = couple?.primary?.name?.[0] || 'P';
                     const isUpNext = index === 0;

                     return (
                        <div key={app.id} className="absolute top-12 z-20 group cursor-pointer" style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}>
                           {!isUpNext && <TooltipCard appointment={app} couple={couple} color={color} initial={initial} leftPercent={leftPercent} />}
                           
                           <div className={`relative rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-white`} style={{ backgroundColor: `${color}15` }}>
                              {isUpNext && (
                                 <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#00A89D] text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Up - Next
                                 </div>
                              )}
                              
                              {isUpNext ? (
                                 <div className="flex flex-col">
                                    <span className="text-[13px] font-semibold leading-tight whitespace-nowrap" style={{ color }}>{couple?.primary?.name} {couple?.partner && `& ${couple.partner.name.split(' ')[0]}`}</span>
                                    <span className="text-[10px] text-gray-500 leading-tight whitespace-nowrap">{app.type}</span>
                                 </div>
                              ) : (
                                 <span className="text-[13px] font-medium whitespace-nowrap" style={{ color }}>{couple?.primary?.name}</span>
                              )}
                              <div className="w-6 h-6 rounded-full text-white text-[11px] flex items-center justify-center font-bold ml-auto shrink-0" style={{ backgroundColor: color }}>{initial}</div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         </div>
      </div>
   );
}