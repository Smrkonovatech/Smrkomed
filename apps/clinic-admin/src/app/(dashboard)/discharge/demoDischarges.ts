export type BlockerStatus = "CLEARED" | "PENDING" | "BLOCKED" | "NOT_APPLICABLE";

export type Blocker = {
  id: string;
  category: "CLINICAL" | "INVESTIGATIONS" | "MEDICATION" | "DOCUMENTS" | "BILLING" | "INSURANCE" | "PHARMACY" | "FOLLOW_UP" | "DOCTOR_REVIEW";
  label: string;
  reason?: string;
  responsibleRole: string;
  status: BlockerStatus;
};

export type DischargeStatus = "PREPARING" | "READY_FOR_DOCTOR_REVIEW" | "DOCTOR_APPROVED" | "DISCHARGED";

export type DemoPatient = {
  id: string;
  name: string;
  mrn: string;
  age: number;
  treatment: string;
  doctor: string;
  
  status: DischargeStatus;
  
  // Readiness
  readinessComplete: number;
  readinessTotal: number;
  estimatedWindow: string;
  
  // AI Prep
  aiCoverage: number;
  
  blockers: Blocker[];
  
  // Simple timeline tracking
  timeline: {
    treatmentCompleted: { status: "DONE" | "PENDING", time?: string, by?: string };
    dischargeInitiated: { status: "DONE" | "PENDING", time?: string, by?: string };
    informationPrepared: { status: "DONE" | "PENDING", time?: string, by?: string };
    clearances: { status: "DONE" | "PENDING", time?: string, by?: string };
    doctorReview: { status: "DONE" | "PENDING", time?: string, by?: string };
    doctorApproved: { status: "DONE" | "PENDING", time?: string, by?: string };
    discharged: { status: "DONE" | "PENDING", time?: string, by?: string };
  };
};

export const INITIAL_DEMO_DATA: DemoPatient[] = [
  {
    id: "pat_1",
    name: "Ananya Sharma",
    mrn: "10452",
    age: 32,
    treatment: "IVF Procedure",
    doctor: "Dr. Shreya",
    status: "PREPARING",
    readinessComplete: 7,
    readinessTotal: 9,
    estimatedWindow: "Today • 4:30 PM - 5:00 PM",
    aiCoverage: 94,
    blockers: [
      { id: "b1", category: "CLINICAL", label: "Clinical", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b2", category: "INVESTIGATIONS", label: "Investigations", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b3", category: "MEDICATION", label: "Medication", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b4", category: "DOCUMENTS", label: "Documents", status: "CLEARED", responsibleRole: "Coordinator" },
      { id: "b5", category: "BILLING", label: "Billing", reason: "₹4,500 pending payment", status: "BLOCKED", responsibleRole: "Billing Team" },
      { id: "b6", category: "INSURANCE", label: "Insurance", status: "CLEARED", responsibleRole: "Insurance Team" },
      { id: "b7", category: "PHARMACY", label: "Pharmacy", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b8", category: "FOLLOW_UP", label: "Follow-up", reason: "Follow-up appointment not prepared", status: "PENDING", responsibleRole: "Coordinator" },
      { id: "b9", category: "DOCTOR_REVIEW", label: "Doctor Review", reason: "Pending final review", status: "PENDING", responsibleRole: "Doctor" },
    ],
    timeline: {
      treatmentCompleted: { status: "DONE", time: "18 Sep, 10:00 AM", by: "Dr. Shreya" },
      dischargeInitiated: { status: "DONE", time: "18 Sep, 10:15 AM", by: "Nurse Priya" },
      informationPrepared: { status: "DONE", time: "18 Sep, 10:20 AM", by: "SmrkoMed AI" },
      clearances: { status: "PENDING" },
      doctorReview: { status: "PENDING" },
      doctorApproved: { status: "PENDING" },
      discharged: { status: "PENDING" }
    }
  },
  {
    id: "pat_2",
    name: "Rahul Mehta",
    mrn: "10461",
    age: 35,
    treatment: "Varicocele Repair",
    doctor: "Dr. Verma",
    status: "PREPARING",
    readinessComplete: 8,
    readinessTotal: 9,
    estimatedWindow: "Today • 2:00 PM - 2:30 PM",
    aiCoverage: 88,
    blockers: [
      { id: "b1", category: "CLINICAL", label: "Clinical", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b2", category: "INVESTIGATIONS", label: "Investigations", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b3", category: "MEDICATION", label: "Medication", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b4", category: "DOCUMENTS", label: "Documents", status: "CLEARED", responsibleRole: "Coordinator" },
      { id: "b5", category: "BILLING", label: "Billing", status: "CLEARED", responsibleRole: "Billing Team" },
      { id: "b6", category: "INSURANCE", label: "Insurance", status: "CLEARED", responsibleRole: "Insurance Team" },
      { id: "b7", category: "PHARMACY", label: "Pharmacy", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b8", category: "FOLLOW_UP", label: "Follow-up", status: "CLEARED", responsibleRole: "Coordinator" },
      { id: "b9", category: "DOCTOR_REVIEW", label: "Doctor Review", reason: "Pending final review", status: "PENDING", responsibleRole: "Doctor" },
    ],
    timeline: {
      treatmentCompleted: { status: "DONE", time: "18 Sep, 8:00 AM", by: "Dr. Verma" },
      dischargeInitiated: { status: "DONE", time: "18 Sep, 9:00 AM", by: "Nurse Priya" },
      informationPrepared: { status: "DONE", time: "18 Sep, 9:05 AM", by: "SmrkoMed AI" },
      clearances: { status: "DONE", time: "18 Sep, 12:30 PM", by: "Admin Team" },
      doctorReview: { status: "PENDING" },
      doctorApproved: { status: "PENDING" },
      discharged: { status: "PENDING" }
    }
  },
  {
    id: "pat_3",
    name: "Meera Iyer",
    mrn: "10472",
    age: 29,
    treatment: "Diagnostic Hysteroscopy",
    doctor: "Dr. Shreya",
    status: "READY_FOR_DOCTOR_REVIEW",
    readinessComplete: 8,
    readinessTotal: 9,
    estimatedWindow: "Tomorrow • 10:00 AM",
    aiCoverage: 98,
    blockers: [
      { id: "b1", category: "CLINICAL", label: "Clinical", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b2", category: "INVESTIGATIONS", label: "Investigations", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b3", category: "MEDICATION", label: "Medication", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b4", category: "DOCUMENTS", label: "Documents", status: "CLEARED", responsibleRole: "Coordinator" },
      { id: "b5", category: "BILLING", label: "Billing", status: "CLEARED", responsibleRole: "Billing Team" },
      { id: "b6", category: "INSURANCE", label: "Insurance", status: "CLEARED", responsibleRole: "Insurance Team" },
      { id: "b7", category: "PHARMACY", label: "Pharmacy", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b8", category: "FOLLOW_UP", label: "Follow-up", status: "CLEARED", responsibleRole: "Coordinator" },
      { id: "b9", category: "DOCTOR_REVIEW", label: "Doctor Review", reason: "Awaiting doctor sign-off", status: "PENDING", responsibleRole: "Doctor" },
    ],
    timeline: {
      treatmentCompleted: { status: "DONE", time: "17 Sep, 4:00 PM", by: "Dr. Shreya" },
      dischargeInitiated: { status: "DONE", time: "17 Sep, 5:00 PM", by: "Nurse Priya" },
      informationPrepared: { status: "DONE", time: "17 Sep, 5:05 PM", by: "SmrkoMed AI" },
      clearances: { status: "DONE", time: "18 Sep, 11:30 AM", by: "Admin Team" },
      doctorReview: { status: "PENDING" },
      doctorApproved: { status: "PENDING" },
      discharged: { status: "PENDING" }
    }
  },
  {
    id: "pat_4",
    name: "Priya Nair",
    mrn: "10488",
    age: 31,
    treatment: "IUI Procedure",
    doctor: "Dr. Rao",
    status: "DISCHARGED",
    readinessComplete: 9,
    readinessTotal: 9,
    estimatedWindow: "Discharged",
    aiCoverage: 100,
    blockers: [
      { id: "b1", category: "CLINICAL", label: "Clinical", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b2", category: "INVESTIGATIONS", label: "Investigations", status: "CLEARED", responsibleRole: "Doctor" },
      { id: "b3", category: "MEDICATION", label: "Medication", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b4", category: "DOCUMENTS", label: "Documents", status: "CLEARED", responsibleRole: "Coordinator" },
      { id: "b5", category: "BILLING", label: "Billing", status: "CLEARED", responsibleRole: "Billing Team" },
      { id: "b6", category: "INSURANCE", label: "Insurance", status: "CLEARED", responsibleRole: "Insurance Team" },
      { id: "b7", category: "PHARMACY", label: "Pharmacy", status: "CLEARED", responsibleRole: "Pharmacist" },
      { id: "b8", category: "FOLLOW_UP", label: "Follow-up", status: "CLEARED", responsibleRole: "Coordinator" },
      { id: "b9", category: "DOCTOR_REVIEW", label: "Doctor Review", status: "CLEARED", responsibleRole: "Doctor" },
    ],
    timeline: {
      treatmentCompleted: { status: "DONE", time: "17 Sep, 9:00 AM", by: "Dr. Rao" },
      dischargeInitiated: { status: "DONE", time: "17 Sep, 10:00 AM", by: "Nurse Priya" },
      informationPrepared: { status: "DONE", time: "17 Sep, 10:05 AM", by: "SmrkoMed AI" },
      clearances: { status: "DONE", time: "17 Sep, 12:30 PM", by: "Admin Team" },
      doctorReview: { status: "DONE", time: "17 Sep, 1:00 PM", by: "Dr. Rao" },
      doctorApproved: { status: "DONE", time: "17 Sep, 1:05 PM", by: "Dr. Rao" },
      discharged: { status: "DONE", time: "17 Sep, 1:30 PM", by: "Admin Team" }
    }
  }
];
