"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pause, Play, Plus, Archive } from "lucide-react";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type FlowRow = {
  id: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  triggerType: string;
  isLibrary: boolean;
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

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <PageHeader
        title="Flows"
        subtitle="Clinic automation workflows. Recommended flows stay draft until you duplicate and activate."
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
        <EmptyState
          title="No flows yet"
          description="Create a flow or open Recommended to duplicate a clinic starter."
          action={
            <Button asChild>
              <Link href="/whatsapp/flows/new">Create Flow</Link>
            </Button>
          }
        />
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
            <div className="flex flex-wrap gap-2">
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
