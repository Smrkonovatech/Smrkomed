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
  User,
  Users,
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
      primary: {
        id: couple.primary.id,
        name: couple.primary.name,
        phone: couple.primary.phone || "+91 77955 59724",
      },
      partner: couple.partner
        ? {
            id: couple.partner.id,
            name: couple.partner.name,
            phone: couple.partner.phone || "",
          }
        : null,
      people: [couple.primary.name, couple.partner?.name].filter(Boolean) as string[],
    }));
  }, [couples]);

  const [isOpen, setIsOpen] = useState(false);
  const [coupleId, setCoupleId] = useState(options[0]?.id ?? "");
  const [targetRole, setTargetRole] = useState<"PRIMARY" | "PARTNER" | "COUPLE">("PRIMARY");
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
        setAssignee(match.primary.name);
        setTargetRole("PRIMARY");
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
  const primaryName = currentCouple?.primary.name || "Patient";
  const primaryPhone = currentCouple?.primary.phone || "+91 77955 59724";
  const partnerName = currentCouple?.partner?.name || null;
  const partnerPhone = currentCouple?.partner?.phone || "";

  const resolvedTargetPhone =
    targetRole === "PARTNER" ? (partnerPhone || primaryPhone) : primaryPhone;
  const resolvedTargetName =
    targetRole === "PARTNER"
      ? (partnerName || "Partner")
      : targetRole === "COUPLE"
      ? (partnerName ? `${primaryName} & ${partnerName}` : primaryName)
      : primaryName;

  const handleRoleChange = (role: "PRIMARY" | "PARTNER" | "COUPLE") => {
    setTargetRole(role);
    if (role === "PRIMARY") {
      setAssignee(primaryName);
    } else if (role === "PARTNER" && partnerName) {
      setAssignee(partnerName);
    } else if (role === "COUPLE") {
      setAssignee(partnerName ? `${primaryName} & ${partnerName}` : primaryName);
    }
  };

  const applyPreset = (preset: typeof PRESET_TASKS[number]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    if (preset.note) setDescription(preset.note);
    if (preset.title.toLowerCase().includes("semen")) {
      handleRoleChange("PARTNER");
    } else if (preset.title.toLowerCase().includes("consent")) {
      handleRoleChange("COUPLE");
    }
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

      const isPartner = targetRole === "PARTNER";
      const isCouple = targetRole === "COUPLE";
      const targetPatientId = isPartner ? currentCouple?.partner?.id : currentCouple?.primary.id;

      await createTask({
        title: title.trim(),
        coupleId,
        assignedTo: assignee || resolvedTargetName,
        dueDate: date,
        dueTime: time,
        due: `${dueDateFormatted} · ${time}`,
        category,
        priority,
        note: description.trim() || undefined,
        sendWhatsApp,
        phoneNumber: resolvedTargetPhone,
        targetRole,
        targetPatientId,
        targetName: resolvedTargetName,
        broadcastToBoth: isCouple,
        partnerPhoneNumber: partnerPhone || undefined,
        status: "waiting",
      });

      setIsOpen(false);

      if (sendWhatsApp) {
        if (isCouple) {
          toast.success("Task Created & Couple Broadcast Dispatched! 👥📱", {
            description: `Sent to both ${primaryName} (${primaryPhone}) and ${partnerName || "Partner"} (${partnerPhone || "Registered on file"}).`,
          });
        } else if (isPartner) {
          toast.success("Task Created & Partner WhatsApp Dispatched! 👨📱", {
            description: `Interactive alert sent to partner ${partnerName || "Partner"} at ${resolvedTargetPhone}.`,
          });
        } else {
          toast.success("Task Created & WhatsApp Dispatched! 👩📱", {
            description: `Interactive notification sent to ${primaryName} at ${primaryPhone}.`,
          });
        }
      } else {
        toast.success("Task created successfully", {
          description: `Added to the clinical care plan for ${resolvedTargetName}.`,
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

            {/* Recipient Targeting: Primary, Partner, or Both (Couple Broadcast) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Target Recipient (Couple / Individual)
                </Label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {targetRole === "COUPLE" ? "Couple Broadcast" : "Individual Alert"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleChange("PRIMARY")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                    targetRole === "PRIMARY"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border/70 hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <User className="size-4 mb-1" />
                  <span className="text-xs font-semibold truncate max-w-full">
                    {primaryName}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider opacity-75">
                    Primary
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange("PARTNER")}
                  disabled={!partnerName}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                    targetRole === "PARTNER"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border/70 hover:bg-muted/50 text-muted-foreground",
                    !partnerName && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <User className="size-4 mb-1 text-blue-500" />
                  <span className="text-xs font-semibold truncate max-w-full">
                    {partnerName || "No Partner"}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider opacity-75">
                    Partner
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange("COUPLE")}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                    targetRole === "COUPLE"
                      ? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                      : "border-border/70 hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <Users className="size-4 mb-1 text-emerald-600" />
                  <span className="text-xs font-semibold truncate max-w-full">
                    Both
                  </span>
                  <span className="text-[9px] uppercase tracking-wider opacity-75">
                    Broadcast
                  </span>
                </button>
              </div>
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
                <div className="rounded-lg bg-background/90 p-2.5 text-xs border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px] font-medium">
                      WhatsApp Dispatch Preview:
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      {targetRole === "COUPLE" ? "👥 2 Recipients (Broadcast)" : targetRole === "PARTNER" ? "👨 Partner" : "👩 Primary"}
                    </span>
                  </div>
                  {targetRole === "COUPLE" ? (
                    <div className="space-y-1 pt-1 border-t border-border/50 text-[11px]">
                      <div className="flex items-center justify-between text-foreground">
                        <span>1. {primaryName} (Primary)</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{primaryPhone}</span>
                      </div>
                      <div className="flex items-center justify-between text-foreground">
                        <span>2. {partnerName || "Partner"} (Partner)</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{partnerPhone || "(on file)"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between font-semibold text-foreground pt-0.5">
                      <span>{resolvedTargetName}</span>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                        {resolvedTargetPhone}
                      </span>
                    </div>
                  )}
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
