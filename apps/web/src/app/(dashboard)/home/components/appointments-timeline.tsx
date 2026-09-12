import { User, FileText, AlertTriangle, Target, Calendar, CheckCircle2, X, ArrowRight } from "lucide-react";
import Image from "next/image";

const TooltipCard = () => (
   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[500px] bg-white rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] border border-gray-100 p-5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex flex-col gap-5 z-50">
      {/* Header */}
      <div className="flex items-start justify-between">
         <div className="flex items-center gap-3">
            {/* Avatars */}
            <div className="flex -space-x-3">
               <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
                  <User className="w-5 h-5 text-gray-400" />
               </div>
               <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
                  <User className="w-5 h-5 text-gray-400" />
               </div>
            </div>

            <div>
               <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-bold text-gray-800">Geethu & Arjun</h4>
                  <div className="w-5 h-5 rounded-full bg-[#866BE3] text-white text-[10px] flex items-center justify-center font-bold">G</div>
               </div>
               <p className="text-[12px] text-gray-500 font-medium">IVF Consultation • 11:00 AM - 11:30 AM</p>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#E6F4EA] text-[#1E8E3E] px-3 py-1 rounded-full text-[11px] font-bold">
               <CheckCircle2 className="w-3.5 h-3.5" />
               Confirmed
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
               <User className="w-4 h-4 text-[#866BE3] mt-0.5 shrink-0" />
               <div>
                  <h5 className="text-[12px] font-bold text-[#866BE3] mb-0.5">Appointment for</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">Treatment plan discussion</p>
               </div>
            </div>

            <div className="flex gap-3">
               <FileText className="w-4 h-4 text-[#866BE3] mt-0.5 shrink-0" />
               <div>
                  <h5 className="text-[12px] font-bold text-[#866BE3] mb-0.5">Recent updates</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">Day 5 scan completed. Good follicular response.</p>
               </div>
            </div>

            <div className="flex gap-3">
               <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
               <div>
                  <h5 className="text-[12px] font-bold text-gray-800 mb-0.5">Important for doctor</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">Couple is anxious. Discuss next steps and medication plan.</p>
               </div>
            </div>
         </div>

         {/* Right Column */}
         <div className="flex flex-col gap-4 border-l border-gray-100 pl-6">
            <div className="flex gap-3">
               <Target className="w-4 h-4 text-[#866BE3] mt-0.5 shrink-0" />
               <div>
                  <h5 className="text-[12px] font-bold text-[#866BE3] mb-0.5">Journey stage</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">Ovarian Stimulation • Day 5</p>
               </div>
            </div>

            <div className="flex gap-3">
               <Calendar className="w-4 h-4 text-[#866BE3] mt-0.5 shrink-0" />
               <div>
                  <h5 className="text-[12px] font-bold text-[#866BE3] mb-0.5">Last consultation</h5>
                  <p className="text-[12px] text-gray-600 leading-tight">15 Sep 2026<br />Scan review</p>
               </div>
            </div>

            <button className="mt-auto bg-[#F0ECF9] text-[#866BE3] font-semibold text-[12px] py-2 rounded-full flex items-center justify-center gap-2 hover:bg-[#e4dcf4] transition-colors w-full">
               Open Patient <ArrowRight className="w-3.5 h-3.5" />
            </button>
         </div>
      </div>
   </div>
);

export function AppointmentsTimeline() {
   return (
      <div className="p-4">
         <h3 className="text-[#866BE3] font-medium mb-6">Todays Appointments</h3>

         {/* Horizontal scroll wrapper for mobile, with top padding/margin to prevent tooltip clipping */}
         <div className="overflow-x-auto pb-4 -mt-[350px] pt-[350px]">
            <div className="relative min-w-[800px] lg:min-w-full">

            {/* Timeline intervals */}
            <div className="flex justify-between relative z-0">
               {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time, i) => (
                  <div key={i} className="flex flex-col items-center">
                     <span className="text-[11px] text-gray-400 mb-8">{time}</span>
                     <div className="w-px h-12 bg-gray-200"></div>
                  </div>
               ))}
            </div>


            {/* Appointment Pills */}
            <div className="absolute top-10 left-[10%] z-20 cursor-pointer">
               {/* Pill itself (No Tooltip) */}
               <div className="relative bg-[#F4ECFF] rounded-full px-5 py-2 flex items-center gap-3 shadow-sm border border-white min-w-[160px]">
                  {/* Up Next Badge */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#00A89D] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                     Up - Next
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[13px] text-[#866BE3] font-semibold leading-tight">Geethu & Arjun</span>
                     <span className="text-[10px] text-gray-500 leading-tight">Follow-up</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#C178F5] text-white text-[11px] flex items-center justify-center font-bold ml-auto">G</div>
               </div>
            </div>

            <div className="absolute top-12 left-[28%] z-20 group cursor-pointer">
               <TooltipCard />
               <div className="bg-[#F8F5FF] rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-white">
                  <span className="text-[13px] text-[#866BE3] font-medium">Geethu</span>
                  <div className="w-6 h-6 rounded-full bg-[#866BE3] text-white text-[11px] flex items-center justify-center font-bold">G</div>
               </div>
            </div>

            <div className="absolute top-12 left-[45%] z-20 group cursor-pointer">
               <TooltipCard />
               <div className="bg-[#FBF5FF] rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-white">
                  <span className="text-[13px] text-[#C178F5] font-medium">Geethu</span>
                  <div className="w-6 h-6 rounded-full bg-[#C178F5] text-white text-[11px] flex items-center justify-center font-bold">G</div>
               </div>
            </div>

            <div className="absolute top-12 left-[58%] z-20 group cursor-pointer">
               <TooltipCard />
               <div className="bg-[#E8F8F9] rounded-full px-4 py-2 flex items-center gap-3 shadow-sm border border-white">
                  <span className="text-[13px] text-[#00A89D] font-medium">Geethu</span>
                  <div className="w-6 h-6 rounded-full bg-[#00A89D] text-white text-[11px] flex items-center justify-center font-bold">G</div>
               </div>
            </div>

            <div className="absolute top-10 left-[72%] z-20 group cursor-pointer">
               <TooltipCard />
               <div className="bg-white rounded-full px-4 py-2 flex items-center gap-3 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-gray-100">
                  <span className="text-[13px] text-[#00A89D] font-medium">Geethu</span>
                  <div className="w-6 h-6 rounded-full bg-[#00A89D] text-white text-[11px] flex items-center justify-center font-bold">G</div>
               </div>
            </div>
         </div>
         </div>
      </div>
   );
}
