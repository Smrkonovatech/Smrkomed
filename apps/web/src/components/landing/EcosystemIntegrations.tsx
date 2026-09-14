"use client";

import { Network, CheckCircle2, ShieldCheck, Database, FileSpreadsheet, CreditCard, MessageSquare, Radio } from "lucide-react";

export function EcosystemIntegrations() {
  const integrations = [
    { title: "ABDM / ABHA", desc: "Digital health IDs & longitudinal record sharing", icon: ShieldCheck, badge: "Ecosystem Ready" },
    { title: "NHCX", desc: "Standardised electronic health insurance claims", icon: FileSpreadsheet, badge: "Claims Integration" },
    { title: "HMS / EMR", desc: "Bidirectional sync with hospital management systems", icon: Database, badge: "Bi-directional" },
    { title: "LIS & Lab", desc: "Automated sample barcodes & electronic results", icon: Network, badge: "HL7 / FHIR" },
    { title: "PACS / RIS", desc: "Imaging study viewing & radiology reporting links", icon: Radio, badge: "DICOM Ready" },
    { title: "Payments", desc: "UPI, debit/credit cards, instant SMS payment links", icon: CreditCard, badge: "Real-time" },
  ];

  return (
    <section id="integrations" className="py-16 sm:py-24 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3.5 py-1 text-xs font-semibold text-cyan-700 border border-cyan-200/60 mb-3">
            National Health Connectivity
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Built for India&apos;s connected healthcare ecosystem.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 font-normal">
            Connect with India&apos;s evolving digital healthcare ecosystem and the systems your organisation already uses.
          </p>
        </div>

        {/* Integration Cards Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {integrations.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-purple-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Ecosystem Banner matching brochure design */}
        <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Built for India&apos;s evolving digital healthcare ecosystem
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-slate-700 font-bold text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>National Health Authority</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              <span>Digital India</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>india.gov.in</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>NHCX Ecosystem</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
