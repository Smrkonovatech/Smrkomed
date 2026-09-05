"use client";

import { Bot, MessageCircle, Phone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { WhatsAppThread, VoiceCallPanel, conversationFor, type ChatMessage } from "@/components/whatsapp-thread";
import { Avatar, PageHeader, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { couples, coupleLabel } from "@/lib/demo-data";
import { apiGet } from "@/lib/api/client";
import { useRealtimeInbox, type RealtimeMessageCreatedPayload } from "@/lib/realtime/use-realtime-inbox";
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

  const loadConversations = useCallback(async () => {
    try {
      const rows = await apiGet<ConversationRow[]>("/api/v1/integrations/whatsapp/conversations");
      setLive(rows);
      if (rows[0] && !live) setActiveId(rows[0].id);
    } catch {
      setLive([]);
    }
  }, [live]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const detail = await apiGet<ConversationDetail>(`/api/v1/integrations/whatsapp/conversations/${convId}`);
      setLiveMessages(
        detail.messages.map((row) => ({
          from: row.direction === "INBOUND" ? "patient" : "loop",
          text: row.content,
          time: new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })),
      );
    } catch {
      setLiveMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!usingLive) return;
    void loadMessages(activeId);
  }, [activeId, usingLive, loadMessages]);

  const onMessageCreated = useCallback(
    (payload: RealtimeMessageCreatedPayload) => {
      if (payload.conversationId === activeId) {
        setLiveMessages((prev) => [
          ...(prev ?? []),
          {
            from: payload.message.direction === "INBOUND" ? "patient" : "loop",
            text: payload.message.content,
            time: new Date(payload.message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
      void loadConversations();
    },
    [activeId, loadConversations],
  );

  const { isConnected, isReconnecting } = useRealtimeInbox({
    onMessageCreated,
    onReconnected: () => {
      void loadConversations();
      if (usingLive) void loadMessages(activeId);
    },
  });

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
        actions={
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                title="Real-time communication connected"
              >
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            ) : isReconnecting ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
                title="Reconnecting to real-time events…"
              >
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                Reconnecting…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-2 rounded-full bg-muted-foreground/50" />
                Offline
              </span>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
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
