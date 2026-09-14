"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock3,
  Ellipsis,
  MessageCircle,
  Phone,
  Send,
  ShieldAlert,
  UserRoundPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";
import {
  coupleFullLabel,
  getCouple,
  team,
  type ExceptionItem,
  type ExceptionKind,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Priority = "danger" | "warning" | "purple" | "success";

const priorityByKind: Record<ExceptionKind, Priority> = {
  clinical_review: "danger",
  no_response: "warning",
  missing_report: "warning",
  appointment_issue: "warning",
  ai_escalation: "purple",
};

const visual: Record<Priority, { dot: string; badge: string; border: string; icon: string }> = {
  danger: {
    dot: "bg-danger",
    badge: "bg-danger-soft text-danger",
    border: "hover:border-danger/35",
    icon: "bg-danger-soft text-danger",
  },
  warning: {
    dot: "bg-warning",
    badge: "bg-warning-soft text-warning-foreground",
    border: "hover:border-warning/40",
    icon: "bg-warning-soft text-warning-foreground",
  },
  purple: {
    dot: "bg-purple",
    badge: "bg-purple-soft text-purple",
    border: "hover:border-purple/35",
    icon: "bg-purple-soft text-purple",
  },
  success: {
    dot: "bg-success",
    badge: "bg-success-soft text-success",
    border: "hover:border-success/35",
    icon: "bg-success-soft text-success",
  },
};

const labelByKind: Record<ExceptionKind, string> = {
  clinical_review: "Clinical review",
  no_response: "No response",
  missing_report: "Missing report",
  appointment_issue: "Appointment issue",
  ai_escalation: "AI escalation",
};

const primaryByKind: Record<ExceptionKind, string> = {
  clinical_review: "Review patient",
  no_response: "Contact patient",
  missing_report: "Request report",
  appointment_issue: "Resolve appointment",
  ai_escalation: "Review escalation",
};

const patientReplies: Record<ExceptionKind, string> = {
  appointment_issue: "I couldn't get an appointment. Can the clinic help me?",
  no_response: "No response received after the latest reminder.",
  clinical_review: "I have a new concern and would like the care team to call me.",
  missing_report: "The lab said they will email the report directly to the clinic.",
  ai_escalation: "Could someone from the clinical team answer my treatment question?",
};

const quickMessages = [
  "Please upload the report",
  "Would you like us to call you?",
  "Please confirm your appointment",
];

function relativeTime(item: ExceptionItem) {
  return item.lastAction.split("·").at(-1)?.trim() ?? "Recently";
}

function aiAlreadyDid(item: ExceptionItem) {
  if (item.kind === "no_response") return "2 WhatsApp reminders sent";
  if (item.kind === "missing_report") return "Report reminder sent yesterday";
  if (item.kind === "appointment_issue") return "Follow-up captured and classified";
  if (item.kind === "clinical_review") return "Conversation paused and routed safely";
  return "Question classified outside AI scope";
}

export function ExceptionCard({ item }: { item: ExceptionItem }) {
  const couple = getCouple(item.coupleId);
  const { resolveException } = useAppState();
  const { openAction } = useGlobalActions();
  const [detailOpen, setDetailOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [owner, setOwner] = useState(item.owner === "doctor" ? couple.doctor : couple.coordinator);
  const [nextOwner, setNextOwner] = useState(owner);
  const [assignmentNote, setAssignmentNote] = useState("");
  const [message, setMessage] = useState("");
  const [escalationTarget, setEscalationTarget] = useState("Doctor");
  const [escalationReason, setEscalationReason] = useState(item.reason);
  const [localEvents, setLocalEvents] = useState<string[]>([]);
  const priority = priorityByKind[item.kind];
  const styles = visual[priority];
  const name = coupleFullLabel(couple);
  const time = relativeTime(item);

  const timeline = useMemo(
    () => [
      ["10:32 AM", "Care Loop sent the scheduled follow-up"],
      ["10:35 AM", item.kind === "no_response" ? "No response received" : "Patient responded"],
      ["10:36 AM", `AI detected: ${item.intent}`],
      ["10:37 AM", item.suggested],
      ...localEvents.map((event) => ["Just now", event]),
    ],
    [item, localEvents],
  );

  const resolve = () => {
    resolveException(item.id);
    setResolveOpen(false);
    setDetailOpen(false);
    toast.success("Exception resolved");
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    setLocalEvents((current) => [...current, "Staff sent a WhatsApp message"]);
    setMessage("");
    setMessageOpen(false);
    toast.success("WhatsApp message queued", {
      description: "Demo mode recorded the communication action.",
    });
  };

  const assign = () => {
    setOwner(nextOwner);
    setLocalEvents((current) => [
      ...current,
      `Assigned to ${nextOwner}${assignmentNote.trim() ? ` — ${assignmentNote.trim()}` : ""}`,
    ]);
    setAssignOpen(false);
    toast.success(`Assigned to ${nextOwner}`);
  };

  const escalate = () => {
    setLocalEvents((current) => [
      ...current,
      `Escalated to ${escalationTarget}: ${escalationReason}`,
    ]);
    setEscalateOpen(false);
    toast.success(`Escalated to ${escalationTarget}`);
  };

  const primaryAction = () => {
    if (item.kind === "no_response" || item.kind === "missing_report") {
      setMessage(
        item.kind === "missing_report"
          ? "Please upload the report when it is available."
          : "Would you like us to call you?",
      );
      setMessageOpen(true);
      return;
    }
    setDetailOpen(true);
  };

  return (
    <>
      <article
        className={cn(
          "group animate-rise rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(41_35_45/0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-24px_rgb(91_42_104/0.35)]",
          styles.border,
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn("mt-1 grid size-9 shrink-0 place-items-center rounded-xl", styles.icon)}
          >
            {item.kind === "clinical_review" ? (
              <ShieldAlert className="size-4" />
            ) : (
              <Bot className="size-4" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  styles.badge,
                )}
              >
                <span className={cn("size-1.5 rounded-full", styles.dot)} />
                {labelByKind[item.kind]}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                {time}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="mt-3 block w-full text-left"
            >
              <h3 className="text-[16px] font-semibold tracking-tight group-hover:text-primary">
                {name}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {couple.cycleLabel} · {couple.stage} · {item.task}
              </p>
              <p className="mt-2 text-sm leading-5 text-foreground">{item.reason}</p>
            </button>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/55 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  AI already did
                </p>
                <p className="mt-1 text-xs font-medium">{aiAlreadyDid(item)}</p>
              </div>
              <div className="rounded-xl bg-primary-soft/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/70">
                  Next action
                </p>
                <p className="mt-1 text-xs font-medium text-primary">{item.suggested}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
              <Button size="sm" onClick={primaryAction}>
                {primaryByKind[item.kind]}
                <ArrowRight className="size-3.5" />
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                Owner: <span className="font-medium text-foreground">{owner}</span>
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => setDetailOpen(true)}>
                    Open details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setMessageOpen(true)}>
                    Message patient
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setAssignOpen(true)}>
                    Assign owner
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(item.kind === "clinical_review" ||
                    item.kind === "ai_escalation" ||
                    item.kind === "no_response") && (
                    <DropdownMenuItem
                      className="text-danger"
                      onSelect={() => setEscalateOpen(true)}
                    >
                      Escalate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setResolveOpen(true)}>
                    Mark resolved
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </article>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-5 pr-12 text-left">
            <div className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", styles.dot)} />
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {labelByKind[item.kind]}
              </span>
            </div>
            <SheetTitle className="mt-2 text-2xl tracking-tight">{name}</SheetTitle>
            <SheetDescription>
              {couple.cycleLabel} · {couple.stage} · {item.task}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 p-6">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Patient context
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [couple.primary.name, `${couple.primary.age} yrs`],
                  [couple.partner?.name ?? "Partner", `${couple.partner?.age ?? "—"} yrs`],
                  ["Treatment", couple.cycleLabel],
                  ["Current stage", couple.stage],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted/55 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What happened
              </p>
              <blockquote className="mt-3 rounded-xl border-l-2 border-primary bg-primary-soft/45 px-4 py-3 text-sm leading-6">
                “{item.aiSummary}”
              </blockquote>
              <p className="mt-2 text-xs text-muted-foreground">
                Patient response: “{patientReplies[item.kind]}”
              </p>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Care Loop activity
              </p>
              <ol className="mt-3 space-y-0">
                {timeline.map(([eventTime, event], index) => (
                  <li
                    key={`${eventTime}-${event}-${index}`}
                    className="grid grid-cols-[68px_16px_1fr] gap-2"
                  >
                    <span className="py-2 text-xs tabular-nums text-muted-foreground">
                      {eventTime}
                    </span>
                    <span className="relative flex justify-center">
                      <span className="mt-3 size-2 rounded-full bg-primary" />
                      {index < timeline.length - 1 && (
                        <span className="absolute top-5 bottom-0 w-px bg-border" />
                      )}
                    </span>
                    <p className="py-2 text-sm">{event}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl bg-primary-soft/60 p-4">
              <div className="flex items-start gap-3">
                <Bot className="mt-0.5 size-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                    Recommended action
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">{item.suggested}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Care Loop coordinates follow-through only. Clinical decisions remain with the
                    clinic.
                  </p>
                </div>
              </div>
              <Button className="mt-4" asChild>
                <Link href={`/patients/${couple.slug}`}>
                  {item.kind === "clinical_review" ? "Review patient" : "Open patient context"}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </section>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setAssignOpen(true)}>
                <UserRoundPlus className="size-4" /> Assign
              </Button>
              <Button variant="outline" onClick={() => setMessageOpen(true)}>
                <MessageCircle className="size-4" /> Message
              </Button>
              {item.kind === "appointment_issue" && (
                <Button
                  variant="outline"
                  onClick={() => openAction("new-appointment", { coupleId: couple.id })}
                >
                  <CalendarPlus className="size-4" /> Create appointment
                </Button>
              )}
              <Button variant="outline" onClick={() => setResolveOpen(true)}>
                <Check className="size-4" /> Resolve
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message {name}</DialogTitle>
            <DialogDescription>
              Continue the conversation without leaving Care Loop.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl bg-muted/55 p-3">
              <div className="max-w-[85%] rounded-xl bg-card px-3 py-2 text-xs shadow-sm">
                Hi {couple.primary.name.split(" ")[0]}, were you able to complete {item.task}?
              </div>
              <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-3 py-2 text-xs text-primary-foreground">
                {patientReplies[item.kind]}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickMessages.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setMessage(quick)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {quick}
                </button>
              ))}
            </div>
            <Label htmlFor={`message-${item.id}`}>Message</Label>
            <Textarea
              id={`message-${item.id}`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type a short, clear message..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendMessage} disabled={!message.trim()}>
              <Send className="size-4" /> Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign exception</DialogTitle>
            <DialogDescription>Current owner: {owner}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={nextOwner} onValueChange={setNextOwner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {team.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`note-${item.id}`}>Optional note</Label>
              <Textarea
                id={`note-${item.id}`}
                value={assignmentNote}
                onChange={(event) => setAssignmentNote(event.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={assign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve exception?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this issue as resolved and remove it from the active Care Loop queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resolve}>Mark resolved</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escalate exception</DialogTitle>
            <DialogDescription>Route this issue to the right human owner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Escalate to</Label>
              <Select value={escalationTarget} onValueChange={setEscalationTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Care Coordinator">Care Coordinator</SelectItem>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                  <SelectItem value="Clinic Admin">Clinic Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`reason-${item.id}`}>Reason</Label>
              <Textarea
                id={`reason-${item.id}`}
                value={escalationReason}
                onChange={(event) => setEscalationReason(event.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={escalate}
            >
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
