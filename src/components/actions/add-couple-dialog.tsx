"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAppState } from "@/lib/app-state";
import { team } from "@/lib/demo-data";
import { addCoupleSchema, type AddCoupleValues } from "@/lib/validations/global-actions";

import { FieldGrid, SelectField, TextField } from "./form-fields";

const languages = ["English", "Hindi", "Kannada", "Malayalam", "Tamil"].map((value) => ({
  value,
  label: value,
}));

const treatments = [
  { value: "Evaluation", label: "Fertility Evaluation" },
  { value: "IUI", label: "IUI" },
  { value: "IVF", label: "IVF" },
  { value: "FET", label: "FET" },
];

const templates = [
  { value: "None", label: "None" },
  { value: "Fertility Evaluation", label: "Fertility Evaluation" },
  { value: "IUI", label: "IUI" },
  { value: "IVF", label: "IVF" },
  { value: "FET", label: "FET" },
];

const emptyPerson = {
  fullName: "",
  dob: "",
  phone: "",
  email: "",
  language: "English",
};

export function AddCoupleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { addCouple } = useAppState();
  const doctors = team.filter(
    (member) =>
      member.role.toLowerCase().includes("fertility") ||
      member.role.toLowerCase().includes("endocrin"),
  );
  const coordinators = team.filter(
    (member) =>
      member.role.toLowerCase().includes("coordinator") ||
      member.role.toLowerCase().includes("front"),
  );

  const form = useForm<AddCoupleValues>({
    resolver: zodResolver(addCoupleSchema),
    defaultValues: {
      primary: emptyPerson,
      partner: emptyPerson,
      treatment: "IVF",
      doctor: doctors[0]?.name ?? "Dr. Ananya Rao",
      coordinator: coordinators[0]?.name ?? "Meera Iyer",
      whatsappConsent: true,
      carePlanTemplate: "IVF",
    },
  });

  const submit = form.handleSubmit((values) => {
    const couple = addCouple(values);
    toast.success("Couple created", {
      description: `${couple.primary.name} + ${couple.partner?.name ?? "partner"} added to the clinic.`,
    });
    form.reset();
    onOpenChange(false);
    router.push(`/patients/${couple.slug}`);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add couple</DialogTitle>
          <DialogDescription>
            Create a couple-first fertility record and optionally attach a care plan template.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Partner 1</h3>
              <FieldGrid>
                <TextField control={form.control} name="primary.fullName" label="Full name" />
                <TextField
                  control={form.control}
                  name="primary.dob"
                  label="Date of birth"
                  type="date"
                />
                <TextField control={form.control} name="primary.phone" label="Phone" />
                <TextField control={form.control} name="primary.email" label="Email" type="email" />
                <SelectField
                  control={form.control}
                  name="primary.language"
                  label="Preferred language"
                  placeholder="Language"
                  options={languages}
                />
              </FieldGrid>
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Partner 2</h3>
              <FieldGrid>
                <TextField control={form.control} name="partner.fullName" label="Full name" />
                <TextField
                  control={form.control}
                  name="partner.dob"
                  label="Date of birth"
                  type="date"
                />
                <TextField control={form.control} name="partner.phone" label="Phone" />
                <TextField control={form.control} name="partner.email" label="Email" type="email" />
                <SelectField
                  control={form.control}
                  name="partner.language"
                  label="Preferred language"
                  placeholder="Language"
                  options={languages}
                />
              </FieldGrid>
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Treatment</h3>
              <FieldGrid>
                <SelectField
                  control={form.control}
                  name="treatment"
                  label="Treatment"
                  placeholder="Select treatment"
                  options={treatments}
                />
                <SelectField
                  control={form.control}
                  name="doctor"
                  label="Assigned doctor"
                  placeholder="Select doctor"
                  options={doctors.map((member) => ({ value: member.name, label: member.name }))}
                />
                <SelectField
                  control={form.control}
                  name="coordinator"
                  label="Assigned coordinator"
                  placeholder="Select coordinator"
                  options={coordinators.map((member) => ({
                    value: member.name,
                    label: member.name,
                  }))}
                />
                <SelectField
                  control={form.control}
                  name="carePlanTemplate"
                  label="Create care plan"
                  placeholder="Select template"
                  options={templates}
                />
              </FieldGrid>
              <FormField
                control={form.control}
                name="whatsappConsent"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <FormLabel>WhatsApp consent</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        I agree to receive appointment reminders, care-plan updates and clinic
                        communications through WhatsApp/phone.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create Couple
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
