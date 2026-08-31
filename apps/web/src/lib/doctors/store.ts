"use client";

import { clinics } from "@/lib/demo-data";

import {
  defaultAppointmentSettings,
  emptyWeeklySchedule,
  newId,
} from "./catalog";
import { SEED_DOCTORS } from "./seed";
import type {
  BlockedTime,
  DoctorActivity,
  DoctorDocument,
  DoctorExperience,
  DoctorLeave,
  DoctorProfile,
  DoctorQualification,
  DoctorStatus,
  WeeklySchedule,
} from "./types";

const STORAGE_KEY = "smrkomed.doctors.v1";

type Listener = () => void;

let cache: DoctorProfile[] | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function readStorage(): DoctorProfile[] {
  if (typeof window === "undefined") return structuredClone(SEED_DOCTORS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = structuredClone(SEED_DOCTORS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as DoctorProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seed = structuredClone(SEED_DOCTORS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return structuredClone(SEED_DOCTORS);
  }
}

function writeStorage(doctors: DoctorProfile[]) {
  cache = doctors;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
  }
  emit();
}

function getAll(): DoctorProfile[] {
  if (!cache) cache = readStorage();
  return cache;
}

function pushActivity(
  doctor: DoctorProfile,
  kind: DoctorActivity["kind"],
  message: string,
): DoctorProfile {
  const entry: DoctorActivity = {
    id: newId("act"),
    kind,
    message,
    at: new Date().toISOString(),
  };
  return {
    ...doctor,
    activity: [entry, ...doctor.activity].slice(0, 100),
    updatedAt: entry.at,
  };
}

export function emptyDoctorDraft(partial?: Partial<DoctorProfile>): DoctorProfile {
  const clinic = clinics[0]!;
  const now = new Date().toISOString();
  return {
    id: newId("doc"),
    status: "inactive",
    isDraft: true,
    firstName: "",
    lastName: "",
    displayName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    alternatePhone: "",
    employeeId: "",
    registrationNumber: "",
    registrationAuthority: "",
    country: "India",
    state: "",
    city: "",
    designation: "",
    department: "",
    primarySpecialty: "",
    subSpecialties: [],
    yearsExperience: 0,
    yearsInSpecialty: 0,
    consultationTypes: ["In-clinic"],
    languages: ["English"],
    professionalBio: "",
    shortIntro: "",
    clinicalInterests: "",
    expertise: [],
    services: [],
    procedures: [],
    qualifications: [],
    experience: [],
    weeklySchedule: emptyWeeklySchedule(),
    appointmentSettings: defaultAppointmentSettings(),
    leaves: [],
    blockedTimes: [],
    documents: [],
    activity: [],
    locationId: clinic.id,
    locationName: clinic.city,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export const doctorsStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): DoctorProfile[] {
    return getAll();
  },
  getServerSnapshot(): DoctorProfile[] {
    return SEED_DOCTORS;
  },
  list(): DoctorProfile[] {
    return getAll();
  },
  get(id: string): DoctorProfile | undefined {
    return getAll().find((d) => d.id === id);
  },
  upsert(doctor: DoctorProfile, activityMessage?: { kind: DoctorActivity["kind"]; message: string }) {
    const list = getAll();
    const idx = list.findIndex((d) => d.id === doctor.id);
    let next = doctor;
    if (activityMessage) {
      next = pushActivity(doctor, activityMessage.kind, activityMessage.message);
    } else {
      next = { ...doctor, updatedAt: new Date().toISOString() };
    }
    if (idx >= 0) {
      const copy = [...list];
      copy[idx] = next;
      writeStorage(copy);
    } else {
      writeStorage([next, ...list]);
    }
    return next;
  },
  saveDraft(doctor: DoctorProfile) {
    const withFlag = { ...doctor, isDraft: true, status: doctor.status === "active" ? doctor.status : ("inactive" as DoctorStatus) };
    return this.upsert(withFlag, { kind: "draft_saved", message: "Draft saved" });
  },
  activate(id: string) {
    const doctor = this.get(id);
    if (!doctor) return null;
    return this.upsert(
      { ...doctor, isDraft: false, status: "active" },
      { kind: "activated", message: "Doctor activated for appointments" },
    );
  },
  setStatus(id: string, status: DoctorStatus) {
    const doctor = this.get(id);
    if (!doctor) return null;
    const kind = status === "inactive" ? "deactivated" : status === "active" ? "activated" : "updated";
    const message =
      status === "inactive"
        ? "Doctor deactivated — no longer available for new appointments"
        : status === "active"
          ? "Doctor activated for appointments"
          : "Doctor marked as on leave";
    return this.upsert({ ...doctor, status, isDraft: false }, { kind, message });
  },
  updateSchedule(id: string, weeklySchedule: WeeklySchedule) {
    const doctor = this.get(id);
    if (!doctor) return null;
    return this.upsert(
      { ...doctor, weeklySchedule },
      { kind: "availability_updated", message: "Weekly availability updated" },
    );
  },
  addLeave(id: string, leave: Omit<DoctorLeave, "id" | "createdAt">) {
    const doctor = this.get(id);
    if (!doctor) return null;
    const entry: DoctorLeave = {
      ...leave,
      id: newId("leave"),
      createdAt: new Date().toISOString(),
    };
    return this.upsert(
      { ...doctor, leaves: [entry, ...doctor.leaves] },
      { kind: "leave_added", message: `Leave added for ${leave.date}` },
    );
  },
  removeLeave(id: string, leaveId: string) {
    const doctor = this.get(id);
    if (!doctor) return null;
    return this.upsert(
      { ...doctor, leaves: doctor.leaves.filter((l) => l.id !== leaveId) },
      { kind: "leave_removed", message: "Leave removed" },
    );
  },
  addBlock(id: string, block: Omit<BlockedTime, "id" | "createdAt">) {
    const doctor = this.get(id);
    if (!doctor) return null;
    const entry: BlockedTime = {
      ...block,
      id: newId("block"),
      createdAt: new Date().toISOString(),
    };
    return this.upsert(
      { ...doctor, blockedTimes: [entry, ...doctor.blockedTimes] },
      { kind: "block_added", message: `Time blocked on ${block.date}` },
    );
  },
  removeBlock(id: string, blockId: string) {
    const doctor = this.get(id);
    if (!doctor) return null;
    return this.upsert(
      { ...doctor, blockedTimes: doctor.blockedTimes.filter((b) => b.id !== blockId) },
      { kind: "block_removed", message: "Blocked time removed" },
    );
  },
  setQualifications(id: string, qualifications: DoctorQualification[], message = "Qualifications updated") {
    const doctor = this.get(id);
    if (!doctor) return null;
    return this.upsert(
      { ...doctor, qualifications },
      { kind: "qualification_updated", message },
    );
  },
  setExperience(id: string, experience: DoctorExperience[], message = "Experience updated") {
    const doctor = this.get(id);
    if (!doctor) return null;
    return this.upsert(
      { ...doctor, experience },
      { kind: "experience_updated", message },
    );
  },
  addDocument(id: string, doc: Omit<DoctorDocument, "id" | "uploadedAt">) {
    const doctor = this.get(id);
    if (!doctor) return null;
    const entry: DoctorDocument = {
      ...doc,
      id: newId("ddoc"),
      uploadedAt: new Date().toISOString(),
    };
    return this.upsert(
      { ...doctor, documents: [entry, ...doctor.documents] },
      { kind: "document_added", message: `Document added: ${doc.name}` },
    );
  },
  removeDocument(id: string, docId: string) {
    const doctor = this.get(id);
    if (!doctor) return null;
    return this.upsert(
      { ...doctor, documents: doctor.documents.filter((d) => d.id !== docId) },
      { kind: "document_removed", message: "Document removed" },
    );
  },
  resetToSeed() {
    writeStorage(structuredClone(SEED_DOCTORS));
  },
};
