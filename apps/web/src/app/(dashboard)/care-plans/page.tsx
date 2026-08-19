"use client";

import { Bell, Check, Clock3, Copy, Pencil, Plus, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { PageVisualBanner } from "@/components/page-visual-banner";
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
import { journeyTemplates } from "@/lib/demo-data";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  treatment: string;
  accent: Tone;
  steps: string[];
};

type StageConfig = {
  timing: string;
  task: string;
  reminder: string;
  escalation: string;
};

const treatments = ["Fertility Evaluation", "IUI", "IVF", "FET"];

const defaultStage = (step: string): StageConfig => ({
  timing: "Clinic scheduled",
  task: `${step} — clinic-approved instructions`,
  reminder: "24 hours before",
  escalation: "Route to coordinator after missed response",
});

const seedTemplates: Template[] = journeyTemplates.map((template) => ({
  ...template,
  treatment: template.name,
}));

export default function CarePlansPage() {
  const [templates, setTemplates] = useState<Template[]>(seedTemplates);
  const [activeId, setActiveId] = useState("tpl-ivf");
  const [editing, setEditing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [treatment, setTreatment] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stageConfigs, setStageConfigs] = useState<Record<string, StageConfig>>({});
  const active = templates.find((template) => template.id === activeId) ?? templates[0]!;

  const configuredStages = useMemo(
    () =>
      active.steps.map((step) => ({
        name: step,
        config: stageConfigs[`${active.id}:${step}`] ?? defaultStage(step),
      })),
    [active, stageConfigs],
  );

  const updateStage = (step: string, field: keyof StageConfig, value: string) => {
    const key = `${active.id}:${step}`;
    setStageConfigs((current) => ({
      ...current,
      [key]: { ...(current[key] ?? defaultStage(step)), [field]: value },
    }));
  };

  const createTemplate = () => {
    const steps = stepsText
      .split(",")
      .map((step) => step.trim())
      .filter(Boolean);
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors["name"] = "Template name is required.";
    if (!treatment) nextErrors["treatment"] = "Choose a treatment.";
    if (steps.length === 0) nextErrors["steps"] = "Add at least one stage.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const created: Template = {
      id: `tpl-${Date.now()}`,
      name: name.trim(),
      treatment,
      steps,
      accent: "primary",
    };
    setTemplates((current) => [...current, created]);
    setActiveId(created.id);
    setName("");
    setTreatment("");
    setStepsText("");
    setCreateOpen(false);
    setEditing(true);
    toast.success(`${created.name} template created`);
  };

  const duplicate = () => {
    const copy = { ...active, id: `tpl-${Date.now()}`, name: `${active.name} copy` };
    setTemplates((current) => [...current, copy]);
    setActiveId(copy.id);
    toast.success("Template duplicated");
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <PageHeader
        title="Care Plans"
        subtitle="Clinic-approved, configurable workflow templates."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Create care plan
          </Button>
        }
      />

      <PageVisualBanner
        src="/images/care-journey-banner.png"
        alt="Couple walking together through a calm, guided care journey"
        eyebrow="Clinic-approved journeys"
        title="One clear next step at every stage."
        description="Build reusable fertility workflows your team controls. Care Loop turns each approved stage into timely patient actions and staff follow-through."
      />

      <div className="grid min-h-[620px] border bg-background lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Templates
            </p>
          </div>
          <div className="divide-y">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setActiveId(template.id);
                  setEditing(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left transition-colors",
                  active.id === template.id ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <span>
                  <span className="block text-sm font-semibold">{template.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {template.treatment} · {template.steps.length} stages
                  </span>
                </span>
                {active.id === template.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </aside>

        <section>
          <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{active.name}</h2>
                <StatusBadge label="Clinic approved" tone="success" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {active.treatment} · Configure timing, tasks, reminders, and escalation routing.
              </p>
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" onClick={duplicate}>
                <Copy className="size-4" /> Duplicate
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (editing) toast.success(`${active.name} workflow saved`);
                  setEditing((value) => !value);
                }}
              >
                {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
                {editing ? "Save changes" : "Edit"}
              </Button>
            </div>
          </header>

          <div className="divide-y">
            {configuredStages.map(({ name: step, config }, index) => (
              <div key={step} className="grid gap-4 px-5 py-4 xl:grid-cols-[48px_180px_1fr]">
                <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold">{step}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Stage {index + 1}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["timing", "Timing", Clock3],
                      ["task", "Task", Workflow],
                      ["reminder", "Reminder", Bell],
                      ["escalation", "Escalation", Workflow],
                    ] as const
                  ).map(([field, label, Icon]) => (
                    <div key={field}>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="size-3.5" /> {label}
                      </Label>
                      {editing ? (
                        <Input
                          value={config[field]}
                          onChange={(event) => updateStage(step, field, event.target.value)}
                          className="h-9"
                        />
                      ) : (
                        <p className="min-h-9 border-l pl-3 text-sm">{config[field]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create care plan</DialogTitle>
            <DialogDescription>
              Start a clinic-approved workflow template. Stages remain configurable after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. IVF standard workflow"
                className="mt-1.5"
              />
              {errors["name"] && <p className="mt-1 text-xs text-danger">{errors["name"]}</p>}
            </div>
            <div>
              <Label>Treatment</Label>
              <Select value={treatment} onValueChange={setTreatment}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select treatment" />
                </SelectTrigger>
                <SelectContent>
                  {treatments.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors["treatment"] && (
                <p className="mt-1 text-xs text-danger">{errors["treatment"]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="template-steps">Stages</Label>
              <Input
                id="template-steps"
                value={stepsText}
                onChange={(event) => setStepsText(event.target.value)}
                placeholder="Consultation, Baseline, Follow-up"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">Separate stages with commas.</p>
              {errors["steps"] && <p className="mt-1 text-xs text-danger">{errors["steps"]}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createTemplate}>Create template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
