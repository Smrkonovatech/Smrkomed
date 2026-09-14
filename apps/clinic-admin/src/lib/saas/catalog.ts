import type { IntegrationProvider, ModuleKey, StaffRole, SubscriptionPlanKey } from "@smrkomed/database";
import type { Tone } from "@/lib/status";

export const TRIAL_DAYS = 14;

export const MODULES: Array<{
  key: ModuleKey;
  name: string;
  description: string;
  recommended: boolean;
}> = [
  {
    key: "CARE_LOOP",
    name: "Care Loop",
    description: "Follow-through after the doctor writes the plan.",
    recommended: true,
  },
  {
    key: "CRM",
    name: "CRM",
    description: "One lead pipeline from ads, website, WhatsApp and walk-ins.",
    recommended: true,
  },
  {
    key: "APPOINTMENTS",
    name: "Appointments",
    description: "Consultation booking, reminders and calendar sync.",
    recommended: true,
  },
  {
    key: "ANALYTICS",
    name: "Analytics",
    description: "Leads, care adherence and clinic operations in one view.",
    recommended: true,
  },
  {
    key: "BILLING",
    name: "Billing",
    description: "Invoices, packages and payment collection.",
    recommended: false,
  },
  {
    key: "MARKETING",
    name: "Marketing",
    description: "Import Google and Meta leads into the same CRM.",
    recommended: false,
  },
  {
    key: "VOICE",
    name: "AI Voice",
    description: "Voice fallback when WhatsApp is unanswered.",
    recommended: false,
  },
];

export const PLANS: Array<{
  key: SubscriptionPlanKey;
  name: string;
  price: string;
  description: string;
  modules: ModuleKey[];
  highlight?: boolean;
}> = [
  {
    key: "STARTER",
    name: "Starter",
    price: "₹5,000/mo",
    description: "CRM, Care Loop, WhatsApp and basic analytics.",
    modules: ["CRM", "CARE_LOOP", "ANALYTICS"],
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: "₹10,000/mo",
    description: "Appointments, marketing ingest and fuller operations.",
    modules: ["CRM", "CARE_LOOP", "APPOINTMENTS", "MARKETING", "ANALYTICS"],
    highlight: true,
  },
  {
    key: "PRO",
    name: "Pro",
    price: "₹20,000/mo",
    description: "Everything, AI voice, multiple branches and advanced workflows.",
    modules: ["CRM", "CARE_LOOP", "APPOINTMENTS", "MARKETING", "ANALYTICS", "BILLING", "VOICE"],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    description: "Multi-location, EMR, API and dedicated support.",
    modules: ["CRM", "CARE_LOOP", "APPOINTMENTS", "MARKETING", "ANALYTICS", "BILLING", "VOICE"],
  },
];

export type IntegrationCategory = "Communication" | "Marketing" | "Scheduling" | "Payments" | "Healthcare";

export const INTEGRATIONS: Array<{
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: IntegrationCategory;
  connectLabel: string;
  comingSoon?: boolean;
}> = [
  {
    provider: "WHATSAPP_CLOUD",
    name: "WhatsApp Business",
    description: "Connect your clinic's WhatsApp Business account for patient communication.",
    category: "Communication",
    connectLabel: "Connect WhatsApp",
  },
  {
    provider: "SMS",
    name: "SMS",
    description: "Reminders when WhatsApp is unavailable.",
    category: "Communication",
    connectLabel: "Connect",
  },
  {
    provider: "EMAIL",
    name: "Email",
    description: "Patient communication and summaries.",
    category: "Communication",
    connectLabel: "Connect",
  },
  {
    provider: "VOICE",
    name: "Voice",
    description: "AI calls after unanswered messages.",
    category: "Communication",
    connectLabel: "Connect",
  },
  {
    provider: "META_ADS",
    name: "Meta Ads",
    description: "Import lead forms from Facebook and Instagram ads.",
    category: "Marketing",
    connectLabel: "Coming soon",
    comingSoon: true,
  },
  {
    provider: "GOOGLE_ADS",
    name: "Google Ads",
    description: "Import lead-form campaigns into the same CRM.",
    category: "Marketing",
    connectLabel: "Coming soon",
    comingSoon: true,
  },
  {
    provider: "GOOGLE_CALENDAR",
    name: "Google Calendar",
    description: "Keep consultations in the clinic calendar.",
    category: "Scheduling",
    connectLabel: "Connect Google Calendar",
  },
  {
    provider: "RAZORPAY",
    name: "Razorpay",
    description: "Collect treatment packages and consultation fees.",
    category: "Payments",
    connectLabel: "Connect Razorpay",
  },
  {
    provider: "EMR",
    name: "Existing EMR",
    description: "Connect records without replacing your current system.",
    category: "Healthcare",
    connectLabel: "Connect EMR",
  },
  {
    provider: "ABDM",
    name: "ABDM",
    description: "Healthcare interoperability for India.",
    category: "Healthcare",
    connectLabel: "Coming soon",
    comingSoon: true,
  },
];

export const WORKFLOWS = [
  { id: "evaluation", name: "Fertility Evaluation", description: "First consult through diagnostics." },
  { id: "iui", name: "IUI", description: "Stimulation, trigger, procedure and follow-up." },
  { id: "ivf", name: "IVF", description: "Cycle monitoring through transfer and beta hCG." },
] as const;

export const STAFF_ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "CARE_COORDINATOR", label: "Care Coordinator" },
  { value: "RECEPTIONIST", label: "Reception" },
  { value: "NURSE", label: "Nurse" },
  { value: "CLINIC_ADMIN", label: "Clinic Admin" },
];

export const LEAD_SOURCES = [
  "META",
  "GOOGLE",
  "WEBSITE",
  "WHATSAPP",
  "PHONE",
  "REFERRAL",
  "WALK_IN",
  "INSTAGRAM",
  "FACEBOOK",
] as const;

export function integrationTone(
  status: "ACTIVE" | "ACTION_REQUIRED" | "DISABLED" | "ERROR" | "PENDING" | string,
): Tone {
  if (status === "ACTIVE") return "success";
  if (status === "ACTION_REQUIRED" || status === "PENDING") return "warning";
  if (status === "ERROR") return "danger";
  return "muted";
}

export function integrationStatusLabel(status: string) {
  if (status === "ACTIVE") return "Connected";
  if (status === "ACTION_REQUIRED") return "Action required";
  if (status === "PENDING") return "Pending";
  if (status === "ERROR") return "Error";
  if (status === "DISCONNECTED") return "Disconnected";
  return "Not connected";
}
