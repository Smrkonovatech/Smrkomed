import type {
  InsuranceClaimStatus,
  InsuranceClaimType,
  InsuranceEligibilityStatus,
  InsurancePolicyStatus,
  PrismaClient,
} from "@prisma/client";
import { Prisma } from "@prisma/client";

export type StaffMap = Record<string, { id: string; name: string }>;

function day(offset: number, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function money(n: number) {
  return new Prisma.Decimal(n);
}

const DEMO_PROVIDERS = [
  { name: "Star Health", supportEmail: "support@starhealth.demo", supportPhone: "+91 1800 425 2255" },
  { name: "Niva Bupa", supportEmail: "support@nivabupa.demo", supportPhone: "+91 1860 500 8888" },
  { name: "Aditya Birla Health", supportEmail: "support@adityabirla.demo", supportPhone: "+91 1800 270 7000" },
  { name: "ManipalCigna", supportEmail: "support@manipalcigna.demo", supportPhone: "+91 1800 102 4462" },
  { name: "ACKO", supportEmail: "support@acko.demo", supportPhone: "+91 1800 266 2256" },
  { name: "Bajaj General", supportEmail: "support@bajajgeneral.demo", supportPhone: "+91 1800 209 0144" },
  { name: "HDFC ERGO", supportEmail: "support@hdfcergo.demo", supportPhone: "+91 022 6234 6234" },
  { name: "ICICI Lombard", supportEmail: "support@icicilombard.demo", supportPhone: "+91 1800 2666" },
] as const;

const DEMO_TPAS = [
  { name: "MediAssist Demo", email: "ops@mediassist.demo", phone: "+91 80 4001 1001", contact: "Demo Desk" },
  { name: "HealthIndia TPA Demo", email: "ops@healthindia.demo", phone: "+91 22 4002 2002", contact: "Claims Desk" },
  { name: "Paramount Demo", email: "ops@paramount.demo", phone: "+91 11 4003 3003", contact: "Pre-auth Desk" },
  { name: "Vidal Demo", email: "ops@vidal.demo", phone: "+91 40 4004 4004", contact: "Hospital Desk" },
  { name: "Family Health Demo", email: "ops@familyhealth.demo", phone: "+91 44 4005 5005", contact: "Coordinator Desk" },
] as const;

type PolicySeed = {
  key: string;
  providerIdx: number;
  tpaIdx: number | null;
  policyName: string;
  policyNumber: string;
  status: InsurancePolicyStatus;
  eligibilityStatus: InsuranceEligibilityStatus;
  sumInsured: number;
  availableCoverage: number;
  networkStatus?: string;
  cashlessStatus?: string;
  startOffset?: number;
  expiryOffset?: number;
  notes?: string;
};

const POLICY_SEEDS: PolicySeed[] = [
  {
    key: "p1",
    providerIdx: 0,
    tpaIdx: 0,
    policyName: "Star Comprehensive Care",
    policyNumber: "STAR-DEMO-1001",
    status: "ACTIVE",
    eligibilityStatus: "PENDING",
    sumInsured: 500000,
    availableCoverage: 480000,
    networkStatus: "NETWORK",
    cashlessStatus: "ELIGIBLE",
    startOffset: -200,
    expiryOffset: 165,
  },
  {
    key: "p2",
    providerIdx: 1,
    tpaIdx: 1,
    policyName: "Niva Bupa Reassure",
    policyNumber: "NIVA-DEMO-1002",
    status: "ACTIVE",
    eligibilityStatus: "VERIFIED",
    sumInsured: 1000000,
    availableCoverage: 920000,
    networkStatus: "NETWORK",
    cashlessStatus: "ELIGIBLE",
    startOffset: -300,
    expiryOffset: 65,
  },
  {
    key: "p3",
    providerIdx: 2,
    tpaIdx: 2,
    policyName: "Aditya Birla Activ Health",
    policyNumber: "ABHI-DEMO-1003",
    status: "ACTIVE",
    eligibilityStatus: "VERIFIED",
    sumInsured: 750000,
    availableCoverage: 700000,
    networkStatus: "NETWORK",
    cashlessStatus: "PENDING_VERIFICATION",
    startOffset: -120,
    expiryOffset: 245,
  },
  {
    key: "p4",
    providerIdx: 3,
    tpaIdx: 3,
    policyName: "ManipalCigna ProHealth",
    policyNumber: "MCIG-DEMO-1004",
    status: "ACTIVE",
    eligibilityStatus: "VERIFIED",
    sumInsured: 800000,
    availableCoverage: 650000,
    networkStatus: "NETWORK",
    cashlessStatus: "ELIGIBLE",
    startOffset: -400,
    expiryOffset: 30,
  },
  {
    key: "p5",
    providerIdx: 4,
    tpaIdx: null,
    policyName: "ACKO Platinum Health",
    policyNumber: "ACKO-DEMO-1005",
    status: "PENDING_VERIFICATION",
    eligibilityStatus: "PENDING",
    sumInsured: 600000,
    availableCoverage: 600000,
    networkStatus: "UNKNOWN",
    cashlessStatus: "UNKNOWN",
    startOffset: -10,
    expiryOffset: 355,
    notes: "Policy card uploaded; awaiting eligibility check.",
  },
  {
    key: "p6",
    providerIdx: 5,
    tpaIdx: 4,
    policyName: "Bajaj Health Guard",
    policyNumber: "BAJAJ-DEMO-1006",
    status: "EXPIRED",
    eligibilityStatus: "FAILED",
    sumInsured: 400000,
    availableCoverage: 0,
    networkStatus: "NETWORK",
    cashlessStatus: "NOT_ELIGIBLE",
    startOffset: -800,
    expiryOffset: -30,
    notes: "Policy expired — renew before cashless admission.",
  },
  {
    key: "p7",
    providerIdx: 6,
    tpaIdx: 0,
    policyName: "HDFC ERGO Optima Secure",
    policyNumber: "HDFC-DEMO-1007",
    status: "ACTIVE",
    eligibilityStatus: "VERIFIED",
    sumInsured: 1500000,
    availableCoverage: 1400000,
    networkStatus: "NETWORK",
    cashlessStatus: "ELIGIBLE",
    startOffset: -90,
    expiryOffset: 275,
  },
  {
    key: "p8",
    providerIdx: 7,
    tpaIdx: 1,
    policyName: "ICICI Lombard Complete Health",
    policyNumber: "ICICI-DEMO-1008",
    status: "ACTIVE",
    eligibilityStatus: "VERIFIED",
    sumInsured: 900000,
    availableCoverage: 850000,
    networkStatus: "NETWORK",
    cashlessStatus: "ELIGIBLE",
    startOffset: -180,
    expiryOffset: 185,
  },
  {
    key: "p9",
    providerIdx: 0,
    tpaIdx: 2,
    policyName: "Star Family Floater",
    policyNumber: "STAR-DEMO-1009",
    status: "ACTIVE",
    eligibilityStatus: "NOT_VERIFIED",
    sumInsured: 500000,
    availableCoverage: 500000,
    networkStatus: "NETWORK",
    cashlessStatus: "PENDING_VERIFICATION",
    startOffset: -45,
    expiryOffset: 320,
  },
  {
    key: "p10",
    providerIdx: 1,
    tpaIdx: 3,
    policyName: "Niva Bupa Aspire",
    policyNumber: "NIVA-DEMO-1010",
    status: "PENDING_VERIFICATION",
    eligibilityStatus: "PENDING",
    sumInsured: 700000,
    availableCoverage: 700000,
    networkStatus: "UNKNOWN",
    cashlessStatus: "UNKNOWN",
    startOffset: -5,
    expiryOffset: 360,
  },
];

type ClaimSeed = {
  claimNumber: string;
  policyKey: string;
  claimType: InsuranceClaimType;
  status: InsuranceClaimStatus;
  treatmentLabel: string;
  procedureLabel: string;
  diagnosisCategory: string;
  amountRequested: number;
  amountApproved?: number;
  amountRejected?: number;
  amountPaid?: number;
  patientResponsibility?: number;
  priority?: string;
  dueOffset?: number | null;
  notes?: string;
  events: Array<{ action: string; status?: string; note?: string; daysAgo: number }>;
  query?: {
    message: string;
    status: "OPEN" | "RESOLVED";
    responseMessage?: string;
    dueOffset?: number;
    taskTitle: string;
  };
  payment?: {
    amount: number;
    method: string;
    reference: string;
    notes?: string;
    daysAgo: number;
  };
  closedDaysAgo?: number;
  preauthDaysAgo?: number;
};

const CLAIM_SEEDS: ClaimSeed[] = [
  {
    claimNumber: "SMR-2026-00101",
    policyKey: "p1",
    claimType: "PRE_AUTH",
    status: "DRAFT",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "OPU Pre-authorization",
    diagnosisCategory: "Infertility",
    amountRequested: 185000,
    priority: "NORMAL",
    notes: "Active policy — eligibility still pending verification before submit.",
    events: [
      { action: "Claim Created", status: "DRAFT", note: "Draft pre-auth opened for OPU.", daysAgo: 1 },
      { action: "Eligibility Check Started", status: "DRAFT", note: "Waiting on insurer eligibility response.", daysAgo: 0 },
    ],
  },
  {
    claimNumber: "SMR-2026-00102",
    policyKey: "p2",
    claimType: "PRE_AUTH",
    status: "UNDER_REVIEW",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "Embryo Transfer Pre-auth",
    diagnosisCategory: "Infertility",
    amountRequested: 95000,
    priority: "HIGH",
    dueOffset: 2,
    preauthDaysAgo: 3,
    notes: "Pre-auth submitted and under insurer review.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 4 },
      { action: "Pre-auth Submitted", status: "SUBMITTED", note: "Sent to TPA for cashless pre-auth.", daysAgo: 3 },
      { action: "Under Review", status: "UNDER_REVIEW", note: "Insurer reviewing medical necessity.", daysAgo: 2 },
    ],
  },
  {
    claimNumber: "SMR-2026-00103",
    policyKey: "p4",
    claimType: "PRE_AUTH",
    status: "APPROVED",
    treatmentLabel: "IUI Cycle",
    procedureLabel: "IUI Procedure Pre-auth",
    diagnosisCategory: "Infertility",
    amountRequested: 45000,
    amountApproved: 45000,
    priority: "NORMAL",
    preauthDaysAgo: 8,
    notes: "Pre-auth approved — proceed with cashless admission.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 10 },
      { action: "Pre-auth Submitted", status: "SUBMITTED", daysAgo: 8 },
      { action: "Pre-auth Approved", status: "APPROVED", note: "Full amount approved for IUI.", daysAgo: 5 },
    ],
  },
  {
    claimNumber: "SMR-2026-00104",
    policyKey: "p7",
    claimType: "CASHLESS",
    status: "QUERY",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "ICSI + Blastocyst Culture",
    diagnosisCategory: "Infertility",
    amountRequested: 275000,
    priority: "HIGH",
    dueOffset: 1,
    preauthDaysAgo: 6,
    notes: "Insurer raised a query — documents requested.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 7 },
      { action: "Pre-auth Submitted", status: "SUBMITTED", daysAgo: 6 },
      { action: "Query Received", status: "QUERY", note: "Missing stimulation protocol details.", daysAgo: 1 },
    ],
    query: {
      message: "Please share stimulation protocol and day-5 embryo grading report for pre-auth review.",
      status: "OPEN",
      dueOffset: 1,
      taskTitle: "Respond to insurance query — ICSI pre-auth",
    },
  },
  {
    claimNumber: "SMR-2026-00105",
    policyKey: "p8",
    claimType: "CASHLESS",
    status: "APPROVED",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "FET Cycle",
    diagnosisCategory: "Infertility",
    amountRequested: 120000,
    amountApproved: 110000,
    patientResponsibility: 10000,
    priority: "NORMAL",
    preauthDaysAgo: 14,
    notes: "Query resolved — pre-auth approved with co-pay.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 18 },
      { action: "Pre-auth Submitted", status: "SUBMITTED", daysAgo: 14 },
      { action: "Query Received", status: "QUERY", note: "Need FET indication letter.", daysAgo: 12 },
      { action: "Query Resolved", status: "APPROVED", note: "Indication letter uploaded; approved.", daysAgo: 9 },
    ],
    query: {
      message: "Kindly upload treating doctor FET indication letter and last AMH report.",
      status: "RESOLVED",
      responseMessage: "Uploaded FET indication letter and AMH (12/2025) via portal.",
      dueOffset: -2,
      taskTitle: "Resolved insurance query — FET pre-auth",
    },
  },
  {
    claimNumber: "SMR-2026-00106",
    policyKey: "p2",
    claimType: "REIMBURSEMENT",
    status: "PARTIALLY_APPROVED",
    treatmentLabel: "Diagnostics",
    procedureLabel: "Fertility Workup Panel",
    diagnosisCategory: "Diagnostics",
    amountRequested: 38000,
    amountApproved: 25000,
    amountRejected: 13000,
    patientResponsibility: 13000,
    priority: "NORMAL",
    preauthDaysAgo: 20,
    notes: "Partial approval — some lab items excluded as non-payable.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 22 },
      { action: "Claim Submitted", status: "SUBMITTED", daysAgo: 20 },
      { action: "Partially Approved", status: "PARTIALLY_APPROVED", note: "₹13,000 rejected (non-payable labs).", daysAgo: 10 },
    ],
  },
  {
    claimNumber: "SMR-2026-00107",
    policyKey: "p3",
    claimType: "PRE_AUTH",
    status: "REJECTED",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "Donor Egg IVF",
    diagnosisCategory: "Infertility",
    amountRequested: 420000,
    amountApproved: 0,
    amountRejected: 420000,
    priority: "HIGH",
    preauthDaysAgo: 12,
    notes: "Rejected — donor egg IVF excluded under policy terms.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 15 },
      { action: "Pre-auth Submitted", status: "SUBMITTED", daysAgo: 12 },
      { action: "Claim Rejected", status: "REJECTED", note: "Exclusion: donor gamete procedures.", daysAgo: 8 },
    ],
  },
  {
    claimNumber: "SMR-2026-00108",
    policyKey: "p4",
    claimType: "CASHLESS",
    status: "FINAL_BILL_PENDING",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "OPU + ICSI",
    diagnosisCategory: "Infertility",
    amountRequested: 240000,
    amountApproved: 220000,
    priority: "NORMAL",
    dueOffset: 3,
    preauthDaysAgo: 16,
    notes: "Discharge pending — final bill to be submitted to TPA.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 18 },
      { action: "Pre-auth Approved", status: "APPROVED", daysAgo: 14 },
      { action: "Admission Confirmed", status: "APPROVED", daysAgo: 5 },
      { action: "Final Bill Pending", status: "FINAL_BILL_PENDING", note: "Awaiting finance final bill pack.", daysAgo: 1 },
    ],
  },
  {
    claimNumber: "SMR-2026-00109",
    policyKey: "p7",
    claimType: "CASHLESS",
    status: "PAYMENT_PENDING",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "Embryo Transfer",
    diagnosisCategory: "Infertility",
    amountRequested: 135000,
    amountApproved: 130000,
    patientResponsibility: 5000,
    priority: "NORMAL",
    dueOffset: 5,
    preauthDaysAgo: 25,
    notes: "Final bill approved — awaiting insurer remittance.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 28 },
      { action: "Pre-auth Approved", status: "APPROVED", daysAgo: 24 },
      { action: "Final Bill Submitted", status: "FINAL_BILL_PENDING", daysAgo: 8 },
      { action: "Payment Pending", status: "PAYMENT_PENDING", note: "TPA confirmed settlement in progress.", daysAgo: 2 },
    ],
  },
  {
    claimNumber: "SMR-2026-00110",
    policyKey: "p8",
    claimType: "CASHLESS",
    status: "CLOSED",
    treatmentLabel: "IUI Cycle",
    procedureLabel: "IUI + Monitoring",
    diagnosisCategory: "Infertility",
    amountRequested: 52000,
    amountApproved: 50000,
    amountPaid: 50000,
    patientResponsibility: 2000,
    priority: "NORMAL",
    preauthDaysAgo: 40,
    closedDaysAgo: 5,
    notes: "Closed after full insurer payment received.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 45 },
      { action: "Pre-auth Approved", status: "APPROVED", daysAgo: 40 },
      { action: "Final Bill Submitted", status: "FINAL_BILL_PENDING", daysAgo: 20 },
      { action: "Payment Received", status: "PAID", note: "UTR confirmed.", daysAgo: 6 },
      { action: "Claim Closed", status: "CLOSED", daysAgo: 5 },
    ],
    payment: {
      amount: 50000,
      method: "NEFT",
      reference: "UTR-DEMO-IUI-00110",
      notes: "Full approved amount settled.",
      daysAgo: 6,
    },
  },
  {
    claimNumber: "SMR-2026-00111",
    policyKey: "p3",
    claimType: "CASHLESS",
    status: "SUBMITTED",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "Stimulation Package",
    diagnosisCategory: "Infertility",
    amountRequested: 160000,
    priority: "HIGH",
    dueOffset: 0,
    notes: "Cashless verification required before admission — card/network check pending.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 2 },
      { action: "Cashless Verification Required", status: "SUBMITTED", note: "Confirm network hospital status and cashless eligibility.", daysAgo: 1 },
    ],
  },
  {
    claimNumber: "SMR-2026-00112",
    policyKey: "p6",
    claimType: "REIMBURSEMENT",
    status: "REJECTED",
    treatmentLabel: "Consult + Labs",
    procedureLabel: "Follow-up Evaluation",
    diagnosisCategory: "Infertility",
    amountRequested: 18000,
    amountRejected: 18000,
    priority: "NORMAL",
    notes: "Policy expired related — claim cannot proceed until renewal.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 6 },
      { action: "Claim Rejected", status: "REJECTED", note: "Policy expired prior to treatment date.", daysAgo: 4 },
    ],
  },
  {
    claimNumber: "SMR-2026-00113",
    policyKey: "p9",
    claimType: "PRE_AUTH",
    status: "QUERY",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "OPU Pre-authorization",
    diagnosisCategory: "Infertility",
    amountRequested: 195000,
    priority: "HIGH",
    dueOffset: 1,
    notes: "Missing document — insurance card scan and ID proof required.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 3 },
      { action: "Query Received", status: "QUERY", note: "Missing policy card and patient ID.", daysAgo: 1 },
    ],
    query: {
      message: "Upload clear scan of insurance card (both sides) and government ID of primary member.",
      status: "OPEN",
      dueOffset: 1,
      taskTitle: "Upload missing insurance documents",
    },
  },
  {
    claimNumber: "SMR-2026-00114",
    policyKey: "p5",
    claimType: "PRE_AUTH",
    status: "UNDER_REVIEW",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "Cycle Start Pre-auth",
    diagnosisCategory: "Infertility",
    amountRequested: 210000,
    priority: "HIGH",
    dueOffset: 0,
    notes: "Needs coordinator action today — follow up with TPA on pending verification.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 2 },
      { action: "Coordinator Action Required", status: "UNDER_REVIEW", note: "Call TPA desk for same-day eligibility clearance.", daysAgo: 0 },
    ],
  },
  {
    claimNumber: "SMR-2026-00115",
    policyKey: "p7",
    claimType: "CASHLESS",
    status: "CLOSED",
    treatmentLabel: "IVF Cycle",
    procedureLabel: "Full IVF Package",
    diagnosisCategory: "Infertility",
    amountRequested: 350000,
    amountApproved: 350000,
    amountPaid: 350000,
    patientResponsibility: 0,
    priority: "NORMAL",
    preauthDaysAgo: 55,
    closedDaysAgo: 12,
    notes: "Successfully completed — full cashless settlement closed.",
    events: [
      { action: "Claim Created", status: "DRAFT", daysAgo: 60 },
      { action: "Pre-auth Approved", status: "APPROVED", daysAgo: 55 },
      { action: "Final Bill Submitted", status: "FINAL_BILL_PENDING", daysAgo: 25 },
      { action: "Payment Received", status: "PAID", note: "Full settlement credited.", daysAgo: 14 },
      { action: "Claim Closed", status: "CLOSED", daysAgo: 12 },
    ],
    payment: {
      amount: 350000,
      method: "NEFT",
      reference: "UTR-DEMO-IVF-00115",
      notes: "Full payment for completed IVF package.",
      daysAgo: 14,
    },
  },
];

async function wipeClinicInsurance(prisma: PrismaClient, clinicId: string) {
  const linkedTasks = await prisma.insuranceQuery.findMany({
    where: { clinicId, careTaskId: { not: null } },
    select: { careTaskId: true },
  });
  const careTaskIds = linkedTasks
    .map((q) => q.careTaskId)
    .filter((id): id is string => Boolean(id));

  await prisma.insuranceClaimEvent.deleteMany({ where: { clinicId } });
  await prisma.insurancePayment.deleteMany({ where: { clinicId } });
  await prisma.insuranceQuery.deleteMany({ where: { clinicId } });
  await prisma.insuranceClaimDocument.deleteMany({
    where: { claim: { clinicId } },
  });
  await prisma.insuranceClaim.deleteMany({ where: { clinicId } });
  await prisma.insurancePolicy.deleteMany({ where: { clinicId } });
  await prisma.insuranceTpa.deleteMany({ where: { clinicId } });
  await prisma.insuranceProvider.deleteMany({ where: { clinicId } });

  if (careTaskIds.length > 0) {
    await prisma.taskAssignment.deleteMany({ where: { careTaskId: { in: careTaskIds } } });
    await prisma.careTask.deleteMany({ where: { id: { in: careTaskIds } } });
  }
}

/** Idempotent insurance demo catalogue for ABC Fertility (and similar clinic seeds). */
export async function seedClinicInsuranceData(input: {
  prisma: PrismaClient;
  clinicId: string;
  users: StaffMap;
  clinicName?: string;
  /** When true, wipe insurance rows and reseed. Default: skip when demo volume already present. */
  force?: boolean;
}) {
  const { prisma, clinicId, users } = input;
  const clinicName = input.clinicName ?? "ABC Fertility Centre";

  const [claimCount, providerCount] = await Promise.all([
    prisma.insuranceClaim.count({ where: { clinicId } }),
    prisma.insuranceProvider.count({ where: { clinicId } }),
  ]);

  const couples = await prisma.couple.findMany({
    where: { clinicId },
    include: {
      primaryPatient: true,
      partnerPatient: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!input.force && claimCount >= 15 && providerCount >= 8) {
    return {
      skipped: true as const,
      reason: "Insurance demo data already present",
      providers: providerCount,
      claims: claimCount,
    };
  }

  // Providers-only seed when clinical couples are not present yet.
  if (!input.force && couples.length === 0 && providerCount >= 8) {
    return {
      skipped: true as const,
      reason: "Providers present; claims need clinical couples (run full db:seed)",
      providers: providerCount,
      claims: claimCount,
    };
  }

  await wipeClinicInsurance(prisma, clinicId);

  // Always seed providers/TPAs so admin screens are usable even before clinical couples exist.
  if (couples.length === 0) {
    await Promise.all(
      DEMO_PROVIDERS.map((p) =>
        prisma.insuranceProvider.create({
          data: {
            clinicId,
            name: p.name,
            supportEmail: p.supportEmail,
            supportPhone: p.supportPhone,
            supportContact: `${p.name} Demo Desk`,
            notes: "Demo / Manual — no live insurer API connected.",
            isActive: true,
            integrationMode: "MANUAL_DEMO",
          },
        }),
      ),
    );
    await Promise.all(
      DEMO_TPAS.map((t) =>
        prisma.insuranceTpa.create({
          data: {
            clinicId,
            name: t.name,
            contact: t.contact,
            email: t.email,
            phone: t.phone,
            notes: "Demo TPA — Manual workflow only.",
            isActive: true,
          },
        }),
      ),
    );
    return {
      skipped: true as const,
      reason: "Providers/TPAs seeded; claims need clinical couples (run full db:seed)",
      providers: DEMO_PROVIDERS.length,
      tpas: DEMO_TPAS.length,
      claims: 0,
    };
  }

  const admin = users["admin@abcfertility.demo"]!;
  const meera = users["meera@abcfertility.demo"] ?? admin;
  const kavya = users["kavya@abcfertility.demo"] ?? meera;
  const doctor = users["ananya@abcfertility.demo"] ?? admin;
  const coordinators = [meera, kavya];

  const providers = await Promise.all(
    DEMO_PROVIDERS.map((p) =>
      prisma.insuranceProvider.create({
        data: {
          clinicId,
          name: p.name,
          supportEmail: p.supportEmail,
          supportPhone: p.supportPhone,
          supportContact: `${p.name} Demo Desk`,
          notes: "Demo / Manual — no live insurer API connected.",
          isActive: true,
          integrationMode: "MANUAL_DEMO",
        },
      }),
    ),
  );

  const tpas = await Promise.all(
    DEMO_TPAS.map((t) =>
      prisma.insuranceTpa.create({
        data: {
          clinicId,
          name: t.name,
          contact: t.contact,
          email: t.email,
          phone: t.phone,
          notes: "Demo / Manual TPA contact for clinic insurance workflows.",
          isActive: true,
        },
      }),
    ),
  );

  const policyByKey: Record<string, { id: string; providerId: string; tpaId: string | null; patientId: string; coupleId: string }> =
    {};

  for (let i = 0; i < POLICY_SEEDS.length; i++) {
    const spec = POLICY_SEEDS[i]!;
    const couple = couples[i % couples.length]!;
    const patient =
      i % 2 === 0
        ? couple.primaryPatient
        : (couple.partnerPatient ?? couple.primaryPatient);
    const holderName = `${patient.firstName} ${patient.lastName}`;
    const provider = providers[spec.providerIdx]!;
    const tpa = spec.tpaIdx === null ? null : tpas[spec.tpaIdx]!;

    const policy = await prisma.insurancePolicy.create({
      data: {
        clinicId,
        patientId: patient.id,
        coupleId: couple.id,
        providerId: provider.id,
        tpaId: tpa?.id ?? null,
        policyName: spec.policyName,
        policyNumber: spec.policyNumber,
        memberId: `MEM-${String(1000 + i + 1)}`,
        policyHolderName: holderName,
        relationshipToHolder: "SELF",
        startDate: day(spec.startOffset ?? -180),
        expiryDate: day(spec.expiryOffset ?? 180),
        sumInsured: money(spec.sumInsured),
        availableCoverage: money(spec.availableCoverage),
        networkStatus: spec.networkStatus ?? "NETWORK",
        cashlessStatus: spec.cashlessStatus ?? "ELIGIBLE",
        status: spec.status,
        eligibilityStatus: spec.eligibilityStatus,
        notes: spec.notes ?? `Demo policy for ${clinicName}.`,
      },
    });

    policyByKey[spec.key] = {
      id: policy.id,
      providerId: provider.id,
      tpaId: tpa?.id ?? null,
      patientId: patient.id,
      coupleId: couple.id,
    };
  }

  let queryCount = 0;
  let paymentCount = 0;
  let eventCount = 0;
  let careTaskCount = 0;

  for (let i = 0; i < CLAIM_SEEDS.length; i++) {
    const spec = CLAIM_SEEDS[i]!;
    const policy = policyByKey[spec.policyKey]!;
    const coordinator = coordinators[i % coordinators.length]!;
    const couple = couples.find((c) => c.id === policy.coupleId) ?? couples[0]!;

    const claim = await prisma.insuranceClaim.create({
      data: {
        clinicId,
        claimNumber: spec.claimNumber,
        patientId: policy.patientId,
        coupleId: policy.coupleId,
        policyId: policy.id,
        providerId: policy.providerId,
        tpaId: policy.tpaId,
        claimType: spec.claimType,
        status: spec.status,
        treatmentLabel: spec.treatmentLabel,
        procedureLabel: spec.procedureLabel,
        diagnosisCategory: spec.diagnosisCategory,
        expectedAdmissionDate: day(spec.dueOffset ?? 3),
        expectedDischargeDate: day((spec.dueOffset ?? 3) + 2),
        doctorName: doctor.name,
        assignedCoordinatorId: coordinator.id,
        amountRequested: money(spec.amountRequested),
        amountApproved: money(spec.amountApproved ?? 0),
        amountRejected: money(spec.amountRejected ?? 0),
        amountPaid: money(spec.amountPaid ?? 0),
        patientResponsibility: money(spec.patientResponsibility ?? 0),
        priority: spec.priority ?? "NORMAL",
        dueDate: spec.dueOffset === null || spec.dueOffset === undefined ? null : day(spec.dueOffset),
        notes: spec.notes ?? null,
        preauthSubmittedAt: spec.preauthDaysAgo !== undefined ? day(-spec.preauthDaysAgo) : null,
        closedAt: spec.closedDaysAgo !== undefined ? day(-spec.closedDaysAgo) : null,
        createdAt: day(-(spec.events[0]?.daysAgo ?? 2)),
      },
    });

    for (const ev of spec.events) {
      await prisma.insuranceClaimEvent.create({
        data: {
          clinicId,
          claimId: claim.id,
          action: ev.action,
          status: ev.status ?? null,
          note: ev.note ?? null,
          actorId: coordinator.id,
          actorName: coordinator.name,
          createdAt: day(-ev.daysAgo),
        },
      });
      eventCount += 1;
    }

    if (spec.query) {
      const careTask = await prisma.careTask.create({
        data: {
          clinicId,
          coupleId: couple.id,
          title: spec.query.taskTitle,
          description: spec.query.message,
          category: "Insurance",
          status: spec.query.status === "RESOLVED" ? "COMPLETED" : "WAITING",
          priority: "HIGH",
          dueDate: day(spec.query.dueOffset ?? 1),
          createdById: coordinator.id,
          completedAt: spec.query.status === "RESOLVED" ? day(-1) : null,
        },
      });
      await prisma.taskAssignment.create({
        data: {
          careTaskId: careTask.id,
          userId: coordinator.id,
          note: "Demo insurance query follow-up",
        },
      });
      careTaskCount += 1;

      await prisma.insuranceQuery.create({
        data: {
          clinicId,
          claimId: claim.id,
          careTaskId: careTask.id,
          message: spec.query.message,
          receivedAt: day(-2),
          dueDate: day(spec.query.dueOffset ?? 1),
          status: spec.query.status,
          assignedToId: coordinator.id,
          responseMessage: spec.query.responseMessage ?? null,
          respondedAt: spec.query.status === "RESOLVED" ? day(-1) : null,
        },
      });
      queryCount += 1;
    }

    if (spec.payment) {
      await prisma.insurancePayment.create({
        data: {
          clinicId,
          claimId: claim.id,
          amount: money(spec.payment.amount),
          paymentDate: day(-spec.payment.daysAgo),
          paymentMethod: spec.payment.method,
          reference: spec.payment.reference,
          notes: spec.payment.notes ?? null,
        },
      });
      paymentCount += 1;
    }
  }

  return {
    skipped: false as const,
    providers: providers.length,
    tpas: tpas.length,
    policies: POLICY_SEEDS.length,
    claims: CLAIM_SEEDS.length,
    queries: queryCount,
    payments: paymentCount,
    events: eventCount,
    careTasks: careTaskCount,
  };
}
