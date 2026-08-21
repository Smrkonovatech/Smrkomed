import type {
  AppointmentStatus,
  CarePlanType,
  CareTaskPriority,
  CareTaskStatus,
  CoupleStatus,
  CycleStatus,
  DocumentStatus,
  EscalationSeverity,
  EscalationStatus,
  EscalationType,
  Gender,
  TreatmentKind,
} from "@prisma/client";

export const fertilitySteps = [
  "Consultation",
  "Baseline",
  "Monitoring",
  "Procedure",
  "Transfer",
  "Follow-up",
  "Pregnancy Test",
];

export type StaffMap = Record<string, { id: string; name: string }>;

export type CoupleDemo = {
  slug: string;
  primary: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: Gender;
    phone: string;
    email: string;
    language: string;
  };
  partner: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: Gender;
    phone: string;
    email: string;
    language: string;
  };
  planType: CarePlanType;
  planName: string;
  treatmentKind: TreatmentKind;
  label: string;
  stageName: string;
  stageIndex: number;
  coupleStatus: CoupleStatus;
  careLoopActive: boolean;
  treatmentStatus: CycleStatus;
  doctorEmail: string;
  coordinatorEmail: string;
  registeredDaysAgo: number;
  tasks: Array<{
    title: string;
    category: string;
    status: CareTaskStatus;
    priority: CareTaskPriority;
    dueOffset: number;
    assignTo: "meera" | "doctor" | "kavya";
  }>;
  escalations?: Array<{
    type: EscalationType;
    severity: EscalationSeverity;
    reason: string;
    status?: EscalationStatus;
  }>;
  appointments: Array<{
    type: string;
    doctorName: string;
    room: string;
    dayOffset: number;
    hour: number;
    status: AppointmentStatus;
    notes?: string;
  }>;
  documents: Array<{ name: string; categoryKey: string; status: DocumentStatus }>;
  cycleNotes?: string;
};

export function day(offset: number, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
