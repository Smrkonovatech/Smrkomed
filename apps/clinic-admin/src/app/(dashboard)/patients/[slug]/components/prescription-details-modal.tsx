"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Pill,
  PlusCircle,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { DiscontinuePrescriptionDialog } from "./discontinue-prescription-dialog";

interface PrescriptionDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  p360?: any;
  onEdit?: ((prescription: any) => void) | undefined;
  onPrescriptionUpdated?: (() => void) | undefined;
}

export function PrescriptionDetailsModal({
  isOpen,
  onOpenChange,
  prescription,
  p360,
  onEdit,
  onPrescriptionUpdated,
}: PrescriptionDetailsModalProps) {
  const [discontinueOpen, setDiscontinueOpen] = useState(false);

  if (!prescription) return null;

  const medicineName =
    prescription.medicineName ||
    prescription.medication ||
    prescription.name ||
    "Prescription";

  const dosage =
    prescription.dosage ||
    prescription.dose ||
    "";

  const title = dosage && !medicineName.includes(dosage)
    ? `${medicineName} (${dosage})`
    : medicineName;

  let duration = prescription.duration || prescription.durationText || "";
  if (!duration && prescription.startDate && prescription.endDate) {
    const start = new Date(prescription.startDate).getTime();
    const end = new Date(prescription.endDate).getTime();
    if (end > start) {
      const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      duration = `${days} Days`;
    }
  }

  const startDateText = prescription.startDate
    ? new Date(prescription.startDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Started Today";

  const frequency =
    prescription.frequency ||
    "Once daily";

  const timing =
    prescription.beforeAfterFood ||
    prescription.timing ||
    prescription.timeOfDay ||
    "As directed";

  const form =
    prescription.form ||
    (medicineName.toLowerCase().includes("injection")
      ? "Subcutaneous Injection"
      : medicineName.toLowerCase().includes("capsule")
      ? "Oral Capsule"
      : "Oral / Tablet");

  const quantityDescription =
    prescription.quantityDescription ||
    (dosage ? `${dosage}` : `${prescription.prescribedQty || 1} Unit(s)`);

  const doctorName =
    prescription.doctorName ||
    prescription.prescribedBy ||
    p360?.header?.assignedDoctor ||
    "Attending Physician";

  const instructions =
    prescription.instructions ||
    prescription.notes ||
    "Take as directed by your physician.";

  const cycleDay =
    prescription.cycleDay ||
    (p360?.header?.currentTreatment?.stageName
      ? `${p360.header.currentTreatment.stageName}`
      : "Active Treatment");

  const handleEditClick = () => {
    onOpenChange(false);
    onEdit?.(prescription);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] p-0 bg-white border-0 shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-200 [&>button.absolute]:hidden">
          <div className="p-6">
            {/* Top Header Row with Badges and Close Button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-[#F4F5F7] text-gray-700 text-xs font-semibold px-3 py-1 rounded-full border border-gray-100">
                  Prescription details
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {cycleDay}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title */}
            <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
              {title}
            </DialogTitle>

            <div className="border-t border-gray-100 my-4" />

            {/* Details Rows */}
            <div className="space-y-4 text-xs">
              {/* Row 1: Duration, Start Date & Frequency */}
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-900 text-xs">
                    {duration} • Started {startDateText}
                  </p>
                  <p className="text-gray-500 font-medium mt-0.5">
                    {frequency} — {timing}
                  </p>
                </div>
              </div>

              {/* Row 2: Form & Quantity Dosage */}
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 text-gray-400">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-xs">
                    {form} • {quantityDescription}
                  </p>
                </div>
              </div>

              {/* Row 3: Prescribed By Doctor */}
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 text-gray-400">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-xs">
                    Prescribed by: {doctorName}
                  </p>
                </div>
              </div>
            </div>

            {/* Special Instructions Box */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 mt-5 text-xs text-gray-600 leading-relaxed">
              {instructions}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-6 mt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDiscontinueOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Discontinue</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-5 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer active:scale-98"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="px-5 py-2 rounded-full bg-[#7C5CE0] hover:bg-[#6847db] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Prescription</span>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DiscontinuePrescriptionDialog
        isOpen={discontinueOpen}
        onOpenChange={setDiscontinueOpen}
        prescription={prescription}
        onDiscontinued={() => {
          setDiscontinueOpen(false);
          onOpenChange(false);
          onPrescriptionUpdated?.();
        }}
      />
    </>
  );
}
