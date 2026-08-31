"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { WaSection, WaStatusPill } from "@/components/whatsapp/center/section";
import { Button } from "@/components/ui/button";
import { IVF_JOURNEY_STAGES } from "@/lib/whatsapp/center-demo";
import { cn } from "@/lib/utils";

export function CarePlanWhatsAppBridge({ activeStage = "Monitoring" }: { activeStage?: string }) {
  return (
    <WaSection
      title="Care Plan → WhatsApp"
      subtitle="Doctor-approved stages attach communication workflows. Care Loop coordinates; AI does not make clinical decisions."
      action={
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <Link href="/whatsapp/flows/new">
            Open IVF journey flow <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      }
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {IVF_JOURNEY_STAGES.map((stage, index) => {
          const active = stage.name === activeStage;
          return (
            <div
              key={stage.id}
              className={cn(
                "min-w-[140px] shrink-0 rounded-xl border px-3 py-3",
                active
                  ? "border-primary bg-primary-soft/60"
                  : "border-border/70 bg-background",
              )}
            >
              <p className="text-[10px] font-medium text-muted-foreground">Stage {index + 1}</p>
              <p className="mt-0.5 text-sm font-semibold">{stage.name}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <WaStatusPill label={`${stage.tasks} tasks`} tone="muted" />
                <WaStatusPill label={`${stage.automations} autos`} tone={active ? "primary" : "muted"} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-primary/25 bg-primary-soft/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Care stage · {activeStage}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tasks: monitoring appointment · scan · report upload — with reminders, prep instructions, and missing-report follow-up.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/care-loop">View Journey</Link>
          </Button>
        </div>
      </div>
    </WaSection>
  );
}
