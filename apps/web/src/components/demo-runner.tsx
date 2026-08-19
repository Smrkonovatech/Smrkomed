"use client";

import { CheckCircle2, Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { WhatsAppThread, VoiceCallPanel, type ChatMessage } from "@/components/whatsapp-thread";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressBar, StatusBadge } from "@/components/ui-kit";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const steps = [
  "Doctor creates the Ultrasound task",
  "Care Loop messages Priya on WhatsApp",
  "Patient replies: “I couldn't get an appointment”",
  "AI detects: Appointment Issue",
  "Care Loop updates the task status",
  "Staff inbox: Appointment Assistance Required",
  "AI voice call placed to the patient",
  "Patient responds: “I booked it for tomorrow”",
  "Task automatically resolved",
  "Dashboard metrics updated",
];

const script: ChatMessage[] = [
  {
    from: "loop",
    text: "Hi Priya 👋 Your ultrasound is scheduled for tomorrow. Have you completed it?",
    time: "09:02",
    quickReplies: ["Yes, completed", "Not yet", "I need help"],
  },
  { from: "patient", text: "I couldn't get an appointment.", time: "09:14" },
  {
    from: "loop",
    text: "No problem. Would you like the clinic team to help you with the appointment?",
    time: "09:14",
    quickReplies: ["Yes, please", "I'll arrange it myself"],
  },
  { from: "patient", text: "Yes, please", time: "09:16" },
  {
    from: "loop",
    text: "Great — the clinic team will help. Here's what to expect during your scan.",
    time: "09:17",
    media: { kind: "video", title: "What to expect during your scan", meta: "1:48 · English" },
  },
  { from: "patient", text: "I booked it for tomorrow 🙂", time: "10:41" },
  {
    from: "loop",
    text: "Wonderful, thank you Priya! I've marked your ultrasound as arranged and informed your care team.",
    time: "10:41",
  },
];

export function DemoRunner() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1);
  const { pushActivity, bumpKpis, kpis, setTaskStatus, tasks } = useAppState();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    setOpen(true);
    setStep(0);
    timers.current.forEach(clearTimeout);
    timers.current = steps.map((_, i) =>
      setTimeout(() => {
        setStep(i);
        if (i === 3)
          pushActivity({
            patient: "Priya Sharma",
            activity: "AI detected an appointment issue",
            time: "just now",
            tone: "warning",
          });
        if (i === 5)
          pushActivity({
            patient: "Priya Sharma",
            activity: "Appointment assistance required",
            time: "just now",
            tone: "danger",
          });
        if (i === 6)
          pushActivity({
            patient: "Priya Sharma",
            activity: "AI voice call placed",
            time: "just now",
            tone: "info",
          });
        if (i === 8) {
          const firstTask = tasks[0];
          if (firstTask) void setTaskStatus(firstTask.id, "completed");
          pushActivity({
            patient: "Priya Sharma",
            activity: "Ultrasound task resolved",
            time: "just now",
            tone: "success",
          });
        }
        if (i === 9) {
          bumpKpis({
            automatedToday: kpis.automatedToday + 1,
            completion: Math.round((kpis.completion + 0.3) * 10) / 10,
            needAttention: Math.max(0, kpis.needAttention - 1),
          });
          toast.success("Care Loop demo complete", {
            description: "Task resolved without any staff chasing.",
          });
        }
      }, i * 1400),
    );
  };

  const visibleMessages = script.slice(0, Math.max(0, Math.min(script.length, step - 0)));

  return (
    <>
      <Button variant="secondary" className="rounded-xl" onClick={run}>
        <Play className="size-4" /> Run Care Loop Demo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Care Loop — live demonstration</DialogTitle>
            <DialogDescription>
              One task, followed through end to end. No staff chasing required.
            </DialogDescription>
          </DialogHeader>

          <ProgressBar pct={((step + 1) / steps.length) * 100} tone="primary" />

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border p-2.5 text-sm transition-colors",
                    i < step && "border-success/30 bg-success-soft/60",
                    i === step && "border-primary/40 bg-primary-soft",
                    i > step && "text-muted-foreground",
                  )}
                >
                  <span className="mt-0.5">
                    {i < step ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : i === step ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <span className="grid size-4 place-items-center text-[10px]">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ol>

            <div className="space-y-3">
              <div className="h-[380px]">
                <WhatsAppThread messages={visibleMessages} patientName="Priya Sharma" />
              </div>
              {step >= 6 && <VoiceCallPanel />}
              {step >= 8 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Ultrasound task</span>
                  <StatusBadge label="Resolved" tone="success" />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
