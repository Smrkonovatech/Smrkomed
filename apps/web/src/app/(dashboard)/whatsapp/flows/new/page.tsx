"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPost } from "@/lib/api/client";

const TRIGGERS = [
  { value: "CARE_TASK_DUE", label: "Care task is due" },
  { value: "CARE_TASK_CREATED", label: "Care task is created" },
  { value: "CARE_TASK_OVERDUE", label: "Care task is overdue" },
  { value: "APPOINTMENT_BOOKED", label: "Appointment is booked" },
  { value: "APPOINTMENT_TOMORROW", label: "Appointment is tomorrow" },
  { value: "APPOINTMENT_2H", label: "Appointment in 2 hours" },
  { value: "APPOINTMENT_MISSED", label: "Appointment was missed" },
  { value: "MEDICINE_REMINDER", label: "Medication reminder time" },
  { value: "MEDICINE_ASSIGNED", label: "Medication is assigned" },
  { value: "DOCUMENT_REQUIRED", label: "Document is required" },
  { value: "PAYMENT_PENDING", label: "Payment is pending" },
  { value: "PATIENT_INACTIVE", label: "Patient has been inactive" },
  { value: "INCOMING_WHATSAPP", label: "Patient replies on WhatsApp" },
  { value: "TREATMENT_STARTED", label: "Treatment journey starts" },
  { value: "MANUAL", label: "Staff starts it manually" },
  { value: "SCHEDULED", label: "On a scheduled date / time" },
] as const;

export default function NewWhatsAppFlowPage() {
  const router = useRouter();
  const [name, setName] = useState("IVF Monitoring Follow-up");
  const [description, setDescription] = useState(
    "Doctor-approved monitoring stage: reminder → confirm → report request → escalate if unresolved.",
  );
  const [triggerType, setTriggerType] = useState<string>("CARE_TASK_DUE");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) {
      toast.error("Flow name is required.");
      return;
    }
    setSaving(true);
    try {
      const flow = await apiPost<{ id: string }>("/api/v1/whatsapp-automation/flows", {
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
      });
      toast.success("Draft flow created");
      router.push(`/whatsapp/flows/${flow.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create flow");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Care Workflow Builder</h2>
        <p className="text-sm text-muted-foreground">
          When should this workflow start? Then configure what SmrkoMed should do — never clinical
          decisions.
        </p>
      </div>
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">Flow name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="IVF Monitoring Follow-up"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">What does this workflow do?</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trigger">When should this workflow start?</Label>
          <select
            id="trigger"
            className="flex h-10 w-full rounded-xl border bg-background px-3 text-sm"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
          >
            {TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-xl" disabled={saving} onClick={() => void create()}>
            {saving ? "Creating…" : "Create draft & open canvas"}
          </Button>
          <Button asChild type="button" variant="outline" className="rounded-xl">
            <Link href="/whatsapp/flows">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
