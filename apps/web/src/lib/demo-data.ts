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
  taskType?: string;
  triggerEvent?: string;
  role?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  communicationChannel?: "WHATSAPP" | "VOICE_CALL" | "SMS" | "STAFF_TASK";
  patientResponse?: string;
  attempts?: number;
  escalationLevel?: number;
  lastAction?: string;
  nextAction?: string;
  stageName?: string;
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
    id: "cmtu9ejo9002zo9109nk9xthy",
    slug: "manideep-mani",
    primary: { name: "Manideep", age: 32, phone: "+91 917795559724" },
    partner: { name: "Mani", age: 29, phone: "+91 98450 11222" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 6,
    cycle: "Cycle 01",
    stage: "07. Ovarian Stimulation",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Daily Gonal-F 225 IU Injection at 8:00 PM",
    status: "On Track",
    tags: ["IVF", "Stimulation", "WhatsApp Active"],
    since: "01 Sep 2026",
  },
  {
    id: "c1",
    slug: "priya-rahul",
    primary: { name: "Priya Sharma", age: 31, phone: "+91 98450 11221" },
    partner: { name: "Rahul Sharma", age: 34, phone: "+91 98450 11222" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 7,
    cycle: "Cycle 01",
    stage: "08. Follicular Monitoring",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Follicle Ultrasound Scan at 10:00 AM",
    status: "On Track",
    tags: ["IVF", "Monitoring", "Active"],
    since: "12 Jun 2026",
  },
  {
    id: "c2",
    slug: "ananya-vikram",
    primary: { name: "Ananya Patel", age: 30, phone: "+91 98450 22331" },
    partner: { name: "Vikram Patel", age: 33, phone: "+91 98450 22332" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 8,
    cycle: "Cycle 01",
    stage: "09. Trigger Injection",
    doctor: "Dr. Ravi Menon",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Administer hCG 10,000 IU Trigger at EXACTLY 09:30 PM",
    status: "Needs Attention",
    tags: ["IVF", "Trigger Time-Critical"],
    since: "15 Jun 2026",
  },
  {
    id: "c_ritu",
    slug: "ritu-sandeep",
    primary: { name: "Ritu Mehra", age: 33, phone: "+91 98450 33441" },
    partner: { name: "Sandeep Mehra", age: 36, phone: "+91 98450 33442" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 02",
    stageIndex: 9,
    cycle: "Cycle 02",
    stage: "10. OPU (Egg Retrieval)",
    doctor: "Dr. Ananya Rao",
    coordinator: "Nisha Fernandes",
    careLoop: "Active",
    nextStep: "Fasting from midnight · OT Arrival at 07:30 AM tomorrow",
    status: "On Track",
    tags: ["IVF", "OPU Procedure"],
    since: "20 May 2026",
  },
  {
    id: "c_sunita",
    slug: "sunita-rajesh",
    primary: { name: "Sunita Kapoor", age: 35, phone: "+91 98450 44551" },
    partner: { name: "Rajesh Kapoor", age: 38, phone: "+91 98450 44552" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 10,
    cycle: "Cycle 01",
    stage: "11. Embryology & Fertilization",
    doctor: "Dr. Ravi Menon",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Day 5 Blastocyst & Embryo Grading Report Review",
    status: "On Track",
    tags: ["IVF", "ICSI", "Embryology"],
    since: "08 Jun 2026",
  },
  {
    id: "c4",
    slug: "meera-vivek",
    primary: { name: "Meera Krishnan", age: 32, phone: "+91 98450 55661" },
    partner: { name: "Vivek Krishnan", age: 35, phone: "+91 98450 55662" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 02",
    stageIndex: 11,
    cycle: "Cycle 02",
    stage: "12. Embryo Transfer / FET",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Full Bladder Pre-op prep · Embryo Transfer at 11:30 AM",
    status: "On Track",
    tags: ["IVF", "FET", "Transfer Ready"],
    since: "18 Apr 2026",
  },
  {
    id: "c_deepa",
    slug: "deepa-harish",
    primary: { name: "Deepa Iyer", age: 30, phone: "+91 98450 66771" },
    partner: { name: "Harish Iyer", age: 34, phone: "+91 98450 66772" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 12,
    cycle: "Cycle 01",
    stage: "13. Post-Transfer Support",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Progesterone Gel 8% Daily + Day 3 Wellness Check-in",
    status: "On Track",
    tags: ["IVF", "Luteal Phase", "Two Week Wait"],
    since: "25 May 2026",
  },
  {
    id: "c_shweta",
    slug: "shweta-gaurav",
    primary: { name: "Shweta Nair", age: 31, phone: "+91 98450 77881" },
    partner: { name: "Gaurav Nair", age: 33, phone: "+91 98450 77882" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 13,
    cycle: "Cycle 01",
    stage: "14. Pregnancy Test (Beta-hCG)",
    doctor: "Dr. Ravi Menon",
    coordinator: "Nisha Fernandes",
    careLoop: "Active",
    nextStep: "Serum Beta-hCG blood test at 08:30 AM tomorrow",
    status: "Needs Attention",
    tags: ["IVF", "Beta-hCG", "Pending Lab"],
    since: "10 May 2026",
  },
  {
    id: "c_preeti",
    slug: "preeti-alok",
    primary: { name: "Preeti Bansal", age: 34, phone: "+91 98450 88991" },
    partner: { name: "Alok Bansal", age: 37, phone: "+91 98450 88992" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 14,
    cycle: "Cycle 01",
    stage: "15. Outcome & Transition",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Clinical Transition: Positive Beta-hCG 480 mIU/mL · Antenatal Care Handover",
    status: "On Track",
    tags: ["IVF", "Positive Outcome", "Antenatal Care"],
    since: "01 May 2026",
  },
  {
    id: "c_aarti",
    slug: "aarti-rohan",
    primary: { name: "Aarti Deshmukh", age: 29, phone: "+91 98450 99001" },
    partner: { name: "Rohan Deshmukh", age: 32, phone: "+91 98450 99002" },
    treatment: "IVF",
    cycleLabel: "Fertility Evaluation",
    stageIndex: 0,
    cycle: "Cycle 01",
    stage: "01. Lead & Booking",
    doctor: "Dr. Ananya Rao",
    coordinator: "Nisha Fernandes",
    careLoop: "Active",
    nextStep: "Initial Consultation Booking & Patient Medical History Pack",
    status: "On Track",
    tags: ["IVF", "Lead", "New"],
    since: "10 Sep 2026",
  },
  {
    id: "c5",
    slug: "kavya-rohit",
    primary: { name: "Kavya Menon", age: 28, phone: "+91 98450 55661" },
    partner: { name: "Rohit Menon", age: 30, phone: "+91 98450 55662" },
    treatment: "IUI",
    cycleLabel: "IUI Cycle 01",
    stageIndex: 1,
    cycle: "Cycle 01",
    stage: "02. Initial Consultation",
    doctor: "Dr. Ravi Menon",
    coordinator: "Nisha Fernandes",
    careLoop: "Active",
    nextStep: "Partner Investigation & Lifestyle Counselling",
    status: "Needs Attention",
    tags: ["IUI", "Consultation"],
    since: "05 Aug 2026",
  },
  {
    id: "c3",
    slug: "sneha-kiran",
    primary: { name: "Sneha Reddy", age: 34, phone: "+91 98450 33441" },
    partner: { name: "Kiran Reddy", age: 36, phone: "+91 98450 33442" },
    treatment: "Evaluation",
    cycleLabel: "Fertility Evaluation",
    stageIndex: 2,
    cycle: "Evaluation",
    stage: "03. Fertility Workup",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Upload AMH, TSH & Semen Analysis Blood Reports",
    status: "Pending",
    tags: ["Fertility Evaluation", "Workup"],
    since: "29 Jul 2026",
  },
  {
    id: "c_divya",
    slug: "divya-karthik",
    primary: { name: "Divya Verma", age: 31, phone: "+91 98450 12345" },
    partner: { name: "Karthik Verma", age: 34, phone: "+91 98450 12346" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 3,
    cycle: "Cycle 01",
    stage: "04. IVF Decision",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Clinical Protocol Decision Milestone & Treatment Route Approval",
    status: "On Track",
    tags: ["IVF", "Decision Milestone"],
    since: "15 Aug 2026",
  },
  {
    id: "c_pooja",
    slug: "pooja-amit",
    primary: { name: "Pooja Singhania", age: 33, phone: "+91 98450 23456" },
    partner: { name: "Amit Singhania", age: 36, phone: "+91 98450 23457" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 4,
    cycle: "Cycle 01",
    stage: "05. Treatment Planning",
    doctor: "Dr. Ravi Menon",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Sign Informed Consent & Financial Clearance Sign-off",
    status: "On Track",
    tags: ["IVF", "Consent", "Planning"],
    since: "20 Aug 2026",
  },
  {
    id: "c_neha",
    slug: "neha-sameer",
    primary: { name: "Neha Joshi", age: 30, phone: "+91 98450 34567" },
    partner: { name: "Sameer Joshi", age: 33, phone: "+91 98450 34568" },
    treatment: "IVF",
    cycleLabel: "IVF Cycle 01",
    stageIndex: 5,
    cycle: "Cycle 01",
    stage: "06. Cycle Preparation",
    doctor: "Dr. Ananya Rao",
    coordinator: "Meera Iyer",
    careLoop: "Active",
    nextStep: "Baseline AFC Scan & Day 2 Menses Notification",
    status: "On Track",
    tags: ["IVF", "Prep", "Baseline"],
    since: "25 Aug 2026",
  },
];

export const coupleLabel = (c: Couple) =>
  c.partner ? `${c.primary.name.split(" ")[0]!} + ${c.partner.name.split(" ")[0]!}` : c.primary.name;

export const coupleFullLabel = (c: Couple) =>
  c.partner ? `${c.primary.name} + ${c.partner.name}` : c.primary.name;

export const findCouple = (id: string, list: Couple[] = couples) =>
  list.find(
    (c) =>
      c.id === id ||
      c.slug === id ||
      (id === "manideep-mani" &&
        (c.slug === "c-agvw37vp-mtu9ejo8" ||
          c.id === "cmtu9ejo9002zo9109nk9xthy" ||
          c.primary.phone.includes("7795559724"))) ||
      (id === "c-agvw37vp-mtu9ejo8" &&
        (c.slug === "manideep-mani" ||
          c.id === "cmtu9ejo9002zo9109nk9xthy" ||
          c.primary.phone.includes("7795559724"))),
  );

export const getCouple = (id: string) =>
  findCouple(id) ?? couples[0]!;

export const tasks: CareTask[] = [
  {
    id: "t_mani_1",
    title: "Daily Gonal-F 225 IU Injection Reminder (8:00 PM)",
    coupleId: "cmtu9ejo9002zo9109nk9xthy",
    assignedTo: "Manideep",
    due: "Today · 08:00 PM",
    dueDate: "2026-09-10",
    dueTime: "08:00 PM",
    category: "Medication",
    taskType: "MEDICATION_TASK",
    triggerEvent: "stimulation_day_5_injection_2000",
    role: "PATIENT",
    priority: "CRITICAL",
    status: "completed",
    communicationChannel: "WHATSAPP",
    patientResponse: "[Injected Done]",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "Patient confirmed injection administration via WhatsApp button at 08:04 PM",
    nextAction: "Automated injection log saved · Day 6 Cetrotide check-in scheduled for tomorrow morning",
    stageName: "07. Ovarian Stimulation",
    note: "Medication adherence verified via WhatsApp",
  },
  {
    id: "t_mani_2",
    title: "Upload Day 6 Follicular Scan & Serum Estradiol E2 Report",
    coupleId: "cmtu9ejo9002zo9109nk9xthy",
    assignedTo: "Manideep",
    due: "Tomorrow · 11:00 AM",
    dueDate: "2026-09-11",
    dueTime: "11:00 AM",
    category: "Document",
    taskType: "DOCUMENT_TASK",
    triggerEvent: "stimulation_scan_upload_1100",
    role: "PATIENT",
    priority: "HIGH",
    status: "in_progress",
    communicationChannel: "WHATSAPP",
    patientResponse: "At diagnostic scan centre",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "WhatsApp scan instructions and clinic referral letter dispatched",
    nextAction: "Awaiting patient document upload or partner portal sync",
    stageName: "07. Ovarian Stimulation",
  },
  {
    id: "t_mani_3",
    title: "Medication Adherence Check-in — Cetrotide 0.25 mg Antagonist Injection",
    coupleId: "cmtu9ejo9002zo9109nk9xthy",
    assignedTo: "Manideep",
    due: "Tomorrow · 09:00 AM",
    dueDate: "2026-09-11",
    dueTime: "09:00 AM",
    category: "Medication",
    taskType: "MEDICATION_TASK",
    triggerEvent: "antagonist_start_0900",
    role: "PATIENT",
    priority: "CRITICAL",
    status: "waiting",
    communicationChannel: "WHATSAPP",
    patientResponse: "Waiting for scheduled reminder",
    attempts: 0,
    escalationLevel: 0,
    lastAction: "Queued in WhatsApp automation schedule",
    nextAction: "Dispatch interactive WhatsApp prompt at 08:30 AM",
    stageName: "07. Ovarian Stimulation",
  },
  {
    id: "t1",
    title: "Complete Ultrasound (Follicular Monitoring Scan)",
    coupleId: "c1",
    assignedTo: "Priya Sharma",
    due: "Tomorrow · 10:00 AM",
    dueDate: "2026-09-11",
    dueTime: "10:00 AM",
    category: "Investigation",
    taskType: "INVESTIGATION_TASK",
    triggerEvent: "follicle_scan_scheduled_0900",
    role: "PATIENT",
    priority: "HIGH",
    status: "waiting",
    communicationChannel: "WHATSAPP",
    patientResponse: "[I've Arrived]",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "WhatsApp check-in delivered at 09:30 AM",
    nextAction: "Staff arrival confirmation and ultrasound room check-in",
    stageName: "08. Follicular Monitoring",
    note: "AI follow-up sent 2 hours ago",
  },
  {
    id: "t_trigger",
    title: "Trigger Injection — hCG 10,000 IU Exact Time Administration (09:30 PM)",
    coupleId: "c2",
    assignedTo: "Ananya Patel",
    due: "Tonight · 09:30 PM",
    dueDate: "2026-09-10",
    dueTime: "09:30 PM",
    category: "Medication",
    taskType: "MEDICATION_TASK",
    triggerEvent: "trigger_administration_2130",
    role: "PATIENT",
    priority: "CRITICAL",
    status: "overdue",
    communicationChannel: "VOICE_CALL",
    patientResponse: "No response to 2 reminders",
    attempts: 2,
    escalationLevel: 2,
    lastAction: "Urgent AI Voice Call dispatched at 09:40 PM (Unanswered)",
    nextAction: "Immediate coordinator phone call before 10:00 PM cutoff",
    stageName: "09. Trigger Injection",
    note: "Time-critical for 36h OPU timing",
  },
  {
    id: "t_opu",
    title: "Pre-OPU Fasting & OT Check-in Confirmation",
    coupleId: "c_ritu",
    assignedTo: "Ritu Mehra",
    due: "Tomorrow · 07:30 AM",
    dueDate: "2026-09-11",
    dueTime: "07:30 AM",
    category: "Procedure",
    taskType: "PATIENT_TASK",
    triggerEvent: "opu_fasting_reminder_2000",
    role: "PATIENT",
    priority: "HIGH",
    status: "waiting",
    communicationChannel: "WHATSAPP",
    patientResponse: "[I'm Fasting]",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "WhatsApp fasting protocol message dispatched",
    nextAction: "Nurse check-in upon OT arrival",
    stageName: "10. OPU (Egg Retrieval)",
  },
  {
    id: "t_embryo",
    title: "Day 5 Blastocyst Development & Grading Report Review",
    coupleId: "c_sunita",
    assignedTo: "Dr. Ravi Menon",
    due: "Tomorrow · 02:00 PM",
    dueDate: "2026-09-11",
    dueTime: "02:00 PM",
    category: "Investigation",
    taskType: "INVESTIGATION_TASK",
    triggerEvent: "embryo_day5_grading_1400",
    role: "DOCTOR",
    priority: "HIGH",
    status: "completed",
    communicationChannel: "WHATSAPP",
    patientResponse: "Report reviewed by embryologist",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "Embryology grading PDF automatically linked to patient profile",
    nextAction: "Doctor video consultation scheduled to discuss Freeze-All strategy",
    stageName: "11. Embryology & Fertilization",
  },
  {
    id: "t5",
    title: "Consent form — Embryo Transfer & Cryopreservation",
    coupleId: "c4",
    assignedTo: "Meera Krishnan",
    due: "19 Sep · 12:00 PM",
    dueDate: "2026-09-19",
    dueTime: "12:00 PM",
    category: "Document",
    taskType: "DOCUMENT_TASK",
    triggerEvent: "transfer_consent_dispatch_1000",
    role: "PATIENT",
    priority: "HIGH",
    status: "in_progress",
    communicationChannel: "WHATSAPP",
    patientResponse: "Opened link",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "Digital consent link viewed by patient",
    nextAction: "Follow-up SMS reminder if unsigned by 02:00 PM",
    stageName: "12. Embryo Transfer / FET",
  },
  {
    id: "t_luteal",
    title: "Post-Transfer Day 3 Progesterone & Bed Rest Wellness Check-in",
    coupleId: "c_deepa",
    assignedTo: "Deepa Iyer",
    due: "Today · 04:30 PM",
    dueDate: "2026-09-10",
    dueTime: "04:30 PM",
    category: "Medication",
    taskType: "PATIENT_TASK",
    triggerEvent: "post_transfer_day_3_1600",
    role: "PATIENT",
    priority: "HIGH",
    status: "completed",
    communicationChannel: "WHATSAPP",
    patientResponse: "[I'm Feeling Fine]",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "Patient confirmed post-transfer wellness via WhatsApp interactive button",
    nextAction: "Scheduled Day 7 wellness check-in",
    stageName: "13. Post-Transfer Support",
  },
  {
    id: "t_beta",
    title: "Serum Beta-hCG Pregnancy Test Blood Draw Confirmation",
    coupleId: "c_shweta",
    assignedTo: "Shweta Nair",
    due: "Tomorrow · 08:30 AM",
    dueDate: "2026-09-11",
    dueTime: "08:30 AM",
    category: "Investigation",
    taskType: "INVESTIGATION_TASK",
    triggerEvent: "beta_hcg_due_0830",
    role: "PATIENT",
    priority: "HIGH",
    status: "waiting",
    communicationChannel: "WHATSAPP",
    patientResponse: "External lab sample collected · awaiting report",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "Automated reminder sent to patient and lab partner",
    nextAction: "Coordinator to retrieve lab values if not uploaded by 02:00 PM",
    stageName: "14. Pregnancy Test (Beta-hCG)",
  },
  {
    id: "t_outcome",
    title: "Antenatal Care Handover & Clinical Transition Consultation",
    coupleId: "c_preeti",
    assignedTo: "Dr. Ananya Rao",
    due: "Completed",
    dueDate: "2026-09-08",
    dueTime: "11:00 AM",
    category: "Follow-up",
    taskType: "STAFF_TASK",
    triggerEvent: "pregnancy_positive_transition",
    role: "DOCTOR",
    priority: "MEDIUM",
    status: "completed",
    communicationChannel: "WHATSAPP",
    patientResponse: "Antenatal pack received and obstetrician chosen",
    attempts: 1,
    escalationLevel: 0,
    lastAction: "Transition summary and Week 6 viability scan scheduled",
    nextAction: "Discharge from Care Loop to Antenatal Registry",
    stageName: "15. Outcome & Transition",
  },
];

export const appointments: Appointment[] = [
  { id: "a_mani", time: "10:00 AM", coupleId: "cmtu9ejo9002zo9109nk9xthy", type: "Follicular Monitoring Scan", doctor: "Dr. Ananya Rao", status: "Confirmed", room: "Scan 1" },
  { id: "a1", time: "09:00 AM", coupleId: "c1", type: "IVF Consultation", doctor: "Dr. Ananya Rao", status: "Confirmed", room: "Room 2" },
  { id: "a2", time: "10:30 AM", coupleId: "c2", type: "Trigger Assessment", doctor: "Dr. Ravi Menon", status: "Confirmed", room: "Scan 1" },
  { id: "a_opu", time: "08:00 AM", coupleId: "c_ritu", type: "Oocyte Pick-up (OPU)", doctor: "Dr. Ananya Rao", status: "Confirmed", room: "OT 1" },
  { id: "a3", time: "11:15 AM", coupleId: "c4", type: "Embryo Transfer Prep", doctor: "Dr. Ananya Rao", status: "Waiting", room: "Room 2" },
  { id: "a4", time: "12:00 PM", coupleId: "c3", type: "Fertility Evaluation", doctor: "Dr. Ananya Rao", status: "Confirmed", room: "Room 1" },
  { id: "a5", time: "02:30 PM", coupleId: "c5", type: "Counselling", doctor: "Dr. Ravi Menon", status: "No-show", room: "Room 3" },
];

export const loopActivity: LoopActivity[] = [
  { id: "l_mani", patient: "Manideep", activity: "Confirmed Gonal-F 225 IU injection via WhatsApp", time: "4 min ago", tone: "success" },
  { id: "l1", patient: "Priya Sharma", activity: "Completed Ultrasound check-in", time: "12 min ago", tone: "success" },
  { id: "l2", patient: "Rahul Sharma", activity: "Uploaded Semen Analysis report", time: "25 min ago", tone: "success" },
  { id: "l3", patient: "Ananya Patel", activity: "Hasn't confirmed Trigger injection timing", time: "38 min ago", tone: "warning" },
  { id: "l4", patient: "Meera Krishnan", activity: "Confirmed tomorrow's Embryo Transfer appointment", time: "1 hr ago", tone: "success" },
  { id: "l5", patient: "Shweta Nair", activity: "Awaiting Beta-hCG blood test results", time: "2 hrs ago", tone: "info" },
  { id: "l6", patient: "Preeti Bansal", activity: "Positive Beta-hCG 480 mIU/mL documented", time: "3 hrs ago", tone: "success" },
];

export const exceptions: ExceptionItem[] = [
  {
    id: "e_mani",
    coupleId: "cmtu9ejo9002zo9109nk9xthy",
    kind: "clinical_review",
    task: "Daily Stimulation — Gonal-F Day 6 Check-in",
    taskStatus: "in_progress",
    lastAction: "WhatsApp interactive response received · 12 min ago",
    reason: "Patient reported mild injection site redness and asked about pain relief.",
    aiSummary:
      "Manideep reported slight redness at the injection site after administering Gonal-F 225 IU. AI reassured with standard injection guidance and escalated for clinical review.",
    intent: "Adverse effect query",
    sentiment: "Concerned",
    suggested: "Doctor review / Coordinator reassurance call",
    owner: "doctor",
  },
  {
    id: "e2",
    coupleId: "c2",
    kind: "no_response",
    task: "Trigger Injection — hCG 10,000 IU Time Confirmation",
    taskStatus: "overdue",
    lastAction: "2 WhatsApp alerts + 1 voice call · 45 min ago",
    reason: "Critical trigger time verification pending.",
    aiSummary:
      "Trigger injection must be administered at 09:30 PM sharp for 36h OPU timing. Patient has not yet clicked the [Injection Taken] confirmation button.",
    intent: "Time-critical reminder",
    sentiment: "Urgent",
    suggested: "Immediate coordinator phone call before 10:00 PM cutoff",
    owner: "coordinator",
  },
  {
    id: "e1",
    coupleId: "c1",
    kind: "appointment_issue",
    task: "Ultrasound",
    taskStatus: "waiting",
    lastAction: "AI follow-up sent · 2 hours ago",
    reason: "Patient requested morning scan reschedule slot.",
    aiSummary:
      "Patient requested moving follicular scan from 10:00 AM to 08:30 AM due to work commitments. Slot opening available with Dr. Ananya Rao.",
    intent: "Appointment reschedule",
    sentiment: "Concerned",
    suggested: "Coordinator assistance required to confirm slot",
    owner: "coordinator",
  },
  {
    id: "e_beta",
    coupleId: "c_shweta",
    kind: "missing_report",
    task: "Serum Beta-hCG Pregnancy Test",
    taskStatus: "in_progress",
    lastAction: "Reminder sent · 3 hours ago",
    reason: "Report expected today but external lab has not uploaded.",
    aiSummary:
      "Patient completed blood collection at external lab this morning. Electronic report ingestion pending from lab partner.",
    intent: "Report pending from lab",
    sentiment: "Cooperative",
    suggested: "Coordinator to chase lab partner",
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
      "Partner asked whether his supplement protocol can be substituted. Care Loop does not advise on medical changes and escalated to clinical team.",
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
    aiSummary: "Patient opened the consent link but has not submitted the digitally signed copy.",
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

export const ivfCareLoopStages = [
  "01. Consultation & Assessment",
  "02. Investigations & Workup",
  "03. Treatment Protocol & Financial Clearance",
  "04. Downregulation / Baseline",
  "05. Ovarian Stimulation",
  "06. Trigger Administration",
  "07. Oocyte Pick-Up (OPU)",
  "08. Semen Collection & Fertilization",
  "09. Embryo Culture (Days 1–5/6)",
  "10. Embryo Transfer Preparation",
  "11. Embryo Transfer (ET / FET)",
  "12. Luteal Phase Support",
  "13. Pregnancy Test (Beta-hCG)",
  "14. Outcome & Next Steps",
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

export const ivf15Stages = [
  "Lead & Booking",
  "Initial Consultation",
  "Fertility Workup",
  "IVF Decision",
  "Treatment Planning",
  "Cycle Preparation",
  "Ovarian Stimulation",
  "Follicular Monitoring",
  "Trigger Injection",
  "Egg Retrieval (OPU)",
  "Embryology",
  "Embryo Transfer",
  "Post-Transfer Support",
  "Pregnancy Test",
  "Outcome & Transition",
] as const;

export const journeyTemplates = [
  {
    id: "tpl-eval",
    name: "Evaluation",
    accent: "warning" as const,
    steps: ["Consultation", "Workup", "Review", "Pathway Decision"],
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
    steps: [...ivf15Stages],
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

/** The canonical fertility journey used across cycles, care plans and profiles (15 official stages). */
export const fertilityStages = [
  "01. Lead & Booking",
  "02. Initial Consultation",
  "03. Fertility Workup",
  "04. IVF Decision",
  "05. Treatment Planning",
  "06. Cycle Preparation",
  "07. Ovarian Stimulation",
  "08. Follicular Monitoring",
  "09. Trigger Injection",
  "10. OPU (Egg Retrieval)",
  "11. Embryology & Fertilization",
  "12. Embryo Transfer / FET",
  "13. Post-Transfer Support",
  "14. Pregnancy Test (Beta-hCG)",
  "15. Outcome & Transition",
] as const;

export type FertilityStage = (typeof fertilityStages)[number];

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
  {
    id: "cy_mani",
    coupleId: "cmtu9ejo9002zo9109nk9xthy",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "07. Ovarian Stimulation",
    stageIndex: 6,
    status: "Active",
    started: "01 Sep 2026",
    nextStep: "Daily Gonal-F 225 IU Injection at 8:00 PM",
    nextDate: "Tonight",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy1",
    coupleId: "c1",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "08. Follicular Monitoring",
    stageIndex: 7,
    status: "Active",
    started: "12 Jun 2026",
    nextStep: "Follicle Ultrasound Scan at 10:00 AM",
    nextDate: "Tomorrow",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy2",
    coupleId: "c2",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "09. Trigger Injection",
    stageIndex: 8,
    status: "Needs Attention",
    started: "15 Jun 2026",
    nextStep: "Administer hCG 10,000 IU Trigger at EXACTLY 09:30 PM",
    nextDate: "Tonight 09:30 PM",
    doctor: "Dr. Ravi Menon",
  },
  {
    id: "cy_ritu",
    coupleId: "c_ritu",
    cycleLabel: "IVF Cycle 02",
    treatment: "IVF",
    stage: "10. OPU (Egg Retrieval)",
    stageIndex: 9,
    status: "Active",
    started: "20 May 2026",
    nextStep: "OPU Procedure · Fasting from midnight",
    nextDate: "Tomorrow 08:30 AM",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy_sunita",
    coupleId: "c_sunita",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "11. Embryology & Fertilization",
    stageIndex: 10,
    status: "Active",
    started: "08 Jun 2026",
    nextStep: "Day 5 Blastocyst & Embryo Grading Report Review",
    nextDate: "18 Sep",
    doctor: "Dr. Ravi Menon",
  },
  {
    id: "cy3",
    coupleId: "c4",
    cycleLabel: "IVF Cycle 02",
    treatment: "IVF",
    stage: "12. Embryo Transfer / FET",
    stageIndex: 11,
    status: "Active",
    started: "18 Apr 2026",
    nextStep: "Embryo Transfer procedure · Full bladder prep",
    nextDate: "19 Sep 11:30 AM",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy_deepa",
    coupleId: "c_deepa",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "13. Post-Transfer Support",
    stageIndex: 12,
    status: "Active",
    started: "25 May 2026",
    nextStep: "Progesterone Gel 8% Daily + Day 3 Wellness Check-in",
    nextDate: "20 Sep",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy_shweta",
    coupleId: "c_shweta",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "14. Pregnancy Test (Beta-hCG)",
    stageIndex: 13,
    status: "Needs Attention",
    started: "10 May 2026",
    nextStep: "Serum Beta-hCG blood test · Follow-up lab report",
    nextDate: "Tomorrow 08:30 AM",
    doctor: "Dr. Ravi Menon",
  },
  {
    id: "cy_preeti",
    coupleId: "c_preeti",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "15. Outcome & Transition",
    stageIndex: 14,
    status: "Completed",
    started: "01 May 2026",
    nextStep: "Positive Beta-hCG 480 mIU/mL · Antenatal Handover",
    nextDate: "Completed",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy_aarti",
    coupleId: "c_aarti",
    cycleLabel: "Fertility Evaluation",
    treatment: "Evaluation",
    stage: "01. Lead & Booking",
    stageIndex: 0,
    status: "Active",
    started: "10 Sep 2026",
    nextStep: "Initial Consultation Booking & History Pack",
    nextDate: "15 Sep",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy5",
    coupleId: "c5",
    cycleLabel: "IUI Cycle 01",
    treatment: "IUI",
    stage: "02. Initial Consultation",
    stageIndex: 1,
    status: "Needs Attention",
    started: "05 Aug 2026",
    nextStep: "Partner Investigation & Lifestyle Counselling",
    nextDate: "16 Sep",
    doctor: "Dr. Ravi Menon",
  },
  {
    id: "cy4",
    coupleId: "c3",
    cycleLabel: "Fertility Evaluation",
    treatment: "Evaluation",
    stage: "03. Fertility Workup",
    stageIndex: 2,
    status: "Active",
    started: "29 Jul 2026",
    nextStep: "Upload AMH, TSH & Semen Analysis Blood Reports",
    nextDate: "17 Sep",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy_divya",
    coupleId: "c_divya",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "04. IVF Decision",
    stageIndex: 3,
    status: "Active",
    started: "15 Aug 2026",
    nextStep: "Clinical Protocol Decision Milestone & Route Approval",
    nextDate: "18 Sep",
    doctor: "Dr. Ananya Rao",
  },
  {
    id: "cy_pooja",
    coupleId: "c_pooja",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "05. Treatment Planning",
    stageIndex: 4,
    status: "Active",
    started: "20 Aug 2026",
    nextStep: "Sign Informed Consent & Financial Clearance Sign-off",
    nextDate: "19 Sep",
    doctor: "Dr. Ravi Menon",
  },
  {
    id: "cy_neha",
    coupleId: "c_neha",
    cycleLabel: "IVF Cycle 01",
    treatment: "IVF",
    stage: "06. Cycle Preparation",
    stageIndex: 5,
    status: "Active",
    started: "25 Aug 2026",
    nextStep: "Baseline AFC Scan & Day 2 Menses Notification",
    nextDate: "20 Sep",
    doctor: "Dr. Ananya Rao",
  },
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
