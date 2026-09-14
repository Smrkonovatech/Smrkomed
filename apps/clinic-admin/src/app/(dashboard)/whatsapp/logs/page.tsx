"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type ExecutionRow = {
  id: string;
  flowId: string;
  flowName: string | null;
  status: string;
  triggerType: string;
  patientId: string | null;
  conversationId: string | null;
  error: string | null;
  resumeAt: string | null;
  startedAt: string;
  completedAt: string | null;
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  steps: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    error: string | null;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
  }>;
};

function tone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "FAILED" || status === "CANCELLED") return "danger" as const;
  if (status === "WAITING" || status === "PENDING") return "warning" as const;
  return "muted" as const;
}

function durationLabel(startedAt: string, completedAt: string | null) {
  if (!completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function WhatsAppLogsPage() {
  const [items, setItems] = useState<ExecutionRow[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: "40" });
      if (status) params.set("status", status);
      const data = await apiGet<{ items: ExecutionRow[] }>(
        `/api/v1/whatsapp-automation/executions?${params.toString()}`,
      );
      setItems(data.items);
      setSelectedId((prev) => prev ?? data.items[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load executions");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (i) =>
        i.flowName?.toLowerCase().includes(needle) ||
        i.id.toLowerCase().includes(needle) ||
        i.triggerType.toLowerCase().includes(needle) ||
        i.status.toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Automation logs"
        subtitle="WhatsAppFlowExecution history — clinic-scoped"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/whatsapp/flows">Flows</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-1 size-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            className="flex h-9 rounded-md border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {["PENDING", "RUNNING", "WAITING", "COMPLETED", "FAILED", "CANCELLED", "ESCALATED"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label>Search</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Flow, id, trigger…" />
        </div>
      </div>

      {loading ? <LoadingRows rows={8} /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error && filtered.length === 0 ? (
        <EmptyState title="No executions" description="Activate a flow or run Test to create history." />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <ul className="space-y-2">
          {filtered.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                  selectedId === ex.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
                onClick={() => setSelectedId(ex.id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={ex.status} tone={tone(ex.status)} />
                  <span className="font-medium">{ex.flowName ?? ex.flowId}</span>
                  <span className="text-xs text-muted-foreground">{ex.triggerType}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Started {new Date(ex.startedAt).toLocaleString()}
                  {ex.completedAt ? ` · ${durationLabel(ex.startedAt, ex.completedAt)}` : ""}
                  {ex.retryCount ? ` · retries ${ex.retryCount}` : ""}
                </p>
                {ex.error || ex.lastError ? (
                  <p className="mt-1 truncate text-xs text-destructive">{ex.error ?? ex.lastError}</p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <section className="surface-card space-y-3 p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select an execution.</p>
          ) : (
            <>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Flow</span> · {selected.flowName ?? selected.flowId}
                </p>
                <p>
                  <span className="text-muted-foreground">Execution</span> ·{" "}
                  <code className="text-xs">{selected.id}</code>
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge label={selected.status} tone={tone(selected.status)} />
                </p>
                <p>
                  <span className="text-muted-foreground">Started</span> ·{" "}
                  {new Date(selected.startedAt).toLocaleString()}
                </p>
                <p>
                  <span className="text-muted-foreground">Completed</span> ·{" "}
                  {selected.completedAt ? new Date(selected.completedAt).toLocaleString() : "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Duration</span> ·{" "}
                  {durationLabel(selected.startedAt, selected.completedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Retry count</span> · {selected.retryCount}
                  {selected.nextRetryAt
                    ? ` · next ${new Date(selected.nextRetryAt).toLocaleString()}`
                    : ""}
                </p>
                {selected.error || selected.lastError ? (
                  <p className="text-destructive">
                    <span className="text-muted-foreground">Error</span> · {selected.error ?? selected.lastError}
                  </p>
                ) : null}
              </div>

              <h3 className="text-sm font-semibold">Nodes</h3>
              <ol className="space-y-2 text-sm">
                {selected.steps.map((s) => (
                  <li key={s.id} className="rounded-md border p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={s.status} tone={tone(s.status)} />
                      <span className="font-medium">{s.nodeType}</span>
                      <span className="text-xs text-muted-foreground">{s.nodeId}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}
                      {s.completedAt ? ` → ${new Date(s.completedAt).toLocaleString()}` : ""}
                      {s.durationMs != null ? ` · ${s.durationMs}ms` : ""}
                    </p>
                    {s.error ? <p className="mt-1 text-xs text-destructive">{s.error}</p> : null}
                  </li>
                ))}
              </ol>

              {selected.status === "FAILED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void apiPost(`/api/v1/whatsapp-automation/executions/${selected.id}/retry`)
                      .then(() => {
                        toast.success("Retry started");
                        return load();
                      })
                      .catch((err) =>
                        toast.error(err instanceof ApiError ? err.message : "Retry failed"),
                      );
                  }}
                >
                  Retry execution
                </Button>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
