"use client";

import { 
  Stethoscope, 
  Heart, 
  CalendarDays, 
  UserCheck, 
  FlaskConical 
} from "lucide-react";

interface RolesProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function Roles({ onOpenDemo }: RolesProps) {
  const roles = [
    {
      title: "Doctor",
      purpose: "Clinical decisions",
      icon: Stethoscope,
      circleGradient: "from-[#38bdf8] to-[#0ea5e9]",
      glowColor: "shadow-sky-400/30",
    },
    {
      title: "Care coordinator",
      purpose: "Clinical assistant",
      icon: Heart,
      circleGradient: "from-[#c084fc] to-[#9333ea]",
      glowColor: "shadow-purple-400/30",
    },
    {
      title: "Reception",
      purpose: "General workflows",
      icon: CalendarDays,
      circleGradient: "from-[#5eead4] to-[#14b8a6]",
      glowColor: "shadow-teal-400/30",
    },
    {
      title: "Nurse",
      purpose: "Clinical workflows",
      icon: UserCheck,
      circleGradient: "from-[#93c5fd] to-[#6366f1]",
      glowColor: "shadow-indigo-400/30",
    },
    {
      title: "Lab",
      purpose: "Clinical decisions",
      icon: FlaskConical,
      circleGradient: "from-[#f472b6] to-[#db2777]",
      glowColor: "shadow-pink-400/30",
    },
  ];

  return (
    <section className="relative overflow-hidden pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-slate-900 leading-tight">
            Built for everyone <span className="font-light text-slate-800">who</span>
            <br />
            delivers care
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 font-normal max-w-md mx-auto leading-relaxed">
            Every role gets a separate login,
            <br className="hidden sm:inline" />
            with the tools, context and actions they need.
          </p>
        </div>

        {/* 5 Distinct White Feature Cards */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.title}
                onClick={() => onOpenDemo?.(role.title)}
                className="group relative flex flex-col items-center justify-center rounded-3xl bg-white/95 p-6 sm:p-7 text-center shadow-lg shadow-sky-500/5 border border-white hover:bg-white hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
              >
                {/* Circular Gradient Icon Container with subtle glow */}
                <div className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-b ${role.circleGradient} p-3 text-white shadow-md ${role.glowColor} group-hover:scale-105 transition-transform duration-300`}>
                  <Icon className="h-8 w-8 sm:h-9 sm:w-9 text-white stroke-[1.75]" />
                </div>

                {/* Role Title */}
                <h3 className="mt-5 text-sm sm:text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  {role.title}
                </h3>

                {/* Purpose / Subtitle */}
                <p className="mt-1 text-[11px] sm:text-xs text-slate-400 font-normal">
                  {role.purpose}
                </p>
              </div>
            );
          })}
        </div>

      </div>

      {/* Layered Soft Clouds at Bottom transitioning to pure white */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none -z-0 opacity-95">
        <svg
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto translate-y-4"
          preserveAspectRatio="none"
        >
          {/* Back Cloud Layer */}
          <path
            d="M0 160C120 140 240 120 380 135C520 150 640 190 780 170C920 150 1060 110 1200 125C1340 140 1400 160 1440 170V220H0V160Z"
            fill="white"
            fillOpacity="0.6"
          />
          {/* Front Fluffy Clouds Layer */}
          <path
            d="M0 180C90 140 190 140 290 165C390 190 480 200 580 175C680 150 780 120 890 135C1000 150 1100 185 1220 175C1320 165 1390 150 1440 155V220H0V180Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
