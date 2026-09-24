import { Check } from "lucide-react";

interface PricingProps {
  onOpenDemo?: (tier?: string) => void;
}

export function Pricing({ onOpenDemo }: PricingProps = {}) {
  const tiers = [
    {
      name: "Clinic",
      badge: "Essential",
      desc: "For single-specialty and standalone medical practices.",
      price: "₹4,999",
      cadence: "/ month",
      features: [
        "Patient Management & EMR",
        "Appointments & Schedule",
        "Basic WhatsApp Reminders",
        "Role-Based Access Control",
      ],
      ctaText: "Choose Clinic",
      highlighted: false,
    },
    {
      name: "Growth",
      badge: "Expanding",
      desc: "For single-specialty and standalone medical practices.",
      price: "₹9,999",
      cadence: "/ month",
      features: [
        "Patient Management & EMR",
        "Care Loop Automation",
        "Diagnostic & LIS Orders",
        "Billing & Treatment",
      ],
      ctaText: "Choose Growth",
      highlighted: false,
    },
    {
      name: "Speciality/IVF",
      badge: "",
      desc: "For single-specialty and standalone medical practices.",
      price: "₹14,999",
      cadence: "/ month",
      features: [
        "Patient Management & EMR",
        "Fertility & IVF Workflows",
        "Care Builder Visual Canvas",
        "Smrko AI Multilingual",
      ],
      ctaText: "Choose Speciality",
      highlighted: true,
    },
    {
      name: "Enterprise",
      badge: "Custom scale",
      desc: "For single-specialty and standalone medical practices.",
      price: "Custom",
      cadence: "",
      features: [
        "Patient Management & EMR",
        "Multi-Branch & Tenant isolation",
        "Custom Integration Support",
        "Dedicated Account Manager",
      ],
      ctaText: "Talk to our team",
      highlighted: false,
    },
  ];

  return (
    <section className="relative w-full py-12 lg:py-32 overflow-hidden bg-gradient-to-b from-[#F2FAFE] to-[#55CAF5]">
      {/* Decorative Background Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-[#9CE0FF]/40 rounded-[100%] blur-[120px] pointer-events-none"></div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Content */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-[2.5rem] sm:text-[3.5rem] leading-[1.2] text-[#1E293B] font-light tracking-tight mb-4">
            Simple, transparent<br />pricing
          </h2>
          <p className="text-[14px] sm:text-[15px] text-slate-500 max-w-[500px] mx-auto leading-relaxed">
            Choose the perfect plan for your practice size.<br className="hidden sm:block" />
            No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 items-end max-w-[1400px] mx-auto">
          {tiers.map((tier, idx) => (
            <div 
              key={idx} 
              className={`relative flex flex-col rounded-[24px] p-6 sm:p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] group cursor-pointer ${
                tier.highlighted
                  ? "bg-white/40 border border-white/80 shadow-[0_0_40px_rgba(255,255,255,0.7)] pb-10" // Taller, glowing card
                  : "bg-white/20 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
              }`}
            >
              {/* Highlighted Top Badges */}
              {tier.highlighted && (
                <div className="absolute -top-4 right-6 xl:-top-11 xl:left-1/2 xl:-translate-x-1/2 xl:right-auto flex xl:flex-col items-center justify-center gap-1.5 w-max z-10">
                  <span className="rounded-full bg-[#1E293B] px-3 py-1 text-[10px] xl:text-[9px] font-semibold text-white shadow-sm whitespace-nowrap">
                    Most Popular
                  </span>
                  <span className="rounded-full bg-white backdrop-blur-md px-3 py-1 text-[10px] xl:text-[9px] font-semibold text-[#1E293B] shadow-sm border border-slate-100 whitespace-nowrap">
                    IVF Care studio
                  </span>
                </div>
              )}

              {/* Badges / Subtitle */}
              <div className="text-[12px] font-medium text-[#1E293B] mb-2 min-h-[18px]">
                {tier.badge}
              </div>

              {/* Title */}
              <h3 className="text-[28px] sm:text-[32px] font-light text-[#1E293B] mb-4">
                {tier.name}
              </h3>

              {/* Description */}
              <p className="text-[12px] sm:text-[13px] text-slate-600 leading-relaxed min-h-[40px] mb-6">
                {tier.desc}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-[32px] sm:text-[36px] font-light text-[#1E293B] tracking-tight">
                  {tier.price}
                </span>
                {tier.cadence && (
                  <span className="text-[12px] font-medium text-slate-500">
                    {tier.cadence}
                  </span>
                )}
              </div>

              {/* Features List */}
              <div className="flex flex-col gap-3 mb-10 flex-grow">
                {tier.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2">
                    <div className="mt-0.5 rounded-full bg-white/60 p-0.5">
                      <Check className="w-3 h-3 text-[#1E293B]" strokeWidth={3} />
                    </div>
                    <span className="text-[12px] sm:text-[13px] text-[#1E293B]">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button 
                type="button"
                onClick={() => onOpenDemo?.(tier.name)}
                className={`w-full rounded-full py-3 text-[13px] font-semibold transition-all cursor-pointer ${
                  tier.highlighted
                    ? "bg-[#2B2B36] text-white hover:bg-[#1E1E26]"
                    : "bg-[#91CBEA] text-white hover:bg-[#7ABAE0] shadow-sm"
                }`}
              >
                {tier.ctaText}
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
