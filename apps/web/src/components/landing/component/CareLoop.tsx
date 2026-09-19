import Image from "next/image";
import { FileText, ListChecks, User, CalendarDays, RefreshCw, BarChart2 } from "lucide-react";

export function CareLoop() {
  const cards = [
    { label: "Doctor\nApproval", icon: FileText, top: "12%", left: "50%" },
    { label: "Tasks\nCreated", icon: ListChecks, top: "26%", left: "80%" },
    { label: "Patient\nEngaged", icon: User, top: "58%", left: "86%" },
    { label: "Follow-ups\nTracked", icon: CalendarDays, top: "85%", left: "68%" },
    { label: "Care\nContinues", icon: RefreshCw, top: "85%", left: "32%" },
    { label: "Insights for\nbetter care", icon: BarChart2, top: "58%", left: "14%" },
    { label: "Better\nOutcomes", icon: FileText, top: "26%", left: "20%" },
  ];

  return (
    <section className="relative w-full bg-white py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 lg:px-12 relative z-10">
        
        {/* Header Content */}
        <div className="text-center mb-16 sm:mb-24">
          <h2 className="text-[3rem] lg:text-[4rem] leading-[1.15] text-[#1E293B] tracking-tight">
            <span className="font-semibold">Care Loop</span> <span className="font-light">keeps<br />care moving.</span>
          </h2>
          <p className="mt-6 text-[15px] text-slate-500 max-w-[400px] mx-auto leading-[1.7]">
            Care Loop sits between a doctor-approved<br />
            treatment plan and the patient&apos;s follow-through.<br />
            Once a doctor approves a plan, Care Loop turns it<br />
            into a coordinated sequence of actions.
          </p>
        </div>

        {/* The Loop Graphic & Floating Cards */}
        <div className="relative w-full max-w-[800px] flex justify-center items-center">
          
          {/* Main Loop Image (Glowing ring) */}
          <Image 
            src="/images/landing/loop.png" 
            alt="Care Loop Diagram"
            width={1000}
            height={1000}
            className="w-full h-auto object-contain scale-110 sm:scale-100"
            priority
          />

          {/* Center Content Overlaid */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <Image 
              src="/images/landing/center-logo.svg" 
              alt="SMRKO AI Logo"
              width={100}
              height={50}
              className="w-[100px] h-auto object-contain mb-4"
            />
            <div className="text-center text-[22px] leading-tight text-[#1E293B] font-light">
              The engine behind<br />continuous care
            </div>
          </div>

          {/* Floating Glassmorphism Cards */}
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx}
                className="absolute z-20 flex flex-col items-center justify-center w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-[28px] sm:rounded-[32px] bg-white/50 backdrop-blur-md border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.06)] pointer-events-none"
                style={{
                  top: card.top,
                  left: card.left,
                  transform: "translate(-50%, -50%)"
                }}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white mb-2 drop-shadow-sm" strokeWidth={2.5} />
                <span className="text-[11px] sm:text-[12px] leading-tight font-medium text-[#1E293B] text-center whitespace-pre-line">
                  {card.label}
                </span>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}
