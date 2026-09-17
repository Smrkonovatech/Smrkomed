"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Activity, Calendar, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";
import { cn } from "@/lib/utils";

export const FERTILITY_STAGES = [
  "01 Lead Appointment",
  "02 Initial Consultation",
  "03 Fertility Workup (Tests)",
  "04 Treatment Decision",
  "05 Treatment Planning & Consent",
  "06 Cycle preparation",
  "07 Ovarian Stimulation",
  "08 Follicular Monitoring",
  "09 Trigger Shot",
  "10 OPU / Egg Retrieval",
  "11 Embryology / ICSI",
  "12 Embryo Transfer / FET",
  "13 Post-Transfer Care",
  "14 Pregnancy Test (Beta HCG)",
  "15 Outcome & Follow-up",
];

interface EditTreatmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  patientName?: string;
  currentTreatment?: {
    id?: string;
    label?: string;
    kind?: string;
    status?: string;
    stageIndex?: number;
    stageName?: string;
    cycleNumber?: number;
    notes?: string;
    startedAt?: string;
  } | null;
  onSaved: () => void;
}

export function EditTreatmentModal({
  isOpen,
  onOpenChange,
  coupleId,
  patientName,
  currentTreatment,
  onSaved,
}: EditTreatmentModalProps) {
  const [kind, setKind] = useState<"IVF" | "IUI" | "FET" | "EVALUATION">("IVF");
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "NEEDS_ATTENTION" | "COMPLETED" | "CANCELLED">("ACTIVE");
  const defaultStage = FERTILITY_STAGES[1] || "02 Initial Consultation";
  const [selectedStage, setSelectedStage] = useState<string>(defaultStage);
  const [cycleNumber, setCycleNumber] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const rawKind = (currentTreatment?.kind || "IVF").toUpperCase();
      const validKind = (["IVF", "IUI", "FET", "EVALUATION"].includes(rawKind) ? rawKind : "IVF") as any;
      setKind(validKind);

      setLabel(
        currentTreatment?.label ||
          (validKind === "EVALUATION" ? "Fertility Evaluation" : `${validKind} Cycle ${currentTreatment?.cycleNumber || 1}`)
      );

      const rawStatus = (currentTreatment?.status || "ACTIVE").toUpperCase();
      const validStatus = (["ACTIVE", "NEEDS_ATTENTION", "COMPLETED", "CANCELLED"].includes(rawStatus)
        ? rawStatus
        : "ACTIVE") as any;
      setStatus(validStatus);

      // Resolve stage
      const stageName = currentTreatment?.stageName || "";
      const matchedStage = FERTILITY_STAGES.find(
        (s) => s.toLowerCase().includes(stageName.toLowerCase()) || stageName.toLowerCase().includes(s.toLowerCase())
      );
      const fallbackStage = FERTILITY_STAGES[currentTreatment?.stageIndex ?? 1] || defaultStage;
      setSelectedStage(matchedStage || fallbackStage);

      setCycleNumber(currentTreatment?.cycleNumber ?? 1);

      if (currentTreatment?.startedAt) {
        try {
          const split = new Date(currentTreatment.startedAt).toISOString().split("T")[0];
          setStartDate(split || new Date().toISOString().split("T")[0] || "");
        } catch {
          setStartDate(new Date().toISOString().split("T")[0] || "");
        }
      } else {
        setStartDate(new Date().toISOString().split("T")[0] || "");
      }

      setNotes(currentTreatment?.notes || "");
    }
  }, [isOpen, currentTreatment, defaultStage]);

  const handleKindSelect = (newKind: "IVF" | "IUI" | "FET" | "EVALUATION") => {
    setKind(newKind);
    if (!label || label.includes("Cycle") || label.includes("Evaluation")) {
      setLabel(newKind === "EVALUATION" ? "Fertility Evaluation" : `${newKind} Cycle ${cycleNumber}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Please enter a treatment label or protocol title");
      return;
    }

    setSaving(true);
    try {
      const currentStageStr = selectedStage || defaultStage;
      const stageIdx = FERTILITY_STAGES.indexOf(currentStageStr);
      const cleanStageName = currentStageStr.replace(/^\d+\.\s*|^\d+\s*/, "");

      const payload = {
        kind,
        label: label.trim(),
        status,
        stageIndex: stageIdx >= 0 ? stageIdx : 0,
        stageName: cleanStageName,
        startedAt: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        cycleNumber: Number(cycleNumber) || 1,
        notes: notes.trim() || null,
      };

      if (currentTreatment?.id) {
        await clinicApi.patchTreatment(currentTreatment.id, payload);
      } else {
        await clinicApi.patchCoupleTreatment(coupleId, payload);
      }

      toast.success("Treatment protocol updated successfully");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to update treatment:", err);
      toast.error(err?.message || "Failed to update treatment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-2xl">
        <form onSubmit={handleSave} className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 bg-[#FAF9FD]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#866BE3]/15 text-[#866BE3] flex items-center justify-center shadow-sm">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Edit Treatment Protocol
                </DialogTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update clinical modality, protocol name, cycle stage, and directives {patientName ? `for ${patientName}` : ""}.
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Form Content */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Treatment Kind Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Treatment Modality</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "IVF", label: "IVF", desc: "In Vitro Fertilization" },
                  { key: "IUI", label: "IUI", desc: "Intrauterine Insem." },
                  { key: "FET", label: "FET", desc: "Frozen Embryo Transfer" },
                  { key: "EVALUATION", label: "Evaluation", desc: "Diagnostic Workup" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleKindSelect(item.key as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                      kind === item.key
                        ? "border-[#866BE3] bg-[#866BE3]/10 text-[#866BE3] font-bold shadow-sm ring-1 ring-[#866BE3]"
                        : "border-gray-200 hover:border-[#866BE3]/40 hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className="text-[10px] text-gray-500 leading-tight mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Treatment Label & Cycle Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="treatment-label" className="text-xs font-semibold text-gray-700">
                  Protocol Title / Treatment Label
                </Label>
                <Input
                  id="treatment-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. IVF Antagonist Protocol, Self-Oocyte ICSI"
                  className="text-sm rounded-lg border-gray-200 focus-visible:ring-[#866BE3]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cycle-number" className="text-xs font-semibold text-gray-700">
                  Cycle #
                </Label>
                <Input
                  id="cycle-number"
                  type="number"
                  min={1}
                  max={50}
                  value={cycleNumber}
                  onChange={(e) => setCycleNumber(parseInt(e.target.value, 10) || 1)}
                  className="text-sm rounded-lg border-gray-200 focus-visible:ring-[#866BE3]"
                  required
                />
              </div>
            </div>

            {/* Current Journey Stage & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Current Cycle Stage</Label>
                <Select value={selectedStage} onValueChange={(val: string) => setSelectedStage(val)}>
                  <SelectTrigger className="text-sm rounded-lg border-gray-200 focus:ring-[#866BE3]">
                    <SelectValue placeholder="Select current milestone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {FERTILITY_STAGES.map((st) => (
                      <SelectItem key={st} value={st} className="text-xs">
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Cycle Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="text-sm rounded-lg border-gray-200 focus:ring-[#866BE3]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE" className="text-xs text-emerald-700 font-medium">
                      ● Active (In Progress)
                    </SelectItem>
                    <SelectItem value="NEEDS_ATTENTION" className="text-xs text-amber-700 font-medium">
                      ● Needs Attention / Review
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs text-blue-700 font-medium">
                      ● Completed
                    </SelectItem>
                    <SelectItem value="CANCELLED" className="text-xs text-rose-700 font-medium">
                      ● Discontinued / Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs font-semibold text-gray-700">
                Cycle Start Date
              </Label>
              <div className="relative">
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm rounded-lg border-gray-200 focus-visible:ring-[#866BE3]"
                />
              </div>
            </div>

            {/* Clinical Directives & Protocol Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="treatment-notes" className="text-xs font-semibold text-gray-700">
                  Doctor Clinical Directives & Protocol Notes
                </Label>
                <span className="text-[11px] text-gray-400">Optional</span>
              </div>
              <Textarea
                id="treatment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Antagonist protocol, rFSH 225 IU starting Day 2. Follicular scan scheduled Day 6. Monitor E2 & P4."
                rows={3}
                className="text-sm rounded-lg border-gray-200 focus-visible:ring-[#866BE3] resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 px-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-xs px-4 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs px-5 rounded-lg shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Treatment Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
