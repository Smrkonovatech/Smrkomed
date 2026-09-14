"use client";

import { FlaskConical, Pill, Receipt, ShieldCheck, ArrowRight } from "lucide-react";

export function ClinicOperations() {
  const operations = [
    {
      title: "Diagnostics",
      sub: "Lab & reports",
      icon: FlaskConical,
      flow: ["Diagnostic Order", "Result", "Doctor Review"],
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Pharmacy",
      sub: "Prescriptions & dispensing",
      icon: Pill,
      flow: ["Prescription", "Pharmacy", "Dispense"],
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Billing",
      sub: "Packages, invoices & payments",
      icon: Receipt,
      flow: ["Invoice", "Payment", "Receipt"],
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Insurance",
      sub: "Claims & pre-authorisation",
      icon: ShieldCheck,
      flow: ["Claim", "Pre-auth", "Settlement"],
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-slate-50/70 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/60 px-3 py-1 text-xs font-semibold text-slate-700 mb-3">
            Operations Flow
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Connected Clinic Operations
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Automate routine operational steps with verified handoffs between clinical teams.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {operations.map((op) => {
            const Icon = op.icon;
            return (
              <div
                key={op.title}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${op.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{op.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">{op.sub}</div>
                </div>

                {/* Workflow Diagram */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Execution Flow
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span>{op.flow[0]}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-purple-600">{op.flow[1]}</span>
                    <span className="text-slate-300">→</span>
                    <span>{op.flow[2]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
