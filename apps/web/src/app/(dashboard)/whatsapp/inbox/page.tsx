"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { 
  Bot, Plus, User, MoreVertical, Sparkles, Layout, CornerDownRight, Smile, Paperclip, FileImage, Download,
  Calendar, Clock, CheckCircle2, Send, ChevronRight, ChevronDown, MessageSquare, AlertCircle, FileText, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { MediaBubble } from "@/components/whatsapp/media-bubble";
import { ChatComposer } from "@/components/whatsapp/chat-composer";
import { parseOrderMessage, WhatsAppOrderCard } from "@/components/whatsapp/whatsapp-order-card";
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

function formatMessageDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
  if (d.toDateString() === now.toDateString()) {
    return `Today ${timeStr}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${timeStr}`;
  }
  return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} ${timeStr}`;
}

function renderMessageContent(content: string, isOutbound: boolean) {
  const buttonMatches = [...content.matchAll(/\[([^\]]+)\]/g)];
  if (buttonMatches.length > 0 && buttonMatches[0]?.[0]) {
    const firstMatchIndex = content.indexOf(buttonMatches[0][0]);
    const body = content.substring(0, firstMatchIndex).trim();
    const buttons = buttonMatches.map((m) => (m[1] ?? "").trim()).filter(Boolean);

    return (
      <div className="space-y-2.5">
        {body && <p className="whitespace-pre-wrap leading-relaxed">{body}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {buttons.map((btn, i) => {
            const isDone = btn.toLowerCase().includes("done") || btn.includes("✓");
            const isHelp = btn.toLowerCase().includes("help") || btn.includes("?");
            return (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold shadow-xs border transition-colors cursor-pointer",
                  isOutbound
                    ? "bg-white/15 text-white border-white/30 hover:bg-white/25"
                    : isDone
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                      : isHelp
                        ? "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                )}
              >
                {btn}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
}

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
  couple?: {
    id: string;
    slug: string;
    status?: string;
    primaryPatient?: { id: string; firstName: string; lastName: string; phone: string | null } | null;
    partnerPatient?: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  } | null;
  partnerConversationId?: string | null;
  clinicName: string;
  contactPhone?: string | null;
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
  const [draftText, setDraftText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"ai" | "context">("ai");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Hello! I am Smrko AI, your clinical care assistant. I can analyze patient context, summarize communications, or draft WhatsApp replies. How can I help?",
    },
  ]);

  const handleAskAi = async (customPrompt?: string) => {
    const p = (customPrompt || aiPrompt).trim();
    if (!p || aiLoading || !activeId) return;
    setAiMessages((prev) => [...prev, { role: "user", text: p }]);
    setAiPrompt("");
    setAiLoading(true);
    try {
      const res = await apiPost<{ reply: string }>(`/api/v1/whatsapp-automation/inbox/${activeId}/ai/reply`, {
        prompt: p,
        includeContext: true,
      });
      setAiMessages((prev) => [...prev, { role: "assistant", text: res.reply }]);
    } catch {
      const patientName = detail?.patient
        ? `${detail.patient.firstName} ${detail.patient.lastName}`.trim()
        : "Patient";
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Suggested draft for ${patientName}:\n\n"Hello ${detail?.patient?.firstName || "there"}, thank you for contacting ${detail?.clinicName || "Hospex"}. We are reviewing your record and our medical team will update you shortly with details."`,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

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
    <div className="flex flex-col -mb-8">
      {/* Compact Header */}
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Inbox</h1>
          <p className="text-xs text-gray-500">Operational patient communication console with real-time Meta WhatsApp sync.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-200 hover:border-gray-300 rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-gray-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] cursor-pointer min-w-[160px]"
            >
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          </div>
        </div>
      </div>

      {rows.length === 0 && filter === "all" && !q ? (
        <EmptyState
          title="No conversations"
          description="Connect WhatsApp and wait for patient messages, or send an approved template."
        />
      ) : (
        <div className="grid h-[calc(100vh-140px)] min-h-[740px] 2xl:h-[calc(100vh-125px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs lg:grid-cols-[280px_minmax(0,1fr)_330px]">
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
                <header className="border-b border-gray-100 px-5 py-2.5 bg-white flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="size-10 shrink-0 rounded-full overflow-hidden border border-gray-200 shadow-xs">
                           <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full size-3.5 flex items-center justify-center border-2 border-white text-white">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-bold text-gray-900 text-sm">
                            {detail.patient ? `${detail.patient.firstName} ${detail.patient.lastName}` : "Unmatched contact"}
                          </h2>
                          <span className="size-2 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-xs text-gray-500">
                          {detail.patient?.phone ?? "No phone"} · {detail.clinicName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="sm" className="rounded-full h-8 px-3.5 text-xs font-semibold text-gray-600 border-gray-200 hover:bg-gray-50">
                         <Bot className="size-3.5 mr-1.5" />
                         Automation
                       </Button>
                       <Button size="icon" className="rounded-full size-8 bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs">
                         <Plus className="size-4" />
                       </Button>
                       <Button size="icon" variant="outline" className="rounded-full size-8 border-gray-200">
                         <User className="size-4 text-gray-500" />
                       </Button>
                       <Button size="icon" variant="ghost" className="rounded-full size-8 text-gray-400">
                         <MoreVertical className="size-4" />
                       </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#F3F0FF] px-2.5 py-0.5 text-[10px] font-semibold text-[#7C3AED] border border-[#7C3AED]/15 tracking-wide">
                        {detail.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600 tracking-wide">
                        {detail.automation ? "Auto" : "Manual"}
                      </span>
                      {detail.couple && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          <Users className="size-3 text-emerald-600" />
                          Couple: {detail.couple.primaryPatient?.firstName || "Primary"} & {detail.couple.partnerPatient?.firstName || "Partner"}
                        </span>
                      )}
                    </div>
                    
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-100 tracking-wide">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                  className="flex-1 space-y-3.5 overflow-y-auto bg-[#FAFAFA]/50 px-6 py-4"
                >
                  {detail.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center text-gray-400">
                      <div className="rounded-full bg-gray-100 p-4 mb-3">
                        <Bot className="size-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">No messages yet</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-[260px]">
                        Type a reply below to start communicating with this patient via WhatsApp.
                      </p>
                    </div>
                  ) : (
                    detail.messages.map((m, idx) => {
                      const prev = idx > 0 ? detail.messages[idx - 1] : null;
                      const showDate =
                        !prev ||
                        new Date(m.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                      const orderData = parseOrderMessage(m.content);

                      return (
                        <div key={m.id} className="space-y-3">
                          {showDate && (
                            <div className="flex items-center justify-center my-3">
                              <span className="text-[11px] font-medium text-gray-400 bg-white/90 border border-gray-100 shadow-2xs px-3 py-0.5 rounded-full">
                                {formatMessageDate(m.createdAt)}
                              </span>
                            </div>
                          )}
                          {orderData ? (
                            <div className={cn("transition-all duration-150 animate-in fade-in slide-in-from-bottom-1", m.direction === "INBOUND" ? "" : "ml-auto flex flex-col items-end")}>
                              {m.label && m.direction === "OUTBOUND" && (
                                <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                                  {m.label}
                                </div>
                              )}
                              <WhatsAppOrderCard
                                orderNumber={orderData.orderNumber}
                                itemTitle={orderData.itemTitle}
                                quantity={orderData.quantity}
                                total={orderData.total}
                                payUrl={orderData.payUrl}
                                timestamp={new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                status={m.status}
                              />
                            </div>
                          ) : (
                            <div className={cn("flex flex-col", m.direction === "INBOUND" ? "items-start" : "items-end")}>
                              <div
                                className={cn(
                                  "max-w-[72%] text-[14px] leading-relaxed transition-all duration-150 animate-in fade-in slide-in-from-bottom-1",
                                  m.direction === "INBOUND"
                                    ? "bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3"
                                    : "bg-[#7C3AED] text-white shadow-sm rounded-2xl rounded-tr-sm px-4 py-2.5",
                                )}
                              >
                                {m.label && m.direction === "OUTBOUND" && (
                                  <div className="text-[10px] font-bold text-white/80 mb-1 flex items-center gap-1">
                                    {m.label}
                                  </div>
                                )}
                                {m.media ? (
                                  <div className="my-1.5">
                                    <MediaBubble media={m.media} isOutbound={m.direction === "OUTBOUND"} />
                                  </div>
                                ) : (
                                  renderMessageContent(m.content, m.direction === "OUTBOUND")
                                )}

                                <p
                                  className={cn(
                                    "mt-1 flex items-center justify-end gap-1.5 text-[10px] font-medium",
                                    m.direction === "INBOUND" ? "text-gray-400" : "text-white/75",
                                  )}
                                >
                                  <span>
                                    {new Date(m.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {m.direction === "OUTBOUND" && (
                                    <span className="font-bold">
                                      {m.status === "READ"
                                        ? "✓✓"
                                        : m.status === "DELIVERED"
                                          ? "✓✓"
                                          : m.status === "SENT"
                                            ? "✓"
                                            : m.status === "FAILED"
                                              ? "⚠ Failed"
                                              : ""}
                                    </span>
                                  )}
                                </p>
                              </div>

                              {m.direction === "INBOUND" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRightTab("ai");
                                    void handleAskAi(`Suggest a reply for: "${m.content}"`);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] hover:underline mt-1.5 ml-1 transition-colors"
                                >
                                  <Sparkles className="size-3" />
                                  Ask Smrko AI
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
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

                {activeId ? (() => {
                  const isPrimary = detail.couple?.primaryPatient?.id === detail.patient?.id;
                  const partnerObj = isPrimary ? detail.couple?.partnerPatient : detail.couple?.primaryPatient;
                  const primaryDisplayName = detail.couple?.primaryPatient
                    ? `${detail.couple.primaryPatient.firstName || ""} ${detail.couple.primaryPatient.lastName || ""}`.trim()
                    : detail.patient?.firstName || "Primary";
                  const partnerDisplayName = partnerObj
                    ? `${partnerObj.firstName || ""} ${partnerObj.lastName || ""}`.trim()
                    : "Partner";

                  return (
                    <div className="bg-white shrink-0">
                      <ChatComposer
                        conversationId={activeId}
                        {...(detail.patient?.id ? { patientId: detail.patient.id } : {})}
                        coupleId={detail.couple?.id ?? null}
                        partnerInfo={
                          partnerObj
                            ? {
                                name: partnerDisplayName,
                                phone: partnerObj.phone ?? null,
                                primaryName: primaryDisplayName,
                                conversationId: detail.partnerConversationId ?? null,
                              }
                            : null
                        }
                        onSwitchConversation={(convId) => {
                          setActiveId(convId);
                        }}
                        draftText={draftText}
                        onTyping={() => notifyTyping(activeId)}
                        onSent={() => {
                          setDraftText("");
                          void (async () => {
                            const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
                            setDetail(d);
                            scrollToBottom(true);
                            await loadList();
                          })();
                        }}
                      />
                    </div>
                  );
                })() : null}
              </>
            )}
          </section>

          <aside className="border-l border-gray-100 flex flex-col bg-[#FAFAFA] h-full min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  {activeRightTab === "ai" ? "Ask Smrko AI" : "Patient Context"}
                  {activeRightTab === "ai" && <Sparkles className="size-4 text-[#7C3AED]" />}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveRightTab((t) => (t === "ai" ? "context" : "ai"))}
                  title={activeRightTab === "ai" ? "Switch to Patient Context" : "Switch to Ask Smrko AI"}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Layout className="size-4" />
                </button>
              </div>
            </div>

            {activeRightTab === "ai" ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-white/70">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Quick AI Assistance
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        void handleAskAi("Draft a polite WhatsApp reminder about the upcoming consultation appointment.")
                      }
                      className="text-xs bg-[#F3F0FF] hover:bg-[#E9E3FC] text-[#866BE3] px-2.5 py-1 rounded-full border border-[#866BE3]/15 font-medium transition-colors text-left"
                    >
                      📅 Appointment Reminder
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleAskAi("Draft pre-consultation instructions and fasting/document reminders for the patient.")
                      }
                      className="text-xs bg-[#F3F0FF] hover:bg-[#E9E3FC] text-[#866BE3] px-2.5 py-1 rounded-full border border-[#866BE3]/15 font-medium transition-colors text-left"
                    >
                      📋 Pre-visit Instructions
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleAskAi("Summarize this patient's WhatsApp message history and main query concisely.")
                      }
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 font-medium transition-colors text-left"
                    >
                      🔍 Summarize Chat
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {aiMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-xs leading-relaxed rounded-xl p-3 shadow-xs animate-in fade-in",
                        msg.role === "assistant"
                          ? "bg-white border border-gray-100 text-gray-800"
                          : "bg-[#866BE3] text-white ml-auto max-w-[85%]"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-[#866BE3]">
                          <span className="flex items-center gap-1">
                            <Sparkles className="size-3" /> Smrko AI Suggestion
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.role === "assistant" && i > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] px-2.5 text-[#866BE3] border-[#866BE3]/20 hover:bg-[#F3F0FF]"
                            onClick={() => {
                              const match = msg.text.match(/"([^"]+)"/);
                              const cleanText = match ? match[1] : msg.text;
                              setDraftText(cleanText || msg.text);
                              toast.success("Inserted into staff reply composer!");
                            }}
                          >
                            <CornerDownRight className="size-3 mr-1" /> Use in reply
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 italic p-2 bg-white rounded-xl border border-gray-100">
                      <Sparkles className="size-3.5 text-[#866BE3] animate-spin" />
                      Smrko AI is thinking…
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white border-t border-gray-100">
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus-within:border-[#866BE3] focus-within:ring-2 focus-within:ring-[#866BE3]/10">
                    <input
                      type="text"
                      placeholder="Ask Smrko AI or draft reply…"
                      className="flex-1 bg-transparent border-none focus:outline-none text-xs text-gray-800 placeholder:text-gray-400"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleAskAi();
                      }}
                    />
                    <Button
                      size="icon"
                      disabled={!aiPrompt.trim() || aiLoading}
                      onClick={() => void handleAskAi()}
                      className="size-7 rounded-lg bg-[#866BE3] hover:bg-[#7254d1] text-white disabled:opacity-40"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-xs space-y-2">
                  <p className="font-bold text-gray-900 text-sm">
                    {detail?.patient ? `${detail.patient.firstName} ${detail.patient.lastName}` : "Unmatched"}
                  </p>
                  <p className="text-gray-500">{detail?.patient?.phone ?? detail?.contactPhone ?? "No phone"}</p>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-gray-400">Clinic</span>
                    <span className="font-semibold text-gray-700">{detail?.clinicName}</span>
                  </div>
                </div>

                {context?.upcomingAppointment && (
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900">
                      <Calendar className="size-3.5 text-[#866BE3]" />
                      Upcoming Appointment
                    </div>
                    <p className="text-gray-700 font-medium">
                      {new Date(context.upcomingAppointment.startsAt).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-gray-500">
                      {context.upcomingAppointment.type} · {context.upcomingAppointment.doctorName || "Assigned Doctor"}
                    </p>
                  </div>
                )}

                {context?.couple && (
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900">Fertility Couple Details</p>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        {context.couple.slug}
                      </span>
                    </div>
                    {context.couple.doctor && (
                      <p className="text-gray-700">Doctor: {context.couple.doctor.name}</p>
                    )}
                    {context.couple.coordinator && (
                      <p className="text-gray-700">Coordinator: {context.couple.coordinator.name}</p>
                    )}
                    {detail?.partnerConversationId && (
                      <button
                        type="button"
                        onClick={() => setActiveId(detail.partnerConversationId!)}
                        className="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-between transition-colors border border-emerald-200/60"
                      >
                        <span className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-emerald-600" />
                          Open Partner Chat
                        </span>
                        <span>→</span>
                      </button>
                    )}
                  </div>
                )}

                {context?.recentTasks && context.recentTasks.length > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-xs space-y-2">
                    <p className="font-bold text-gray-900">Care Loop Tasks</p>
                    <div className="space-y-1">
                      {context.recentTasks.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-gray-600">
                          <span className="truncate pr-2">{t.title}</span>
                          <span className="text-[10px] font-semibold uppercase">{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
