"use client";

import Link from "next/link";
import { Btn, Section } from "./primitives";

/* ---------------- 15 · CTA ---------------- */

export function CtaSection() {
  return (
    <Section>
      <div className="gradient-deep relative overflow-hidden rounded-[36px] p-10 text-center md:p-16">
        <div className="glow-orb -top-16 right-10 h-[320px] w-[320px] bg-white/25" />
        <div className="relative mx-auto max-w-[48ch]">
          <h2 className="text-[32px] leading-[1.12] font-light text-primary-foreground md:text-[46px]">
            Build a more <span className="font-semibold">connected clinic.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-white/75">
            Bring patients, care teams and workflows together in one modular platform — so nothing falls through the
            cracks between visits.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#demo">
              <Btn variant="glass">See Demo</Btn>
            </a>
            <Link href="/login">
              <Btn variant="glass">Login</Btn>
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- 16 · Final word ---------------- */

export function FinalCta() {
  return (
    <Section id="future" className="relative overflow-hidden text-center">
      <div className="glow-orb top-0 left-1/2 h-[420px] w-[520px] -translate-x-1/2 bg-brand-soft" />
      <div className="relative">
        <h2 className="mx-auto max-w-[16ch] text-[36px] leading-[1.08] font-light text-foreground md:text-[56px]">
          Healthcare is a journey. <span className="font-semibold">Let's make it connected.</span>
        </h2>
        <div className="mt-12 flex flex-col items-center gap-3">
          <img
            src="/branding/smrkomed-logo.png"
            alt="SMRKOMED"
            width={44}
            height={44}
            className="h-10 w-auto"
            loading="lazy"
          />
          <span className="text-[17px] font-semibold tracking-[0.2em] text-foreground">SMRKOMED</span>
          <span className="text-[13px] text-muted-foreground">Powered by Smrkonova Softech Solutions LLP</span>
        </div>
      </div>
    </Section>
  );
}

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Care Loop", href: "#care-loop" },
  { label: "Features", href: "#features" },
  { label: "Future of Healthcare", href: "#future" },
] as const;

export function Footer() {
  return (
    <footer id="footer" className="border-t border-border bg-lavender-soft px-6 py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/branding/smrkomed-logo.png"
              alt="SMRKOMED"
              width={36}
              height={36}
              className="h-8 w-auto"
              loading="lazy"
            />
            <span className="text-[16px] font-semibold tracking-[0.14em] text-foreground">SMRKOMED</span>
          </div>
          <p className="mt-4 max-w-[28ch] text-[14px] text-muted-foreground">Connected healthcare technology.</p>
          <a
            href="https://smrkonova.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-[14px] text-muted-foreground transition-colors hover:text-primary"
          >
            Powered by SMRKONOVA →
          </a>
        </div>

        <div>
          <h3 className="text-[13px] font-semibold tracking-[0.14em] text-foreground uppercase">Explore</h3>
          <ul className="mt-4 space-y-2.5">
            {navLinks.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-[14px] text-muted-foreground transition-colors hover:text-primary">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" className="text-[14px] text-muted-foreground transition-colors hover:text-primary">
                Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-[13px] font-semibold tracking-[0.14em] text-foreground uppercase">Company</h3>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            SMRKONOVA SOFTECH SOLUTIONS LLP
          </p>
        </div>
      </div>
      <div className="mx-auto mt-14 w-full max-w-6xl border-t border-border pt-6 text-[13px] text-muted-foreground">
        © 2026 Smrkonova Softech Solutions LLP. All rights reserved. Photography is illustrative stock imagery and does
        not depict SMRKOMED patients.
      </div>
    </footer>
  );
}
