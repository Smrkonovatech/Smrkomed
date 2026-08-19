"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";
import { team } from "@/lib/demo-data";
import { addEnquirySchema, type AddEnquiryValues } from "@/lib/validations/global-actions";

import { FieldGrid, SelectField, TextField } from "./form-fields";

const sources = [
  "Website",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Google",
  "Referral",
  "Walk-in",
  "Phone",
].map((value) => ({ value, label: value }));
const treatments = ["IVF", "IUI", "Evaluation", "FET"].map((value) => ({
  value,
  label: value,
}));
const counselors = team
  .filter(
    (member) =>
      member.role.toLowerCase().includes("coordinator") ||
      member.role.toLowerCase().includes("front"),
  )
  .map((member) => ({ value: member.name, label: member.name }));

const defaults: AddEnquiryValues = {
  name: "",
  partner: "",
  phone: "",
  email: "",
  source: "WhatsApp",
  treatment: "IVF",
  counselor: counselors[0]?.value ?? "Meera Iyer",
  followUp: "",
  notes: "",
};

export function AddEnquiryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addEnquiry } = useAppState();
  const form = useForm<AddEnquiryValues>({
    resolver: zodResolver(addEnquirySchema),
    defaultValues: defaults,
  });
  const submit = form.handleSubmit((values) => {
    addEnquiry(values);
    toast.success("Enquiry added", {
      description: `${values.name} is now in New Enquiry.`,
    });
    form.reset(defaults);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add enquiry</DialogTitle>
          <DialogDescription>
            Capture a fertility lead before it becomes a couple record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FieldGrid>
              <TextField control={form.control} name="name" label="Name" />
              <TextField control={form.control} name="partner" label="Partner name" />
              <TextField control={form.control} name="phone" label="Phone" />
              <TextField control={form.control} name="email" label="Email" type="email" />
              <SelectField
                control={form.control}
                name="source"
                label="Source"
                placeholder="Source"
                options={sources}
              />
              <SelectField
                control={form.control}
                name="treatment"
                label="Treatment interest"
                placeholder="Treatment"
                options={treatments}
              />
              <SelectField
                control={form.control}
                name="counselor"
                label="Assigned counselor"
                placeholder="Counselor"
                options={counselors}
              />
              <TextField
                control={form.control}
                name="followUp"
                label="Next follow-up"
                type="date"
              />
            </FieldGrid>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Enquiry</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
