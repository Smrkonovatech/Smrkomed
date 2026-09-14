"use client";

import {
  Activity,
  ArrowRight,
  Baby,
  Calendar,
  CheckCircle2,
  Clock,
  Dna,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

interface FertilityProps {
  onOpenDemo: (interest?: string) => void;
}

export function Fertility({ onOpenDemo }: FertilityProps) {
  // Exactly 15 Stages per Master Prompt
  const stages = [
    { num: "01", name: "Appointment", desc: "First visit booking & intake" },
    { num: "02", name: "Consultation", desc: "Clinical evaluation & history" },
    { num: "03", name: "Tests & Reports", desc: "Hormone, semen & scan workup" },
    { num: "04", name: "Treatment Decision", desc: "IVF / ICSI / IUI pathway" },
    { num: "05", name: "Treatment Plan", desc: "Customized stimulation protocol" },
    { num: "06", name: "Get Ready", desc: "Baseline scan & counseling" },
    { num: "07", name: "Stimulation", desc: "Daily gonadotropin injections" },
    { num: "08", name: "Monitoring", desc: "Follicular scans & estradiol tracking" },
    { num: "09", name: "Trigger", desc: "Timed hCG / Lupron injection" },
    { num: "10", name: "Egg Retrieval", desc: "OPU under sedation" },
    { num: "11", name: "Embryology", desc: "ICSI, fertilization & blastocyst culture" },
    { num: "12", name: "Embryo Transfer", desc: "Fresh or frozen embryo transfer (ET/FET)" },
    { num: "13", name: "After Transfer", desc: "Luteal support & rest guidelines" },
    { num: "14", name: "Pregnancy Test", desc: "Serum Beta-hCG blood test" },
    { num: "15", name: "Outcome", desc: "Clinical heartbeat & discharge or review" },
  ];

  const modules = [
    { name: "Fertility EMR", desc: "Comprehensive reproductive health documentation for female and male partners." },
    { name: "Couple Management", desc: "Unified couple identity linking investigations, consents, and legal declarations." },
    { name: "IVF Protocols", desc: "Antagonist, Agonist, Mild stimulation, and customized ovarian protocols." },
    { name: "IUI Protocols", desc: "Timed intercourse and intrauterine insemination tracking." },
    { name: "FET Management", desc: "Endometrial preparation and frozen embryo transfer scheduling." },
    { name: "Cycle Management", desc: "Real-time cycle dashboard showing cohort development and trigger windows." },
    { name: "Diagnostics", desc: "Hormone panels (AMH, E2, P4, LH, FSH) and ultrasound synchronization." },
    { name: "Follicular Monitoring", desc: "Interactive ovarian maps tracking bilateral follicle diameters." },
    { name: "Medications", desc: "Strict dosage calendars with timed injection alarms." },
    { name: "Embryology Lab", desc: "Oocyte grading, fertilisation checks, cleavage scoring, and blastocyst tracking." },
    { name: "Reports & Analytics", desc: "Fertility success tracking, maturation rates, and lab QA metrics." },
    { name: "Care Loop", desc: "Autonomous action tracking ensuring every medication and scan occurs on time." },
  ];

  return (
    <section className="py-20 sm:py-32 bg-slate-50/60 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700">
            <Baby className="h-3.5 w-3.5 text-purple-600" /> Primary Specialty Focus
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            From first consultation to outcome.
          </h2>
          <p className="mt-4 text-base sm:text-xl text-slate-600 leading-relaxed">
            Built around the fertility journey, with the flexibility to grow across healthcare.
          </p>
        </div>

        {/* 15-Stage Horizontal Journey Timeline */}
        <div className="mt-14 sm:mt-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-purple-600" /> Standard 15-Stage IVF Journey Architecture
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Scroll horizontally →
            </span>
          </div>

          {/* Timeline Scroll Container */}
          <div className="overflow-x-auto pb-4 scrollbar-thin">
            <div className="flex items-stretch gap-3 min-w-[1400px]">
              {stages.map((stage) => (
                <div
                  key={stage.num}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-300 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                      {stage.num}
                    </span>
                    <h4 className="mt-2.5 text-xs font-bold text-slate-900 leading-tight">
                      {stage.name}
                    </h4>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                    {stage.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fertility Modules Feature Grid */}
        <div className="mt-20 sm:mt-28">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Complete Fertility Clinical Modules
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              Every specialized capability needed by clinicians, embryologists, and IVF coordinators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((mod) => (
              <div
                key={mod.name}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-purple-200 hover:shadow-md transition"
              >
                <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>{mod.name}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {mod.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Cryostorage future notice */}
          <p className="text-center text-[11px] text-slate-400 mt-4">
            *Advanced liquid nitrogen Cryostorage inventory management is available as an expanding module.
          </p>
        </div>

        {/* Section 16: Fertility Care Loop Concrete Example */}
        <div className="mt-20 sm:mt-28 rounded-3xl border border-purple-100 bg-white p-6 sm:p-10 shadow-xl">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Real Clinical Scenario
            </span>
            <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
              How Care Loop executes an OPU Trigger in practice
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              In IVF, trigger timing is mission-critical. An injection taken 2 hours late risks premature ovulation or immature oocytes.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Flow Card */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                Standard Verified Flow
              </span>
              <div className="mt-4 space-y-2 text-xs text-slate-700">
                <p><strong>1. Doctor creates treatment plan:</strong> Dr. Priya sets 9:30 PM HCG trigger based on follicular maturity.</p>
                <p><strong>2. Medication / Care Task:</strong> Automated CareTask generated with patient injection instructions.</p>
                <p><strong>3. WhatsApp reminder:</strong> Patient receives interactive WhatsApp alert at 9:00 PM.</p>
                <p><strong>4. Patient responds:</strong> Patient taps &ldquo;DONE&rdquo; at 9:31 PM.</p>
                <p><strong>5. Task completed:</strong> CareTask transitions to COMPLETED with verified timestamp.</p>
                <p><strong>6. Next action created:</strong> OT Suite 1 informed, anesthesia team notified for 36h pickup.</p>
              </div>
            </div>

            {/* Exception Flow Card */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
              <span className="rounded-md bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                Exception Safety Circuit
              </span>
              <div className="mt-4 space-y-2 text-xs text-slate-700">
                <p><strong>1. Patient doesn&apos;t respond:</strong> 30 minutes pass after scheduled trigger without reply.</p>
                <p><strong>2. High-priority reminder:</strong> WhatsApp alert sent to both primary patient and partner.</p>
                <p><strong>3. Care Voice call:</strong> Automated voice call dials patient telephone to confirm status.</p>
                <p><strong>4. Care Coordinator alert:</strong> Coordinator dashboard flags missed confirmation.</p>
                <p><strong>5. Doctor escalation:</strong> Doctor notified to evaluate whether OPU slot requires recalculation.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Eliminate missed doses, unconfirmed triggers, and dropped handoffs across your fertility department.
            </p>
            <button
              type="button"
              onClick={() => onOpenDemo("Fertility / IVF Walkthrough")}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition group"
            >
              <span>Explore IVF Protocol Demo</span>
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
