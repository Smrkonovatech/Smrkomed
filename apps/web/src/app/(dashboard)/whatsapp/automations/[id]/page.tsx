"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ExecutionTimeline } from "@/components/whatsapp/center/execution-timeline";
import { WaSection, WaStatusPill } from "@/components/whatsapp/center/section";
import { Button } from "@/components/ui/button";
import { DEMO_AUTOMATIONS, DEMO_EXECUTION_TIMELINE } from "@/lib/whatsapp/center-demo";

const EXECUTIONS = [
  { couple: "Priya + Rahul", date: "Today 9:00 AM", result: "Completed" },
  { couple: "Anjali + Arjun", date: "Today 9:00 AM", result: "No response" },
  { couple: "Meera + Vivek", date: "Yesterday", result: "Escalated" },
];

export default function WhatsAppAutomationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const automation = DEMO_AUTOMATIONS.find((a) => a.id === id) ?? DEMO_AUTOMATIONS[0]!;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight">{automation.name}</h2>
            <WaStatusPill
              label={automation.status}
              tone={automation.status === "Needs Attention" ? "warning" : "success"}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Reminds patients about doctor-approved medication and care instructions. AI never diagnoses or
            prescribes.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/whatsapp/automations">Back</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WaSection title="Trigger" subtitle="When should this workflow start?">
          <p className="text-sm font-medium">{automation.trigger}</p>
        </WaSection>
        <WaSection title="Workflow" subtitle="What should SmrkoMed do?">
          <ol className="space-y-2 text-sm">
            {[
              "Medication scheduled",
              "Wait until reminder time",
              "Send WhatsApp",
              "Patient responds?",
              "Yes → Mark interaction complete",
              "No → Reminder",
              "Still no response? → Create Care Loop exception",
            ].map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </WaSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WaSection title="Execution history">
          <ul className="divide-y divide-border/60">
            {EXECUTIONS.map((row) => (
              <li key={row.couple} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold">{row.couple}</p>
                  <p className="text-xs text-muted-foreground">{row.date}</p>
                </div>
                <WaStatusPill
                  label={row.result}
                  tone={
                    row.result === "Completed"
                      ? "success"
                      : row.result === "Escalated"
                        ? "danger"
                        : "warning"
                  }
                />
              </li>
            ))}
          </ul>
        </WaSection>
        <WaSection title="Execution timeline" subtitle="Audit trail for a sample run">
          <ExecutionTimeline items={DEMO_EXECUTION_TIMELINE} />
        </WaSection>
      </div>

      <Button asChild className="rounded-xl">
        <Link href="/whatsapp/flows">Open related flow</Link>
      </Button>
    </div>
  );
}
