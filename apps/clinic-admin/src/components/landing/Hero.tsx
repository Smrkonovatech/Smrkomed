"use client";

import Image from "next/image";
import { ArrowRight, Sparkles, CheckCircle2, Bot, MessageSquare, HeartHandshake, Smartphone } from "lucide-react";

interface HeroProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function Hero({ onOpenDemo }: HeroProps) {
  const handleDemoClick = (interest?: string) => {
    if (onOpenDemo) {
      onOpenDemo(interest);
    } else {
      const target = document.querySelector("#pricing");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleExploreClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector("#care-loop");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", "#care-loop");
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-28 bg-gradient-to-b from-purple-50/50 via-white to-white">
      {/* Background Soft Glow Auras matching brochure */}
      <div className="pointer-events-none absolute -top-40 right-10 -z-10 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-purple-300/30 via-cyan-200/20 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-0 -z-10 h-[450px] w-[450px] -translate-y-1/2 rounded-full bg-gradient-to-tr from-cyan-300/20 via-purple-200/20 to-transparent blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Hero Messaging */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/70 bg-purple-50/80 px-3.5 py-1 text-xs font-semibold text-purple-700 shadow-sm mb-6">
              <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <span>Healthcare Intelligence Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              One Connected Platform.<br />
              <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                Every Modern Healthcare Need.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="mt-6 text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-xl">
              SmrkoMed connects clinical care, care teams, patient communication, workflows and intelligence in one connected platform.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleDemoClick()}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-purple-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-purple-600/25 hover:bg-purple-700 hover:shadow-purple-600/35 transition group"
              >
                <Sparkles className="h-4 w-4" />
                <span>Book a Demo</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>

              <a
                href="#care-loop"
                onClick={handleExploreClick}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-800 shadow-sm hover:border-purple-200 hover:bg-purple-50/50 hover:text-purple-700 transition"
              >
                Explore SmrkoMed →
              </a>
            </div>

            {/* Quick Value Indicators */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full border-t border-slate-100 pt-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Deploy</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">Clinics & Hospitals</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Security</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">Tenant-Isolated</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ecosystem</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">Built for India</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Engine</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">Smrko AI Built-in</div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Large SmrkoMed Dashboard Floating UI with Connected Micro-Cards */}
          <div className="lg:col-span-6 relative">
            {/* Background Glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-500/10 via-cyan-400/10 to-indigo-500/15 blur-2xl -z-10" />

            {/* Dashboard Mockup Window */}
            <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-purple-900/10 overflow-hidden ring-1 ring-slate-900/5">
              {/* Window Chrome */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[11px] font-medium text-slate-500 hidden sm:inline">
                    SmrkoMed Clinic Intelligence • Dr. Shreya Session
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live Workspace
                  </span>
                </div>
              </div>

              {/* Real Dashboard Screenshot Display */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900/5">
                <Image
                  src="/branding/dashboard-doctor-preview.png"
                  alt="SmrkoMed Doctor Dashboard Workspace"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className="object-cover object-top hover:scale-[1.02] transition-transform duration-500"
                />
              </div>

              {/* Quick Summary Bar */}
              <div className="grid grid-cols-3 border-t border-slate-100 bg-white p-3 text-center text-xs">
                <div className="border-r border-slate-100">
                  <span className="font-bold text-slate-900 text-sm">38</span>
                  <span className="block text-[10px] text-slate-500">Active Journeys</span>
                </div>
                <div className="border-r border-slate-100">
                  <span className="font-bold text-emerald-600 text-sm">31</span>
                  <span className="block text-[10px] text-slate-500">On Track</span>
                </div>
                <div>
                  <span className="font-bold text-purple-600 text-sm">08</span>
                  <span className="block text-[10px] text-slate-500">Today Visits</span>
                </div>
              </div>
            </div>

            {/* Floating Connected Product Card 1: Doctor App (Top Right) */}
            <div className="absolute -top-6 -right-4 sm:-right-6 hidden sm:flex items-center gap-3 rounded-2xl border border-purple-100 bg-white/95 p-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Smartphone className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900">Doctor Mobile App</div>
                <div className="text-[11px] text-slate-500">38 Journeys • Schedule Sync</div>
              </div>
            </div>

            {/* Floating Connected Product Card 2: Care Loop (Bottom Left) */}
            <div className="absolute -bottom-6 -left-4 sm:-left-6 hidden sm:flex items-center gap-3 rounded-2xl border border-cyan-100 bg-white/95 p-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                <HeartHandshake className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900">Care Loop Engine</div>
                <div className="text-[11px] text-emerald-600 font-medium">98.4% Automated Next Actions</div>
              </div>
            </div>

            {/* Floating Connected Product Card 3: WhatsApp + Smrko AI (Bottom Right) */}
            <div className="absolute -bottom-8 right-8 hidden lg:flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/95 p-2.5 shadow-xl backdrop-blur-md">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                  WhatsApp + Smrko AI
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[10px] text-slate-500">Instant patient confirmation</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
