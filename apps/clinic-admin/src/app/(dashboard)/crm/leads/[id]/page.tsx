"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { LOST_REASONS, STAGE_LABELS, STAGE_ORDER, type LeadRow } from "@/lib/crm";

type Activity = { id: string; type: string; description: string; createdAt: string; user: { name: string } | null };
type Task = { id: string; title: string; status: string; dueDate: string | null; owner: { name: string } | null };
type LeadDetail = LeadRow & { scoreExplain?: { score: number; band: string; factors: Array<{ label: string; points: number }> } };

const tabs = ["Overview", "Timeline", "Communication", "Appointments", "Tasks", "Notes", "Conversion"] as const;

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("Call patient");
  const [taskDue, setTaskDue] = useState("");
  const [lostReason, setLostReason] = useState<(typeof LOST_REASONS)[number]>("Not interested");
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; status: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const [nextLead, nextActivities, nextTasks] = await Promise.all([
          apiGet<LeadDetail>(`/api/v1/leads/${id}`),
          apiGet<{ items: Activity[] }>(`/api/v1/leads/${id}/activities?page=1&pageSize=50`),
          apiGet<Task[]>(`/api/v1/leads/${id}/tasks`),
        ]);
        if (cancelled) return;
        setLead(nextLead);
        setActivities(nextActivities.items);
        setTasks(nextTasks);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load lead.");
      }
      try {
        const nextTemplates = await apiGet<Array<{ id: string; name: string; status: string }>>("/api/v1/integrations/whatsapp/templates");
        if (!cancelled) setTemplates(nextTemplates);
      } catch {
        if (!cancelled) setTemplates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      const [nextLead, nextActivities, nextTasks] = await Promise.all([
        apiGet<LeadDetail>(`/api/v1/leads/${id}`),
        apiGet<{ items: Activity[] }>(`/api/v1/leads/${id}/activities?page=1&pageSize=50`),
        apiGet<Task[]>(`/api/v1/leads/${id}/tasks`),
      ]);
      setLead(nextLead);
      setActivities(nextActivities.items);
      setTasks(nextTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !lead) {
    return <EmptyState title="Unable to load leads." description={error} />;
  }
  if (!lead) return <p className="p-6 text-sm text-muted-foreground">Loading lead…</p>;

  const approved = templates.filter((row) => row.status === "APPROVED");

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <PageHeader
        title={lead.name}
        subtitle={`${lead.sourceLabel}${lead.campaign ? ` · ${lead.campaign}` : ""} · ${lead.stageLabel}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border px-2 text-sm"
              disabled={busy}
              value={lead.stage}
              onChange={(e) => void run(() => apiPost(`/api/v1/leads/${id}/stage`, { stage: e.target.value }))}
            >
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>
              ))}
            </select>
            {lead.status !== "LOST" && (
              <Button variant="outline" disabled={busy} onClick={() => void run(() => apiPost(`/api/v1/leads/${id}/lost`, { reason: lostReason }))}>
                Mark lost
              </Button>
            )}
            {lead.status === "LOST" && (
              <Button disabled={busy} onClick={() => void run(() => apiPost(`/api/v1/leads/${id}/reopen`))}>
                Reopen
              </Button>
            )}
          </div>
        }
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <section className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div><p className="text-muted-foreground">Phone</p><p>{lead.phone ?? "—"}</p></div>
        <div><p className="text-muted-foreground">Email</p><p>{lead.email ?? "—"}</p></div>
        <div><p className="text-muted-foreground">Counsellor</p><p>{lead.assignedTo?.name ?? "Unassigned"}</p></div>
        <div><p className="text-muted-foreground">Status</p><StatusBadge label={lead.statusLabel} /></div>
        <div><p className="text-muted-foreground">Score</p><p>{lead.score} · {lead.scoreBand}</p></div>
        <div><p className="text-muted-foreground">Language</p><p>{lead.preferredLanguage ?? "—"}</p></div>
        <div><p className="text-muted-foreground">Location</p><p>{lead.location ?? "—"}</p></div>
        <div><p className="text-muted-foreground">Interest</p><p>{lead.treatmentInterest ?? "—"}</p></div>
      </section>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item}
            className={`min-h-11 shrink-0 rounded-md px-3 py-1.5 text-sm ${tab === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <section className="rounded-xl border bg-background p-4 text-sm space-y-2">
          <p>Created {new Date(lead.createdAt).toLocaleString()}</p>
          <p>Last activity {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleString() : "—"}</p>
          <p>Next follow-up {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : "—"}</p>
          {lead.scoreExplain && (
            <ul className="mt-3 space-y-1 text-muted-foreground">
              {lead.scoreExplain.factors.map((factor) => (
                <li key={factor.label}>+{factor.points} {factor.label}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">This score is engagement-only. It is not a clinical recommendation.</p>
        </section>
      )}

      {tab === "Timeline" && (
        <section className="rounded-xl border bg-background p-4">
          {activities.length === 0 ? (
            <EmptyState title="No activity yet." description="Calls, notes, WhatsApp and stage changes will appear here." />
          ) : (
            <ol className="space-y-3">
              {activities.map((item) => (
                <li key={item.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.user?.name ?? "System"} · {new Date(item.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {tab === "Communication" && (
        <section className="rounded-xl border bg-background p-4 space-y-3">
          <p className="text-sm text-muted-foreground">WhatsApp history lives in the conversation thread. CRM does not store a second copy of messages.</p>
          <Link href="/communication" className="text-sm text-primary">Open communication inbox</Link>
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved WhatsApp template is available.</p>
          ) : (
            <Button
              disabled={busy}
              onClick={() => void run(() => apiPost(`/api/v1/leads/${id}/whatsapp`, { templateId: approved[0]!.id, parameters: [lead.name] }))}
            >
              Send WhatsApp
            </Button>
          )}
        </section>
      )}

      {tab === "Appointments" && (
        <p className="text-sm text-muted-foreground">Consultation appointments linked to this lead appear after booking from conversion or the appointments module.</p>
      )}

      {tab === "Tasks" && (
        <section className="rounded-xl border bg-background p-4 space-y-4">
          {tasks.length === 0 ? <EmptyState title="No follow-ups due today." description="Schedule a counsellor call or WhatsApp follow-up." /> : (
            <ul className="space-y-2 text-sm">
              {tasks.map((task) => (
                <li key={task.id} className="flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{task.title} · {task.owner?.name ?? "Unassigned"}</span>
                  <StatusBadge label={task.status} />
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Call patient" />
            <Input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            <Button
              disabled={busy || !taskDue}
              onClick={() => void run(() => apiPost(`/api/v1/leads/${id}/tasks`, { title: taskTitle, dueDate: new Date(taskDue).toISOString() }))}
            >
              Schedule follow-up
            </Button>
          </div>
        </section>
      )}

      {tab === "Notes" && (
        <section className="rounded-xl border bg-background p-4 space-y-3">
          <Label htmlFor="note">Counsellor note</Label>
          <textarea id="note" className="min-h-24 w-full rounded-md border p-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button
            disabled={busy || !note.trim()}
            onClick={() => void run(async () => { await apiPost(`/api/v1/leads/${id}/activities`, { type: "NOTE_ADDED", description: note }); setNote(""); })}
          >
            Add note
          </Button>
          <p className="text-xs text-muted-foreground">Counsellor notes are not clinical records.</p>
        </section>
      )}

      {tab === "Conversion" && (
        <section className="rounded-xl border bg-background p-4 space-y-3">
          {lead.status === "CONVERTED" ? (
            <p className="text-sm">Converted {lead.convertedAt ? new Date(lead.convertedAt).toLocaleString() : ""}. Patient remains in the clinical workflow.</p>
          ) : (
            <Button disabled={busy} onClick={() => void run(() => apiPost(`/api/v1/leads/${id}/convert`, { createCouple: true }))}>
              Convert to patient
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Label>Lost reason</Label>
            <select className="h-9 rounded-md border px-2" value={lostReason} onChange={(e) => setLostReason(e.target.value as (typeof LOST_REASONS)[number])}>
              {LOST_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
            </select>
          </div>
        </section>
      )}
    </div>
  );
}
