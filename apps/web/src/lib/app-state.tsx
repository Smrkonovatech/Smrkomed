"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  appointments as seedAppointments,
  careContent as seedCareContent,
  clinics,
  couples as seedCouples,
  cycles as seedCycles,
  documents as seedDocuments,
  exceptions as seedExceptions,
  invoices as seedInvoices,
  leads as seedLeads,
  loopActivity as seedActivity,
  loopKpis,
  tasks as seedTasks,
  type Appointment,
  type CareTask,
  type CareContentItem,
  type Couple,
  type DocumentItem,
  type ExceptionItem,
  type Invoice,
  type LoopActivity,
  type Person,
  type TaskStatus,
  type Treatment,
  type TreatmentCycle,
} from "./demo-data";

export type Role = "doctor" | "coordinator" | "owner";

export interface AppPerson extends Person {
  dob?: string;
  email?: string;
  language?: string;
}

export interface AppCouple extends Omit<Couple, "primary" | "partner"> {
  primary: AppPerson;
  partner?: AppPerson;
  whatsappConsent?: boolean;
  carePlanTemplate?: string;
}

export interface AppAppointment extends Appointment {
  date?: string;
  partner?: string;
  duration?: number;
  notes?: string;
  whatsappConfirmation?: boolean;
  whatsappReminder?: boolean;
  careLoop?: boolean;
}

export interface AppCycle extends TreatmentCycle {
  coordinator?: string;
  template?: string;
}

export interface AppDocument extends DocumentItem {
  taskId?: string;
  notifyStaff?: boolean;
  mimeType?: string;
  size?: number;
  demoOnly?: boolean;
}

export interface Enquiry {
  id: string;
  name: string;
  partner: string;
  phone: string;
  email: string;
  source: string;
  treatment: string;
  counselor: string;
  followUp: string;
  notes: string;
  stage: string;
}

export interface AddCoupleInput {
  primary: { fullName: string; dob: string; phone: string; email: string; language: string };
  partner: { fullName: string; dob: string; phone: string; email: string; language: string };
  treatment: Treatment;
  doctor: string;
  coordinator: string;
  whatsappConsent: boolean;
  carePlanTemplate: string;
}

export type AddAppointmentInput = Omit<AppAppointment, "id" | "status">;
export type AddCycleInput = {
  coupleId: string;
  treatment: Exclude<Treatment, "Evaluation">;
  cycleLabel: string;
  doctor: string;
  coordinator: string;
  startDate: string;
  template: string;
};
export type AddDocumentInput = {
  name: string;
  category: string;
  coupleId: string;
  taskId?: string;
  notifyStaff: boolean;
  mimeType: string;
  size: number;
};
export type AddEnquiryInput = Omit<Enquiry, "id" | "stage">;

export interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  clinicId: string;
  setClinicId: (id: string) => void;
  clinicName: string;
  couples: AppCouple[];
  addCouple: (input: AddCoupleInput) => AppCouple;
  appointments: AppAppointment[];
  addAppointment: (input: AddAppointmentInput) => AppAppointment;
  cycles: AppCycle[];
  addCycle: (input: AddCycleInput) => AppCycle;
  documents: AppDocument[];
  addDocument: (input: AddDocumentInput) => AppDocument;
  invoices: Invoice[];
  enquiries: Enquiry[];
  addEnquiry: (input: AddEnquiryInput) => Enquiry;
  careContent: CareContentItem[];
  tasks: CareTask[];
  createTask: (task: Omit<CareTask, "id">) => CareTask;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  activity: LoopActivity[];
  pushActivity: (a: Omit<LoopActivity, "id">) => void;
  exceptions: ExceptionItem[];
  resolveException: (id: string) => void;
  addException: (e: ExceptionItem) => void;
  kpis: typeof loopKpis;
  bumpKpis: (patch: Partial<typeof loopKpis>) => void;
}

const AppStateContext = createContext<AppState | null>(null);

const makeId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const ageFromDob = (dob: string) => {
  const birth = new Date(`${dob}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("doctor");
  const [clinicId, setClinicId] = useState(clinics[0]!.id);
  const [coupleList, setCoupleList] = useState<AppCouple[]>(() =>
    seedCouples.map((couple) => ({
      ...couple,
      primary: { ...couple.primary },
      ...(couple.partner ? { partner: { ...couple.partner } } : {}),
    })),
  );
  const [appointmentList, setAppointmentList] = useState<AppAppointment[]>(() =>
    seedAppointments.map((appointment) => ({ ...appointment })),
  );
  const [cycleList, setCycleList] = useState<AppCycle[]>(() =>
    seedCycles.map((cycle) => ({ ...cycle })),
  );
  const [documentList, setDocumentList] = useState<AppDocument[]>(() =>
    seedDocuments.map((document) => ({ ...document })),
  );
  const [invoiceList] = useState<Invoice[]>(() => seedInvoices.map((invoice) => ({ ...invoice })));
  const [enquiryList, setEnquiryList] = useState<Enquiry[]>(() =>
    seedLeads.map((lead) => ({
      id: lead.id,
      name: lead.name.split(" & ")[0] ?? lead.name,
      partner: lead.name.split(" & ")[1] ?? "",
      phone: "",
      email: "",
      source: lead.source,
      treatment: lead.interest,
      counselor: lead.counselor,
      followUp: lead.nextAction,
      notes: "",
      stage: lead.stage,
    })),
  );
  const [careContentList] = useState<CareContentItem[]>(() =>
    seedCareContent.map((item) => ({ ...item })),
  );
  const [tasks, setTasks] = useState<CareTask[]>(seedTasks);
  const [activity, setActivity] = useState<LoopActivity[]>(seedActivity);
  const [exceptionList, setExceptionList] = useState<ExceptionItem[]>(seedExceptions);
  const [kpis, setKpis] = useState(loopKpis);

  const addCouple = useCallback((input: AddCoupleInput) => {
    const baseSlug = slugify(
      `${input.primary.fullName.split(" ")[0] ?? input.primary.fullName}-${input.partner.fullName.split(" ")[0] ?? input.partner.fullName}`,
    );
    const created: AppCouple = {
      id: makeId("c"),
      slug: `${baseSlug}-${Date.now().toString(36).slice(-4)}`,
      primary: {
        name: input.primary.fullName,
        age: ageFromDob(input.primary.dob),
        phone: input.primary.phone,
        dob: input.primary.dob,
        email: input.primary.email,
        language: input.primary.language,
      },
      partner: {
        name: input.partner.fullName,
        age: ageFromDob(input.partner.dob),
        phone: input.partner.phone,
        dob: input.partner.dob,
        email: input.partner.email,
        language: input.partner.language,
      },
      treatment: input.treatment,
      cycleLabel:
        input.treatment === "Evaluation" ? "Fertility Evaluation" : `${input.treatment} intake`,
      stageIndex: 0,
      cycle: "Not started",
      stage: "Consultation",
      doctor: input.doctor,
      coordinator: input.coordinator,
      careLoop: input.whatsappConsent ? "Active" : "Paused",
      nextStep: "Initial consultation",
      status: "Pending",
      tags: [input.treatment, "New"],
      since: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      whatsappConsent: input.whatsappConsent,
      carePlanTemplate: input.carePlanTemplate,
    };
    setCoupleList((previous) => [created, ...previous]);
    return created;
  }, []);

  const addAppointment = useCallback((input: AddAppointmentInput) => {
    const created: AppAppointment = {
      ...input,
      id: makeId("a"),
      status: "Confirmed",
    };
    setAppointmentList((previous) => [created, ...previous]);
    return created;
  }, []);

  const addCycle = useCallback((input: AddCycleInput) => {
    const created: AppCycle = {
      id: makeId("cy"),
      coupleId: input.coupleId,
      cycleLabel: input.cycleLabel,
      treatment: input.treatment,
      stage: "Consultation",
      stageIndex: 0,
      status: "Active",
      started: new Date(`${input.startDate}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      nextStep: "Baseline assessment",
      nextDate: "To be scheduled",
      doctor: input.doctor,
      coordinator: input.coordinator,
      template: input.template,
    };
    setCycleList((previous) => [created, ...previous]);
    return created;
  }, []);

  const addDocument = useCallback((input: AddDocumentInput) => {
    const created: AppDocument = {
      id: makeId("d"),
      name: input.name,
      category: input.category,
      coupleId: input.coupleId,
      uploaded: "Just now",
      uploadedBy: "Demo staff user",
      status: "Doctor Review",
      notifyStaff: input.notifyStaff,
      mimeType: input.mimeType,
      size: input.size,
      demoOnly: true,
      ...(input.taskId ? { taskId: input.taskId } : {}),
    };
    setDocumentList((previous) => [created, ...previous]);
    return created;
  }, []);

  const addEnquiry = useCallback((input: AddEnquiryInput) => {
    const created: Enquiry = { ...input, id: makeId("enq"), stage: "New Enquiry" };
    setEnquiryList((previous) => [created, ...previous]);
    return created;
  }, []);

  const createTask = useCallback((task: Omit<CareTask, "id">) => {
    const created: CareTask = { ...task, id: `t${Date.now()}` };
    setTasks((prev) => [created, ...prev]);
    setActivity((prev) => [
      {
        id: `l${Date.now()}`,
        patient: task.assignedTo,
        activity: `New task created — ${task.title}`,
        time: "just now",
        tone: "info",
      },
      ...prev,
    ]);
    return created;
  }, []);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const pushActivity = useCallback((a: Omit<LoopActivity, "id">) => {
    setActivity((prev) => [{ ...a, id: `l${Date.now()}${Math.random()}` }, ...prev].slice(0, 40));
  }, []);

  const resolveException = useCallback((id: string) => {
    setExceptionList((prev) => prev.filter((e) => e.id !== id));
    setKpis((prev) => ({ ...prev, needAttention: Math.max(0, prev.needAttention - 1) }));
  }, []);

  const addException = useCallback((e: ExceptionItem) => {
    setExceptionList((prev) => [e, ...prev.filter((x) => x.id !== e.id)]);
    setKpis((prev) => ({ ...prev, needAttention: prev.needAttention + 1 }));
  }, []);

  const bumpKpis = useCallback((patch: Partial<typeof loopKpis>) => {
    setKpis((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      role,
      setRole,
      clinicId,
      setClinicId,
      clinicName: clinics.find((c) => c.id === clinicId)?.city ?? clinics[0]!.city,
      couples: coupleList,
      addCouple,
      appointments: appointmentList,
      addAppointment,
      cycles: cycleList,
      addCycle,
      documents: documentList,
      addDocument,
      invoices: invoiceList,
      enquiries: enquiryList,
      addEnquiry,
      careContent: careContentList,
      tasks,
      createTask,
      setTaskStatus,
      activity,
      pushActivity,
      exceptions: exceptionList,
      resolveException,
      addException,
      kpis,
      bumpKpis,
    }),
    [
      role,
      clinicId,
      coupleList,
      addCouple,
      appointmentList,
      addAppointment,
      cycleList,
      addCycle,
      documentList,
      addDocument,
      invoiceList,
      enquiryList,
      addEnquiry,
      careContentList,
      tasks,
      createTask,
      setTaskStatus,
      activity,
      pushActivity,
      exceptionList,
      resolveException,
      addException,
      kpis,
      bumpKpis,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}

export const patientOptions = seedCouples.map((c) => ({
  id: c.id,
  label: c.partner ? `${c.primary.name} + ${c.partner.name}` : c.primary.name,
  people: [c.primary.name, c.partner?.name].filter(Boolean) as string[],
}));
