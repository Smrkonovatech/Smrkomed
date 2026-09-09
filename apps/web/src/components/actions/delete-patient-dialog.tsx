"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAppState } from "@/lib/app-state";
import { clinicErrorMessage } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";

export interface DeletePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  couple: { id: string; name: string; slug?: string } | null;
  onDeleted?: (deletedId: string) => void;
}

export function DeletePatientDialog({
  open,
  onOpenChange,
  couple,
  onDeleted,
}: DeletePatientDialogProps) {
  const { deleteCouple } = useAppState();
  const [mode, setMode] = useState<"permanent" | "archive">("permanent");
  const [submitting, setSubmitting] = useState(false);

  if (!couple) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteCouple(couple.id, { permanent: mode === "permanent" });
      toast.success(
        mode === "permanent"
          ? `Patient ${couple.name} permanently deleted.`
          : `Patient ${couple.name} archived.`,
      );
      onOpenChange(false);
      onDeleted?.(couple.id);
    } catch (error: unknown) {
      toast.error(clinicErrorMessage(error, "Unable to delete patient. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">Delete Patient Record</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Manage deletion or archival for this patient record.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <p className="text-foreground">
            You are about to remove <strong className="font-semibold text-primary">{couple.name}</strong> from active clinic records.
          </p>

          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as "permanent" | "archive")}
            className="space-y-2.5 pt-1"
          >
            <div
              className={cn(
                "flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors",
                mode === "permanent"
                  ? "border-destructive/60 bg-destructive/5"
                  : "border-border hover:bg-accent/40",
              )}
              onClick={() => setMode("permanent")}
            >
              <RadioGroupItem value="permanent" id="mode-permanent" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="mode-permanent" className="flex cursor-pointer items-center gap-1.5 font-medium text-destructive">
                  <Trash2 className="size-3.5" /> Permanently Delete
                </Label>
                <p className="text-xs text-muted-foreground">
                  Completely remove the patient, care plans, appointments, and clinical records from the database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors",
                mode === "archive"
                  ? "border-primary/60 bg-primary/5"
                  : "border-border hover:bg-accent/40",
              )}
              onClick={() => setMode("archive")}
            >
              <RadioGroupItem value="archive" id="mode-archive" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="mode-archive" className="flex cursor-pointer items-center gap-1.5 font-medium">
                  <Archive className="size-3.5" /> Archive Patient (Preserve Medical History)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Hide the patient from active clinic views and pause automated workflows, while retaining past medical history for compliance.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={submitting} className="rounded-lg">
            Cancel
          </AlertDialogCancel>
          <Button
            variant={mode === "permanent" ? "destructive" : "default"}
            className="rounded-lg"
            disabled={submitting}
            onClick={handleDelete}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {mode === "permanent" ? "Deleting..." : "Archiving..."}
              </>
            ) : mode === "permanent" ? (
              <>
                <Trash2 className="mr-2 size-4" /> Delete Patient
              </>
            ) : (
              <>
                <Archive className="mr-2 size-4" /> Archive Patient
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
