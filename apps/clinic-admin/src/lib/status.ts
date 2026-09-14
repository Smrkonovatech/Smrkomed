import type { TaskStatus, ExceptionKind } from "./demo-data";

export type Tone =
  | "primary"
  | "rose"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "teal"
  | "muted";

export const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  rose: "bg-rose-soft text-rose",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  purple: "bg-purple-soft text-purple",
  teal: "bg-teal-soft text-teal",
  muted: "bg-muted text-muted-foreground",
};

export const toneDot: Record<Tone, string> = {
  primary: "bg-primary",
  rose: "bg-rose",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  purple: "bg-purple",
  teal: "bg-teal",
  muted: "bg-muted-foreground",
};

export const toneSolid: Record<Tone, string> = {
  primary: "bg-primary text-primary-foreground",
  rose: "bg-rose text-rose-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  info: "bg-info text-info-foreground",
  purple: "bg-purple text-purple-foreground",
  teal: "bg-teal text-teal-foreground",
  muted: "bg-muted text-muted-foreground",
};

export const taskStatusMeta: Record<TaskStatus, { label: string; tone: Tone }> = {
  completed: { label: "Completed", tone: "success" },
  in_progress: { label: "In Progress", tone: "info" },
  waiting: { label: "Waiting", tone: "warning" },
  overdue: { label: "Overdue", tone: "warning" },
  escalated: { label: "Escalated", tone: "danger" },
};

export const exceptionMeta: Record<ExceptionKind, { label: string; tone: Tone }> = {
  clinical_review: { label: "Clinical Review", tone: "danger" },
  no_response: { label: "Patient Not Responding", tone: "warning" },
  missing_report: { label: "Missing Report", tone: "purple" },
  appointment_issue: { label: "Appointment Issue", tone: "info" },
  ai_escalation: { label: "AI Escalation", tone: "rose" },
};

/** Fertility treatment colour language — IVF plum/rose, IUI lavender, Evaluation teal, FET rose. */
export const treatmentTone: Record<string, Tone> = {
  IVF: "primary",
  IUI: "info",
  Evaluation: "teal",
  FET: "rose",
};

export const patientStatusTone: Record<string, Tone> = {
  "On Track": "success",
  "Needs Attention": "danger",
  Pending: "warning",
};

export const appointmentTone: Record<string, Tone> = {
  Confirmed: "success",
  Waiting: "warning",
  Completed: "info",
  "No-show": "danger",
};
