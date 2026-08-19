"use client";

import { Check, ChevronRight, Circle, Dot, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { fertilityStages, type JourneyStageState } from "@/lib/demo-data";

export interface JourneyStage {
  label: string;
  state: JourneyStageState;
  detail?: string;
}

const stateStyles: Record<JourneyStageState, string> = {
  done: "bg-success text-success-foreground border-success",
  current: "gradient-loop text-primary-foreground border-transparent",
  attention: "bg-warning text-warning-foreground border-warning",
  upcoming: "bg-card text-muted-foreground border-border",
};

function StageIcon({ state }: { state: JourneyStageState }) {
  if (state === "done") return <Check className="size-4" />;
  if (state === "current") return <Dot className="size-6" />;
  if (state === "attention") return <TriangleAlert className="size-4" />;
  return <Circle className="size-3" />;
}

export function JourneyStrip({ stages }: { stages: JourneyStage[] }) {
  const [selected, setSelected] = useState(
    stages.findIndex((s) => s.state === "current" || s.state === "attention"),
  );
  const active = stages[selected] ?? stages[0];

  return (
    <div>
      <ol className="flex items-center gap-1 overflow-x-auto pb-2">
        {stages.map((stage, i) => (
          <li key={stage.label} className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setSelected(i)}
              aria-current={selected === i ? "step" : undefined}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl px-3 py-2 transition-colors",
                selected === i ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border-2",
                  stateStyles[stage.state],
                )}
              >
                <StageIcon state={stage.state} />
              </span>
              <span className="text-xs font-medium whitespace-nowrap">{stage.label}</span>
            </button>
            {i < stages.length - 1 && (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </li>
        ))}
      </ol>
      {active?.detail && (
        <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{active.label}: </span>
          {active.detail}
        </p>
      )}
    </div>
  );
}

/**
 * Compact fertility cycle journey: Consultation → Baseline → Monitoring →
 * Procedure → Transfer → Follow-up → Pregnancy Test.
 */
export function CycleJourney({
  stageIndex,
  size = "md",
  stages = [...fertilityStages],
}: {
  stageIndex: number;
  size?: "sm" | "md" | "lg";
  stages?: string[];
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {stages.map((label, i) => {
        const done = i < stageIndex;
        const current = i === stageIndex;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium whitespace-nowrap",
                size === "lg" ? "text-sm" : "text-xs",
                done && "border-success/25 bg-success-soft text-success",
                current && "border-transparent gradient-loop text-primary-foreground shadow-soft",
                !done && !current && "border-border bg-card text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center",
                  size === "lg" ? "size-4" : "size-3.5",
                )}
                aria-hidden
              >
                {done ? (
                  <Check className={size === "lg" ? "size-4" : "size-3.5"} />
                ) : current ? (
                  <span className="size-2 rounded-full bg-current" />
                ) : (
                  <Circle className={size === "lg" ? "size-3" : "size-2.5"} />
                )}
              </span>
              {label}
            </span>
            {i < stages.length - 1 && (
              <span className="h-px w-2 bg-border sm:w-3" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
