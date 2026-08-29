"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPost } from "@/lib/api/client";

const TRIGGERS = [
  "PATIENT_CREATED",
  "APPOINTMENT_BOOKED",
  "APPOINTMENT_TOMORROW",
  "APPOINTMENT_2H",
  "APPOINTMENT_MISSED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_RESCHEDULED",
  "CARE_TASK_CREATED",
  "CARE_TASK_DUE",
  "CARE_TASK_OVERDUE",
  "MEDICINE_ASSIGNED",
  "MEDICINE_REMINDER",
  "MEDICINE_REFILL",
  "PAYMENT_PENDING",
  "PAYMENT_OVERDUE",
  "PAYMENT_RECEIVED",
  "PAYMENT_FAILED",
  "PATIENT_INACTIVE",
  "CONSULTATION_COMPLETED",
  "TREATMENT_STARTED",
  "INCOMING_WHATSAPP",
  "MANUAL",
  "SCHEDULED",
] as const;

export default function NewWhatsAppFlowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<string>("PATIENT_CREATED");
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
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title="Create Flow"
        subtitle="Starts as a draft. Configure nodes, test in simulation, then activate."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/whatsapp/flows">Back</Link>
          </Button>
        }
      />
      <div className="surface-card space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="name">Flow name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Appointment Reminder" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trigger">Trigger</Label>
          <select
            id="trigger"
            className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
          >
            {TRIGGERS.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => void create()} disabled={saving}>
          {saving ? "Creating…" : "Save draft & open builder"}
        </Button>
      </div>
    </div>
  );
}
