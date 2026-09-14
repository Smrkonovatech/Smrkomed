"use client";

import { 
  Heart, 
  Smile, 
  Sparkles, 
  Baby, 
  Activity, 
  Bone, 
  Eye, 
  Building2,
  CheckCircle2,
  Clock
} from "lucide-react";

export function Specialties() {
  const specialties = [
    {
      title: "Fertility & IVF",
      status: "Current Focus",
      statusType: "current",
      desc: "Comprehensive cycle tracking, couple records, ultrasound monitoring & Care Loop follow-ups.",
      icon: Heart,
      accent: "border-purple-300 bg-purple-50/50 shadow-purple-500/10",
      badgeClass: "bg-purple-600 text-white",
    },
    {
      title: "Dental",
      status: "Expanding",
      statusType: "expanding",
      desc: "Procedure journeys, recall reminders, hygiene follow-ups and treatment plan tracking.",
      icon: Smile,
      accent: "border-slate-200 bg-white",
      badgeClass: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    },
    {
      title: "Dermatology",
      status: "Planned",
      statusType: "planned",
      desc: "Session schedules, prescription renewals and post-procedure photo follow-up.",
      icon: Sparkles,
      accent: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-600",
    },
    {
      title: "Maternity",
      status: "Planned",
      statusType: "planned",
      desc: "Trimester care journeys, antenatal scan reminders and delivery planning.",
      icon: Baby,
      accent: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-600",
    },
    {
      title: "Aesthetics",
      status: "Planned",
      statusType: "planned",
      desc: "Multi-session packaging, consent documentation and aftercare instructions.",
      icon: Activity,
      accent: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-600",
    },
    {
      title: "Orthopaedics",
      status: "Planned",
      statusType: "planned",
      desc: "Physiotherapy tracking, recovery milestone check-ins and surgical prep.",
      icon: Bone,
      accent: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-600",
    },
    {
      title: "Ophthalmology",
      status: "Planned",
      statusType: "planned",
      desc: "Pre-op drop regimens, post-op vision tracking and checkup alerts.",
      icon: Eye,
      accent: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-600",
    },
    {
      title: "Multispecialty",
      status: "Coming Soon",
      statusType: "planned",
      desc: "Unified cross-department patient tracking, OPD flows and smart discharge.",
      icon: Building2,
      accent: "border-slate-200 bg-white",
      badgeClass: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <section id="solutions" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200/60 mb-3">
            Specialty Roadmap
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Starting with fertility.<br />
            <span className="text-purple-600">Built to grow across healthcare.</span>
          </h2>
          <p className="mt-3 text-base text-slate-600 font-normal">
            Start with one specialty. Scale the platform across your organisation.
          </p>
        </div>

        {/* Specialty Cards Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {specialties.map((spec) => {
            const Icon = spec.icon;
            const isCurrent = spec.statusType === "current";
            return (
              <div
                key={spec.title}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${spec.accent}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isCurrent ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${spec.badgeClass}`}>
                      {spec.status}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {spec.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {spec.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  {isCurrent ? (
                    <span className="text-purple-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Fully Supported
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Expanding in SmrkoMed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
