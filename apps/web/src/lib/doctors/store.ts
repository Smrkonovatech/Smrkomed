"use client";

import { clinicApi } from "@/lib/clinic-api";
import { clinics } from "@/lib/demo-data";

import {
  defaultAppointmentSettings,
  defaultClinicSchedule,
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

export function isMockDoctor(d: DoctorProfile | null | undefined): boolean {
  if (!d) return true;
  const id = d.id || "";
  const name = (d.displayName || `${d.firstName || ""} ${d.lastName || ""}`).toLowerCase();
  const email = (d.email || "").toLowerCase();
  return (
    id === "doc_ananya" ||
    id === "doc_ravi" ||
    id === "doc_priya" ||
    email === "ananya@abcfertility.demo" ||
    email === "ravi@abcfertility.demo" ||
    email === "priya@abcfertility.demo" ||
    name.includes("ananya rao") ||
    name.includes("ravi menon") ||
    name.includes("priya nair")
  );
}

function readStorage(): DoctorProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DoctorProfile[];
    if (!Array.isArray(parsed)) return [];
    // Strict filter: completely purge any mock seed doctors
    const realOnly = parsed.filter((d) => !isMockDoctor(d));
    if (realOnly.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(realOnly));
    }
    return realOnly;
  } catch {
    return [];
  }
}

function writeStorage(doctors: DoctorProfile[]) {
  cache = doctors.filter((d) => !isMockDoctor(d));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
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

const EMPTY_DOCTORS: DoctorProfile[] = [];

export const doctorsStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): DoctorProfile[] {
    return getAll();
  },
  getServerSnapshot(): DoctorProfile[] {
    return EMPTY_DOCTORS;
  },
  async syncFromApi(clinicId?: string): Promise<DoctorProfile[]> {
    try {
      const resolvedClinic =
        clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32"
          ? "cmt0exo9n000vl804rbaabh32"
          : clinicId === "kochi" || clinicId === "cmu3nmx310026jy04gsi21hxl"
            ? "cmu3nmx310026jy04gsi21hxl"
            : clinicId;
      const apiDoctors = await clinicApi.getDoctors(resolvedClinic);
      if (Array.isArray(apiDoctors)) {
        const cleanList = apiDoctors.filter((d) => !isMockDoctor(d));
        writeStorage(cleanList);
        return cleanList;
      }
    } catch {
      try {
        const resolvedClinic =
          clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32"
            ? "cmt0exo9n000vl804rbaabh32"
            : clinicId === "kochi" || clinicId === "cmu3nmx310026jy04gsi21hxl"
              ? "cmu3nmx310026jy04gsi21hxl"
              : clinicId;
        const staff = await clinicApi.getStaff(resolvedClinic);
        if (Array.isArray(staff)) {
          for (const s of staff) {
            if (s.role === "DOCTOR" || s.roleName?.toLowerCase().includes("doctor")) {
              this.ensureFromStaff(s, clinicId);
            }
          }
        }
      } catch {}
    }
    return getAll();
  },
  list(): DoctorProfile[] {
    return getAll();
  },
  get(id: string): DoctorProfile | undefined {
    return getAll().find((d) => d.id === id || d.staffUserId === id || d.id === `doc_${id}`);
  },
  upsert(doctor: DoctorProfile, activityMessage?: { kind: DoctorActivity["kind"]; message: string }) {
    if (isMockDoctor(doctor)) return doctor;
    const list = getAll();
    const idx = list.findIndex((d) => d.id === doctor.id || (doctor.staffUserId && d.staffUserId === doctor.staffUserId));
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
    if (typeof window !== "undefined") {
      const cleanId = (doctor.staffUserId || doctor.id || "").replace(/^doc_/, "");
      if (cleanId) {
        clinicApi.updateDoctor(cleanId, next).catch(() => {});
      }
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
  async deleteDoctor(id: string): Promise<boolean> {
    const cleanId = (id || "").replace(/^doc_/, "");
    // 1. Remove from local store cache immediately
    const list = getAll();
    const filtered = list.filter(
      (d) => d.id !== id && d.id !== `doc_${cleanId}` && d.staffUserId !== cleanId && d.staffUserId !== id
    );
    writeStorage(filtered);

    // 2. Call API to delete doctor and all related assignments from backend DB
    if (typeof window !== "undefined") {
      try {
        await clinicApi.deleteDoctor(cleanId || id);
      } catch (err) {
        console.warn("API doctor deletion warning/error:", err);
      }
    }
    return true;
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
  ensureFromStaff(
    member: {
      id: string;
      name: string;
      email: string;
      phone?: string | null | undefined;
      title?: string | null | undefined;
      role?: string | undefined;
      department?: string | undefined;
      registrationNumber?: string | undefined;
      qualifications?: string | undefined;
      yearsExperience?: number | string | undefined;
      clinicId?: string | undefined;
      locationId?: string | undefined;
    },
    targetClinicId?: string,
  ): DoctorProfile {
    const list = getAll();
    const existing = list.find(
      (d) =>
        d.id === member.id ||
        d.staffUserId === member.id ||
        (d.email && d.email.toLowerCase() === member.email.toLowerCase()) ||
        d.id === `doc_${member.id}`,
    );

    const isKochi =
      targetClinicId === "kochi" ||
      targetClinicId === "cmu3nmx310026jy04gsi21hxl" ||
      member.clinicId === "cmu3nmx310026jy04gsi21hxl" ||
      member.locationId === "kochi";

    const clinic = isKochi
      ? clinics.find((c) => c.id === "kochi") || clinics[1]!
      : clinics.find((c) => c.id === "blr") || clinics[0]!;

    if (existing) {
      const correctLocId = clinic.id;
      if (existing.locationId !== correctLocId) {
        existing.locationId = correctLocId;
        existing.locationName = clinic.city;
        this.upsert(existing);
      }
      return existing;
    }
    const now = new Date().toISOString();
    const rawName = member.name.trim();
    const displayName = rawName.startsWith("Dr.") ? rawName : `Dr. ${rawName}`;
    const nameParts = rawName.replace(/^Dr\.\s*/i, "").split(" ");
    const firstName = nameParts[0] || "Doctor";
    const lastName = nameParts.slice(1).join(" ") || "";
    const regNum =
      member.registrationNumber ||
      `KMC-${(Math.abs(member.id.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % 89999 + 10000)}`;

    const newProfile: DoctorProfile = {
      id: `doc_${member.id}`,
      staffUserId: member.id,
      status: "active",
      isDraft: false,
      firstName,
      lastName,
      displayName,
      gender: "Female",
      dateOfBirth: "1988-06-15",
      phone: member.phone || "+91 98450 00000",
      email: member.email,
      alternatePhone: "",
      employeeId: `DOC-${member.id.slice(-4).toUpperCase()}`,
      registrationNumber: regNum,
      registrationAuthority: "State Medical Council",
      country: "India",
      state: "Karnataka",
      city: clinic.city || "Bangalore",
      designation: member.title || "Senior Fertility Consultant",
      department: member.department || "Reproductive Medicine",
      primarySpecialty: member.title || "Reproductive Medicine",
      subSpecialties: ["IVF", "IUI", "FET", "Fertility Evaluation"],
      yearsExperience: Number(member.yearsExperience) || 10,
      yearsInSpecialty: Math.max(1, (Number(member.yearsExperience) || 10) - 3),
      consultationTypes: ["In-clinic", "Online"],
      languages: ["English", "Hindi"],
      professionalBio: `${displayName} is a certified specialist in Reproductive Medicine, committed to clinical excellence, evidence-based IVF protocols, and compassionate patient care.`,
      shortIntro: `${member.title || "Fertility Specialist"} dedicated to patient-centered reproductive healthcare.`,
      clinicalInterests: "Advanced IVF protocols, follicular monitoring, fertility evaluation",
      expertise: ["IVF", "IUI", "FET", "Fertility Evaluation", "Reproductive Medicine"],
      services: ["Initial Consultation", "Follow-up Consultation", "Follicular Monitoring", "Cycle Review"],
      procedures: ["IUI", "Oocyte Retrieval", "Embryo Transfer"],
      qualifications: member.qualifications
        ? [
            {
              id: newId("q"),
              degree: member.qualifications,
              specialization: member.title || "Reproductive Medicine",
              institution: "Medical Council Accredited College",
              university: "Health Sciences University",
              location: "Bangalore",
              startYear: "2010",
              endYear: "2016",
              description: "Medical qualifications & training",
            },
          ]
        : [
            {
              id: newId("q1"),
              degree: "MBBS",
              specialization: "Medicine",
              institution: "Bangalore Medical College",
              university: "RGUHS",
              location: "Bangalore",
              startYear: "2006",
              endYear: "2011",
              description: "Undergraduate medical training",
            },
            {
              id: newId("q2"),
              degree: "MS",
              specialization: "Obstetrics & Gynaecology",
              institution: "St. John's Medical College",
              university: "RGUHS",
              location: "Bangalore",
              startYear: "2012",
              endYear: "2015",
              description: "Postgraduate clinical degree",
            },
          ],
      experience: [
        {
          id: newId("e1"),
          organization: clinic.name || "Hospex",
          position: member.title || "Consultant Fertility Specialist",
          department: member.department || "Reproductive Medicine",
          startDate: "2021-01",
          endDate: "",
          currentlyWorking: true,
          description: "Consultations, cycle planning, and clinical oversight.",
          responsibilities: "Patient consultations, follicular monitoring scans, clinical decisions",
        },
      ],
      weeklySchedule: defaultClinicSchedule(),
      appointmentSettings: defaultAppointmentSettings(),
      leaves: [],
      blockedTimes: [],
      documents: [],
      activity: [
        {
          id: newId("act"),
          kind: "created",
          message: "Doctor profile initialized and active",
          at: now,
        },
      ],
      locationId: clinic.id,
      locationName: clinic.city,
      createdAt: now,
      updatedAt: now,
    };

    return this.upsert(newProfile);
  },
  resetToSeed() {
    writeStorage(structuredClone(SEED_DOCTORS));
  },
};
