/**
 * Patient WhatsApp intent classification (deterministic).
 * Classification only — never mutates data or invents facts.
 */

export const PATIENT_INTENTS = [
  "GREETING",
  "GENERAL_INFORMATION",
  "CLINIC_INFORMATION",
  "DOCTOR_INFORMATION",
  "APPOINTMENT_BOOKING",
  "APPOINTMENT_RESCHEDULE",
  "APPOINTMENT_CANCEL",
  "APPOINTMENT_CONFIRM",
  "APPOINTMENT_STATUS",
  "REPORT_REQUEST",
  "REPORT_UPLOAD",
  "DOCUMENT_REQUEST",
  "MEDICATION_REMINDER",
  "MEDICATION_QUESTION",
  "CARE_TASK",
  "CARE_TASK_COMPLETION",
  "CARE_TASK_HELP",
  "IVF_INFORMATION",
  "JOURNEY_STATUS",
  "PAYMENT_INFORMATION",
  "INSURANCE_INFORMATION",
  "CONTACT_HUMAN",
  "REQUEST_DOCTOR",
  "COMPLAINT",
  "CLINICAL_CONCERN",
  "URGENT_CONCERN",
  "UNKNOWN",
] as const;

export type PatientIntent = (typeof PATIENT_INTENTS)[number];

export type IntentResult = {
  intent: PatientIntent;
  confidence: "high" | "medium" | "low";
  /** Tools that may be invoked for this intent (allowlisted). */
  suggestedTools: string[];
};

const RULES: Array<{ intent: PatientIntent; re: RegExp; tools: string[]; confidence: IntentResult["confidence"] }> = [
  {
    intent: "URGENT_CONCERN",
    re: /\b(emergency|urgent|chest pain|bleeding heavily|can't breathe|cannot breathe|suicide|overdose|severe pain|ambulance)\b/i,
    tools: ["requestHuman"],
    confidence: "high",
  },
  {
    intent: "CONTACT_HUMAN",
    re: /\b((speak|talk|connect|chat)\s+(to|with)\s+(a\s+)?(doctor|human|staff|agent|nurse|consultant|coordinator|person)|call\s+me\s*back|transfer\s+me|real\s+person|human\s+please)\b/i,
    tools: ["requestHuman"],
    confidence: "high",
  },
  {
    intent: "REQUEST_DOCTOR",
    re: /\b(want|need|speak\s+to|talk\s+to|see)\s+(a\s+)?(doctor|dr\.?)\b|\bconnect\s+me\s+(to|with)\s+(a\s+)?doctor\b/i,
    tools: ["getDoctorProfile"],
    confidence: "high",
  },
  {
    intent: "COMPLAINT",
    re: /\b(complaint|lawsuit|lawyer|refund|horrible|worst|negligence|malpractice|angry|furious)\b/i,
    tools: ["requestHuman"],
    confidence: "high",
  },
  {
    intent: "CLINICAL_CONCERN",
    re: /\b(diagnos|prescrib|dosage|dose|medication change|should i take|extra\s+(injection|dose|pill)|missed\s+(my\s+)?(dose|injection|medicine)|adverse|side\s*effect|reaction|treat(ment)?\s+for)\b/i,
    tools: ["requestHuman"],
    confidence: "high",
  },
  {
    intent: "APPOINTMENT_BOOKING",
    re: /\b(book|schedule|make)\s+(an?\s+)?(appointment|appt|visit|consultation)|want\s+(an?\s+)?appointment|need\s+(an?\s+)?appointment\b/i,
    tools: ["getAvailableAppointmentSlots", "getAppointments"],
    confidence: "high",
  },
  {
    intent: "APPOINTMENT_RESCHEDULE",
    re: /\b(reschedule|change\s+(my\s+)?(appointment|appt)|can't\s+come|cannot\s+come|move\s+(my\s+)?appointment)\b/i,
    tools: ["getAppointments", "getAvailableAppointmentSlots"],
    confidence: "high",
  },
  {
    intent: "APPOINTMENT_CANCEL",
    re: /\b(cancel)\s+(my\s+)?(appointment|appt|visit)\b/i,
    tools: ["cancelAppointment"],
    confidence: "high",
  },
  {
    intent: "APPOINTMENT_CONFIRM",
    re: /\b(confirm)\s+(my\s+)?(appointment|appt)\b/i,
    tools: ["getAppointments", "confirmAppointment"],
    confidence: "medium",
  },
  {
    intent: "APPOINTMENT_STATUS",
    re: /\b(my\s+)?(next\s+)?appointment|when\s+is\s+my\s+(appointment|visit|scan)|appointment\s+status\b/i,
    tools: ["getAppointments"],
    confidence: "high",
  },
  {
    intent: "MEDICATION_QUESTION",
    re: /\b(medication|medicine|injection|tablet|pill|dose)\b/i,
    tools: ["getMedications"],
    confidence: "medium",
  },
  {
    intent: "JOURNEY_STATUS",
    re: /\b(my\s+)?(care\s+plan|journey|treatment\s+plan|where\s+am\s+i|current\s+stage)\b/i,
    tools: ["getJourney", "getActiveCareLoop", "getTodayCareTasks"],
    confidence: "high",
  },
  {
    intent: "CARE_TASK",
    re: /\b(my\s+)?(task|tasks|to[- ]?do|what\s+should\s+i\s+do)\b/i,
    tools: ["getTodayCareTasks", "getCurrentCareTask"],
    confidence: "medium",
  },
  {
    intent: "DOCUMENT_REQUEST",
    re: /\b(my\s+)?(report|reports|document|documents|lab\s+result)\b/i,
    tools: ["getPatientDocuments"],
    confidence: "medium",
  },
  {
    intent: "DOCTOR_INFORMATION",
    re: /\b(who\s+is\s+my\s+doctor|my\s+doctor|doctor\s+name|dr\.?\s+\w+)\b/i,
    tools: ["getDoctorProfile"],
    confidence: "high",
  },
  {
    intent: "CLINIC_INFORMATION",
    re: /\b(where\s+(are\s+you|is\s+the\s+clinic)|location|address|open(ing)?\s+hours|timing|how\s+do\s+i\s+contact|phone\s+number|services)\b/i,
    tools: ["getClinicProfile"],
    confidence: "high",
  },
  {
    intent: "PAYMENT_INFORMATION",
    re: /\b(payment|bill|invoice|fees?|cost|price|pricing)\b/i,
    tools: ["requestHuman"],
    confidence: "medium",
  },
  {
    intent: "INSURANCE_INFORMATION",
    re: /\b(insurance|claim|tpa|coverage)\b/i,
    tools: ["requestHuman"],
    confidence: "medium",
  },
  {
    intent: "IVF_INFORMATION",
    re: /\b(ivf|iui|fet|fertility|embryo|follicular|ovarian\s+stimulation)\b/i,
    tools: [],
    confidence: "medium",
  },
  {
    intent: "GREETING",
    re: /^(hi+|h+i+e*|hello|heyy*|yo|namaste|namaskar|good\s*(morning|afternoon|evening)|hola)\s*[!.]*$/i,
    tools: ["getPatientContext"],
    confidence: "high",
  },
];

export function classifyPatientIntent(message: string): IntentResult {
  const text = message.trim();
  if (!text) {
    return { intent: "UNKNOWN", confidence: "low", suggestedTools: [] };
  }
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        suggestedTools: rule.tools,
      };
    }
  }
  return {
    intent: "GENERAL_INFORMATION",
    confidence: "low",
    suggestedTools: ["getClinicProfile"],
  };
}
