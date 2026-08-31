/**
 * Product-preview data for WhatsApp Automation Center UX.
 * Live clinic APIs remain the source of truth when connected;
 * these examples power empty states and the flagship Care Loop demo.
 */

export const CLINIC = {
  name: "ABC Fertility Centre",
  city: "Bangalore",
};

export const STAFF = {
  doctors: ["Dr. Ananya Rao", "Dr. Vikram Menon"] as const,
  coordinators: ["Meera Iyer", "Kavya Sharma"] as const,
};

export type DemoConversation = {
  id: string;
  couple: string;
  journey: "IVF" | "IUI" | "FET" | "Evaluation";
  stage: string;
  preview: string;
  time: string;
  unread: boolean;
  escalated: boolean;
  filter: "all" | "unread" | "ai" | "staff" | "escalated";
};

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: "c-priya",
    couple: "Priya + Rahul",
    journey: "IVF",
    stage: "Monitoring",
    preview: "Yes, I completed the scan.",
    time: "2 min",
    unread: true,
    escalated: false,
    filter: "unread",
  },
  {
    id: "c-anjali",
    couple: "Anjali + Arjun",
    journey: "IUI",
    stage: "Follow-up",
    preview: "Can I reschedule this?",
    time: "8 min",
    unread: true,
    escalated: false,
    filter: "unread",
  },
  {
    id: "c-meera",
    couple: "Meera + Vivek",
    journey: "IVF",
    stage: "Medication",
    preview: "Should I take this tonight?",
    time: "14 min",
    unread: false,
    escalated: false,
    filter: "ai",
  },
  {
    id: "c-sneha",
    couple: "Sneha + Kiran",
    journey: "FET",
    stage: "Documents",
    preview: "Where should I upload the report?",
    time: "21 min",
    unread: false,
    escalated: true,
    filter: "escalated",
  },
];

export type DemoMessage = {
  id: string;
  from: "care_loop" | "patient" | "ai" | "staff";
  text: string;
  time: string;
  buttons?: string[];
  aiAssisted?: boolean;
};

export const DEMO_THREAD: DemoMessage[] = [
  {
    id: "m1",
    from: "care_loop",
    text: "Your doctor-approved care plan has a monitoring scan scheduled for tomorrow at 9:00 AM.",
    time: "9:02 AM",
    buttons: ["Confirm Appointment", "Need Help"],
  },
  {
    id: "m2",
    from: "patient",
    text: "Yes, I will attend.",
    time: "9:08 AM",
  },
  {
    id: "m3",
    from: "care_loop",
    text: "Great. Please upload the scan report after your appointment.",
    time: "9:08 AM",
    buttons: ["Upload Report", "Ask a Question"],
  },
  {
    id: "m4",
    from: "patient",
    text: "Can I upload it here?",
    time: "9:12 AM",
  },
  {
    id: "m5",
    from: "ai",
    text: "Yes. You can upload the report directly in this conversation.",
    time: "9:12 AM",
    aiAssisted: true,
  },
];

export const DEMO_AUTOMATIONS = [
  {
    id: "a-med",
    name: "Medication Reminder",
    trigger: "Medication scheduled",
    patients: 842,
    metric: "98% delivery",
    status: "Running" as const,
    lastActivity: "9 min ago",
  },
  {
    id: "a-appt",
    name: "Appointment Confirmation",
    trigger: "Appointment booked",
    patients: 126,
    metric: "91% confirmed",
    status: "Running" as const,
    lastActivity: "14 min ago",
  },
  {
    id: "a-report",
    name: "Report Collection",
    trigger: "Document required",
    patients: 64,
    metric: "18 pending",
    status: "Running" as const,
    lastActivity: "22 min ago",
  },
  {
    id: "a-follow",
    name: "Care Loop Follow-up",
    trigger: "Care task due",
    patients: 213,
    metric: "27 exceptions",
    status: "Needs Attention" as const,
    lastActivity: "4 min ago",
  },
];

export const DEMO_ACTIVITY = [
  {
    time: "10:42 AM",
    title: "WhatsApp template sent",
    couple: "Priya + Rahul",
    detail: "IVF → Medication Reminder",
  },
  {
    time: "10:35 AM",
    title: "Patient responded",
    couple: "Anjali + Arjun",
    detail: "“Yes, I completed the scan.”",
  },
  {
    time: "10:31 AM",
    title: "Care task completed",
    couple: "Meera + Vivek",
    detail: "Baseline report received",
  },
  {
    time: "10:21 AM",
    title: "Escalation created",
    couple: "Sneha + Kiran",
    detail: "Patient has not responded",
  },
];

export const DEMO_ATTENTION = [
  { id: "att-1", label: "3 patients need staff response", tone: "warning" as const },
  { id: "att-2", label: "5 failed message deliveries", tone: "danger" as const },
  { id: "att-3", label: "2 workflows paused", tone: "warning" as const },
  { id: "att-4", label: "1 WhatsApp template rejected", tone: "danger" as const },
];

export const DEMO_TEMPLATES = [
  {
    id: "t1",
    name: "Appointment Confirmation",
    category: "Appointment",
    status: "Approved",
    language: "English",
    usedIn: 6,
    updated: "2 days ago",
  },
  {
    id: "t2",
    name: "Medication Reminder",
    category: "Care Loop",
    status: "Approved",
    language: "English",
    usedIn: 4,
    updated: "Yesterday",
  },
  {
    id: "t3",
    name: "Report Request",
    category: "Documents",
    status: "Approved",
    language: "English",
    usedIn: 3,
    updated: "4 days ago",
  },
  {
    id: "t4",
    name: "Payment Reminder",
    category: "Billing",
    status: "Approved",
    language: "English",
    usedIn: 2,
    updated: "1 week ago",
  },
  {
    id: "t5",
    name: "Consent Request",
    category: "Consent",
    status: "Pending Approval",
    language: "English",
    usedIn: 1,
    updated: "Today",
  },
];

export const IVF_JOURNEY_STAGES = [
  { id: "s1", name: "Consultation", tasks: 2, automations: 1, templates: 1 },
  { id: "s2", name: "Baseline", tasks: 3, automations: 2, templates: 2 },
  { id: "s3", name: "Monitoring", tasks: 3, automations: 4, templates: 3 },
  { id: "s4", name: "Medication", tasks: 2, automations: 3, templates: 2 },
  { id: "s5", name: "Procedure", tasks: 2, automations: 2, templates: 2 },
  { id: "s6", name: "Transfer", tasks: 1, automations: 2, templates: 1 },
  { id: "s7", name: "Follow-up", tasks: 2, automations: 2, templates: 2 },
  { id: "s8", name: "Pregnancy Test", tasks: 1, automations: 2, templates: 1 },
  { id: "s9", name: "Doctor Review", tasks: 1, automations: 1, templates: 0 },
];

export const FLAGSHIP_FLOW_STEPS = [
  "Doctor approves IVF care plan",
  "Consultation scheduled",
  "WhatsApp confirmation",
  "Patient confirms",
  "Baseline appointment reminder",
  "Medication instruction",
  "Patient confirms medication",
  "Monitoring appointment",
  "Report request",
  "Patient uploads report",
  "Care Loop marks task complete",
  "Next stage activated",
  "Procedure reminder",
  "Follow-up",
  "Pregnancy test reminder",
  "Doctor review",
];

export const DEMO_KB = [
  {
    id: "kb1",
    title: "What should I do before my IVF appointment?",
    category: "IVF",
    status: "Published",
    updated: "3 days ago",
  },
  {
    id: "kb2",
    title: "How do I upload a scan report on WhatsApp?",
    category: "Documents",
    status: "Published",
    updated: "1 week ago",
  },
  {
    id: "kb3",
    title: "Clinic working hours and emergency contacts",
    category: "Clinic Policies",
    status: "Under Review",
    updated: "Today",
  },
  {
    id: "kb4",
    title: "Medication timing — general guidance",
    category: "Medications",
    status: "Draft",
    updated: "Yesterday",
  },
];

export const DEMO_LOGS = [
  {
    id: "l1",
    time: "10:42 AM",
    couple: "Priya + Rahul",
    workflow: "Medication Reminder",
    action: "WhatsApp sent",
    result: "Success",
  },
  {
    id: "l2",
    time: "10:31 AM",
    couple: "Anjali + Arjun",
    workflow: "Report Collection",
    action: "Reminder sent",
    result: "Success",
  },
  {
    id: "l3",
    time: "10:22 AM",
    couple: "Sneha + Kiran",
    workflow: "FET Follow-up",
    action: "AI escalation",
    result: "Staff required",
  },
];

export const DEMO_EXECUTION_TIMELINE = [
  { time: "09:00 AM", title: "Care Task Created", detail: "Monitoring Scan" },
  { time: "09:00 AM", title: "Workflow Started", detail: "IVF Monitoring Follow-up" },
  { time: "09:01 AM", title: "WhatsApp Sent", detail: "Appointment reminder template" },
  { time: "09:08 AM", title: "Patient Viewed", detail: "Message delivered & read" },
  { time: "09:12 AM", title: "Patient Responded", detail: "Confirmed attendance" },
  { time: "09:12 AM", title: "Task Updated", detail: "Awaiting scan report" },
  { time: "09:13 AM", title: "Workflow Checkpoint", detail: "Waiting for document upload" },
];

export const TEMPLATE_VARIABLES = [
  "patient_name",
  "doctor_name",
  "appointment_date",
  "appointment_time",
  "clinic_name",
  "payment_amount",
  "care_stage",
  "medicine_name",
  "medicine_time",
] as const;
