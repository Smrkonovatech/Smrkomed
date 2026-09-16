"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";

interface AddPrescriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  coupleId?: string | undefined;
  onPrescriptionAdded?: (() => void) | undefined;
}

export function AddPrescriptionModal({
  isOpen,
  onOpenChange,
  patientId,
  coupleId,
  onPrescriptionAdded,
}: AddPrescriptionModalProps) {
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once Daily (OD)");
  const [timeOfDay, setTimeOfDay] = useState("Night (08:00 PM)");
  const [durationDays, setDurationDays] = useState("7");
  const [instructions, setInstructions] = useState("Take after food with water");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName.trim()) {
      toast.error("Medicine name is required");
      return;
    }

    try {
      setSubmitting(true);

      // Create prescription via clinicApi
      await clinicApi.createPrescription({
        patientId,
        coupleId: coupleId || null,
        notes: `Prescribed: ${medicineName} (${dosage}) - ${instructions}`,
        items: [
          {
            productId: "prod_" + Math.random().toString(36).slice(2, 9),
            medicineName: medicineName.trim(),
            dosage: dosage.trim() || "Standard",
            frequency,
            timeOfDay,
            duration: `${durationDays} days`,
            instructions: instructions.trim(),
            quantityPrescribed: Math.max(1, parseInt(durationDays, 10) || 7),
          },
        ],
      });

      // Also create Care Task for patient medication tracking in Care Loop
      if (coupleId) {
        try {
          await clinicApi.createTask({
            coupleId,
            patientId,
            title: `Medication: ${medicineName.trim()} (${dosage.trim() || "Standard"})`,
            category: "MEDICATION",
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            status: "PENDING",
            priority: "MEDIUM",
            description: `${frequency}, ${timeOfDay}. ${instructions.trim()}`,
          });
        } catch {
          // Non-blocking
        }
      }

      toast.success(`Prescription for ${medicineName} created successfully`);
      onOpenChange(false);
      onPrescriptionAdded?.();

      // Reset
      setMedicineName("");
      setDosage("");
    } catch (err: any) {
      console.error("Failed to create prescription:", err);
      toast.error(err?.message || `Failed to create prescription for ${medicineName}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Add Prescription & Medication
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Prescribe medication for fertility treatment and automated Care Loop tracking
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="medName" className="text-xs font-semibold text-gray-700">
              Medicine / Drug Name *
            </Label>
            <Input
              id="medName"
              list="fertility-medications"
              placeholder="e.g. Gonal-F 225 IU, Cetrotide 0.25mg, Folic Acid 5mg"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              required
              className="h-9 text-xs"
            />
            <datalist id="fertility-medications">
              <option value="Gonal-F (Follitropin alfa) 225 IU" />
              <option value="Cetrotide (Cetrorelix) 0.25mg" />
              <option value="Menopur (Menotrophin) 150 IU" />
              <option value="Folic Acid / Folvite 5mg" />
              <option value="Progesterone (Susten) 400mg" />
              <option value="Ovitrelle (Choriogonadotropin alfa) 250mcg" />
              <option value="Cabergoline 0.5mg" />
              <option value="Estradiol Valerate (Progynova) 2mg" />
              <option value="Doxycycline 100mg" />
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dosage" className="text-xs font-semibold text-gray-700">
                Dosage
              </Label>
              <Input
                id="dosage"
                placeholder="e.g. 225 IU / 5mg / 1 tab"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-semibold text-gray-700">
                Duration (Days)
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="90"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-xs font-semibold text-gray-700">
                Frequency
              </Label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full h-9 px-3 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#866BE3]"
              >
                <option value="Once Daily (OD)">Once Daily (OD)</option>
                <option value="Twice Daily (BD)">Twice Daily (BD)</option>
                <option value="Thrice Daily (TDS)">Thrice Daily (TDS)</option>
                <option value="Weekly">Weekly Once</option>
                <option value="As Needed (SOS)">As Needed (SOS)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timeOfDay" className="text-xs font-semibold text-gray-700">
                Scheduled Time
              </Label>
              <select
                id="timeOfDay"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full h-9 px-3 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#866BE3]"
              >
                <option value="Night (08:00 PM)">Night (08:00 PM)</option>
                <option value="Morning (09:00 AM)">Morning (09:00 AM)</option>
                <option value="Afternoon (01:00 PM)">Afternoon (01:00 PM)</option>
                <option value="Exact Trigger Time">Exact Trigger Time</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructions" className="text-xs font-semibold text-gray-700">
              Clinical Instructions
            </Label>
            <Input
              id="instructions"
              placeholder="e.g. Subcutaneous injection in lower abdomen / After food"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#866BE3] hover:bg-[#7254d1] text-white gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Prescribing...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Confirm Prescription
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
