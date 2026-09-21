"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  onOpenDemo?: () => void;
}

export function Header({ onOpenDemo }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 w-full px-4 flex flex-col items-center">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/20 bg-white/20 px-4 sm:px-6 py-3 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.05)] transition-all">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/images/landing/logo.svg" 
            alt="Smrkomed" 
            width={140} 
            height={24} 
            className="h-5 w-auto sm:h-6 md:h-8 shrink-0"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-4 xl:gap-8 lg:flex">
          {["Platform", "Careloop", "Smrko AI", "Solutions", "Integrations", "Pricing"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-[14px] xl:text-[15px] font-medium text-slate-800 transition-colors hover:text-sky-600 whitespace-nowrap"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Right Actions - Desktop */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-6">
          <Link
            href="/login"
            className="text-[14px] xl:text-[15px] font-medium text-slate-800 transition-colors hover:text-sky-600 whitespace-nowrap"
          >
            Sign in
          </Link>
          <button 
            type="button"
            onClick={onOpenDemo}
            className="rounded-full bg-[#2A2B3D] px-6 py-2.5 text-[14px] xl:text-[15px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-md cursor-pointer whitespace-nowrap"
          >
            Book a Demo
          </button>
        </div>

        {/* Right Actions - Mobile */}
        <div className="flex lg:hidden items-center gap-2 sm:gap-3 shrink-0">
          <button 
            type="button"
            onClick={onOpenDemo}
            className="whitespace-nowrap rounded-full bg-[#2A2B3D] px-3 py-1.5 text-[12px] sm:px-4 sm:py-2 sm:text-[13px] font-medium text-white transition-all hover:bg-[#1a1b26] hover:shadow-md cursor-pointer"
          >
            Book a Demo
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-white/40 text-slate-800 hover:bg-white/60 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mx-auto mt-2 w-full max-w-7xl rounded-3xl border border-white/40 bg-white/90 p-5 shadow-xl backdrop-blur-xl lg:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-2">
            {["Platform", "Careloop", "Smrko AI", "Solutions", "Integrations", "Pricing"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-[15px] font-medium text-slate-800 hover:bg-white hover:text-sky-600 transition"
              >
                {item}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-slate-200/60 pt-4 flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-xl border border-slate-200 bg-white py-3 text-[15px] font-medium text-slate-800 hover:bg-slate-50 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}