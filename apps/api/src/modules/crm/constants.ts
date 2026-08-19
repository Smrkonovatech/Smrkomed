import type { LeadSource, LeadStage, LeadStatus } from "@prisma/client";

export const LEAD_STAGES = [
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
] as const satisfies readonly LeadStage[];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
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

export const LEAD_STATUSES = ["NEW", "OPEN", "CONVERTED", "LOST", "ARCHIVED"] as const satisfies readonly LeadStatus[];

export const LEAD_STATUS_LABELS: Record<(typeof LEAD_STATUSES)[number], string> = {
  NEW: "New",
  OPEN: "Open",
  CONVERTED: "Converted",
  LOST: "Lost",
  ARCHIVED: "Archived",
};

export const LEAD_SOURCES = [
  "WEBSITE",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "PHONE",
  "WALK_IN",
  "REFERRAL",
  "META_ADS",
  "GOOGLE_ADS",
  "META",
  "GOOGLE",
  "ORGANIC",
  "CAMPAIGN",
  "OTHER",
] as const satisfies readonly LeadSource[];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  PHONE: "Phone",
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  META: "Meta",
  GOOGLE: "Google",
  ORGANIC: "Organic",
  CAMPAIGN: "Campaign",
  OTHER: "Other",
};

export const TREATMENT_INTERESTS = [
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

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const;

export const ALLOWED_STAGE_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  NEW_LEAD: ["CONTACTED", "QUALIFIED", "LOST"],
  CONTACTED: ["QUALIFIED", "NEW_LEAD", "LOST"],
  QUALIFIED: ["CONSULTATION_BOOKED", "CONTACTED", "LOST"],
  CONSULTATION_BOOKED: ["CONSULTATION_COMPLETED", "QUALIFIED", "LOST"],
  CONSULTATION_COMPLETED: ["INVESTIGATION", "TREATMENT_DISCUSSION", "LOST"],
  INVESTIGATION: ["TREATMENT_DISCUSSION", "LOST"],
  TREATMENT_DISCUSSION: ["TREATMENT_STARTED", "INVESTIGATION", "LOST"],
  TREATMENT_STARTED: ["ACTIVE_PATIENT", "LOST"],
  ACTIVE_PATIENT: ["LOST"],
  LOST: [],
};

const LEGACY_STATUS_TO_STAGE: Record<string, LeadStage> = {
  NEW: "NEW_LEAD",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  CONSULTATION_BOOKED: "CONSULTATION_BOOKED",
  CONSULTATION_COMPLETED: "CONSULTATION_COMPLETED",
  INVESTIGATION: "INVESTIGATION",
  TREATMENT_DISCUSSION: "TREATMENT_DISCUSSION",
  TREATMENT_STARTED: "TREATMENT_STARTED",
  ACTIVE_PATIENT: "ACTIVE_PATIENT",
  LOST: "LOST",
};

export function normalizeLeadSource(source: string): LeadSource {
  if (source === "META") return "META_ADS";
  if (source === "GOOGLE") return "GOOGLE_ADS";
  return source as LeadSource;
}

export function lifecycleStatusFromStage(stage: LeadStage, current?: LeadStatus): LeadStatus {
  if (stage === "LOST") return "LOST";
  if (stage === "ACTIVE_PATIENT") return "CONVERTED";
  if (current === "CONVERTED" || current === "ARCHIVED") return current;
  if (stage === "NEW_LEAD") return current === "OPEN" ? "OPEN" : "NEW";
  return "OPEN";
}

export function resolveLegacyStatusAsStage(status: string): LeadStage | null {
  return LEGACY_STATUS_TO_STAGE[status] ?? null;
}

export function isLifecycleStatus(status: string): status is (typeof LEAD_STATUSES)[number] {
  return (LEAD_STATUSES as readonly string[]).includes(status);
}

export const SORT_FIELDS = ["newest", "oldest", "lastActivity", "nextFollowUp", "priority"] as const;
export type LeadSort = (typeof SORT_FIELDS)[number];

export const SCORE_BANDS = {
  cold: { max: 29, label: "Cold" },
  warm: { max: 59, label: "Warm" },
  hot: { max: 100, label: "Hot" },
} as const;

export function scoreBand(score: number) {
  if (score >= 60) return "Hot";
  if (score >= 30) return "Warm";
  return "Cold";
}

/**
 * Transparent engagement score (0–100). Not a clinical score.
 *
 * +15 recent enquiry (7 days)
 * +10 requested callback / follow-up set
 * +10 requested IVF
 * +20 WhatsApp response recorded
 * +20 consultation booked
 * +30 consultation completed
 * +10 call connected
 */
export function explainScore(factors: {
  createdAt: Date;
  treatmentInterest?: string | null;
  nextFollowUpAt?: Date | null;
  respondedWhatsApp?: boolean;
  callConnected?: boolean;
  stage: LeadStage;
}) {
  const parts: Array<{ label: string; points: number }> = [];
  const ageDays = (Date.now() - factors.createdAt.getTime()) / 86_400_000;
  if (ageDays <= 7) parts.push({ label: "Recent enquiry", points: 15 });
  if (factors.nextFollowUpAt) parts.push({ label: "Follow-up scheduled", points: 10 });
  if ((factors.treatmentInterest ?? "").toUpperCase().includes("IVF")) {
    parts.push({ label: "Requested IVF", points: 10 });
  }
  if (factors.respondedWhatsApp) parts.push({ label: "Responded on WhatsApp", points: 20 });
  if (factors.callConnected) parts.push({ label: "Call connected", points: 10 });
  if (
    factors.stage === "CONSULTATION_BOOKED" ||
    factors.stage === "CONSULTATION_COMPLETED" ||
    factors.stage === "INVESTIGATION" ||
    factors.stage === "TREATMENT_DISCUSSION" ||
    factors.stage === "TREATMENT_STARTED" ||
    factors.stage === "ACTIVE_PATIENT"
  ) {
    parts.push({ label: "Consultation booked", points: 20 });
  }
  if (
    factors.stage === "CONSULTATION_COMPLETED" ||
    factors.stage === "INVESTIGATION" ||
    factors.stage === "TREATMENT_DISCUSSION" ||
    factors.stage === "TREATMENT_STARTED" ||
    factors.stage === "ACTIVE_PATIENT"
  ) {
    parts.push({ label: "Consultation completed", points: 30 });
  }
  const score = Math.min(100, parts.reduce((sum, part) => sum + part.points, 0));
  return { score, band: scoreBand(score), factors: parts };
}

export const CONVERSION_FORMULAS = {
  leadToQualified: "qualified leads / total leads × 100",
  qualifiedToConsultation: "consultation booked leads / qualified leads × 100",
  consultationToTreatment: "treatment started leads / consultation completed leads × 100",
  leadToTreatment: "treatment started leads / total leads × 100",
} as const;
