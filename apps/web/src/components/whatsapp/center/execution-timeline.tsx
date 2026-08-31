"use client";

import { cn } from "@/lib/utils";

export function ExecutionTimeline({
  items,
}: {
  items: Array<{ time: string; title: string; detail?: string }>;
}) {
  return (
    <ol className="relative space-y-0 border-l border-border/80 ml-2">
      {items.map((item, index) => (
        <li key={`${item.time}-${item.title}-${index}`} className="relative pb-4 pl-5 last:pb-0">
          <span
            className={cn(
              "absolute top-1.5 -left-[5px] size-2.5 rounded-full border-2 border-card",
              index === items.length - 1 ? "bg-primary" : "bg-muted-foreground/40",
            )}
          />
          <p className="text-[11px] font-medium text-muted-foreground tabular-nums">{item.time}</p>
          <p className="text-sm font-semibold">{item.title}</p>
          {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}
