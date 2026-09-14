"use client";

import {
  Building2,
  CheckCircle2,
  EyeOff,
  FileCheck2,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

interface SecurityProps {
  onOpenDemo: (interest?: string) => void;
}

export function Security({ onOpenDemo }: SecurityProps) {
  const hierarchy = [
    { label: "Organisation", desc: "Enterprise entity" },
    { label: "Clinic", desc: "Healthcare facility" },
    { label: "Branch", desc: "Physical center" },
    { label: "Department", desc: "Clinical unit" },
    { label: "Role", desc: "Clinical or admin" },
    { label: "Permissions", desc: "Granular scope" },
    { label: "Patient Data", desc: "Protected health record" },
  ];

  const cards = [
    {
      title: "Multi-Tenant Architecture",
      desc: "Strict logical database boundaries guarantee zero cross-clinic data leakage.",
      icon: Building2,
    },
    {
      title: "Role-Based Access Control",
      desc: "Granular role enforcement restricts clinical write actions strictly to licensed doctors.",
      icon: KeyRound,
    },
    {
      title: "Immutable Audit Trails",
      desc: "Every record view, status modification, and prescription sign-off is logged with user and timestamp.",
      icon: ShieldCheck,
    },
    {
      title: "Secure Digital Documents",
      desc: "Encrypted storage for lab reports, medical scans, and tamper-evident discharge PDFs.",
      icon: Lock,
    },
    {
      title: "Digital Patient Consent",
      desc: "Explicit patient consent records linked directly to specialized procedures and treatments.",
      icon: FileCheck2,
    },
    {
      title: "Controlled Data Access",
      desc: "Staff only see what is required for their active operational duties.",
      icon: EyeOff,
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" /> Data Governance
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            The right information. <br />
            <span className="text-purple-600">To the right person.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Engineered with strict tenant isolation and role-based permissions designed specifically for healthcare organizations.
          </p>
        </div>

        {/* Visual Hierarchy Strip */}
        <div className="mt-14 max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center mb-6">
            Multi-Tier Tenant Isolation Model
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-center text-center">
            {hierarchy.map((item, idx) => (
              <div key={item.label} className="relative">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <span className="font-mono text-[10px] font-bold text-purple-600">
                    L{idx + 1}
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{item.label}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6 Security Cards */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-purple-200 hover:shadow-md transition"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700 mb-4 border border-purple-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
