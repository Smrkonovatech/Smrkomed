"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  LineChart,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface AnalyticsProps {
  onOpenDemo: (interest?: string) => void;
}

export function Analytics({ onOpenDemo }: AnalyticsProps) {
  return (
    <section className="py-20 sm:py-32 bg-slate-50/50 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700">
            <BarChart3 className="h-3.5 w-3.5 text-purple-600" /> Operational Observability
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            See where care is moving—and where it&apos;s getting stuck.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Real-time tracking of patient action completion, response latency, and clinical exceptions across every clinic department.
          </p>
        </div>

        {/* Analytics Dashboard UI Mockup */}
        <div className="mt-14 max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-2xl">
          {/* Mock Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                SmrkoMed Analytics Console • Product Demonstration
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Care Loop Executive Dashboard
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700">
                Last 30 Days
              </span>
              <span className="rounded-lg bg-purple-50 px-3 py-1.5 font-bold text-purple-700 border border-purple-100">
                Live Clinic Telemetry
              </span>
            </div>
          </div>

          {/* Core Conceptual Metric Hero */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-purple-200">
                Primary Operational Objective
              </p>
              <h4 className="text-2xl sm:text-3xl font-extrabold mt-1">
                Planned patient care actions successfully completed
              </h4>
              <p className="text-xs text-purple-200 mt-2 max-w-xl">
                Every task is linked to a medical plan, delivered to the patient, verified via two-way response, and audited in the patient record.
              </p>
            </div>
            <div className="text-center md:text-right shrink-0 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
              <span className="text-4xl font-extrabold text-white">96.4%</span>
              <span className="text-xs text-emerald-300 font-semibold block mt-1 flex items-center justify-center md:justify-end gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> High Protocol Adherence
              </span>
            </div>
          </div>

          {/* 6 Analytics KPI Cards */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-medium text-slate-500">Care Actions</span>
              <p className="text-xl font-bold text-slate-900 mt-1">1,280</p>
              <span className="text-[10px] text-purple-700 font-medium">Scheduled Tasks</span>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
              <span className="text-[11px] font-medium text-emerald-800">Completed</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">1,234</p>
              <span className="text-[10px] text-emerald-700 font-medium">Verified On-time</span>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
              <span className="text-[11px] font-medium text-amber-800">Awaiting Reply</span>
              <p className="text-xl font-bold text-amber-900 mt-1">32</p>
              <span className="text-[10px] text-amber-700 font-medium">In Active Window</span>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50/40 p-3.5">
              <span className="text-[11px] font-medium text-red-800">Escalated</span>
              <p className="text-xl font-bold text-red-900 mt-1">14</p>
              <span className="text-[10px] text-red-700 font-medium">Staff Resolved</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-medium text-slate-500">Resolution Time</span>
              <p className="text-xl font-bold text-slate-900 mt-1">18m</p>
              <span className="text-[10px] text-slate-600 font-medium">Avg Exception Time</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <span className="text-[11px] font-medium text-slate-500">WhatsApp Delivery</span>
              <p className="text-xl font-bold text-slate-900 mt-1">99.8%</p>
              <span className="text-[10px] text-emerald-600 font-medium">Meta Cloud API</span>
            </div>
          </div>

          {/* Illustrative Telemetry Bar Chart Strip */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">
                Weekly Adherence Distribution (OPD, Stimulation, OPU, Embryo Transfer)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Illustrative UI Demo</span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-24 pt-4">
              {[65, 82, 94, 88, 96, 92, 98].map((val, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    style={{ height: `${val}%` }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-purple-700 to-indigo-500 transition-all"
                  />
                  <span className="text-[10px] font-mono text-slate-500">Day {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
