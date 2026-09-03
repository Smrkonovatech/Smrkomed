import type {
  Appointment,
  AppointmentStatus,
  CarePlan,
  CarePlanType,
  CareTask,
  CareTaskStatus,
  Couple,
  CoupleStatus,
  Document,
  DocumentStatus,
  Patient,
  Treatment,
  TreatmentKind,
  User,
} from "@smrkomed/database";

export type PersonDto = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  age: number;
  phone: string;
  email: string;
  dob: string;
  language: string;
  status: string;
};

export type CoupleDto = {
  id: string;
  slug: string;
  clinicId: string;
  status: "On Track" | "Needs Attention" | "Pending";
  recordStatus: CoupleStatus;
  careLoop: "Active" | "Paused";
  treatment: "IVF" | "IUI" | "Evaluation" | "FET";
  cycleLabel: string;
  stage: string;
  stageIndex: number;
  cycle: string;
  doctor: string;
  coordinator: string;
  assignedDoctorId: string | null;
  assignedCoordinatorId: string | null;
  nextStep: string;
  tags: string[];
  since: string;
  primary: PersonDto;
  partner?: PersonDto;
};

export type TaskDto = {
  id: string;
  title: string;
  coupleId: string;
  assignedTo: string;
  due: string;
  category: string;
  status: "completed" | "in_progress" | "waiting" | "overdue" | "escalated";
  note?: string;
  carePlanId: string | null;
};

export type AppointmentDto = {
  id: string;
  clinicId: string;
  coupleId: string;
  type: string;
  doctor: string;
  room: string;
  status: "Confirmed" | "Waiting" | "Completed" | "No-show";
  time: string;
  date: string;
  duration: number;
  notes: string;
};

export type DocumentDto = {
  id: string;
  name: string;
  category: string;
  coupleId: string;
  uploaded: string;
  uploadedBy: string;
  status: "Doctor Review" | "Reviewed" | "Awaiting Upload";
  mimeType: string;
  size: number;
  taskId?: string;
};

export type ActivityDto = {
  id: string;
  patient: string;
  activity: string;
  time: string;
  tone: "success" | "warning" | "danger" | "info";
};

export type CarePlanDto = {
  id: string;
  coupleId: string;
  name: string;
  type: CarePlanType;
  status: string;
  startDate: string | null;
  currentStep: number;
};

type PatientRow = Patient;
type CoupleRow = Couple & {
  primaryPatient: PatientRow;
  partnerPatient: PatientRow | null;
  assignedDoctor: Pick<User, "id" | "name"> | null;
  assignedCoordinator: Pick<User, "id" | "name"> | null;
  treatments: Treatment[];
  carePlans: CarePlan[];
  careTasks: Array<Pick<CareTask, "id" | "title" | "status" | "dueDate" | "completedAt">>;
};

const TREATMENT_UI: Record<TreatmentKind, CoupleDto["treatment"]> = {
  IVF: "IVF",
  IUI: "IUI",
  EVALUATION: "Evaluation",
  FET: "FET",
};

const TASK_UI: Record<CareTaskStatus, TaskDto["status"]> = {
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  WAITING: "waiting",
  OVERDUE: "overdue",
  ESCALATED: "escalated",
  CANCELLED: "waiting",
  ACTIVE: "in_progress",
  PENDING: "waiting",
  NOT_STARTED: "waiting",
  UPCOMING: "waiting",
  SKIPPED: "completed",
  BLOCKED: "escalated",
};

const APPOINTMENT_UI: Record<AppointmentStatus, AppointmentDto["status"]> = {
  CONFIRMED: "Confirmed",
  WAITING: "Waiting",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "No-show",
};

const DOCUMENT_UI: Record<DocumentStatus, DocumentDto["status"]> = {
  AWAITING_UPLOAD: "Awaiting Upload",
  UPLOADED: "Doctor Review",
  DOCTOR_REVIEW: "Doctor Review",
  REVIEWED: "Reviewed",
  REJECTED: "Awaiting Upload",
};

export function ageFromDate(value: Date | null) {
  if (!value) return 0;
  const today = new Date();
  let age = today.getFullYear() - value.getFullYear();
  if (
    today.getMonth() < value.getMonth() ||
    (today.getMonth() === value.getMonth() && today.getDate() < value.getDate())
  ) {
    age -= 1;
  }
  return Math.max(0, age);
}

export function formatDay(value: Date) {
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDue(value: Date | null, dueTime: string | null) {
  if (!value) return dueTime || "Unscheduled";
  const day = value.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return dueTime ? `${day} · ${dueTime}` : day;
}

export function serializePerson(patient: PatientRow): PersonDto {
  return {
    id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    firstName: patient.firstName,
    lastName: patient.lastName,
    age: ageFromDate(patient.dateOfBirth),
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    dob: patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : "",
    language: patient.preferredLanguage,
    status: patient.status,
  };
}

export function serializeCouple(row: CoupleRow): CoupleDto {
  const treatment = row.treatments[0];
  const openTask = row.careTasks.find((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED");
  const uiStatus =
    row.status === "ON_HOLD"
      ? "Needs Attention"
      : row.status === "ACTIVE"
        ? "On Track"
        : "Pending";
  return {
    id: row.id,
    slug: row.slug,
    clinicId: row.clinicId,
    status: uiStatus,
    recordStatus: row.status,
    careLoop: row.careLoopActive ? "Active" : "Paused",
    treatment: treatment ? TREATMENT_UI[treatment.kind] : "Evaluation",
    cycleLabel: treatment?.label ?? "Intake",
    stage: treatment?.stageName ?? "Consultation",
    stageIndex: treatment?.stageIndex ?? 0,
    cycle: treatment?.status === "ACTIVE" ? "Active" : "Not started",
    doctor: row.assignedDoctor?.name ?? "Unassigned",
    coordinator: row.assignedCoordinator?.name ?? "Unassigned",
    assignedDoctorId: row.assignedDoctorId,
    assignedCoordinatorId: row.assignedCoordinatorId,
    nextStep: openTask?.title ?? "Initial consultation",
    tags: [treatment ? TREATMENT_UI[treatment.kind] : "Evaluation"],
    since: formatDay(row.createdAt),
    primary: serializePerson(row.primaryPatient),
    ...(row.partnerPatient ? { partner: serializePerson(row.partnerPatient) } : {}),
  };
}

export function serializeTask(
  task: CareTask & { assignments?: Array<{ user: Pick<User, "name"> }> },
  couple?: {
    assignedCoordinator: { name: string } | null;
    assignedDoctor: { name: string } | null;
    primaryPatient: { firstName: string };
  },
): TaskDto {
  const assigned =
    task.assignments?.[0]?.user.name ??
    couple?.assignedCoordinator?.name ??
    couple?.assignedDoctor?.name ??
    couple?.primaryPatient.firstName ??
    "Clinic staff";
  return {
    id: task.id,
    title: task.title,
    coupleId: task.coupleId ?? "",
    assignedTo: assigned,
    due: formatDue(task.dueDate, task.dueTime),
    category: task.category ?? "General",
    status: TASK_UI[task.status],
    carePlanId: task.carePlanId,
    ...(task.description ? { note: task.description } : {}),
  };
}

export function serializeAppointment(row: Appointment): AppointmentDto {
  return {
    id: row.id,
    clinicId: row.clinicId,
    coupleId: row.coupleId ?? "",
    type: row.type,
    doctor: row.doctorName ?? "Unassigned",
    room: row.room ?? "",
    status: APPOINTMENT_UI[row.status],
    time: row.startsAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    date: row.startsAt.toISOString().slice(0, 10),
    duration: row.durationMin,
    notes: row.notes ?? "",
  };
}

export function serializeDocument(
  row: Document & { category?: { name: string } | null },
  uploadedBy = "Clinic staff",
): DocumentDto {
  return {
    id: row.id,
    name: row.name,
    category: row.category?.name ?? "Other",
    coupleId: row.coupleId ?? "",
    uploaded: formatDay(row.createdAt),
    uploadedBy,
    status: DOCUMENT_UI[row.status],
    mimeType: row.mimeType ?? "",
    size: row.sizeBytes ?? 0,
    ...(row.careTaskId ? { taskId: row.careTaskId } : {}),
  };
}

export function serializeCarePlan(row: CarePlan): CarePlanDto {
  return {
    id: row.id,
    coupleId: row.coupleId,
    name: row.name,
    type: row.type,
    status: row.status,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    currentStep: row.currentStep,
  };
}

export function serializeActivity(row: {
  id: string;
  action: string;
  entityType: string | null;
  createdAt: Date;
  metadata: unknown;
}): ActivityDto {
  const meta = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
  const patient = typeof meta["patient"] === "string" ? meta["patient"] : "Clinic";
  const tone =
    row.action.includes("create") || row.action.includes("complete")
      ? "success"
      : row.action.includes("archive") || row.action.includes("cancel")
        ? "warning"
        : "info";
  return {
    id: row.id,
    patient,
    activity: humanizeAction(row.action, row.entityType),
    time: formatDay(row.createdAt),
    tone,
  };
}

function humanizeAction(action: string, entityType: string | null) {
  const entity = entityType ?? "record";
  if (action.endsWith(".create")) return `${entity} created`;
  if (action.endsWith(".update")) return `${entity} updated`;
  if (action.includes("complete")) return `${entity} completed`;
  return action.replaceAll(".", " ");
}
