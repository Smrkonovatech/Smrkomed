import Image from "next/image";

export function MainOverview() {
   return (
      <div className="flex flex-col h-full">
         <div className="mb-[clamp(0.5rem,1.5vh,1rem)]">
            <h1 className="text-[clamp(1.25rem,2.5vw,2rem)] font-semibold text-gray-800 tracking-tight">Good Morning Dr. Shreya</h1>
            <p className="text-gray-500 mt-1 text-[clamp(0.75rem,1.2vw,1rem)]">Here's what needs your attention today</p>
         </div>

         <div className="flex-1 relative flex flex-col lg:flex-row items-center justify-center min-h-[clamp(8rem,18vh,16rem)] mt-1 lg:mt-0">
            {/* Center Wrapper for Image, Text, and Orbits to ensure perfect alignment */}
            <div className="relative w-[clamp(160px,18vw,200px)] h-[clamp(160px,18vw,200px)] flex items-center justify-center shrink-0 overflow-visible">

               {/* Glowing Gradient Donut (Image) - oversized so it bleeds out; centered via transform */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none w-[clamp(260px,32vw,500px)] h-[clamp(260px,32vw,500px)]">
                  <Image src="/images/dashboard/circle-glow.png"
                     alt="Active Journeys" fill className="object-contain" priority />
               </div>

               {/* Center Text - perfectly centered, no offset */}
               <div className="relative z-10 flex flex-col items-center justify-center left-[33px]">
                  <span className="font-medium text-[#7F73E6] leading-none tracking-tight text-[clamp(2.5rem,4vw,5.5rem)]">38</span>
                  <span className="text-gray-500 mt-1 font-medium text-[clamp(0.625rem,1.5vw,1.1rem)]">Active Journeys</span>
                  <button className="text-[clamp(9px,1vw,14px)] text-gray-400 underline mt-1 hover:text-indigo-500">View all</button>
               </div>

               {/* Orbiting Badges Container - same center/size as the glow image */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none w-[clamp(260px,32vw,440px)] h-[clamp(260px,32vw,440px)] flex items-center justify-center">
                  <div className="relative w-full h-full">
                     {/* V (Outer, Top-Left) */}
                     <div className="absolute top-[80px] left-1/2 -translate-x-1/2 -translate-y-1/2 origin-[50%_140px] animate-[spin_40s_linear_infinite] hover:[animation-play-state:paused] pointer-events-auto group" style={{ animationDelay: '-35s' }}>
                        <div className="animate-[spin_40s_linear_infinite_reverse] group-hover:[animation-play-state:paused] relative" style={{ animationDelay: '-35s' }}>
                           <div className="w-8 h-8 rounded-full bg-[#866BE3] flex items-center justify-center text-white text-xs font-medium shadow-md cursor-pointer transition-transform hover:scale-110">V</div>

                           {/* Tooltip */}
                           <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-white/60 backdrop-blur-md border border-white rounded-2xl p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none w-max">
                              <div className="text-[#866BE3] text-sm font-medium">Veena</div>
                              <div className="text-gray-500 text-xs mt-1">HSG scan - 9.30 AM</div>
                           </div>
                        </div>
                     </div>

                     {/* K (Outer, Top-Right) */}
                     <div className="absolute top-[70px] left-1/2 -translate-x-1/2 -translate-y-1/2 origin-[50%_150px] animate-[spin_35s_linear_infinite] hover:[animation-play-state:paused] pointer-events-auto group" style={{ animationDelay: '-4.4s' }}>
                        <div className="animate-[spin_35s_linear_infinite_reverse] group-hover:[animation-play-state:paused] relative" style={{ animationDelay: '-4.4s' }}>
                           <div className="w-8 h-8 rounded-full bg-[#C178F5] flex items-center justify-center text-white text-xs font-medium shadow-md cursor-pointer transition-transform hover:scale-110">K</div>

                           {/* Tooltip */}
                           <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 bg-white/60 backdrop-blur-md border border-white rounded-2xl p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none w-max">
                              <div className="text-[#C178F5] text-sm font-medium">Kavya</div>
                              <div className="text-gray-500 text-xs mt-1">Follow up - 10.15 AM</div>
                           </div>
                        </div>
                     </div>

                     {/* G (Inner, Top) */}
                     <div className="absolute top-[80px] left-1/2 -translate-x-1/2 -translate-y-1/2 origin-[50%_140px] animate-[spin_25s_linear_infinite] hover:[animation-play-state:paused] pointer-events-auto group" style={{ animationDelay: '0s' }}>
                        <div className="animate-[spin_25s_linear_infinite_reverse] group-hover:[animation-play-state:paused] relative" style={{ animationDelay: '0s' }}>
                           <div className="w-8 h-8 rounded-full bg-[#00A89D] flex items-center justify-center text-white text-xs font-medium shadow-md cursor-pointer transition-transform hover:scale-110">G</div>

                           {/* Tooltip */}
                           <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 bg-white/60 backdrop-blur-md border border-white rounded-2xl p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none w-max">
                              <div className="text-[#00A89D] text-sm font-medium">Geethu</div>
                              <div className="text-gray-500 text-xs mt-1">Consultation - 11.00 AM</div>
                           </div>
                        </div>
                     </div>

                     {/* S (Inner, Right) */}
                     <div className="absolute top-[90px] left-1/2 -translate-x-1/2 -translate-y-1/2 origin-[50%_130px] animate-[spin_20s_linear_infinite] hover:[animation-play-state:paused] pointer-events-auto group" style={{ animationDelay: '-5s' }}>
                        <div className="animate-[spin_20s_linear_infinite_reverse] group-hover:[animation-play-state:paused] relative" style={{ animationDelay: '-5s' }}>
                           <div className="w-8 h-8 rounded-full bg-[#00A89D] flex items-center justify-center text-white text-xs font-medium shadow-md cursor-pointer transition-transform hover:scale-110">S</div>

                           {/* Tooltip */}
                           <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-white/60 backdrop-blur-md border border-white rounded-2xl p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none w-max">
                              <div className="text-[#00A89D] text-sm font-medium">Sneha</div>
                              <div className="text-gray-500 text-xs mt-1">Report review - 12.30 PM</div>
                           </div>
                        </div>
                     </div>

                     {/* P (Inner, Bottom) */}
                     <div className="absolute top-[100px] left-1/2 -translate-x-1/2 -translate-y-1/2 origin-[50%_120px] animate-[spin_22s_linear_infinite] hover:[animation-play-state:paused] pointer-events-auto group" style={{ animationDelay: '-11s' }}>
                        <div className="animate-[spin_22s_linear_infinite_reverse] group-hover:[animation-play-state:paused] relative" style={{ animationDelay: '-11s' }}>
                           <div className="w-8 h-8 rounded-full bg-[#F39C12] flex items-center justify-center text-white text-xs font-medium shadow-md cursor-pointer transition-transform hover:scale-110">P</div>

                           {/* Tooltip */}
                           <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-white/60 backdrop-blur-md border border-white rounded-2xl p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none w-max">
                              <div className="text-[#F39C12] text-sm font-medium">Priya</div>
                              <div className="text-gray-500 text-xs mt-1">Routine checkup - 2.00 PM</div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Right-side Vertical Stat Bubbles */}
            <div className="lg:absolute lg:right-4 lg:top-1/2 lg:-translate-y-1/2 flex flex-row flex-wrap lg:flex-nowrap lg:flex-col gap-2 z-10 origin-right justify-center mt-6 lg:mt-0 px-2 lg:px-0">
               {/* 31 On track */}
               <div className="relative flex flex-col items-center justify-center w-[clamp(5rem,8vw,7.5rem)] h-[clamp(3.5rem,6vw,5rem)]">
                  <Image src="/images/dashboard/glass-card.png" alt="Card Background" fill className="object-fill -z-10" />
                  <span className="text-[clamp(1rem,2vw,1.75rem)] text-[#C178F5] leading-none">31</span>
                  <span className="text-[clamp(0.45rem,0.7vw,0.6rem)] text-gray-500">On track</span>
               </div>

               {/* 04 Due today */}
               <div className="relative flex flex-col items-center justify-center w-[clamp(5rem,8vw,7.5rem)] h-[clamp(3.5rem,6vw,5rem)]">
                  <Image src="/images/dashboard/glass-card.png" alt="Card Background" fill className="object-fill -z-10" />
                  <span className="text-[clamp(1rem,2vw,1.75rem)] text-[#7F73E6] leading-none">04</span>
                  <span className="text-[clamp(0.45rem,0.7vw,0.6rem)] text-gray-500">Tasks Due Today</span>
               </div>

               {/* 03 Exceptions */}
               <div className="relative flex flex-col items-center justify-center w-[clamp(5rem,8vw,7.5rem)] h-[clamp(3.5rem,6vw,5rem)]">
                  <Image src="/images/dashboard/glass-card.png" alt="Card Background" fill className="object-fill -z-10" />
                  <span className="text-[clamp(1rem,2vw,1.75rem)] text-[#7F73E6] leading-none">03</span>
                  <span className="text-[clamp(0.45rem,0.7vw,0.6rem)] text-gray-500">Exceptions</span>
               </div>

               {/* 04 Awaiting Review */}
               <div className="relative flex flex-col items-center justify-center w-[clamp(5rem,8vw,7.5rem)] h-[clamp(3.5rem,6vw,5rem)]">
                  <Image src="/images/dashboard/glass-card.png" alt="Card Background" fill className="object-fill -z-10" />
                  <span className="text-[clamp(1rem,2vw,1.75rem)] text-[#C178F5] leading-none">04</span>
                  <span className="text-[clamp(0.45rem,0.7vw,0.6rem)] text-gray-500">Awaiting Review</span>
               </div>
            </div>

            {/* Patient & Doctor Illustration */}
            <div className="absolute -bottom-[20%] -left-[5%] w-[clamp(160px,22vw,340px)] h-[clamp(160px,22vw,340px)] z-20 pointer-events-none origin-bottom-left hidden xl:block">
               <Image
                  src="/images/dashboard/patient.png"
                  alt="Patient and Doctor"
                  fill
                  className="object-contain object-bottom"
               />
            </div>
         </div>

         <div className="flex justify-end mt-[clamp(0.5rem,1.5vh,1rem)]">
            <button className="bg-[#866BE3] text-white px-[clamp(1rem,2vw,1.5rem)] py-[clamp(0.3rem,0.8vh,0.5rem)] rounded-full text-[clamp(0.7rem,1.1vw,0.9rem)] font-medium hover:bg-[#7254d1] transition-colors shadow-md flex items-center gap-2">
               <Image src="/images/dashboard/med-icon.svg" alt="Med Icon" width={16} height={16} />
               <span>Open care loop</span>
            </button>
         </div>
      </div>
   );
}
