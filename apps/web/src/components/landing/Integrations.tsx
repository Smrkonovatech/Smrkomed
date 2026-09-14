"use client";

import {
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  FileCheck2,
  HeartPulse,
  MessageSquare,
  Network,
  ShieldCheck,
} from "lucide-react";

interface IntegrationsProps {
  onOpenDemo: (interest?: string) => void;
}

export function Integrations({ onOpenDemo }: IntegrationsProps) {
  const ecosystemItems = [
    { name: "HMS / Hospital Core", desc: "Bidirectional sync for patient demographics, beds, and billing" },
    { name: "EMR / Clinical Notes", desc: "Longitudinal clinical record federation across hospital branches" },
    { name: "LIS / Lab Information", desc: "Direct instrument or LIS ingestion for biochemistry & hormone tests" },
    { name: "PACS / RIS Imaging", desc: "DICOM ultrasound & scan report link association" },
    { name: "Payment Gateways", desc: "Verified instant reconciliation with razorpay, cashfree, and UPI" },
    { name: "WhatsApp Business API", desc: "Meta Cloud API and verified enterprise BSP connectivity" },
  ];

  return (
    <section id="integrations" className="py-20 sm:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <Network className="h-3.5 w-3.5 text-purple-600" /> Ecosystem Interoperability
          </div>
          <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Built for a connected healthcare ecosystem.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Connect the systems you already use today with national digital health standards and enterprise infrastructure.
          </p>
        </div>

        {/* 3 Core Highlight Cards */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: ABDM / ABHA */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 flex flex-col justify-between hover:border-purple-200 hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <HeartPulse className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-indigo-100/70 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 border border-indigo-200/60">
                  Integration-Ready
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">ABDM / ABHA</h3>
              <p className="text-xs font-semibold text-indigo-700 mt-0.5">Digital health ecosystem</p>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Connect with the Ayushman Bharat Digital Mission. Enable digital ABHA creation, Aadhaar OTP authentication, and consent-driven health record sharing via M1, M2 &amp; M3 milestones.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
              Standards: FHIR, NDHM V3 APIs
            </div>
          </div>

          {/* Card 2: NHCX */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 flex flex-col justify-between hover:border-purple-200 hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 border border-purple-100">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-purple-100/70 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-200/60">
                  Integration-Ready
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">NHCX</h3>
              <p className="text-xs font-semibold text-purple-700 mt-0.5">Healthcare claims ecosystem</p>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Interoperate with the National Health Claims Exchange. Accelerate paperless cashless pre-authorisation and claim adjudication with participating insurance providers and TPAs.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
              Claims: Unified Exchange Protocol
            </div>
          </div>

          {/* Card 3: Enterprise Integrations */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 flex flex-col justify-between hover:border-purple-200 hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Database className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/60">
                  Extensible APIs
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Clinic &amp; Hospital Systems</h3>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">Connect systems you already use</p>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Preserve your existing core investments. SmrkoMed layers on top of your existing HMS, EMR, or diagnostic machines as the action and intelligence layer.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
              REST, Webhooks &amp; HL7 / FHIR
            </div>
          </div>
        </div>

        {/* Integration System Badges */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center mb-4">
            Supported Ecosystem Connections
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            {ecosystemItems.map((item) => (
              <div key={item.name} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-xs font-bold text-slate-900">{item.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
