"use client";

import Link from "next/link";
import { Btn } from "./primitives";

const links = [
  { label: "Platform", href: "/#platform" },
  { label: "Care Loop", href: "/#care-loop" },
  { label: "Features", href: "/#features" },
  { label: "Future of Healthcare", href: "/#future" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/branding/smrkomed-logo.png"
            alt="SMRKOMED"
            width={40}
            height={40}
            className="h-9 w-auto"
          />
          <span className="leading-tight">
            <span className="block text-[17px] font-semibold tracking-[0.14em] text-foreground">SMRKOMED</span>
            <span className="block text-[11px] text-muted-foreground">Powered by Smrkonova</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-[14px] text-muted-foreground transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/login"
              className="text-[14px] text-muted-foreground transition-colors hover:text-primary"
            >
              Login
            </Link>
          </li>
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="/#demo"
            className="hidden text-[14px] text-muted-foreground transition-colors hover:text-primary sm:block"
          >
            See Demo
          </a>
          <Link
            href="/login"
            className="hidden text-[14px] text-muted-foreground transition-colors hover:text-primary sm:block"
          >
            Login
          </Link>
          <Link href="/register">
            <Btn className="h-11 px-5 text-[14px]">Create Clinic →</Btn>
          </Link>
        </div>
      </nav>
    </header>
  );
}
