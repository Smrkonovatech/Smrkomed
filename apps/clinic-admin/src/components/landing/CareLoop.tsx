"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  FileCheck2, 
  ListChecks, 
  MessageSquare, 
  CheckCircle2, 
  FastForward, 
  AlertTriangle, 
  PhoneCall, 
  UserCheck, 
  Stethoscope, 
  ArrowRight,
  TrendingUp,
  Heart,
  RefreshCw,
  Sparkles
} from "lucide-react";

interface CareLoopProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function CareLoop({ onOpenDemo }: CareLoopProps) {
  const [activeBranch, setActiveBranch] = useState<"standard" | "exception">("standard");

  const ringNodes = [
    { label: "Doctor Approval", icon: FileCheck2, color: "text-blue-500 bg-blue-50 border-blue-200" },
    { label: "Tasks Created", icon: ListChecks, color: "text-cyan-500 bg-cyan-50 border-cyan-200" },
    { label: "Patient Engaged", icon: MessageSquare, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
    { label: "Follow-ups Tracked", icon: RefreshCw, color: "text-pink-500 bg-pink-50 border-pink-200" },
    { label: "Care Continues", icon: FastForward, color: "text-purple-500 bg-purple-50 border-purple-200" },
    { label: "Insights for Care", icon: TrendingUp, color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
    { label: "Better Outcomes", icon: Heart, color: "text-rose-500 bg-rose-50 border-rose-200" },
  ];

  return (
    <section id="care-loop" className="py-20 sm:py-28 bg-slate-950 text-white relative overflow-hidden">
      {/* Dynamic Aura Gradient matching brochure */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[750px] w-[750px] rounded-full bg-gradient-to-tr from-purple-600/30 via-cyan-500/25 to-blue-600/30 blur-[130px] -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-950/80 border border-cyan-400/40 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>The Engine Behind Continuous Care</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Care Loop keeps care moving.
          </h2>
          
          <p className="mt-4 text-base sm:text-lg text-slate-300 font-normal">
            Turn a care plan into actions, follow-ups and timely escalation.
          </p>
        </div>

        {/* Central Circular Radial Donut Ring (Visual Hero inspired by brochure) */}
        <div className="mt-14 relative mx-auto flex max-w-3xl items-center justify-center p-8">
          
          {/* Glowing Radial Halo */}
          <div className="relative flex h-80 w-80 sm:h-96 sm:w-96 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600/40 via-cyan-400/30 to-indigo-600/40 p-5 shadow-[0_0_100px_rgba(124,58,237,0.35)] backdrop-blur-2xl border border-white/10">
            {/* Inner Ring */}
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950/90 border border-white/10 text-center p-6">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/25">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
                  <Image
                    src="/branding/smrkomed-mark.png"
                    alt="SmrkoMed"
                    width={32}
                    height={32}
                    className="object-contain invert"
                  />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white tracking-tight">38</div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Active Journeys
              </div>
              <div className="mt-1 text-[11px] text-slate-400 font-mono">Continuous Loop</div>
            </div>
          </div>

          {/* Floating Orbiting Node Chips */}
          <div className="absolute inset-0 pointer-events-none hidden sm:block">
            {/* Top Node */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-blue-400/40 bg-slate-900/90 px-3.5 py-1.5 shadow-xl text-xs font-semibold text-blue-300">
              <FileCheck2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Doctor Approval</span>
            </div>

            {/* Top Right */}
            <div className="absolute top-16 right-4 sm:right-12 flex items-center gap-2 rounded-full border border-cyan-400/40 bg-slate-900/90 px-3.5 py-1.5 shadow-xl text-xs font-semibold text-cyan-300">
              <ListChecks className="h-3.5 w-3.5 text-cyan-400" />
              <span>Tasks Created</span>
            </div>

            {/* Bottom Right */}
            <div className="absolute bottom-16 right-4 sm:right-12 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-slate-900/90 px-3.5 py-1.5 shadow-xl text-xs font-semibold text-emerald-300">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
              <span>Patient Engaged</span>
            </div>

            {/* Bottom */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-pink-400/40 bg-slate-900/90 px-3.5 py-1.5 shadow-xl text-xs font-semibold text-pink-300">
              <RefreshCw className="h-3.5 w-3.5 text-pink-400" />
              <span>Follow-ups Tracked</span>
            </div>

            {/* Bottom Left */}
            <div className="absolute bottom-16 left-4 sm:left-12 flex items-center gap-2 rounded-full border border-purple-400/40 bg-slate-900/90 px-3.5 py-1.5 shadow-xl text-xs font-semibold text-purple-300">
              <FastForward className="h-3.5 w-3.5 text-purple-400" />
              <span>Care Continues</span>
            </div>

            {/* Top Left */}
            <div className="absolute top-16 left-4 sm:left-12 flex items-center gap-2 rounded-full border border-rose-400/40 bg-slate-900/90 px-3.5 py-1.5 shadow-xl text-xs font-semibold text-rose-300">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              <span>Better Outcomes</span>
            </div>
          </div>

        </div>

        {/* Interactive Path Toggle: Standard Flow vs Exception Path */}
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setActiveBranch("standard")}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeBranch === "standard"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            ✓ Standard Execution Flow
          </button>
          <button
            type="button"
            onClick={() => setActiveBranch("exception")}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeBranch === "exception"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            ⚠ Exception & Escalation Flow
          </button>
        </div>

        {/* Workflow Diagram Box */}
        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl">
          {activeBranch === "standard" ? (
            /* Standard Path */
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Standard Automated Cycle
                </span>
                <span className="text-xs text-slate-400">When patient confirms action</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { step: "01", label: "Doctor Plan", sub: "Approved in EMR", icon: FileCheck2 },
                  { step: "02", label: "Care Task", sub: "Trigger created", icon: ListChecks },
                  { step: "03", label: "Patient Chat", sub: "WhatsApp dispatched", icon: MessageSquare },
                  { step: "04", label: "Response", sub: "Patient confirms", icon: CheckCircle2 },
                  { step: "05", label: "Completed", sub: "State updated", icon: Sparkles },
                  { step: "06", label: "Next Action", sub: "Next stage armed", icon: FastForward },
                ].map((n) => {
                  const Icon = n.icon;
                  return (
                    <div key={n.step} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-center">
                      <div className="text-[10px] font-mono text-purple-400 font-bold">{n.step}</div>
                      <div className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-950/80 text-purple-300 border border-purple-800/60">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-2.5 text-xs font-bold text-white">{n.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{n.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Exception Path */
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Exception &amp; Human Handoff Loop
                </span>
                <span className="text-xs text-slate-400">When patient doesn&apos;t reply or reports pain</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { step: "01", label: "No Response", sub: "Timeout reached", icon: AlertTriangle, color: "text-amber-400" },
                  { step: "02", label: "Reminder", sub: "Smart retry sent", icon: RefreshCw, color: "text-cyan-400" },
                  { step: "03", label: "Care Voice", sub: "AI calls patient", icon: PhoneCall, color: "text-purple-400" },
                  { step: "04", label: "Coordinator", sub: "Operational task", icon: UserCheck, color: "text-indigo-400" },
                  { step: "05", label: "Doctor", sub: "Clinical decision", icon: Stethoscope, color: "text-rose-400" },
                ].map((n) => {
                  const Icon = n.icon;
                  return (
                    <div key={n.step} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-center">
                      <div className="text-[10px] font-mono text-amber-400 font-bold">{n.step}</div>
                      <div className={`mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 ${n.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-2.5 text-xs font-bold text-white">{n.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{n.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
