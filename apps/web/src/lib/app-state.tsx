"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clinicApi,
  clinicErrorMessage,
  type ClinicAppointment,
  type ClinicCouple,
  type ClinicDocument,
  type ClinicStaff,
  type ClinicTask,
} from "./clinic-api";
import {
  careContent as seedCareContent,
  clinics,
  cycles as seedCycles,
  exceptions as seedExceptions,
  invoices as seedInvoices,
  leads as seedLeads,
  loopKpis,
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
  id?: string;
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
  partner?: { fullName: string; dob: string; phone: string; email: string; language: string };
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
  loadState: "loading" | "ready" | "error";
  loadError: string | null;
  reload: () => Promise<void>;
  staff: ClinicStaff[];
  staffError: string | null;
  reloadStaff: () => Promise<void>;
  couples: AppCouple[];
  addCouple: (input: AddCoupleInput) => Promise<AppCouple>;
  updatePatient: (patientId: string, patch: { phone?: string; email?: string }) => Promise<void>;
  appointments: AppAppointment[];
  addAppointment: (input: AddAppointmentInput) => Promise<AppAppointment>;
  patchAppointmentStatus: (id: string, status: Appointment["status"]) => Promise<void>;
  cycles: AppCycle[];
  addCycle: (input: AddCycleInput) => AppCycle;
  documents: AppDocument[];
  addDocument: (input: AddDocumentInput) => Promise<AppDocument>;
  invoices: Invoice[];
  enquiries: Enquiry[];
  addEnquiry: (input: AddEnquiryInput) => Enquiry;
  careContent: CareContentItem[];
  tasks: CareTask[];
  createTask: (task: Omit<CareTask, "id">) => Promise<CareTask>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
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

const TASK_API: Record<TaskStatus, string> = {
  completed: "COMPLETED",
  in_progress: "IN_PROGRESS",
  waiting: "WAITING",
  overdue: "OVERDUE",
  escalated: "ESCALATED",
};

const APPOINTMENT_API: Record<Appointment["status"], string> = {
  Confirmed: "CONFIRMED",
  Waiting: "WAITING",
  Completed: "COMPLETED",
  "No-show": "NO_SHOW",
};

function toCouple(row: ClinicCouple): AppCouple {
  return {
    id: row.id,
    slug: row.slug,
    primary: row.primary,
    ...(row.partner ? { partner: row.partner } : {}),
    treatment: row.treatment,
    cycleLabel: row.cycleLabel,
    stageIndex: row.stageIndex,
    cycle: row.cycle,
    stage: row.stage,
    doctor: row.doctor,
    coordinator: row.coordinator,
    careLoop: row.careLoop,
    nextStep: row.nextStep,
    status: row.status,
    tags: row.tags,
    since: row.since,
  };
}

function toTask(row: ClinicTask): CareTask {
  return {
    id: row.id,
    title: row.title,
    coupleId: row.coupleId,
    assignedTo: row.assignedTo,
    due: row.due,
    category: row.category,
    status: row.status,
    ...(row.note ? { note: row.note } : {}),
  };
}

function toAppointment(row: ClinicAppointment): AppAppointment {
  return {
    id: row.id,
    coupleId: row.coupleId,
    type: row.type,
    doctor: row.doctor,
    room: row.room,
    status: row.status,
    time: row.time,
    date: row.date,
    duration: row.duration,
    notes: row.notes,
  };
}

function toDocument(row: ClinicDocument): AppDocument {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    coupleId: row.coupleId,
    uploaded: row.uploaded,
    uploadedBy: row.uploadedBy,
    status: row.status,
    mimeType: row.mimeType,
    size: row.size,
    ...(row.taskId ? { taskId: row.taskId } : {}),
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("doctor");
  const [clinicId, setClinicId] = useState(clinics[0]!.id);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [coupleList, setCoupleList] = useState<AppCouple[]>([]);
  const [appointmentList, setAppointmentList] = useState<AppAppointment[]>([]);
  const [cycleList, setCycleList] = useState<AppCycle[]>(() => seedCycles.map((cycle) => ({ ...cycle })));
  const [documentList, setDocumentList] = useState<AppDocument[]>([]);
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
  const [careContentList] = useState<CareContentItem[]>(() => seedCareContent.map((item) => ({ ...item })));
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [activity, setActivity] = useState<LoopActivity[]>([]);
  const [exceptionList, setExceptionList] = useState<ExceptionItem[]>(seedExceptions);
  const [kpis, setKpis] = useState(loopKpis);

  const reloadStaff = useCallback(async () => {
    setStaffError(null);
    try {
      const nextStaff = await clinicApi.staff();
      setStaff(nextStaff);
    } catch (error) {
      setStaff([]);
      setStaffError(clinicErrorMessage(error, "Unable to load clinic staff. Try again."));
    }
  }, []);

  const reload = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    setStaffError(null);
    try {
      const [couples, nextTasks, appointments, documents, nextActivity, staffOutcome] =
        await Promise.all([
          clinicApi.couples(),
          clinicApi.tasks(),
          clinicApi.appointments(),
          clinicApi.documents(),
          clinicApi.activity(),
          clinicApi
            .staff()
            .then((rows) => ({ ok: true as const, rows }))
            .catch((error: unknown) => ({
              ok: false as const,
              error: clinicErrorMessage(error, "Unable to load clinic staff."),
            })),
        ]);
      setCoupleList(couples.map(toCouple));
      setTasks(nextTasks.map(toTask));
      setAppointmentList(appointments.map(toAppointment));
      setDocumentList(documents.map(toDocument));
      setActivity(nextActivity);
      if (staffOutcome.ok) {
        setStaff(staffOutcome.rows);
        setStaffError(null);
      } else {
        setStaff([]);
        setStaffError(staffOutcome.error);
      }
      setKpis({
        active: couples.length,
        completion: loopKpis.completion,
        automatedToday: loopKpis.automatedToday,
        needAttention: nextTasks.filter((task) => task.status === "overdue" || task.status === "escalated")
          .length,
      });
      setLoadState("ready");
    } catch (error) {
      setCoupleList([]);
      setTasks([]);
      setAppointmentList([]);
      setDocumentList([]);
      setActivity([]);
      setLoadError(clinicErrorMessage(error, "Unable to load clinic records. Try again."));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load clinic records from the API after mount
    void reload();
  }, [reload]);

  const addCouple = useCallback(async (input: AddCoupleInput) => {
    const partner =
      input.partner && input.partner.fullName.trim()
        ? {
            fullName: input.partner.fullName,
            dob: input.partner.dob,
            phone: input.partner.phone,
            email: input.partner.email,
            language: input.partner.language,
          }
        : undefined;
    const { email: primaryEmail, ...primaryRest } = input.primary;
    const created = await clinicApi.createCouple({
      primary: {
        ...primaryRest,
        ...(primaryEmail ? { email: primaryEmail } : {}),
      },
      ...(partner
        ? {
            partner: {
              fullName: partner.fullName,
              dob: partner.dob,
              phone: partner.phone,
              language: partner.language,
              ...(partner.email ? { email: partner.email } : {}),
            },
          }
        : {}),
      treatment: input.treatment,
      ...(input.doctor && input.doctor !== "__unassigned__" && input.doctor !== "Unassigned"
        ? { assignedDoctorId: input.doctor }
        : {}),
      ...(input.coordinator && input.coordinator !== "__unassigned__" && input.coordinator !== "Unassigned"
        ? { assignedCoordinatorId: input.coordinator }
        : {}),
      whatsappConsent: input.whatsappConsent,
      carePlanTemplate: input.carePlanTemplate,
    });
    const couple = toCouple(created);
    setCoupleList((previous) => [couple, ...previous.filter((row) => row.id !== couple.id)]);
    await reload();
    return couple;
  }, [reload]);

  const updatePatient = useCallback(async (patientId: string, patch: { phone?: string; email?: string }) => {
    await clinicApi.patchPatient(patientId, patch);
    await reload();
  }, [reload]);

  const addAppointment = useCallback(async (input: AddAppointmentInput) => {
    const startsAt = input.date
      ? new Date(`${input.date}T${normalizeTime(input.time)}`).toISOString()
      : new Date().toISOString();
    const created = await clinicApi.createAppointment({
      coupleId: input.coupleId,
      type: input.type,
      startsAt,
      durationMin: input.duration ?? 30,
      doctorName: input.doctor,
      room: input.room,
      notes: input.notes || undefined,
    });
    const appointment = toAppointment(created);
    setAppointmentList((previous) => [appointment, ...previous]);
    return appointment;
  }, []);

  const patchAppointmentStatus = useCallback(async (id: string, status: Appointment["status"]) => {
    const updated = await clinicApi.patchAppointment(id, { status: APPOINTMENT_API[status] });
    setAppointmentList((previous) =>
      previous.map((row) => (row.id === id ? toAppointment(updated) : row)),
    );
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

  const addDocument = useCallback(async (input: AddDocumentInput) => {
    const created = await clinicApi.createDocument({
      coupleId: input.coupleId,
      name: input.name,
      category: input.category,
      mimeType: input.mimeType,
      sizeBytes: input.size,
      ...(input.taskId ? { careTaskId: input.taskId } : {}),
    });
    const document = toDocument(created);
    setDocumentList((previous) => [document, ...previous]);
    return document;
  }, []);

  const addEnquiry = useCallback((input: AddEnquiryInput) => {
    const created: Enquiry = { ...input, id: makeId("enq"), stage: "New Enquiry" };
    setEnquiryList((previous) => [created, ...previous]);
    return created;
  }, []);

  const createTask = useCallback(async (task: Omit<CareTask, "id">) => {
    const created = await clinicApi.createTask({
      coupleId: task.coupleId,
      title: task.title,
      category: task.category,
      description: task.note,
    });
    const next = toTask(created);
    setTasks((prev) => [next, ...prev]);
    return next;
  }, []);

  const setTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    const updated = await clinicApi.patchTask(id, { status: TASK_API[status] });
    setTasks((prev) => prev.map((task) => (task.id === id ? toTask(updated) : task)));
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
      loadState,
      loadError,
      reload,
      staff,
      staffError,
      reloadStaff,
      couples: coupleList,
      addCouple,
      updatePatient,
      appointments: appointmentList,
      addAppointment,
      patchAppointmentStatus,
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
      loadState,
      loadError,
      reload,
      staff,
      staffError,
      reloadStaff,
      coupleList,
      addCouple,
      updatePatient,
      appointmentList,
      addAppointment,
      patchAppointmentStatus,
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

function normalizeTime(value: string) {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "10:00:00";
  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}:00`;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}

export const patientOptions: Array<{ id: string; label: string; people: string[] }> = [];
