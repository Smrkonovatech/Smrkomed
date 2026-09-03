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
    const base = error.message || fallback;
    const withRef =
      error.requestId && !base.includes(error.requestId) ? `${base} Reference: ${error.requestId}` : base;
    if (error.status > 0 && !withRef.includes(`(${error.status})`)) {
      return `${withRef} (${error.status}${error.code ? ` ${error.code}` : ""})`;
    }
    return withRef;
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
  templates: () => apiGet<any[]>("/api/v1/treatment-plan-templates"),
  template: (id: string) => apiGet<any>(`/api/v1/treatment-plan-templates/${id}`),
  createTemplate: (body: unknown) => apiPost<any>("/api/v1/treatment-plan-templates", body),
  patchTemplate: (id: string, body: unknown) => apiPatch<any>(`/api/v1/treatment-plan-templates/${id}`, body),
  duplicateTemplate: (id: string) => apiPost<any>(`/api/v1/treatment-plan-templates/${id}/duplicate`, {}),
  toggleTemplate: (id: string) => apiPost<any>(`/api/v1/treatment-plan-templates/${id}/toggle`, {}),
  assignCarePlan: (body: unknown) => apiPost<any>("/api/v1/care-plans/assign", body),
  journey: (carePlanId: string) => apiGet<any>(`/api/v1/care-plans/${carePlanId}/journey`),
  branchCarePlan: (id: string, body: unknown) => apiPost<any>(`/api/v1/care-plans/${id}/branch`, body),
  pauseCarePlan: (id: string, body: unknown) => apiPost<any>(`/api/v1/care-plans/${id}/pause`, body),
  resumeCarePlan: (id: string) => apiPost<any>(`/api/v1/care-plans/${id}/resume`, {}),
  completeTask: (id: string, body?: unknown) => apiPost<any>(`/api/v1/care-tasks/${id}/complete`, body ?? {}),
  simulateTaskResponse: (id: string, text: string) => apiPost<any>(`/api/v1/care-tasks/${id}/simulate-response`, { text }),
  addDoctorTask: (body: unknown) => apiPost<any>("/api/v1/care-tasks", body),
  exceptions: () => apiGet<any[]>("/api/v1/care-loop/exceptions"),
  resolveException: (id: string, notes?: string) => apiPost<any>(`/api/v1/care-loop/exceptions/${id}/resolve`, { notes }),
  careLoopAnalytics: () => apiGet<any>("/api/v1/care-loop/analytics"),
};
