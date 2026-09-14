"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, MessageSquare, ShieldCheck, Heart } from "lucide-react";

interface ClosingProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function FinalCta({ onOpenDemo }: ClosingProps) {
  const handleDemoClick = (interest?: string) => {
    if (onOpenDemo) {
      onOpenDemo(interest);
    } else {
      const target = document.querySelector("#pricing");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 sm:py-28 text-white">
      {/* Background radial gradient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-purple-600/30 via-cyan-500/20 to-blue-600/30 blur-[120px] -z-10" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-900/60 border border-purple-400/30 px-4 py-1.5 text-xs font-semibold text-purple-300 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Transform Clinic Coordination</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          See SmrkoMed in action.
        </h2>

        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Bring your care teams, patients and operations together on one connected platform.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => handleDemoClick("Live Platform Demo")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition group"
          >
            <Sparkles className="h-4 w-4" />
            <span>Book a Demo</span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            onClick={() => handleDemoClick("Consultation with Team")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-8 py-4 text-base font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition"
          >
            <span>Talk to Our Team</span>
          </button>
        </div>

        {/* Subtle dashboard peek visual */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 max-w-3xl mx-auto shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-1.5 border-b border-slate-800">
            <span className="font-mono text-cyan-400 font-semibold">smrkomed.app • Live Preview</span>
            <span className="text-emerald-400">● 99.9% Uptime</span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div>
              <div className="text-[10px] text-slate-500">Connected Care</div>
              <div className="text-sm font-bold text-white mt-0.5">Doctor &amp; Staff</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Care Loop Engine</div>
              <div className="text-sm font-bold text-purple-400 mt-0.5">Automated</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Patient Chat</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">WhatsApp</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">Intelligence Layer</div>
              <div className="text-sm font-bold text-cyan-400 mt-0.5">Smrko AI</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          
          {/* Brand Col */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5 shadow-md">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                  <Image
                    src="/branding/smrkomed-mark.png"
                    alt="SmrkoMed"
                    width={20}
                    height={20}
                    className="object-contain invert"
                  />
                </div>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">SMRKOMED</span>
            </Link>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed max-w-xs">
              Healthcare Intelligence Platform.<br />
              One connected platform for clinical care, care teams, patient communication and workflows.
            </p>
            <div className="mt-4 text-[11px] text-slate-500">
              © {new Date().getFullYear()} Smrkonova Softech Solutions LLP.<br />
              All rights reserved.
            </div>
          </div>

          {/* Platform Col */}
          <div>
            <div className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">Platform</div>
            <ul className="space-y-2">
              <li><Link href="/#platform" className="hover:text-white transition">Patient Management</Link></li>
              <li><Link href="/#platform" className="hover:text-white transition">Care Journeys</Link></li>
              <li><Link href="/#care-loop" className="hover:text-white transition">Care Loop</Link></li>
              <li><Link href="/#platform" className="hover:text-white transition">Communication</Link></li>
              <li><Link href="/#ai" className="hover:text-white transition">Smrko AI</Link></li>
              <li><Link href="/#platform" className="hover:text-white transition">Diagnostics</Link></li>
              <li><Link href="/#platform" className="hover:text-white transition">Billing</Link></li>
              <li><Link href="/#platform" className="hover:text-white transition">Pharmacy</Link></li>
            </ul>
          </div>

          {/* Solutions Col */}
          <div>
            <div className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">Solutions</div>
            <ul className="space-y-2">
              <li><Link href="/#solutions" className="hover:text-white transition">Fertility &amp; IVF</Link></li>
              <li><Link href="/#solutions" className="hover:text-white transition">Dental</Link></li>
              <li><Link href="/#solutions" className="hover:text-white transition">Dermatology</Link></li>
              <li><Link href="/#solutions" className="hover:text-white transition">Maternity</Link></li>
              <li><Link href="/#solutions" className="hover:text-white transition">Aesthetics</Link></li>
              <li><Link href="/#pricing" className="hover:text-white transition">Clinics</Link></li>
              <li><Link href="/#pricing" className="hover:text-white transition">Hospitals</Link></li>
              <li><Link href="/#pricing" className="hover:text-white transition">Enterprise</Link></li>
            </ul>
          </div>

          {/* AI & Integrations Col */}
          <div>
            <div className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">AI &amp; Ecosystem</div>
            <ul className="space-y-2">
              <li><Link href="/#ai" className="hover:text-white transition">Smrko AI</Link></li>
              <li><Link href="/#ai" className="hover:text-white transition">Care Connect</Link></li>
              <li><Link href="/#ai" className="hover:text-white transition">Care Builder</Link></li>
              <li><Link href="/#ai" className="hover:text-white transition">Care Voice</Link></li>
              <li><Link href="/#integrations" className="hover:text-white transition">ABDM / ABHA</Link></li>
              <li><Link href="/#integrations" className="hover:text-white transition">NHCX</Link></li>
              <li><Link href="/#integrations" className="hover:text-white transition">HMS / EMR</Link></li>
              <li><Link href="/#integrations" className="hover:text-white transition">Payments</Link></li>
            </ul>
          </div>

          {/* Company & Legal Col */}
          <div>
            <div className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">Legal &amp; Trust</div>
            <ul className="space-y-2">
              <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/data-deletion" className="hover:text-white transition">Data Deletion</Link></li>
              <li><span className="text-slate-500">Terms of Service</span></li>
              <li><span className="text-slate-500">Security Practices</span></li>
              <li><Link href="/login" className="hover:text-white transition">Clinic Login</Link></li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
}

export function Closing({ onOpenDemo }: ClosingProps) {
  return (
    <>
      <FinalCta onOpenDemo={onOpenDemo} />
      <Footer />
    </>
  );
}
