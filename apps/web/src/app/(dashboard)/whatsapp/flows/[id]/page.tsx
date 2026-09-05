"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Pause, Play, Save, Trash2 } from "lucide-react";

import {
  FLOW_PALETTE,
  MobileNodeList,
  WhatsAppFlowCanvas,
  addPaletteNode,
  type FlowDefinition,
} from "@/components/whatsapp/flow-canvas";
import { SendTemplateNodePanel } from "@/components/whatsapp/send-template-node-panel";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";

type FlowDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  definition: FlowDefinition;
  isLibrary: boolean;
  isSystem?: boolean;
  successCount: number;
  failureCount: number;
  successRate: number | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PatientOption = { id: string; firstName: string; lastName: string };
type ExecutionRow = {
  id: string;
  status: string;
  currentNodeId: string | null;
  error: string | null;
  resumeAt: string | null;
  retryCount?: number;
  lastAttemptAt?: string | null;
  startedAt: string;
  steps: Array<{
    nodeId: string;
    nodeType: string;
    status: string;
    error: string | null;
    output?: Record<string, unknown> | null;
  }>;
};

export default function WhatsAppFlowBuilderPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [flow, setFlow] = useState<FlowDetail | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [definition, setDefinition] = useState<FlowDefinition>({ nodes: [], edges: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FlowDefinition[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [testPatientId, setTestPatientId] = useState("");
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [testEvent, setTestEvent] = useState<
    "none" | "incoming_whatsapp" | "appointment" | "care_loop"
  >("none");
  const [configOpen, setConfigOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<FlowDetail>(`/api/v1/whatsapp-automation/flows/${id}`);
      setFlow(next);
      setName(next.name);
      setDescription(next.description ?? "");
      setDefinition(next.definition);
      setSelectedId(next.definition.nodes.find((n) => n.type === "TRIGGER")?.id ?? null);
      const exec = await apiGet<{ items: ExecutionRow[] }>(
        `/api/v1/whatsapp-automation/executions?flowId=${id}&pageSize=8`,
      ).catch(() => ({ items: [] as ExecutionRow[] }));
      setExecutions(exec.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load flow");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void apiGet<PatientOption[]>("/api/v1/patients")
      .then((list) => setPatients(Array.isArray(list) ? list.slice(0, 50) : []))
      .catch(() => setPatients([]));
  }, []);

  const selected = useMemo(
    () => definition.nodes.find((n) => n.id === selectedId) ?? null,
    [definition, selectedId],
  );
  const readOnly = Boolean(flow?.isLibrary || flow?.isSystem);

  function pushHistory(next: FlowDefinition) {
    setHistory((h) => [...h.slice(-29), definition]);
    setDefinition(next);
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      setDefinition(h[h.length - 1]!);
      return h.slice(0, -1);
    });
  }

  function updateSelected(patch: Partial<{ label: string; config: Record<string, unknown> }>) {
    if (!selected || readOnly) return;
    pushHistory({
      ...definition,
      nodes: definition.nodes.map((n) =>
        n.id === selected.id
          ? { ...n, ...patch, config: patch.config ?? n.config }
          : n,
      ),
    });
  }

  function deleteSelected() {
    if (!selected || selected.type === "TRIGGER" || readOnly) {
      toast.error(selected?.type === "TRIGGER" ? "Trigger cannot be deleted." : "Cannot edit system template.");
      return;
    }
    pushHistory({
      nodes: definition.nodes.filter((n) => n.id !== selected.id),
      edges: definition.edges.filter((e) => e.source !== selected.id && e.target !== selected.id),
    });
    setSelectedId(null);
  }

  async function saveDraft() {
    if (readOnly) return;
    setSaving(true);
    try {
      const next = await apiPatch<FlowDetail>(`/api/v1/whatsapp-automation/flows/${id}`, {
        name,
        description: description || null,
        definition,
        status: flow?.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
      });
      setFlow(next);
      toast.success("Draft saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function activate() {
    if (readOnly) return;
    setSaving(true);
    try {
      await apiPatch(`/api/v1/whatsapp-automation/flows/${id}`, {
        name,
        description: description || null,
        definition,
      });
      const next = await apiPost<FlowDetail>(`/api/v1/whatsapp-automation/flows/${id}/activate`);
      setFlow(next);
      toast.success("Flow activated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Activate failed");
    } finally {
      setSaving(false);
    }
  }

  async function pause() {
    try {
      const next = await apiPost<FlowDetail>(`/api/v1/whatsapp-automation/flows/${id}/pause`);
      setFlow(next);
      toast.success("Flow paused");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Pause failed");
    }
  }

  async function testSim() {
    setTestResult(null);
    try {
      if (!readOnly) {
        await apiPatch(`/api/v1/whatsapp-automation/flows/${id}`, {
          definition,
          name,
          description: description || null,
        });
      }
      const result = await apiPost<{
        mode: string;
        label?: string;
        note: string;
        execution: ExecutionRow;
      }>(`/api/v1/whatsapp-automation/flows/${id}/test`, {
        ...(testPatientId ? { patientId: testPatientId } : {}),
        vars: {
          patient_name: "Test Patient",
          clinic_name: "Clinic",
          "patient.firstName": "Priya",
          "appointment.date": "2 Sep 2026",
          "appointment.time": "10:30 AM",
        },
        simulateBranch: "no",
        simulateEvent: testEvent,
      });
      const tplSteps = result.execution.steps.filter((s) => s.nodeType === "SEND_TEMPLATE");
      const tplSummary = tplSteps
        .map((s) => {
          const out = s.output ?? {};
          const bits = [
            out["templateName"] ? `template=${String(out["templateName"])}` : null,
            out["valid"] === false ? "INVALID mapping" : out["valid"] === true ? "vars OK" : null,
            out["error"] ? String(out["error"]) : null,
            out["reason"] ? String(out["reason"]) : null,
            s.error,
          ].filter(Boolean);
          return bits.join(" · ") || s.status;
        })
        .join("; ");
      setTestResult(
        `${result.label ?? result.mode}: ${result.execution.status} — ${result.execution.steps.length} steps. ${result.note}${
          tplSummary ? ` | SEND_TEMPLATE: ${tplSummary}` : ""
        }`,
      );
      toast.success("TEST MODE — no WhatsApp message sent");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Test failed");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Flow builder" subtitle="Loading…" />
        <LoadingRows rows={6} />
      </div>
    );
  }

  if (error || !flow) {
    return (
      <EmptyState
        title="Flow not found"
        description={error ?? "Check the URL or your clinic access."}
        action={
          <Button asChild>
            <Link href="/whatsapp/flows">Back to flows</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-3">
      <PageHeader
        title={name || "Flow"}
        subtitle={`${flow.triggerType.replaceAll("_", " ")} · ${readOnly ? "SYSTEM TEMPLATE" : flow.status}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/whatsapp/flows">Flows</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={undo} disabled={!history.length || readOnly}>
              Undo
            </Button>
            <Button size="sm" variant="outline" onClick={() => void testSim()}>
              <FlaskConical className="mr-1 size-3.5" />
              Test
            </Button>
            <Button size="sm" onClick={() => void saveDraft()} disabled={saving || readOnly}>
              <Save className="mr-1 size-3.5" />
              Save draft
            </Button>
            {flow.status === "ACTIVE" ? (
              <Button size="sm" variant="outline" onClick={() => void pause()} disabled={readOnly}>
                <Pause className="mr-1 size-3.5" />
                Pause
              </Button>
            ) : (
              <Button size="sm" onClick={() => void activate()} disabled={saving || readOnly}>
                <Play className="mr-1 size-3.5" />
                Activate
              </Button>
            )}
          </div>
        }
      />

      {readOnly ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          SYSTEM TEMPLATE — view and duplicate only. Duplicate from the Flows list to create a CUSTOM editable flow.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Success: {flow.successRate == null ? "No data" : `${flow.successRate}%`}</span>
        <span>Failures: {flow.failureCount}</span>
        <span>Last run: {flow.lastRunAt ? new Date(flow.lastRunAt).toLocaleString() : "Never"}</span>
        <span>Updated: {new Date(flow.updatedAt).toLocaleString()}</span>
      </div>

      <div className="surface-card flex flex-wrap items-end gap-3 p-3">
        <div className="space-y-1">
          <Label className="text-xs">TEST MODE patient (optional)</Label>
          <select
            className="flex h-9 min-w-[200px] rounded-md border bg-background px-2 text-sm"
            value={testPatientId}
            onChange={(e) => setTestPatientId(e.target.value)}
          >
            <option value="">No patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Simulate event</Label>
          <select
            className="flex h-9 min-w-[180px] rounded-md border bg-background px-2 text-sm"
            value={testEvent}
            onChange={(e) =>
              setTestEvent(e.target.value as "none" | "incoming_whatsapp" | "appointment" | "care_loop")
            }
          >
            <option value="none">None</option>
            <option value="incoming_whatsapp">Incoming WhatsApp</option>
            <option value="appointment">Appointment</option>
            <option value="care_loop">Care Loop</option>
          </select>
        </div>
        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
          TEST MODE — NO MESSAGE WILL BE SENT
        </p>
      </div>

      {testResult ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{testResult}</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
        <aside className="surface-card hidden space-y-2 p-3 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nodes</p>
          {FLOW_PALETTE.map((item) => (
            <Button
              key={item.type}
              size="sm"
              variant="outline"
              className="w-full justify-start"
              disabled={readOnly}
              onClick={() => pushHistory(addPaletteNode(definition, item.type, { ...item.defaults }))}
            >
              {item.label}
            </Button>
          ))}
        </aside>

        <section className="space-y-3">
          <div className="hidden md:block">
            <WhatsAppFlowCanvas
              definition={definition}
              readOnly={readOnly}
              selectedId={selectedId}
              onSelect={(nid) => {
                setSelectedId(nid);
                setConfigOpen(true);
              }}
              onChange={(next) => {
                if (readOnly) return;
                pushHistory(next);
              }}
            />
          </div>
          <MobileNodeList
            definition={definition}
            selectedId={selectedId}
            onSelect={(nid) => {
              setSelectedId(nid);
              setConfigOpen(true);
            }}
          />
          <div className="flex flex-wrap gap-2 md:hidden">
            {FLOW_PALETTE.slice(0, 5).map((item) => (
              <Button
                key={item.type}
                size="sm"
                variant="outline"
                disabled={readOnly}
                onClick={() => pushHistory(addPaletteNode(definition, item.type, { ...item.defaults }))}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </section>

        <aside
          className={`surface-card space-y-3 p-3 ${configOpen ? "" : "hidden lg:block"} max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[70vh] max-lg:overflow-y-auto max-lg:rounded-t-2xl max-lg:border-t max-lg:shadow-lg`}
        >
          <div className="flex items-center justify-between lg:hidden">
            <p className="text-sm font-semibold">Configure node</p>
            <Button size="sm" variant="ghost" onClick={() => setConfigOpen(false)}>
              Close
            </Button>
          </div>
          <p className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
            Flow
          </p>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              disabled={readOnly}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {selected ? (
            <>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected · {selected.type}
              </p>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={selected.label}
                  disabled={readOnly}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                />
              </div>
              {selected.type === "SEND_TEMPLATE" ? (
                <SendTemplateNodePanel
                  config={selected.config}
                  readOnly={readOnly}
                  onChange={(next) => updateSelected({ config: next })}
                />
              ) : null}
              {selected.type === "SEND_TEXT" ? (
                <div className="space-y-2">
                  <Label>Message body</Label>
                  <Textarea
                    value={String(selected.config["body"] ?? selected.config["text"] ?? "")}
                    disabled={readOnly}
                    rows={4}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, body: e.target.value } })
                    }
                    placeholder="Requires an open WhatsApp session (conversation)."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Uses the existing session text send. Outside the 24h window, use Send template.
                  </p>
                </div>
              ) : null}
              {selected.type === "SEND_MEDIA" ? (
                <div className="space-y-2">
                  <Label>Patient document ID</Label>
                  <Input
                    value={String(selected.config["documentId"] ?? "")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, documentId: e.target.value } })
                    }
                    placeholder="Document id from patient chart"
                  />
                  <Label>Caption (optional)</Label>
                  <Input
                    value={String(selected.config["caption"] ?? "")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, caption: e.target.value } })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Uses existing outbound media + patient document storage. Needs conversationId at
                    runtime.
                  </p>
                </div>
              ) : null}
              {selected.type === "AI_DRAFT" ? (
                <div className="space-y-2">
                  <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                    Uses clinic Knowledge Base + safety rules. Default is draft (no WhatsApp send).
                    Set mode to Send only when the flow should explicitly send.
                  </p>
                  <Label>Mode</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={String(selected.config["mode"] ?? "draft")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, mode: e.target.value } })
                    }
                  >
                    <option value="draft">Draft only (review)</option>
                    <option value="send">Send via WhatsApp</option>
                  </select>
                  <Label>Prompt hint</Label>
                  <Textarea
                    value={String(selected.config["promptHint"] ?? "")}
                    disabled={readOnly}
                    rows={3}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, promptHint: e.target.value } })
                    }
                    placeholder="Optional instruction for Smrko AI"
                  />
                  <Label>Tone</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={String(selected.config["tone"] ?? "clinical_empathetic")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, tone: e.target.value } })
                    }
                  >
                    <option value="clinical_empathetic">Clinical · empathetic</option>
                    <option value="concise">Concise</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
              ) : null}
              {selected.type === "ASSIGN_STAFF" ? (
                <div className="space-y-2">
                  <Label>Staff user ID</Label>
                  <Input
                    value={String(selected.config["assigneeId"] ?? "")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, assigneeId: e.target.value } })
                    }
                    placeholder="User id"
                  />
                  <Label>Task title</Label>
                  <Input
                    value={String(selected.config["title"] ?? "Staff assignment")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, title: e.target.value } })
                    }
                  />
                </div>
              ) : null}
              {selected.type === "WAIT" ? (
                <div className="space-y-2">
                  <Label>Wait mode</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={String(selected.config["mode"] ?? "duration")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, mode: e.target.value } })
                    }
                  >
                    <option value="duration">Duration</option>
                    <option value="wait_for_reply">Wait for patient reply</option>
                    <option value="before_appointment">Before appointment</option>
                    <option value="until_datetime">Until date/time</option>
                    <option value="at_time">Until clock time</option>
                  </select>
                  {String(selected.config["mode"]) === "wait_for_reply" ? (
                    <div className="space-y-1">
                      <Label>Timeout hours (0 = until reply only)</Label>
                      <Input
                        type="number"
                        disabled={readOnly}
                        value={Number(selected.config["timeoutHours"] ?? 0)}
                        onChange={(e) =>
                          updateSelected({
                            config: { ...selected.config, timeoutHours: Number(e.target.value) },
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Persists WAITING on conversationId. Resumes when patient sends WhatsApp.
                      </p>
                    </div>
                  ) : null}
                  {String(selected.config["mode"] ?? "duration") === "duration" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        disabled={readOnly}
                        value={Number(selected.config["amount"] ?? 0)}
                        onChange={(e) =>
                          updateSelected({ config: { ...selected.config, amount: Number(e.target.value) } })
                        }
                        placeholder="Amount"
                      />
                      <select
                        className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={String(selected.config["unit"] ?? "hours")}
                        disabled={readOnly}
                        onChange={(e) =>
                          updateSelected({ config: { ...selected.config, unit: e.target.value } })
                        }
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  ) : null}
                  {String(selected.config["mode"]) === "before_appointment" ? (
                    <div className="space-y-1">
                      <Label>Hours before appointment</Label>
                      <Input
                        type="number"
                        disabled={readOnly}
                        value={Number(selected.config["hoursBefore"] ?? 24)}
                        onChange={(e) =>
                          updateSelected({
                            config: { ...selected.config, hoursBefore: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  ) : null}
                  {String(selected.config["mode"]) === "until_datetime" ? (
                    <div className="space-y-1">
                      <Label>Until (ISO date/time)</Label>
                      <Input
                        disabled={readOnly}
                        value={String(selected.config["until"] ?? "")}
                        onChange={(e) =>
                          updateSelected({ config: { ...selected.config, until: e.target.value } })
                        }
                        placeholder="2026-09-01T09:00:00"
                      />
                    </div>
                  ) : null}
                  {String(selected.config["mode"]) === "at_time" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        disabled={readOnly}
                        value={Number(selected.config["hour"] ?? 9)}
                        onChange={(e) =>
                          updateSelected({ config: { ...selected.config, hour: Number(e.target.value) } })
                        }
                        placeholder="Hour"
                      />
                      <Input
                        type="number"
                        disabled={readOnly}
                        value={Number(selected.config["minute"] ?? 0)}
                        onChange={(e) =>
                          updateSelected({
                            config: { ...selected.config, minute: Number(e.target.value) },
                          })
                        }
                        placeholder="Minute"
                      />
                    </div>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    WAIT is durable (`resumeAt`). Production worker resumes — not a browser timer.
                  </p>
                </div>
              ) : null}
              {selected.type === "WAIT_FOR_REPLY" ? (
                <div className="space-y-2">
                  <Label>Timeout hours (0 = until reply only)</Label>
                  <Input
                    type="number"
                    disabled={readOnly}
                    value={Number(selected.config["timeoutHours"] ?? 0)}
                    onChange={(e) =>
                      updateSelected({
                        config: { ...selected.config, timeoutHours: Number(e.target.value) },
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Durable wait — stored on the execution (flowId, executionId, nodeId, conversationId,
                    clinicId). Resumes on inbound WhatsApp.
                  </p>
                </div>
              ) : null}
              {selected.type === "CONDITION" ? (
                <div className="space-y-2">
                  <Label>Field</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={String(selected.config["field"] ?? selected.config["kind"] ?? "")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({
                        config: { ...selected.config, field: e.target.value, kind: e.target.value },
                      })
                    }
                  >
                    {[
                      "communication.patient_replied",
                      "communication.no_response",
                      "communication.conversation_status",
                      "communication.message_text",
                      "message.content",
                      "message.type",
                      "patient.status",
                      "patient.stage",
                      "patient.inactive_days",
                      "staff.doctor",
                      "staff.coordinator",
                      "appointment.status",
                      "appointment.type",
                      "appointment.days_until",
                      "appointment.doctor",
                      "care_task.status",
                      "care_task.overdue",
                      "care_task.assigned",
                      "treatment.stage",
                      "treatment.status",
                      "journey.stage",
                      "care_loop.status",
                      "care_plan.status",
                      "medication.assigned",
                      "payment.pending",
                      "payment.paid",
                      "payment.overdue",
                      "workflow.has_tag",
                    ].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <Label>Operator</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={String(selected.config["operator"] ?? "truthy")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, operator: e.target.value } })
                    }
                  >
                    {["truthy", "equals", "not_equals", "contains", "gt", "gte", "lt", "lte", "in"].map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <Label>Value</Label>
                  <Input
                    value={String(selected.config["value"] ?? "")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, value: e.target.value } })
                    }
                  />
                </div>
              ) : null}
              {selected.type === "CREATE_TASK" || selected.type === "ASSIGN_TASK" ? (
                <div className="space-y-2">
                  <Label>Task title</Label>
                  <Input
                    value={String(selected.config["title"] ?? "")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, title: e.target.value } })
                    }
                  />
                </div>
              ) : null}
              {(selected.type === "ADD_TAG" || selected.type === "REMOVE_TAG") && (
                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Input
                    value={String(selected.config["tag"] ?? "")}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateSelected({ config: { ...selected.config, tag: e.target.value } })
                    }
                  />
                </div>
              )}
              <Button size="sm" variant="ghost" disabled={readOnly} onClick={deleteSelected}>
                <Trash2 className="mr-1 size-3.5" />
                Delete node
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a node to configure.</p>
          )}
        </aside>
      </div>

      <section className="surface-card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Recent executions</h2>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No executions yet. Use Test or activate a live trigger.</p>
        ) : (
          <ul className="space-y-3">
            {executions.map((ex) => (
              <li key={ex.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={ex.status}
                    tone={
                      ex.status === "COMPLETED"
                        ? "success"
                        : ex.status === "FAILED"
                          ? "danger"
                          : ex.status === "WAITING"
                            ? "warning"
                            : "muted"
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {new Date(ex.startedAt).toLocaleString()}
                    {ex.resumeAt ? ` · next ${new Date(ex.resumeAt).toLocaleString()}` : ""}
                    {ex.retryCount ? ` · retries ${ex.retryCount}` : ""}
                  </span>
                  <Link href="/whatsapp/logs" className="ml-auto text-xs text-primary hover:underline">
                    Logs
                  </Link>
                </div>
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {ex.steps.map((s, i) => (
                    <li key={i}>
                      {s.status === "COMPLETED" ? "✓" : s.status === "FAILED" ? "✕" : "○"} {s.nodeType}
                      {s.error ? ` — ${s.error}` : ""}
                    </li>
                  ))}
                  {ex.status === "WAITING" ? <li>⏳ WAIT / retry scheduled</li> : null}
                </ol>
                {ex.error ? <p className="mt-1 text-xs text-destructive">{ex.error}</p> : null}
                {ex.status === "FAILED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      void apiPost(`/api/v1/whatsapp-automation/executions/${ex.id}/retry`)
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
