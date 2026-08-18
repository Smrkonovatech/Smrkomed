"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock,
  ChevronDown,
  ListPlus,
  Settings2,
  Sparkles,
  TriangleAlert,
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
import { useAppState } from "@/lib/app-state";
import { reminderOptions, taskCategories } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

interface CreateTaskContext {
  open: (coupleId?: string) => void;
}

const Ctx = createContext<CreateTaskContext | null>(null);

export function useCreateTask() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCreateTask must be used inside CreateTaskProvider");
  return ctx;
}

export function CreateTaskProvider({ children }: { children: ReactNode }) {
  const { createTask, couples } = useAppState();
  const options = couples.map((couple) => ({
    id: couple.id,
    label: couple.partner ? `${couple.primary.name} + ${couple.partner.name}` : couple.primary.name,
    people: [couple.primary.name, couple.partner?.name].filter(Boolean) as string[],
  }));
  const [isOpen, setIsOpen] = useState(false);
  const [coupleId, setCoupleId] = useState(options[0]?.id ?? "");
  const [title, setTitle] = useState("Complete Ultrasound");
  const [assignee, setAssignee] = useState(options[0]?.people[0] ?? "");
  const [date, setDate] = useState("2026-08-20");
  const [time, setTime] = useState("10:00");
  const [category, setCategory] = useState(taskCategories[0]!);
  const [reminder, setReminder] = useState(reminderOptions[0]!);
  const [aiFollowUp, setAiFollowUp] = useState(true);
  const [escalate, setEscalate] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const open = useCallback(
    (id?: string) => {
      const match = options.find((p) => p.id === (id ?? options[0]?.id));
      if (match) {
        setCoupleId(match.id);
        setAssignee(match.people[0]!);
      }
      setIsOpen(true);
    },
    [options],
  );

  const people = options.find((p) => p.id === coupleId)?.people ?? [];

  const submit = () => {
    setSaving(true);
    setTimeout(() => {
      createTask({
        title,
        coupleId,
        assignedTo: assignee,
        due: `${new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${time}`,
        category,
        status: "waiting",
        ...(aiFollowUp ? { note: "Care Loop follow-up scheduled" } : {}),
      });
      setSaving(false);
      setIsOpen(false);
      toast.success("Task created", {
        description: aiFollowUp
          ? `Care Loop will follow up with ${assignee} ${reminder.toLowerCase()}.`
          : `Assigned to ${assignee}.`,
      });
    }, 600);
  };

  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-5 pr-12 text-left">
            <SheetTitle className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-primary-soft text-primary">
                <ListPlus className="size-4" />
              </span>
              Create Task
            </SheetTitle>
            <SheetDescription>
              Doctors create the care plan. Care Loop makes sure patients follow it.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-5 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="task-name">Task name</Label>
              <Input id="task-name" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Select
                value={coupleId}
                onValueChange={(v) => {
                  setCoupleId(v);
                  const match = options.find((p) => p.id === v);
                  if (match) setAssignee(match.people[0]!);
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

            <div className="space-y-1.5">
              <Label>Assigned to</Label>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-date">Due date</Label>
                <Input
                  id="task-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-time">Due time</Label>
                <Input
                  id="task-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
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
              <Label>Reminder</Label>
              <Select value={reminder} onValueChange={setReminder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border">
              <button
                type="button"
                onClick={() => setAdvancedOpen((open) => !open)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium"
                aria-expanded={advancedOpen}
              >
                <Settings2 className="size-4 text-primary" />
                Advanced automation
                <ChevronDown
                  className={cn(
                    "ml-auto size-4 text-muted-foreground transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                />
              </button>
              {advancedOpen && (
                <div className="animate-fade-in space-y-3 border-t bg-muted/35 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Label htmlFor="ai-follow" className="flex items-start gap-2 font-normal">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-medium">
                          AI follow-up if incomplete
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Care Loop checks in on WhatsApp, then by voice.
                        </span>
                      </span>
                    </Label>
                    <Switch id="ai-follow" checked={aiFollowUp} onCheckedChange={setAiFollowUp} />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <Label htmlFor="escalate" className="flex items-start gap-2 font-normal">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                      <span>
                        <span className="block text-sm font-medium">
                          Escalate to staff if unresolved
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Exception lands in the Care Loop inbox.
                        </span>
                      </span>
                    </Label>
                    <Switch id="escalate" checked={escalate} onCheckedChange={setEscalate} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Reminder {reminder.toLowerCase()} · {category}
            </div>

            <Button className="w-full" onClick={submit} disabled={saving || !title.trim()}>
              {saving ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}
