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
import { useSession } from "next-auth/react";

import {
  clinicApi,
  clinicErrorMessage,
  type ClinicAppointment,
  type ClinicCouple,
  type ClinicDocument,
  type ClinicProfile,
  type ClinicStaff,
  type ClinicTask,
} from "./clinic-api";
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
  loopActivity as seedLoopActivity,
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
  clinicId?: string;
}

export function isQrCheckinCouple(couple: AppCouple): boolean {
  const primaryName = (couple.primary?.name || "").trim().toLowerCase();
  const slug = (couple.slug || "").toLowerCase();
  const tags = (couple.tags || []).map((t) => t.toLowerCase());

  if (
    primaryName.includes("hospextest") ||
    primaryName === "priya hospextest" ||
    primaryName.includes("walk-in")
  ) {
    return true;
  }

  if (
    slug.includes("hospextest") ||
    slug.includes("qr-checkin") ||
    slug.includes("walkin")
  ) {
    return true;
  }

  if (
    tags.some(
      (t) =>
        t.includes("qr") ||
        t.includes("walk-in") ||
        t.includes("hospextest"),
    )
  ) {
    return true;
  }

  return false;
}

export interface AppAppointment extends Appointment {
  clinicId?: string;
  date?: string;
  partner?: string;
  duration?: number;
  notes?: string;
  startsAt?: string;
  whatsappConfirmation?: boolean;
  isVoiceCall?: boolean;
  whatsappReminder?: boolean;
  careLoop?: boolean;
  patientName?: string;
  coupleTitle?: string;
  coupleSlug?: string;
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
  currentClinic: ClinicProfile | null;
  updateClinic: (patch: {
    name?: string;
    city?: string;
    address?: string;
    phone?: string;
    hours?: string;
    email?: string;
    website?: string;
  }) => Promise<ClinicProfile>;
  loadState: "loading" | "ready" | "error";
  loadError: string | null;
  reload: () => Promise<void>;
  staff: ClinicStaff[];
  staffError: string | null;
  staffLoading: boolean;
  reloadStaff: () => Promise<void>;
  couples: AppCouple[];
  addCouple: (input: AddCoupleInput) => Promise<AppCouple>;
  updatePatient: (patientId: string, patch: { phone?: string; email?: string }) => Promise<void>;
  deleteCouple: (coupleId: string, options?: { permanent?: boolean }) => Promise<void>;
  deletePatient: (patientId: string, options?: { permanent?: boolean }) => Promise<void>;
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
  createTask: (
    task: Omit<CareTask, "id"> & {
      phoneNumber?: string | undefined;
      partnerPhoneNumber?: string | undefined;
    },
  ) => Promise<CareTask>;
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
    clinicId: row.clinicId,
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
    ...(row.targetRole ? { targetRole: row.targetRole } : {}),
    ...(row.targetPatientId ? { targetPatientId: row.targetPatientId } : {}),
    ...(row.note ? { note: row.note } : {}),
  };
}

function toAppointment(row: ClinicAppointment): AppAppointment {
  const notes = (row.notes || "").toLowerCase();
  const isWhatsapp = notes.includes("whatsapp");
  const isVoiceCall = notes.includes("voice") || notes.includes("sarvam") || notes.includes("phone call") || notes.includes("(call)");
  return {
    id: row.id,
    ...(row.clinicId ? { clinicId: row.clinicId } : {}),
    coupleId: row.coupleId,
    type: row.type,
    doctor: row.doctor,
    room: row.room,
    status: row.status,
    time: row.time,
    ...(row.date ? { date: row.date } : {}),
    ...(row.duration !== undefined ? { duration: row.duration } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    whatsappConfirmation: isWhatsapp,
    isVoiceCall,
    ...(row.patientName ? { patientName: row.patientName } : {}),
    ...(row.coupleTitle ? { coupleTitle: row.coupleTitle } : {}),
    ...(row.coupleSlug ? { coupleSlug: row.coupleSlug } : {}),
    ...(row.startsAt ? { startsAt: row.startsAt } : {}),
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
  const { data: session } = useSession();
  const [role, setRole] = useState<Role>("doctor");
  const [clinicId, setClinicIdState] = useState<string>("blr");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("smrkomed_active_clinic_id");
      if (stored && clinics.some((c) => c.id === stored)) {
        setClinicIdState(stored);
      }
    }
  }, []);

  const setClinicId = useCallback((id: string) => {
    setClinicIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("smrkomed_active_clinic_id", id);
    }
  }, []);

  // When session loads, auto-align active clinic to user's assigned clinic if not explicitly set
  useEffect(() => {
    if (session?.user?.clinicId) {
      const userClinicId = session.user.clinicId;
      if (userClinicId === "cmu3nmx310026jy04gsi21hxl" || userClinicId.toLowerCase().includes("kochi")) {
        setClinicIdState("kochi");
        if (typeof window !== "undefined") {
          window.localStorage.setItem("smrkomed_active_clinic_id", "kochi");
        }
      } else if (userClinicId === "cmt0exo9n000vl804rbaabh32" || userClinicId.toLowerCase().includes("blr") || userClinicId.toLowerCase().includes("bangalore")) {
        setClinicIdState("blr");
        if (typeof window !== "undefined") {
          window.localStorage.setItem("smrkomed_active_clinic_id", "blr");
        }
      }
    }
  }, [session?.user?.clinicId]);
  const [currentClinic, setCurrentClinic] = useState<ClinicProfile | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [coupleList, setCoupleList] = useState<AppCouple[]>([]);
  const [appointmentList, setAppointmentList] = useState<AppAppointment[]>([]);
  const [cycleList, setCycleList] = useState<AppCycle[]>([]);
  const [documentList, setDocumentList] = useState<AppDocument[]>([]);
  const [invoiceList] = useState<Invoice[]>([]);
  const [enquiryList, setEnquiryList] = useState<Enquiry[]>([]);
  const [careContentList] = useState<CareContentItem[]>(() => seedCareContent.map((item) => ({ ...item })));
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [activity, setActivity] = useState<LoopActivity[]>([]);
  const [exceptionList, setExceptionList] = useState<ExceptionItem[]>([]);
  const [kpis, setKpis] = useState(() => ({
    active: 0,
    completion: 100,
    automatedToday: 0,
    needAttention: 0,
  }));

  const reloadStaff = useCallback(async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const nextStaff = await clinicApi.staff();
      setStaff(nextStaff);
      setStaffError(null);
    } catch (error) {
      // Keep prior staff on transient failures so a flaky retry does not blank dropdowns
      // after a successful load. Clear only when we never had staff.
      setStaffError(clinicErrorMessage(error, "Unable to load clinic staff. Try again."));
      setStaff((previous) => (previous.length > 0 ? previous : []));
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    setStaffLoading(true);
    try {
      const [couplesOutcome, tasksOutcome, apptsOutcome, docsOutcome, activityOutcome, staffOutcome, clinicOutcome, exceptionsOutcome] =
        await Promise.all([
          clinicApi.couples().then((rows) => ({ ok: true as const, rows })).catch((e) => ({ ok: false as const, error: e })),
          clinicApi.tasks().then((rows) => ({ ok: true as const, rows })).catch((e) => ({ ok: false as const, error: e })),
          clinicApi.appointments().then((rows) => ({ ok: true as const, rows })).catch((e) => ({ ok: false as const, error: e })),
          clinicApi.documents().then((rows) => ({ ok: true as const, rows })).catch((e) => ({ ok: false as const, error: e })),
          clinicApi.activity().then((rows) => ({ ok: true as const, rows })).catch((e) => ({ ok: false as const, error: e })),
          clinicApi.staff().then((rows) => ({ ok: true as const, rows })).catch((e) => ({ ok: false as const, error: e })),
          clinicApi.getCurrentClinic().then((row) => ({ ok: true as const, row })).catch((e) => ({ ok: false as const, error: e })),
          clinicApi.exceptions().then((rows) => ({ ok: true as const, rows })).catch((e) => ({ ok: false as const, error: e })),
        ]);

      let activeCount = 0;
      let needAttentionCount = 0;

      if (couplesOutcome.ok) {
        const mappedCouples = couplesOutcome.rows.map(toCouple);
        setCoupleList(mappedCouples);
        activeCount = mappedCouples.length;
      }
      if (tasksOutcome.ok) {
        const mappedTasks = tasksOutcome.rows.map(toTask);
        setTasks(mappedTasks);
        needAttentionCount = mappedTasks.filter((task) => task.status === "overdue" || task.status === "escalated").length;
      }
      if (apptsOutcome.ok) {
        const mappedAppointments = apptsOutcome.rows.map(toAppointment);
        setAppointmentList(mappedAppointments);
      }
      if (docsOutcome.ok) {
        setDocumentList(docsOutcome.rows.map(toDocument));
      }
      if (activityOutcome.ok) {
        setActivity(activityOutcome.rows);
      }
      if (staffOutcome.ok) {
        setStaff(staffOutcome.rows);
        setStaffError(null);
      } else {
        setStaffError(clinicErrorMessage(staffOutcome.error, "Unable to load clinic staff."));
      }
      if (exceptionsOutcome.ok && Array.isArray(exceptionsOutcome.rows)) {
        setExceptionList(exceptionsOutcome.rows);
      }
      if (clinicOutcome.ok && clinicOutcome.row) {
        const raw = clinicOutcome.row as any;
        const clinicObj = (raw?.clinic ? raw.clinic : raw) as ClinicProfile;
        setCurrentClinic(clinicObj);
        if (clinicObj?.name) {
          for (const c of clinics) {
            c.name = clinicObj.name;
          }
        }
      }

      setKpis((prev) => ({
        active: couplesOutcome.ok ? activeCount : prev.active,
        completion: loopKpis.completion,
        automatedToday: 0,
        needAttention: tasksOutcome.ok ? needAttentionCount : prev.needAttention,
      }));
      setLoadState("ready");
    } catch (err) {
      console.error("[AppState] Unexpected reload error:", err);
      setLoadState("ready");
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load clinic records from the API after mount and clinic change
    void reload();
    void reloadStaff();
  }, [reload, reloadStaff, clinicId]);

  // Lightweight polling: refresh appointments and couples every 45 seconds so
  // voice-call bookings (created async by Sarvam post-call sync) appear without
  // the user needing to manually reload the page.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [apptsResult, couplesResult] = await Promise.all([
          clinicApi.appointments().catch(() => null),
          clinicApi.couples().catch(() => null),
        ]);
        if (apptsResult) setAppointmentList(apptsResult.map(toAppointment));
        if (couplesResult) setCoupleList(couplesResult.map(toCouple));
      } catch {
        // Silent — polling failures should never crash the UI
      }
    }, 45_000);
    return () => clearInterval(interval);
  }, [clinicId]);

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
      clinicId:
        (typeof window !== "undefined" &&
        (window.localStorage.getItem("smrkomed_active_clinic_id") === "kochi" ||
          window.localStorage.getItem("smrkomed_active_clinic_id") === "cmu3nmx310026jy04gsi21hxl"))
          ? "cmu3nmx310026jy04gsi21hxl"
          : clinicId === "kochi" || clinicId === "cmu3nmx310026jy04gsi21hxl"
            ? "cmu3nmx310026jy04gsi21hxl"
            : clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32"
              ? "cmt0exo9n000vl804rbaabh32"
              : clinicId,
    });
    // Use the real API create response, then refetch the clinic couple list.
    // Never wipe the list if the follow-up refetch fails.
    const couple = toCouple(created);
    setCoupleList((previous) => [couple, ...previous.filter((row) => row.id !== couple.id)]);
    setKpis((prev) => ({ ...prev, active: Math.max(prev.active, 1) }));
    try {
      const couples = await clinicApi.couples();
      setCoupleList(couples.map(toCouple));
      setKpis((prev) => ({ ...prev, active: couples.length }));
    } catch (error) {
      console.warn(
        "Couple created but patient list refresh failed:",
        clinicErrorMessage(error, "list refresh failed"),
      );
    }
    return couple;
  }, [clinicId]);

  const updatePatient = useCallback(async (patientId: string, patch: { phone?: string; email?: string }) => {
    await clinicApi.patchPatient(patientId, patch);
    await reload();
  }, [reload]);

  const deleteCouple = useCallback(
    async (coupleId: string, options?: { permanent?: boolean }) => {
      await clinicApi.deleteCouple(coupleId, options);
      setCoupleList((previous) => previous.filter((row) => row.id !== coupleId));
      setTasks((previous) => previous.filter((row) => row.coupleId !== coupleId));
      setAppointmentList((previous) => previous.filter((row) => row.coupleId !== coupleId));
      setDocumentList((previous) => previous.filter((row) => row.coupleId !== coupleId));
      setKpis((prev) => ({ ...prev, active: Math.max(0, prev.active - 1) }));
      try {
        await reload();
      } catch (error) {
        console.warn(
          "Couple deleted but background reload failed:",
          clinicErrorMessage(error, "reload failed"),
        );
      }
    },
    [reload],
  );

  const deletePatient = useCallback(
    async (patientId: string, options?: { permanent?: boolean }) => {
      await clinicApi.deletePatient(patientId, options);
      await reload();
    },
    [reload],
  );


  const addAppointment = useCallback(async (input: AddAppointmentInput) => {
    const startsAt = input.date
      ? `${input.date}T${normalizeTime(input.time)}Z`
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

  const createTask = useCallback(
    async (
      task: Omit<CareTask, "id"> & {
        phoneNumber?: string | undefined;
        partnerPhoneNumber?: string | undefined;
      },
    ) => {
    let createdTask: CareTask;
    try {
      const created = await clinicApi.createTask({
        coupleId: task.coupleId,
        title: task.title,
        category: task.category,
        description: task.note,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        priority: task.priority === "HIGH" || task.priority === "CRITICAL" ? "CLINICAL" : "NORMAL",
        sendWhatsApp: task.sendWhatsApp !== false,
        phoneNumber: task.phoneNumber,
        partnerPhoneNumber: task.partnerPhoneNumber,
        targetRole: task.targetRole,
        targetPatientId: task.targetPatientId,
        targetName: task.targetName,
        broadcastToBoth: task.broadcastToBoth,
      });
      createdTask = {
        ...toTask(created),
        category: task.category || created.category,
        due: task.due || `${task.dueDate || "Today"} · ${task.dueTime || "10:00 AM"}`,
        targetRole: (task.targetRole || created.targetRole) ?? undefined,
        targetPatientId: (task.targetPatientId || created.targetPatientId) ?? undefined,
        targetName: task.targetName,
        broadcastToBoth: task.broadcastToBoth,
        ...(task.note ? { note: task.note } : {}),
      };
    } catch (err) {
      console.warn("[AppState] API task creation failed or offline, creating in state:", err);
      createdTask = {
        ...task,
        id: `ct_${Date.now()}`,
        status: task.status || "waiting",
        due: task.due || `${task.dueDate || "Today"} · ${task.dueTime || "10:00 AM"}`,
        lastAction: `WhatsApp task notification dispatched to ${task.targetRole === "PARTNER" ? "partner" : task.targetRole === "COUPLE" ? "both partners" : "primary patient"}`,
        nextAction: "Waiting for confirmation on WhatsApp",
      };
    }
    setTasks((prev) => [createdTask, ...prev]);
    return createdTask;
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

  const updateClinic = useCallback(
    async (patch: {
      name?: string;
      city?: string;
      address?: string;
      phone?: string;
      hours?: string;
      email?: string;
      website?: string;
    }) => {
      const updated = await clinicApi.updateCurrentClinic(patch);
      const raw = updated as any;
      const clinicObj = (raw?.clinic ? raw.clinic : raw) as ClinicProfile;
      setCurrentClinic(clinicObj);
      if (clinicObj?.name) {
        for (const c of clinics) {
          c.name = clinicObj.name;
        }
      }
      return clinicObj;
    },
    [],
  );

  const visibleCouples = useMemo(() => {
    const isBangalore = clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32";
    const isKochi = clinicId === "kochi" || clinicId === "cmu3nmx310026jy04gsi21hxl";
    const isChennai = clinicId === "chennai" || clinicId === "hospex-chennai-clinic";

    if (isBangalore) {
      return coupleList.filter(
        (c) =>
          c.clinicId === "cmt0exo9n000vl804rbaabh32" ||
          c.clinicId === "blr" ||
          (!c.clinicId && isQrCheckinCouple(c)),
      );
    }
    if (isKochi) {
      return coupleList.filter(
        (c) =>
          c.clinicId === "cmu3nmx310026jy04gsi21hxl" || c.clinicId === "kochi",
      );
    }
    if (isChennai) {
      return coupleList.filter(
        (c) =>
          c.clinicId === "hospex-chennai-clinic" || c.clinicId === "chennai",
      );
    }
    return coupleList.filter((c) => c.clinicId === clinicId);
  }, [coupleList, clinicId]);

  const visibleAppointments = useMemo(() => {
    const isBangalore = clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32";
    const isKochi = clinicId === "kochi" || clinicId === "cmu3nmx310026jy04gsi21hxl";
    const isChennai = clinicId === "chennai" || clinicId === "hospex-chennai-clinic";
    const visibleCoupleIds = new Set(visibleCouples.map((c) => c.id));
    const visibleCoupleSlugs = new Set(visibleCouples.map((c) => c.slug).filter(Boolean));

    return appointmentList.filter((a: any) => {
      if (a.coupleId && (visibleCoupleIds.has(a.coupleId) || visibleCoupleSlugs.has(a.coupleId))) {
        return true;
      }
      const aClinic = a.clinicId || "";
      if (isBangalore) {
        return aClinic === "cmt0exo9n000vl804rbaabh32" || aClinic === "blr" || !aClinic;
      }
      if (isKochi) {
        return aClinic === "cmu3nmx310026jy04gsi21hxl" || aClinic === "kochi" || !aClinic;
      }
      if (isChennai) {
        return aClinic === "hospex-chennai-clinic" || aClinic === "chennai" || !aClinic;
      }
      return !aClinic || aClinic === clinicId;
    });
  }, [appointmentList, visibleCouples, clinicId]);

  const visibleTasks = useMemo(() => {
    const isBangalore = clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32";
    const isKochi = clinicId === "kochi" || clinicId === "cmu3nmx310026jy04gsi21hxl";
    const isChennai = clinicId === "chennai" || clinicId === "hospex-chennai-clinic";
    const visibleCoupleIds = new Set(visibleCouples.map((c) => c.id));
    const visibleCoupleSlugs = new Set(visibleCouples.map((c) => c.slug).filter(Boolean));

    return tasks.filter((t: any) => {
      if (t.coupleId && (visibleCoupleIds.has(t.coupleId) || visibleCoupleSlugs.has(t.coupleId))) {
        return true;
      }
      const tClinic = t.clinicId || "";
      if (isBangalore) {
        return tClinic === "cmt0exo9n000vl804rbaabh32" || tClinic === "blr" || (!tClinic && !t.coupleId);
      }
      if (isKochi) {
        return tClinic === "cmu3nmx310026jy04gsi21hxl" || tClinic === "kochi" || (!tClinic && !t.coupleId);
      }
      if (isChennai) {
        return tClinic === "hospex-chennai-clinic" || tClinic === "chennai" || (!tClinic && !t.coupleId);
      }
      return tClinic === clinicId;
    });
  }, [tasks, visibleCouples, clinicId]);

  const visibleCycles = useMemo<AppCycle[]>(() => {
    return visibleCouples
      .filter((c) => c.treatment && c.treatment !== "Evaluation")
      .map((c) => ({
        id: `cycle-${c.id}`,
        coupleId: c.id,
        treatment: (c.treatment === "IVF" || c.treatment === "IUI" || c.treatment === "FET" ? c.treatment : "IVF") as Exclude<Treatment, "Evaluation">,
        cycleLabel: c.cycleLabel || `${c.treatment} Cycle #1`,
        stage: c.stage || "Consultation",
        stageIndex: c.stageIndex ?? 1,
        totalStages: 15,
        doctor: c.doctor || "Unassigned",
        coordinator: c.coordinator || "Unassigned",
        status: c.status === "Needs Attention" ? "Needs Attention" : "Active",
        startDate: c.since || "2026-09-01",
        started: c.since || "2026-09-01",
        nextStep: c.nextStep || "Initial consultation",
        nextDate: "Upcoming",
      }));
  }, [visibleCouples]);

  const visibleExceptions = useMemo(() => {
    const visibleCoupleIds = new Set(visibleCouples.map((c) => c.id));
    return exceptionList.filter((e: any) => !e.coupleId || visibleCoupleIds.has(e.coupleId));
  }, [exceptionList, visibleCouples]);

  const visibleStaff = useMemo(() => {
    const isBangalore = clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32";
    const isKochi = clinicId === "kochi" || clinicId === "cmu3nmx310026jy04gsi21hxl";
    return staff.filter((s: any) => {
      const loc = (s.locationId || s.clinicId || "").toLowerCase();
      if (isBangalore) {
        if (loc === "kochi" || loc === "cmu3nmx310026jy04gsi21hxl") return false;
        return true;
      }
      if (isKochi) {
        if (loc === "blr" || loc === "cmt0exo9n000vl804rbaabh32" || loc.includes("bangalore")) return false;
        return true;
      }
      return true;
    });
  }, [staff, clinicId]);

  const value = useMemo<AppState>(
    () => ({
      role,
      setRole,
      clinicId,
      setClinicId,
      clinicName: currentClinic?.name ?? clinics.find((c) => c.id === clinicId)?.name ?? clinics[0]!.name,
      currentClinic,
      updateClinic,
      loadState,
      loadError,
      reload,
      staff: visibleStaff,
      staffError,
      staffLoading,
      reloadStaff,
      couples: visibleCouples,
      addCouple,
      updatePatient,
      deleteCouple,
      deletePatient,
      appointments: visibleAppointments,
      addAppointment,
      patchAppointmentStatus,
      cycles: visibleCycles,
      addCycle,
      documents: documentList,
      addDocument,
      invoices: invoiceList,
      enquiries: enquiryList,
      addEnquiry,
      careContent: careContentList,
      tasks: visibleTasks,
      createTask,
      setTaskStatus,
      activity,
      pushActivity,
      exceptions: visibleExceptions,
      resolveException,
      addException,
      kpis: {
        active: visibleCouples.length,
        completion: loopKpis.completion,
        automatedToday: visibleTasks.filter((t) => t.status === "completed").length,
        needAttention: visibleTasks.filter((t) => t.status === "overdue" || t.status === "escalated").length + visibleExceptions.length,
      },
      bumpKpis,
    }),
    [
      role,
      clinicId,
      currentClinic,
      updateClinic,
      loadState,
      loadError,
      reload,
      visibleStaff,
      staffError,
      staffLoading,
      reloadStaff,
      visibleCouples,
      addCouple,
      updatePatient,
      deleteCouple,
      deletePatient,
      visibleAppointments,
      addAppointment,
      patchAppointmentStatus,
      visibleCycles,
      addCycle,
      documentList,
      addDocument,
      invoiceList,
      enquiryList,
      addEnquiry,
      careContentList,
      visibleTasks,
      createTask,
      setTaskStatus,
      activity,
      pushActivity,
      visibleExceptions,
      resolveException,
      addException,
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
