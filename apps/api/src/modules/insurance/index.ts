import { Hono } from "hono";
import { Prisma, type InsuranceClaimStatus, type InsurancePolicyStatus } from "@prisma/client";
import { PERMISSIONS, prisma, type TenantContext } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requireAnyPermission, requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { getActiveInsuranceIntegration, getInsuranceIntegrationOverview } from "./integration";
import {
  attachDocumentSchema,
  createClaimSchema,
  createPaymentSchema,
  createPolicySchema,
  createProviderSchema,
  createQuerySchema,
  createTpaSchema,
  idParam,
  listQuery,
  respondQuerySchema,
  updateClaimSchema,
  updatePolicySchema,
  updateProviderSchema,
  updateTpaSchema,
} from "./schemas";
import {
  dec,
  serializeClaim,
  serializePayment,
  serializePolicy,
  serializeProvider,
  serializeQuery,
  serializeTpa,
} from "./serializer";

type Ctx = Parameters<typeof requirePermission>[0];

const APPROVAL_STATUSES = new Set<InsuranceClaimStatus>([
  "APPROVED",
  "PARTIALLY_APPROVED",
  "REJECTED",
  "CLOSED",
]);

const ACTIVE_CLAIM_STATUSES: InsuranceClaimStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "QUERY",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "FINAL_BILL_PENDING",
  "PAYMENT_PENDING",
];

const NEEDS_ACTION_STATUSES: InsuranceClaimStatus[] = ["DRAFT", "QUERY", "FINAL_BILL_PENDING"];

function requireInsuranceView(c: Ctx) {
  return requireAnyPermission(c, [PERMISSIONS.INSURANCE_VIEW, PERMISSIONS.INSURANCE_CLAIMS_VIEW]);
}

function requireInsuranceEdit(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_EDIT);
}

function requireClaimsCreate(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_CLAIMS_CREATE);
}

function requireClaimsEdit(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_CLAIMS_EDIT);
}

function requirePreauth(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_PREAUTH);
}

function requireDocuments(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_DOCUMENTS);
}

function requireQueries(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_QUERIES);
}

function requireFinancials(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_FINANCIALS);
}

function requireApprove(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_APPROVE);
}

function requireSettings(c: Ctx) {
  return requirePermission(c, PERMISSIONS.INSURANCE_SETTINGS);
}

function clinicWhere(tenant: TenantContext) {
  return { clinicId: tenant.clinicId };
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(Math.round(value * 100) / 100);
}

function paginated<T>(items: T[], page: number, pageSize: number, total: number) {
  return { items, page, pageSize, total };
}

function nullIfEmpty(value: string | null | undefined) {
  if (value === "") return null;
  return value ?? undefined;
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value);
}

async function actorName(tenant: TenantContext) {
  const user = await prisma.user.findUnique({
    where: { id: tenant.userId },
    select: { name: true },
  });
  return user?.name ?? "Staff";
}

async function recordClaimEvent(
  clinicId: string,
  claimId: string,
  action: string,
  status: string | null,
  note: string | null,
  actorId: string | null,
  actorNameValue: string | null,
) {
  return prisma.insuranceClaimEvent.create({
    data: {
      clinicId,
      claimId,
      action,
      status,
      note,
      actorId,
      actorName: actorNameValue,
    },
  });
}

async function nextClaimNumber(tenant: TenantContext, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const year = new Date().getFullYear();
  const prefix = `SMR-${year}-`;
  const count = await client.insuranceClaim.count({
    where: { clinicId: tenant.clinicId, claimNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

const patientSelect = { id: true, firstName: true, lastName: true } as const;
const coupleInclude = {
  primaryPatient: { select: patientSelect },
  partnerPatient: { select: patientSelect },
} as const;

const policyListInclude = {
  patient: { select: patientSelect },
  couple: { include: coupleInclude },
  provider: { select: { id: true, name: true } },
  tpa: { select: { id: true, name: true } },
  _count: { select: { claims: true } },
} as const;

const claimListInclude = {
  patient: { select: patientSelect },
  couple: { include: coupleInclude },
  provider: { select: { id: true, name: true } },
  tpa: { select: { id: true, name: true } },
  policy: { select: { id: true, policyName: true, policyNumber: true, memberId: true, status: true } },
  assignedCoordinator: { select: { id: true, name: true } },
} as const;

const claimDetailInclude = {
  ...claimListInclude,
  documents: {
    include: {
      document: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
  queries: {
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { receivedAt: "desc" as const },
  },
  payments: { orderBy: { paymentDate: "desc" as const } },
  events: { orderBy: { createdAt: "desc" as const } },
} as const;

async function loadClaim(tenant: TenantContext, id: string, detail = false) {
  const claim = await prisma.insuranceClaim.findUnique({
    where: { id },
    include: detail ? claimDetailInclude : claimListInclude,
  });
  return requireClinicOwned(tenant, claim);
}

async function loadPolicy(tenant: TenantContext, id: string) {
  const policy = await prisma.insurancePolicy.findUnique({
    where: { id },
    include: policyListInclude,
  });
  return requireClinicOwned(tenant, policy);
}

async function submitPreauthForClaim(
  tenant: TenantContext,
  claimId: string,
  actorDisplayName: string,
) {
  const claim = await loadClaim(tenant, claimId, true);
  if (claim.status === "CLOSED" || claim.status === "PAID") {
    throw new HttpError(422, "CLAIM_CLOSED", "Cannot submit pre-auth for a closed or paid claim.");
  }

  const integration = getActiveInsuranceIntegration();
  const result = await integration.submitPreAuthorization({
    claimNumber: claim.claimNumber,
    amountRequested: dec(claim.amountRequested),
  });

  const updated = await prisma.insuranceClaim.update({
    where: { id: claim.id },
    data: {
      status: "UNDER_REVIEW",
      preauthSubmittedAt: new Date(),
    },
    include: claimDetailInclude,
  });

  await recordClaimEvent(
    tenant.clinicId,
    claim.id,
    "PREAUTH_SUBMITTED",
    "UNDER_REVIEW",
    result.message,
    tenant.userId,
    actorDisplayName,
  );

  await audit(tenant, "insurance.claim.preauth", "InsuranceClaim", claim.id, {
    claimNumber: claim.claimNumber,
    accepted: result.accepted,
  });

  if (claim.assignedCoordinatorId) {
    await prisma.notification
      .create({
        data: {
          clinicId: tenant.clinicId,
          userId: claim.assignedCoordinatorId,
          title: "Pre-authorisation submitted",
          body: `${claim.claimNumber}: ${result.message}`,
          href: `/insurance/claims/${claim.id}`,
        },
      })
      .catch(() => undefined);
  }

  return { claim: updated, result };
}

async function createQueryForClaim(
  tenant: TenantContext,
  claimId: string,
  input: { message: string; dueDate?: string | null; assignedToId?: string | null },
  actorDisplayName: string,
) {
  const claim = await loadClaim(tenant, claimId, true);
  const assigneeId = input.assignedToId ?? claim.assignedCoordinatorId ?? tenant.userId;
  const dueDate = input.dueDate ?? null;

  const title =
    input.message.length > 80 ? `Insurance query: ${input.message.slice(0, 77)}...` : `Insurance query: ${input.message}`;

  const careTask = await prisma.careTask.create({
    data: {
      clinicId: tenant.clinicId,
      coupleId: claim.coupleId,
      title,
      description: input.message,
      category: "INSURANCE",
      status: "WAITING",
      priority: claim.priority === "HIGH" ? "HIGH" : "NORMAL",
      dueDate: parseOptionalDate(dueDate),
      createdById: tenant.userId,
    },
  });

  await prisma.taskAssignment.create({
    data: { careTaskId: careTask.id, userId: assigneeId },
  });

  const query = await prisma.insuranceQuery.create({
    data: {
      clinicId: tenant.clinicId,
      claimId: claim.id,
      careTaskId: careTask.id,
      message: input.message,
      dueDate: parseOptionalDate(dueDate),
      status: "OPEN",
      assignedToId: assigneeId,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await prisma.insuranceClaim.update({
    where: { id: claim.id },
    data: { status: "QUERY" },
  });

  await recordClaimEvent(
    tenant.clinicId,
    claim.id,
    "QUERY_OPENED",
    "QUERY",
    input.message,
    tenant.userId,
    actorDisplayName,
  );

  await prisma.notification
    .create({
      data: {
        clinicId: tenant.clinicId,
        userId: assigneeId,
        title: "Insurance query",
        body: `${claim.claimNumber}: ${input.message.slice(0, 160)}`,
        href: `/insurance/claims/${claim.id}`,
      },
    })
    .catch(() => undefined);

  await audit(tenant, "insurance.query.create", "InsuranceQuery", query.id, {
    claimId: claim.id,
  });

  return query;
}

export const insuranceRoutes = new Hono<AppEnv>()
  // ─── Dashboard ─────────────────────────────────────────────────────────────
  .get("/dashboard", async (c) => {
    const tenant = requireInsuranceView(c);
    const where = clinicWhere(tenant);
    const now = new Date();

    const [
      activeClaims,
      pendingPreauth,
      approvedClaims,
      rejectedClaims,
      needsAction,
      openQueries,
      documentsPending,
      amountAgg,
      actionClaims,
      dueQueries,
    ] = await Promise.all([
      prisma.insuranceClaim.count({ where: { ...where, status: { in: ACTIVE_CLAIM_STATUSES } } }),
      prisma.insuranceClaim.count({
        where: {
          ...where,
          OR: [
            { status: "DRAFT", claimType: "PRE_AUTH" },
            { status: "SUBMITTED" },
            { status: "UNDER_REVIEW", preauthSubmittedAt: null },
          ],
        },
      }),
      prisma.insuranceClaim.count({
        where: { ...where, status: { in: ["APPROVED", "PARTIALLY_APPROVED"] } },
      }),
      prisma.insuranceClaim.count({ where: { ...where, status: "REJECTED" } }),
      prisma.insuranceClaim.count({ where: { ...where, status: { in: NEEDS_ACTION_STATUSES } } }),
      prisma.insuranceQuery.count({ where: { ...where, status: { in: ["OPEN", "OVERDUE"] } } }),
      prisma.insuranceClaim.count({
        where: {
          ...where,
          status: { in: ["UNDER_REVIEW", "QUERY", "FINAL_BILL_PENDING"] },
          documents: { none: {} },
        },
      }),
      prisma.insuranceClaim.aggregate({
        where,
        _sum: { amountRequested: true, amountApproved: true, amountPaid: true },
      }),
      prisma.insuranceClaim.findMany({
        where: {
          ...where,
          OR: [
            { status: { in: NEEDS_ACTION_STATUSES } },
            { status: "UNDER_REVIEW", dueDate: { lte: now } },
            { queries: { some: { status: { in: ["OPEN", "OVERDUE"] } } } },
          ],
        },
        include: claimListInclude,
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
        take: 12,
      }),
      prisma.insuranceQuery.findMany({
        where: { ...where, status: { in: ["OPEN", "OVERDUE"] } },
        include: {
          assignedTo: { select: { id: true, name: true } },
          claim: {
            include: claimListInclude,
          },
        },
        orderBy: [{ dueDate: "asc" }, { receivedAt: "desc" }],
        take: 8,
      }),
    ]);

    const actionCenter = [
      ...actionClaims.map((claim) => ({
        id: claim.id,
        type: "CLAIM" as const,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        patientLabel:
          claim.couple
            ? `${claim.patient.firstName}${claim.couple.partnerPatient ? ` + ${claim.couple.partnerPatient.firstName}` : ""}`
            : `${claim.patient.firstName} ${claim.patient.lastName}`.trim(),
        insurance: claim.provider.name,
        action:
          claim.status === "QUERY"
            ? "Respond to insurer query"
            : claim.status === "DRAFT"
              ? "Complete and submit claim"
              : claim.status === "FINAL_BILL_PENDING"
                ? "Upload final bill"
                : claim.status === "UNDER_REVIEW"
                  ? "Follow up on claim"
                  : "Upload treatment estimate",
        priority: claim.priority,
        dueDate: claim.dueDate?.toISOString() ?? null,
        status: claim.status,
      })),
      ...dueQueries.map((query) => ({
        id: query.id,
        type: "QUERY" as const,
        claimId: query.claimId,
        claimNumber: query.claim.claimNumber,
        patientLabel: `${query.claim.patient.firstName} ${query.claim.patient.lastName}`.trim(),
        insurance: query.claim.provider.name,
        action: "Respond to insurer query",
        priority: query.claim.priority,
        dueDate: query.dueDate?.toISOString() ?? null,
        status: query.status,
      })),
    ].slice(0, 15);

    return ok(c, {
      kpis: {
        activeClaims,
        pendingPreauth,
        approvedClaims,
        rejectedClaims,
        needsAction,
        documentsPending,
        openQueries,
        amountRequested: dec(amountAgg._sum.amountRequested),
        amountApproved: dec(amountAgg._sum.amountApproved),
        amountReceived: dec(amountAgg._sum.amountPaid),
      },
      actionCenter,
      integration: getInsuranceIntegrationOverview(),
    });
  })

  .get("/integration-status", async (c) => {
    requireInsuranceView(c);
    return ok(c, getInsuranceIntegrationOverview());
  })

  // ─── Providers ─────────────────────────────────────────────────────────────
  .get("/providers", validate("query", listQuery), async (c) => {
    const tenant = requireInsuranceView(c);
    const query = c.req.valid("query");
    const where: Prisma.InsuranceProviderWhereInput = {
      ...clinicWhere(tenant),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { supportContact: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.insuranceProvider.count({ where }),
      prisma.insuranceProvider.findMany({
        where,
        include: { _count: { select: { policies: true, claims: true } } },
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializeProvider), query.page, query.pageSize, total));
  })

  .post("/providers", validate("json", createProviderSchema), async (c) => {
    const tenant = requireSettings(c);
    const body = c.req.valid("json");
    const provider = await prisma.insuranceProvider.create({
      data: {
        clinicId: tenant.clinicId,
        name: body.name,
        logoUrl: nullIfEmpty(body.logoUrl) ?? null,
        supportContact: nullIfEmpty(body.supportContact) ?? null,
        supportEmail: nullIfEmpty(body.supportEmail) ?? null,
        supportPhone: nullIfEmpty(body.supportPhone) ?? null,
        notes: nullIfEmpty(body.notes) ?? null,
        isActive: body.isActive ?? true,
      },
      include: { _count: { select: { policies: true, claims: true } } },
    });
    await audit(tenant, "insurance.provider.create", "InsuranceProvider", provider.id, {
      name: provider.name,
    });
    return ok(c, serializeProvider(provider), 201);
  })

  .patch("/providers/:id", validate("param", idParam), validate("json", updateProviderSchema), async (c) => {
    const tenant = requireSettings(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await requireClinicOwned(tenant, await prisma.insuranceProvider.findUnique({ where: { id } }));
    const provider = await prisma.insuranceProvider.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.logoUrl === undefined ? {} : { logoUrl: nullIfEmpty(body.logoUrl) ?? null }),
        ...(body.supportContact === undefined
          ? {}
          : { supportContact: nullIfEmpty(body.supportContact) ?? null }),
        ...(body.supportEmail === undefined
          ? {}
          : { supportEmail: nullIfEmpty(body.supportEmail) ?? null }),
        ...(body.supportPhone === undefined
          ? {}
          : { supportPhone: nullIfEmpty(body.supportPhone) ?? null }),
        ...(body.notes === undefined ? {} : { notes: nullIfEmpty(body.notes) ?? null }),
        ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
      },
      include: { _count: { select: { policies: true, claims: true } } },
    });
    await audit(tenant, "insurance.provider.update", "InsuranceProvider", provider.id);
    return ok(c, serializeProvider(provider));
  })

  // ─── TPAs ──────────────────────────────────────────────────────────────────
  .get("/tpas", validate("query", listQuery), async (c) => {
    const tenant = requireInsuranceView(c);
    const query = c.req.valid("query");
    const where: Prisma.InsuranceTpaWhereInput = {
      ...clinicWhere(tenant),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { contact: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.insuranceTpa.count({ where }),
      prisma.insuranceTpa.findMany({
        where,
        include: { _count: { select: { policies: true, claims: true } } },
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializeTpa), query.page, query.pageSize, total));
  })

  .post("/tpas", validate("json", createTpaSchema), async (c) => {
    const tenant = requireSettings(c);
    const body = c.req.valid("json");
    const tpa = await prisma.insuranceTpa.create({
      data: {
        clinicId: tenant.clinicId,
        name: body.name,
        contact: nullIfEmpty(body.contact) ?? null,
        email: nullIfEmpty(body.email) ?? null,
        phone: nullIfEmpty(body.phone) ?? null,
        notes: nullIfEmpty(body.notes) ?? null,
        isActive: body.isActive ?? true,
      },
      include: { _count: { select: { policies: true, claims: true } } },
    });
    await audit(tenant, "insurance.tpa.create", "InsuranceTpa", tpa.id, { name: tpa.name });
    return ok(c, serializeTpa(tpa), 201);
  })

  .patch("/tpas/:id", validate("param", idParam), validate("json", updateTpaSchema), async (c) => {
    const tenant = requireSettings(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await requireClinicOwned(tenant, await prisma.insuranceTpa.findUnique({ where: { id } }));
    const tpa = await prisma.insuranceTpa.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.contact === undefined ? {} : { contact: nullIfEmpty(body.contact) ?? null }),
        ...(body.email === undefined ? {} : { email: nullIfEmpty(body.email) ?? null }),
        ...(body.phone === undefined ? {} : { phone: nullIfEmpty(body.phone) ?? null }),
        ...(body.notes === undefined ? {} : { notes: nullIfEmpty(body.notes) ?? null }),
        ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
      },
      include: { _count: { select: { policies: true, claims: true } } },
    });
    await audit(tenant, "insurance.tpa.update", "InsuranceTpa", tpa.id);
    return ok(c, serializeTpa(tpa));
  })

  // ─── Policies ──────────────────────────────────────────────────────────────
  .get("/policies/by-patient/:patientId", async (c) => {
    const tenant = requireInsuranceView(c);
    const patientId = c.req.param("patientId");
    await requireClinicOwned(tenant, await prisma.patient.findUnique({ where: { id: patientId } }));
    const rows = await prisma.insurancePolicy.findMany({
      where: { ...clinicWhere(tenant), patientId },
      include: policyListInclude,
      orderBy: { updatedAt: "desc" },
    });
    return ok(c, rows.map(serializePolicy));
  })

  .get("/policies/by-couple/:coupleId", async (c) => {
    const tenant = requireInsuranceView(c);
    const coupleId = c.req.param("coupleId");
    await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: coupleId } }));
    const rows = await prisma.insurancePolicy.findMany({
      where: { ...clinicWhere(tenant), coupleId },
      include: policyListInclude,
      orderBy: { updatedAt: "desc" },
    });
    return ok(c, rows.map(serializePolicy));
  })

  .get("/policies", validate("query", listQuery), async (c) => {
    const tenant = requireInsuranceView(c);
    const query = c.req.valid("query");
    const where: Prisma.InsurancePolicyWhereInput = {
      ...clinicWhere(tenant),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.coupleId ? { coupleId: query.coupleId } : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.tpaId ? { tpaId: query.tpaId } : {}),
      ...(query.q
        ? {
            OR: [
              { policyName: { contains: query.q, mode: "insensitive" } },
              { policyNumber: { contains: query.q, mode: "insensitive" } },
              { memberId: { contains: query.q, mode: "insensitive" } },
              { policyHolderName: { contains: query.q, mode: "insensitive" } },
              { patient: { firstName: { contains: query.q, mode: "insensitive" } } },
              { patient: { lastName: { contains: query.q, mode: "insensitive" } } },
              { provider: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    if (query.status) {
      where.status = query.status as InsurancePolicyStatus;
    }
    const [total, rows] = await Promise.all([
      prisma.insurancePolicy.count({ where }),
      prisma.insurancePolicy.findMany({
        where,
        include: policyListInclude,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializePolicy), query.page, query.pageSize, total));
  })

  .post("/policies", validate("json", createPolicySchema), async (c) => {
    const tenant = requireInsuranceEdit(c);
    const body = c.req.valid("json");
    await requireClinicOwned(tenant, await prisma.patient.findUnique({ where: { id: body.patientId } }));
    if (body.coupleId) {
      await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    }
    const provider = await requireClinicOwned(
      tenant,
      await prisma.insuranceProvider.findUnique({ where: { id: body.providerId } }),
    );
    if (body.tpaId) {
      await requireClinicOwned(tenant, await prisma.insuranceTpa.findUnique({ where: { id: body.tpaId } }));
    }
    if (body.cardDocumentId) {
      await requireClinicOwned(tenant, await prisma.document.findUnique({ where: { id: body.cardDocumentId } }));
    }

    try {
      const policy = await prisma.insurancePolicy.create({
        data: {
          clinicId: tenant.clinicId,
          patientId: body.patientId,
          coupleId: nullIfEmpty(body.coupleId) ?? null,
          providerId: provider.id,
          tpaId: nullIfEmpty(body.tpaId) ?? null,
          policyName: body.policyName,
          policyNumber: body.policyNumber,
          memberId: nullIfEmpty(body.memberId) ?? null,
          policyHolderName: nullIfEmpty(body.policyHolderName) ?? null,
          relationshipToHolder: nullIfEmpty(body.relationshipToHolder) ?? null,
          startDate: parseOptionalDate(body.startDate),
          expiryDate: parseOptionalDate(body.expiryDate),
          sumInsured: money(body.sumInsured),
          availableCoverage: money(body.availableCoverage),
          networkStatus: nullIfEmpty(body.networkStatus) ?? null,
          cashlessStatus: nullIfEmpty(body.cashlessStatus) ?? null,
          status: body.status ?? "PENDING_VERIFICATION",
          eligibilityStatus: body.eligibilityStatus ?? "PENDING",
          notes: nullIfEmpty(body.notes) ?? null,
          cardDocumentId: nullIfEmpty(body.cardDocumentId) ?? null,
        },
        include: policyListInclude,
      });
      await audit(tenant, "insurance.policy.create", "InsurancePolicy", policy.id, {
        policyNumber: policy.policyNumber,
      });
      return ok(c, serializePolicy(policy), 201);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new HttpError(409, "POLICY_NUMBER_EXISTS", "A policy with this number already exists.");
      }
      throw error;
    }
  })

  .patch("/policies/:id", validate("param", idParam), validate("json", updatePolicySchema), async (c) => {
    const tenant = requireInsuranceEdit(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    await loadPolicy(tenant, id);

    if (body.coupleId) {
      await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    }
    if (body.providerId) {
      await requireClinicOwned(
        tenant,
        await prisma.insuranceProvider.findUnique({ where: { id: body.providerId } }),
      );
    }
    if (body.tpaId) {
      await requireClinicOwned(tenant, await prisma.insuranceTpa.findUnique({ where: { id: body.tpaId } }));
    }
    if (body.cardDocumentId) {
      await requireClinicOwned(tenant, await prisma.document.findUnique({ where: { id: body.cardDocumentId } }));
    }

    try {
      const policy = await prisma.insurancePolicy.update({
        where: { id },
        data: {
          ...(body.coupleId === undefined ? {} : { coupleId: nullIfEmpty(body.coupleId) ?? null }),
          ...(body.providerId === undefined ? {} : { providerId: body.providerId }),
          ...(body.tpaId === undefined ? {} : { tpaId: nullIfEmpty(body.tpaId) ?? null }),
          ...(body.policyName === undefined ? {} : { policyName: body.policyName }),
          ...(body.policyNumber === undefined ? {} : { policyNumber: body.policyNumber }),
          ...(body.memberId === undefined ? {} : { memberId: nullIfEmpty(body.memberId) ?? null }),
          ...(body.policyHolderName === undefined
            ? {}
            : { policyHolderName: nullIfEmpty(body.policyHolderName) ?? null }),
          ...(body.relationshipToHolder === undefined
            ? {}
            : { relationshipToHolder: nullIfEmpty(body.relationshipToHolder) ?? null }),
          ...(body.startDate === undefined ? {} : { startDate: parseOptionalDate(body.startDate) }),
          ...(body.expiryDate === undefined ? {} : { expiryDate: parseOptionalDate(body.expiryDate) }),
          ...(body.sumInsured === undefined ? {} : { sumInsured: money(body.sumInsured) }),
          ...(body.availableCoverage === undefined
            ? {}
            : { availableCoverage: money(body.availableCoverage) }),
          ...(body.networkStatus === undefined
            ? {}
            : { networkStatus: nullIfEmpty(body.networkStatus) ?? null }),
          ...(body.cashlessStatus === undefined
            ? {}
            : { cashlessStatus: nullIfEmpty(body.cashlessStatus) ?? null }),
          ...(body.status === undefined ? {} : { status: body.status }),
          ...(body.eligibilityStatus === undefined ? {} : { eligibilityStatus: body.eligibilityStatus }),
          ...(body.notes === undefined ? {} : { notes: nullIfEmpty(body.notes) ?? null }),
          ...(body.cardDocumentId === undefined
            ? {}
            : { cardDocumentId: nullIfEmpty(body.cardDocumentId) ?? null }),
        },
        include: policyListInclude,
      });
      await audit(tenant, "insurance.policy.update", "InsurancePolicy", policy.id);
      return ok(c, serializePolicy(policy));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new HttpError(409, "POLICY_NUMBER_EXISTS", "A policy with this number already exists.");
      }
      throw error;
    }
  })

  // ─── Claims ────────────────────────────────────────────────────────────────
  .get("/claims", validate("query", listQuery), async (c) => {
    const tenant = requireInsuranceView(c);
    const query = c.req.valid("query");
    const where: Prisma.InsuranceClaimWhereInput = {
      ...clinicWhere(tenant),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.coupleId ? { coupleId: query.coupleId } : {}),
      ...(query.providerId ? { providerId: query.providerId } : {}),
      ...(query.tpaId ? { tpaId: query.tpaId } : {}),
      ...(query.q
        ? {
            OR: [
              { claimNumber: { contains: query.q, mode: "insensitive" } },
              { treatmentLabel: { contains: query.q, mode: "insensitive" } },
              { procedureLabel: { contains: query.q, mode: "insensitive" } },
              { doctorName: { contains: query.q, mode: "insensitive" } },
              { patient: { firstName: { contains: query.q, mode: "insensitive" } } },
              { patient: { lastName: { contains: query.q, mode: "insensitive" } } },
              { provider: { name: { contains: query.q, mode: "insensitive" } } },
              { policy: { policyNumber: { contains: query.q, mode: "insensitive" } } },
              { assignedCoordinator: { name: { contains: query.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    if (query.status) {
      where.status = query.status as InsuranceClaimStatus;
    }
    const [total, rows] = await Promise.all([
      prisma.insuranceClaim.count({ where }),
      prisma.insuranceClaim.findMany({
        where,
        include: claimListInclude,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return ok(c, paginated(rows.map(serializeClaim), query.page, query.pageSize, total));
  })

  .post("/claims", validate("json", createClaimSchema), async (c) => {
    const tenant = requireClaimsCreate(c);
    const body = c.req.valid("json");
    const name = await actorName(tenant);

    await requireClinicOwned(tenant, await prisma.patient.findUnique({ where: { id: body.patientId } }));
    if (body.coupleId) {
      await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: body.coupleId } }));
    }
    const policy = await requireClinicOwned(
      tenant,
      await prisma.insurancePolicy.findUnique({ where: { id: body.policyId } }),
    );
    if (policy.patientId !== body.patientId) {
      throw new HttpError(422, "POLICY_PATIENT_MISMATCH", "Policy does not belong to this patient.");
    }
    if (body.assignedCoordinatorId) {
      await prisma.user.findUniqueOrThrow({ where: { id: body.assignedCoordinatorId } });
    }

    for (const doc of body.documentIds ?? []) {
      await requireClinicOwned(tenant, await prisma.document.findUnique({ where: { id: doc.documentId } }));
    }

    const claim = await prisma.$transaction(async (tx) => {
      const claimNumber = await nextClaimNumber(tenant, tx);
      const created = await tx.insuranceClaim.create({
        data: {
          clinicId: tenant.clinicId,
          claimNumber,
          patientId: body.patientId,
          coupleId: nullIfEmpty(body.coupleId) ?? policy.coupleId,
          policyId: policy.id,
          providerId: policy.providerId,
          tpaId: policy.tpaId,
          claimType: body.claimType ?? "PRE_AUTH",
          status: "DRAFT",
          treatmentLabel: nullIfEmpty(body.treatmentLabel) ?? null,
          procedureLabel: nullIfEmpty(body.procedureLabel) ?? null,
          diagnosisCategory: nullIfEmpty(body.diagnosisCategory) ?? null,
          expectedAdmissionDate: parseOptionalDate(body.expectedAdmissionDate),
          expectedDischargeDate: parseOptionalDate(body.expectedDischargeDate),
          doctorName: nullIfEmpty(body.doctorName) ?? null,
          assignedCoordinatorId: nullIfEmpty(body.assignedCoordinatorId) ?? null,
          amountRequested: money(body.amountRequested ?? 0),
          priority: body.priority ?? "NORMAL",
          dueDate: parseOptionalDate(body.dueDate),
          notes: nullIfEmpty(body.notes) ?? null,
          documents: {
            create: (body.documentIds ?? []).map((doc) => ({
              documentId: doc.documentId,
              documentType: nullIfEmpty(doc.documentType) ?? null,
            })),
          },
        },
        include: claimDetailInclude,
      });

      await tx.insuranceClaimEvent.create({
        data: {
          clinicId: tenant.clinicId,
          claimId: created.id,
          action: "CLAIM_CREATED",
          status: "DRAFT",
          note: `Claim ${claimNumber} created`,
          actorId: tenant.userId,
          actorName: name,
        },
      });

      return created;
    });

    await audit(tenant, "insurance.claim.create", "InsuranceClaim", claim.id, {
      claimNumber: claim.claimNumber,
    });

    if (body.submitPreauth) {
      const { claim: submitted, result } = await submitPreauthForClaim(tenant, claim.id, name);
      return ok(c, { ...serializeClaim(submitted), preauth: result }, 201);
    }

    const fresh = await loadClaim(tenant, claim.id, true);
    return ok(c, serializeClaim(fresh), 201);
  })

  .get("/claims/:id", validate("param", idParam), async (c) => {
    const tenant = requireInsuranceView(c);
    const claim = await loadClaim(tenant, c.req.valid("param").id, true);
    return ok(c, serializeClaim(claim));
  })

  .patch("/claims/:id", validate("param", idParam), validate("json", updateClaimSchema), async (c) => {
    const body = c.req.valid("json");
    const tenant =
      body.status && APPROVAL_STATUSES.has(body.status) ? requireApprove(c) : requireClaimsEdit(c);
    const { id } = c.req.valid("param");
    const existing = await loadClaim(tenant, id, true);
    const name = await actorName(tenant);

    if (body.assignedCoordinatorId) {
      await prisma.user.findUniqueOrThrow({ where: { id: body.assignedCoordinatorId } });
    }

    const updated = await prisma.insuranceClaim.update({
      where: { id },
      data: {
        ...(body.claimType === undefined ? {} : { claimType: body.claimType }),
        ...(body.treatmentLabel === undefined
          ? {}
          : { treatmentLabel: nullIfEmpty(body.treatmentLabel) ?? null }),
        ...(body.procedureLabel === undefined
          ? {}
          : { procedureLabel: nullIfEmpty(body.procedureLabel) ?? null }),
        ...(body.diagnosisCategory === undefined
          ? {}
          : { diagnosisCategory: nullIfEmpty(body.diagnosisCategory) ?? null }),
        ...(body.expectedAdmissionDate === undefined
          ? {}
          : { expectedAdmissionDate: parseOptionalDate(body.expectedAdmissionDate) }),
        ...(body.expectedDischargeDate === undefined
          ? {}
          : { expectedDischargeDate: parseOptionalDate(body.expectedDischargeDate) }),
        ...(body.doctorName === undefined ? {} : { doctorName: nullIfEmpty(body.doctorName) ?? null }),
        ...(body.assignedCoordinatorId === undefined
          ? {}
          : { assignedCoordinatorId: nullIfEmpty(body.assignedCoordinatorId) ?? null }),
        ...(body.amountRequested === undefined ? {} : { amountRequested: money(body.amountRequested) }),
        ...(body.amountApproved === undefined ? {} : { amountApproved: money(body.amountApproved) }),
        ...(body.amountRejected === undefined ? {} : { amountRejected: money(body.amountRejected) }),
        ...(body.patientResponsibility === undefined
          ? {}
          : { patientResponsibility: money(body.patientResponsibility) }),
        ...(body.priority === undefined ? {} : { priority: body.priority }),
        ...(body.dueDate === undefined ? {} : { dueDate: parseOptionalDate(body.dueDate) }),
        ...(body.notes === undefined ? {} : { notes: nullIfEmpty(body.notes) ?? null }),
        ...(body.status === undefined
          ? {}
          : {
              status: body.status,
              ...(body.status === "CLOSED" ? { closedAt: new Date() } : {}),
            }),
      },
      include: claimDetailInclude,
    });

    if (body.status && body.status !== existing.status) {
      await recordClaimEvent(
        tenant.clinicId,
        id,
        "STATUS_CHANGED",
        body.status,
        `Status changed from ${existing.status} to ${body.status}`,
        tenant.userId,
        name,
      );
    } else {
      await recordClaimEvent(
        tenant.clinicId,
        id,
        "CLAIM_UPDATED",
        updated.status,
        "Claim details updated",
        tenant.userId,
        name,
      );
    }

    await audit(tenant, "insurance.claim.update", "InsuranceClaim", id, {
      status: updated.status,
    });
    return ok(c, serializeClaim(updated));
  })

  .post("/claims/:id/preauth", validate("param", idParam), async (c) => {
    const tenant = requirePreauth(c);
    const name = await actorName(tenant);
    const { claim, result } = await submitPreauthForClaim(tenant, c.req.valid("param").id, name);
    return ok(c, { ...serializeClaim(claim), preauth: result });
  })

  .get("/claims/:id/queries", validate("param", idParam), async (c) => {
    const tenant = requireInsuranceView(c);
    const claim = await loadClaim(tenant, c.req.valid("param").id);
    const rows = await prisma.insuranceQuery.findMany({
      where: { clinicId: tenant.clinicId, claimId: claim.id },
      include: { assignedTo: { select: { id: true, name: true } }, claim: { select: { id: true, claimNumber: true } } },
      orderBy: { receivedAt: "desc" },
    });
    return ok(c, rows.map(serializeQuery));
  })

  .post("/claims/:id/queries", validate("param", idParam), validate("json", createQuerySchema), async (c) => {
    const tenant = requireQueries(c);
    const body = c.req.valid("json");
    const name = await actorName(tenant);
    if (body.assignedToId) {
      await prisma.user.findUniqueOrThrow({ where: { id: body.assignedToId } });
    }
    const query = await createQueryForClaim(
      tenant,
      c.req.valid("param").id,
      {
        message: body.message,
        dueDate: body.dueDate ?? null,
        assignedToId: body.assignedToId ?? null,
      },
      name,
    );
    return ok(c, serializeQuery(query), 201);
  })

  .post("/queries/:id/respond", validate("param", idParam), validate("json", respondQuerySchema), async (c) => {
    const tenant = requireQueries(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const name = await actorName(tenant);
    const query = await requireClinicOwned(
      tenant,
      await prisma.insuranceQuery.findUnique({
        where: { id },
        include: { assignedTo: { select: { id: true, name: true } }, claim: true },
      }),
    );

    const status = body.markResolved ? "RESOLVED" : "RESPONDED";
    const updated = await prisma.insuranceQuery.update({
      where: { id },
      data: {
        responseMessage: body.responseMessage,
        respondedAt: new Date(),
        status,
      },
      include: { assignedTo: { select: { id: true, name: true } }, claim: { select: { id: true, claimNumber: true } } },
    });

    if (query.careTaskId) {
      await prisma.careTask
        .update({
          where: { id: query.careTaskId },
          data: body.markResolved
            ? { status: "COMPLETED", completedAt: new Date() }
            : { status: "IN_PROGRESS" },
        })
        .catch(() => undefined);
    }

    if (body.markResolved && query.claim.status === "QUERY") {
      await prisma.insuranceClaim.update({
        where: { id: query.claimId },
        data: { status: "UNDER_REVIEW" },
      });
    }

    await recordClaimEvent(
      tenant.clinicId,
      query.claimId,
      body.markResolved ? "QUERY_RESOLVED" : "QUERY_RESPONDED",
      body.markResolved ? "UNDER_REVIEW" : "QUERY",
      body.responseMessage,
      tenant.userId,
      name,
    );

    await audit(tenant, "insurance.query.respond", "InsuranceQuery", id);
    return ok(c, serializeQuery(updated));
  })

  .post("/queries/:id/resolve", validate("param", idParam), async (c) => {
    const tenant = requireQueries(c);
    const { id } = c.req.valid("param");
    const name = await actorName(tenant);
    const query = await requireClinicOwned(
      tenant,
      await prisma.insuranceQuery.findUnique({
        where: { id },
        include: { assignedTo: { select: { id: true, name: true } }, claim: true },
      }),
    );

    const updated = await prisma.insuranceQuery.update({
      where: { id },
      data: { status: "RESOLVED", respondedAt: query.respondedAt ?? new Date() },
      include: { assignedTo: { select: { id: true, name: true } }, claim: { select: { id: true, claimNumber: true } } },
    });

    if (query.careTaskId) {
      await prisma.careTask
        .update({
          where: { id: query.careTaskId },
          data: { status: "COMPLETED", completedAt: new Date() },
        })
        .catch(() => undefined);
    }

    if (query.claim.status === "QUERY") {
      await prisma.insuranceClaim.update({
        where: { id: query.claimId },
        data: { status: "UNDER_REVIEW" },
      });
    }

    await recordClaimEvent(
      tenant.clinicId,
      query.claimId,
      "QUERY_RESOLVED",
      "UNDER_REVIEW",
      "Query marked resolved",
      tenant.userId,
      name,
    );

    await audit(tenant, "insurance.query.resolve", "InsuranceQuery", id);
    return ok(c, serializeQuery(updated));
  })

  .post(
    "/claims/:id/documents",
    validate("param", idParam),
    validate("json", attachDocumentSchema),
    async (c) => {
      const tenant = requireDocuments(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const name = await actorName(tenant);
      const claim = await loadClaim(tenant, id);
      await requireClinicOwned(tenant, await prisma.document.findUnique({ where: { id: body.documentId } }));

      try {
        const link = await prisma.insuranceClaimDocument.create({
          data: {
            claimId: claim.id,
            documentId: body.documentId,
            documentType: nullIfEmpty(body.documentType) ?? null,
            notes: nullIfEmpty(body.notes) ?? null,
          },
          include: {
            document: {
              select: {
                id: true,
                name: true,
                mimeType: true,
                category: { select: { name: true } },
              },
            },
          },
        });

        await recordClaimEvent(
          tenant.clinicId,
          claim.id,
          "DOCUMENT_ATTACHED",
          claim.status,
          body.documentType ?? body.documentId,
          tenant.userId,
          name,
        );
        await audit(tenant, "insurance.claim.document", "InsuranceClaim", claim.id, {
          documentId: body.documentId,
        });

        return ok(
          c,
          {
            id: link.id,
            claimId: link.claimId,
            documentId: link.documentId,
            documentType: link.documentType,
            notes: link.notes,
            fileName: link.document.name,
            mimeType: link.document.mimeType,
            categoryName: link.document.category?.name ?? null,
            createdAt: link.createdAt.toISOString(),
          },
          201,
        );
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
          throw new HttpError(409, "DOCUMENT_ALREADY_ATTACHED", "Document is already attached to this claim.");
        }
        throw error;
      }
    },
  )

  .post(
    "/claims/:id/payments",
    validate("param", idParam),
    validate("json", createPaymentSchema),
    async (c) => {
      const tenant = requireFinancials(c);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const name = await actorName(tenant);
      const claim = await loadClaim(tenant, id, true);

      const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.insurancePayment.create({
          data: {
            clinicId: tenant.clinicId,
            claimId: claim.id,
            amount: money(body.amount),
            paymentDate: parseOptionalDate(body.paymentDate) ?? new Date(),
            paymentMethod: nullIfEmpty(body.paymentMethod) ?? null,
            reference: nullIfEmpty(body.reference) ?? null,
            notes: nullIfEmpty(body.notes) ?? null,
          },
        });

        const newPaid = dec(claim.amountPaid) + body.amount;
        const approved = dec(claim.amountApproved);
        const nextStatus =
          claim.status === "PAYMENT_PENDING" && (approved <= 0 || newPaid >= approved)
            ? ("PAID" as const)
            : undefined;

        await tx.insuranceClaim.update({
          where: { id: claim.id },
          data: {
            amountPaid: money(newPaid),
            ...(nextStatus ? { status: nextStatus } : {}),
          },
        });

        await tx.insuranceClaimEvent.create({
          data: {
            clinicId: tenant.clinicId,
            claimId: claim.id,
            action: "PAYMENT_RECORDED",
            status: nextStatus ?? claim.status,
            note: `Payment of ${body.amount} recorded`,
            actorId: tenant.userId,
            actorName: name,
          },
        });

        return created;
      });

      await audit(tenant, "insurance.payment.create", "InsurancePayment", payment.id, {
        claimId: claim.id,
        amount: body.amount,
      });

      const fresh = await loadClaim(tenant, claim.id, true);
      return ok(c, { payment: serializePayment(payment), claim: serializeClaim(fresh) }, 201);
    },
  )

  // ─── Analytics ─────────────────────────────────────────────────────────────
  .get("/analytics", async (c) => {
    const tenant = requireFinancials(c);
    const where = clinicWhere(tenant);

    const [totalClaims, approved, rejected, partiallyApproved, amountAgg, byStatus, byProvider] =
      await Promise.all([
        prisma.insuranceClaim.count({ where }),
        prisma.insuranceClaim.count({
          where: { ...where, status: { in: ["APPROVED", "PARTIALLY_APPROVED", "PAID", "CLOSED"] } },
        }),
        prisma.insuranceClaim.count({ where: { ...where, status: "REJECTED" } }),
        prisma.insuranceClaim.count({ where: { ...where, status: "PARTIALLY_APPROVED" } }),
        prisma.insuranceClaim.aggregate({
          where,
          _sum: {
            amountRequested: true,
            amountApproved: true,
            amountRejected: true,
            amountPaid: true,
            patientResponsibility: true,
          },
        }),
        prisma.insuranceClaim.groupBy({
          by: ["status"],
          where,
          _count: { id: true },
          _sum: { amountRequested: true, amountApproved: true, amountPaid: true },
        }),
        prisma.insuranceClaim.groupBy({
          by: ["providerId"],
          where,
          _count: { id: true },
          _sum: { amountRequested: true, amountApproved: true, amountPaid: true },
        }),
      ]);

    const decided = approved + rejected;
    const approvalRate = decided > 0 ? approved / decided : 0;
    const providers = await prisma.insuranceProvider.findMany({
      where: { clinicId: tenant.clinicId, id: { in: byProvider.map((row) => row.providerId) } },
      select: { id: true, name: true },
    });
    const providerNames = new Map(providers.map((p) => [p.id, p.name]));

    return ok(c, {
      totals: {
        claims: totalClaims,
        approved,
        rejected,
        partiallyApproved,
        approvalRate,
        amountRequested: dec(amountAgg._sum.amountRequested),
        amountApproved: dec(amountAgg._sum.amountApproved),
        amountRejected: dec(amountAgg._sum.amountRejected),
        amountPaid: dec(amountAgg._sum.amountPaid),
        patientResponsibility: dec(amountAgg._sum.patientResponsibility),
      },
      byStatus: byStatus.map((row) => ({
        status: row.status,
        count: row._count.id,
        amountRequested: dec(row._sum.amountRequested),
        amountApproved: dec(row._sum.amountApproved),
        amountPaid: dec(row._sum.amountPaid),
      })),
      byProvider: byProvider.map((row) => ({
        providerId: row.providerId,
        providerName: providerNames.get(row.providerId) ?? row.providerId,
        count: row._count.id,
        amountRequested: dec(row._sum.amountRequested),
        amountApproved: dec(row._sum.amountApproved),
        amountPaid: dec(row._sum.amountPaid),
      })),
    });
  })

  // ─── Patient / Couple overview ─────────────────────────────────────────────
  .get("/patients/:patientId/overview", async (c) => {
    const tenant = requireInsuranceView(c);
    const patientId = c.req.param("patientId");
    await requireClinicOwned(tenant, await prisma.patient.findUnique({ where: { id: patientId } }));

    const [policies, claims, openQueries] = await Promise.all([
      prisma.insurancePolicy.findMany({
        where: { ...clinicWhere(tenant), patientId },
        include: policyListInclude,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.insuranceClaim.findMany({
        where: { ...clinicWhere(tenant), patientId },
        include: claimListInclude,
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.insuranceQuery.count({
        where: {
          ...clinicWhere(tenant),
          status: { in: ["OPEN", "OVERDUE"] },
          claim: { patientId },
        },
      }),
    ]);

    const amountRequested = claims.reduce((sum, row) => sum + dec(row.amountRequested), 0);
    const amountApproved = claims.reduce((sum, row) => sum + dec(row.amountApproved), 0);
    const amountPaid = claims.reduce((sum, row) => sum + dec(row.amountPaid), 0);

    return ok(c, {
      summary: {
        policies: policies.length,
        activePolicies: policies.filter((p) => p.status === "ACTIVE").length,
        claims: claims.length,
        activeClaims: claims.filter((c) => ACTIVE_CLAIM_STATUSES.includes(c.status)).length,
        openQueries,
        amountRequested,
        amountApproved,
        amountPaid,
      },
      policies: policies.map(serializePolicy),
      claims: claims.map(serializeClaim),
    });
  })

  .get("/couples/:coupleId/overview", async (c) => {
    const tenant = requireInsuranceView(c);
    const coupleId = c.req.param("coupleId");
    await requireClinicOwned(tenant, await prisma.couple.findUnique({ where: { id: coupleId } }));

    const [policies, claims, openQueries] = await Promise.all([
      prisma.insurancePolicy.findMany({
        where: { ...clinicWhere(tenant), coupleId },
        include: policyListInclude,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.insuranceClaim.findMany({
        where: { ...clinicWhere(tenant), coupleId },
        include: claimListInclude,
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.insuranceQuery.count({
        where: {
          ...clinicWhere(tenant),
          status: { in: ["OPEN", "OVERDUE"] },
          claim: { coupleId },
        },
      }),
    ]);

    const amountRequested = claims.reduce((sum, row) => sum + dec(row.amountRequested), 0);
    const amountApproved = claims.reduce((sum, row) => sum + dec(row.amountApproved), 0);
    const amountPaid = claims.reduce((sum, row) => sum + dec(row.amountPaid), 0);

    return ok(c, {
      summary: {
        policies: policies.length,
        activePolicies: policies.filter((p) => p.status === "ACTIVE").length,
        claims: claims.length,
        activeClaims: claims.filter((c) => ACTIVE_CLAIM_STATUSES.includes(c.status)).length,
        openQueries,
        amountRequested,
        amountApproved,
        amountPaid,
      },
      policies: policies.map(serializePolicy),
      claims: claims.map(serializeClaim),
    });
  });
