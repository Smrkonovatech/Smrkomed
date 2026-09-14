"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, MessageSquare, AlertCircle, FileCode, Check } from "lucide-react";

import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const TRIGGERS = [
  "INCOMING_WHATSAPP",
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
  "MANUAL",
  "SCHEDULED",
] as const;

type TemplateOption = "appointment_booking" | "patient_followup" | "human_escalation" | "blank";

export default function NewWhatsAppFlowPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>("appointment_booking");
  const [name, setName] = useState("Appointment Booking");
  const [description, setDescription] = useState(
    "Interactive WhatsApp appointment booking for clinic patients with doctor selection, dates, and slots.",
  );
  const [triggerType, setTriggerType] = useState<string>("INCOMING_WHATSAPP");
  const [saving, setSaving] = useState(false);

  function handleSelectTemplate(tpl: TemplateOption) {
    setSelectedTemplate(tpl);
    if (tpl === "appointment_booking") {
      setName("Appointment Booking");
      setDescription("Interactive WhatsApp appointment booking for clinic patients with doctor selection, dates, and slots.");
      setTriggerType("INCOMING_WHATSAPP");
    } else if (tpl === "patient_followup") {
      setName("Patient Follow-up");
      setDescription("Check-in after treatment/consultation with reply condition and care task.");
      setTriggerType("TREATMENT_STARTED");
    } else if (tpl === "human_escalation") {
      setName("Human Escalation Flow");
      setDescription("Escalate difficult patient questions to staff care inbox.");
      setTriggerType("INCOMING_WHATSAPP");
    } else {
      setName("");
      setDescription("");
      setTriggerType("INCOMING_WHATSAPP");
    }
  }

  async function create() {
    if (!name.trim()) {
      toast.error("Flow name is required.");
      return;
    }
    setSaving(true);
    try {
      let definition: Record<string, unknown> | undefined = undefined;

      if (selectedTemplate === "appointment_booking") {
        definition = {
          nodes: [
            { id: "node_trigger", type: "TRIGGER", label: "Incoming WhatsApp", config: { triggerType: "INCOMING_WHATSAPP" }, position: { x: 250, y: 30 } },
            { id: "n_detect_intent", type: "DETECT_INTENT", label: "Detect Appointment Intent", config: {}, position: { x: 250, y: 130 } },
            { id: "n_welcome", type: "SEND_TEXT", label: "Welcome / Choice", config: { body: "Absolutely! 👋\nI can help you find the right specialist and book an appointment.\n\nWho would you like to consult?" }, position: { x: 250, y: 230 } },
            { id: "n_get_doctors", type: "GET_DOCTORS", label: "Get Doctors", config: {}, position: { x: 250, y: 330 } },
            { id: "n_show_doctors", type: "SEND_LIST", label: "Doctor List", config: { body: "Please choose a doctor for your consultation:", buttonText: "Choose Doctor", dataSource: "doctors", waitForReply: true }, position: { x: 250, y: 430 } },
            { id: "n_get_details", type: "GET_DOCTOR_DETAILS", label: "Get Doctor Profile", config: {}, position: { x: 250, y: 530 } },
            { id: "n_show_details", type: "SEND_BUTTONS", label: "Doctor Profile Details", config: { body: "Dr. {{doctor.name}}\n{{doctor.specialty}}\n\n{{doctor.experience}}\nLanguages: {{doctor.languages}}\n\n\"{{doctor.bio}}\"", buttons: [{ id: "btn_see_slots", title: "📅 See Slots" }, { id: "btn_other_doc", title: "👩‍⚕️ Other Doctor" }], waitForReply: true }, position: { x: 250, y: 630 } },
            { id: "n_get_dates", type: "GET_AVAILABLE_DATES", label: "Get Available Dates", config: { daysAhead: 7 }, position: { x: 250, y: 730 } },
            { id: "n_show_dates", type: "SEND_LIST", label: "Show Available Dates", config: { body: "Great choice! 📅 Which date works best for you?", buttonText: "Select Date", dataSource: "dates", waitForReply: true }, position: { x: 250, y: 830 } },
            { id: "n_get_slots", type: "GET_AVAILABLE_SLOTS", label: "Get Available Slots", config: {}, position: { x: 250, y: 930 } },
            { id: "n_show_slots", type: "SEND_LIST", label: "Show Available Slots", config: { body: "Choose a consultation time slot that suits you:", buttonText: "Select Time", dataSource: "slots", waitForReply: true }, position: { x: 250, y: 1030 } },
            { id: "n_summary", type: "BOOKING_SUMMARY", label: "Booking Summary", config: {}, position: { x: 250, y: 1130 } },
            { id: "n_confirm", type: "SEND_BUTTONS", label: "Confirm Appointment", config: { body: "{{bookingSummaryText}}", buttons: [{ id: "appt_confirm", title: "Confirm ✅" }, { id: "appt_change_time", title: "Change Time ⏰" }, { id: "appt_cancel", title: "Cancel ❌" }], waitForReply: true }, position: { x: 250, y: 1230 } },
            { id: "n_book", type: "BOOK_APPOINTMENT", label: "Book Appointment", config: {}, position: { x: 250, y: 1330 } },
            { id: "n_task", type: "CREATE_TASK", label: "Create Care Task", config: { title: "WhatsApp Booked: {{doctor.name}} ({{appointment.date}} {{appointment.time}})", priority: "NORMAL", description: "Follow up with patient on upcoming appointment." }, position: { x: 250, y: 1430 } },
            { id: "n_confirm_send", type: "SEND_TEXT", label: "Send Confirmation", config: { body: "You're all set! 🎉\n\nYour appointment is confirmed:\n\n👩‍⚕️ Dr. {{doctor.name}}\n📅 {{appointment.date}}\n⏰ {{appointment.time}}\n📍 {{clinic.name}}\n\nWe'll remind you before your appointment!" }, position: { x: 250, y: 1530 } },
            { id: "n_handoff", type: "HUMAN_HANDOFF", label: "Human Handoff", config: { reason: "Patient requested assistance or booking could not be completed automatically.", message: "I couldn't complete that booking automatically. I've connected you with our clinic team, and they'll help you shortly." }, position: { x: 550, y: 530 } },
            { id: "node_end", type: "END", label: "End", config: {}, position: { x: 250, y: 1630 } },
          ],
          edges: [
            { id: "e1", source: "node_trigger", target: "n_detect_intent" },
            { id: "e2", source: "n_detect_intent", target: "n_welcome", branch: "appointment" },
            { id: "e2_other", source: "n_detect_intent", target: "node_end", branch: "not_appointment" },
            { id: "e3", source: "n_welcome", target: "n_get_doctors" },
            { id: "e4", source: "n_get_doctors", target: "n_show_doctors" },
            { id: "e4_nodocs", source: "n_get_doctors", target: "n_handoff", branch: "no_doctors" },
            { id: "e5", source: "n_show_doctors", target: "n_get_details" },
            { id: "e6", source: "n_get_details", target: "n_show_details" },
            { id: "e7", source: "n_show_details", target: "n_get_dates" },
            { id: "e8", source: "n_get_dates", target: "n_show_dates" },
            { id: "e8_noslots", source: "n_get_dates", target: "n_handoff", branch: "no_slots" },
            { id: "e9", source: "n_show_dates", target: "n_get_slots" },
            { id: "e10", source: "n_get_slots", target: "n_show_slots" },
            { id: "e10_noslots", source: "n_get_slots", target: "n_handoff", branch: "no_slots" },
            { id: "e11", source: "n_show_slots", target: "n_summary" },
            { id: "e12", source: "n_summary", target: "n_confirm" },
            { id: "e13", source: "n_confirm", target: "n_book" },
            { id: "e14", source: "n_book", target: "n_task" },
            { id: "e14_expired", source: "n_book", target: "n_get_slots", branch: "slot_expired" },
            { id: "e15", source: "n_task", target: "n_confirm_send" },
            { id: "e16", source: "n_confirm_send", target: "node_end" },
            { id: "e_handoff_end", source: "n_handoff", target: "node_end" },
          ],
        };
      }

      const flow = await apiPost<{ id: string }>("/api/v1/whatsapp-automation/flows", {
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
        ...(definition ? { definition } : {}),
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
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Create Flow"
        subtitle="Starts as a draft. Select a starter template or start from scratch."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/whatsapp/flows">Back</Link>
          </Button>
        }
      />

      <div className="space-y-3">
        <Label className="text-sm font-semibold">Choose Template</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleSelectTemplate("appointment_booking")}
            className={cn(
              "flex flex-col text-left rounded-xl border p-4 transition-all relative",
              selectedTemplate === "appointment_booking"
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/50",
            )}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-4 text-primary" />
                <span className="font-semibold text-sm">Appointment Booking</span>
              </div>
              <span className="rounded-full bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold">
                RECOMMENDED
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Complete 17-node WhatsApp booking journey: doctors, dates, slots, confirmation, and Care Loop task.
            </p>
            {selectedTemplate === "appointment_booking" && (
              <Check className="absolute top-2 right-2 size-4 text-primary opacity-60" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate("patient_followup")}
            className={cn(
              "flex flex-col text-left rounded-xl border p-4 transition-all relative",
              selectedTemplate === "patient_followup"
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/50",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquare className="size-4 text-sky-600" />
              <span className="font-semibold text-sm">Patient Follow-up</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Post-treatment check-in message with wait period, reply condition, and care task generation.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate("human_escalation")}
            className={cn(
              "flex flex-col text-left rounded-xl border p-4 transition-all relative",
              selectedTemplate === "human_escalation"
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/50",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AlertCircle className="size-4 text-amber-600" />
              <span className="font-semibold text-sm">Human Escalation</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Escalation flow routing complex clinical inquiries directly into staff care inbox.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTemplate("blank")}
            className={cn(
              "flex flex-col text-left rounded-xl border p-4 transition-all relative",
              selectedTemplate === "blank"
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary/50",
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <FileCode className="size-4 text-slate-600" />
              <span className="font-semibold text-sm">Blank Flow</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Start with an empty canvas containing just a trigger node and end node.
            </p>
          </button>
        </div>
      </div>

      <div className="surface-card space-y-4 rounded-xl border p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="name">Flow Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Appointment Booking"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this workflow accomplish?"
          />
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
        <div className="pt-2">
          <Button onClick={() => void create()} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Creating Flow…" : "Create Flow & Open Canvas"}
          </Button>
        </div>
      </div>
    </div>
  );
}
