"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { 
  Bot, Plus, User, MoreVertical, Sparkles, Layout, CornerDownRight, Smile, Paperclip, FileImage, Download 
} from "lucide-react";
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
      void apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`).then(setDetail).catch(() => { });
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
    <div className="flex flex-col gap-4 pb-24">
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
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border",
                active 
                  ? "bg-[#F3F0FF] text-[#866BE3] border-[#866BE3]/20" 
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 && filter === "all" && !q ? (
        <EmptyState
          title="No conversations"
          description="Connect WhatsApp and wait for patient messages, or send an approved template."
        />
      ) : (
        <div className="grid h-[65vh] min-h-[500px] mb-20 overflow-hidden rounded-xl border bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)_380px]">
          {/* Conversation List */}
          <aside className="border-r border-gray-100 flex flex-col bg-[#FAFAFA] h-full min-h-0 overflow-hidden">
            <div className="px-4 pt-4 pb-3 flex items-center gap-2">
              <h3 className="font-bold text-lg text-gray-900">Messages</h3>
              <span className="rounded-md bg-white border border-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                {rows.length}
              </span>
            </div>
            <div className="px-4 pb-4">
              <Input
                className="w-full bg-white border-gray-200"
                placeholder="Search name or phone"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadList();
                }}
              />
            </div>
            <ul className="flex-1 overflow-y-auto pb-2">
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
                        "flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left transition-colors",
                        active ? "bg-[#F3F0FF]/30" : "bg-white hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#866BE3] text-sm font-bold text-white shadow-sm">
                          {row.patient?.initials ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="truncate font-semibold text-sm text-gray-900">{name}</span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {new Date(row.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="truncate text-xs text-gray-500 pr-2">{row.lastMessage?.preview ?? "No messages"}</p>
                            {row.unreadCount > 0 && (
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#866BE3] text-[10px] font-bold text-white">
                                {row.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 flex-wrap">
                              <span className="rounded-full bg-[#F3F0FF] px-2 py-0.5 text-[10px] font-semibold text-[#866BE3] border border-[#866BE3]/10">
                                {row.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              {row.automation && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-100">
                                  Auto
                               </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                              {row.assignedStaff?.name ?? "Clinic admin"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="relative flex h-full min-h-0 flex-col border-r border-gray-100 bg-[#FAFAFA]/40 overflow-hidden">
            {detailLoading ? (
              <div className="p-4">
                <LoadingRows rows={4} />
              </div>
            ) : !detail ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400">Select a conversation.</p>
              </div>
            ) : (
              <>
                <header className="border-b border-gray-100 px-6 py-4 bg-white flex flex-col gap-4">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="size-11 shrink-0 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                           <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full size-4 flex items-center justify-center border-2 border-white text-white">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-gray-900 text-[15px]">
                            {detail.patient ? `${detail.patient.firstName} ${detail.patient.lastName}` : "Unmatched contact"}
                          </h2>
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {detail.patient?.phone ?? "No phone"} · {detail.clinicName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="sm" className="rounded-full h-8 px-3.5 text-xs font-semibold text-gray-600 border-gray-200">
                         <Bot className="size-3.5 mr-1.5" />
                         Automation
                       </Button>
                       <Button size="icon" className="rounded-full size-8 bg-[#866BE3] hover:bg-[#7254d1] text-white shadow-sm">
                         <Plus className="size-4" />
                       </Button>
                       <Button size="icon" variant="outline" className="rounded-full size-8 border-gray-200">
                         <User className="size-4 text-gray-500" />
                       </Button>
                       <Button size="icon" variant="ghost" className="rounded-full size-8">
                         <MoreVertical className="size-4 text-gray-400" />
                       </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full">
                    <div className="flex gap-2">
                      <span className="rounded-full bg-[#F3F0FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#866BE3] border border-[#866BE3]/10 tracking-wide">
                        {detail.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 tracking-wide">
                        {detail.automation ? "Auto" : "Manual"}
                      </span>
                    </div>
                    
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 tracking-wide">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      AI Live
                    </span>
                  </div>
                </header>

                <div
                  ref={messagesContainerRef}
                  onScroll={() => {
                    if (isNearBottom()) {
                      setHasNewMessageBelow(false);
                    }
                  }}
                  className="flex-1 space-y-4 overflow-y-auto bg-[#FAFAFA] p-6 pb-8"
                >
                  <div className="text-center text-[10px] text-gray-400 font-medium mb-6">Today 2:20pm</div>
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[70%] text-[15px] transition-all duration-150 animate-in fade-in slide-in-from-bottom-1",
                        m.direction === "INBOUND"
                          ? "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3"
                          : "ml-auto bg-[#866BE3] text-white shadow-sm rounded-2xl rounded-tr-sm px-4 py-3",
                      )}
                    >
                      {m.media ? (
                        <div className="my-1.5">
                          <MediaBubble media={m.media} isOutbound={m.direction === "OUTBOUND"} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      )}
                      
                      <p className={cn(
                        "mt-1 flex items-center justify-end gap-1.5 text-[9px] font-medium",
                        m.direction === "INBOUND" ? "text-gray-400" : "text-white/70"
                      )}>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {m.direction === "OUTBOUND" &&
                          (m.status === "FAILED" || m.media?.status === "FAILED") ? (
                          <button
                            type="button"
                            className="font-semibold text-rose-200 underline"
                            onClick={() => void retryMedia(m.id)}
                          >
                            Retry
                          </button>
                        ) : null}
                      </p>
                    </div>
                  ))}
                  <div className="text-center text-[10px] text-gray-400 font-medium my-6">2:35 pm</div>
                  <div className="max-w-[70%] ml-auto text-[15px] bg-[#866BE3] text-white shadow-sm rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="whitespace-pre-wrap leading-relaxed">Sure thing, I'll have a look today.</p>
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[70%] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1.5 rounded-lg">
                        <FileImage className="size-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Report</p>
                        <p className="text-xs text-gray-500">1.2 MB</p>
                      </div>
                    </div>
                    <Download className="size-5 text-[#866BE3]" />
                  </div>
                  <div className="max-w-[70%] ml-auto text-[15px] bg-[#866BE3] text-white shadow-sm rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="whitespace-pre-wrap leading-relaxed">They're looking great!</p>
                  </div>
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
                  <div className="bg-white pt-2 border-t border-gray-100">
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
                  </div>
                ) : null}
              </>
            )}
          </section>

          <aside className="border-l border-gray-100 flex flex-col bg-[#FAFAFA] h-full min-h-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-[15px]">
                Ask Smrko AI <Sparkles className="size-4 text-[#866BE3]" />
              </h3>
              <Button size="icon" variant="ghost" className="size-7 text-gray-400">
                <Layout className="size-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div className="text-center text-[10px] text-gray-400 font-medium">Today 2:20pm</div>
              
              <div className="text-[14px] text-gray-800 leading-relaxed max-w-[90%]">
                Hey Olivia, can you please review the latest report when you can?
              </div>
              
              <div className="text-center text-[10px] text-gray-400 font-medium">2:35 pm</div>
              
              <div className="flex flex-col items-end gap-2 w-full">
                <div className="bg-[#F3F0FF] text-gray-800 rounded-xl rounded-tr-sm p-3 text-[14px] max-w-[95%] border border-[#866BE3]/10 shadow-sm">
                  <div className="bg-[#E9E5F5] text-gray-600 text-[13px] px-2 py-1.5 rounded mb-2 border-l-2 border-[#866BE3]">
                    Sure thing, I'll have a look today.
                  </div>
                  Sure thing, I'll have a look today.
                </div>
              </div>
              
              <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm max-w-[95%]">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <FileImage className="size-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Report</p>
                    <p className="text-xs text-gray-500">1.2 MB</p>
                  </div>
                </div>
                <Download className="size-4 text-[#866BE3]" />
              </div>
              
              <div className="flex justify-end w-full">
                 <div className="bg-white border border-gray-100 rounded-xl rounded-tr-sm px-4 py-2.5 text-[14px] text-gray-800 shadow-sm max-w-[85%]">
                   They're looking great!
                 </div>
              </div>
              
              <div className="flex gap-1.5 items-center bg-white border border-gray-100 w-fit px-3 py-1.5 rounded-full shadow-sm text-gray-400">
                <span className="size-1 bg-gray-400 rounded-full" />
                <span className="size-1 bg-gray-400 rounded-full" />
                <span className="size-1 bg-gray-400 rounded-full" />
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm focus-within:border-[#866BE3]/40 focus-within:ring-2 focus-within:ring-[#866BE3]/10 transition-all">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F3F0FF]/50 border-b border-gray-100 text-xs text-gray-600 font-medium">
                  <CornerDownRight className="size-3.5 text-[#866BE3]" /> Report.jpg
                </div>
                <div className="flex flex-col p-2 bg-white">
                  <input type="text" placeholder="Send a message" className="w-full bg-transparent border-none focus:outline-none text-[15px] px-2 py-3 text-gray-800 placeholder:text-gray-400" />
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    <Button size="icon" variant="ghost" className="size-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"><Smile className="size-[18px]" /></Button>
                    <Button size="icon" variant="ghost" className="size-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"><Paperclip className="size-[18px]" /></Button>
                    <Button size="sm" className="rounded-full h-8 px-4 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 font-semibold ml-2 shadow-sm transition-colors">Send</Button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
