"use client";

import { CheckCircle2, ChevronRight, FileCheck, HeartPulse, Stethoscope, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clinicApi, clinicErrorMessage, type ClinicStaff } from "@/lib/clinic-api";

export type TreatmentPlanTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  specialty: string;
  type: string;
  version: number;
  isSystem: boolean;
  isActive: boolean;
  stageCount: number;
  taskCount: number;
  stages: Array<{
    id: string;
    sortOrder: number;
    name: string;
    description: string | null;
    stageType: string | null;
    completionStrategy: string;
    tasks: Array<{
      title: string;
      ownerRole: string;
      priority: string;
      taskType: string;
    }>;
  }>;
};

interface AssignTreatmentPlanDialogProps {
  coupleId: string;
  coupleSlug: string;
  primaryName: string;
  partnerName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned?: (plan: unknown) => void;
}

export function AssignTreatmentPlanDialog({
  coupleId,
  coupleSlug,
  primaryName,
  partnerName,
  open,
  onOpenChange,
  onAssigned,
}: AssignTreatmentPlanDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templates, setTemplates] = useState<TreatmentPlanTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [coordinatorId, setCoordinatorId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [protocolNotes, setProtocolNotes] = useState<string>("Standard Antagonist Protocol · Gonal-F 225 IU daily starting Day 2");
  const [baselineDate, setBaselineDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      return;
    }

    void (async () => {
      try {
        const [tplList, staffList] = await Promise.all([
          clinicApi.templates(),
          clinicApi.staff(),
        ]);
        setTemplates(tplList);
        if (tplList.length > 0 && !selectedTemplateId) {
          const defaultTpl = tplList.find((t) => t.name.includes("Standard")) ?? tplList[0]!;
          setSelectedTemplateId(defaultTpl.id);
        }
        setStaff(staffList);
        const docs = staffList.filter((s) => s.role === "DOCTOR");
        if (docs.length > 0 && !doctorId) setDoctorId(docs[0]!.id);
        const coords = staffList.filter((s) => s.role === "CARE_COORDINATOR");
        if (coords.length > 0 && !coordinatorId) setCoordinatorId(coords[0]!.id);
      } catch (err: unknown) {
        toast.error(clinicErrorMessage(err, "Failed to load treatment plan templates."));
      }
    })();
  }, [open, selectedTemplateId, doctorId, coordinatorId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

  const handleAssign = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a treatment plan template.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await clinicApi.assignCarePlan({
        coupleId,
        templateId: selectedTemplateId,
        doctorId: doctorId || undefined,
        coordinatorId: coordinatorId || undefined,
        startDate,
        customValues: {
          protocolNotes,
          baselineDate: baselineDate || undefined,
        },
      });

      toast.success("Treatment Plan Approved & Care Loop Activated!", {
        description: `${selectedTemplate?.name} assigned to ${primaryName}.`,
      });

      onAssigned?.(result);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(clinicErrorMessage(err, "Could not activate treatment plan."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-medium text-xs tracking-wide uppercase">
            <HeartPulse className="size-4" />
            <span>Doctor Clinical Flow · Care Loop Activation</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Assign Treatment Plan
          </DialogTitle>
          <DialogDescription>
            Select an approved clinical protocol for{" "}
            <span className="font-semibold text-foreground">
              {primaryName}
              {partnerName ? ` & ${partnerName}` : ""}
            </span>
            . The Care Loop will snapshot this template and coordinate execution.
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Steps indicator */}
        <div className="grid grid-cols-3 gap-2 my-2 border-y py-3 text-xs font-medium">
          <div
            className={`flex items-center gap-1.5 ${
              step === 1 ? "text-primary font-bold" : "text-muted-foreground"
            }`}
          >
            <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary text-[11px]">
              1
            </span>
            <span>Select Protocol</span>
          </div>
          <div
            className={`flex items-center gap-1.5 ${
              step === 2 ? "text-primary font-bold" : "text-muted-foreground"
            }`}
          >
            <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary text-[11px]">
              2
            </span>
            <span>Care Team & Dates</span>
          </div>
          <div
            className={`flex items-center gap-1.5 ${
              step === 3 ? "text-primary font-bold" : "text-muted-foreground"
            }`}
          >
            <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary text-[11px]">
              3
            </span>
            <span>Review & Approve</span>
          </div>
        </div>

        {/* Step 1: Select Protocol */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Approved Clinical Templates
              </Label>
              <div className="grid gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {templates.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{tpl.name}</span>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {tpl.stageCount || 16} Stages
                            </span>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              v{tpl.version}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {tpl.description ?? "Standard IVF care journey coordinating clinical milestones."}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedTemplate && (
              <div className="rounded-xl border bg-muted/20 p-3 text-xs space-y-1">
                <span className="font-semibold text-foreground">Protocol Summary:</span>
                <p className="text-muted-foreground">
                  Starts at Stage 1 (Consultation) and progresses sequentially through Investigation, Ovarian Stimulation, Monitoring, Retrieval, Transfer, and Outcome tracking.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Care Team & Dates */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Stethoscope className="size-3.5 text-primary" />
                  Assigned Doctor (Clinical Owner)
                </Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff
                      .filter((s) => s.role === "DOCTOR")
                      .map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name} {doc.title ? `(${doc.title})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <UserRound className="size-3.5 text-warning" />
                  Care Coordinator
                </Label>
                <Select value={coordinatorId} onValueChange={setCoordinatorId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Coordinator" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff
                      .filter((s) => s.role === "CARE_COORDINATOR")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Treatment Start Date</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estimated Cycle Day 1 / Baseline</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={baselineDate}
                  onChange={(e) => setBaselineDate(e.target.value)}
                  placeholder="Optional baseline date"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Doctor Protocol Notes & Prescriptions (Patient Specific)
              </Label>
              <Textarea
                rows={3}
                className="text-xs"
                value={protocolNotes}
                onChange={(e) => setProtocolNotes(e.target.value)}
                placeholder="Specific clinical instructions, gonadotropin starting dosage, monitoring cadence..."
              />
              <p className="text-[11px] text-muted-foreground">
                These notes will be snapshotted with the journey and populate stage clinical cards.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Review & Doctor Approval */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="size-5 text-primary" />
                <h4 className="text-sm font-bold text-foreground">
                  Ready for Clinical Approval
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-y py-2 border-primary/10">
                <div>
                  <span className="text-muted-foreground block">Patient / Couple:</span>
                  <span className="font-semibold text-foreground">
                    {primaryName} {partnerName ? `+ ${partnerName}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Protocol:</span>
                  <span className="font-semibold text-primary">
                    {selectedTemplate?.name} (v{selectedTemplate?.version})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Clinical Lead:</span>
                  <span className="font-semibold text-foreground">
                    {staff.find((s) => s.id === doctorId)?.name ?? "Doctor"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Care Coordinator:</span>
                  <span className="font-semibold text-foreground">
                    {staff.find((s) => s.id === coordinatorId)?.name ?? "Coordinator"}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-muted-foreground font-semibold">Doctor Protocol Directives:</span>
                <p className="rounded-lg bg-background/80 p-2 text-foreground font-mono text-[11px] border">
                  {protocolNotes || "Standard protocol parameters"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Care Loop Orchestration Rules:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>DOCTOR APPROVES THE PLAN. CARE LOOP COORDINATES THE JOURNEY.</li>
                <li>Tasks are dynamically scheduled relative to clinical milestones.</li>
                <li>Any missed medication or patient query routes to staff exceptions without autonomous clinical guessing.</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
            >
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              size="sm"
              className="gap-1"
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
            >
              Continue <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              className="gap-1.5 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
              onClick={handleAssign}
            >
              <CheckCircle2 className="size-4" />
              {submitting ? "Activating..." : "Approve & Activate Care Loop"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
