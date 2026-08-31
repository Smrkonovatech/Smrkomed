/** Doctor Management domain types — ready to map to a future DoctorProfile API. */

export type DoctorStatus = "active" | "inactive" | "on_leave";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type LeaveType =
  | "full_day"
  | "partial_day"
  | "holiday"
  | "conference"
  | "personal"
  | "emergency"
  | "custom";

export type DoctorDocumentKind =
  | "medical_registration"
  | "degree"
  | "experience"
  | "certification"
  | "other";

export type DoctorActivityKind =
  | "created"
  | "updated"
  | "activated"
  | "deactivated"
  | "availability_updated"
  | "qualification_added"
  | "qualification_updated"
  | "qualification_removed"
  | "experience_added"
  | "experience_updated"
  | "experience_removed"
  | "leave_added"
  | "leave_removed"
  | "block_added"
  | "block_removed"
  | "document_added"
  | "document_removed"
  | "draft_saved";

export type TimeSlot = {
  id: string;
  start: string; // HH:mm
  end: string; // HH:mm
};

export type DaySchedule = {
  enabled: boolean;
  slots: TimeSlot[];
};

export type WeeklySchedule = Record<Weekday, DaySchedule>;

export type AppointmentSettings = {
  consultationMinutes: number;
  followUpMinutes: number;
  bufferMinutes: number;
  maxPerSlot: number;
  onlineConsultation: boolean;
  inClinicConsultation: boolean;
};

export type DoctorQualification = {
  id: string;
  degree: string;
  specialization: string;
  institution: string;
  university: string;
  location: string;
  startYear: string;
  endYear: string;
  documentName?: string;
  documentDataUrl?: string;
  description: string;
};

export type DoctorExperience = {
  id: string;
  organization: string;
  position: string;
  department: string;
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM or ""
  currentlyWorking: boolean;
  description: string;
  responsibilities: string;
};

export type DoctorLeave = {
  id: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  fullDay: boolean;
  startTime?: string;
  endTime?: string;
  type: LeaveType;
  reason: string;
  notes: string;
  createdAt: string;
};

export type BlockedTime = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: string;
};

export type DoctorDocument = {
  id: string;
  kind: DoctorDocumentKind;
  name: string;
  uploadedAt: string;
  dataUrl?: string;
  mimeType?: string;
};

export type DoctorActivity = {
  id: string;
  kind: DoctorActivityKind;
  message: string;
  at: string;
};

export type DoctorProfile = {
  id: string;
  /** Links to StaffUser / User when known */
  staffUserId?: string;
  status: DoctorStatus;
  isDraft: boolean;

  // Basic
  photoDataUrl?: string | undefined;
  firstName: string;
  lastName: string;
  displayName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  alternatePhone: string;
  employeeId: string;
  registrationNumber: string;
  registrationAuthority: string;
  country: string;
  state: string;
  city: string;

  // Professional
  designation: string;
  department: string;
  primarySpecialty: string;
  subSpecialties: string[];
  yearsExperience: number;
  yearsInSpecialty: number;
  consultationTypes: string[];
  languages: string[];
  professionalBio: string;
  shortIntro: string;
  clinicalInterests: string;

  // Expertise
  expertise: string[];
  services: string[];
  procedures: string[];

  qualifications: DoctorQualification[];
  experience: DoctorExperience[];
  weeklySchedule: WeeklySchedule;
  appointmentSettings: AppointmentSettings;
  leaves: DoctorLeave[];
  blockedTimes: BlockedTime[];
  documents: DoctorDocument[];
  activity: DoctorActivity[];

  locationId: string;
  locationName: string;

  createdAt: string;
  updatedAt: string;
};

export type DoctorDraft = Omit<DoctorProfile, "id" | "createdAt" | "updatedAt" | "activity"> & {
  id?: string;
};

export const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  full_day: "Full-day leave",
  partial_day: "Partial-day leave",
  holiday: "Holiday",
  conference: "Conference",
  personal: "Personal leave",
  emergency: "Emergency leave",
  custom: "Custom unavailable",
};

export const DOCUMENT_KIND_LABELS: Record<DoctorDocumentKind, string> = {
  medical_registration: "Medical registration",
  degree: "Degree certificate",
  experience: "Experience certificate",
  certification: "Professional certification",
  other: "Other document",
};
