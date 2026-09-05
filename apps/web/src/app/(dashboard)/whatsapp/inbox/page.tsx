"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { MediaBubble } from "@/components/whatsapp/media-bubble";
import { ChatComposer } from "@/components/whatsapp/chat-composer";
import {
  useRealtimeInbox,
  type RealtimeConversationUpdatedPayload,
  type RealtimeMedia,
  type RealtimeMessageCreatedPayload,
  type RealtimeMessageMediaUpdatedPayload,
  type RealtimeMessageStatusPayload,
  type RealtimeTypingPayload,
} from "@/lib/realtime/use-realtime-inbox";
import { cn } from "@/lib/utils";

type InboxRow = {
  id: string;
  status: string;
  priority: string;
  unmatched: boolean;
  contactPhone: string | null;
  patient: { id: string; firstName: string; lastName: string; initials: string; status: string } | null;
  assignedStaff: { id: string; name: string; initials?: string | null; title?: string | null } | null;
  unreadCount: number;
  automationPaused: boolean;
  handoffReason: string | null;
  automation: {
    executionId: string;
    flowId: string;
    flowName: string;
    status: string;
    resumeAt: string | null;
  } | null;
  lastMessage: {
    preview: string;
    createdAt: string;
    direction: string;
    senderType: string;
  } | null;
  updatedAt: string;
};

type Detail = {
  id: string;
  status: string;
  priority: string;
  handoffReason: string | null;
  automationPausedAt: string | null;
  aiPausedAt?: string | null;
  assignedStaff: { id: string; name: string } | null;
  patient: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  clinicName: string;
  messages: Array<{
    id: string;
    direction: string;
    senderType: string;
    content: string;
    messageType?: string;
    createdAt: string;
    status: string;
    label: string;
    media?: RealtimeMedia | null;
  }>;
  automation: {
    executionId: string;
    flowId: string;
    flowName: string;
    status: string;
    resumeAt: string | null;
  } | null;
};

type Context = {
  patient: { id: string; firstName: string; lastName: string; phone: string | null; status: string } | null;
  couple: {
    slug: string;
    doctor: { name: string } | null;
    coordinator: { name: string } | null;
  } | null;
  upcomingAppointment: { type: string; startsAt: string; doctorName: string | null } | null;
  overdueTaskCount: number;
  recentTasks: Array<{ id: string; title: string; status: string }>;
  payments: Array<{ invoiceNumber: string; status: string; balance: number }>;
  pharmacy: { items: Array<{ medicineName: string; dosage: string | null }> } | null;
  automations: Array<{ id: string; flowName: string; status: string }>;
  note?: string;
};

type Staff = { id: string; name: string; role: string };

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "assigned_to_me", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "waiting_patient", label: "Waiting patient" },
  { id: "waiting_staff", label: "Waiting staff" },
  { id: "automation_active", label: "Automation" },
  { id: "human_handoff", label: "Human handoff" },
  { id: "escalated", label: "Escalated" },
  { id: "closed", label: "Closed" },
];

function labelTone(status: string) {
  if (status === "HUMAN_HANDOFF" || status === "ESCALATED") return "warning" as const;
  if (status === "CLOSED" || status === "RESOLVED") return "muted" as const;
  return "info" as const;
}

function renderDeliveryStatus(status: string) {
  if (status === "READ") {
    return <span className="font-semibold text-primary">✓✓ Read</span>;
  }
  if (status === "DELIVERED") {
    return <span>✓✓ Delivered</span>;
  }
  if (status === "SENT") {
    return <span>✓ Sent</span>;
  }
  if (status === "FAILED") {
    return <span className="font-medium text-destructive">⚠ Failed</span>;
  }
  return <span>{status}</span>;
}

export default function WhatsAppInboxPage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);

  // Scroll & Realtime UX state
  const [hasNewMessageBelow, setHasNewMessageBelow] = useState(false);
  const [typingStaff, setTypingStaff] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 120;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setHasNewMessageBelow(false);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter });
      if (q.trim()) params.set("q", q.trim());
      const next = await apiGet<InboxRow[]>(`/api/v1/whatsapp-automation/inbox?${params}`);
      setRows(next);
      if (!activeId && next[0]) setActiveId(next[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load inbox.");
    } finally {
      setLoading(false);
    }
  }, [filter, q, activeId]);

  useEffect(() => {
    void loadList();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void apiGet<Staff[]>("/api/v1/whatsapp-automation/staff")
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      setContext(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const [d, ctx] = await Promise.all([
          apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`),
          apiGet<Context>(`/api/v1/whatsapp-automation/inbox/${activeId}/context`).catch(() => null),
        ]);
        if (!cancelled) {
          setDetail(d);
          setContext(ctx);
          // Mark conversation as read locally in rows
          setRows((prev) =>
            prev.map((r) => (r.id === activeId ? { ...r, unreadCount: 0 } : r)),
          );
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load conversation");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, scrollToBottom]);

  // Real-time Event Callbacks
  const onMessageCreated = useCallback(
    (payload: RealtimeMessageCreatedPayload) => {
      // 1. If currently viewing this conversation, append new message deduplicated by ID
      if (activeId && payload.conversationId === activeId) {
        const nearBottom = isNearBottom();
        setDetail((prev) => {
          if (!prev || prev.id !== payload.conversationId) return prev;
          // Deduplication: message must never appear twice
          if (prev.messages.some((m) => m.id === payload.message.id)) return prev;

          const newMsg = {
            id: payload.message.id,
            direction: payload.message.direction,
            senderType: payload.message.senderType,
            content: payload.message.content,
            messageType: payload.message.messageType,
            createdAt: payload.message.createdAt,
            status: payload.message.status,
            label: payload.message.label ?? (payload.message.direction === "INBOUND" ? "PATIENT" : "STAFF"),
            media: payload.message.media ?? null,
          };
          return { ...prev, messages: [...prev.messages, newMsg] };
        });

        if (nearBottom) {
          setTimeout(() => scrollToBottom(true), 60);
        } else {
          setHasNewMessageBelow(true);
        }
      } else {
        // Message arrived for another conversation: show subtle toast notification
        const senderName = payload.conversation?.patient
          ? `${payload.conversation.patient.firstName} ${payload.conversation.patient.lastName}`.trim()
          : payload.conversation?.contactPhone ?? "Patient";
        toast.info(`New message from ${senderName}`, {
          description: payload.message.content.slice(0, 50),
          action: {
            label: "View",
            onClick: () => setActiveId(payload.conversationId),
          },
        });
      }

      // 2. Update conversation list: move to top and update preview + unread count
      setRows((prev) => {
        const existingIdx = prev.findIndex((r) => r.id === payload.conversationId);
        const isCurrentActive = activeId === payload.conversationId;

        if (existingIdx >= 0) {
          const existing = prev[existingIdx]!;
          const updated: InboxRow = {
            ...existing,
            updatedAt: payload.message.createdAt,
            unreadCount: isCurrentActive ? 0 : existing.unreadCount + 1,
            lastMessage: {
              preview: payload.message.content.slice(0, 100),
              createdAt: payload.message.createdAt,
              direction: payload.message.direction,
              senderType: payload.message.senderType,
            },
            ...(payload.conversation?.status ? { status: payload.conversation.status } : {}),
          };
          return [updated, ...prev.slice(0, existingIdx), ...prev.slice(existingIdx + 1)];
        } else if (payload.conversation) {
          // Brand new inbound conversation
          const initials = payload.conversation.patient
            ? `${payload.conversation.patient.firstName.charAt(0)}${payload.conversation.patient.lastName.charAt(0)}`.toUpperCase() || "?"
            : "?";
          const newRow: InboxRow = {
            id: payload.conversation.id,
            status: payload.conversation.status,
            priority: "NORMAL",
            unmatched: !payload.conversation.patient,
            contactPhone: payload.conversation.contactPhone ?? null,
            patient: payload.conversation.patient
              ? {
                  id: payload.conversation.patient.id,
                  firstName: payload.conversation.patient.firstName,
                  lastName: payload.conversation.patient.lastName,
                  initials,
                  status: "ACTIVE",
                }
              : null,
            assignedStaff: null,
            unreadCount: 1,
            automationPaused: false,
            handoffReason: null,
            automation: null,
            lastMessage: {
              preview: payload.message.content.slice(0, 100),
              createdAt: payload.message.createdAt,
              direction: payload.message.direction,
              senderType: payload.message.senderType,
            },
            updatedAt: payload.conversation.updatedAt,
          };
          return [newRow, ...prev];
        }
        return prev;
      });
    },
    [activeId, isNearBottom, scrollToBottom],
  );

  const onMessageStatusUpdated = useCallback((payload: RealtimeMessageStatusPayload) => {
    setDetail((prev) => {
      if (!prev) return prev;
      let matched = false;
      const nextMessages = prev.messages.map((m) => {
        if (m.id === payload.messageId || (payload.providerMessageId && m.id === payload.providerMessageId)) {
          matched = true;
          return { ...m, status: payload.status };
        }
        return m;
      });
      return matched ? { ...prev, messages: nextMessages } : prev;
    });
  }, []);

  const onMessageMediaUpdated = useCallback(
    (payload: RealtimeMessageMediaUpdatedPayload) => {
      if (activeId && payload.conversationId === activeId) {
        setDetail((prev) => {
          if (!prev || prev.id !== payload.conversationId) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    media: payload.media,
                  }
                : m,
            ),
          };
        });
      }
    },
    [activeId],
  );

  const onConversationUpdated = useCallback(
    (payload: RealtimeConversationUpdatedPayload) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id === payload.conversationId) {
            return {
              ...r,
              ...(payload.patch.status ? { status: payload.patch.status } : {}),
              ...(payload.patch.priority ? { priority: payload.patch.priority } : {}),
              ...(payload.patch.assignedStaff !== undefined ? { assignedStaff: payload.patch.assignedStaff } : {}),
              ...(payload.patch.automationPaused !== undefined ? { automationPaused: payload.patch.automationPaused } : {}),
              ...(payload.patch.unreadCount !== undefined ? { unreadCount: payload.patch.unreadCount } : {}),
              ...(payload.patch.updatedAt ? { updatedAt: payload.patch.updatedAt } : {}),
              ...(payload.patch.lastMessage
                ? {
                    lastMessage: {
                      preview: payload.patch.lastMessage.preview,
                      createdAt: payload.patch.lastMessage.createdAt,
                      direction: payload.patch.lastMessage.direction,
                      senderType: payload.patch.lastMessage.senderType,
                    },
                  }
                : {}),
            };
          }
          return r;
        }),
      );

      if (activeId === payload.conversationId) {
        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(payload.patch.status ? { status: payload.patch.status } : {}),
            ...(payload.patch.priority ? { priority: payload.patch.priority } : {}),
            ...(payload.patch.assignedStaff !== undefined ? { assignedStaff: payload.patch.assignedStaff } : {}),
            ...(payload.patch.automationPaused !== undefined
              ? { automationPausedAt: payload.patch.automationPaused ? new Date().toISOString() : null }
              : {}),
          };
        });
      }
    },
    [activeId],
  );

  const onTyping = useCallback(
    (payload: RealtimeTypingPayload) => {
      if (activeId && payload.conversationId === activeId) {
        if (payload.type === "TYPING_STARTED") {
          setTypingStaff(payload.userName);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingStaff(null), 3500);
        } else {
          setTypingStaff(null);
        }
      }
    },
    [activeId],
  );

  const onReconnected = useCallback(() => {
    void loadList();
    if (activeId) {
      void apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`).then(setDetail).catch(() => {});
    }
  }, [activeId, loadList]);

  // Hook connection
  const { isConnected, isReconnecting, notifyTyping } = useRealtimeInbox({
    onMessageCreated,
    onMessageStatusUpdated,
    onMessageMediaUpdated,
    onConversationUpdated,
    onTyping,
    onReconnected,
  });

  async function retryMedia(messageId: string) {
    if (!activeId) return;
    try {
      await apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/messages/${messageId}/retry`, {});
      toast.success("Retry sent");
      const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
      setDetail(d);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Retry failed");
    }
  }

  async function takeover() {
    if (!activeId) return;
    try {
      await apiPost(`/api/v1/whatsapp-automation/conversations/${activeId}/takeover`, {
        reason: "PATIENT_REQUESTED_HUMAN",
        pauseAutomation: true,
      });
      toast.success("Human takeover");
      const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
      setDetail(d);
      await loadList();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Takeover failed");
    }
  }

  async function assign(staffId: string | null) {
    if (!activeId) return;
    try {
      await apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/assign`, { assignedStaffId: staffId });
      toast.success(staffId ? "Assigned" : "Unassigned");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Assign failed");
    }
  }

  async function createFollowUp() {
    if (!activeId) return;
    try {
      await apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/follow-up`, {
        title: "WhatsApp follow-up",
        notes: "Created from Inbox",
        priority: "NORMAL",
      });
      toast.success("Care task created");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Follow-up failed");
    }
  }

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Inbox" subtitle="Clinic WhatsApp conversations." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load inbox."
        description={error}
        action={<Button onClick={() => void loadList()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        subtitle="Operational patient communication console with real-time Meta WhatsApp sync."
        actions={
          <div className="flex items-center gap-2.5">
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
            <Button asChild variant="outline" size="sm">
              <Link href="/whatsapp/templates">Templates</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f.id ? "bg-primary-soft text-primary font-semibold" : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f.label}
          </button>
        ))}
        <Input
          className="ml-auto max-w-xs"
          placeholder="Search name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void loadList();
          }}
        />
        <Button size="sm" variant="outline" onClick={() => void loadList()}>
          Search
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No conversations"
          description="Connect WhatsApp and wait for patient messages, or send an approved template."
        />
      ) : (
        <div className="grid min-h-[65vh] overflow-hidden rounded-xl border lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="max-h-[70vh] overflow-y-auto border-b lg:border-r lg:border-b-0">
            <ul>
              {rows.map((row) => {
                const active = row.id === activeId;
                const name = row.patient
                  ? `${row.patient.firstName} ${row.patient.lastName}`.trim()
                  : (row.contactPhone ?? "Unknown");
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(row.id)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 border-b px-3 py-3 text-left text-sm transition-colors",
                        active ? "bg-primary-soft" : "hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                            {row.patient?.initials ?? "?"}
                          </span>
                          <span className="truncate">{name}</span>
                        </span>
                        {row.unreadCount > 0 ? (
                          <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-semibold text-primary-foreground">
                            {row.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{row.lastMessage?.preview ?? "No messages"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <StatusBadge label={row.status} tone={labelTone(row.status)} />
                        {row.automation ? <StatusBadge label="Automation" tone="info" /> : null}
                        {row.assignedStaff ? (
                          <span className="text-[10px] text-muted-foreground">{row.assignedStaff.name}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="relative flex max-h-[70vh] flex-col border-b lg:border-b-0 lg:border-r">
            {detailLoading ? (
              <div className="p-4">
                <LoadingRows rows={4} />
              </div>
            ) : !detail ? (
              <p className="p-4 text-sm text-muted-foreground">Select a conversation.</p>
            ) : (
              <>
                <header className="space-y-2 border-b px-4 py-3 bg-card/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-base">
                        {detail.patient
                          ? `${detail.patient.firstName} ${detail.patient.lastName}`
                          : "Unmatched contact"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detail.patient?.phone ?? "No phone"} · {detail.clinicName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge label={detail.status} tone={labelTone(detail.status)} />
                        {detail.automationPausedAt ? <StatusBadge label="Automation paused" tone="warning" /> : null}
                        {detail.aiPausedAt ? <StatusBadge label="AI paused" tone="warning" /> : null}
                        {detail.automation ? (
                          <StatusBadge label={`${detail.automation.flowName}: ${detail.automation.status}`} tone="info" />
                        ) : (
                          <StatusBadge label="Manual" tone="muted" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="lg:hidden" onClick={() => setShowContext(true)}>
                        Patient
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => void takeover()}>
                        Take over
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void createFollowUp()}>
                        Follow-up
                      </Button>
                      {detail.automationPausedAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/resume-automation`, {}).then(
                              () => toast.success("Automation resumed"),
                            )
                          }
                        >
                          Resume automation
                        </Button>
                      ) : null}
                      {detail.aiPausedAt || detail.status === "HUMAN_HANDOFF" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/ai/resume`, {}).then(() => {
                              toast.success("AI resumed");
                              return apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`).then(setDetail);
                            })
                          }
                        >
                          Resume AI
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() =>
                          void apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/ai/reply`, {
                            mode: "send",
                          })
                            .then(async (res) => {
                              const r = res as { skipped?: boolean; reason?: string; messageId?: string };
                              if (r.skipped) {
                                toast.error(r.reason || "AI did not send a reply");
                              } else {
                                toast.success("Smrko AI reply sent to WhatsApp");
                              }
                              const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
                              setDetail(d);
                              scrollToBottom(true);
                            })
                            .catch((err) =>
                              toast.error(err instanceof ApiError ? err.message : "AI reply failed"),
                            )
                        }
                      >
                        Send AI reply now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/ai/reply`, {
                            mode: "draft",
                          }).then(() => {
                            toast.success("AI draft ready");
                            return apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`).then(setDetail);
                          })
                        }
                      >
                        Ask Smrko AI
                      </Button>
                      {!detail.automationPausedAt ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/pause-automation`, {}).then(
                              () => toast.success("Automation paused"),
                            )
                          }
                        >
                          Pause automation
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Assign:</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2"
                      value={detail.assignedStaff?.id ?? ""}
                      onChange={(e) => void assign(e.target.value || null)}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void apiPatch(`/api/v1/whatsapp-automation/inbox/${activeId}/status`, {
                          status: "CLOSED",
                        }).then(() => {
                          toast.success("Closed");
                          void loadList();
                        })
                      }
                    >
                      Close
                    </Button>
                  </div>
                </header>

                <div
                  ref={messagesContainerRef}
                  onScroll={() => {
                    if (isNearBottom()) {
                      setHasNewMessageBelow(false);
                    }
                  }}
                  className="flex-1 space-y-2.5 overflow-y-auto bg-muted/20 p-4"
                >
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm transition-all duration-150 animate-in fade-in slide-in-from-bottom-1",
                        m.direction === "INBOUND"
                          ? "bg-card border"
                          : "ml-auto bg-primary/10 border border-primary/20",
                      )}
                    >
                      <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {m.label}
                      </p>
                      {m.media ? (
                        <div className="my-1.5">
                          <MediaBubble media={m.media} isOutbound={m.direction === "OUTBOUND"} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                      <p className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="flex items-center gap-2">
                          {m.direction === "INBOUND" ? "Received via WhatsApp" : renderDeliveryStatus(m.status)}
                          {m.direction === "OUTBOUND" &&
                          (m.status === "FAILED" || m.media?.status === "FAILED") ? (
                            <button
                              type="button"
                              className="font-semibold text-rose-700 underline"
                              onClick={() => void retryMedia(m.id)}
                            >
                              Retry
                            </button>
                          ) : null}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>

                {hasNewMessageBelow && (
                  <div className="absolute bottom-28 left-0 right-0 z-10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => scrollToBottom(true)}
                      className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      <span>1 new message</span>
                      <span>↓ Jump to latest</span>
                    </button>
                  </div>
                )}

                {typingStaff && (
                  <div className="border-t bg-muted/30 px-4 py-1.5 text-xs italic text-muted-foreground animate-in fade-in">
                    {typingStaff} is typing…
                  </div>
                )}

                {activeId ? (
                  <ChatComposer
                    conversationId={activeId}
                    {...(detail.patient?.id ? { patientId: detail.patient.id } : {})}
                    onTyping={() => notifyTyping(activeId)}
                    onSent={() => {
                      void (async () => {
                        const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
                        setDetail(d);
                        scrollToBottom(true);
                        await loadList();
                      })();
                    }}
                  />
                ) : null}
              </>
            )}
          </section>

          <aside
            className={cn(
              "max-h-[70vh] overflow-y-auto bg-card p-4",
              showContext ? "fixed inset-0 z-40 block bg-background p-4 lg:static" : "hidden lg:block",
            )}
          >
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <h2 className="text-sm font-semibold">Patient context</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowContext(false)}>
                Close
              </Button>
            </div>
            <h2 className="mb-3 hidden text-sm font-semibold lg:block">Patient context</h2>
            {!context?.patient ? (
              <p className="text-sm text-muted-foreground">{context?.note ?? "No linked patient."}</p>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="font-medium">
                  {context.patient.firstName} {context.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{context.patient.phone}</p>
                <p className="text-xs">Status: {context.patient.status}</p>
                {context.couple?.doctor ? <p className="text-xs">Doctor: {context.couple.doctor.name}</p> : null}
                {context.couple?.coordinator ? (
                  <p className="text-xs">Coordinator: {context.couple.coordinator.name}</p>
                ) : null}
                {context.upcomingAppointment ? (
                  <div className="rounded-lg border p-2 text-xs">
                    <p className="font-medium">Upcoming</p>
                    <p>
                      {context.upcomingAppointment.type} ·{" "}
                      {new Date(context.upcomingAppointment.startsAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No upcoming appointment</p>
                )}
                <p className="text-xs">Overdue tasks: {context.overdueTaskCount}</p>
                {context.payments.length ? (
                  <div className="text-xs">
                    <p className="font-medium">Payments</p>
                    {context.payments.map((p) => (
                      <p key={p.invoiceNumber}>
                        {p.invoiceNumber}: {p.status} (bal {p.balance})
                      </p>
                    ))}
                  </div>
                ) : null}
                {context.pharmacy?.items?.length ? (
                  <div className="text-xs">
                    <p className="font-medium">Pharmacy</p>
                    {context.pharmacy.items.map((i, idx) => (
                      <p key={idx}>
                        {i.medicineName} {i.dosage ?? ""}
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="text-xs">
                  <p className="font-medium">Automations</p>
                  {context.automations.length === 0 ? (
                    <p className="text-muted-foreground">None recent</p>
                  ) : (
                    context.automations.map((a) => (
                      <p key={a.id}>
                        {a.flowName}: {a.status}
                      </p>
                    ))
                  )}
                </div>
                {context.couple?.slug ? (
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/patients/${context.couple.slug}`}>Open patient</Link>
                  </Button>
                ) : null}
                {context.patient.id ? (
                  <Button asChild size="sm" variant="ghost" className="w-full">
                    <Link href={`/whatsapp/logs?patientId=${context.patient.id}`}>Timeline / logs</Link>
                  </Button>
                ) : null}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
