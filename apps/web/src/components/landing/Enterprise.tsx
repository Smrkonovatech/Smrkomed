"use client";

import {
  ArrowRight,
  BrainCircuit,
  Building,
  Building2,
  CheckCircle2,
  GitMerge,
  HeartPulse,
  Layers,
  Network,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface EnterpriseProps {
  onOpenDemo: (interest?: string) => void;
}

export function Enterprise({ onOpenDemo }: EnterpriseProps) {
  const tiers = [
    {
      title: "Specialty Clinics",
      desc: "Run connected patient journeys and daily operations.",
      badge: "Single Center",
      points: [
        "Eliminate dropped follow-ups and missed medication alarms",
        "Streamlined OPD tokens, appointments & doctor workspaces",
        "Integrated billing packages and digital payment links",
      ],
      icon: Building,
      interest: "Clinic Management",
    },
    {
      title: "Multi-branch Clinics",
      desc: "Standardise workflows while maintaining branch-level operations.",
      badge: "Regional Network",
      points: [
        "Unified protocols across all clinic locations",
        "Branch-level inventory, pharmacy & billing isolation",
        "Centralized executive reporting across all doctor schedules",
      ],
      icon: Building2,
      interest: "Clinic Management",
    },
    {
      title: "Hospitals & Enterprise",
      desc: "Connect teams, systems, workflows and intelligence at scale.",
      badge: "Enterprise Scale",
      points: [
        "Federated role-based access for hundreds of clinical staff",
        "Seamless integration with legacy hospital HMS, LIS & PACS",
        "Customizable protocol templates & dedicated account engineering",
      ],
      icon: Network,
      interest: "Enterprise",
    },
  ];

  const differentiators = [
    {
      title: "CONNECTED JOURNEYS",
      subtitle: "Keep patient context connected from appointment to outcome.",
      desc: "No more disconnected records scattered across reception desks, diagnostic sheets, and WhatsApp chats. SmrkoMed ties every clinical event to the longitudinal patient journey.",
      icon: GitMerge,
      accent: "text-purple-600 bg-purple-50",
    },
    {
      title: "CARE LOOP",
      subtitle: "Turn care plans into trackable actions and follow-ups.",
      desc: "Traditional software records the doctor's plan and hopes for the best. SmrkoMed turns prescriptions into active tasks, monitors patient replies, and escalates exceptions automatically.",
      icon: RotateCcw,
      accent: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "INTELLIGENCE",
      subtitle: "Use AI to understand, communicate and coordinate—with humans in control.",
      desc: "Smrko AI assists with clinical summaries, drafting discharges, and answering routine patient questions, while keeping attending doctors in absolute authority of all medical decisions.",
      icon: BrainCircuit,
      accent: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <section className="py-20 sm:py-32 bg-slate-50/50 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section 24: Clinics / Hospitals / Enterprise */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-purple-600" /> Scalable Infrastructure
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Built for today&apos;s clinic. <br />
            <span className="text-purple-600">Ready for tomorrow&apos;s organisation.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Works with the systems you already use, scaling smoothly from standalone fertility clinics to national hospital networks.
          </p>
        </div>

        {/* 3 Tier Cards */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:border-purple-200 hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 border border-purple-100">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {tier.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-slate-900">{tier.title}</h3>
                  <p className="mt-1 text-xs font-medium text-purple-700">{tier.desc}</p>

                  <ul className="mt-5 space-y-2.5 text-xs text-slate-600">
                    {tier.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenDemo(tier.interest)}
                    className="w-full rounded-xl bg-slate-900 py-3 text-xs font-semibold text-white hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
                  >
                    <span>Talk to Our Team</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 25: WHY SMRKOMED */}
        <div className="mt-24 sm:mt-36">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Healthcare software shouldn&apos;t just record what happened.
            </h3>
            <p className="mt-3 text-base sm:text-xl font-medium text-purple-700">
              It should help coordinate what happens next.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {differentiators.map((diff) => {
              const Icon = diff.icon;
              return (
                <div
                  key={diff.title}
                  className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm hover:border-purple-200 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${diff.accent} mb-5`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-purple-700">
                      {diff.title}
                    </span>
                    <h4 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                      {diff.subtitle}
                    </h4>
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                      {diff.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
