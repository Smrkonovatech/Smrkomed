export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  sourceLabel: string;
  campaign: string | null;
  campaignId: string | null;
  treatmentInterest: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  status: string;
  statusLabel: string;
  stage: string;
  stageLabel: string;
  score: number;
  scoreBand: string;
  nextFollowUpAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  preferredLanguage: string | null;
  location: string | null;
  lostReason: string | null;
  convertedAt: string | null;
  patientId: string | null;
  coupleId: string | null;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const STAGE_ORDER = [
  "NEW_LEAD",
  "CONTACTED",
  "QUALIFIED",
  "CONSULTATION_BOOKED",
  "CONSULTATION_COMPLETED",
  "INVESTIGATION",
  "TREATMENT_DISCUSSION",
  "TREATMENT_STARTED",
  "ACTIVE_PATIENT",
  "LOST",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  CONSULTATION_BOOKED: "Consultation Booked",
  CONSULTATION_COMPLETED: "Consultation Completed",
  INVESTIGATION: "Investigation",
  TREATMENT_DISCUSSION: "Treatment Discussion",
  TREATMENT_STARTED: "Treatment Started",
  ACTIVE_PATIENT: "Active Patient",
  LOST: "Lost",
};

export const SOURCE_OPTIONS = [
  "WEBSITE",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "PHONE",
  "WALK_IN",
  "REFERRAL",
  "META_ADS",
  "GOOGLE_ADS",
  "ORGANIC",
  "OTHER",
] as const;

export const TREATMENT_OPTIONS = [
  "IVF",
  "IUI",
  "Fertility Evaluation",
  "Egg Freezing",
  "Male Fertility",
  "Other",
] as const;

export const LOST_REASONS = [
  "Not interested",
  "No response",
  "Price",
  "Chose another clinic",
  "Location",
  "Not eligible",
  "Timing",
  "Other",
] as const;
