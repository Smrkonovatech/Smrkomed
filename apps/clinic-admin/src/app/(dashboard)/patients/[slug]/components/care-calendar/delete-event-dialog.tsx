"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";
import { CalendarEvent } from "./care-calendar";

interface DeleteEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onDeleted?: (() => void) | undefined;
}

export function DeleteEventDialog({
  isOpen,
  onClose,
  event,
  onDeleted,
}: DeleteEventDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!event) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (event.type === "task") {
        await clinicApi.deleteTask(event.id);
      } else {
        await clinicApi.deleteAppointment(event.id);
      }

      toast.success(`Event "${event.title}" deleted successfully`);
      onDeleted?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to delete event:", err);
      toast.error(err?.message || "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-6 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-[28px]">
        {/* Top bar with Icon & Close matching Image 5 */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center shrink-0 shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content matching Image 5 */}
        <div className="mt-4">
          <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">
            Delete event
          </DialogTitle>
          <p className="text-xs text-gray-500 font-normal mt-1 leading-relaxed">
            Are you sure you want to delete this event? This action cannot be undone.
          </p>
        </div>

        {/* Footer matching Image 5 */}
        <div className="pt-6 mt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-full bg-[#D92D20] hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
