/**
 * SmrkoMed demo dataset — ABC Fertility Centre.
 * All screens read from these structures; nothing is hard-coded per page.
 */

export type TaskStatus =
  | "completed"
  | "in_progress"
  | "waiting"
  | "overdue"
  | "escalated";

export type ExceptionKind =
  | "clinical_review"
  | "no_response"
  | "missing_report"
  | "appointment_issue"
  | "ai_escalation";

export type JourneyStageState = "done" | "current" | "upcoming" | "attention";

export interface Clinic {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  hours: string;
}

export interface StaffUser {
  id: string;
  name: string;
  role: string;
  initials: string;
  accent: "primary" | "teal" | "purple" | "success" | "amber";
}

export type Treatment = "IVF" | "IUI" | "Evaluation" | "FET";

export interface Person {
  name: string;
  age: number;
  phone: string;
}

export interface Couple {
  id: string;
  slug: string;
  primary: Person;
  partner?: Person;
  treatment: Treatment;
  cycleLabel: string;
  stageIndex: number;
  cycle: string;
  stage: string;
  doctor: string;
  coordinator: string;
  careLoop: "Active" | "Paused";
  nextStep: string;
  status: "On Track" | "Needs Attention" | "Pending";
  tags: string[];
  since: string;
}

export interface CareTask {
  id: string;
  title: string;
  coupleId: string;
  assignedTo: string;
  due: string;
  category: string;
  status: TaskStatus;
  note?: string;
}

export interface Appointment {
  id: string;
  time: string;
  coupleId: string;
  type: string;
  doctor: string;
  status: "Confirmed" | "Waiting" | "Completed" | "No-show";
  room: string;
}

export interface LoopActivity {
  id: string;
  patient: string;
  activity: string;
  time: string;
  tone: "success" | "warning" | "danger" | "info";
}

export interface ExceptionItem {
  id: string;
  coupleId: string;
  kind: ExceptionKind;
  task: string;
  taskStatus: TaskStatus;
  lastAction: string;
  reason: string;
  aiSummary: string;
  intent: string;
  sentiment: string;
  suggested: string;
  owner: "doctor" | "coordinator";
}

export interface DocumentItem {
  id: string;
  name: string;
  category: string;
  coupleId: string;
  uploaded: string;
  uploadedBy: string;
  status: "Doctor Review" | "Reviewed" | "Awaiting Upload";
}

export interface Invoice {
  id: string;
  coupleId: string;
  item: string;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Overdue";
}

export interface Lead {
  id: string;
  name: string;
  source: string;
  interest: string;
  counselor: string;
  nextAction: string;
  stage: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: "Video" | "Image" | "PDF" | "Voice";
  duration: string;
  language: string;
  treatment: string;
  active: boolean;
}

export const clinics: Clinic[] = [
  {
    id: "blr",
    name: "ABC Fertility Centre",
    city: "Bangalore",
    address: "12 Lavelle Road, Bangalore 560001",
    phone: "+91 80 4000 1200",
    hours: "Mon–Sat · 08:00 – 20:00",
  },
  {
    id: "kochi",
    name: "ABC Fertility Centre",
    city: "Kochi",
    address: "Panampilly Nagar, Kochi 682036",
    phone: "+91 484 400 2200",
    hours: "Mon–Sat · 08:30 – 19:00",
  },
  {
    id: "chennai",
    name: "ABC Fertility Centre",
    city: "Chennai",
    address: "Nungambakkam High Road, Chennai 600034",
    phone: "+91 44 4000 3300",
    hours: "Mon–Sat · 08:00 – 20:00",
  },
];

export const currentUser: StaffUser = {
  id: "u1",
  name: "Dr. Ananya Rao",
  role: "Fertility Specialist",
  initials: "AR",
  accent: "primary",
};

export const team: StaffUser[] = [
  currentUser,
  { id: "u2", name: "Dr. Ravi Menon", role: "Reproductive Endocrinologist", initials: "RM", accent: "teal" },
  { id: "u3", name: "Meera Iyer", role: "Care Coordinator", initials: "MI", accent: "purple" },
  { id: "u4", name: "Nisha Fernandes", role: "Front Desk", initials: "NF", accent: "amber" },
  { id: "u5", name: "Arun Kale", role: "Clinic Owner", initials: "AK", accent: "success" },
];

export const couples: Couple[] = [
  {
    id: "c1",
    slug: "priya-rahul",
    primary: { name: "Priya Sharma", age: 31, phone: "+91 98450 11221" },
    partner: { name: "Rahul Sharma", age: 34, phone: "+91 98450 11222" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 2,
    cycle: "Cycle 01",
    stage: "Monitoring",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Ultrasound",
    status: "On Track",
    tags: ["IVF", "Active"],
    since: "12 Jun 2026",
  },
  {
    id: "c2",
    slug: "anjali-arjun",
    primary: { name: "Anjali Sharma", age: 29, phone: "+91 98450 22331" },
    partner: { name: "Arjun Nair", age: 33, phone: "+91 98450 22332" },
    treatment: "IUI",
    cycleLabel: "IUI Cycle 02",
    stageIndex: 2,
    cycle: "Cycle 02",
    stage: "Follicular Monitoring",
    doctor: "Dr. Ravi Menon",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Follow-up",
    status: "Needs Attention",
    tags: ["IUI", "Follow-up"],
    since: "02 Jul 2026",
  },
  {
    id: "c3",
    slug: "sneha-kiran",
    primary: { name: "Sneha Reddy", age: 34, phone: "+91 98450 33441" },
    partner: { name: "Kiran Reddy", age: 36, phone: "+91 98450 33442" },
    treatment: "Evaluation",
    cycleLabel: "Fertility Evaluation",
    stageIndex: 1,
    cycle: "Evaluation",
    stage: "Initial Tests",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Blood Test",
    status: "Pending",
    tags: ["Fertility Evaluation", "New"],
    since: "29 Jul 2026",
  },
  {
    id: "c4",
    slug: "meera-vivek",
    primary: { name: "Meera Krishnan", age: 32, phone: "+91 98450 44551" },
    partner: { name: "Vivek Krishnan", age: 35, phone: "+91 98450 44552" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 02",
    stageIndex: 3,
    cycle: "Cycle 02",
    stage: "Procedure",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Embryo Transfer",
    status: "On Track",
    tags: ["IVF", "Active"],
    since: "18 Apr 2026",
  },
  {
    id: "c5",
    slug: "kavya-rohit",
    primary: { name: "Kavya Menon", age: 28, phone: "+91 98450 55661" },
    partner: { name: "Rohit Menon", age: 30, phone: "+91 98450 55662" },
    treatment: "IUI",
    cycleLabel: "IUI Cycle 01",
    stageIndex: 0,
    cycle: "Cycle 01",
    stage: "Consultation",
    doctor: "Dr. Ravi Menon",
    coordinator: "Nisha Fernandes",
    careLoop: "Paused",
    nextStep: "Partner Investigation",
    status: "Needs Attention",
    tags: ["IUI", "Needs Attention"],
    since: "05 Aug 2026",
  },
];

export const coupleLabel = (c: Couple) =>
  c.partner ? `${c.primary.name.split(" ")[0]!} + ${c.partner.name.split(" ")[0]!}` : c.primary.name;

export const coupleFullLabel = (c: Couple) =>
  c.partner ? `${c.primary.name} + ${c.partner.name}` : c.primary.name;

export const findCouple = (id: string, list: Couple[] = couples) =>
  list.find((c) => c.id === id || c.slug === id);

export const getCouple = (id: string) =>
  findCouple(id) ?? couples[0]!;

export const tasks: CareTask[] = [
  { id: "t1", title: "Complete Ultrasound", coupleId: "c1", assignedTo: "Priya Sharma", due: "20 Aug · 10:00 AM", category: "Investigation", status: "waiting", note: "AI follow-up sent 2 hours ago" },
  { id: "t2", title: "Upload Semen Analysis", coupleId: "c1", assignedTo: "Rahul Sharma", due: "18 Aug · 06:00 PM", category: "Document", status: "completed" },
  { id: "t3", title: "Medication check-in — Day 6", coupleId: "c2", assignedTo: "Anjali Sharma", due: "17 Aug · 09:00 AM", category: "Medication", status: "overdue", note: "No response to 2 reminders" },
  { id: "t4", title: "Complete Blood Test (AMH, TSH)", coupleId: "c3", assignedTo: "Sneha Reddy", due: "21 Aug · 08:30 AM", category: "Investigation", status: "in_progress" },
  { id: "t5", title: "Consent form — Embryo Transfer", coupleId: "c4", assignedTo: "Meera Krishnan", due: "19 Aug · 12:00 PM", category: "Document", status: "in_progress" },
  { id: "t6", title: "Cycle payment — Instalment 2", coupleId: "c4", assignedTo: "Vivek Krishnan", due: "22 Aug · 05:00 PM", category: "Payment", status: "waiting" },
  { id: "t7", title: "Partner investigation booking", coupleId: "c5", assignedTo: "Rohit Menon", due: "16 Aug · 11:00 AM", category: "Procedure", status: "escalated", note: "Escalated to coordinator" },
  { id: "t8", title: "Attend follow-up consultation", coupleId: "c2", assignedTo: "Anjali Sharma", due: "23 Aug · 04:30 PM", category: "Appointment", status: "waiting" },
];

export const appointments: Appointment[] = [
  { id: "a1", time: "09:00 AM", coupleId: "c1", type: "IVF Consultation", doctor: "Dr. Ananya Rao", status: "Confirmed", room: "Room 2" },
  { id: "a2", time: "10:30 AM", coupleId: "c2", type: "Follicular Monitoring", doctor: "Dr. Ravi Menon", status: "Confirmed", room: "Scan 1" },
  { id: "a3", time: "11:15 AM", coupleId: "c4", type: "Follow-up", doctor: "Dr. Ananya Rao", status: "Waiting", room: "Room 2" },
  { id: "a4", time: "12:00 PM", coupleId: "c3", type: "Fertility Evaluation", doctor: "Dr. Ananya Rao", status: "Confirmed", room: "Room 1" },
  { id: "a5", time: "02:30 PM", coupleId: "c5", type: "Counselling", doctor: "Dr. Ravi Menon", status: "No-show", room: "Room 3" },
  { id: "a6", time: "04:00 PM", coupleId: "c4", type: "Embryo Transfer Prep", doctor: "Dr. Ananya Rao", status: "Completed", room: "OT" },
];

export const loopActivity: LoopActivity[] = [
  { id: "l1", patient: "Priya Sharma", activity: "Completed Ultrasound check-in", time: "2 min ago", tone: "success" },
  { id: "l2", patient: "Rahul Sharma", activity: "Uploaded Semen Analysis report", time: "14 min ago", tone: "success" },
  { id: "l3", patient: "Anjali Sharma", activity: "Hasn't responded to medication check-in", time: "38 min ago", tone: "warning" },
  { id: "l4", patient: "Meera Krishnan", activity: "Confirmed tomorrow's appointment", time: "1 hr ago", tone: "success" },
  { id: "l5", patient: "Sneha Reddy", activity: "Requested a staff callback", time: "2 hrs ago", tone: "danger" },
  { id: "l6", patient: "Kavya Menon", activity: "AI voice call placed — no answer", time: "3 hrs ago", tone: "info" },
];

export const exceptions: ExceptionItem[] = [
  {
    id: "e1",
    coupleId: "c1",
    kind: "appointment_issue",
    task: "Ultrasound",
    taskStatus: "waiting",
    lastAction: "AI follow-up sent · 2 hours ago",
    reason: "Patient hasn't confirmed completion.",
    aiSummary:
      "Patient has not completed the ultrasound because she could not get an appointment slot. She has requested help booking one.",
    intent: "Appointment assistance",
    sentiment: "Concerned",
    suggested: "Coordinator assistance required",
    owner: "coordinator",
  },
  {
    id: "e2",
    coupleId: "c2",
    kind: "no_response",
    task: "Medication check-in — Day 6",
    taskStatus: "overdue",
    lastAction: "2 reminders + 1 AI voice call · 5 hours ago",
    reason: "No response across WhatsApp and voice.",
    aiSummary:
      "Patient has not responded to two medication check-ins or an AI voice call. No confirmation that Day 6 injections were taken.",
    intent: "Unreachable",
    sentiment: "Unknown",
    suggested: "Coordinator callback, then inform doctor",
    owner: "coordinator",
  },
  {
    id: "e3",
    coupleId: "c1",
    kind: "clinical_review",
    task: "Routine care-plan follow-up",
    taskStatus: "escalated",
    lastAction: "Escalated by Care Loop · 25 min ago",
    reason: "Patient reported a new health concern.",
    aiSummary:
      "Patient reported mild abdominal discomfort and bloating during a routine follow-up. Care Loop did not advise and escalated for clinical review.",
    intent: "New symptom reported",
    sentiment: "Worried",
    suggested: "Doctor clinical review",
    owner: "doctor",
  },
  {
    id: "e4",
    coupleId: "c3",
    kind: "missing_report",
    task: "Blood Test (AMH, TSH)",
    taskStatus: "in_progress",
    lastAction: "Reminder sent · yesterday",
    reason: "Report expected on 16 Aug but not received.",
    aiSummary:
      "Patient completed the blood test at an external lab and says the report will be emailed by the lab. Nothing received yet.",
    intent: "Report pending from lab",
    sentiment: "Cooperative",
    suggested: "Coordinator to chase lab",
    owner: "coordinator",
  },
  {
    id: "e5",
    coupleId: "c5",
    kind: "ai_escalation",
    task: "Partner investigation booking",
    taskStatus: "escalated",
    lastAction: "AI escalation · 1 hour ago",
    reason: "Patient asked a question outside Care Loop's scope.",
    aiSummary:
      "Partner asked whether his medication can be changed. Care Loop does not advise on treatment and escalated to the clinical team.",
    intent: "Treatment question",
    sentiment: "Neutral",
    suggested: "Doctor response required",
    owner: "doctor",
  },
  {
    id: "e6",
    coupleId: "c4",
    kind: "missing_report",
    task: "Consent form — Embryo Transfer",
    taskStatus: "in_progress",
    lastAction: "Document link sent · 3 hours ago",
    reason: "Signed consent not yet uploaded.",
    aiSummary: "Patient opened the consent link but has not submitted the signed copy.",
    intent: "In progress",
    sentiment: "Positive",
    suggested: "Automated reminder scheduled",
    owner: "coordinator",
  },
];

export const documents: DocumentItem[] = [
  { id: "d1", name: "Ultrasound Report.pdf", category: "Scan Reports", coupleId: "c1", uploaded: "Today, 10:32 AM", uploadedBy: "Priya Sharma", status: "Doctor Review" },
  { id: "d2", name: "Semen Analysis.pdf", category: "Lab Reports", coupleId: "c1", uploaded: "Today, 09:04 AM", uploadedBy: "Rahul Sharma", status: "Doctor Review" },
  { id: "d3", name: "AMH & TSH Panel.pdf", category: "Lab Reports", coupleId: "c3", uploaded: "Awaiting", uploadedBy: "—", status: "Awaiting Upload" },
  { id: "d4", name: "Embryo Transfer Consent.pdf", category: "Consent", coupleId: "c4", uploaded: "Yesterday, 04:12 PM", uploadedBy: "Meera Iyer", status: "Reviewed" },
  { id: "d5", name: "Stimulation Protocol.pdf", category: "Treatment Documents", coupleId: "c2", uploaded: "15 Aug, 11:20 AM", uploadedBy: "Dr. Ravi Menon", status: "Reviewed" },
  { id: "d6", name: "Invoice #INV-2041.pdf", category: "Invoices", coupleId: "c4", uploaded: "14 Aug, 06:00 PM", uploadedBy: "Billing", status: "Reviewed" },
  { id: "d7", name: "Prescription — Day 5.pdf", category: "Prescriptions", coupleId: "c2", uploaded: "13 Aug, 10:00 AM", uploadedBy: "Dr. Ravi Menon", status: "Reviewed" },
];

export const invoices: Invoice[] = [
  { id: "INV-2041", coupleId: "c4", item: "IVF Cycle 02 — Instalment 2", amount: 145000, date: "14 Aug 2026", status: "Pending" },
  { id: "INV-2039", coupleId: "c1", item: "IVF Cycle 01 — Monitoring package", amount: 62000, date: "11 Aug 2026", status: "Paid" },
  { id: "INV-2036", coupleId: "c2", item: "IUI Cycle 02", amount: 38000, date: "08 Aug 2026", status: "Paid" },
  { id: "INV-2030", coupleId: "c5", item: "Fertility evaluation package", amount: 18500, date: "02 Aug 2026", status: "Overdue" },
  { id: "INV-2028", coupleId: "c3", item: "Initial consultation + tests", amount: 12000, date: "29 Jul 2026", status: "Paid" },
];

export const crmStages = [
  "New Lead",
  "Contacted",
  "Consultation Booked",
  "Consultation Completed",
  "Treatment Discussion",
  "Treatment Started",
  "Active Patient",
];

export const leads: Lead[] = [
  { id: "ld1", name: "Divya & Sanjay", source: "Instagram", interest: "IVF", counselor: "Meera Iyer", nextAction: "Send intro pack", stage: "New Lead" },
  { id: "ld2", name: "Farah & Imran", source: "Google Ads", interest: "IUI", counselor: "Nisha Fernandes", nextAction: "Call back today", stage: "Contacted" },
  { id: "ld3", name: "Neha & Karthik", source: "Referral", interest: "Evaluation", counselor: "Meera Iyer", nextAction: "Consult on 20 Aug", stage: "Consultation Booked" },
  { id: "ld4", name: "Ritu & Aman", source: "Walk-in", interest: "IVF", counselor: "Nisha Fernandes", nextAction: "Share cost estimate", stage: "Consultation Completed" },
  { id: "ld5", name: "Shruti & Nikhil", source: "Website", interest: "IVF", counselor: "Meera Iyer", nextAction: "Decide protocol", stage: "Treatment Discussion" },
  { id: "ld6", name: "Pooja & Varun", source: "Referral", interest: "IUI", counselor: "Meera Iyer", nextAction: "Cycle start 24 Aug", stage: "Treatment Started" },
  { id: "ld7", name: "Kavya & Rohit", source: "Instagram", interest: "IUI", counselor: "Nisha Fernandes", nextAction: "In care plan", stage: "Active Patient" },
];

export const mediaLibrary: MediaItem[] = [
  { id: "m1", title: "What to expect during your scan", type: "Video", duration: "1:48", language: "English", treatment: "Procedure Preparation", active: true },
  { id: "m2", title: "Injection technique — step by step", type: "Video", duration: "2:35", language: "Hindi", treatment: "Medication", active: true },
  { id: "m3", title: "Scan day preparation checklist", type: "Image", duration: "—", language: "English", treatment: "Procedure Preparation", active: true },
  { id: "m4", title: "Preparation Guide", type: "PDF", duration: "4 pages", language: "English", treatment: "IVF", active: true },
  { id: "m5", title: "Welcome from your care team", type: "Voice", duration: "0:32", language: "Kannada", treatment: "General Education", active: true },
  { id: "m6", title: "Understanding your IUI cycle", type: "PDF", duration: "6 pages", language: "Malayalam", treatment: "IUI", active: false },
  { id: "m7", title: "Fertility evaluation explained", type: "Video", duration: "3:10", language: "English", treatment: "Fertility Evaluation", active: true },
];

export const journeyStages = [
  "Consultation",
  "Initial Tests",
  "Monitoring",
  "Procedure",
  "Follow-up",
  "Outcome",
];

export const carePlanSteps = [
  { id: "01", title: "Consultation", state: "done" as JourneyStageState, meta: "Completed · 12 Jun", detail: "Baseline history and counselling with Dr. Ananya Rao." },
  { id: "02", title: "Initial Tests", state: "done" as JourneyStageState, meta: "Completed · 18 Jun", detail: "AMH, TSH, prolactin and partner semen analysis." },
  { id: "03", title: "Ultrasound", state: "done" as JourneyStageState, meta: "Completed · 02 Aug", detail: "Baseline antral follicle count." },
  { id: "04", title: "Report Review", state: "attention" as JourneyStageState, meta: "Pending · due 20 Aug", detail: "Doctor review of uploaded scan and lab reports." },
  { id: "05", title: "Follow-up", state: "upcoming" as JourneyStageState, meta: "Upcoming", detail: "Plan next monitoring window and medication." },
];

export const journeyTemplates = [
  {
    id: "tpl-eval",
    name: "Fertility Evaluation",
    accent: "teal" as const,
    steps: ["Consultation", "Baseline", "Partner Investigation", "Review", "Plan"],
  },
  {
    id: "tpl-iui",
    name: "IUI",
    accent: "info" as const,
    steps: ["Consultation", "Baseline", "Monitoring", "Procedure", "Follow-up", "Pregnancy Test"],
  },
  {
    id: "tpl-ivf",
    name: "IVF",
    accent: "primary" as const,
    steps: ["Consultation", "Baseline", "Monitoring", "Procedure", "Transfer", "Follow-up", "Pregnancy Test"],
  },
  {
    id: "tpl-fet",
    name: "FET",
    accent: "rose" as const,
    steps: ["Consultation", "Baseline", "Transfer", "Follow-up", "Pregnancy Test"],
  },
];

export const loopKpis = {
  active: 186,
  completion: 92,
  automatedToday: 48,
  needAttention: 8,
};

/** Clinic-level headline numbers shown on the dashboard. */
export const clinicKpis = {
  activeCouples: 186,
  appointmentsToday: 24,
  activeCycles: 64,
  needAttention: 8,
};

/** The canonical fertility journey used across cycles, care plans and profiles. */
export const fertilityStages = [
  "Consultation",
  "Baseline",
  "Monitoring",
  "Procedure",
  "Transfer",
  "Follow-up",
  "Pregnancy Test",
] as const;

export type CycleStatus = "Active" | "Needs Attention" | "Completed";

export interface TreatmentCycle {
  id: string;
  coupleId: string;
  cycleLabel: string;
  treatment: Treatment;
  stage: string;
  stageIndex: number;
  status: CycleStatus;
  started: string;
  nextStep: string;
  nextDate: string;
  doctor: string;
}

export const cycles: TreatmentCycle[] = [
  { id: "cy1", coupleId: "c1", cycleLabel: "IVF Cycle 01", treatment: "IVF", stage: "Monitoring", stageIndex: 2, status: "Active", started: "12 Jun 2026", nextStep: "Ultrasound", nextDate: "20 Aug", doctor: "Dr. Ananya Rao" },
  { id: "cy2", coupleId: "c2", cycleLabel: "IUI Cycle 02", treatment: "IUI", stage: "Follicular Monitoring", stageIndex: 2, status: "Needs Attention", started: "02 Jul 2026", nextStep: "Medication check-in", nextDate: "17 Aug", doctor: "Dr. Ravi Menon" },
  { id: "cy3", coupleId: "c4", cycleLabel: "IVF Cycle 02", treatment: "IVF", stage: "Transfer", stageIndex: 4, status: "Active", started: "18 Apr 2026", nextStep: "Embryo Transfer", nextDate: "19 Aug", doctor: "Dr. Ananya Rao" },
  { id: "cy4", coupleId: "c3", cycleLabel: "Fertility Evaluation", treatment: "Evaluation", stage: "Baseline", stageIndex: 1, status: "Active", started: "29 Jul 2026", nextStep: "Blood Test", nextDate: "21 Aug", doctor: "Dr. Ananya Rao" },
  { id: "cy5", coupleId: "c5", cycleLabel: "IUI Cycle 01", treatment: "IUI", stage: "Consultation", stageIndex: 0, status: "Needs Attention", started: "05 Aug 2026", nextStep: "Partner Investigation", nextDate: "16 Aug", doctor: "Dr. Ravi Menon" },
  { id: "cy6", coupleId: "c1", cycleLabel: "FET Cycle 01", treatment: "FET", stage: "Follow-up", stageIndex: 5, status: "Completed", started: "04 Feb 2026", nextStep: "Pregnancy Test", nextDate: "Completed", doctor: "Dr. Ananya Rao" },
];

export const enquiryStages = [
  "New Enquiry",
  "Contacted",
  "Consultation",
  "Treatment Discussion",
  "Treatment Started",
];

export interface CareContentItem {
  id: string;
  title: string;
  type: "Video" | "Image" | "PDF" | "Voice Note";
  treatment: string;
  language: string;
  status: "Active" | "Draft";
  meta: string;
}

export const careContent: CareContentItem[] = [
  { id: "cc1", title: "What to expect during your scan", type: "Video", treatment: "IVF", language: "English", status: "Active", meta: "1:48" },
  { id: "cc2", title: "Injection technique — step by step", type: "Video", treatment: "IVF", language: "Hindi", status: "Active", meta: "2:35" },
  { id: "cc3", title: "Scan day preparation checklist", type: "Image", treatment: "IUI", language: "English", status: "Active", meta: "1 page" },
  { id: "cc4", title: "IVF preparation guide", type: "PDF", treatment: "IVF", language: "English", status: "Active", meta: "4 pages" },
  { id: "cc5", title: "IUI education", type: "PDF", treatment: "IUI", language: "Malayalam", status: "Draft", meta: "6 pages" },
  { id: "cc6", title: "Welcome from your care team", type: "Voice Note", treatment: "Fertility Evaluation", language: "Kannada", status: "Active", meta: "0:32" },
  { id: "cc7", title: "Preparing for embryo transfer", type: "Video", treatment: "FET", language: "English", status: "Active", meta: "2:12" },
];

export const analytics = {
  weekly: [
    { day: "Mon", created: 42, completed: 38, responses: 88 },
    { day: "Tue", created: 51, completed: 47, responses: 91 },
    { day: "Wed", created: 46, completed: 44, responses: 94 },
    { day: "Thu", created: 58, completed: 52, responses: 89 },
    { day: "Fri", created: 63, completed: 60, responses: 95 },
    { day: "Sat", created: 39, completed: 36, responses: 92 },
    { day: "Sun", created: 21, completed: 20, responses: 96 },
  ],
  patients: [
    { month: "Mar", active: 890, added: 78, completed: 41 },
    { month: "Apr", active: 962, added: 84, completed: 46 },
    { month: "May", active: 1035, added: 91, completed: 52 },
    { month: "Jun", active: 1108, added: 96, completed: 58 },
    { month: "Jul", active: 1186, added: 104, completed: 61 },
    { month: "Aug", active: 1248, added: 112, completed: 66 },
  ],
  channels: [
    { name: "WhatsApp", value: 68 },
    { name: "AI Voice", value: 17 },
    { name: "Staff call", value: 11 },
    { name: "In-clinic", value: 4 },
  ],
  operations: [
    { label: "Appointments this week", value: "214", pct: 82, tone: "primary" as const },
    { label: "No-shows", value: "6", pct: 12, tone: "danger" as const },
    { label: "Pending tasks", value: "38", pct: 34, tone: "warning" as const },
    { label: "Staff workload", value: "Balanced", pct: 61, tone: "success" as const },
  ],
};

export const taskCategories = [
  "Investigation",
  "Appointment",
  "Medication",
  "Document",
  "Procedure",
  "Payment",
  "Follow-up",
  "Digital Health",
  "Custom",
];

export const reminderOptions = [
  "24 hours before",
  "12 hours before",
  "2 hours before",
  "Custom",
];
