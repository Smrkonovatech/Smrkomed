"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  Stethoscope, 
  HeartHandshake, 
  Building2, 
  MessageSquare, 
  Wallet, 
  BrainCircuit, 
  Network,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface PlatformProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function Platform({ onOpenDemo }: PlatformProps) {
  const [activeTab, setActiveTab] = useState<
    "clinical" | "care" | "operations" | "communication" | "finance" | "intelligence" | "integrations"
  >("clinical");

  const tabs = [
    { id: "clinical", label: "Clinical", icon: Stethoscope },
    { id: "care", label: "Care", icon: HeartHandshake },
    { id: "operations", label: "Operations", icon: Building2 },
    { id: "communication", label: "Communication", icon: MessageSquare },
    { id: "finance", label: "Finance", icon: Wallet },
    { id: "intelligence", label: "Intelligence", icon: BrainCircuit },
    { id: "integrations", label: "Integrations", icon: Network },
  ] as const;

  const tabData = {
    clinical: {
      headline: "Clinical Care & Patient 360",
      description: "Structured medical charting, diagnostic integration and digital consultations centered around the patient.",
      features: [
        "Patient Management",
        "Consultations",
        "Clinical Records",
        "Medications",
        "Reports",
        "Diagnostics",
      ],
      previewBadge: "Doctor Workspace",
      previewSnippet: {
        title: "Patient 360 Context",
        sub: "Veena M. • 32 Yrs • Female",
        tag: "Ovarian Stimulation - Day 5",
        stats: [
          { label: "AMH Level", val: "2.4 ng/mL" },
          { label: "Follicles R", val: "7 (12-14mm)" },
          { label: "Follicles L", val: "6 (11-13mm)" },
          { label: "Adherence", val: "100% Verified" },
        ],
      },
    },
    care: {
      headline: "Care Journeys & Execution",
      description: "Coordinate stages, care plans and timely actions so clinical intent never drops off.",
      features: [
        "Care Journeys",
        "Care Loop",
        "Care Tasks",
        "Follow-ups",
        "Escalations",
        "Patient Calendar",
      ],
      previewBadge: "Coordination Engine",
      previewSnippet: {
        title: "Active Care Plan",
        sub: "IVF Antagonist Protocol",
        tag: "Stage 08: Monitoring Scan",
        stats: [
          { label: "Care Tasks", val: "14 Scheduled" },
          { label: "Completed", val: "12 Verified" },
          { label: "Response", val: "< 14 Mins" },
          { label: "Escalation", val: "0 Active" },
        ],
      },
    },
    operations: {
      headline: "Clinic & Hospital Operations",
      description: "Streamline appointments, staff roles, laboratory, pharmacy and patient discharge.",
      features: [
        "Appointments",
        "Staff Management",
        "Laboratory",
        "Pharmacy",
        "Discharge",
        "Administration",
      ],
      previewBadge: "Operations Hub",
      previewSnippet: {
        title: "Clinic Operations Monitor",
        sub: "Bloom Fertility • Main Branch",
        tag: "4 OT Procedures Scheduled",
        stats: [
          { label: "Doctors Active", val: "6 On Duty" },
          { label: "Appointments", val: "48 Total" },
          { label: "Pharmacy Fill", val: "96% Dispensed" },
          { label: "Smart Discharge", val: "3 Drafted" },
        ],
      },
    },
    communication: {
      headline: "Connected Patient Communication",
      description: "Engage patients directly on WhatsApp with verified reminders, reports, forms and payments.",
      features: [
        "WhatsApp",
        "Patient Conversations",
        "Templates",
        "Notifications",
        "Human Handoff",
      ],
      previewBadge: "WhatsApp Layer",
      previewSnippet: {
        title: "Live Patient Conversation",
        sub: "+91 98401 23456 • Rahul & Anjali",
        tag: "Care Task: Confirm Injection Time",
        stats: [
          { label: "Channel", val: "WhatsApp Official" },
          { label: "Status", val: "Delivered & Read" },
          { label: "Patient Action", val: "Done Confirmed" },
          { label: "Staff Notification", val: "Updated in EMR" },
        ],
      },
    },
    finance: {
      headline: "Billing, Packages & Payments",
      description: "Transparent billing packages, partial payments, instant receipts and insurance pre-authorisations.",
      features: [
        "Billing",
        "Packages",
        "Invoices",
        "Payments",
        "Insurance",
      ],
      previewBadge: "Financial Operations",
      previewSnippet: {
        title: "Treatment Package Ledger",
        sub: "IVF ICSI Complete Package",
        tag: "Invoice #SM-2026-8812",
        stats: [
          { label: "Package Total", val: "₹1,75,000" },
          { label: "Advance Paid", val: "₹1,00,000" },
          { label: "Insurance Pre-Auth", val: "₹50,000" },
          { label: "Balance", val: "₹25,000" },
        ],
      },
    },
    intelligence: {
      headline: "Smrko AI Intelligence Layer",
      description: "Assist doctors and coordinators with patient summaries, task extraction and safe handoff.",
      features: [
        "Smrko AI",
        "Patient Summaries",
        "Task Extraction",
        "Knowledge Retrieval",
        "AI Assistance",
        "AI Handoff",
      ],
      previewBadge: "AI Assistant",
      previewSnippet: {
        title: "Prepare My Day Summary",
        sub: "Generated for Dr. Shreya",
        tag: "8 Patients • 1 Emergency Reviewed",
        stats: [
          { label: "Key Alert", val: "Trigger Check Required" },
          { label: "Medication Change", val: "Flagged for Doctor" },
          { label: "Knowledge Check", val: "Clinical Verified" },
          { label: "AI Discretion", val: "Doctor Signs Off" },
        ],
      },
    },
    integrations: {
      headline: "Connected Digital Ecosystem",
      description: "Ready to connect with national digital health, hospital systems, labs and payments.",
      features: [
        "ABDM / ABHA",
        "NHCX",
        "HMS / EMR",
        "LIS",
        "PACS / RIS",
        "Payments",
      ],
      previewBadge: "Ecosystem Hub",
      previewSnippet: {
        title: "National Digital Health Ready",
        sub: "ABDM Milestone 1 Architecture",
        tag: "Secure Gateway Active",
        stats: [
          { label: "ABHA Creation", val: "Supported" },
          { label: "NHCX Claims", val: "Integration-Ready" },
          { label: "LIS Interface", val: "HL7 / FHIR" },
          { label: "Payment UPI", val: "Real-time Verified" },
        ],
      },
    },
  };

  const current = tabData[activeTab];

  return (
    <section id="platform" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 border border-cyan-200/60 mb-3">
            Modular Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Everything your healthcare organisation needs.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 font-normal">
            From clinical care to daily operations—all connected seamlessly without clutter.
          </p>
        </div>

        {/* Tab Buttons Strip */}
        <div className="mt-10 flex justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-slate-200/80 bg-slate-50/60 p-6 sm:p-10">
          
          {/* Left: Tab Features List */}
          <div className="lg:col-span-5 flex flex-col items-start">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-100/70 px-2.5 py-1 text-xs font-bold text-purple-700 uppercase tracking-wide">
              {current.previewBadge}
            </span>
            <h3 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
              {current.headline}
            </h3>
            <p className="mt-3 text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              {current.description}
            </p>

            {/* Feature Pills */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 w-full">
              {current.features.map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm text-xs font-semibold text-slate-800"
                >
                  <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onOpenDemo?.(current.headline)}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 transition"
            >
              <span>Request a walkthrough of {current.headline}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Right: Rich UI Preview Card */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-lg shadow-purple-900/5">
              
              {/* Header inside mockup */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {current.previewSnippet.title}
                    <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 border border-cyan-200/60">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {current.previewSnippet.sub}
                  </div>
                </div>
                <span className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-100">
                  {current.previewSnippet.tag}
                </span>
              </div>

              {/* Stats Grid inside mockup */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {current.previewSnippet.stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
                    <div className="text-[11px] font-medium text-slate-500">{s.label}</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Interactive Dashboard Mini-View */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-900 text-white p-4 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                    <Sparkles className="h-3.5 w-3.5" /> SmrkoMed Care Engine
                  </span>
                  <span className="text-[10px]">Realtime State: Synchronized</span>
                </div>
                <p className="mt-2 text-slate-300 font-sans text-xs leading-relaxed">
                  Doctor plan updates instantly synchronize across patient records, scheduled CareTasks, WhatsApp triggers, and clinical audit logs.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
