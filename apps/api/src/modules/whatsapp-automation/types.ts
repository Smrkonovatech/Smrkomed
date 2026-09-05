/** Shared flow definition shapes (stored in WhatsAppFlow.definition Json). */

export type FlowNodeType =
  | "TRIGGER"
  | "WAIT"
  | "WAIT_FOR_REPLY"
  | "CONDITION"
  | "SEND_TEMPLATE"
  | "SEND_TEXT"
  | "SEND_MEDIA"
  | "CREATE_TASK"
  | "ASSIGN_TASK"
  | "ASSIGN_STAFF"
  | "ESCALATE"
  | "NOTIFY_STAFF"
  | "ADD_TAG"
  | "REMOVE_TAG"
  | "END"
  | "AI_DRAFT"
  | "MEDICATION_LOOKUP"
  | "PATIENT_LOOKUP"
  | "APPOINTMENT_LOOKUP";

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  label: string;
  description?: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  /** For CONDITION nodes: "yes" | "no" | "default" */
  branch?: string;
};

export type FlowDefinition = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const TRIGGER_TYPES = [
  "PATIENT_CREATED",
  "APPOINTMENT_BOOKED",
  "APPOINTMENT_TOMORROW",
  "APPOINTMENT_2H",
  "APPOINTMENT_MISSED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_RESCHEDULED",
  "CARE_TASK_CREATED",
  "CARE_TASK_ASSIGNED",
  "CARE_TASK_DUE",
  "CARE_TASK_OVERDUE",
  "CARE_TASK_COMPLETED",
  "CARE_LOOP_STAGE_CHANGED",
  "CARE_LOOP_ESCALATED",
  "TREATMENT_STARTED",
  "MEDICINE_ASSIGNED",
  "MEDICINE_REMINDER",
  "MEDICINE_REFILL",
  "MEDICINE_DISPENSED",
  "MEDICINE_STARTING",
  "MEDICINE_MISSED",
  "ABHA_LINKED",
  "ABHA_VERIFICATION_REQUIRED",
  "CONSENT_REQUESTED",
  "CONSENT_EXPIRING",
  "RECORD_SHARED",
  "PAYMENT_PENDING",
  "PAYMENT_OVERDUE",
  "PAYMENT_RECEIVED",
  "PAYMENT_FAILED",
  "PATIENT_INACTIVE",
  "CONSULTATION_COMPLETED",
  "INCOMING_WHATSAPP",
  "MANUAL",
  "SCHEDULED",
] as const;

export type TriggerType = (typeof TRIGGER_TYPES)[number];

export function emptyDefinition(triggerType: string, triggerLabel: string): FlowDefinition {
  const triggerId = "node_trigger";
  const endId = "node_end";
  return {
    nodes: [
      {
        id: triggerId,
        type: "TRIGGER",
        label: triggerLabel,
        config: { triggerType },
        position: { x: 80, y: 40 },
      },
      {
        id: endId,
        type: "END",
        label: "End",
        config: {},
        position: { x: 80, y: 220 },
      },
    ],
    edges: [{ id: "e_trigger_end", source: triggerId, target: endId }],
  };
}
