import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";

export type ClinicPerson = {
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

export type ClinicCouple = {
  id: string;
  slug: string;
  clinicId: string;
  status: "On Track" | "Needs Attention" | "Pending";
  careLoop: "Active" | "Paused";
  treatment: "IVF" | "IUI" | "Evaluation" | "FET";
  cycleLabel: string;
  stage: string;
  stageIndex: number;
  cycle: string;
  doctor: string;
  coordinator: string;
  nextStep: string;
  tags: string[];
  since: string;
  primary: ClinicPerson;
  partner?: ClinicPerson;
};

export type ClinicTask = {
  id: string;
  title: string;
  coupleId: string;
  assignedTo: string;
  due: string;
  category: string;
  status: "completed" | "in_progress" | "waiting" | "overdue" | "escalated";
  note?: string;
};

export type ClinicAppointment = {
  id: string;
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

export type ClinicDocument = {
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

export type ClinicActivity = {
  id: string;
  patient: string;
  activity: string;
  time: string;
  tone: "success" | "warning" | "danger" | "info";
};

export type ClinicStaff = {
  id: string;
  name: string;
  email?: string;
  title?: string;
  role: string;
  roleName: string;
};

export type ClinicCarePlan = {
  id: string;
  coupleId: string;
  name: string;
  type: string;
  status: string;
};

export function clinicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.requestId && !error.message.includes(error.requestId)) {
      return `${error.message} Reference: ${error.requestId}`;
    }
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const clinicApi = {
  couples: () => apiGet<ClinicCouple[]>("/api/v1/couples"),
  couple: (id: string) => apiGet<ClinicCouple>(`/api/v1/couples/${id}`),
  createCouple: (body: unknown) => apiPost<ClinicCouple>("/api/v1/couples", body),
  tasks: () => apiGet<ClinicTask[]>("/api/v1/care-tasks"),
  createTask: (body: unknown) => apiPost<ClinicTask>("/api/v1/care-tasks", body),
  patchTask: (id: string, body: unknown) => apiPatch<ClinicTask>(`/api/v1/care-tasks/${id}`, body),
  appointments: () => apiGet<ClinicAppointment[]>("/api/v1/appointments"),
  createAppointment: (body: unknown) => apiPost<ClinicAppointment>("/api/v1/appointments", body),
  patchAppointment: (id: string, body: unknown) =>
    apiPatch<ClinicAppointment>(`/api/v1/appointments/${id}`, body),
  documents: () => apiGet<ClinicDocument[]>("/api/v1/documents"),
  createDocument: (body: unknown) => apiPost<ClinicDocument>("/api/v1/documents", body),
  activity: () => apiGet<ClinicActivity[]>("/api/v1/activity"),
  staff: () => apiGet<ClinicStaff[]>("/api/v1/users/staff"),
  me: () =>
    apiGet<{ id: string; name: string; email: string; role: string; clinicName: string }>("/api/v1/users/me"),
  carePlans: () => apiGet<ClinicCarePlan[]>("/api/v1/care-plans"),
  createCarePlan: (body: unknown) => apiPost<ClinicCarePlan>("/api/v1/care-plans", body),
  patchPatient: (id: string, body: unknown) => apiPatch(`/api/v1/patients/${id}`, body),
};
