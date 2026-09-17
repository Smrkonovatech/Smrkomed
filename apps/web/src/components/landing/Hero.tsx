"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

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

  return (
    <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24">
      {/* Iridescent background glow behind the doctor image on left */}
      <div className="pointer-events-none absolute left-[-5%] top-[10%] -z-10 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-cyan-300/40 via-emerald-300/30 to-purple-400/35 blur-3xl opacity-75" />
      <div className="pointer-events-none absolute right-[10%] top-[5%] -z-10 h-[380px] w-[380px] rounded-full bg-white/30 blur-2xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-8">
          
          {/* LEFT COLUMN: Doctor with Glowing Ring & Floating Cloud Accents */}
          <div className="lg:col-span-6 flex justify-center lg:justify-start order-2 lg:order-1 relative">
            <div className="relative w-full max-w-[420px] sm:max-w-[460px]">
              
              {/* Iridescent Halo Ring Backdrop */}
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-cyan-400/50 via-teal-300/40 to-indigo-400/40 blur-xl -z-10" />
              
              {/* Floating Soft Cloud 1 - Top Left */}
              <div className="absolute -top-6 -left-6 z-20 pointer-events-none opacity-90 drop-shadow-md hidden sm:block">
                <svg width="140" height="70" viewBox="0 0 140 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M28 58C12.536 58 0 45.464 0 30C0 14.536 12.536 2 28 2C32.1462 2 36.0594 2.89904 39.5768 4.51688C45.3908 1.68537 51.982 0 59 0C80.5391 0 98 17.4609 98 39C98 40.0163 97.9611 41.0234 97.8845 42.0191C102.327 38.3056 108.067 36 114.5 36C128.583 36 140 47.4167 140 61.5C140 62.6869 139.919 63.8552 139.761 65H28V58Z" fill="url(#cloudGradTop)" />
                  <defs>
                    <linearGradient id="cloudGradTop" x1="70" y1="0" x2="70" y2="65" gradientUnits="userSpaceOnUse">
                      <stop stopColor="white" stopOpacity="0.95" />
                      <stop offset="1" stopColor="white" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Main Doctor Image Container */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-sky-900/15 border-4 border-white/70 bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-sm">
                <Image
                  src="/branding/hero-doctor.jpg"
                  alt="Doctor collaborating on SmrkoMed Healthcare Platform"
                  width={500}
                  height={620}
                  priority
                  className="w-full h-auto object-cover object-top"
                />
              </div>

              {/* Floating Soft Cloud 2 - Bottom Under Doctor */}
              <div className="absolute -bottom-8 -left-10 -right-10 z-20 pointer-events-none drop-shadow-xl">
                <svg viewBox="0 0 500 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                  <path d="M70 120C31.3401 120 0 88.6599 0 50C0 14.5 28.5 0 65 0C82.5 0 98 7 110 18C126 6 148 0 172 0C222 0 263 38 268 87C282 76 301 70 322 70C363 70 398 98 406 138C418 127 434 120 452 120C478.51 120 500 141.49 500 168V180H0V120H70Z" fill="url(#heroCloudBottom)" />
                  <defs>
                    <linearGradient id="heroCloudBottom" x1="250" y1="0" x2="250" y2="180" gradientUnits="userSpaceOnUse">
                      <stop stopColor="white" stopOpacity="0.98" />
                      <stop offset="0.6" stopColor="white" stopOpacity="0.92" />
                      <stop offset="1" stopColor="white" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: Bold Typography matching reference */}
          <div className="lg:col-span-6 flex flex-col items-start text-left order-1 lg:order-2 lg:pl-6">
            
            {/* Main Headline */}
            <h1 className="tracking-tight leading-[1.08]">
              <span className="block text-4xl sm:text-6xl lg:text-7xl font-light text-slate-800">
                One
              </span>
              <span className="block text-4xl sm:text-6xl lg:text-7xl font-extrabold text-sky-500 mt-1">
                Connected
              </span>
              <span className="block text-4xl sm:text-6xl lg:text-7xl font-light text-slate-800 mt-1">
                Platform
              </span>
            </h1>

            {/* Sub-headline */}
            <h2 className="mt-5 text-xl sm:text-2xl font-normal text-slate-800 tracking-tight">
              for Every Modern Healthcare Need
            </h2>

            {/* Supporting Copy */}
            <p className="mt-4 text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
              Smrkomed brings clinical care, care teams, patient communication, workflows, and intelligence together in one seamless healthcare platform.
            </p>

            {/* Dark Pill CTA */}
            <div className="mt-7">
              <button
                type="button"
                onClick={() => handleDemoClick()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#201c38] px-8 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-xl hover:bg-slate-900 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all duration-200"
              >
                <span>Book a Demo</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
