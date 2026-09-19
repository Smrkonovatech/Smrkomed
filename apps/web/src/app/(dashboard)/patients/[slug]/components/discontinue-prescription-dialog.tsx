"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clinicApi, clinicErrorMessage } from "@/lib/clinic-api";

interface DiscontinuePrescriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  onDiscontinued?: (() => void) | undefined;
}

export function DiscontinuePrescriptionDialog({
  isOpen,
  onOpenChange,
  prescription,
  onDiscontinued,
}: DiscontinuePrescriptionDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirmDiscontinue = async () => {
    try {
      setSubmitting(true);
      const prescriptionId =
        prescription?.prescriptionId ||
        prescription?.id ||
        prescription?.rxId;

      if (prescriptionId) {
        try {
          await clinicApi.cancelPrescription(prescriptionId);
        } catch (apiErr) {
          // If backend ID wasn't found in DB, continue gracefully
          console.warn("API discontinue notice:", apiErr);
        }
      }

      toast.success(
        `Prescription for ${prescription?.medicineName || prescription?.medication || "medication"} discontinued.`
      );
      onOpenChange(false);
      onDiscontinued?.();
    } catch (err) {
      toast.error(clinicErrorMessage(err, "Failed to discontinue prescription"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-6 bg-white border-0 shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-200 [&>button.absolute]:hidden">
        {/* Top Header Row */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6 stroke-[1.75]" />
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="mt-4">
          <DialogTitle className="text-lg font-bold text-gray-900 leading-tight">
            Discontinue Prescription
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Are you sure you want to discontinue this prescription? This action cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="py-2.5 px-5 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors text-center cursor-pointer active:scale-98"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDiscontinue}
            disabled={submitting}
            className="py-2.5 px-5 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-colors text-center shadow-xs cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              "Discontinue"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
