"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  Info,
  Layers,
  ListFilter,
  Maximize2,
  Pause,
  Phone,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Trash2,
  Undo2,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import {
  CATEGORIZED_PALETTE,
  FLOW_PALETTE,
  MobileNodeList,
  NodePaletteSidebar,
  WhatsAppFlowCanvas,
  addPaletteNode,
  type FlowDefinition,
} from "@/components/whatsapp/flow-canvas";
import { WhatsAppPhoneSimulator } from "@/components/whatsapp/whatsapp-phone-simulator";
import { SendTemplateNodePanel } from "@/components/whatsapp/send-template-node-panel";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

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

type PatientOption = { id: string; firstName: string; lastName: string; phone?: string | null };

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

type ValidationIssue = { code: string; message: string; nodeId?: string };

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
  const [redoStack, setRedoStack] = useState<FlowDefinition[]>([]);

  // Right Panel State
  const [rightPanelTab, setRightPanelTab] = useState<"inspector" | "testing">("inspector");

  // Testing & Simulation State
  const [testMode, setTestMode] = useState<"SIMULATOR" | "LIVE_WHATSAPP">("SIMULATOR");
  const [testPatientId, setTestPatientId] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [confirmLiveTestModalOpen, setConfirmLiveTestModalOpen] = useState(false);
  const [testingLive, setTestingLive] = useState(false);
  const [testResult, setTestResult] = useState<{
    mode: string;
    label?: string;
    note: string;
    recipientPhone?: string;
    execution: ExecutionRow;
  } | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [activeConsoleExecution, setActiveConsoleExecution] = useState<ExecutionRow | null>(null);

  // Validation State
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[] | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);

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
      if (exec.items.length > 0 && exec.items[0]) {
        setActiveConsoleExecution(exec.items[0]);
      }
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
      .then((list) => {
        if (Array.isArray(list)) {
          setPatients(list.slice(0, 60));
          if (list.length > 0 && list[0]?.phone) {
            setTestPhoneNumber(list[0].phone);
            setTestPatientId(list[0].id);
          }
        }
      })
      .catch(() => setPatients([]));
  }, []);

  const selected = useMemo(
    () => definition.nodes.find((n) => n.id === selectedId) ?? null,
    [definition, selectedId],
  );
  const readOnly = Boolean(flow?.isLibrary || flow?.isSystem);

  function pushHistory(next: FlowDefinition) {
    setHistory((h) => [...h.slice(-29), definition]);
    setRedoStack([]);
    setDefinition(next);
  }

  function handleUndo() {
    if (!history.length) return;
    const prev = history[history.length - 1]!;
    setRedoStack((r) => [...r, definition]);
    setHistory((h) => h.slice(0, -1));
    setDefinition(prev);
  }

  function handleRedo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1]!;
    setHistory((h) => [...h, definition]);
    setRedoStack((r) => r.slice(0, -1));
    setDefinition(next);
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

  function duplicateNode(nodeId: string) {
    if (readOnly) return;
    const target = definition.nodes.find((n) => n.id === nodeId);
    if (!target || target.type === "TRIGGER" || target.type === "END") return;

    const newId = `n_${Math.random().toString(36).slice(2, 9)}`;
    const newNode = {
      ...target,
      id: newId,
      label: `${target.label} (Copy)`,
      position: {
        x: (target.position?.x ?? 250) + 40,
        y: (target.position?.y ?? 200) + 60,
      },
    };
    pushHistory({
      ...definition,
      nodes: [...definition.nodes, newNode],
    });
    setSelectedId(newId);
    toast.success(`Duplicated ${target.label}`);
  }

  function deleteNode(nodeId: string) {
    if (readOnly) return;
    const target = definition.nodes.find((n) => n.id === nodeId);
    if (!target) return;
    if (target.type === "TRIGGER") {
      toast.error("Trigger node cannot be deleted.");
      return;
    }
    pushHistory({
      nodes: definition.nodes.filter((n) => n.id !== nodeId),
      edges: definition.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    if (selectedId === nodeId) {
      setSelectedId(null);
    }
    toast.info(`Deleted ${target.label}`);
  }

  async function handleAddPaletteNode(type: string, defaults: Record<string, unknown>) {
    if (readOnly) return;
    const next = addPaletteNode(definition, type, defaults);
    pushHistory(next);
    const added = next.nodes[next.nodes.length - (next.nodes.some((n) => n.type === "END") ? 2 : 1)];
    if (added) {
      setSelectedId(added.id);
    }
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
      toast.success("Draft saved successfully");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function validateFlow() {
    setValidating(true);
    try {
      const res = await apiPost<{ issues: ValidationIssue[] }>(
        `/api/v1/whatsapp-automation/flows/${id}/validate`,
      );
      setValidationIssues(res.issues);
      setValidationModalOpen(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  async function activateFlow() {
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
      toast.success("Flow published and activated!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Activation failed");
    } finally {
      setSaving(false);
    }
  }

  async function pauseFlow() {
    try {
      const next = await apiPost<FlowDetail>(`/api/v1/whatsapp-automation/flows/${id}/pause`);
      setFlow(next);
      toast.success("Flow paused");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Pause failed");
    }
  }

  async function runSimulationTest() {
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
        simulateEvent: "incoming_whatsapp",
        mode: "SIMULATION",
        ...(testPatientId ? { patientId: testPatientId } : {}),
      });
      setTestResult(result);
      setActiveConsoleExecution(result.execution);
      setExecutions((prev) => [result.execution, ...prev.slice(0, 7)]);
      toast.success("Simulation test executed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Simulation failed");
    }
  }

  async function runLiveWhatsAppTest() {
    setConfirmLiveTestModalOpen(false);
    setTestingLive(true);
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
        recipientPhone?: string;
        execution: ExecutionRow;
      }>(`/api/v1/whatsapp-automation/flows/${id}/test`, {
        mode: "LIVE_WHATSAPP",
        recipientPhone: testPhoneNumber,
        ...(testPatientId ? { patientId: testPatientId } : {}),
      });
      setTestResult(result);
      setActiveConsoleExecution(result.execution);
      setExecutions((prev) => [result.execution, ...prev.slice(0, 7)]);
      toast.success(`Live test sent to ${result.recipientPhone || testPhoneNumber}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Live test failed");
    } finally {
      setTestingLive(false);
    }
  }

  function handleInsertVariable(varName: string) {
    if (!selected || readOnly) return;
    const currentBody = String(selected.config["body"] || "");
    updateSelected({
      config: { ...selected.config, body: `${currentBody} {{${varName}}}` },
    });
  }

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col space-y-2">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="size-8 p-0">
            <Link href="/whatsapp/flows" title="Back to flows list">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Input
                value={name}
                disabled={readOnly}
                onChange={(e) => setName(e.target.value)}
                className="h-8 max-w-xs font-semibold text-sm border-transparent hover:border-border focus:border-primary"
              />
              <StatusBadge
                label={flow?.isLibrary ? "SYSTEM TEMPLATE" : flow?.status ?? "DRAFT"}
                tone={flow?.isLibrary ? "warning" : flow?.status === "ACTIVE" ? "success" : "warning"}
              />
            </div>
            <p className="text-[11px] text-muted-foreground px-1 truncate max-w-md">
              {description || "No flow description"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={validating}
            onClick={() => void validateFlow()}
          >
            <ShieldAlert className="mr-1 size-3.5" />
            Validate Flow
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={saving || readOnly}
            onClick={() => void saveDraft()}
          >
            <Save className="mr-1 size-3.5" />
            Save Draft
          </Button>

          {!readOnly && flow?.status !== "ACTIVE" && (
            <Button size="sm" disabled={saving} onClick={() => void activateFlow()}>
              <Play className="mr-1 size-3.5" />
              Publish Flow
            </Button>
          )}

          {!readOnly && flow?.status === "ACTIVE" && (
            <Button size="sm" variant="outline" onClick={() => void pauseFlow()}>
              <Pause className="mr-1 size-3.5" />
              Pause Flow
            </Button>
          )}
        </div>
      </div>

      {/* Main 3-Column Layout: Palette | Canvas | Inspector & Testing */}
      <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden">
        {/* Left Column: Categorized Palette (2.5 cols) */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3 surface-card flex flex-col rounded-xl border p-2 overflow-hidden">
          <div className="flex items-center justify-between border-b pb-2 mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Node Palette
            </span>
            <span className="text-[10px] text-muted-foreground">Drag to Canvas</span>
          </div>
          <NodePaletteSidebar
            onAddNode={handleAddPaletteNode}
            readOnly={readOnly}
          />
        </div>

        {/* Center Column: Visual Canvas (6 cols) */}
        <div className="col-span-12 md:col-span-9 lg:col-span-6 flex flex-col rounded-xl border bg-card overflow-hidden">
          <WhatsAppFlowCanvas
            definition={definition}
            readOnly={readOnly}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={pushHistory}
            onDuplicateNode={duplicateNode}
            onDeleteNode={deleteNode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.length > 0}
            canRedo={redoStack.length > 0}
          />
        </div>

        {/* Right Column: Inspector & Live Testing (3.5 cols) */}
        <div className="col-span-12 lg:col-span-3 surface-card flex flex-col rounded-xl border overflow-hidden">
          {/* Top Panel Tab Bar */}
          <div className="flex border-b bg-muted/30 p-1">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-md py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                rightPanelTab === "inspector"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setRightPanelTab("inspector")}
            >
              <Settings className="size-3.5" />
              Inspector
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-md py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                rightPanelTab === "testing"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setRightPanelTab("testing")}
            >
              <Smartphone className="size-3.5" />
              Simulator & Test
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rightPanelTab === "inspector" && (
              <div className="space-y-4">
                {selected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-primary">
                          {selected.type.replaceAll("_", " ")}
                        </p>
                        <Input
                          value={selected.label}
                          disabled={readOnly}
                          onChange={(e) => updateSelected({ label: e.target.value })}
                          className="h-7 text-xs font-medium mt-0.5"
                        />
                      </div>
                      {!readOnly && selected.type !== "TRIGGER" && selected.type !== "END" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-destructive"
                          title="Delete Node"
                          onClick={() => deleteNode(selected.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Node-Specific Settings */}
                    {selected.type === "SEND_TEXT" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Message Copy</Label>
                        <Textarea
                          rows={4}
                          disabled={readOnly}
                          value={String(selected.config["body"] || "")}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, body: e.target.value },
                            })
                          }
                          placeholder="e.g. Absolutely! 👋 Who would you like to consult?"
                          className="text-xs"
                        />
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Insert Variables:</p>
                          <div className="flex flex-wrap gap-1">
                            {["patient.name", "doctor.name", "appointment.date", "appointment.time", "clinic.name"].map(
                              (v) => (
                                <button
                                  key={v}
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => handleInsertVariable(v)}
                                  className="rounded border bg-muted/60 px-1.5 py-0.5 text-[10px] hover:bg-muted"
                                >
                                  +{v}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {selected.type === "SEND_BUTTONS" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Body Text</Label>
                          <Textarea
                            rows={3}
                            disabled={readOnly}
                            value={String(selected.config["body"] || "")}
                            onChange={(e) =>
                              updateSelected({
                                config: { ...selected.config, body: e.target.value },
                              })
                            }
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-2 border-t pt-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Quick Reply Buttons (Max 3)</Label>
                            {Array.isArray(selected.config["buttons"]) &&
                              (selected.config["buttons"] as any[]).length < 3 &&
                              !readOnly && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] p-1"
                                  onClick={() => {
                                    const current = (selected.config["buttons"] as any[]) || [];
                                    const nextBtn = { id: `btn_${current.length + 1}`, title: `Option ${current.length + 1}` };
                                    updateSelected({
                                      config: { ...selected.config, buttons: [...current, nextBtn] },
                                    });
                                  }}
                                >
                                  + Add Button
                                </Button>
                              )}
                          </div>

                          <div className="space-y-1.5">
                            {Array.isArray(selected.config["buttons"]) &&
                              (selected.config["buttons"] as any[]).map((btn, idx) => (
                                <div key={idx} className="flex items-center gap-1 rounded border p-1.5 bg-muted/20">
                                  <Input
                                    value={btn.title || ""}
                                    disabled={readOnly}
                                    placeholder="Button Label"
                                    onChange={(e) => {
                                      const current = [...(selected.config["buttons"] as any[])];
                                      current[idx] = { ...current[idx], title: e.target.value };
                                      updateSelected({ config: { ...selected.config, buttons: current } });
                                    }}
                                    className="h-7 text-xs flex-1"
                                  />
                                  <Input
                                    value={btn.id || ""}
                                    disabled={readOnly}
                                    placeholder="Machine ID"
                                    onChange={(e) => {
                                      const current = [...(selected.config["buttons"] as any[])];
                                      current[idx] = { ...current[idx], id: e.target.value };
                                      updateSelected({ config: { ...selected.config, buttons: current } });
                                    }}
                                    className="h-7 text-[10px] w-24 font-mono"
                                  />
                                  {!readOnly && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = (selected.config["buttons"] as any[]).filter((_, i) => i !== idx);
                                        updateSelected({ config: { ...selected.config, buttons: current } });
                                      }}
                                      className="p-1 text-muted-foreground hover:text-destructive"
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selected.type === "SEND_LIST" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Prompt Copy</Label>
                          <Textarea
                            rows={2}
                            disabled={readOnly}
                            value={String(selected.config["body"] || "")}
                            onChange={(e) =>
                              updateSelected({
                                config: { ...selected.config, body: e.target.value },
                              })
                            }
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Bottom Sheet Button Label</Label>
                          <Input
                            value={String(selected.config["buttonText"] || "Select Option")}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateSelected({
                                config: { ...selected.config, buttonText: e.target.value },
                              })
                            }
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="space-y-1 border-t pt-2">
                          <Label className="text-xs">Data Source</Label>
                          <select
                            disabled={readOnly}
                            value={String(selected.config["dataSource"] || "custom")}
                            onChange={(e) =>
                              updateSelected({
                                config: { ...selected.config, dataSource: e.target.value },
                              })
                            }
                            className="flex h-8 w-full rounded-md border bg-background px-2 text-xs"
                          >
                            <option value="doctors">Available Clinic Doctors</option>
                            <option value="dates">Available Schedule Dates</option>
                            <option value="slots">Available Time Slots</option>
                            <option value="custom">Custom Sections / Rows</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {selected.type === "SEND_DOCTOR_CARD" && (
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-purple-50/50 p-2 text-xs dark:bg-purple-950/20">
                          <div className="flex items-center gap-2 font-medium text-purple-900 dark:text-purple-200">
                            <UserCheck className="size-4 text-purple-600" />
                            Doctor Profile Card
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Displays doctor photo, specialty, experience, languages, bio, and interactive slots button.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Card Header / Title</Label>
                          <Input
                            value={String(selected.config["header"] || "Specialist Profile")}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateSelected({ config: { ...selected.config, header: e.target.value } })
                            }
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {selected.type === "SEND_TEMPLATE" && (
                      <SendTemplateNodePanel
                        config={selected.config}
                        readOnly={readOnly}
                        onChange={(config) => updateSelected({ config })}
                      />
                    )}

                    {selected.type === "GET_AVAILABLE_DATES" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Days to Search Ahead</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={Number(selected.config["daysAhead"] ?? 7)}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, daysAhead: Number(e.target.value) },
                            })
                          }
                          className="h-7 text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Queries real appointment schedule slots within this calendar window.
                        </p>
                      </div>
                    )}

                    {selected.type === "HUMAN_HANDOFF" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Escalation Reason</Label>
                        <Input
                          value={String(selected.config["reason"] || "Patient requested human assistance")}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, reason: e.target.value },
                            })
                          }
                          className="h-7 text-xs"
                        />
                        <Label className="text-xs">Patient Handoff Notice</Label>
                        <Textarea
                          rows={2}
                          value={String(
                            selected.config["message"] ||
                              "I've connected you with our clinic team. A coordinator will reply shortly.",
                          )}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, message: e.target.value },
                            })
                          }
                          className="text-xs"
                        />
                      </div>
                    )}

                    {selected.type === "BOOK_APPOINTMENT" && (
                      <div className="rounded-lg border bg-emerald-50/50 p-2.5 text-xs dark:bg-emerald-950/20">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200">
                          <CalendarCheck className="size-4 text-emerald-700" />
                          Authoritative Appointment Booking
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                          Revalidates selected slot in PostgreSQL right before booking. Transaction safe, clinic-scoped, and duplicate-safe with idempotency key.
                        </p>
                      </div>
                    )}

                    {selected.type === "CREATE_TASK" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Care Task Title</Label>
                        <Input
                          value={String(selected.config["title"] || "WhatsApp Appointment Follow-up")}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, title: e.target.value },
                            })
                          }
                          className="h-7 text-xs"
                        />
                        <Label className="text-xs">Task Priority</Label>
                        <select
                          disabled={readOnly}
                          value={String(selected.config["priority"] || "NORMAL")}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, priority: e.target.value },
                            })
                          }
                          className="flex h-8 w-full rounded-md border bg-background px-2 text-xs"
                        >
                          <option value="HIGH">HIGH</option>
                          <option value="NORMAL">NORMAL</option>
                          <option value="LOW">LOW</option>
                        </select>
                      </div>
                    )}

                    {selected.type === "CONDITION" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Condition Field</Label>
                        <Input
                          value={String(selected.config["field"] || "communication.patient_replied")}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, field: e.target.value },
                            })
                          }
                          className="h-7 text-xs"
                        />
                        <Label className="text-xs">Operator</Label>
                        <select
                          disabled={readOnly}
                          value={String(selected.config["operator"] || "truthy")}
                          onChange={(e) =>
                            updateSelected({
                              config: { ...selected.config, operator: e.target.value },
                            })
                          }
                          className="flex h-8 w-full rounded-md border bg-background px-2 text-xs"
                        >
                          <option value="truthy">Truthy (Yes / Active)</option>
                          <option value="falsy">Falsy (No / Empty)</option>
                          <option value="equals">Equals</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <Info className="mx-auto size-5 mb-1.5 opacity-50" />
                    Select a node on the canvas to inspect and edit its settings.
                  </div>
                )}
              </div>
            )}

            {rightPanelTab === "testing" && (
              <div className="space-y-4">
                {/* Sub-tab Toggle: Simulator vs Live WhatsApp */}
                <div className="flex rounded-lg border bg-muted/40 p-1">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md py-1 text-xs font-semibold transition-all",
                      testMode === "SIMULATOR"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setTestMode("SIMULATOR")}
                  >
                    Phone Simulator
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md py-1 text-xs font-semibold transition-all",
                      testMode === "LIVE_WHATSAPP"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setTestMode("LIVE_WHATSAPP")}
                  >
                    Live WhatsApp
                  </button>
                </div>

                {testMode === "SIMULATOR" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">In-Browser Mockup</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void runSimulationTest()}>
                        <FlaskConical className="mr-1 size-3" />
                        Run Simulation
                      </Button>
                    </div>
                    <WhatsAppPhoneSimulator
                      clinicName="ABC Fertility Centre"
                      onSimulateStep={(step) => {
                        const targetNode = definition.nodes.find((n) => n.type === step);
                        if (targetNode) setSelectedId(targetNode.id);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Radio className="size-4 text-primary animate-pulse" />
                        Live Meta WhatsApp Test
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                        Sends genuine WhatsApp interactive messages from your clinic WABA account to the target phone number.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Test Patient</Label>
                        <select
                          className="flex h-8 w-full rounded-md border bg-background px-2 text-xs"
                          value={testPatientId}
                          onChange={(e) => {
                            const pId = e.target.value;
                            setTestPatientId(pId);
                            const found = patients.find((p) => p.id === pId);
                            if (found?.phone) setTestPhoneNumber(found.phone);
                          }}
                        >
                          <option value="">Select patient…</option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.firstName} {p.lastName} {p.phone ? `(${p.phone})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Recipient Phone Number</Label>
                        <Input
                          value={testPhoneNumber}
                          onChange={(e) => setTestPhoneNumber(e.target.value)}
                          placeholder="+91 86607 17328"
                          className="h-8 text-xs font-mono"
                        />
                        {testPhoneNumber && (
                          <p className="text-[10px] text-muted-foreground">
                            Masked preview: {testPhoneNumber.replace(/(\d{2,3})\d+(\d{4})/, "$1••••••$2")}
                          </p>
                        )}
                      </div>

                      <div className="rounded-md border bg-amber-50/60 p-2.5 text-[11px] text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                        <div className="flex items-center gap-1 font-semibold">
                          <AlertTriangle className="size-3.5" />
                          Safety Confirmation Required
                        </div>
                        Real interactive messages will be sent to this number. Do not send tests to external clinic patients.
                      </div>

                      <Button
                        className="w-full"
                        size="sm"
                        disabled={testingLive || !testPhoneNumber.trim()}
                        onClick={() => setConfirmLiveTestModalOpen(true)}
                      >
                        <Send className="mr-1 size-3.5" />
                        {testingLive ? "Dispatching Live Test…" : "Send Test WhatsApp Message"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Execution Console Drawer */}
      {activeConsoleExecution && (
        <div className="surface-card rounded-xl border p-3">
          <div className="flex items-center justify-between border-b pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Execution Trace
              </span>
              <StatusBadge
                label={activeConsoleExecution.status}
                tone={activeConsoleExecution.status === "COMPLETED" ? "success" : activeConsoleExecution.status === "WAITING" ? "warning" : "muted"}
              />
              <span className="text-[11px] text-muted-foreground font-mono">
                ID: {activeConsoleExecution.id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px]"
                onClick={() => setActiveConsoleExecution(null)}
              >
                Hide Console
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {activeConsoleExecution.steps.map((step, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-1.5 shrink-0 rounded-lg border px-2.5 py-1 text-xs",
                  step.status === "COMPLETED" && "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
                  step.status === "WAITING" && "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
                  step.status === "FAILED" && "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {step.status === "COMPLETED" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                ) : step.status === "WAITING" ? (
                  <Clock className="size-3.5 text-sky-600 shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-destructive shrink-0" />
                )}
                <span className="font-semibold text-[11px]">{step.nodeType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Live WhatsApp Testing */}
      {confirmLiveTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="surface-card w-full max-w-md space-y-4 rounded-xl border p-6 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-base">
                <Radio className="size-5" />
                Confirm Live WhatsApp Test
              </div>
              <p className="text-xs text-muted-foreground">
                This will trigger the current flow and send actual WhatsApp messages via Meta Cloud API to:
              </p>
              <div className="rounded-lg border bg-muted/40 p-2 font-mono text-sm font-semibold text-foreground text-center">
                {testPhoneNumber}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Standard Meta messaging rates may apply. The recipient will be able to reply directly using interactive buttons.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmLiveTestModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void runLiveWhatsAppTest()}
              >
                Confirm & Send Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Flow Validation Issues Modal */}
      {validationModalOpen && validationIssues && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="surface-card w-full max-w-lg space-y-4 rounded-xl border p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="size-5 text-primary" />
                <span>Flow Validation Results</span>
              </div>
              <button
                type="button"
                onClick={() => setValidationModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {validationIssues.length === 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="mx-auto size-6 text-emerald-600 mb-1" />
                  <p className="font-semibold text-sm">Flow is Ready to Publish!</p>
                  <p className="mt-1 text-[11px]">No disconnected nodes, invalid edges, or missing configurations detected.</p>
                </div>
              ) : (
                validationIssues.map((iss, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (iss.nodeId) setSelectedId(iss.nodeId);
                      setValidationModalOpen(false);
                    }}
                    className="flex items-start gap-2 rounded-lg border p-2.5 text-xs hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{iss.code}</p>
                      <p className="text-[11px] text-muted-foreground">{iss.message}</p>
                      {iss.nodeId && <span className="text-[10px] text-primary underline">Focus Node</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" onClick={() => setValidationModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
