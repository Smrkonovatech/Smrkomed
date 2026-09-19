"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pill, Search, Check, X, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";

interface AddPrescriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  coupleId?: string | undefined;
  initialPrescription?: any | null;
  onPrescriptionAdded?: (() => void) | undefined;
}

const COMMON_FERTILITY_MEDICATIONS = [
  "Gonal-F (Follitropin alfa) 225 IU",
  "Cetrotide (Cetrorelix) 0.25mg",
  "Menopur (Menotrophin) 150 IU",
  "Susten (Progesterone) 400mg",
  "Ovitrelle (Choriogonadotropin alfa) 250mcg",
  "Progynova (Estradiol Valerate) 2mg",
  "Folic Acid / Folvite 5mg",
  "Cabergoline 0.5mg",
  "Doxycycline 100mg",
  "Letrozole (Femara) 2.5mg",
  "Clomiphene Citrate 50mg",
  "Duphaston (Dydrogesterone) 10mg",
  "Clexane (Enoxaparin) 40mg",
];

export function AddPrescriptionModal({
  isOpen,
  onOpenChange,
  patientId,
  coupleId,
  initialPrescription,
  onPrescriptionAdded,
}: AddPrescriptionModalProps) {
  const [medicationName, setMedicationName] = useState("");
  const [form, setForm] = useState("Injection");
  const [dosage, setDosage] = useState("225");
  const [unit, setUnit] = useState("IU");
  const [frequency, setFrequency] = useState("Once Daily (OD) - Night (08:00 PM)");
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState("Days");
  const [quantity, setQuantity] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialPrescription && isOpen) {
      const name = initialPrescription.medicineName || initialPrescription.medication || "";
      setMedicationName(name);
      if (initialPrescription.dosage) {
        const parts = String(initialPrescription.dosage).trim().split(" ");
        if (parts[0]) setDosage(parts[0]);
        if (parts[1]) setUnit(parts[1]);
      }
      if (initialPrescription.form) setForm(initialPrescription.form);
      if (initialPrescription.frequency) setFrequency(initialPrescription.frequency);
      if (initialPrescription.duration) {
        const parts = String(initialPrescription.duration).trim().split(" ");
        if (parts[0]) setDurationValue(parts[0]);
        if (parts[1]) setDurationUnit(parts[1]);
      }
      if (initialPrescription.quantityPrescribed) {
        setQuantity(String(initialPrescription.quantityPrescribed));
      }
    } else if (!initialPrescription && isOpen) {
      setMedicationName("");
      setForm("Injection");
      setDosage("225");
      setUnit("IU");
      setFrequency("Once Daily (OD) - Night (08:00 PM)");
      setDurationValue("30");
      setDurationUnit("Days");
      setQuantity("30");
    }
  }, [initialPrescription, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName.trim()) {
      toast.error("Please enter or select a medication name");
      return;
    }

    try {
      setSubmitting(true);

      const fullDosage = `${dosage} ${unit}`.trim();
      const durationText = `${durationValue} ${durationUnit}`;
      const qtyNumber = parseInt(quantity, 10) || parseInt(durationValue, 10) || 30;

      // 1. Create prescription via clinicApi
      await clinicApi.createPrescription({
        patientId: patientId && patientId.trim().length > 0 ? patientId.trim() : undefined,
        coupleId: coupleId || undefined,
        notes: `Prescribed: ${medicationName} (${fullDosage}, ${form}) - ${frequency} for ${durationText}`,
        items: [
          {
            productId: "prod_" + Math.random().toString(36).slice(2, 9),
            medicineName: medicationName.trim(),
            dosage: fullDosage,
            frequency,
            timeOfDay: frequency.includes("Night") ? "Night" : "Morning",
            duration: durationText,
            instructions: `${form}. Take as per protocol schedule (${frequency})`,
            quantityPrescribed: qtyNumber,
          },
        ],
      });

      // 2. Create Care Task in Care Loop for automatic reminders
      if (coupleId && patientId) {
        try {
          await clinicApi.createTask({
            coupleId,
            patientId,
            title: `Medication: ${medicationName.trim()} (${fullDosage})`,
            category: "MEDICATION",
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            status: "PENDING",
            priority: "HIGH",
            description: `${form} • ${frequency}. Duration: ${durationText}. Quantity: ${qtyNumber}`,
            sendWhatsApp: true,
          });
        } catch {
          // Non-blocking
        }
      }

      toast.success(`Prescription for ${medicationName} saved successfully`);
      onOpenChange(false);
      onPrescriptionAdded?.();

      // Reset form
      setMedicationName("");
    } catch (err: any) {
      console.error("Failed to create prescription:", err);
      toast.error(err?.message || `Failed to create prescription for ${medicationName}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-[28px]">
        {/* Header matching Image 1 */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F5FF] text-[#866BE3] border border-[#866BE3]/20 flex items-center justify-center shrink-0 shadow-xs">
              <Pill className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">
                {initialPrescription ? "Edit Prescription" : "Add Prescription"}
              </DialogTitle>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Update prescription details, dosage, frequency, and instructions.
              </p>
            </div>
          </div>
        </div>

        {/* Form body matching Image 1 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Medication Name & Strength */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-800 block">
              Medication Name & Strength
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                list="medication-search-list-admin"
                placeholder="Choose from list of medicines"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                required
                className="w-full h-11 pl-10 pr-4 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] placeholder:text-gray-400 transition-all shadow-2xs"
              />
              <datalist id="medication-search-list-admin">
                {COMMON_FERTILITY_MEDICATIONS.map((med) => (
                  <option key={med} value={med} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Form | Dosage & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Form
              </label>
              <div className="relative">
                <select
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                  className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="Injection">Injection</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Pessary / Suppository">Pessary / Suppository</option>
                  <option value="Gel / Patch">Gel / Patch</option>
                  <option value="Syrup / Liquid">Syrup / Liquid</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Dosage & Unit
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full h-11 px-3 pr-7 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                  >
                    <option value="225">225</option>
                    <option value="150">150</option>
                    <option value="75">75</option>
                    <option value="0.25">0.25</option>
                    <option value="250">250</option>
                    <option value="400">400</option>
                    <option value="2">2</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="1">1</option>
                    <option value="40">40</option>
                    <option value="500">500</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-11 px-3 pr-7 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                  >
                    <option value="IU">IU</option>
                    <option value="mg">mg</option>
                    <option value="mcg">mcg</option>
                    <option value="ml">ml</option>
                    <option value="tab">tab</option>
                    <option value="vial">vial</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Frequency & Meal Timing */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-800 block">
              Frequency & Meal Timing
            </label>
            <div className="relative">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
              >
                <option value="Once Daily (OD) - Night (08:00 PM)">Once Daily (OD) - Night (08:00 PM)</option>
                <option value="Once Daily (OD) - Morning (09:00 AM)">Once Daily (OD) - Morning (09:00 AM)</option>
                <option value="Twice Daily (BD) - Morning & Night">Twice Daily (BD) - Morning & Night</option>
                <option value="Thrice Daily (TDS) - After Meals">Thrice Daily (TDS) - After Meals</option>
                <option value="Exact Trigger Time (Follicular Protocol)">Exact Trigger Time (Follicular Protocol)</option>
                <option value="Weekly Once">Weekly Once</option>
                <option value="As Needed (SOS)">As Needed (SOS)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Duration | Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Duration
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className="w-20 h-11 px-3 text-center text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] shadow-2xs"
                />
                <div className="relative flex-1">
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                  >
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                    <option value="Cycles">Cycles</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Quantity
              </label>
              <div className="relative">
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="30">30</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="7">7</option>
                  <option value="10">10</option>
                  <option value="14">14</option>
                  <option value="28">28</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Footer matching Image 1 */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full bg-[#7C5CE5] hover:bg-[#6D4CD4] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
