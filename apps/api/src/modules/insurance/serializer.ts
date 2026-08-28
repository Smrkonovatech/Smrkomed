import type {
  InsuranceClaim,
  InsuranceClaimDocument,
  InsuranceClaimEvent,
  InsurancePayment,
  InsurancePolicy,
  InsuranceProvider,
  InsuranceQuery,
  InsuranceTpa,
  Patient,
  User,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

export function dec(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(value);
}

type PatientName = Pick<Patient, "id" | "firstName" | "lastName">;
type UserName = Pick<User, "id" | "name">;
type ProviderName = Pick<InsuranceProvider, "id" | "name">;
type TpaName = Pick<InsuranceTpa, "id" | "name">;
type CoupleNested = {
  id: string;
  slug: string;
  primaryPatient?: PatientName;
  partnerPatient?: PatientName | null;
};

function patientLabel(patient?: PatientName | null) {
  if (!patient) return null;
  return `${patient.firstName} ${patient.lastName}`.trim();
}

function coupleLabel(couple?: CoupleNested | null) {
  if (!couple) return null;
  const primary = patientLabel(couple.primaryPatient);
  const partner = patientLabel(couple.partnerPatient ?? null);
  if (primary && partner) return `${primary} + ${partner}`;
  return primary ?? couple.slug;
}

export function serializeProvider(provider: InsuranceProvider & { _count?: { policies?: number; claims?: number } }) {
  return {
    id: provider.id,
    clinicId: provider.clinicId,
    name: provider.name,
    logoUrl: provider.logoUrl,
    supportContact: provider.supportContact,
    supportEmail: provider.supportEmail,
    supportPhone: provider.supportPhone,
    notes: provider.notes,
    isActive: provider.isActive,
    integrationMode: provider.integrationMode,
    policyCount: provider._count?.policies ?? undefined,
    claimCount: provider._count?.claims ?? undefined,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}

export function serializeTpa(tpa: InsuranceTpa & { _count?: { policies?: number; claims?: number } }) {
  return {
    id: tpa.id,
    clinicId: tpa.clinicId,
    name: tpa.name,
    contact: tpa.contact,
    email: tpa.email,
    phone: tpa.phone,
    notes: tpa.notes,
    isActive: tpa.isActive,
    policyCount: tpa._count?.policies ?? undefined,
    claimCount: tpa._count?.claims ?? undefined,
    createdAt: tpa.createdAt.toISOString(),
    updatedAt: tpa.updatedAt.toISOString(),
  };
}

export function serializePolicy(
  policy: InsurancePolicy & {
    patient?: PatientName;
    couple?: CoupleNested | null;
    provider?: ProviderName;
    tpa?: TpaName | null;
    _count?: { claims?: number };
  },
) {
  return {
    id: policy.id,
    clinicId: policy.clinicId,
    patientId: policy.patientId,
    coupleId: policy.coupleId,
    providerId: policy.providerId,
    tpaId: policy.tpaId,
    policyName: policy.policyName,
    policyNumber: policy.policyNumber,
    memberId: policy.memberId,
    policyHolderName: policy.policyHolderName,
    relationshipToHolder: policy.relationshipToHolder,
    startDate: policy.startDate?.toISOString() ?? null,
    expiryDate: policy.expiryDate?.toISOString() ?? null,
    sumInsured: dec(policy.sumInsured),
    availableCoverage: dec(policy.availableCoverage),
    networkStatus: policy.networkStatus,
    cashlessStatus: policy.cashlessStatus,
    status: policy.status,
    eligibilityStatus: policy.eligibilityStatus,
    notes: policy.notes,
    cardDocumentId: policy.cardDocumentId,
    patientName: patientLabel(policy.patient),
    coupleLabel: coupleLabel(policy.couple),
    providerName: policy.provider?.name ?? null,
    tpaName: policy.tpa?.name ?? null,
    patient: policy.patient
      ? {
          id: policy.patient.id,
          firstName: policy.patient.firstName,
          lastName: policy.patient.lastName,
          name: patientLabel(policy.patient),
        }
      : undefined,
    couple: policy.couple
      ? {
          id: policy.couple.id,
          slug: policy.couple.slug,
          label: coupleLabel(policy.couple),
        }
      : null,
    provider: policy.provider
      ? { id: policy.provider.id, name: policy.provider.name }
      : undefined,
    tpa: policy.tpa ? { id: policy.tpa.id, name: policy.tpa.name } : null,
    claimCount: policy._count?.claims ?? undefined,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

export function serializeClaimDocument(
  doc: InsuranceClaimDocument & {
    document?: { id: string; name: string; mimeType?: string | null; category?: { name: string } | null };
  },
) {
  return {
    id: doc.id,
    claimId: doc.claimId,
    documentId: doc.documentId,
    documentType: doc.documentType,
    notes: doc.notes,
    fileName: doc.document?.name ?? null,
    mimeType: doc.document?.mimeType ?? null,
    categoryName: doc.document?.category?.name ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function serializeQuery(
  query: InsuranceQuery & {
    assignedTo?: UserName | null;
    claim?: Pick<InsuranceClaim, "id" | "claimNumber">;
  },
) {
  return {
    id: query.id,
    clinicId: query.clinicId,
    claimId: query.claimId,
    careTaskId: query.careTaskId,
    message: query.message,
    receivedAt: query.receivedAt.toISOString(),
    dueDate: query.dueDate?.toISOString() ?? null,
    status: query.status,
    assignedToId: query.assignedToId,
    assignedToName: query.assignedTo?.name ?? null,
    assignedTo: query.assignedTo
      ? { id: query.assignedTo.id, name: query.assignedTo.name }
      : null,
    responseMessage: query.responseMessage,
    respondedAt: query.respondedAt?.toISOString() ?? null,
    claimNumber: query.claim?.claimNumber,
    createdAt: query.createdAt.toISOString(),
    updatedAt: query.updatedAt.toISOString(),
  };
}

export function serializePayment(payment: InsurancePayment) {
  return {
    id: payment.id,
    clinicId: payment.clinicId,
    claimId: payment.claimId,
    amount: dec(payment.amount),
    paymentDate: payment.paymentDate.toISOString(),
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString(),
  };
}

export function serializeEvent(event: InsuranceClaimEvent) {
  return {
    id: event.id,
    clinicId: event.clinicId,
    claimId: event.claimId,
    action: event.action,
    status: event.status,
    note: event.note,
    actorId: event.actorId,
    actorName: event.actorName,
    createdAt: event.createdAt.toISOString(),
  };
}

export function serializeClaim(
  claim: InsuranceClaim & {
    patient?: PatientName;
    couple?: CoupleNested | null;
    provider?: ProviderName;
    tpa?: TpaName | null;
    policy?: Pick<InsurancePolicy, "id" | "policyName" | "policyNumber" | "memberId" | "status">;
    assignedCoordinator?: UserName | null;
    documents?: Array<
      InsuranceClaimDocument & {
        document?: { id: string; name: string; mimeType?: string | null; category?: { name: string } | null };
      }
    >;
    queries?: Array<InsuranceQuery & { assignedTo?: UserName | null }>;
    payments?: InsurancePayment[];
    events?: InsuranceClaimEvent[];
  },
) {
  return {
    id: claim.id,
    clinicId: claim.clinicId,
    claimNumber: claim.claimNumber,
    patientId: claim.patientId,
    coupleId: claim.coupleId,
    policyId: claim.policyId,
    providerId: claim.providerId,
    tpaId: claim.tpaId,
    claimType: claim.claimType,
    status: claim.status,
    treatmentLabel: claim.treatmentLabel,
    procedureLabel: claim.procedureLabel,
    diagnosisCategory: claim.diagnosisCategory,
    expectedAdmissionDate: claim.expectedAdmissionDate?.toISOString() ?? null,
    expectedDischargeDate: claim.expectedDischargeDate?.toISOString() ?? null,
    doctorName: claim.doctorName,
    assignedCoordinatorId: claim.assignedCoordinatorId,
    amountRequested: dec(claim.amountRequested),
    amountApproved: dec(claim.amountApproved),
    amountRejected: dec(claim.amountRejected),
    amountPaid: dec(claim.amountPaid),
    patientResponsibility: dec(claim.patientResponsibility),
    priority: claim.priority,
    dueDate: claim.dueDate?.toISOString() ?? null,
    notes: claim.notes,
    preauthSubmittedAt: claim.preauthSubmittedAt?.toISOString() ?? null,
    closedAt: claim.closedAt?.toISOString() ?? null,
    patientName: patientLabel(claim.patient),
    coupleLabel: coupleLabel(claim.couple),
    providerName: claim.provider?.name ?? null,
    tpaName: claim.tpa?.name ?? null,
    coordinatorName: claim.assignedCoordinator?.name ?? null,
    policyName: claim.policy?.policyName ?? null,
    policyNumber: claim.policy?.policyNumber ?? null,
    patient: claim.patient
      ? {
          id: claim.patient.id,
          firstName: claim.patient.firstName,
          lastName: claim.patient.lastName,
          name: patientLabel(claim.patient),
        }
      : undefined,
    couple: claim.couple
      ? {
          id: claim.couple.id,
          slug: claim.couple.slug,
          label: coupleLabel(claim.couple),
        }
      : null,
    provider: claim.provider
      ? { id: claim.provider.id, name: claim.provider.name }
      : undefined,
    tpa: claim.tpa ? { id: claim.tpa.id, name: claim.tpa.name } : null,
    policy: claim.policy
      ? {
          id: claim.policy.id,
          policyName: claim.policy.policyName,
          policyNumber: claim.policy.policyNumber,
          memberId: claim.policy.memberId,
          status: claim.policy.status,
        }
      : undefined,
    assignedCoordinator: claim.assignedCoordinator
      ? { id: claim.assignedCoordinator.id, name: claim.assignedCoordinator.name }
      : null,
    documents: claim.documents?.map(serializeClaimDocument),
    queries: claim.queries?.map(serializeQuery),
    payments: claim.payments?.map(serializePayment),
    events: claim.events?.map(serializeEvent),
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
  };
}
