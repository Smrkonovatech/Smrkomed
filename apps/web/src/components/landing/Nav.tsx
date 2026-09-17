"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Menu, Sparkles, X } from "lucide-react";

interface NavProps {
  onOpenDemo?: ((interest?: string) => void) | undefined;
}

export function Nav({ onOpenDemo }: NavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDemoClick = (interest?: string) => {
    if (onOpenDemo) {
      onOpenDemo(interest);
    } else {
      const target = document.querySelector("#pricing");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navLinks = [
    { label: "Platform", href: "#platform" },
    { label: "Company", href: "#specialties" },
    { label: "Smrko AI", href: "#ai" },
    { label: "Solutions", href: "#solutions" },
    { label: "Integrations", href: "#integrations" },
    { label: "Pricing", href: "#pricing" },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <header className="sticky top-3 z-50 w-full px-4 sm:px-6">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/40 bg-white/20 px-4 sm:px-6 shadow-sm backdrop-blur-xl transition-all">
        {/* Brand Logo with Mark */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 p-1 shadow-sm group-hover:scale-105 transition">
            <Image
              src="/branding/smrkomed-mark.png"
              alt="SmrkoMed Mark"
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <span className="text-sm sm:text-base font-extrabold tracking-wider text-slate-900 flex items-center gap-1">
            SMRKOMED
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="text-xs font-medium text-slate-700/90 hover:text-slate-950 transition"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-xs font-medium text-slate-700/90 hover:text-slate-950 transition"
          >
            Log In
          </Link>
        </nav>

        {/* Desktop Right CTA */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-medium text-slate-700/90 hover:text-slate-950 transition lg:hidden"
          >
            Log In
          </Link>
          <button
            type="button"
            onClick={() => handleDemoClick()}
            className="inline-flex items-center justify-center rounded-full bg-[#201c38] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-900 transition"
          >
            Book a Demo
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => handleDemoClick()}
            className="rounded-full bg-[#201c38] px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
          >
            Book Demo
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full p-1.5 text-slate-800 hover:bg-white/40 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mx-auto mt-2 max-w-5xl rounded-3xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur-xl sm:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleScrollTo(e, link.href);
                }}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full text-center rounded-full border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Sign In to Clinic Workspace
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleDemoClick();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#201c38] py-2.5 text-xs font-semibold text-white shadow-md"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Book a Demo</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
