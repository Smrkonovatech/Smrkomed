"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck2,
  HeartPulse,
  Info,
  MessageSquare,
  PhoneCall,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type CareTask,
  type Couple,
  coupleFullLabel,
} from "@/lib/demo-data";

interface SingleRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: CareTask | null;
  couple: Couple | null;
}

export function SingleRecordDialog({
  open,
  onOpenChange,
  task,
  couple,
}: SingleRecordDialogProps) {
  if (!task || !couple) return null;

  // Local state to simulate real-time single-record attribute mutations
  const [currentTask, setCurrentTask] = useState<CareTask>(task);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

  // Keep synced if a new task is opened
  if (currentTask.id !== task.id) {
    setCurrentTask(task);
    setSimulationLog([]);
  }

  const patientName = coupleFullLabel(couple);
  const cycleLabel = couple.cycleLabel;
  const stageName = currentTask.stageName ?? couple.stage;

  // 19-attribute single-record values
  const attributes = [
    { num: 1, key: "Patient", label: "Patient", value: couple.primary.name, icon: User },
    { num: 2, key: "Couple", label: "Couple / Partner", value: couple.partner?.name ?? "N/A", icon: Users },
    { num: 3, key: "Cycle", label: "Cycle", value: cycleLabel, icon: Calendar },
    { num: 4, key: "Stage", label: "Stage", value: stageName, icon: HeartPulse },
    { num: 5, key: "Task", label: "Task", value: currentTask.title, icon: FileCheck2 },
    { num: 6, key: "TaskType", label: "Task Type", value: currentTask.taskType ?? currentTask.category, icon: Info },
    { num: 7, key: "TriggerEvent", label: "Trigger Event", value: currentTask.triggerEvent ?? "care_loop_scheduled_trigger", icon: Sparkles },
    { num: 8, key: "Assignee", label: "Assignee", value: currentTask.assignedTo, icon: Bot },
    { num: 9, key: "Role", label: "Role", value: currentTask.role ?? "PATIENT", icon: Stethoscope },
    { num: 10, key: "DueDate", label: "Due Date", value: currentTask.dueDate ?? currentTask.due.split("·")[0]?.trim() ?? "Today", icon: Calendar },
    { num: 11, key: "DueTime", label: "Due Time", value: currentTask.dueTime ?? currentTask.due.split("·")[1]?.trim() ?? "09:00 AM", icon: Clock },
    { num: 12, key: "Priority", label: "Priority", value: currentTask.priority ?? "HIGH", icon: AlertCircle },
    { num: 13, key: "Status", label: "Status", value: currentTask.status.toUpperCase(), icon: BadgeCheck },
    { num: 14, key: "CommChannel", label: "Comm Channel", value: currentTask.communicationChannel ?? "WHATSAPP", icon: MessageSquare },
    { num: 15, key: "PatientResponse", label: "Patient Response", value: currentTask.patientResponse ?? "None recorded yet", icon: MessageSquare },
    { num: 16, key: "Attempts", label: "Attempts", value: String(currentTask.attempts ?? 1), icon: Clock },
    { num: 17, key: "EscalationLevel", label: "Escalation Level", value: `Tier ${currentTask.escalationLevel ?? 0}`, icon: ShieldAlert },
    { num: 18, key: "LastAction", label: "Last Action", value: currentTask.lastAction ?? "Follow-up dispatched via WhatsApp", icon: Clock },
    { num: 19, key: "NextAction", label: "Next Action", value: currentTask.nextAction ?? "Awaiting patient confirmation button", icon: ArrowRight },
  ];

  // Simulator actions implementing strict Care Loop guardrails
  const simulateResponse = (response: string) => {
    if (response === "[I've Taken It]") {
      setCurrentTask((prev) => ({
        ...prev,
        status: "completed",
        patientResponse: "[I've Taken It]",
        lastAction: `Patient confirmed medication via WhatsApp button at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        nextAction: "Task completed — next scheduled clinical stage evaluated",
      }));
      setSimulationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Patient tapped [I've Taken It]. Dose timestamp locked. Task marked COMPLETED.`,
        ...prev,
      ]);
      toast.success("Medication Dose Confirmed", {
        description: "Exact administration timestamp recorded in Care Loop single-record audit.",
      });
    } else if (response === "[I've Arrived]") {
      setCurrentTask((prev) => ({
        ...prev,
        status: "completed",
        patientResponse: "[I've Arrived]",
        lastAction: "Patient arrival confirmed via WhatsApp check-in",
        nextAction: "Clinic front desk & nurse notified for procedure preparation",
      }));
      setSimulationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Patient tapped [I've Arrived]. Reception notified.`,
        ...prev,
      ]);
      toast.success("Arrival Confirmed", {
        description: "Clinic reception notified for ultrasound/procedure check-in.",
      });
    } else if (response === "[I'm Feeling Fine]") {
      setCurrentTask((prev) => ({
        ...prev,
        status: "completed",
        patientResponse: "[I'm Feeling Fine]",
        lastAction: "Post-transfer wellness check-in completed positively",
        nextAction: "Scheduled Day 3 wellness pulse check-in",
      }));
      setSimulationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Patient confirmed wellness. Routine care continuation.`,
        ...prev,
      ]);
      toast.success("Wellness Check-in Logged", {
        description: "Positive post-procedure well-being recorded.",
      });
    } else if (response === "[Clinical Concern / Wrong Dose]") {
      // STRICT MEDICAL GUARDRAIL: stops automation, routes to doctor, non-clinical disclaimer
      setCurrentTask((prev) => ({
        ...prev,
        status: "escalated",
        patientResponse: "I took the wrong dose. Should I take double?",
        priority: "CRITICAL",
        escalationLevel: 3,
        lastAction: "Clinical alert: Patient reported dose query via WhatsApp",
        nextAction: "CLINICAL ESCALATION: Automation paused for Dr. Ananya Rao intervention",
      }));
      setSimulationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] ⚠️ CLINICAL SAFETY GUARDRAIL TRIGGERED: Patient asked 'Should I take double?'. AI refused medical advice. Automation PAUSED. Escalated to Dr. Ananya Rao.`,
        ...prev,
      ]);
      toast.error("Clinical Guardrail Triggered", {
        description: "Automation paused. Doctor review required. No automated dosage advice sent.",
      });
    } else if (response === "I paid (Manual)") {
      // PAYMENT SECURITY GUARDRAIL: Does not mark complete on patient claim alone!
      setCurrentTask((prev) => ({
        ...prev,
        status: "waiting",
        patientResponse: "I paid",
        lastAction: "Patient claimed payment via WhatsApp: 'I paid'",
        nextAction: "Awaiting payment gateway webhook confirmation (manual claim unverified)",
      }));
      setSimulationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] 🛡️ PAYMENT SECURITY GATE: Patient claimed 'I paid'. Care task kept WAITING until verified payment gateway webhook fires.`,
        ...prev,
      ]);
      toast.warning("Payment Gate: Unverified Claim", {
        description: "Patient claim recorded. Task remains WAITING until gateway webhook verifies funds.",
      });
    } else if (response === "Gateway Webhook Verified") {
      // Webhook verified -> mark complete
      setCurrentTask((prev) => ({
        ...prev,
        status: "completed",
        lastAction: "Gateway webhook verified: Razorpay TXN_998124 (₹1,25,000)",
        nextAction: "Financial clearance complete — protocol unlocked",
      }));
      setSimulationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] ✅ PAYMENT GATEWAY WEBHOOK VERIFIED: Razorpay transaction settled. Task marked COMPLETED.`,
        ...prev,
      ]);
      toast.success("Payment Verified via Gateway", {
        description: "Transaction verified. Milestone marked COMPLETED.",
      });
    } else if (response === "Tier 2 Escalation (AI Call)") {
      setCurrentTask((prev) => ({
        ...prev,
        communicationChannel: "VOICE_CALL",
        attempts: (prev.attempts ?? 1) + 1,
        escalationLevel: 2,
        lastAction: "Dispatched AI Voice Call follow-up to patient phone",
        nextAction: "Tier 3 Escalation: Staff callback if voice call unanswered",
      }));
      setSimulationLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Escalation ladder stepped: WhatsApp (Tier 1) → AI Voice Call (Tier 2). Channel updated to VOICE_CALL.`,
        ...prev,
      ]);
      toast.info("Escalation Step Triggered", {
        description: "Multi-tier ladder advanced: AI Voice Call placed.",
      });
    }
  };

  const channelColor =
    currentTask.communicationChannel === "VOICE_CALL"
      ? "bg-purple/15 text-purple border-purple/30"
      : currentTask.communicationChannel === "STAFF_TASK"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0 sm:rounded-2xl">
        {/* Header with Clinical Metadata */}
        <div className="relative border-b bg-gradient-to-r from-primary/5 via-card to-primary/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  19-Attribute Single-Record Story
                </Badge>
                <Badge variant="outline" className={channelColor}>
                  {currentTask.communicationChannel ?? "WHATSAPP"}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  ID: {currentTask.id}
                </span>
              </div>
              <DialogTitle className="mt-2 text-2xl font-bold tracking-tight">
                {currentTask.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Patient: <span className="font-semibold text-foreground">{patientName}</span> · Cycle:{" "}
                <span className="font-semibold text-foreground">{cycleLabel}</span> · Stage:{" "}
                <span className="font-semibold text-foreground">{stageName}</span>
              </DialogDescription>
            </div>
            <div className="rounded-xl border bg-card/80 p-3 text-right backdrop-blur shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Care Loop Status
              </p>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums",
                  currentTask.status === "completed"
                    ? "text-emerald-500"
                    : currentTask.status === "escalated"
                      ? "text-rose-500"
                      : "text-amber-500",
                )}
              >
                {currentTask.status.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Authoritative Next Action Hero Banner */}
          <div className="mt-5 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Authoritative Next Action
                  </p>
                </div>
                <p className="mt-1.5 text-base font-semibold text-foreground">
                  {currentTask.nextAction ?? "Awaiting patient confirmation button"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last event: {currentTask.lastAction}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Badge
                  variant={currentTask.priority === "CRITICAL" ? "destructive" : "secondary"}
                  className="font-semibold"
                >
                  {currentTask.priority ?? "HIGH"}
                </Badge>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Attempts: {currentTask.attempts ?? 1} of 3
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Interactive Care Loop Patient Simulator */}
          <section className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Bot className="size-4 text-primary" />
                  Interactive WhatsApp & Clinical Response Simulator
                </h3>
                <p className="text-xs text-muted-foreground">
                  Simulate incoming patient interactions to test strict medical guardrails, payment gates, and escalation logic.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-card hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40"
                onClick={() => simulateResponse("[I've Taken It]")}
              >
                <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" />
                [I&apos;ve Taken It]
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-card hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950/40"
                onClick={() => simulateResponse("[I've Arrived]")}
              >
                <User className="size-3.5 mr-1 text-blue-600" />
                [I&apos;ve Arrived]
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-card hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 dark:hover:bg-teal-950/40"
                onClick={() => simulateResponse("[I'm Feeling Fine]")}
              >
                <HeartPulse className="size-3.5 mr-1 text-teal-600" />
                [I&apos;m Feeling Fine]
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-card hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:hover:bg-rose-950/40 border-rose-200"
                onClick={() => simulateResponse("[Clinical Concern / Wrong Dose]")}
              >
                <ShieldAlert className="size-3.5 mr-1 text-rose-600" />
                [Report Wrong Dose / Pain]
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-card hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 dark:hover:bg-amber-950/40"
                onClick={() => simulateResponse("I paid (Manual)")}
              >
                <CreditCard className="size-3.5 mr-1 text-amber-600" />
                Simulate &quot;I Paid&quot;
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-card hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40"
                onClick={() => simulateResponse("Gateway Webhook Verified")}
              >
                <BadgeCheck className="size-3.5 mr-1 text-emerald-600" />
                Gateway Webhook (Verified)
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-card hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:hover:bg-purple-950/40"
                onClick={() => simulateResponse("Tier 2 Escalation (AI Call)")}
              >
                <PhoneCall className="size-3.5 mr-1 text-purple" />
                Escalate to AI Voice Call
              </Button>
            </div>

            {simulationLog.length > 0 && (
              <div className="mt-3 rounded-lg border bg-background/80 p-2.5 font-mono text-[11px] text-muted-foreground space-y-1">
                {simulationLog.slice(0, 3).map((log, i) => (
                  <p key={i} className="leading-snug">{log}</p>
                ))}
              </div>
            )}
          </section>

          {/* Full 19-Attribute Single-Record Grid */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Single-Record Standard Attributes (19 Standard Dimensions)
              </h3>
              <span className="text-xs text-muted-foreground">
                All 19 attributes telling the patient story
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {attributes.map((attr) => {
                const Icon = attr.icon;
                return (
                  <div
                    key={attr.key}
                    className="flex items-start gap-2.5 rounded-xl border bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground text-xs font-semibold">
                      {attr.num}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {attr.label}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-foreground truncate" title={attr.value}>
                        {attr.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
