"use client";

import { useEffect } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/lib/app-state";
import { uploadDocumentSchema, type UploadDocumentValues } from "@/lib/validations/global-actions";

import { FieldGrid, SelectField } from "./form-fields";

const categories = [
  "Scan Reports",
  "Lab Reports",
  "Prescriptions",
  "Consent",
  "Treatment Documents",
  "Invoices",
  "Other",
].map((value) => ({ value, label: value }));

export function UploadDocumentDialog({
  open,
  onOpenChange,
  coupleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId?: string;
}) {
  const { couples, tasks, addDocument } = useAppState();
  const initialCoupleId = coupleId ?? couples[0]?.id ?? "";
  const form = useForm<UploadDocumentValues>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      coupleId: initialCoupleId,
      category: "Lab Reports",
      taskId: "none",
      notifyStaff: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      coupleId: initialCoupleId,
      category: "Lab Reports",
      taskId: "none",
      notifyStaff: true,
    });
  }, [form, initialCoupleId, open]);

  const relatedTasks = tasks.filter((task) => task.coupleId === form.watch("coupleId"));
  const submit = form.handleSubmit((values) => {
    addDocument({
      name: values.file.name,
      category: values.category,
      coupleId: values.coupleId,
      notifyStaff: values.notifyStaff,
      mimeType: values.file.type,
      size: values.file.size,
      ...(values.taskId && values.taskId !== "none" ? { taskId: values.taskId } : {}),
    });
    toast.success("Document recorded", {
      description: "Demo mode stores safe metadata only; the file contents were not uploaded.",
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Demo mode records file metadata only. PDF, JPG, and PNG contents are not persisted.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, onBlur, name, ref } }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      ref={ref}
                      name={name}
                      onBlur={onBlur}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(event) => onChange(event.target.files?.[0])}
                    />
                  </FormControl>
                  <FormDescription>PDF, JPG, or PNG up to 10 MB. Metadata only.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                name="category"
                label="Category"
                placeholder="Select category"
                options={categories}
              />
              <SelectField
                control={form.control}
                name="taskId"
                label="Related task (optional)"
                placeholder="No related task"
                options={[
                  { value: "none", label: "No related task" },
                  ...relatedTasks.map((task) => ({ value: task.id, label: task.title })),
                ]}
              />
              <FormField
                control={form.control}
                name="notifyStaff"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <FormLabel>Notify staff</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </FieldGrid>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Document</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
