import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pause, Play, Plus, Archive, Trash2, CalendarCheck, Sparkles } from "lucide-react";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api/client";

type FlowRow = {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  triggerType: string;
  isLibrary: boolean;
  libraryKey: string | null;
  lastRunAt: string | null;
  successRate: number | null;
  patientsReached: number | null;
  createdByName: string | null;
  updatedAt: string;
};

function tone(status: FlowRow["status"]) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PAUSED" || status === "DRAFT") return "warning" as const;
  return "muted" as const;
}

export default function WhatsAppFlowsPage() {
  const [rows, setRows] = useState<FlowRow[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "DRAFT" | "PAUSED" | "LIBRARY" | "ARCHIVED">("ALL");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlowRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter === "LIBRARY") params.set("status", "LIBRARY");
      else if (filter !== "ALL") params.set("status", filter);
      if (q.trim()) params.set("q", q.trim());
      const next = await apiGet<FlowRow[]>(`/api/v1/whatsapp-automation/flows?${params}`);
      setRows(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load flows.");
    } finally {
      setLoading(false);
    }
  }, [filter, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "ALL") return rows.filter((r) => !r.isLibrary);
    return rows;
  }, [rows, filter]);

  const canonicalLibraryAppt = useMemo(() => {
    return rows.find((r) => r.isLibrary && r.libraryKey === "appointment_booking_whatsapp");
  }, [rows]);

  async function act(id: string, action: "duplicate" | "activate" | "pause" | "archive") {
    setBusyId(id);
    try {
      await apiPost(`/api/v1/whatsapp-automation/flows/${id}/${action}`);
      toast.success(
        action === "duplicate"
          ? "Flow duplicated as draft"
          : action === "activate"
            ? "Flow activated"
            : action === "pause"
              ? "Flow paused"
              : "Flow archived",
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.status === "ACTIVE") {
      toast.error("An active flow cannot be permanently deleted. Pause/archive it first.");
      return;
    }
    setDeleting(true);
    try {
      const res = await apiDelete<{ deleted: boolean; archived?: boolean; message?: string }>(
        `/api/v1/whatsapp-automation/flows/${deleteTarget.id}`,
      );
      if (res.archived) {
        toast.info(res.message || "Flow has execution history and was archived instead.");
      } else {
        toast.success("Flow permanently deleted");
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete flow");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <PageHeader
        title="Flows"
        subtitle="WhatsApp automation workflows. Editable node-based journeys with real appointment scheduling."
        actions={
          <Button asChild size="sm">
            <Link href="/whatsapp/flows/new">
              <Plus className="mr-1 size-4" />
              Create Flow
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "ACTIVE", "DRAFT", "PAUSED", "LIBRARY", "ARCHIVED"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "LIBRARY" ? "Recommended" : f.charAt(0) + f.slice(1).toLowerCase()}
          </Button>
        ))}
        <Input
          className="ml-auto max-w-xs"
          placeholder="Search flows"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? <LoadingRows rows={5} /> : null}
      {error ? (
        <EmptyState title="Unable to load flows" description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No custom flows yet"
            description="Create a flow from scratch or activate the canonical Appointment Booking workflow below."
            action={
              <Button asChild>
                <Link href="/whatsapp/flows/new">Create Flow</Link>
              </Button>
            }
          />
          {canonicalLibraryAppt ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="size-5 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Appointment Booking — WhatsApp</h3>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                      CANONICAL FLOW
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Complete 17-node patient appointment booking automation with doctor cards, real available dates, time slots, confirmation buttons, and Care Loop task creation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <Link href={`/whatsapp/flows/${canonicalLibraryAppt.id}`}>View Template</Link>
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === canonicalLibraryAppt.id}
                    onClick={() => void act(canonicalLibraryAppt.id, "duplicate")}
                  >
                    <Sparkles className="mr-1 size-3.5" />
                    Duplicate & Edit
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-3 lg:grid-cols-2">
        {visible.map((flow) => (
          <li key={flow.id} className="surface-card space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/whatsapp/flows/${flow.id}`} className="text-sm font-semibold hover:underline">
                  {flow.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{flow.description ?? "No description"}</p>
              </div>
              <StatusBadge
                label={flow.isLibrary ? "SYSTEM TEMPLATE" : flow.status}
                tone={flow.isLibrary ? "warning" : tone(flow.status)}
              />
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <div>
                <dt className="font-medium text-foreground">Trigger</dt>
                <dd>{flow.triggerType.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Last run</dt>
                <dd>{flow.lastRunAt ? new Date(flow.lastRunAt).toLocaleString() : "Never"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Success</dt>
                <dd>{flow.successRate == null ? "No data yet" : `${flow.successRate}%`}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Reached</dt>
                <dd>{flow.patientsReached == null ? "—" : flow.patientsReached}</dd>
              </div>
            </dl>
            <p className="text-[11px] text-muted-foreground">
              {flow.createdByName ? `By ${flow.createdByName} · ` : ""}
              Updated {new Date(flow.updatedAt).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
              <Button asChild size="sm" variant="outline">
                <Link href={`/whatsapp/flows/${flow.id}`}>Edit</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === flow.id}
                onClick={() => void act(flow.id, "duplicate")}
              >
                <Copy className="mr-1 size-3.5" />
                Duplicate
              </Button>
              {!flow.isLibrary && flow.status !== "ACTIVE" ? (
                <Button size="sm" disabled={busyId === flow.id} onClick={() => void act(flow.id, "activate")}>
                  <Play className="mr-1 size-3.5" />
                  Activate
                </Button>
              ) : null}
              {!flow.isLibrary && flow.status === "ACTIVE" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === flow.id}
                  onClick={() => void act(flow.id, "pause")}
                >
                  <Pause className="mr-1 size-3.5" />
                  Pause
                </Button>
              ) : null}
              {!flow.isLibrary && flow.status !== "ARCHIVED" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === flow.id}
                  onClick={() => void act(flow.id, "archive")}
                >
                  <Archive className="mr-1 size-3.5" />
                  Archive
                </Button>
              ) : null}
              {!flow.isLibrary ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={busyId === flow.id}
                  onClick={() => setDeleteTarget(flow)}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  Delete
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {/* Delete Confirmation Modal */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="surface-card w-full max-w-md space-y-4 rounded-xl border border-destructive/20 p-6 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Delete flow?</h3>
              <p className="text-sm text-muted-foreground">
                This permanently removes this draft flow <strong className="text-foreground">{deleteTarget.name}</strong> and its configuration. Executions/history will not be deleted.
              </p>
              {deleteTarget.status === "ACTIVE" ? (
                <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs font-medium text-destructive">
                  An active flow cannot be permanently deleted. Pause/archive it first.
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting || deleteTarget.status === "ACTIVE"}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Deleting…" : "Delete Flow"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
