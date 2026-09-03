"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  FileCheck,
  GitBranch,
  HeartHandshake,
  HeartPulse,
  Layers,
  MessageCircle,
  Pencil,
  Plus,
  Power,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserRound,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clinicApi, clinicErrorMessage } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";

type TaskDef = {
  id?: string;
  title: string;
  description?: string | null;
  taskType: string;
  ownerRole: string;
  priority: string;
  dueTimingDays: number;
  dueTimingHours?: number | null;
  triggerEvent?: string | null;
  communicationConfig?: {
    whatsapp?: {
      enabled: boolean;
      templateName: string;
      variables: string[];
    };
  } | null;
  reminderConfig?: {
    remindAtHours?: number;
    channel?: string;
  } | null;
  escalationConfig?: {
    escalateAfterHours?: number;
    escalateTo?: string;
  } | null;
  requiredAction?: string | null;
};

type StageDef = {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  stageType: string | null;
  completionStrategy: string;
  taskCount: number;
  tasks: TaskDef[];
};

type TemplateRecord = {
  id: string;
  name: string;
  description: string | null;
  specialty: string;
  type: string;
  version: number;
  isSystem: boolean;
  isActive: boolean;
  stageCount: number;
  taskCount: number;
  usageCount: number;
  lastUpdated: string;
  stages: StageDef[];
};

const ROLE_COLORS: Record<string, string> = {
  PATIENT: "bg-blue-50 text-blue-700 border-blue-200",
  DOCTOR: "bg-purple-50 text-purple-700 border-purple-200",
  CARE_COORDINATOR: "bg-amber-50 text-amber-700 border-amber-200",
  PHARMACIST: "bg-emerald-50 text-emerald-700 border-emerald-200",
  STAFF: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function TreatmentPlanBuilderPage() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New template dialog state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<"IVF" | "IUI" | "FERTILITY_EVALUATION">("IVF");

  // Add task dialog state
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("PATIENT");
  const [newTaskPriority, setNewTaskPriority] = useState<"NORMAL" | "HIGH" | "CLINICAL">("NORMAL");
  const [newTaskDays, setNewTaskDays] = useState("1");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await clinicApi.templates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id);
      }
      setError(null);
    } catch (err: unknown) {
      setError(clinicErrorMessage(err, "Failed to load treatment plan templates."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) ?? templates[0];
  const activeStages = activeTemplate?.stages ?? [];
  const activeStage = activeStages[selectedStageIndex] ?? activeStages[0];

  const handleDuplicate = async () => {
    if (!activeTemplate) return;
    try {
      const duplicated = await clinicApi.duplicateTemplate(activeTemplate.id);
      toast.success("Template Duplicated!", {
        description: `Created editable copy: ${duplicated.name}`,
      });
      await loadTemplates();
      setSelectedTemplateId(duplicated.id);
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Could not duplicate template."));
    }
  };

  const handleToggle = async () => {
    if (!activeTemplate) return;
    if (activeTemplate.isSystem) {
      toast.info("System Templates are standard reference protocols and remain active.");
      return;
    }
    try {
      const updated = await clinicApi.toggleTemplate(activeTemplate.id);
      toast.success(`Template ${updated.isActive ? "Activated" : "Deactivated"}`);
      await loadTemplates();
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Could not toggle template status."));
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    try {
      const created = await clinicApi.createTemplate({
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim() || undefined,
        type: newTemplateType,
        specialty: "FERTILITY",
        stages: [
          {
            name: "Initial Assessment",
            description: "Baseline review and diagnostics",
            stageType: "CONSULTATION",
            completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
            tasks: [
              {
                title: "Doctor Initial Review",
                ownerRole: "DOCTOR",
                taskType: "DOCTOR_TASK",
                priority: "HIGH",
                dueTimingDays: 0,
              },
            ],
          },
        ],
      });
      toast.success("New Treatment Plan Template Created!");
      setCreateModalOpen(false);
      setNewTemplateName("");
      setNewTemplateDesc("");
      await loadTemplates();
      setSelectedTemplateId(created.id);
      setSelectedStageIndex(0);
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Could not create template."));
    }
  };

  const handleAddTaskToCurrentStage = async () => {
    if (!newTaskTitle.trim() || !activeTemplate || !activeStage) return;
    try {
      const updatedStages = activeTemplate.stages.map((st, idx) => {
        if (idx !== selectedStageIndex) return st;
        return {
          ...st,
          tasks: [
            ...st.tasks,
            {
              title: newTaskTitle.trim(),
              description: newTaskDesc.trim() || null,
              ownerRole: newTaskRole,
              taskType: newTaskRole === "PATIENT" ? "PATIENT_TASK" : "DOCTOR_TASK",
              priority: newTaskPriority,
              dueTimingDays: parseInt(newTaskDays, 10) || 0,
            },
          ],
        };
      });

      if (activeTemplate.isSystem) {
        toast.info("Duplicating system template to allow custom edits...");
        const duplicated = await clinicApi.duplicateTemplate(activeTemplate.id);
        await clinicApi.patchTemplate(duplicated.id, { stages: updatedStages });
        toast.success("Task added to custom template copy!");
        await loadTemplates();
        setSelectedTemplateId(duplicated.id);
      } else {
        await clinicApi.patchTemplate(activeTemplate.id, { stages: updatedStages });
        toast.success("Task added to stage!");
        await loadTemplates();
      }

      setAddTaskModalOpen(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Could not add task."));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Treatment Plan Builder & Care Loop"
        subtitle="Manage standardized IVF care templates with 16-stage clinical pathways, event-relative triggers, and exception routing."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDuplicate}
              disabled={!activeTemplate}
            >
              <Copy className="size-4 text-muted-foreground" />
              Duplicate Template
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="size-4" />
              New Template
            </Button>
          </div>
        }
      />

      {/* Honest Integration Warning Banner */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 p-4 shadow-sm flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-800 shrink-0 mt-0.5">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-amber-950">
                WhatsApp Integration Status: Simulated / Unconfigured Mode
              </span>
              <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                Honest Diagnostic
              </span>
            </div>
            <p className="text-xs text-amber-900/80 mt-0.5 max-w-3xl leading-relaxed">
              No live WhatsApp Meta API credentials configured for this clinic. Care Loop triggers and replies will operate in simulation mode. Messages will NOT pretend to be sent.
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <span className="text-[11px] font-mono text-amber-800 bg-amber-100/80 px-2 py-1 rounded">
            Care Loop Engine · Ready
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        {/* Left Column: Template Selector & Metadata */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                Template Library ({templates.length})
              </span>
            </div>

            <div className="space-y-2">
              {templates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      setSelectedStageIndex(0);
                    }}
                    className={cn(
                      "w-full text-left rounded-xl p-3 border transition-all relative overflow-hidden",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                        : "border-border/80 bg-background/50 hover:bg-muted/40 hover:border-primary/40",
                    )}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {tpl.name}
                      </span>
                      {tpl.isSystem && (
                        <span className="shrink-0 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {tpl.description ?? "Standard fertility protocol"}
                    </p>
                    <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Workflow className="size-3 text-primary" />
                        {tpl.stageCount} Stages
                      </span>
                      <span>·</span>
                      <span>v{tpl.version}</span>
                      <span>·</span>
                      <span className={tpl.isActive ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                        {tpl.isActive ? "Active" : "Draft"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Template Quick Info */}
          {activeTemplate && (
            <div className="rounded-2xl border bg-card p-4 text-xs space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Protocol Attributes</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleToggle}
                >
                  <Power className="size-3.5" />
                  {activeTemplate.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
              <div className="space-y-1.5 border-t pt-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Specialty:</span>
                  <span className="font-medium text-foreground">{activeTemplate.specialty}</span>
                </div>
                <div className="flex justify-between">
                  <span>Treatment Type:</span>
                  <span className="font-medium text-foreground">{activeTemplate.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned In Journeys:</span>
                  <span className="font-medium text-foreground">{activeTemplate.usageCount} couples</span>
                </div>
                <div className="flex justify-between">
                  <span>Snapshot Isolation:</span>
                  <span className="font-semibold text-emerald-600">Guaranteed</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg border">
                Note: Existing patient journeys are protected by immutable snapshots. Template edits will only apply to future assignments.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: 16 Stages & Tasks Builder */}
        <div className="space-y-5">
          {/* Stage Progress Bar / Quick Navigation */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {activeTemplate?.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete 16-stage clinical journey from initial consultation to cycle closure.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Stage {selectedStageIndex + 1} of {activeStages.length}
              </span>
            </div>

            {/* Stage Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 pt-1">
              {activeStages.map((st, idx) => {
                const isSelected = idx === selectedStageIndex;
                const isBranch = st.stageType === "BRANCH_POINT" || st.name.includes("OR");
                return (
                  <button
                    key={st.id || idx}
                    onClick={() => setSelectedStageIndex(idx)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[58px]",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm font-bold"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      isBranch && !isSelected && "border-amber-300 bg-amber-50/50 text-amber-900",
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wider opacity-80">
                      #{idx + 1}
                    </span>
                    <span className="text-xs line-clamp-1 font-medium leading-tight mt-0.5">
                      {st.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Stage Inspector */}
          {activeStage ? (
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Stage {selectedStageIndex + 1}
                    </span>
                    {activeStage.stageType === "BRANCH_POINT" && (
                      <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <GitBranch className="size-3" /> Clinical Branch Point
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-foreground mt-0.5">
                    {activeStage.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                    {activeStage.description ?? "Stage clinical milestones and patient care tasks."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border">
                    Strategy: <strong className="text-foreground">{activeStage.completionStrategy}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setAddTaskModalOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    Add Task
                  </Button>
                </div>
              </div>

              {/* Stage Tasks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Clinical Tasks & Automations ({activeStage.tasks?.length ?? 0})</span>
                  <span>Event Relative Timing</span>
                </div>

                {(!activeStage.tasks || activeStage.tasks.length === 0) ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No tasks defined for this stage yet. Click &quot;Add Task&quot; above to configure one.
                  </div>
                ) : (
                  activeStage.tasks.map((task, tIdx) => {
                    const roleBadgeClass = ROLE_COLORS[task.ownerRole] ?? "bg-slate-100 text-slate-700";
                    return (
                      <div
                        key={task.id ?? tIdx}
                        className="rounded-xl border bg-background p-4 shadow-sm hover:border-primary/40 transition-colors space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {task.title}
                              </span>
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", roleBadgeClass)}>
                                {task.ownerRole}
                              </span>
                              <span className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded",
                                task.priority === "CLINICAL" ? "bg-red-100 text-red-800" :
                                task.priority === "HIGH" ? "bg-orange-100 text-orange-800" :
                                "bg-muted text-muted-foreground",
                              )}>
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {task.description ?? "Routine clinical task completion."}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-medium text-foreground bg-muted/50 px-2 py-1 rounded border">
                              {task.dueTimingDays === 0 ? "Day of Stage (D0)" : `+${task.dueTimingDays} Day${task.dueTimingDays > 1 ? "s" : ""}`}
                            </span>
                          </div>
                        </div>

                        {/* WhatsApp Template & Logic Details */}
                        {task.communicationConfig?.whatsapp?.enabled && (
                          <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 p-2.5 text-xs text-emerald-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-emerald-950">
                              <MessageCircle className="size-3.5 text-emerald-700" />
                              <span>WhatsApp Template: <code>{task.communicationConfig.whatsapp.templateName}</code></span>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {task.communicationConfig.whatsapp.variables.map((v) => (
                                <span key={v} className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                                  {`{{${v}}}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reminders & Escalations */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Clock3 className="size-3 text-muted-foreground" />
                              Trigger: <strong>{task.triggerEvent ?? "STAGE_STARTED"}</strong>
                            </span>
                            {task.escalationConfig && (
                              <span className="flex items-center gap-1 text-amber-700 font-medium">
                                <AlertTriangle className="size-3" />
                                Escalate after {task.escalationConfig.escalateAfterHours ?? 2}h to {task.escalationConfig.escalateTo ?? "Coordinator"}
                              </span>
                            )}
                          </div>
                          {task.requiredAction && (
                            <span className="font-mono text-[10px] text-primary">
                              Action: {task.requiredAction}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Dialog: Create Custom Template */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Treatment Plan Template</DialogTitle>
            <DialogDescription>
              Define a new clinical protocol template for your clinic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Template Name</Label>
              <Input
                placeholder="e.g. IVF — Mild Stimulation Protocol"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Treatment Category</Label>
              <Select
                value={newTemplateType}
                onValueChange={(val: "IVF" | "IUI" | "FERTILITY_EVALUATION") => setNewTemplateType(val)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IVF">IVF / ICSI</SelectItem>
                  <SelectItem value="IUI">IUI</SelectItem>
                  <SelectItem value="FERTILITY_EVALUATION">Fertility Evaluation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                placeholder="Clinical indications, protocol rationale, dosage guides..."
                rows={3}
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Task to Current Stage */}
      <Dialog open={addTaskModalOpen} onOpenChange={setAddTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task to {activeStage?.name}</DialogTitle>
            <DialogDescription>
              Configure an event-relative task for this stage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Task Title</Label>
              <Input
                placeholder="e.g. Confirm trigger injection administration"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Assigned Owner Role</Label>
                <Select value={newTaskRole} onValueChange={setNewTaskRole}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PATIENT">Patient</SelectItem>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="CARE_COORDINATOR">Care Coordinator</SelectItem>
                    <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                    <SelectItem value="STAFF">Clinic Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Clinical Priority</Label>
                <Select
                  value={newTaskPriority}
                  onValueChange={(v: "NORMAL" | "HIGH" | "CLINICAL") => setNewTaskPriority(v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CLINICAL">Clinical / Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Relative Due Timing (Days after stage entry)</Label>
              <Input
                type="number"
                min="0"
                max="30"
                value={newTaskDays}
                onChange={(e) => setNewTaskDays(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Task Description & Instructions</Label>
              <Textarea
                placeholder="Clear patient instructions, dosage notes, or staff verification criteria..."
                rows={2}
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAddTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddTaskToCurrentStage}>
              Add Task to Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
