"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock,
  ChevronDown,
  ListPlus,
  MessageSquare,
  Send,
  Settings2,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";
import { reminderOptions, taskCategories } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

interface CreateTaskContext {
  open: (coupleId?: string, defaultTitle?: string, defaultCategory?: string) => void;
}

const Ctx = createContext<CreateTaskContext | null>(null);

export function useCreateTask() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCreateTask must be used inside CreateTaskProvider");
  return ctx;
}

const PRESET_TASKS = [
  { title: "Take Decapeptyl 0.1mg Injection", category: "Medication", note: "Subcutaneous in lower abdomen at exact prescribed time" },
  { title: "Day 8 Follicular Monitoring Ultrasound", category: "Ultrasound", note: "Arrive with moderately full bladder at ultrasound desk" },
  { title: "Fasting Blood Sugar & E2/P4 Hormonal Panel", category: "Diagnostics", note: "10-12 hours fasting required before blood draw" },
  { title: "Sign IVF & Cryopreservation E-Consent Form", category: "Consent", note: "Both partners must review and sign digitally" },
  { title: "Semen Sample Collection at Andrology Lab", category: "Diagnostics", note: "Strict 2-5 days abstinence required" },
];

export function CreateTaskProvider({ children }: { children: ReactNode }) {
  const { createTask, couples } = useAppState();

  const options = useMemo(() => {
    return couples.map((couple) => ({
      id: couple.id,
      label: couple.partner ? `${couple.primary.name} + ${couple.partner.name}` : couple.primary.name,
      people: [couple.primary.name, couple.partner?.name].filter(Boolean) as string[],
      phone: couple.primary.phone || "+91 77955 59724",
      primaryName: couple.primary.name,
    }));
  }, [couples]);

  const [isOpen, setIsOpen] = useState(false);
  const [coupleId, setCoupleId] = useState(options[0]?.id ?? "");
  const [title, setTitle] = useState("Take Decapeptyl 0.1mg Injection");
  const [assignee, setAssignee] = useState(options[0]?.people[0] ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("20:00");
  const [category, setCategory] = useState(taskCategories[0] || "Medication");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "CRITICAL">("NORMAL");
  const [description, setDescription] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [reminder, setReminder] = useState(reminderOptions[0] || "1 hour before");
  const [aiFollowUp, setAiFollowUp] = useState(true);
  const [escalate, setEscalate] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const open = useCallback(
    (id?: string, defaultTitle?: string, defaultCategory?: string) => {
      const match = options.find((p) => p.id === id || p.id === (id ?? options[0]?.id));
      if (match) {
        setCoupleId(match.id);
        setAssignee(match.people[0] || "Patient");
      }
      if (defaultTitle) {
        setTitle(defaultTitle);
      }
      if (defaultCategory) {
        setCategory(defaultCategory);
      }
      setDate(new Date().toISOString().slice(0, 10));
      setIsOpen(true);
    },
    [options],
  );

  const currentCouple = options.find((p) => p.id === coupleId);
  const people = currentCouple?.people ?? [];
  const patientPhone = currentCouple?.phone || "+91 77955 59724";
  const patientName = currentCouple?.primaryName || assignee || "Patient";

  const applyPreset = (preset: typeof PRESET_TASKS[number]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    if (preset.note) setDescription(preset.note);
  };

  const submit = async () => {
    if (!coupleId) {
      toast.error("Select a patient / couple first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Enter a task name.");
      return;
    }

    setSaving(true);
    try {
      const dueDateFormatted = new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });

      await createTask({
        title: title.trim(),
        coupleId,
        assignedTo: assignee,
        dueDate: date,
        dueTime: time,
        due: `${dueDateFormatted} · ${time}`,
        category,
        priority,
        note: description.trim() || undefined,
        sendWhatsApp,
        phoneNumber: patientPhone,
        status: "waiting",
      });

      setIsOpen(false);

      if (sendWhatsApp) {
        toast.success("Task Created & WhatsApp Dispatched! 📱", {
          description: `Interactive notification sent to ${patientName} at ${patientPhone}.`,
        });
      } else {
        toast.success("Task created successfully", {
          description: `Added to the clinical care plan for ${patientName}.`,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create task. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full overflow-y-auto overscroll-contain p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-5 pr-12 text-left bg-muted/20">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary shadow-xs">
                <ListPlus className="size-4" />
              </span>
              Add Clinical Care Task
            </SheetTitle>
            <SheetDescription className="text-xs">
              Schedule patient tasks into the IVF protocol. Automatically triggers WhatsApp interactive alerts.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-5 py-5">
            {/* Quick Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Zap className="size-3 text-amber-500" />
                  Quick IVF Presets
                </Label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TASKS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors text-left",
                      title === preset.title
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {preset.title.length > 28 ? preset.title.slice(0, 26) + "…" : preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Name */}
            <div className="space-y-1.5">
              <Label htmlFor="task-name" className="text-xs font-bold">
                Task Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Take Decapeptyl 0.1mg Injection"
                className="font-medium"
              />
            </div>

            {/* Patient Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Patient / Couple</Label>
              <Select
                value={coupleId}
                onValueChange={(v) => {
                  setCoupleId(v);
                  const match = options.find((p) => p.id === v);
                  if (match) setAssignee(match.people[0] || "Patient");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned to person */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Assigned To</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-date" className="text-xs font-bold">
                  Due Date
                </Label>
                <Input
                  id="task-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-time" className="text-xs font-bold">
                  Due Time
                </Label>
                <Input
                  id="task-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical (Clinical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clinical Instructions / Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="task-notes" className="text-xs font-bold">
                Clinical Instructions / Dosage
              </Label>
              <Textarea
                id="task-notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specific instructions shown to the patient on WhatsApp (e.g. Subcutaneous in abdomen, 12h fasting, etc.)"
                rows={2}
                className="text-xs"
              />
            </div>

            {/* WhatsApp Automatic Dispatch Card (HIGHLIGHT FEATURE) */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 space-y-2.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                    <MessageSquare className="size-4" />
                  </span>
                  <div>
                    <span className="block text-xs font-bold text-emerald-950 dark:text-emerald-100">
                      Send WhatsApp Alert Immediately
                    </span>
                    <span className="block text-[11px] text-emerald-800 dark:text-emerald-300">
                      Sends interactive buttons ([✅ Done], [❓ Need Help])
                    </span>
                  </div>
                </div>
                <Switch checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} />
              </div>

              {sendWhatsApp && (
                <div className="rounded-lg bg-background/90 p-2 text-xs border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <span>{patientName}</span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                      ({patientPhone})
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Advanced Settings Toggle */}
            <div className="rounded-xl border">
              <button
                type="button"
                onClick={() => setAdvancedOpen((open) => !open)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                aria-expanded={advancedOpen}
              >
                <Settings2 className="size-3.5 text-primary" />
                Advanced Automations & Escalation
                <ChevronDown
                  className={cn(
                    "ml-auto size-3.5 text-muted-foreground transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                />
              </button>
              {advancedOpen && (
                <div className="animate-fade-in space-y-3 border-t bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Label htmlFor="ai-follow" className="flex items-start gap-2 font-normal cursor-pointer">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <span className="block text-xs font-semibold">AI follow-up if incomplete</span>
                        <span className="block text-[11px] text-muted-foreground">
                          Care Loop checks in on WhatsApp, then triggers voice reminder.
                        </span>
                      </span>
                    </Label>
                    <Switch id="ai-follow" checked={aiFollowUp} onCheckedChange={setAiFollowUp} />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <Label htmlFor="escalate" className="flex items-start gap-2 font-normal cursor-pointer">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span>
                        <span className="block text-xs font-semibold">Escalate to coordinator</span>
                        <span className="block text-[11px] text-muted-foreground">
                          Overdue tasks land directly in the Care Loop inbox.
                        </span>
                      </span>
                    </Label>
                    <Switch id="escalate" checked={escalate} onCheckedChange={setEscalate} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarClock className="size-3" />
              Due: {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} at {time} · {category}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                className="w-full font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={submit}
                disabled={saving || !title.trim()}
              >
                {saving ? (
                  "Scheduling & Sending..."
                ) : (
                  <>
                    <Send className="size-4" />
                    {sendWhatsApp ? "Create Task & Send WhatsApp" : "Create Task Only"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}
