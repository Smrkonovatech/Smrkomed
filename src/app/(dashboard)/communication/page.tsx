"use client";

import { Bot, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";

import { WhatsAppThread, VoiceCallPanel, conversationFor } from "@/components/whatsapp-thread";
import { Avatar, PageHeader, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { couples, coupleLabel } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

export default function CommunicationPage() {
  const [activeId, setActiveId] = useState(couples[0]!.id);
  const active = couples.find((c) => c.id === activeId) ?? couples[0]!;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Communication"
        subtitle="Coordinator view of how Care Loop talks to patients. Doctors only see task, status, AI summary and action."
      />

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <section className="surface-card p-3">
          <SectionHeading title="Conversations" subtitle="Active patients" icon={MessageCircle} />
          <ul className="space-y-1.5">
            {couples.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                    c.id === activeId ? "border-primary bg-primary-soft" : "hover:bg-accent",
                  )}
                >
                  <Avatar
                    initials={initials(c.primary.name)}
                    tone={c.id === activeId ? "primary" : "muted"}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{coupleLabel(c)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.nextStep}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <WhatsAppThread messages={conversationFor(active.id)} patientName={active.primary.name} />

        <div className="space-y-4">
          <VoiceCallPanel patient={active.primary.name} />
          <section className="surface-card p-4">
            <SectionHeading
              title="AI summary"
              subtitle="Long chat, short answer"
              icon={Bot}
              tone="purple"
            />
            <p className="text-sm text-muted-foreground">
              Patient acknowledged the scan instructions, asked about fasting, and confirmed
              attendance. No clinical concern detected.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label="Intent: confirm appointment" tone="info" />
              <StatusBadge label="Sentiment: positive" tone="success" />
              <StatusBadge label="No escalation" tone="muted" />
            </div>
          </section>
          <section className="surface-card p-4">
            <SectionHeading
              title="Channels"
              subtitle="How patients respond"
              icon={Phone}
              tone="teal"
            />
            <ul className="space-y-2 text-sm">
              {[
                ["WhatsApp", "68%"],
                ["AI voice", "17%"],
                ["Staff call", "11%"],
                ["In-clinic", "4%"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold tabular-nums">{v}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
