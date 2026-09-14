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
    { label: "Care Loop", href: "#care-loop" },
    { label: "AI", href: "#ai" },
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo with Origami Mark */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-0.5 shadow-md shadow-purple-600/20 group-hover:scale-105 transition">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white">
              <Image
                src="/branding/smrkomed-mark.png"
                alt="SmrkoMed Mark"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              SMRKOMED
              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 border border-cyan-200/60 tracking-normal">
                Platform
              </span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Healthcare Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="text-sm font-medium text-slate-600 hover:text-purple-600 transition"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Right CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-700 hover:text-slate-900 transition px-3 py-2"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={() => handleDemoClick()}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-600/25 transition group"
          >
            <Sparkles className="h-4 w-4 opacity-80" />
            <span>Book a Demo</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => handleDemoClick()}
            className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 border border-purple-100"
          >
            Book Demo
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-100 bg-white px-4 pt-3 pb-6 md:hidden shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleScrollTo(e, link.href);
                }}
                className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full text-center rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Sign In to Clinic Workspace
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleDemoClick();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              <span>Book a Demo</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
