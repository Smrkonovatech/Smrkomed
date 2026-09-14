"use client";

import { 
  Stethoscope, 
  HeartHandshake, 
  CalendarCheck, 
  Activity, 
  FlaskConical, 
  Dna, 
  Pill, 
  Receipt, 
  ShieldCheck, 
  SlidersHorizontal,
  ArrowRight
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
      accent: "from-purple-500 to-indigo-600",
      bgLight: "bg-purple-50/70 text-purple-700 border-purple-100",
    },
    {
      title: "Care Coordinator",
      purpose: "Patient follow-up",
      icon: HeartHandshake,
      accent: "from-cyan-500 to-blue-600",
      bgLight: "bg-cyan-50/70 text-cyan-700 border-cyan-100",
    },
    {
      title: "Reception",
      purpose: "Appointments",
      icon: CalendarCheck,
      accent: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50/70 text-emerald-700 border-emerald-100",
    },
    {
      title: "Nurse",
      purpose: "Care support",
      icon: Activity,
      accent: "from-rose-500 to-pink-600",
      bgLight: "bg-rose-50/70 text-rose-700 border-rose-100",
    },
    {
      title: "Lab",
      purpose: "Diagnostics",
      icon: FlaskConical,
      accent: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50/70 text-blue-700 border-blue-100",
    },
    {
      title: "Embryology",
      purpose: "IVF laboratory",
      icon: Dna,
      accent: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50/70 text-violet-700 border-violet-100",
    },
    {
      title: "Pharmacy",
      purpose: "Medication fulfilment",
      icon: Pill,
      accent: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50/70 text-amber-700 border-amber-100",
    },
    {
      title: "Billing",
      purpose: "Payments",
      icon: Receipt,
      accent: "from-emerald-500 to-green-600",
      bgLight: "bg-emerald-50/70 text-emerald-700 border-emerald-100",
    },
    {
      title: "Insurance",
      purpose: "Claims",
      icon: ShieldCheck,
      accent: "from-sky-500 to-cyan-600",
      bgLight: "bg-sky-50/70 text-sky-700 border-sky-100",
    },
    {
      title: "Admin",
      purpose: "Operations",
      icon: SlidersHorizontal,
      accent: "from-slate-600 to-slate-900",
      bgLight: "bg-slate-100 text-slate-800 border-slate-200",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-slate-50/60 border-y border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/70 px-3 py-1 text-xs font-semibold text-purple-700 mb-3">
            Connected Care Team
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Built for everyone who delivers care.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 font-normal">
            Every role gets the tools, context and actions they need.
          </p>
          
          {/* Ecosystem Flow Ribbon */}
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="text-purple-600">ONE PLATFORM</span>
            <span className="text-slate-300">→</span>
            <span className="text-indigo-600">MANY ROLES</span>
            <span className="text-slate-300">→</span>
            <span className="text-cyan-600">ONE CONNECTED CARE ENVIRONMENT</span>
          </div>
        </div>

        {/* 10 Compact Role Cards Grid */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.title}
                className="group relative flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-200"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${role.bgLight} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3.5 text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  {role.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                  {role.purpose}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => onOpenDemo?.("Clinic Management")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700 transition"
          >
            <span>See how each role collaborates inside SmrkoMed</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </section>
  );
}
