"use client";

import { Activity, BarChart3, Bot, TrendingUp } from "lucide-react";

import { KpiCard, PageHeader, ProgressBar, SectionHeading } from "@/components/ui-kit";
import { analytics } from "@/lib/demo-data";

function Bars({
  data,
  keyA,
  keyB,
  labelKey,
}: {
  data: Record<string, string | number>[];
  keyA: string;
  keyB: string;
  labelKey: string;
}) {
  const max = Math.max(...data.map((d) => Math.max(Number(d[keyA]), Number(d[keyB]))));
  return (
    <div className="flex h-48 items-end gap-3">
      {data.map((d) => (
        <div
          key={String(d[labelKey])}
          className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
        >
          <div className="flex h-40 w-full items-end justify-center gap-1">
            <div
              className="w-1/2 rounded-t-md bg-primary transition-all"
              style={{ height: `${(Number(d[keyA]) / max) * 100}%` }}
              title={`${keyA}: ${d[keyA]}`}
            />
            <div
              className="w-1/2 rounded-t-md bg-teal transition-all"
              style={{ height: `${(Number(d[keyB]) / max) * 100}%` }}
              title={`${keyB}: ${d[keyB]}`}
            />
          </div>
          <span className="truncate text-xs text-muted-foreground">{String(d[labelKey])}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Clinic operations and Care Loop effectiveness, side by side."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active patients"
          value="1,248"
          delta="12.4%"
          icon={TrendingUp}
          tone="primary"
        />
        <KpiCard
          label="Task completion"
          value="92.4%"
          delta="4.2%"
          icon={Activity}
          tone="success"
        />
        <KpiCard label="Patient response rate" value="94%" delta="2.8%" icon={Bot} tone="purple" />
        <KpiCard
          label="Manual follow-ups saved"
          value="41h"
          hint="This week"
          icon={BarChart3}
          tone="teal"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="surface-card p-4">
          <SectionHeading
            title="Tasks this week"
            subtitle="Created vs completed"
            icon={BarChart3}
          />
          <Bars data={analytics.weekly} keyA="created" keyB="completed" labelKey="day" />
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> Created
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-teal" /> Completed
            </span>
          </div>
        </section>

        <section className="surface-card p-4">
          <SectionHeading
            title="Patient growth"
            subtitle="Last 6 months"
            icon={TrendingUp}
            tone="teal"
          />
          <Bars data={analytics.patients} keyA="active" keyB="added" labelKey="month" />
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-teal" /> Added
            </span>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="surface-card p-4">
          <SectionHeading
            title="Response channels"
            subtitle="How patients reply"
            icon={Bot}
            tone="purple"
          />
          <ul className="space-y-3">
            {analytics.channels.map((c) => (
              <li key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-semibold tabular-nums">{c.value}%</span>
                </div>
                <ProgressBar pct={c.value} tone="purple" />
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-4">
          <SectionHeading title="Operations" subtitle="This week" icon={Activity} tone="info" />
          <ul className="space-y-3">
            {analytics.operations.map((o) => (
              <li key={o.label}>
                <div className="flex items-center justify-between text-sm">
                  <span>{o.label}</span>
                  <span className="font-semibold">{o.value}</span>
                </div>
                <ProgressBar pct={o.pct} tone={o.tone} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
