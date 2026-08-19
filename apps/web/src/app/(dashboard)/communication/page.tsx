"use client";

import { Bot, MessageCircle, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WhatsAppThread, VoiceCallPanel, conversationFor, type ChatMessage } from "@/components/whatsapp-thread";
import { Avatar, PageHeader, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { couples, coupleLabel } from "@/lib/demo-data";
import { apiGet } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

type ConversationRow = {
  id: string;
  unmatched: boolean;
  contactState: string;
  contactPhone: string | null;
  patient: { id: string; firstName: string; lastName: string } | null;
  lastMessage: { preview: string; createdAt: string; direction: string } | null;
};

type ConversationDetail = {
  messages: Array<{
    id: string;
    direction: string;
    content: string;
    createdAt: string;
    status: string;
  }>;
};

export default function CommunicationPage() {
  const [live, setLive] = useState<ConversationRow[] | null>(null);
  const [activeId, setActiveId] = useState(couples[0]!.id);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[] | null>(null);
  const usingLive = Boolean(live && live.length > 0);
  const activeLive = live?.find((row) => row.id === activeId) ?? live?.[0];
  const activeDemo = couples.find((c) => c.id === activeId) ?? couples[0]!;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rows = await apiGet<ConversationRow[]>("/api/v1/integrations/whatsapp/conversations");
        if (cancelled) return;
        setLive(rows);
        if (rows[0]) setActiveId(rows[0].id);
      } catch {
        if (!cancelled) setLive([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!usingLive) return;
    let cancelled = false;
    async function load() {
      try {
        const detail = await apiGet<ConversationDetail>(`/api/v1/integrations/whatsapp/conversations/${activeId}`);
        if (cancelled) return;
        setLiveMessages(
          detail.messages.map((row) => ({
            from: row.direction === "INBOUND" ? "patient" : "loop",
            text: row.content,
            time: new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })),
        );
      } catch {
        if (!cancelled) setLiveMessages([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeId, usingLive]);

  const title = usingLive
    ? activeLive?.patient
      ? `${activeLive.patient.firstName} ${activeLive.patient.lastName}`
      : activeLive?.contactPhone ?? "Unmatched contact"
    : coupleLabel(activeDemo);

  const list = useMemo(() => live ?? [], [live]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Communication"
        subtitle="WhatsApp conversations belong to this clinic. Unknown numbers stay unmatched until staff associate them."
      />

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <section className="surface-card p-3">
          <SectionHeading title="Conversations" subtitle="WhatsApp channel" icon={MessageCircle} />
          <ul className="space-y-1.5">
            {usingLive
              ? list.map((row) => {
                  const name = row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : row.contactPhone ?? "Unknown";
                  return (
                    <li key={row.id}>
                      <button
                        onClick={() => setActiveId(row.id)}
                        className={cn(
                          "grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                          row.id === activeId ? "border-primary bg-primary-soft" : "hover:bg-accent",
                        )}
                      >
                        <Avatar initials={initials(name)} tone={row.id === activeId ? "primary" : "muted"} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.unmatched ? "UNMATCHED_CONTACT" : "WhatsApp"}
                            {row.lastMessage ? ` · ${row.lastMessage.preview}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              : couples.map((c) => (
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

        <WhatsAppThread
          messages={usingLive ? liveMessages ?? [] : conversationFor(activeDemo.id)}
          patientName={title}
        />

        <div className="space-y-4">
          <VoiceCallPanel patient={title} />
          <section className="surface-card p-4">
            <SectionHeading title="Channel" subtitle="Conversation source" icon={Bot} tone="purple" />
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label="Channel: WhatsApp" tone="success" />
              <StatusBadge label={usingLive && activeLive?.unmatched ? "UNMATCHED_CONTACT" : "Active"} tone={usingLive && activeLive?.unmatched ? "warning" : "muted"} />
            </div>
          </section>
          <section className="surface-card p-4">
            <SectionHeading title="Channels" subtitle="How patients respond" icon={Phone} tone="teal" />
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">WhatsApp</span>
                <span className="font-semibold">Live</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
