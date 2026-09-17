"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { displayNameOf, type DoctorProfile } from "@/lib/doctors";

export function DeleteDoctorDialog({
  open,
  onOpenChange,
  doctor,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: DoctorProfile;
  onConfirm: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const name = displayNameOf(doctor);

  async function handleDelete() {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete doctor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5 text-destructive" />
            Delete Doctor
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <span>
              Are you sure you want to permanently delete <strong>{name}</strong> from this clinic?
            </span>
            <span className="block text-xs text-muted-foreground">
              This action will remove the doctor&apos;s clinical profile and clinic membership. Active patients and care plans assigned to this doctor will be unassigned. Historical records and notes are preserved.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={loading} onClick={handleDelete}>
            {loading ? "Deleting..." : "Delete Doctor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
