"use client";

import { useState } from "react";
import Image from "next/image";
import { Smartphone, Monitor, ShieldAlert, MessageCircle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

interface ProductShowcaseProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function ProductShowcase({ onOpenDemo }: ProductShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"doctor-app" | "doctor-web" | "admin" | "patient">("doctor-app");

  return (
    <section className="py-16 sm:py-24 bg-slate-900 text-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950 px-3.5 py-1 text-xs font-semibold text-cyan-300 border border-cyan-800 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Product Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Real software. Built for daily care.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300">
            Switch between doctor mobile, clinic web, admin control and patient touchpoints.
          </p>

          {/* 4 Tabs */}
          <div className="mt-8 flex justify-center flex-wrap gap-2 sm:gap-3">
            {[
              { id: "doctor-app", label: "Doctor App", icon: Smartphone },
              { id: "doctor-web", label: "Doctor Web", icon: Monitor },
              { id: "admin", label: "Admin Workspace", icon: ShieldAlert },
              { id: "patient", label: "Patient Experience", icon: MessageCircle },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-600/30 scale-105"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Doctor App (Real Mobile Screenshot) */}
        {activeTab === "doctor-app" && (
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-10 backdrop-blur-xl">
            <div className="lg:col-span-5 flex flex-col items-start">
              <span className="rounded-full bg-cyan-950 px-3 py-1 text-xs font-bold text-cyan-400 border border-cyan-800">
                Doctor Mobile Interface
              </span>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
                Quick clinical actions on the move.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                Prioritizes today&apos;s appointments, active patient journeys, critical escalations and rapid consultation triggers right from the doctor&apos;s phone.
              </p>

              <div className="mt-6 space-y-2.5 w-full">
                {[
                  "Today's schedule & 38 Active Journeys ring",
                  "Prepare My Day AI summary button",
                  "Clinical escalation alerts & pending scans",
                  "Fast communication & patient directory",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onOpenDemo?.("Doctor App")}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-purple-700 transition"
              >
                <span>Request Doctor App Demo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Screenshot Frame */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="relative w-full max-w-sm rounded-[36px] border-4 border-slate-700 bg-slate-900 p-2 shadow-2xl overflow-hidden">
                <div className="relative aspect-[9/18] w-full rounded-[28px] overflow-hidden bg-slate-950">
                  <Image
                    src="/branding/mobile-doctor-preview.png"
                    alt="SmrkoMed Doctor Mobile App"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Doctor Web (Real Dashboard Screenshot) */}
        {activeTab === "doctor-web" && (
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-10 backdrop-blur-xl">
            <div className="lg:col-span-4 flex flex-col items-start">
              <span className="rounded-full bg-purple-950 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-800">
                Doctor Web Dashboard
              </span>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
                Comprehensive clinical command center.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                Full-screen patient context, longitudinal care records, follicular monitoring ultrasound telemetry, Care Loop exceptions and AI assistance.
              </p>

              <div className="mt-6 space-y-2.5 w-full">
                {[
                  "Patient 360 & Timeline review",
                  "Care Loop exceptions & reports review",
                  "Prepare My Day AI executive overview",
                  "Single-click consultation launch",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Dashboard Frame */}
            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl">
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src="/branding/dashboard-doctor-preview.png"
                    alt="SmrkoMed Doctor Web Dashboard"
                    fill
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Admin Workspace */}
        {activeTab === "admin" && (
          <div className="mt-12 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-10 backdrop-blur-xl">
            <div className="max-w-xl">
              <span className="rounded-full bg-indigo-950 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-800">
                Admin &amp; Operations
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
                Total organizational control &amp; audit trails.
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-300">
                Role permissions, tenant branch isolation, pharmacy stock, billing packages and system activity logs.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
              {[
                { title: "Staff Roles", desc: "10 Role permissions & audit" },
                { title: "Care Loop Monitor", desc: "Realtime exception tracking" },
                { title: "WhatsApp Templates", desc: "Approved clinical messages" },
                { title: "Billing & Packages", desc: "Automated receipts & payouts" },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="text-purple-400 font-bold text-sm">{c.title}</div>
                  <div className="text-slate-400 mt-1">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Patient Experience */}
        {activeTab === "patient" && (
          <div className="mt-12 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-10 backdrop-blur-xl">
            <div className="max-w-xl">
              <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-800">
                Patient Touchpoints
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-white">
                Frictionless healthcare on WhatsApp.
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-300">
                Zero app installs, zero login friction. Every notification is linked to the patient&apos;s active care journey.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
              {[
                { title: "Instant Confirmations", desc: "Appointments & reschedule" },
                { title: "Diagnostic Reports", desc: "Secure PDF delivery" },
                { title: "Care Instructions", desc: "Medication & scan prep" },
                { title: "Instant UPI Payments", desc: "Receipt sent to WhatsApp" },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="text-emerald-400 font-bold text-sm">{c.title}</div>
                  <div className="text-slate-400 mt-1">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
