"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Form } from "@/components/ui/form";
import { useAppState } from "@/lib/app-state";
import { team } from "@/lib/demo-data";
import { startCycleSchema, type StartCycleValues } from "@/lib/validations/global-actions";

import { FieldGrid, SelectField, TextField } from "./form-fields";

const templates = [
  { value: "IVF", label: "IVF" },
  { value: "IUI", label: "IUI" },
  { value: "FET", label: "FET" },
];
const doctors = team.filter((member) => member.name.startsWith("Dr."));
const coordinators = team.filter((member) => member.role.toLowerCase().includes("coordinator"));

export function StartCycleDialog({
  open,
  onOpenChange,
  coupleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId?: string;
}) {
  const router = useRouter();
  const { couples, addCycle } = useAppState();
  const firstCouple = couples[0];

  const form = useForm<StartCycleValues>({
    resolver: zodResolver(startCycleSchema),
    defaultValues: {
      coupleId: coupleId ?? firstCouple?.id ?? "",
      treatment: "IVF",
      cycleLabel: "IVF Cycle 01",
      doctor: doctors[0]?.name ?? "Dr. Ananya Rao",
      coordinator: coordinators[0]?.name ?? "Meera Iyer",
      startDate: "2026-08-18",
      template: "IVF",
    },
  });

  useEffect(() => {
    if (!open) return;
    const couple = couples.find((item) => item.id === coupleId) ?? firstCouple;
    const treatment =
      couple?.treatment === "IUI" || couple?.treatment === "FET" ? couple.treatment : "IVF";
    form.reset({
      coupleId: couple?.id ?? "",
      treatment,
      cycleLabel: `${treatment} Cycle 01`,
      doctor: couple?.doctor ?? doctors[0]?.name ?? "Dr. Ananya Rao",
      coordinator: couple?.coordinator ?? coordinators[0]?.name ?? "Meera Iyer",
      startDate: "2026-08-18",
      template: treatment,
    });
  }, [open, coupleId, couples, firstCouple, form]);

  const submit = form.handleSubmit((values) => {
    addCycle(values);
    toast.success("Cycle started", { description: `${values.cycleLabel} is now active.` });
    onOpenChange(false);
    router.push("/ivf-cycles");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start cycle</DialogTitle>
          <DialogDescription>
            Start an IVF, IUI or FET journey from a clinic-approved template.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FieldGrid>
              <SelectField
                control={form.control}
                name="coupleId"
                label="Couple"
                placeholder="Select couple"
                options={couples.map((couple) => ({
                  value: couple.id,
                  label: couple.partner
                    ? `${couple.primary.name} + ${couple.partner.name}`
                    : couple.primary.name,
                }))}
              />
              <SelectField
                control={form.control}
                name="treatment"
                label="Treatment"
                placeholder="Treatment"
                options={templates}
              />
              <TextField control={form.control} name="cycleLabel" label="Cycle name / number" />
              <SelectField
                control={form.control}
                name="doctor"
                label="Doctor"
                placeholder="Doctor"
                options={doctors.map((member) => ({ value: member.name, label: member.name }))}
              />
              <SelectField
                control={form.control}
                name="coordinator"
                label="Coordinator"
                placeholder="Coordinator"
                options={coordinators.map((member) => ({ value: member.name, label: member.name }))}
              />
              <TextField control={form.control} name="startDate" label="Start date" type="date" />
              <SelectField
                control={form.control}
                name="template"
                label="Care plan template"
                placeholder="Template"
                options={templates}
              />
            </FieldGrid>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Cycle</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
