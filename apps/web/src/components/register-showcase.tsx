"use client";

import { CheckCircle2, MessageCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const slides = [
  {
    eyebrow: "Care Loop",
    lead: "Follow every",
    accent: "patient step.",
    copy: "Doctors write the plan. Care Loop makes sure it actually happens.",
  },
  {
    eyebrow: "Universal CRM",
    lead: "Every lead,",
    accent: "one pipeline.",
    copy: "Google, Meta, WhatsApp and website enquiries land in the same clinic workspace.",
  },
  {
    eyebrow: "Integrations",
    lead: "Connect. Don’t",
    accent: "configure keys.",
    copy: "WhatsApp, ads and calendar with one click — no API keys on this screen.",
  },
];

export function RegisterShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[index] ?? slides[0]!;

  return (
    <div className="relative hidden overflow-hidden rounded-r-2xl bg-[linear-gradient(165deg,#fff9f7_0%,#f2e9f5_48%,#f7dce8_100%)] lg:flex lg:flex-col lg:justify-between lg:p-10">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-rose/15 blur-3xl" />

      <div className="relative text-center">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
          {slide.eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          {slide.lead} <span className="text-primary">{slide.accent}</span>
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{slide.copy}</p>
      </div>

      <div className="relative mx-auto mt-8 w-full max-w-sm">
        <div className="rounded-2xl border bg-card/90 p-4 shadow-[0_20px_50px_-32px_rgb(91_42_104/0.45)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-primary">SMRKOMED</p>
              <p className="mt-0.5 text-sm font-semibold">ABC Fertility Centre</p>
            </div>
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
              Live
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Leads", "42"],
              ["At risk", "7"],
              ["On track", "86"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/70 px-2 py-2 text-center">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-lg font-bold tracking-tight">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-xs font-medium">Priya · IVF Bangalore</p>
                <p className="text-[10px] text-muted-foreground">Google Ads → WhatsApp</p>
              </div>
              <span className="text-[10px] font-semibold text-primary">New lead</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-xs font-medium">Meera Iyer · Care Loop</p>
                <p className="text-[10px] text-muted-foreground">Missed scan reminder sent</p>
              </div>
              <RefreshCw className="size-3.5 text-primary" />
            </div>
          </div>
        </div>

        <div className="absolute -left-6 top-8 animate-[rise_0.6s_ease-out] rounded-xl border bg-card px-3 py-2 shadow-lift">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
            <CheckCircle2 className="size-3.5" />
            WhatsApp connected
          </p>
        </div>
        <div className="absolute -right-5 top-28 rounded-xl border bg-card px-3 py-2 shadow-lift">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose">
            <TriangleAlert className="size-3.5" />
            7 patients at risk
          </p>
        </div>
        <div className="absolute bottom-3 -right-4 rounded-xl border bg-card px-3 py-2 shadow-lift">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <MessageCircle className="size-3.5" />
            Lead followed up
          </p>
        </div>
      </div>

      <div className="relative mt-8 flex justify-center gap-1.5">
        {slides.map((item, slideIndex) => (
          <button
            key={item.eyebrow}
            type="button"
            aria-label={item.eyebrow}
            onClick={() => setIndex(slideIndex)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              slideIndex === index ? "w-6 bg-primary" : "w-1.5 bg-primary/25",
            )}
          />
        ))}
      </div>
    </div>
  );
}
