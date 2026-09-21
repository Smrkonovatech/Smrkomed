"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";
import { displayNameOf, useDoctors } from "@/lib/doctors";
import { newAppointmentSchema, type NewAppointmentValues } from "@/lib/validations/global-actions";

import { FieldGrid, SelectField, TextField } from "./form-fields";

const types = [
  "Fertility Consultation",
  "Follow-up",
  "Ultrasound",
  "Follicular Monitoring",
  "Blood Test",
  "Embryo Transfer",
  "IUI",
  "IVF Procedure",
  "Counselling",
  "Report Review",
  "Other",
].map((value) => ({ value, label: value }));

const rooms = ["Room 1", "Room 2", "Room 3", "Scan 1", "OT"].map((value) => ({
  value,
  label: value,
}));

export function NewAppointmentDialog({
  open,
  onOpenChange,
  coupleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId?: string;
}) {
  const { couples, addAppointment } = useAppState();
  const allDoctors = useDoctors();
  const doctors = allDoctors
    .filter((d) => d.status === "active" && !d.isDraft)
    .map((d) => ({ id: d.id, name: displayNameOf(d) }));
  const firstCouple = couples[0];

  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const getCoupleAppointmentLabel = (c?: typeof firstCouple) => {
    if (!c) return "Couple";
    if (c.partner?.name) {
      return `${c.primary.name} & ${c.partner.name} (Couple)`;
    }
    return c.primary.name;
  };

  const form = useForm<NewAppointmentValues>({
    resolver: zodResolver(newAppointmentSchema),
    defaultValues: {
      coupleId: coupleId ?? firstCouple?.id ?? "",
      partner: getCoupleAppointmentLabel(firstCouple),
      type: "Fertility Consultation",
      doctor: doctors[0]?.name ?? "Dr. Jismon J",
      date: defaultDate,
      time: "10:00",
      duration: 30,
      room: "Room 1",
      notes: "",
      whatsappConfirmation: true,
      whatsappReminder: true,
      careLoop: true,
    },
  });

  const selectedCoupleId = form.watch("coupleId");
  const selectedCouple = couples.find((couple) => couple.id === selectedCoupleId) ?? firstCouple;

  const partnerOptions = useMemo(() => {
    if (!selectedCouple) return [{ value: "Patient", label: "Patient" }];
    const coupleLabel = getCoupleAppointmentLabel(selectedCouple);
    if (selectedCouple.partner?.name) {
      return [
        { value: coupleLabel, label: `👥 ${coupleLabel} — Both Partners` },
        { value: selectedCouple.primary.name, label: `👤 ${selectedCouple.primary.name}` },
        { value: selectedCouple.partner.name, label: `👤 ${selectedCouple.partner.name}` },
      ];
    }
    return [{ value: selectedCouple.primary.name, label: `👤 ${selectedCouple.primary.name}` }];
  }, [selectedCouple]);

  useEffect(() => {
    if (!open) return;
    const nextCouple = couples.find((couple) => couple.id === coupleId) ?? firstCouple;
    if (!nextCouple) return;
    const coupleLabel = getCoupleAppointmentLabel(nextCouple);
    form.reset({
      coupleId: nextCouple.id,
      partner: coupleLabel,
      type: "Fertility Consultation",
      doctor: doctors[0]?.name ?? "Dr. Jismon J",
      date: defaultDate,
      time: "10:00",
      duration: 30,
      room: "Room 1",
      notes: "",
      whatsappConfirmation: true,
      whatsappReminder: true,
      careLoop: true,
    });
  }, [open, coupleId, couples, firstCouple, form, doctors, defaultDate]);

  useEffect(() => {
    if (selectedCouple) {
      const coupleLabel = getCoupleAppointmentLabel(selectedCouple);
      const validValues = [coupleLabel, selectedCouple.primary.name, selectedCouple.partner?.name].filter(Boolean);
      if (!validValues.includes(form.getValues("partner"))) {
        form.setValue("partner", coupleLabel);
      }
    }
  }, [form, selectedCouple]);

  const submit = form.handleSubmit(async (values) => {
    try {
    await addAppointment({
      coupleId: values.coupleId,
      type: values.type,
      doctor: values.doctor,
      time: values.time,
      room: values.room,
      date: values.date,
      partner: values.partner,
      duration: values.duration,
      notes: values.notes,
      whatsappConfirmation: values.whatsappConfirmation,
      whatsappReminder: values.whatsappReminder,
      careLoop: values.careLoop,
    });
    toast.success("Appointment created", {
      description: `${values.type} booked for ${values.date} at ${values.time}.`,
    });
    onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create appointment. Try again.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Book a fertility visit and optionally attach it to Care Loop follow-up.
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
                name="partner"
                label="Appointment for"
                placeholder="Select attendee"
                options={partnerOptions}
              />
              <SelectField
                control={form.control}
                name="type"
                label="Appointment type"
                placeholder="Type"
                options={types}
              />
              <SelectField
                control={form.control}
                name="doctor"
                label="Doctor"
                placeholder="Doctor"
                options={doctors.map((member) => ({ value: member.name, label: member.name }))}
              />
              <TextField control={form.control} name="date" label="Date" type="date" />
              <TextField control={form.control} name="time" label="Time" type="time" />
              <TextField
                control={form.control}
                name="duration"
                label="Duration (minutes)"
                type="number"
              />
              <SelectField
                control={form.control}
                name="room"
                label="Room"
                placeholder="Room"
                options={rooms}
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
            <div className="space-y-2 rounded-lg border p-3">
              {(
                [
                  ["whatsappConfirmation", "Send WhatsApp confirmation"],
                  ["whatsappReminder", "Send reminder"],
                  ["careLoop", "Add to Care Loop"],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-3">
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Appointment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
