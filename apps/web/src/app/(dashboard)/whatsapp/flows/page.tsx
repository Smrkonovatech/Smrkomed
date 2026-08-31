"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pause, Play, Plus, Archive } from "lucide-react";

import { PreviewBanner, WaStatusPill } from "@/components/whatsapp/center/section";
import { EmptyState, LoadingRows } from "@/components/ui-kit";
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

const DEMO_FLOWS: FlowRow[] = [
  {
    id: "demo-ivf-monitoring",
    name: "IVF Monitoring Follow-up",
    description: "Care task due → WhatsApp → confirm → report request → escalate if unresolved.",
    status: "ACTIVE",
    triggerType: "CARE_TASK_DUE",
    isLibrary: false,
    lastRunAt: new Date().toISOString(),
    successRate: 94,
    patientsReached: 213,
    createdByName: "Meera Iyer",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-med",
    name: "Medication Reminder",
    description: "Reminds patients about doctor-approved medication instructions.",
    status: "ACTIVE",
    triggerType: "MEDICINE_REMINDER",
    isLibrary: false,
    lastRunAt: new Date().toISOString(),
    successRate: 98,
    patientsReached: 842,
    createdByName: "Kavya Sharma",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-report",
    name: "Report Collection",
    description: "Request scan report after monitoring, follow up if missing.",
    status: "PAUSED",
    triggerType: "CARE_TASK_OVERDUE",
    isLibrary: false,
    lastRunAt: null,
    successRate: 81,
    patientsReached: 64,
    createdByName: "Meera Iyer",
    updatedAt: new Date().toISOString(),
  },
];

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
  const [usingDemo, setUsingDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter === "LIBRARY") params.set("status", "LIBRARY");
      else if (filter !== "ALL") params.set("status", filter);
      if (q.trim()) params.set("q", q.trim());
      const next = await apiGet<FlowRow[]>(`/api/v1/whatsapp-automation/flows?${params}`);
      if (!next.length && filter === "ALL" && !q.trim()) {
        setRows(DEMO_FLOWS);
        setUsingDemo(true);
      } else {
        setRows(next);
        setUsingDemo(false);
      }
    } catch (err) {
      setRows(DEMO_FLOWS);
      setUsingDemo(true);
      setError(err instanceof ApiError ? err.message : null);
    } finally {
      setLoading(false);
    }
  }, [filter, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (usingDemo) {
      return DEMO_FLOWS.filter((r) => {
        if (filter === "ALL" || filter === "LIBRARY") return true;
        return r.status === filter;
      }).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.toLowerCase()));
    }
    if (filter === "ALL") return rows.filter((r) => !r.isLibrary);
    return rows;
  }, [rows, filter, usingDemo, q]);

  async function act(id: string, action: "duplicate" | "activate" | "pause" | "archive") {
    if (usingDemo || id.startsWith("demo-")) {
      toast.message("Connect clinic automation to manage live flows.");
      return;
    }
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Care Workflow Builder</h2>
          <p className="text-sm text-muted-foreground">
            Visual automations that connect Care Loop stages to WhatsApp — understandable by clinic coordinators.
          </p>
        </div>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/whatsapp/flows/new">
            <Plus className="mr-1 size-4" />
            Create Flow
          </Link>
        </Button>
      </div>

      {usingDemo ? <PreviewBanner /> : null}
      {error && !usingDemo ? (
        <EmptyState title="Unable to load flows" description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "ACTIVE", "DRAFT", "PAUSED", "LIBRARY", "ARCHIVED"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setFilter(f)}
          >
            {f === "LIBRARY" ? "Recommended" : f.charAt(0) + f.slice(1).toLowerCase()}
          </Button>
        ))}
        <Input
          className="ml-auto max-w-xs rounded-xl"
          placeholder="Search flows"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? <LoadingRows rows={5} /> : null}
      {!loading && visible.length === 0 ? (
        <EmptyState
          title="No flows yet"
          description="Create the flagship IVF Monitoring Follow-up or open Recommended starters."
          action={
            <Button asChild className="rounded-xl">
              <Link href="/whatsapp/flows/new">Create Flow</Link>
            </Button>
          }
        />
      ) : null}

      <ul className="grid gap-3 lg:grid-cols-2">
        {visible.map((flow) => (
          <li key={flow.id} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={usingDemo ? "/whatsapp/flows/new" : `/whatsapp/flows/${flow.id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {flow.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{flow.description ?? "No description"}</p>
              </div>
              <WaStatusPill
                label={flow.isLibrary ? "Recommended" : flow.status}
                tone={flow.isLibrary ? "warning" : tone(flow.status)}
              />
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <div>
                <dt className="font-medium text-foreground">Starts when</dt>
                <dd>{flow.triggerType.replaceAll("_", " ").toLowerCase()}</dd>
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
                <dt className="font-medium text-foreground">Patients</dt>
                <dd>{flow.patientsReached == null ? "—" : flow.patientsReached}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href={usingDemo ? "/whatsapp/flows/new" : `/whatsapp/flows/${flow.id}`}>
                  {usingDemo ? "Build this" : "Open"}
                </Link>
              </Button>
              {!usingDemo ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={busyId === flow.id}
                    onClick={() => void act(flow.id, "duplicate")}
                  >
                    <Copy className="mr-1 size-3.5" />
                    Duplicate
                  </Button>
                  {!flow.isLibrary && flow.status !== "ACTIVE" ? (
                    <Button
                      size="sm"
                      className="rounded-xl"
                      disabled={busyId === flow.id}
                      onClick={() => void act(flow.id, "activate")}
                    >
                      <Play className="mr-1 size-3.5" />
                      Activate
                    </Button>
                  ) : null}
                  {!flow.isLibrary && flow.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
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
                      className="rounded-xl"
                      disabled={busyId === flow.id}
                      onClick={() => void act(flow.id, "archive")}
                    >
                      <Archive className="mr-1 size-3.5" />
                      Archive
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
