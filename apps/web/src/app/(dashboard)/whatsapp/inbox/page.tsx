"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PreviewBanner, WaStatusPill } from "@/components/whatsapp/center/section";
import { EmptyState, LoadingRows } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import {
  DEMO_CONVERSATIONS,
  DEMO_THREAD,
  type DemoConversation,
} from "@/lib/whatsapp/center-demo";
import { cn } from "@/lib/utils";

type InboxRow = {
  id: string;
  status: string;
  unmatched: boolean;
  contactPhone: string | null;
  patient: { id: string; firstName: string; lastName: string } | null;
  unreadCount: number;
  automationPaused: boolean;
  handoffReason: string | null;
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
  handoffReason: string | null;
  automationPausedAt: string | null;
  patient: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  messages: Array<{
    id: string;
    direction: string;
    senderType: string;
    content: string;
    createdAt: string;
    label: string;
  }>;
};

type Context = {
  patient: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  couple: {
    slug: string;
    doctor: { name: string } | null;
    coordinator: { name: string } | null;
  } | null;
  upcomingAppointment: { type: string; startsAt: string; doctorName: string | null } | null;
  overdueTaskCount: number;
  recentTasks: Array<{ id: string; title: string; status: string }>;
  note?: string;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "ai", label: "AI" },
  { id: "staff", label: "Staff" },
  { id: "escalated", label: "Escalated" },
] as const;

function initials(name: string) {
  return name
    .split(/[\s+]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function WhatsAppInboxPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [demoId, setDemoId] = useState(DEMO_CONVERSATIONS[0]!.id);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilter =
        filter === "escalated"
          ? "escalated"
          : filter === "unread"
            ? "unread"
            : filter === "staff"
              ? "human_handoff"
              : filter === "ai"
                ? "automation_active"
                : "all";
      const params = new URLSearchParams({ filter: apiFilter });
      if (q.trim()) params.set("q", q.trim());
      const next = await apiGet<InboxRow[]>(`/api/v1/whatsapp-automation/inbox?${params}`);
      setRows(next);
      setDemoMode(next.length === 0);
      if (next[0] && !activeId) setActiveId(next[0].id);
    } catch (err) {
      setDemoMode(true);
      setError(err instanceof ApiError ? err.message : null);
    } finally {
      setLoading(false);
    }
  }, [filter, q, activeId]);

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (demoMode || !activeId) {
      setDetail(null);
      setContext(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [d, ctx] = await Promise.all([
          apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`),
          apiGet<Context>(`/api/v1/whatsapp-automation/inbox/${activeId}/context`).catch(() => null),
        ]);
        if (!cancelled) {
          setDetail(d);
          setContext(ctx);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load conversation");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, demoMode]);

  const demoList = useMemo(() => {
    return DEMO_CONVERSATIONS.filter((c) => {
      if (filter !== "all" && c.filter !== filter && !(filter === "unread" && c.unread)) {
        if (filter === "escalated") return c.escalated;
        if (filter === "unread") return c.unread;
        if (filter === "ai") return c.filter === "ai";
        if (filter === "staff") return false;
      }
      if (q.trim() && !c.couple.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
  }, [filter, q]);

  const activeDemo: DemoConversation =
    demoList.find((c) => c.id === demoId) ?? demoList[0] ?? DEMO_CONVERSATIONS[0]!;

  async function sendReply() {
    if (demoMode) {
      toast.message("Preview mode — connect WhatsApp to send live messages.");
      return;
    }
    if (!activeId || !reply.trim()) return;
    try {
      await apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/reply`, { body: reply.trim() });
      setReply("");
      toast.success("Message sent");
      const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
      setDetail(d);
      await loadList();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Send failed");
    }
  }

  async function takeover() {
    if (demoMode) {
      toast.message("Preview: human takeover would pause automation.");
      return;
    }
    if (!activeId) return;
    try {
      await apiPost(`/api/v1/whatsapp-automation/conversations/${activeId}/takeover`, {
        reason: "PATIENT_REQUESTED_HUMAN",
        pauseAutomation: true,
      });
      toast.success("You took over this conversation");
      const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
      setDetail(d);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Takeover failed");
    }
  }

  if (loading && rows.length === 0 && !demoMode) {
    return <LoadingRows rows={6} />;
  }

  const title = demoMode
    ? activeDemo.couple
    : detail?.patient
      ? `${detail.patient.firstName} ${detail.patient.lastName}`
      : rows.find((r) => r.id === activeId)?.patient
        ? `${rows.find((r) => r.id === activeId)!.patient!.firstName} ${rows.find((r) => r.id === activeId)!.patient!.lastName}`
        : "Conversation";

  const journeyLine = demoMode
    ? `${activeDemo.journey} · ${activeDemo.stage}`
    : context?.upcomingAppointment?.type ?? detail?.status ?? "WhatsApp";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Inbox</h2>
        <p className="text-sm text-muted-foreground">
          Healthcare communication workspace — Care Loop messages, patient replies, and staff handoff.
        </p>
      </div>

      {demoMode ? (
        <PreviewBanner>
          {error
            ? `Showing sample conversations (${error}). Connect WhatsApp for live inbox.`
            : "No live conversations yet — showing sample Care Loop workspace for ABC Fertility Centre."}
        </PreviewBanner>
      ) : null}

      <div className="grid min-h-[680px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(260px,300px)]">
        {/* LEFT */}
        <aside className="flex flex-col border-b border-border/70 lg:border-r lg:border-b-0">
          <div className="space-y-3 border-b border-border/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadList();
                }}
                placeholder="Search patients or conversations…"
                className="h-9 rounded-xl pl-8 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-[11px] font-semibold",
                    filter === f.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {(demoMode ? demoList : rows).map((row) => {
              if (demoMode) {
                const c = row as unknown as DemoConversation;
                const active = c.id === activeDemo.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setDemoId(c.id)}
                      className={cn(
                        "mb-1 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                        active ? "bg-primary-soft" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(c.couple)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">{c.couple}</span>
                          {c.escalated ? <AlertTriangle className="size-3 text-orange-600" /> : null}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {c.journey} · {c.stage}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{c.preview}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">{c.time}</span>
                      {c.unread ? (
                        <span className="col-start-1 row-start-1 mt-0 size-2 translate-x-7 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  </li>
                );
              }
              const r = row as InboxRow;
              const name = r.patient
                ? `${r.patient.firstName} ${r.patient.lastName}`
                : r.contactPhone ?? "Unknown";
              const active = r.id === activeId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className={cn(
                      "mb-1 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5 rounded-xl px-2.5 py-2.5 text-left",
                      active ? "bg-primary-soft" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(name)}
                    </span>
                    <span className="min-w-0">
                      <span className="truncate text-sm font-semibold">{name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{r.status}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.lastMessage?.preview ?? "No messages"}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.lastMessage ? formatTime(r.lastMessage.createdAt) : ""}
                    </span>
                  </button>
                </li>
              );
            })}
            {!demoMode && rows.length === 0 ? (
              <li className="p-4 text-center text-xs text-muted-foreground">No conversations</li>
            ) : null}
          </ul>
        </aside>

        {/* MIDDLE */}
        <section className="flex min-h-[420px] flex-col border-b border-border/70 lg:border-b-0">
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">
                {journeyLine}
                {demoMode || !detail?.automationPausedAt ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-primary">
                    · Care Loop Active
                  </span>
                ) : (
                  <span className="ml-2 text-orange-700">· Automation paused</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="icon" variant="ghost" className="rounded-lg" aria-label="Search">
                <Search className="size-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="rounded-lg" aria-label="Call">
                <Phone className="size-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="rounded-lg" aria-label="More">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
          </header>

          {!demoMode && detail?.handoffReason ? (
            <div className="mx-4 mt-3 rounded-xl border border-orange-200 bg-orange-50/80 p-3">
              <p className="text-xs font-semibold text-orange-900">Clinical attention required</p>
              <p className="mt-0.5 text-xs text-orange-800/90">
                AI has stopped automated responses. {detail.handoffReason}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-lg" onClick={() => void takeover()}>
                  Take Over Conversation
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg" asChild>
                  <Link href="/care-loop">Escalate to Doctor</Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#faf8fc] px-4 py-4">
            {demoMode
              ? DEMO_THREAD.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                      m.from === "patient"
                        ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border/70 bg-card",
                    )}
                  >
                    {m.from !== "patient" ? (
                      <p className="mb-1 text-[10px] font-semibold tracking-wide text-primary uppercase">
                        {m.from === "ai" ? "AI" : "Care Loop"}
                      </p>
                    ) : null}
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    {m.buttons?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.buttons.map((b) => (
                          <span
                            key={b}
                            className="rounded-lg border border-primary/20 bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {m.aiAssisted ? (
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Sparkles className="size-3" /> AI assisted · Based on clinic-approved information
                      </p>
                    ) : null}
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        m.from === "patient" ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {m.time}
                    </p>
                  </div>
                ))
              : detail?.messages.map((m) => {
                  const inbound = m.direction === "INBOUND";
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                        inbound
                          ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border border-border/70 bg-card",
                      )}
                    >
                      {!inbound ? (
                        <p className="mb-1 text-[10px] font-semibold tracking-wide text-primary uppercase">
                          {m.label || m.senderType}
                        </p>
                      ) : null}
                      <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          inbound ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  );
                })}
            {!demoMode && detail && detail.messages.length === 0 ? (
              <EmptyState title="No messages yet" description="Start with an approved template." />
            ) : null}
          </div>

          <footer className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a message…"
                className="min-h-[44px] resize-none rounded-xl text-sm"
                rows={2}
              />
              <Button type="button" className="rounded-xl" onClick={() => void sendReply()}>
                <Send className="size-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" className="rounded-lg">
                <Paperclip className="size-3.5" /> Attachment
              </Button>
              <Button type="button" size="sm" variant="outline" className="rounded-lg" asChild>
                <Link href="/whatsapp/templates">Template</Link>
              </Button>
              <Button type="button" size="sm" variant="outline" className="rounded-lg">
                <Bot className="size-3.5" /> AI Assist
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-lg ml-auto" onClick={() => void takeover()}>
                Take over
              </Button>
            </div>
          </footer>
        </section>

        {/* RIGHT */}
        <aside className="flex flex-col gap-4 overflow-y-auto bg-primary-soft/20 p-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Patient</p>
            <p className="mt-1 text-sm font-semibold">{title}</p>
            {demoMode ? (
              <>
                <p className="mt-3 text-xs text-muted-foreground">Journey</p>
                <p className="text-sm font-medium">{activeDemo.journey}</p>
                <p className="mt-2 text-xs text-muted-foreground">Current stage</p>
                <p className="text-sm font-medium">{activeDemo.stage}</p>
                <p className="mt-2 text-xs text-muted-foreground">Assigned doctor</p>
                <p className="text-sm font-medium">Dr. Ananya Rao</p>
                <p className="mt-2 text-xs text-muted-foreground">Care Loop</p>
                <WaStatusPill label="Active" tone="success" />
                <p className="mt-3 text-xs text-muted-foreground">Next required action</p>
                <p className="text-sm font-medium">Monitoring Scan</p>
                <p className="text-xs text-muted-foreground">Due tomorrow · 9:00 AM</p>
                <p className="mt-2 text-xs text-muted-foreground">Task</p>
                <p className="text-sm font-medium">Awaiting completion</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-xs text-muted-foreground">Doctor</p>
                <p className="text-sm font-medium">{context?.couple?.doctor?.name ?? "Unassigned"}</p>
                <p className="mt-2 text-xs text-muted-foreground">Coordinator</p>
                <p className="text-sm font-medium">{context?.couple?.coordinator?.name ?? "Unassigned"}</p>
                {context?.upcomingAppointment ? (
                  <>
                    <p className="mt-3 text-xs text-muted-foreground">Next appointment</p>
                    <p className="text-sm font-medium">{context.upcomingAppointment.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(context.upcomingAppointment.startsAt).toLocaleString()}
                    </p>
                  </>
                ) : null}
                {context?.overdueTaskCount ? (
                  <p className="mt-2 text-xs text-orange-700">{context.overdueTaskCount} overdue task(s)</p>
                ) : null}
              </>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Recent care activity
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {(demoMode
                ? ["Appointment confirmed", "Medication reminder sent", "Scan requested", "Patient responded"]
                : (context?.recentTasks ?? []).map((t) => `${t.title} · ${t.status}`)
              ).map((line) => (
                <li key={line} className="rounded-lg bg-card/80 px-2.5 py-1.5 border border-border/50">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button asChild className="rounded-xl">
              <Link
                href={
                  demoMode
                    ? "/patients"
                    : context?.couple?.slug
                      ? `/patients/${context.couple.slug}`
                      : "/patients"
                }
              >
                Open Patient
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/care-loop">Open Care Loop</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
