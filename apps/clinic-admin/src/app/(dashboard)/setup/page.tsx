"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { WORKFLOWS } from "@/lib/saas/catalog";
import { cn } from "@/lib/utils";

const steps = [
  { id: "clinic", label: "Clinic details", done: true, href: "/settings" },
  { id: "team", label: "Add team", done: true, href: "/settings" },
  { id: "modules", label: "Choose modules", done: true, href: "/setup" },
  { id: "whatsapp", label: "Connect WhatsApp", done: false, href: "/integrations" },
  { id: "marketing", label: "Connect marketing", done: false, href: "/integrations" },
  { id: "workflows", label: "Configure workflows", done: false, href: "/care-plans" },
];

export default function SetupPage() {
  const complete = steps.filter((step) => step.done).length;
  const pct = Math.round((complete / steps.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Set up your clinic"
        subtitle="Recommended fertility setup. Connect accounts — never paste API keys."
        actions={
          <Button asChild>
            <Link href="/home">Start using SmrkoMed</Link>
          </Button>
        }
      />

      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">SmrkoMed recommends</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Care Loop, CRM, Appointments and Analytics are on. WhatsApp and ads are next.
            </p>
          </div>
          <StatusBadge label={`You're ${pct}% ready`} tone="primary" />
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid gap-3">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                  step.done ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {step.done ? <Check className="size-4" /> : <Circle className="size-4" />}
              </span>
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.done ? "Complete" : "Action needed"}</p>
              </div>
            </div>
            <StatusBadge label={step.done ? "Complete" : "Connect"} tone={step.done ? "success" : "warning"} />
          </Link>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold">Care workflows</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with the fertility journeys clinics use every day. Care Loop takes over after treatment starts.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {WORKFLOWS.map((workflow) => (
            <div key={workflow.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{workflow.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{workflow.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
