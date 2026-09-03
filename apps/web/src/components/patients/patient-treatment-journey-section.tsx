"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Clock3,
  Copy,
  FileCheck,
  GitBranch,
  HeartPulse,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { clinicApi, clinicErrorMessage, type ClinicCouple } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";
import { AssignTreatmentPlanDialog } from "./assign-treatment-plan-dialog";

export type JourneyExecutionData = {
  plan: {
    id: string;
    name: string;
    type: string;
    status: string;
    approvalStatus: string;
    pausedAt?: string | null;
    pauseReason?: string | null;
    selectedBranch?: string | null;
    templateVersion: number;
    startDate?: string | null;
    currentStageIndex: number;
    currentStageName: string;
    doctor: string;
    coordinator: string;
    approvedBy: string;
  };
  couple: {
    id: string;
    slug: string;
    primaryName: string;
    partnerName?: string | null;
    phone?: string | null;
  };
  stages: Array<{
    id: string;
    sortOrder: number;
    name: string;
    status: "DONE" | "CURRENT" | "PENDING";
    stageType?: string | null;
    completionStrategy: string;
    totalTasks: number;
    completedTasks: number;
  }>;
  currentStage: {
    id?: string;
    index: number;
    name?: string;
    status?: string;
    tasks: Array<{
      id: string;
      title: string;
      description?: string | null;
      status: string;
      priority: string;
      taskType: string;
      ownerRole: string;
      due: string;
      dueTime?: string | null;
      assignedTo: string;
      isEscalated: boolean;
      completionEvidence?: Record<string, unknown> | null;
    }>;
  };
  allTasksSummary: {
    total: number;
    completed: number;
    waiting: number;
    blockedOrOverdue: number;
  };
  exceptions: Array<{
    id: string;
    type: string;
    severity: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  whatsapp: {
    configured: boolean;
    phoneNumber?: string;
    reason?: string;
  };
  recentAudits: Array<{
    id: string;
    action: string;
    time: string;
    metadata?: Record<string, unknown> | null;
  }>;
};

interface PatientTreatmentJourneySectionProps {
  couple: {
    id: string;
    slug: string;
    primary: {
      name?: string | undefined;
      firstName?: string | undefined;
      lastName?: string | undefined;
      phone?: string | null | undefined;
    };
    partner?: {
      name?: string | undefined;
      firstName?: string | undefined;
      lastName?: string | undefined;
      phone?: string | null | undefined;
    } | null | undefined;
  };
  onRefresh?: (() => void) | undefined;
}

export function PatientTreatmentJourneySection({
  couple,
  onRefresh,
}: PatientTreatmentJourneySectionProps) {
  const [journey, setJourney] = useState<JourneyExecutionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [addDoctorTaskOpen, setAddDoctorTaskOpen] = useState(false);
  const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [lastAiResponse, setLastAiResponse] = useState<string | null>(null);

  // Doctor Ad-Hoc Task Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskRole, setTaskRole] = useState("PATIENT");
  const [taskPriority, setTaskPriority] = useState<"NORMAL" | "HIGH" | "CLINICAL">("NORMAL");
  const [taskDate, setTaskDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskTime, setTaskTime] = useState("10:00");

  const loadJourney = async () => {
    try {
      setLoading(true);
      // Find care plans for clinic and locate couple's plan
      const plans = await clinicApi.carePlans();
      const couplePlan = plans.find((p) => p.coupleId === couple.id);
      if (couplePlan) {
        const data = await clinicApi.journey(couplePlan.id);
        setJourney(data);
      } else {
        setJourney(null);
      }
    } catch (err: unknown) {
      console.warn("Could not load journey execution graph:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJourney();
  }, [couple.id]);

  const handleSimulateResponse = async (taskId: string, text: string) => {
    try {
      setSimulating(true);
      const res = await clinicApi.simulateTaskResponse(taskId, text);
      if (res.aiReply) {
        setLastAiResponse(res.aiReply);
      }
      if (res.action === "TASK_COMPLETED") {
        toast.success("Care Loop: Task Completed via WhatsApp", {
          description: "Patient confirmed completion. Stage progress re-evaluated.",
        });
      } else if (res.action === "EXCEPTION_CREATED") {
        toast.warning("Care Loop Exception Raised", {
          description: `Empathetic medical guardrail applied. Assigned to ${res.assignedRole ?? "Care Team"}.`,
        });
      }
      await loadJourney();
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Failed to simulate patient response."));
    } finally {
      setSimulating(false);
    }
  };

  const handleBranchSelect = async (branch: "FRESH_TRANSFER" | "FREEZE_ALL_FET") => {
    if (!journey?.plan.id) return;
    try {
      await clinicApi.branchCarePlan(journey.plan.id, {
        branch,
        notes: `Clinical strategy decided by Doctor: ${branch}`,
      });
      toast.success(`Transfer Strategy Set: ${branch === "FRESH_TRANSFER" ? "Fresh Transfer" : "Freeze-All / FET"}`);
      await loadJourney();
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Failed to select branch."));
    }
  };

  const handlePauseToggle = async () => {
    if (!journey?.plan.id) return;
    const isPaused = journey.plan.approvalStatus === "PAUSED";
    try {
      if (isPaused) {
        await clinicApi.resumeCarePlan(journey.plan.id);
        toast.success("Treatment Plan Resumed");
      } else {
        await clinicApi.pauseCarePlan(journey.plan.id, {
          reason: "Clinician requested temporary cycle pause",
        });
        toast.info("Treatment Plan Paused");
      }
      await loadJourney();
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Failed to update plan status."));
    }
  };

  const handleAddDoctorTask = async () => {
    if (!taskTitle.trim() || !journey?.plan.id) return;
    try {
      await clinicApi.addDoctorTask({
        coupleId: couple.id,
        carePlanId: journey.plan.id,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        ownerRole: taskRole,
        priority: taskPriority,
        dueDate: taskDate,
        dueTime: taskTime,
      });
      toast.success("Doctor Task Added to Care Loop!");
      setAddDoctorTaskOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      await loadJourney();
      onRefresh?.();
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Could not add doctor task."));
    }
  };

  const primaryName =
    couple.primary.name ||
    (`${couple.primary.firstName ?? ""} ${couple.primary.lastName ?? ""}`.trim() || "Patient");
  const partnerName = couple.partner
    ? (couple.partner.name ||
      (`${couple.partner.firstName ?? ""} ${couple.partner.lastName ?? ""}`.trim() || null))
    : null;

  // Fallback if no care plan is assigned yet
  if (!journey && !loading) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center space-y-3 bg-muted/20">
        <HeartPulse className="size-8 text-muted-foreground mx-auto" />
        <div>
          <h4 className="font-bold text-sm text-foreground">No Treatment Plan Assigned Yet</h4>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-md mx-auto">
            A doctor must select and approve an IVF treatment plan template to activate the Care Loop for this couple.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"
          onClick={() => setAssignDialogOpen(true)}
        >
          <Stethoscope className="size-4" />
          Assign Treatment Plan
        </Button>

        <AssignTreatmentPlanDialog
          coupleId={couple.id}
          coupleSlug={couple.slug}
          primaryName={primaryName}
          partnerName={partnerName}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          onAssigned={() => {
            void loadJourney();
            onRefresh?.();
          }}
        />
      </div>
    );
  }

  const currentStageIndex = journey?.plan.currentStageIndex ?? 0;
  const currentStageName = journey?.plan.currentStageName ?? "Consultation";
  const stages = journey?.stages ?? [];
  const totalStages = stages.length || 16;
  const progressPercent = Math.round(((currentStageIndex) / totalStages) * 100);

  // Active / pending tasks in the current stage
  const pendingTasks = journey?.currentStage.tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "SKIPPED") ?? [];
  const primaryPendingTask = pendingTasks[0] ?? journey?.currentStage.tasks[0];

  return (
    <div className="space-y-4">
      {/* Active Treatment Plan Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-primary/5 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary tracking-wide uppercase flex items-center gap-1">
                <HeartPulse className="size-3.5" />
                Active IVF Care Loop
              </span>
              <span className="text-xs text-muted-foreground">
                Snapshot v{journey?.plan.templateVersion ?? 1} · Approved by {journey?.plan.approvedBy ?? "Clinical Lead"}
              </span>
              {journey?.plan.approvalStatus === "PAUSED" && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  PAUSED
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-foreground mt-1">
              {journey?.plan.name ?? "IVF — Standard Journey"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handlePauseToggle}
            >
              {journey?.plan.approvalStatus === "PAUSED" ? (
                <>
                  <Play className="size-3.5 text-emerald-600" /> Resume Plan
                </>
              ) : (
                <>
                  <Pause className="size-3.5 text-amber-600" /> Pause Plan
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setAddDoctorTaskOpen(true)}
            >
              <Plus className="size-3.5 text-primary" /> [+ Add Doctor Task]
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setAssignDialogOpen(true)}
            >
              <Workflow className="size-3.5" /> Change Plan
            </Button>
          </div>
        </div>

        {/* Current Stage Hero Bar */}
        <div className="rounded-xl border bg-background/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-primary" />
              </span>
              <span className="font-bold text-sm text-foreground">
                Stage {currentStageIndex + 1} of {totalStages}: {currentStageName}
              </span>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {progressPercent}% Journey Complete ({currentStageIndex} of {totalStages} Stages Done)
            </span>
          </div>

          {/* Visual Progress Line */}
          <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(progressPercent, 6)}%` }}
            />
          </div>
        </div>

        {/* Compact Live Care Loop Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Workflow className="size-3.5" />
              <span>Live Care Loop · Next Action</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-100 text-amber-900 border border-amber-300/60 px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1">
                <MessageCircle className="size-3" />
                WhatsApp: Simulated Mode (Not Configured)
              </span>
            </div>
          </div>

          {primaryPendingTask ? (
            <div className="rounded-xl border bg-background p-3.5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {primaryPendingTask.title}
                    </span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {primaryPendingTask.ownerRole}
                    </span>
                    <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {primaryPendingTask.dueTime || "10:00 AM"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {primaryPendingTask.description ?? "Follow clinic protocol instructions."}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-lg border",
                    primaryPendingTask.status === "WAITING" ? "bg-amber-50 text-amber-800 border-amber-200" :
                    primaryPendingTask.status === "BLOCKED" ? "bg-red-50 text-red-800 border-red-200" :
                    "bg-emerald-50 text-emerald-800 border-emerald-200",
                  )}>
                    {primaryPendingTask.status}
                  </span>
                </div>
              </div>

              {/* Reactive WhatsApp Simulation Controls */}
              <div className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="font-semibold text-foreground">Test WhatsApp Automation:</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={simulating}
                    className="h-7 text-xs gap-1 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 font-semibold"
                    onClick={() => handleSimulateResponse(primaryPendingTask.id, "Done")}
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Simulate &quot;Done&quot;
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={simulating}
                    className="h-7 text-xs gap-1 border-red-300 bg-red-50/50 hover:bg-red-100/60 text-red-900 font-semibold"
                    onClick={() => handleSimulateResponse(primaryPendingTask.id, "I missed my injection. What should I do?")}
                  >
                    <AlertTriangle className="size-3.5 text-red-600" />
                    Simulate &quot;I missed it&quot;
                  </Button>
                </div>
              </div>

              {/* AI Guardrail Response Display */}
              {lastAiResponse && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Bot className="size-3.5" />
                    <span>AI Medical Guardrail Response (Empathy + Clinical Safe Harbor)</span>
                  </div>
                  <p className="text-foreground text-[12px] italic leading-relaxed">
                    &quot;{lastAiResponse}&quot;
                  </p>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    * AI safely refuses clinical advice, protects patient safety, and creates an immediate staff exception.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-2 text-center bg-background rounded-xl border">
              All tasks for this stage are completed. Ready to advance!
            </div>
          )}
        </div>

        {/* Clinical Branch Decision (Stage 11 / Transfer strategy) */}
        {(currentStageIndex >= 9 || journey?.plan.selectedBranch) && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-purple-700" />
                <span className="font-bold text-sm text-purple-950">
                  Doctor Clinical Branch Decision: Transfer Strategy
                </span>
              </div>
              {journey?.plan.selectedBranch && (
                <span className="rounded-full bg-purple-200/80 px-2.5 py-0.5 text-xs font-bold text-purple-900 font-mono">
                  {journey.plan.selectedBranch}
                </span>
              )}
            </div>
            <p className="text-xs text-purple-900/80">
              Doctor evaluates progesterone levels, endometrial lining, and OHSS risk to select Fresh Embryo Transfer or Freeze-All / FET.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant={journey?.plan.selectedBranch === "FRESH_TRANSFER" ? "default" : "outline"}
                className={cn(
                  "text-xs h-8",
                  journey?.plan.selectedBranch === "FRESH_TRANSFER" ? "bg-purple-700 text-white" : "border-purple-300",
                )}
                onClick={() => handleBranchSelect("FRESH_TRANSFER")}
              >
                Fresh Embryo Transfer
              </Button>
              <Button
                size="sm"
                variant={journey?.plan.selectedBranch === "FREEZE_ALL_FET" ? "default" : "outline"}
                className={cn(
                  "text-xs h-8",
                  journey?.plan.selectedBranch === "FREEZE_ALL_FET" ? "bg-purple-700 text-white" : "border-purple-300",
                )}
                onClick={() => handleBranchSelect("FREEZE_ALL_FET")}
              >
                Freeze-All Protocol (FET in subsequent cycle)
              </Button>
            </div>
          </div>
        )}

        {/* Interactive 16-Stage Timeline */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" />
              16-Stage Clinical Pathway
            </span>
            <span className="text-xs text-muted-foreground">Click any stage to view details</span>
          </div>

          <div className="grid gap-1.5">
            {stages.map((st, idx) => {
              const isCurrent = idx === currentStageIndex;
              const isDone = idx < currentStageIndex || st.status === "DONE";
              const isExpanded = expandedStageIndex === idx;
              const isBranch = st.stageType === "BRANCH_POINT" || st.name.includes("OR");

              return (
                <div
                  key={st.id || idx}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    isCurrent ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30" :
                    isDone ? "border-emerald-200/80 bg-emerald-50/20" :
                    "border-border/70 bg-card/60",
                  )}
                >
                  <button
                    onClick={() => setExpandedStageIndex(isExpanded ? null : idx)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full text-xs font-bold shrink-0",
                          isDone ? "bg-emerald-100 text-emerald-800" :
                          isCurrent ? "bg-primary text-primary-foreground" :
                          "bg-muted text-muted-foreground",
                        )}
                      >
                        {isDone ? <CheckCircle2 className="size-4" /> : idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-semibold", isCurrent && "text-primary")}>
                            {st.name}
                          </span>
                          {isBranch && (
                            <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2">
                              Branch
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {isDone ? "Stage Completed" : isCurrent ? "Active In Progress" : "Upcoming Stage"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {st.completedTasks}/{st.totalTasks} tasks
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded Stage Info */}
                  {isExpanded && (
                    <div className="border-t p-3 text-xs bg-background/50 space-y-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Strategy: <strong>{st.completionStrategy}</strong></span>
                        <span>Stage #{idx + 1}</span>
                      </div>
                      <p className="text-muted-foreground">
                        Tasks in this stage activate automatically upon entering the milestone.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dialog: Assign Treatment Plan Wizard */}
      <AssignTreatmentPlanDialog
        coupleId={couple.id}
        coupleSlug={couple.slug}
        primaryName={primaryName}
        partnerName={partnerName}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onAssigned={() => {
          void loadJourney();
          onRefresh?.();
        }}
      />

      {/* Dialog: Add Doctor Ad-Hoc Task */}
      <Dialog open={addDoctorTaskOpen} onOpenChange={setAddDoctorTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Patient-Specific Doctor Task</DialogTitle>
            <DialogDescription>
              Prescribe an ad-hoc clinical task or medication check directly into this couple&apos;s Care Loop.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Task Title</Label>
              <Input
                placeholder="e.g. Additional Estradiol Blood Check"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Owner Role</Label>
                <Select value={taskRole} onValueChange={setTaskRole}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PATIENT">Patient</SelectItem>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="CARE_COORDINATOR">Coordinator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(v: "NORMAL" | "HIGH" | "CLINICAL") => setTaskPriority(v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CLINICAL">Clinical Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Due Time</Label>
                <Input
                  type="time"
                  className="h-9"
                  value={taskTime}
                  onChange={(e) => setTaskTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Instructions & Prescriptions</Label>
              <Textarea
                placeholder="Specific dosage, timing, or report upload guidelines..."
                rows={2}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAddDoctorTaskOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddDoctorTask}>
              Add to Care Loop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
