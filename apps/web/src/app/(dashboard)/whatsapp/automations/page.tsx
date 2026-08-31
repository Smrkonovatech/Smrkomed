"use client";

import Link from "next/link";
import { useState } from "react";
import { Pause, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { PreviewBanner, WaSection, WaStatusPill } from "@/components/whatsapp/center/section";
import { Button } from "@/components/ui/button";
import { DEMO_AUTOMATIONS } from "@/lib/whatsapp/center-demo";
import { cn } from "@/lib/utils";

export default function WhatsAppAutomationsPage() {
  const [status, setStatus] = useState<"All" | "Running" | "Paused" | "Draft" | "Needs Attention">("All");

  const rows = DEMO_AUTOMATIONS.filter((a) => status === "All" || a.status === status);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Automations</h2>
          <p className="text-sm text-muted-foreground">
            Running Care Loop communication programs — pause, duplicate, or open the underlying flow.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/whatsapp/flows/new">Create from flow</Link>
        </Button>
      </div>

      <PreviewBanner />

      <div className="flex flex-wrap gap-1.5">
        {(["All", "Running", "Paused", "Draft", "Needs Attention"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
              status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <WaSection title="Automation library">
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{row.name}</p>
                  <WaStatusPill
                    label={row.status}
                    tone={row.status === "Needs Attention" ? "warning" : "success"}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Trigger: {row.trigger} · {row.patients.toLocaleString()} patients · {row.metric} · Last{" "}
                  {row.lastActivity}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-lg">
                  <Link href={`/whatsapp/automations/${row.id}`}>
                    Open <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => toast.message("Pause requested (preview)")}
                >
                  <Pause className="size-3.5" /> Pause
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-lg"
                  onClick={() => toast.message("Duplicated (preview)")}
                >
                  <Copy className="size-3.5" /> Duplicate
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </WaSection>
    </div>
  );
}
