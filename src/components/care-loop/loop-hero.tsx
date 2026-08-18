"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";

function LoopVisual() {
  return (
    <div className="relative grid size-28 shrink-0 place-items-center" aria-hidden>
      <div className="absolute size-28 rounded-full border border-primary-foreground/25" />
      <div className="absolute size-20 rounded-full border border-primary-foreground/20" />
      <div className="absolute size-28 animate-loop-spin rounded-full border-2 border-transparent border-t-primary-foreground/80 border-r-primary-foreground/35" />
      <div className="absolute size-16 animate-pulse-ring rounded-full bg-primary-foreground/20" />
      <RefreshCw className="size-7 text-primary-foreground" />
    </div>
  );
}

export function LoopHero({ compact = false }: { compact?: boolean }) {
  const { kpis } = useAppState();

  const stats = [
    { value: String(kpis.active), label: "Active Journeys" },
    { value: `${Math.round(kpis.completion)}%`, label: "Tasks Completed" },
    { value: String(kpis.automatedToday), label: "Patient Follow-ups" },
    { value: String(kpis.needAttention), label: "Needs Attention" },
  ];

  return (
    <section className="animate-rise relative overflow-hidden rounded-2xl gradient-loop p-6 text-primary-foreground shadow-loop">
      <div
        className="absolute -top-24 -right-16 size-64 rounded-full bg-primary-foreground/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Care Loop</h2>
          <p className="mt-1.5 max-w-lg text-sm text-primary-foreground/85">
            Every step of the fertility journey, followed through.
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="num-display text-3xl">{s.value}</dd>
                <dt className="text-[11px] text-primary-foreground/80">{s.label}</dt>
              </div>
            ))}
          </dl>

          {!compact && (
            <Button asChild variant="secondary" className="mt-5 rounded-xl">
              <Link href="/care-loop">
                Open Care Loop <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        <LoopVisual />
      </div>
    </section>
  );
}

export function LoopChain() {
  const steps = ["Plan", "Task", "Patient", "Follow-up", "Response", "Completion", "Next Step"];
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Care Loop cycle">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium">{s}</span>
          {i < steps.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}
