/**
 * SmrkoMed Appointment Booking Flow — Types & State Definitions
 * V1 blueprint for AI-powered appointment booking through WhatsApp and AI Call.
 */

export type BookingChannel = "WHATSAPP" | "CALL";

export type BookingState =
  | "IDENTIFY_PATIENT"
  | "REGISTER_PATIENT"
  | "SELECT_BRANCH"
  | "SELECT_APPOINTMENT_TYPE"
  | "SELECT_DOCTOR"
  | "VIEW_DOCTOR"
  | "SELECT_DATE"
  | "SELECT_SLOT"
  | "REVALIDATE_SLOT"
  | "CONFIRMATION"
  | "BOOKING"
  | "COMPLETED"
  | "HANDOFF"
  | "PAUSED";

export type BookingSessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "HANDED_OFF" | "EXPIRED";

export interface BookingSlot {
  time: string; // "10:00"
  timeLabel: string; // "10:00 AM"
  start: string; // "10:00"
  end: string; // "10:30"
  status: "available" | "booked" | "blocked" | "leave";
}

export interface BookingDoctorSummary {
  id: string;
  name: string;
  displayName: string;
  specialty: string;
  experienceYears: number;
  consultationFee?: number;
  languages: string[];
  bio: string;
  availableDates: string[]; // ["2026-09-09", "2026-09-10"]
}

export interface BookingRegistrationDraft {
  patientName?: string;
  patientMobile?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  partnerName?: string;
  partnerMobile?: string;
  email?: string;
  address?: string;
  consentCaptured?: boolean;
}

export interface BookingSession {
  id: string;
  channel: BookingChannel;
  clinicId: string;
  organizationId: string;
  contactPhone: string;
  
  // Patient / Couple identifiers
  patientId?: string | null;
  coupleId?: string | null;
  isExistingPatient: boolean;
  
  // Registration draft (for new patients)
  registrationDraft: BookingRegistrationDraft;

  // Selected Booking Details
  branchId?: string | null;
  branchName?: string | null;
  appointmentType: string; // e.g. "Consultation", "IVF Review", "Follicular Monitoring"
  doctorId?: string | null;
  doctorName?: string | null;
  selectedDate?: string | null; // ISO YYYY-MM-DD
  selectedSlot?: string | null; // HH:mm
  
  // Navigation & State tracking
  currentStep: BookingState;
  stepHistory: BookingState[];
  status: BookingSessionStatus;
  
  // Confirmation & Idempotency
  idempotencyKey?: string | null;
  appointmentId?: string | null;
  
  // Handoff & Failure context
  handoffReason?: string | null;
  lastErrorMessage?: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface StateTransitionResult {
  session: BookingSession;
  responseMessage: string;
  options?: string[];
  requiresInput: boolean;
  actionTaken?: "ADVANCE" | "BACK" | "RESET" | "HANDOFF" | "CONFIRM_BOOKING";
  error?: string;
}

export interface BookingMachineContext {
  clinicId: string;
  organizationId: string;
  clinicName?: string;
}
