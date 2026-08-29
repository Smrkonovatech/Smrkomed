import type { FlowDefinition } from "./types";
import { emptyDefinition } from "./types";

export type LibraryFlow = {
  libraryKey: string;
  name: string;
  description: string;
  triggerType: string;
  definition: FlowDefinition;
};

function linear(triggerType: string, triggerLabel: string, middle: FlowDefinition["nodes"]): FlowDefinition {
  const base = emptyDefinition(triggerType, triggerLabel);
  const trigger = base.nodes[0]!;
  const end = base.nodes[1]!;
  const nodes = [trigger, ...middle, end];
  const edges: FlowDefinition["edges"] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `e_${nodes[i]!.id}_${nodes[i + 1]!.id}`,
      source: nodes[i]!.id,
      target: nodes[i + 1]!.id,
    });
  }
  return {
    nodes: nodes.map((n, i) => ({ ...n, position: { x: 80, y: 40 + i * 110 } })),
    edges,
  };
}

function sendTemplate(
  id: string,
  templateName: string,
  variableKeys: string[],
  label?: string,
): FlowDefinition["nodes"][number] {
  return {
    id,
    type: "SEND_TEMPLATE",
    label: label ?? `Send ${templateName}`,
    config: { templateName, variableKeys },
  };
}

/** Inactive library drafts — clinics duplicate then customize. Never auto-activated. */
export const LIBRARY_FLOWS: LibraryFlow[] = [
  {
    libraryKey: "patient_welcome",
    name: "New Patient Welcome",
    description: "Welcome after patient creation; follow-up task if no reply.",
    triggerType: "PATIENT_CREATED",
    definition: (() => {
      const nodes: FlowDefinition["nodes"] = [
        {
          id: "node_trigger",
          type: "TRIGGER",
          label: "Patient Created",
          config: { triggerType: "PATIENT_CREATED" },
          position: { x: 80, y: 40 },
        },
        {
          id: "n_wait",
          type: "WAIT",
          label: "Wait 10 minutes",
          config: { amount: 10, unit: "minutes" },
          position: { x: 80, y: 150 },
        },
        sendTemplate("n_send", "patient_welcome", ["patient_name", "clinic_name"]),
        {
          id: "n_wait2",
          type: "WAIT",
          label: "Wait 1 day",
          config: { amount: 1, unit: "days" },
          position: { x: 80, y: 370 },
        },
        {
          id: "n_cond",
          type: "CONDITION",
          label: "Patient replied?",
          config: { kind: "patient_replied" },
          position: { x: 80, y: 480 },
        },
        {
          id: "n_task",
          type: "CREATE_TASK",
          label: "Create follow-up task",
          config: { title: "Welcome follow-up — no WhatsApp reply", priority: "NORMAL" },
          position: { x: 220, y: 590 },
        },
        { id: "node_end", type: "END", label: "End", config: {}, position: { x: 80, y: 700 } },
      ];
      const edges: FlowDefinition["edges"] = [
        { id: "e1", source: "node_trigger", target: "n_wait" },
        { id: "e2", source: "n_wait", target: "n_send" },
        { id: "e3", source: "n_send", target: "n_wait2" },
        { id: "e4", source: "n_wait2", target: "n_cond" },
        { id: "e_yes", source: "n_cond", target: "node_end", branch: "yes" },
        { id: "e_no", source: "n_cond", target: "n_task", branch: "no" },
        { id: "e5", source: "n_task", target: "node_end" },
      ];
      return {
        nodes: nodes.map((n, i) => ({ ...n, position: n.position ?? { x: 80, y: 40 + i * 110 } })),
        edges,
      };
    })(),
  },
  {
    libraryKey: "appointment_confirmation",
    name: "Appointment Confirmation",
    description: "Confirm booking with approved template.",
    triggerType: "APPOINTMENT_BOOKED",
    definition: linear("APPOINTMENT_BOOKED", "Appointment Booked", [
      sendTemplate("n_send", "appointment_confirmation", [
        "patient_name",
        "doctor_name",
        "appointment_date",
        "appointment_time",
        "clinic_name",
      ]),
    ]),
  },
  {
    libraryKey: "appointment_reminder_24h",
    name: "Appointment 24h Reminder",
    description: "Remind patient ~24 hours before a confirmed appointment.",
    triggerType: "APPOINTMENT_TOMORROW",
    definition: linear("APPOINTMENT_TOMORROW", "Appointment Tomorrow", [
      sendTemplate("n_send", "appointment_reminder", [
        "patient_name",
        "doctor_name",
        "appointment_date",
        "appointment_time",
        "clinic_name",
      ]),
    ]),
  },
  {
    libraryKey: "appointment_reminder_2h",
    name: "Appointment 2h Reminder",
    description: "Same-day short-window reminder (~2 hours before).",
    triggerType: "APPOINTMENT_2H",
    definition: linear("APPOINTMENT_2H", "Appointment Due Soon", [
      sendTemplate("n_send", "appointment_reminder_2h", [
        "patient_name",
        "appointment_time",
        "clinic_name",
      ]),
    ]),
  },
  {
    libraryKey: "missed_appointment",
    name: "Missed Appointment",
    description: "Follow-up after NO_SHOW; create coordinator reschedule task.",
    triggerType: "APPOINTMENT_MISSED",
    definition: linear("APPOINTMENT_MISSED", "Appointment Missed", [
      sendTemplate("n_send", "missed_appointment", ["patient_name", "clinic_name"]),
      {
        id: "n_task",
        type: "CREATE_TASK",
        label: "Coordinator reschedule task",
        config: { title: "Missed appointment — offer reschedule", priority: "HIGH" },
      },
    ]),
  },
  {
    libraryKey: "appointment_cancelled",
    name: "Appointment Cancelled",
    description: "Notify patient when appointment is cancelled.",
    triggerType: "APPOINTMENT_CANCELLED",
    definition: linear("APPOINTMENT_CANCELLED", "Appointment Cancelled", [
      sendTemplate("n_send", "appointment_cancelled", ["patient_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "followup_reminder",
    name: "Follow-up Reminder",
    description: "Generic follow-up due reminder (Care Loop).",
    triggerType: "CARE_TASK_DUE",
    definition: linear("CARE_TASK_DUE", "Follow-up Due", [
      sendTemplate("n_send", "followup_reminder", ["patient_name", "care_task_title", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "care_task_due",
    name: "Care Task Due",
    description: "Care Loop due-task reminder with escalation path.",
    triggerType: "CARE_TASK_DUE",
    definition: linear("CARE_TASK_DUE", "Care Task Due", [
      sendTemplate("n_send", "care_task_reminder", ["patient_name", "care_task_title"]),
      { id: "n_wait", type: "WAIT", label: "Wait 24 hours", config: { amount: 24, unit: "hours" } },
      {
        id: "n_esc",
        type: "ESCALATE",
        label: "Escalate to coordinator",
        config: { reason: "No response to care task reminder" },
      },
    ]),
  },
  {
    libraryKey: "care_task_overdue",
    name: "Care Task Overdue",
    description: "Overdue Care Loop task → reminder + notify staff.",
    triggerType: "CARE_TASK_OVERDUE",
    definition: linear("CARE_TASK_OVERDUE", "Care Task Overdue", [
      sendTemplate("n_send", "care_task_overdue", ["patient_name", "care_task_title"]),
      {
        id: "n_notify",
        type: "NOTIFY_STAFF",
        label: "Notify coordinator",
        config: { title: "Care task overdue", body: "Patient has an overdue care task." },
      },
    ]),
  },
  {
    libraryKey: "patient_inactive",
    name: "Patient Inactive",
    description: "Check-in after inactivity; create staff task if no reply.",
    triggerType: "PATIENT_INACTIVE",
    definition: linear("PATIENT_INACTIVE", "Patient Inactive", [
      sendTemplate("n_send", "patient_check_in", ["patient_name", "clinic_name"]),
      { id: "n_wait", type: "WAIT", label: "Wait 2 days", config: { amount: 2, unit: "days" } },
      {
        id: "n_task",
        type: "CREATE_TASK",
        label: "Staff follow-up",
        config: { title: "Inactive patient — no WhatsApp reply", priority: "NORMAL" },
      },
    ]),
  },
  {
    libraryKey: "medicine_assigned",
    name: "Medicine Assigned",
    description: "Notify when a prescription item is assigned — uses stored pharmacy fields only.",
    triggerType: "MEDICINE_ASSIGNED",
    definition: linear("MEDICINE_ASSIGNED", "Medicine Assigned", [
      sendTemplate("n_send", "medicine_assigned", [
        "patient_name",
        "medicine_name",
        "medicine_dosage",
        "medicine_time",
        "clinic_name",
      ]),
    ]),
  },
  {
    libraryKey: "medicine_reminder",
    name: "Medicine Reminder",
    description: "Scheduled medication reminder from pharmacy data.",
    triggerType: "MEDICINE_REMINDER",
    definition: linear("MEDICINE_REMINDER", "Medicine Reminder", [
      sendTemplate("n_send", "medicine_reminder", [
        "patient_name",
        "medicine_name",
        "medicine_time",
        "medicine_dosage",
      ]),
    ]),
  },
  {
    libraryKey: "medicine_refill",
    name: "Medicine Refill Reminder",
    description: "Refill / running-low style reminder (triggered when refill event fires).",
    triggerType: "MEDICINE_REFILL",
    definition: linear("MEDICINE_REFILL", "Medicine Refill", [
      sendTemplate("n_send", "medicine_refill", ["patient_name", "medicine_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "medicine_dispensed",
    name: "Prescription Dispensed",
    description: "Confirm medicines were dispensed — pharmacy data only, no medical advice.",
    triggerType: "MEDICINE_DISPENSED",
    definition: linear("MEDICINE_DISPENSED", "Prescription Dispensed", [
      sendTemplate("n_send", "medicine_dispensed", ["patient_name", "medicine_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "medicine_starting",
    name: "Medication Starting Tomorrow",
    description: "Reminder the day before a prescribed start date.",
    triggerType: "MEDICINE_STARTING",
    definition: linear("MEDICINE_STARTING", "Medication Starting", [
      sendTemplate("n_send", "medicine_starting", [
        "patient_name",
        "medicine_name",
        "medicine_time",
        "clinic_name",
      ]),
    ]),
  },
  {
    libraryKey: "medicine_missed",
    name: "Medication Missed",
    description: "Care Task + optional patient notice when a dose remains unconfirmed.",
    triggerType: "MEDICINE_MISSED",
    definition: linear("MEDICINE_MISSED", "Medication Missed", [
      {
        id: "n_task",
        type: "CREATE_TASK",
        label: "Follow up missed dose",
        config: {
          title: "Missed medication follow-up",
          priority: "HIGH",
          category: "MEDICATION",
        },
      },
      sendTemplate("n_send", "medicine_missed", ["patient_name", "medicine_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "abha_verification_required",
    name: "ABHA Verification Required",
    description: "Safe notice — no clinical details. Patient completes verification via secure channel.",
    triggerType: "ABHA_VERIFICATION_REQUIRED",
    definition: linear("ABHA_VERIFICATION_REQUIRED", "ABHA Verification", [
      sendTemplate("n_send", "abha_verification", ["patient_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "consent_requested",
    name: "Health Consent Requested",
    description: "Minimal notice that consent is needed — never includes medical content.",
    triggerType: "CONSENT_REQUESTED",
    definition: linear("CONSENT_REQUESTED", "Consent Requested", [
      sendTemplate("n_send", "health_consent_request", ["patient_name", "clinic_name"]),
      {
        id: "n_task",
        type: "CREATE_TASK",
        label: "Follow up consent",
        config: {
          title: "Digital health consent pending",
          priority: "NORMAL",
          category: "DIGITAL_HEALTH",
        },
      },
    ]),
  },
  {
    libraryKey: "payment_due",
    name: "Payment Due",
    description: "Pending payment reminder; never invents amounts.",
    triggerType: "PAYMENT_PENDING",
    definition: linear("PAYMENT_PENDING", "Payment Pending", [
      sendTemplate("n_send", "payment_reminder", ["patient_name", "payment_amount", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "payment_overdue",
    name: "Payment Overdue",
    description: "Overdue invoice reminder + staff notify.",
    triggerType: "PAYMENT_OVERDUE",
    definition: linear("PAYMENT_OVERDUE", "Payment Overdue", [
      sendTemplate("n_send", "payment_overdue", ["patient_name", "payment_amount", "clinic_name"]),
      {
        id: "n_notify",
        type: "NOTIFY_STAFF",
        label: "Notify billing",
        config: { title: "Payment overdue", body: "Patient has an overdue invoice." },
      },
    ]),
  },
  {
    libraryKey: "payment_received",
    name: "Payment Received",
    description: "Thank-you after successful payment.",
    triggerType: "PAYMENT_RECEIVED",
    definition: linear("PAYMENT_RECEIVED", "Payment Received", [
      sendTemplate("n_send", "payment_received", ["patient_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "document_reminder",
    name: "Document Reminder",
    description: "Remind patient to upload/bring documents (manual or scheduled trigger).",
    triggerType: "MANUAL",
    definition: linear("MANUAL", "Document Reminder", [
      sendTemplate("n_send", "document_reminder", ["patient_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "patient_feedback",
    name: "Patient Feedback",
    description: "Request feedback after consultation / visit.",
    triggerType: "CONSULTATION_COMPLETED",
    definition: linear("CONSULTATION_COMPLETED", "Consultation Completed", [
      { id: "n_wait", type: "WAIT", label: "Wait 2 hours", config: { amount: 2, unit: "hours" } },
      sendTemplate("n_send", "patient_feedback", ["patient_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "human_escalation",
    name: "Human Escalation",
    description: "Escalate to staff Care Task when automation cannot continue safely.",
    triggerType: "MANUAL",
    definition: linear("MANUAL", "Human Escalation", [
      {
        id: "n_esc",
        type: "ESCALATE",
        label: "Escalate to staff",
        config: { reason: "Patient needs human assistance" },
      },
    ]),
  },
  {
    libraryKey: "patient_replied",
    name: "Patient Replied",
    description: "When inbound WhatsApp arrives — notify staff / pause-friendly handoff path.",
    triggerType: "INCOMING_WHATSAPP",
    definition: linear("INCOMING_WHATSAPP", "Patient Replied", [
      {
        id: "n_notify",
        type: "NOTIFY_STAFF",
        label: "Notify inbox team",
        config: { title: "Patient replied on WhatsApp", body: "Review conversation and take over if needed." },
      },
    ]),
  },
  {
    libraryKey: "consultation_followup",
    name: "Consultation Follow-up",
    description: "Thank-you / next-step after consultation note saved.",
    triggerType: "CONSULTATION_COMPLETED",
    definition: linear("CONSULTATION_COMPLETED", "Consultation Completed", [
      sendTemplate("n_send", "consultation_followup", ["patient_name", "clinic_name"]),
    ]),
  },
  {
    libraryKey: "treatment_followup",
    name: "Treatment Follow-up",
    description: "Generic post-treatment check-in (multi-specialty).",
    triggerType: "TREATMENT_STARTED",
    definition: linear("TREATMENT_STARTED", "Treatment Started", [
      { id: "n_wait", type: "WAIT", label: "Wait 1 day", config: { amount: 1, unit: "days" } },
      sendTemplate("n_send", "treatment_followup", ["patient_name", "clinic_name"]),
    ]),
  },
];
