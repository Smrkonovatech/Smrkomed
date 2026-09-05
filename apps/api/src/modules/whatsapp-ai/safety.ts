/**
 * WhatsApp patient-facing AI safety (Phase 5).
 * Not medical advice — escalate clinical uncertainty to humans.
 */

export type HandoffSignal = {
  handoff: boolean;
  reason: string | null;
  confidence: "high" | "medium" | "low";
};

const HUMAN_REQUEST =
  /\b(doctor|human|staff|agent|person|speak to|talk to|call me|nurse|consultant|coordinator|real person)\b/i;
const EMERGENCY =
  /\b(emergency|urgent|chest pain|bleeding heavily|can't breathe|cannot breathe|suicide|overdose|severe pain|ambulance|911|112)\b/i;
const COMPLAINT =
  /\b(complaint|lawsuit|lawyer|refund|horrible|worst|negligence|malpractice|angry|furious)\b/i;
const CLINICAL =
  /\b(diagnos|prescrib|dosage|dose|medication change|should i take|what medicine|treat(ment)? for|is it cancer|ivf success|pregnant\?|miscarriage risk)\b/i;
const UNSUPPORTED =
  /\b(hack|password|otp code|credit card|bank account)\b/i;

export function detectHandoffSignals(text: string): HandoffSignal {
  const t = text.trim();
  if (!t) return { handoff: true, reason: "EMPTY_MESSAGE", confidence: "low" };
  if (EMERGENCY.test(t)) return { handoff: true, reason: "EMERGENCY_LANGUAGE", confidence: "low" };
  if (HUMAN_REQUEST.test(t)) return { handoff: true, reason: "PATIENT_REQUESTED_HUMAN", confidence: "low" };
  if (COMPLAINT.test(t)) return { handoff: true, reason: "COMPLAINT", confidence: "low" };
  if (CLINICAL.test(t)) return { handoff: true, reason: "CLINICAL_UNCERTAINTY", confidence: "low" };
  if (UNSUPPORTED.test(t)) return { handoff: true, reason: "UNSUPPORTED_QUESTION", confidence: "low" };
  return { handoff: false, reason: null, confidence: "medium" };
}

export function isUnsafeAiOutput(text: string): boolean {
  return /\b(i diagnose|you have|you should take|take \d+\s*mg|prescrib|as your doctor|i am a doctor)\b/i.test(
    text,
  );
}

export const PATIENT_AI_SYSTEM_PROMPT = `You are Smrko AI, a clinic operations assistant messaging patients on WhatsApp for a fertility / hospital clinic using SmrkoMed.

You are NOT a human and NOT a doctor. Always be clear you are Smrko AI.

You MUST NEVER:
- diagnose, prescribe, modify medication, or recommend dosage changes
- invent test results, doctor instructions, or clinical claims
- pretend to be a doctor or staff member
- ask for passwords, OTPs, or payment card numbers

If the question is clinical, uncertain, urgent, or outside the provided knowledge:
say the care team needs to review it and that a staff member will follow up.

Use only:
- the provided clinic knowledge articles (DEMO / DEVELOPMENT content may be present — never claim it is verified medical advice)
- permitted conversation / appointment / journey context

Keep replies short (2–6 sentences), warm, and operational.
Sign implicitly as Smrko AI (do not invent a human name).`;

export const CLINICAL_ESCALATION_MESSAGE =
  "I'm Smrko AI, and I can't give medical advice. Your care team needs to review this — a staff member will follow up with you shortly.";

export const HUMAN_HANDOFF_MESSAGE =
  "I'm connecting you with our care team now. A staff member will continue this conversation shortly.";
