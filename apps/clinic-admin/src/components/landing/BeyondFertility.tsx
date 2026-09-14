"use client";

import {
  ArrowRight,
  Baby,
  Eye,
  Heart,
  Layers,
  Smile,
  Sparkles,
  Stethoscope,
  Activity,
  Bone,
} from "lucide-react";

interface BeyondFertilityProps {
  onOpenDemo: (interest?: string) => void;
}

export function BeyondFertility({ onOpenDemo }: BeyondFertilityProps) {
  const specialties = [
    {
      name: "Fertility & IVF",
      status: "Focus today",
      statusColor: "bg-purple-100 text-purple-800 border-purple-200",
      desc: "Full 15-stage IVF protocols, couple management, embryology, and autonomous Care Loop.",
      icon: Baby,
      active: true,
    },
    {
      name: "Dental",
      status: "Expanding",
      statusColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      desc: "Multi-visit orthodontic pathways, implant tracking, and automated post-op follow-up.",
      icon: Smile,
      active: false,
    },
    {
      name: "Dermatology",
      status: "Planned",
      statusColor: "bg-slate-100 text-slate-700 border-slate-200",
      desc: "Skin therapy cycles, medication monitoring, and aesthetic procedure continuity.",
      icon: Sparkles,
      active: false,
    },
    {
      name: "Maternity",
      status: "Planned",
      statusColor: "bg-slate-100 text-slate-700 border-slate-200",
      desc: "Trimester-by-trimester antenatal journeys, routine screening reminders, and pediatric handoff.",
      icon: Heart,
      active: false,
    },
    {
      name: "Aesthetics",
      status: "Planned",
      statusColor: "bg-slate-100 text-slate-700 border-slate-200",
      desc: "Package billing, touch-up session reminders, and photo progression documentation.",
      icon: Sparkles,
      active: false,
    },
    {
      name: "Orthopaedics",
      status: "Planned",
      statusColor: "bg-slate-100 text-slate-700 border-slate-200",
      desc: "Post-surgery physiotherapy compliance, mobility checkpoints, and rehabilitation milestones.",
      icon: Bone,
      active: false,
    },
    {
      name: "Ophthalmology",
      status: "Planned",
      statusColor: "bg-slate-100 text-slate-700 border-slate-200",
      desc: "Cataract/LASIK pre-op prep, post-op eye drop alarms, and visual acuity review schedules.",
      icon: Eye,
      active: false,
    },
    {
      name: "+ More Specialties",
      status: "Coming soon",
      statusColor: "bg-slate-100 text-slate-600 border-slate-200",
      desc: "Extensible journey templates designed to coordinate any multi-step healthcare protocol.",
      icon: Layers,
      active: false,
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Layers className="h-3.5 w-3.5 text-purple-600" /> Specialty Architecture
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Start with fertility. <br />
            <span className="text-purple-600">Grow across healthcare.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            SmrkoMed provides deep domain workflows for fertility today, with the foundational architecture to power connected care across any specialized clinic.
          </p>
        </div>

        {/* Specialty Cards Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {specialties.map((spec) => {
            const Icon = spec.icon;
            return (
              <div
                key={spec.name}
                className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                  spec.active
                    ? "border-purple-300 bg-purple-50/30 shadow-md ring-1 ring-purple-400/30"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        spec.active ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${spec.statusColor}`}
                    >
                      {spec.status}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {spec.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    {spec.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/80 text-[11px] font-semibold text-slate-500">
                  {spec.active ? (
                    <span className="text-purple-700 flex items-center gap-1">
                      Active Production Suite <ArrowRight className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-slate-400">Roadmap / Extension</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Supporting Quote */}
        <div className="mt-12 text-center">
          <blockquote className="text-sm sm:text-base font-bold text-slate-800">
            &ldquo;The specialty changes. The intelligence layer stays connected.&rdquo;
          </blockquote>
          <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
            Regardless of specialty, every patient journey requires scheduling, communication, task verification, and clinical safety handoffs.
          </p>
        </div>
      </div>
    </section>
  );
}
