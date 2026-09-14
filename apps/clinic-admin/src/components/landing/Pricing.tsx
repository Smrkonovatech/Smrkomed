"use client";

import { Check, Sparkles, ArrowRight } from "lucide-react";

interface PricingProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function Pricing({ onOpenDemo }: PricingProps) {
  const tiers = [
    {
      name: "Clinic",
      price: "₹4,999",
      cadence: "/ month",
      desc: "For single-specialty and standalone medical practices.",
      highlighted: false,
      badge: "Essential",
      features: [
        "Patient Management & EMR",
        "Appointments & Schedule",
        "Basic WhatsApp Reminders",
        "Role-Based Access Control",
      ],
      ctaText: "Choose Clinic",
    },
    {
      name: "Growth",
      price: "₹9,999",
      cadence: "/ month",
      desc: "For expanding clinics with multiple doctors and diagnostic flows.",
      highlighted: false,
      badge: "Expanding",
      features: [
        "Everything in Clinic",
        "Care Loop Automation Engine",
        "Diagnostic & LIS Orders",
        "Billing & Treatment Packages",
      ],
      ctaText: "Choose Growth",
    },
    {
      name: "Specialty / IVF",
      price: "₹14,999",
      cadence: "/ month",
      desc: "Purpose-built for fertility, IVF centers and multi-stage care journeys.",
      highlighted: true,
      badge: "Most Popular",
      features: [
        "Everything in Growth",
        "Specialty Fertility & IVF Workflows",
        "Care Builder Visual Canvas",
        "Smrko AI Multilingual Support",
        "Priority Onboarding & Care Support",
      ],
      ctaText: "Choose Specialty",
    },
    {
      name: "Enterprise",
      price: "Custom",
      cadence: "",
      desc: "For hospital chains, multi-branch networks and enterprise groups.",
      highlighted: false,
      badge: "Custom Scale",
      features: [
        "Multi-Branch & Tenant Isolation",
        "Custom Integration Support",
        "Dedicated Account Management",
        "Enterprise SLAs & Security",
      ],
      ctaText: "Talk to Our Team",
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200/60 mb-3">
            Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Simple, predictable plans for every clinic size.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 font-normal">
            Plans can be configured based on organisation size, users, modules, workflows and integrations.
          </p>
        </div>

        {/* 4 Tier Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all ${
                tier.highlighted
                  ? "border-2 border-purple-600 bg-gradient-to-b from-purple-50/70 to-white shadow-xl shadow-purple-600/10 scale-105 z-10"
                  : "border border-slate-200 bg-white shadow-sm hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      tier.highlighted
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">{tier.name}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed min-h-[34px]">
                  {tier.desc}
                </p>

                <div className="mt-5 pb-5 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                      {tier.price}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{tier.cadence}</span>
                  </div>
                </div>

                {/* Features list */}
                <div className="mt-5 space-y-2.5">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <Check className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => onOpenDemo?.(tier.name)}
                  className={`w-full rounded-xl py-3 text-xs sm:text-sm font-bold transition ${
                    tier.highlighted
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 hover:bg-purple-700"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {tier.ctaText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance text */}
        <div className="mt-10 text-center text-xs text-slate-500">
          Need a multi-hospital rollout or custom EHR integration?{" "}
          <button
            type="button"
            onClick={() => onOpenDemo?.("Enterprise")}
            className="font-semibold text-purple-600 hover:underline"
          >
            Talk to our healthcare solutions team →
          </button>
        </div>

      </div>
    </section>
  );
}
