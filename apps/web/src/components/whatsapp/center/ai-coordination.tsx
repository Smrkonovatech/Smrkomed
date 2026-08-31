"use client";

import { Bot, Stethoscope, UserRound } from "lucide-react";

import { WaSection } from "@/components/whatsapp/center/section";

/** Visual model: AI coordinates routine → staff exceptions → doctor clinical decisions */
export function AiCoordinationPanel() {
  return (
    <WaSection
      title="Smrko AI coordination"
      subtitle="AI handles routine. Staff handle exceptions. Doctors handle clinical decisions."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-primary-soft/40 p-4">
          <Bot className="size-4 text-primary" />
          <p className="mt-2 text-sm font-semibold">Routine request</p>
          <p className="mt-1 text-xs text-muted-foreground">
            FAQs, reminders, document collection, confirmations — from clinic-approved knowledge only.
          </p>
          <p className="mt-3 text-[11px] font-medium text-primary">→ Smrko AI</p>
        </div>
        <div className="rounded-xl border border-orange-200/80 bg-orange-50/60 p-4">
          <UserRound className="size-4 text-orange-700" />
          <p className="mt-2 text-sm font-semibold">Exception</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No response, unclear reply, failed delivery, or handoff request.
          </p>
          <p className="mt-3 text-[11px] font-medium text-orange-800">→ Care Coordinator</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
          <Stethoscope className="size-4 text-foreground" />
          <p className="mt-2 text-sm font-semibold">Clinical decision</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Treatment changes, diagnosis, prescribing — never automated by AI.
          </p>
          <p className="mt-3 text-[11px] font-medium">→ Doctor</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        <li className="rounded-lg bg-muted/50 px-2.5 py-1.5">AI can: answer approved FAQs, collect info, escalate</li>
        <li className="rounded-lg bg-muted/50 px-2.5 py-1.5">AI cannot: diagnose, prescribe, change treatment</li>
      </ul>
    </WaSection>
  );
}
