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
import { Switch } from "@/components/ui/switch";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAppState } from "@/lib/app-state";
import { clinicErrorMessage, type ClinicStaff } from "@/lib/clinic-api";
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

const UNASSIGNED = { value: "__unassigned__", label: "Unassigned" };

const DOCTOR_ROLES = new Set(["DOCTOR"]);
const COORDINATOR_ROLES = new Set(["CARE_COORDINATOR"]);

function isDoctor(member: ClinicStaff) {
  return DOCTOR_ROLES.has(member.role);
}

function isCoordinator(member: ClinicStaff) {
  return COORDINATOR_ROLES.has(member.role);
}

function staffOption(member: { id: string; name: string; email?: string; roleName: string }) {
  const label = member.name?.trim() || member.email?.trim() || member.roleName;
  return { value: member.id, label };
}

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
  const { addCouple, staff, staffError, staffLoading, reloadStaff } = useAppState();
  const doctors = staff.filter(isDoctor);
  const coordinators = staff.filter(isCoordinator);
  const staffReady = !staffError && !staffLoading;
  const doctorOptions = [
    UNASSIGNED,
    ...(staffReady ? doctors.map(staffOption).filter((option) => option.value) : []),
  ];
  const coordinatorOptions = [
    UNASSIGNED,
    ...(staffReady ? coordinators.map(staffOption).filter((option) => option.value) : []),
  ];
  const staffEmptyMessage =
    staffReady && staff.length === 0
      ? "No doctors or coordinators are available for this clinic."
      : staffReady && doctors.length === 0 && coordinators.length === 0
        ? "No doctors or coordinators are available for this clinic."
        : null;

  const form = useForm<AddCoupleValues>({
    resolver: zodResolver(addCoupleSchema),
    defaultValues: {
      primary: emptyPerson,
      partner: emptyPerson,
      treatment: "IVF",
      doctor: "__unassigned__",
      coordinator: "__unassigned__",
      whatsappConsent: false,
      carePlanTemplate: "None",
    },
  });

  useEffect(() => {
    if (open) void reloadStaff();
  }, [open, reloadStaff]);

  const submit = form.handleSubmit(async (values) => {
    try {
      const couple = await addCouple(values);
      toast.success("Couple created", {
        description: `${couple.primary.name}${couple.partner ? ` + ${couple.partner.name}` : ""} saved to the clinic.`,
      });
      form.reset();
      onOpenChange(false);
      router.push(`/patients/${couple.slug}`);
    } catch (error) {
      toast.error(clinicErrorMessage(error, "Unable to create the patient. Please try again."));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
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
              {staffLoading ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Loading clinic staff…
                </p>
              ) : staffError ? (
                <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-3 text-sm">
                  <p className="font-medium text-danger">Unable to load clinic staff</p>
                  <p className="mt-1 text-xs text-muted-foreground">{staffError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => void reloadStaff()}
                  >
                    Try again
                  </Button>
                </div>
              ) : staffEmptyMessage ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {staffEmptyMessage}
                </p>
              ) : null}
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
                  options={doctorOptions}
                />
                <SelectField
                  control={form.control}
                  name="coordinator"
                  label="Assigned coordinator"
                  placeholder="Select coordinator"
                  options={coordinatorOptions}
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
              <Button type="submit" disabled={form.formState.isSubmitting || staffLoading}>
                Create Couple
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
