import type { AppointmentSettings, WeeklySchedule } from "./types";
import { WEEKDAYS } from "./types";

export const DEPARTMENTS = [
  "Reproductive Medicine",
  "Gynaecology",
  "Obstetrics",
  "Cardiology",
  "Dermatology",
  "General Medicine",
  "Paediatrics",
  "Orthopaedics",
  "Endocrinology",
  "Urology",
  "Radiology",
  "Anaesthesiology",
] as const;

export const SPECIALTIES = [
  "Reproductive Medicine",
  "Fertility",
  "Gynaecology",
  "Obstetrics",
  "Cardiology",
  "Dermatology",
  "General Medicine",
  "Paediatrics",
  "Orthopaedics",
  "Endocrinology",
  "Andrology",
  "Embryology",
] as const;

export const SUB_SPECIALTY_OPTIONS = [
  "IVF",
  "IUI",
  "FET",
  "Fertility Evaluation",
  "Male Infertility",
  "Pregnancy Care",
  "High-Risk Obstetrics",
  "Minimally Invasive Surgery",
  "Reproductive Endocrinology",
  "Egg Freezing",
  "Donor Programmes",
] as const;

export const EXPERTISE_OPTIONS = [
  "IVF",
  "IUI",
  "FET",
  "Fertility Evaluation",
  "Reproductive Medicine",
  "Pregnancy Care",
  "Male Infertility",
  "Ovulation Induction",
  "Laparoscopy",
  "Hysteroscopy",
  "Embryo Transfer",
  "ICSI",
] as const;

export const SERVICE_OPTIONS = [
  "Initial Consultation",
  "Follow-up Consultation",
  "Follicular Monitoring",
  "Ultrasound Scan",
  "Counselling",
  "Cycle Review",
  "Procedure Planning",
  "Second Opinion",
  "Teleconsultation",
] as const;

export const PROCEDURE_OPTIONS = [
  "IUI",
  "Oocyte Retrieval",
  "Embryo Transfer",
  "FET",
  "ICSI",
  "Diagnostic Laparoscopy",
  "Hysteroscopy",
  "Endometrial Biopsy",
] as const;

export const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Bengali",
] as const;

export const CONSULTATION_TYPES = ["In-clinic", "Online", "Hybrid"] as const;

export const GENDER_OPTIONS = ["Female", "Male", "Other", "Prefer not to say"] as const;

export const DEGREE_OPTIONS = [
  "MBBS",
  "MD",
  "MS",
  "DNB",
  "DM",
  "MCh",
  "MRCOG",
  "FRCOG",
  "Fellowship",
  "Diploma",
] as const;

export function emptyWeeklySchedule(): WeeklySchedule {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day] = { enabled: false, slots: [] };
    return acc;
  }, {} as WeeklySchedule);
}

export function defaultClinicSchedule(): WeeklySchedule {
  const schedule = emptyWeeklySchedule();
  const weekdaySlots = [
    { id: "s1", start: "09:00", end: "13:00" },
    { id: "s2", start: "14:00", end: "17:00" },
  ];
  for (const day of ["monday", "tuesday", "thursday", "friday"] as const) {
    schedule[day] = {
      enabled: true,
      slots: weekdaySlots.map((s, i) => ({ ...s, id: `${day}-${i}` })),
    };
  }
  schedule.wednesday = {
    enabled: true,
    slots: [{ id: "wed-0", start: "09:00", end: "13:00" }],
  };
  schedule.saturday = {
    enabled: true,
    slots: [{ id: "sat-0", start: "10:00", end: "14:00" }],
  };
  return schedule;
}

export function defaultAppointmentSettings(): AppointmentSettings {
  return {
    consultationMinutes: 30,
    followUpMinutes: 15,
    bufferMinutes: 5,
    maxPerSlot: 1,
    onlineConsultation: true,
    inClinicConsultation: true,
  };
}

export function newId(prefix = "doc"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
