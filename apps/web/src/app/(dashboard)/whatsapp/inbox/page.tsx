"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type InboxRow = {
  id: string;
  status: string;
  priority: string;
  unmatched: boolean;
  contactPhone: string | null;
  patient: { id: string; firstName: string; lastName: string; initials: string; status: string } | null;
  assignedStaff: { id: string; name: string; initials: string | null } | null;
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
  assignedStaff: { id: string; name: string } | null;
  patient: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  clinicName: string;
  messages: Array<{
    id: string;
    direction: string;
    senderType: string;
    content: string;
    createdAt: string;
    status: string;
    label: string;
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

const FILTERS: Array<{ id: InboxRow extends never ? never : string; label: string }> = [
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

export default function WhatsAppInboxPage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);

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
  }, [activeId]);

  async function sendReply() {
    if (!activeId || !reply.trim()) return;
    try {
      await apiPost(`/api/v1/whatsapp-automation/inbox/${activeId}/reply`, { body: reply.trim() });
      setReply("");
      toast.success("Message sent (staff)");
      const d = await apiGet<Detail>(`/api/v1/whatsapp-automation/inbox/${activeId}`);
      setDetail(d);
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Send failed. Session window may be closed — use an approved template.",
      );
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
      setActiveId(activeId);
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
      await loadList();
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
        subtitle="Operational patient communication — automation and staff clearly labeled. Not a consumer chat clone."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/whatsapp/templates">Templates</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium",
              filter === f.id ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
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
                        "flex w-full flex-col gap-0.5 border-b px-3 py-3 text-left text-sm",
                        active ? "bg-primary-soft" : "hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px]">
                            {row.patient?.initials ?? "?"}
                          </span>
                          {name}
                        </span>
                        {row.unreadCount > 0 ? (
                          <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                            {row.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{row.lastMessage?.preview ?? "No messages"}</p>
                      <div className="flex flex-wrap gap-1">
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

          <section className="flex max-h-[70vh] flex-col border-b lg:border-b-0 lg:border-r">
            {detailLoading ? (
              <div className="p-4">
                <LoadingRows rows={4} />
              </div>
            ) : !detail ? (
              <p className="p-4 text-sm text-muted-foreground">Select a conversation.</p>
            ) : (
              <>
                <header className="space-y-2 border-b px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
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
                      ) : (
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
                      )}
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

                <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
                        m.direction === "INBOUND" ? "bg-card" : "ml-auto bg-primary/10",
                      )}
                    >
                      <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {m.label}
                      </p>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString()} · {m.status}
                      </p>
                    </div>
                  ))}
                </div>

                <footer className="space-y-2 border-t p-3">
                  <p className="text-[10px] text-muted-foreground">
                    Staff reply uses Meta session window. Outside 24h, use an approved template. Never shown as a doctor
                    personal message.
                  </p>
                  <Textarea
                    rows={2}
                    placeholder="Write a staff reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void sendReply()} disabled={!reply.trim()}>
                      Send as staff
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/whatsapp/templates">Send template</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/whatsapp">Ask Smrko AI</Link>
                    </Button>
                  </div>
                </footer>
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
