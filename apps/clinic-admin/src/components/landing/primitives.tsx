"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Btn({
  children,
  variant = "primary",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "glass" | "dark";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-[54px] items-center justify-center gap-2 rounded-[18px] px-7 text-[15px] font-medium transition-all duration-300",
        variant === "primary" &&
          "gradient-brand text-primary-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)] hover:brightness-105",
        variant === "secondary" &&
          "border border-border bg-card text-foreground hover:border-primary/35 hover:bg-secondary",
        variant === "glass" &&
          "border border-white/60 bg-white/25 text-primary-foreground backdrop-blur-md hover:bg-white/35",
        variant === "dark" && "bg-foreground text-background hover:opacity-90",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative px-6 py-24 md:py-32", className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-4 py-1.5 text-[12px] font-medium tracking-[0.18em] uppercase",
        tone === "light" ? "bg-secondary text-secondary-foreground" : "bg-white/15 text-primary-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: "LIVE" | "IN DEVELOPMENT" | "COMING NEXT" | "ROADMAP" }) {
  const map: Record<string, string> = {
    LIVE: "bg-primary/12 text-primary",
    "IN DEVELOPMENT": "bg-accent text-accent-foreground",
    "COMING NEXT": "bg-secondary text-secondary-foreground",
    ROADMAP: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em]",
        map[status],
      )}
    >
      {status}
    </span>
  );
}

export function FlowNode({
  label,
  sub,
  active,
  tone = "light",
}: {
  label: string;
  sub?: string;
  active?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-3 text-center transition-all duration-500",
        tone === "light"
          ? active
            ? "gradient-brand border-transparent text-primary-foreground shadow-[var(--shadow-soft)]"
            : "border-border bg-card text-muted-foreground"
          : active
            ? "border-white/50 bg-white/20 text-primary-foreground backdrop-blur-md"
            : "border-white/15 bg-white/5 text-white/55",
      )}
    >
      <div className="text-sm font-medium">{label}</div>
      {sub ? <div className="mt-0.5 text-[11px] opacity-75">{sub}</div> : null}
    </div>
  );
}
