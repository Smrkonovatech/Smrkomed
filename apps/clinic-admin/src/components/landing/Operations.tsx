"use client";

import {
  AlertCircle,
  ArrowRight,
  Bot,
  Building,
  CheckCircle2,
  CreditCard,
  FileCheck,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

interface OperationsProps {
  onOpenDemo: (interest?: string) => void;
}

export function Operations({ onOpenDemo }: OperationsProps) {
  const opCards = [
    {
      title: "Diagnostics & Laboratory",
      flow: "Diagnostic Order → Specimen / Study → Result → Verification → Doctor Review",
      icon: FlaskConical,
      accent: "text-blue-600 bg-blue-50 border-blue-100",
      points: [
        "Automated lab order requisition from consultation SOAP notes",
        "Fertility hormone panels (AMH, E2, P4, LH, FSH, Beta-hCG)",
        "Semen analysis and bilateral follicular monitoring tracking",
        "Doctor review queue with one-click clinical sign-off",
      ],
    },
    {
      title: "Clinical Pharmacy",
      flow: "Doctor Prescription → Pharmacy → Availability → Dispense → Patient",
      icon: Pill,
      accent: "text-teal-600 bg-teal-50 border-teal-100",
      points: [
        "Dispenses strictly against signed doctor prescriptions",
        "Automated drug inventory and batch/expiry tracking",
        "Dosage timetable synced automatically with patient WhatsApp alarms",
        "Prevents unverified prescription modifications",
      ],
    },
    {
      title: "Billing & Package Ledger",
      flow: "Treatment Package → Invoice → Payment Request → Gateway → Receipt",
      icon: CreditCard,
      accent: "text-purple-600 bg-purple-50 border-purple-100",
      points: [
        "Modular multi-stage treatment packages (IVF, ICSI, Donor, FET)",
        "Partial payments and automated digital payment links",
        "Real-time ledger of outstanding balances and settled invoices",
        "Verified gateway webhooks eliminate manual reconciliation errors",
      ],
    },
    {
      title: "Insurance & TPA Claims",
      flow: "Policy Details → Pre-Authorisation → Claim Submission → Settlement",
      icon: FileCheck,
      accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
      points: [
        "Policy capture and digital pre-auth document generation",
        "Cashless and reimbursement claim folder preparation",
        "Real-time claim status tracking across TPAs and payers",
        "Note: Integration availability depends on the connected payer, TPA or system",
      ],
      footnote: "Integration availability depends on the connected payer, TPA or system.",
    },
  ];

  const dischargeSteps = [
    { num: "01", name: "Episode Complete", desc: "Procedure or treatment cycle concludes", icon: CheckCircle2 },
    { num: "02", name: "Gather Records", desc: "Synthesizes vitals, meds, notes & bills", icon: FileText },
    { num: "03", name: "AI Draft", desc: "Smrko AI compiles structured draft summary", icon: Bot },
    { num: "04", name: "Doctor Review", desc: "Attending doctor reviews & edits draft", icon: Stethoscope },
    { num: "05", name: "Doctor Approval", desc: "Doctor signs off with clinical authority", icon: ShieldCheck },
    { num: "06", name: "Official PDF", desc: "Generated with tamper-evident digital sign", icon: FileText },
    { num: "07", name: "Patient Handoff", desc: "Delivered to patient WhatsApp & portal", icon: Users },
    { num: "08", name: "Follow-up", desc: "Queues post-discharge CareTasks in Care Loop", icon: HeartPulse },
  ];

  return (
    <section className="py-20 sm:py-32 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Building className="h-3.5 w-3.5 text-purple-600" /> Operational Excellence
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Connected Clinical Operations
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Diagnostics, pharmacy, billing, and insurance moving in sync with the clinical treatment plan.
          </p>
        </div>

        {/* 4 Operations Feature Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          {opCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm hover:border-purple-200 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${card.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{card.title}</h3>
                      <span className="text-[11px] font-semibold text-purple-700">Operational Module</span>
                    </div>
                  </div>

                  {/* Flow Badge */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-mono font-medium text-slate-700 border border-slate-100">
                    {card.flow}
                  </div>

                  {/* Bullet points */}
                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    {card.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {card.footnote && (
                  <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 italic">
                    *{card.footnote}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Section 19: SMART DISCHARGE */}
        <div className="mt-20 sm:mt-32 rounded-3xl border border-slate-200 bg-gradient-to-b from-purple-50/50 via-white to-slate-50/40 p-6 sm:p-12 shadow-xl">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Smart Discharge Protocol
            </div>
            <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Prepare discharge intelligently.
            </h3>
            <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              SmrkoMed brings together authorised clinical, medication, billing and follow-up information to prepare a discharge draft for review.
            </p>

            <div className="mt-6 rounded-2xl bg-white border border-purple-200 p-4 shadow-sm inline-block">
              <p className="text-sm sm:text-base font-extrabold text-purple-900">
                &ldquo;AI prepares the discharge. The doctor approves it.&rdquo;
              </p>
            </div>
          </div>

          {/* 8-Step Discharge Progression */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {dischargeSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm hover:border-purple-300 transition flex flex-col items-center justify-between"
                >
                  <span className="font-mono text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    {step.num}
                  </span>
                  <div className="my-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-900 leading-tight">
                      {step.name}
                    </h5>
                    <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Safety Notice Banner */}
          <div className="mt-8 rounded-2xl border border-purple-100 bg-purple-50/70 p-4 text-center text-xs text-purple-900">
            <span className="font-bold">Clinical Safety Notice:</span> AI never independently finalises a discharge. Attending physician electronic sign-off is strictly enforced.
          </div>
        </div>
      </div>
    </section>
  );
}
