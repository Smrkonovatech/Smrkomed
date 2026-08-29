import { Hono } from "hono";
import { PERMISSIONS, prisma, type TenantContext } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { abdmProvider, hashAbha, maskAbha, normalizeAbhaDigits } from "./abdm-provider";
import { buildInteropBundle } from "./interop";
import {
  createConsentSchema,
  idParam,
  linkAbhaSchema,
  patientIdParam,
  prepareExchangeSchema,
  shareExchangeSchema,
} from "./schemas";

function clinicWhere(tenant: TenantContext) {
  return { clinicId: tenant.clinicId };
}

function serializeIdentity(
  row: {
    id: string;
    clinicId: string;
    patientId: string;
    abhaMasked: string | null;
    abhaAddress: string | null;
    status: string;
    verificationStatus: string | null;
    linkedAt: Date | null;
    lastVerifiedAt: Date | null;
    source: string | null;
    sandboxMode: boolean;
    errorMessage: string | null;
    updatedAt: Date;
  } | null,
  patientId: string,
) {
  if (!row) {
    return {
      patientId,
      status: "NOT_LINKED" as const,
      abhaMasked: null,
      abhaAddress: null,
      verificationStatus: null,
      linkedAt: null,
      lastVerifiedAt: null,
      source: null,
      sandboxMode: true,
      errorMessage: null,
      consentHint: "ABHA link is separate from messaging consent and ABDM HI consent.",
    };
  }
  return {
    id: row.id,
    patientId: row.patientId,
    status: row.status,
    abhaMasked: row.abhaMasked,
    abhaAddress: row.abhaAddress,
    verificationStatus: row.verificationStatus,
    linkedAt: row.linkedAt?.toISOString() ?? null,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    source: row.source,
    sandboxMode: row.sandboxMode,
    errorMessage: row.errorMessage,
    updatedAt: row.updatedAt.toISOString(),
    consentHint: "ABHA link is separate from messaging consent and ABDM HI consent.",
  };
}

function serializeConsent(row: {
  id: string;
  clinicId: string;
  patientId: string;
  purpose: string;
  requestedById: string | null;
  requestedByName: string | null;
  requestedAt: Date;
  expiresAt: Date | null;
  dataCategories: unknown;
  status: string;
  externalConsentId: string | null;
  careTaskId: string | null;
  notes: string | null;
  decidedAt: Date | null;
  sandboxMode: boolean;
  patient?: { firstName: string; lastName: string } | null;
}) {
  const now = Date.now();
  let status = row.status;
  if (status === "ACTIVE" && row.expiresAt && row.expiresAt.getTime() < now) {
    status = "EXPIRED";
  }
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patient
      ? `${row.patient.firstName} ${row.patient.lastName}`.trim()
      : null,
    purpose: row.purpose,
    requestedById: row.requestedById,
    requestedByName: row.requestedByName,
    requestedAt: row.requestedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    dataCategories: Array.isArray(row.dataCategories) ? row.dataCategories : [],
    status,
    externalConsentId: row.externalConsentId,
    careTaskId: row.careTaskId,
    notes: row.notes,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    sandboxMode: row.sandboxMode,
  };
}

function serializeExchange(row: {
  id: string;
  clinicId: string;
  patientId: string;
  consentId: string | null;
  status: string;
  purpose: string;
  recordTypes: unknown;
  dateFrom: Date | null;
  dateTo: Date | null;
  receivingEntity: string | null;
  preparedPayload: unknown;
  idempotencyKey: string;
  externalReferenceId: string | null;
  failureReason: string | null;
  sandboxMode: boolean;
  preparedAt: Date | null;
  sharedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    patientId: row.patientId,
    consentId: row.consentId,
    status: row.status,
    purpose: row.purpose,
    recordTypes: Array.isArray(row.recordTypes) ? row.recordTypes : [],
    dateFrom: row.dateFrom?.toISOString() ?? null,
    dateTo: row.dateTo?.toISOString() ?? null,
    receivingEntity: row.receivingEntity,
    hasPreparedPayload: Boolean(row.preparedPayload),
    preparedPayload: row.preparedPayload ?? null,
    idempotencyKey: row.idempotencyKey,
    externalReferenceId: row.externalReferenceId,
    failureReason: row.failureReason,
    sandboxMode: row.sandboxMode,
    preparedAt: row.preparedAt?.toISOString() ?? null,
    sharedAt: row.sharedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadPatient(tenant: TenantContext, patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  await requireClinicOwned(tenant, patient);
  if (!patient) throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient could not be found.");
  return patient;
}

async function buildTimeline(tenant: TenantContext, patientId: string) {
  const patient = await loadPatient(tenant, patientId);
  const couples = await prisma.couple.findMany({
    where: {
      clinicId: tenant.clinicId,
      OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
    },
    select: { id: true },
  });
  const coupleIds = couples.map((c) => c.id);

  const [appointments, prescriptions, sales, documents, treatments, carePlans, consultations] =
    await Promise.all([
      coupleIds.length
        ? prisma.appointment.findMany({
            where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
            orderBy: { startsAt: "desc" },
            take: 40,
          })
        : Promise.resolve([]),
      prisma.pharmacyPrescription.findMany({
        where: { clinicId: tenant.clinicId, patientId },
        include: { items: true, doctor: { select: { name: true } } },
        orderBy: { prescriptionDate: "desc" },
        take: 40,
      }),
      prisma.pharmacySale.findMany({
        where: { clinicId: tenant.clinicId, patientId },
        orderBy: { soldAt: "desc" },
        take: 20,
      }),
      prisma.document.findMany({
        where: { clinicId: tenant.clinicId, patientId },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      coupleIds.length
        ? prisma.treatment.findMany({
            where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
            orderBy: { updatedAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      coupleIds.length
        ? prisma.carePlan.findMany({
            where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
            orderBy: { updatedAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      coupleIds.length
        ? prisma.consultationNote.findMany({
            where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
            include: { createdBy: { select: { name: true } } },
            orderBy: { consultationDate: "desc" },
            take: 40,
          })
        : Promise.resolve([]),
    ]);

  type TimelineItem = {
    id: string;
    date: string;
    type: string;
    title: string;
    doctor: string | null;
    clinic: string;
    relatedTreatmentId: string | null;
    href: string | null;
    recordStatus: string | null;
  };

  const items: TimelineItem[] = [];
  const clinicName = tenant.clinicName;

  for (const a of appointments) {
    items.push({
      id: `appt-${a.id}`,
      date: a.startsAt.toISOString(),
      type: "Appointment",
      title: a.type,
      doctor: a.doctorName,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: `/appointments`,
      recordStatus: a.status,
    });
  }
  for (const c of consultations) {
    items.push({
      id: `consult-${c.id}`,
      date: c.consultationDate.toISOString(),
      type: "Consultation",
      title: c.reasonForVisit?.slice(0, 80) || "Consultation note",
      doctor: c.createdBy?.name ?? null,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: null,
    });
  }
  for (const rx of prescriptions) {
    items.push({
      id: `rx-${rx.id}`,
      date: rx.prescriptionDate.toISOString(),
      type: "Prescription",
      title: rx.items.map((i) => i.medicineName).join(", ") || "Prescription",
      doctor: rx.doctorName ?? rx.doctor?.name ?? null,
      clinic: clinicName,
      relatedTreatmentId: rx.treatmentId,
      href: `/pharmacy/prescriptions/${rx.id}`,
      recordStatus: rx.status,
    });
  }
  for (const sale of sales) {
    items.push({
      id: `sale-${sale.id}`,
      date: sale.soldAt.toISOString(),
      type: "Medication dispensed",
      title: sale.invoiceNumber,
      doctor: null,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: `/pharmacy/sales/${sale.id}`,
      recordStatus: sale.paymentStatus,
    });
  }
  for (const t of treatments) {
    items.push({
      id: `tx-${t.id}`,
      date: t.updatedAt.toISOString(),
      type: "Treatment",
      title: t.label,
      doctor: null,
      clinic: clinicName,
      relatedTreatmentId: t.id,
      href: null,
      recordStatus: t.status,
    });
  }
  for (const p of carePlans) {
    items.push({
      id: `cp-${p.id}`,
      date: p.updatedAt.toISOString(),
      type: "Care plan",
      title: String(p.type),
      doctor: null,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: p.status,
    });
  }
  for (const d of documents) {
    items.push({
      id: `doc-${d.id}`,
      date: d.createdAt.toISOString(),
      type: "Document",
      title: d.name,
      doctor: null,
      clinic: clinicName,
      relatedTreatmentId: null,
      href: null,
      recordStatus: d.storageKey ? d.status : "METADATA_ONLY",
    });
  }

  items.sort((a, b) => b.date.localeCompare(a.date));

  const storageConfigured = documents.some((d) => Boolean(d.storageKey));

  return {
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`.trim(),
    documentStorageNote: storageConfigured
      ? null
      : "Document storage is not configured. Only document metadata from SMRKOMED is listed.",
    categories: {
      demographics: true,
      consultations: consultations.length,
      treatments: treatments.length,
      prescriptions: prescriptions.length,
      medications: sales.length,
      documents: documents.length,
      carePlans: carePlans.length,
      appointments: appointments.length,
    },
    timeline: items.slice(0, 100),
  };
}

export const digitalHealthRoutes = new Hono<AppEnv>()
  // ─── Clinic ABDM settings / dashboard ──────────────────────────────────────
  .get("/abdm/status", async (c) => {
    requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    return ok(c, abdmProvider.getConnectionInfo());
  })
  .post("/abdm/test-connection", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.ABDM_SETTINGS);
    const result = await abdmProvider.verifyConnection();
    await audit(tenant, "abdm.connection_test", "AbdmProvider", tenant.clinicId, {
      status: result.status,
    });
    return ok(c, result);
  })
  .get("/dashboard", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const connection = abdmProvider.getConnectionInfo();

    const [
      linked,
      pending,
      notLinkedPatients,
      activeConsents,
      pendingConsents,
      shared,
      failed,
      totalPatients,
    ] = await Promise.all([
      prisma.digitalHealthIdentity.count({
        where: { ...clinicWhere(tenant), status: "LINKED" },
      }),
      prisma.digitalHealthIdentity.count({
        where: {
          ...clinicWhere(tenant),
          status: { in: ["PENDING", "VERIFICATION_REQUIRED"] },
        },
      }),
      prisma.patient.count({
        where: {
          clinicId: tenant.clinicId,
          status: { not: "ARCHIVED" },
          digitalHealthIdentity: null,
        },
      }),
      prisma.digitalHealthConsent.count({
        where: { ...clinicWhere(tenant), status: "ACTIVE" },
      }),
      prisma.digitalHealthConsent.count({
        where: { ...clinicWhere(tenant), status: "PENDING" },
      }),
      prisma.healthRecordExchange.count({
        where: { ...clinicWhere(tenant), status: "SHARED" },
      }),
      prisma.healthRecordExchange.count({
        where: { ...clinicWhere(tenant), status: "FAILED" },
      }),
      prisma.patient.count({
        where: { clinicId: tenant.clinicId, status: { not: "ARCHIVED" } },
      }),
    ]);

    return ok(c, {
      connection,
      totals: {
        patientsLinkedToAbha: linked,
        patientsNotLinked: notLinkedPatients,
        pendingVerification: pending,
        activeConsents,
        pendingConsentRequests: pendingConsents,
        recordsShared: shared,
        failedExchanges: failed,
        totalPatients,
      },
      note: connection.connected
        ? null
        : "ABDM connection required for live identity verification and record exchange. Local counts reflect SMRKOMED data only.",
    });
  })
  .get("/consents", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CONSENT_VIEW);
    const status = c.req.query("status");
    const rows = await prisma.digitalHealthConsent.findMany({
      where: {
        ...clinicWhere(tenant),
        ...(status ? { status: status as never } : {}),
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
    const serialized = rows.map(serializeConsent);
    const now = Date.now();
    const expiringSoon = serialized.filter(
      (r) =>
        r.status === "ACTIVE" &&
        r.expiresAt &&
        new Date(r.expiresAt).getTime() - now < 7 * 86_400_000 &&
        new Date(r.expiresAt).getTime() > now,
    );
    return ok(c, {
      cards: {
        active: serialized.filter((r) => r.status === "ACTIVE").length,
        pending: serialized.filter((r) => r.status === "PENDING").length,
        expiringSoon: expiringSoon.length,
        revoked: serialized.filter((r) => r.status === "REVOKED").length,
        rejected: serialized.filter((r) => r.status === "REJECTED").length,
        expired: serialized.filter((r) => r.status === "EXPIRED").length,
      },
      items: serialized,
    });
  })

  // ─── Patient digital health ────────────────────────────────────────────────
  .get("/patients/:patientId", validate("param", patientIdParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const { patientId } = c.req.valid("param");
    await loadPatient(tenant, patientId);
    const [identity, consents, exchanges, timeline] = await Promise.all([
      prisma.digitalHealthIdentity.findUnique({ where: { patientId } }),
      prisma.digitalHealthConsent.findMany({
        where: { ...clinicWhere(tenant), patientId },
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { requestedAt: "desc" },
        take: 50,
      }),
      prisma.healthRecordExchange.findMany({
        where: { ...clinicWhere(tenant), patientId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      buildTimeline(tenant, patientId),
    ]);
    return ok(c, {
      connection: abdmProvider.getConnectionInfo(),
      identity: serializeIdentity(identity, patientId),
      consents: consents.map(serializeConsent),
      exchanges: exchanges.map(serializeExchange),
      records: timeline,
    });
  })
  .get("/patients/:patientId/abha", validate("param", patientIdParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const { patientId } = c.req.valid("param");
    await loadPatient(tenant, patientId);
    const identity = await prisma.digitalHealthIdentity.findUnique({ where: { patientId } });
    return ok(c, {
      connection: abdmProvider.getConnectionInfo(),
      identity: serializeIdentity(identity, patientId),
    });
  })
  .post(
    "/patients/:patientId/abha/link",
    validate("param", patientIdParam),
    validate("json", linkAbhaSchema),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.ABHA_LINK);
      const { patientId } = c.req.valid("param");
      const body = c.req.valid("json");
      const patient = await loadPatient(tenant, patientId);
      const digits = normalizeAbhaDigits(body.abhaNumber);
      const abhaHash = hashAbha(digits);
      const masked = maskAbha(digits);

      const existingSame = await prisma.digitalHealthIdentity.findFirst({
        where: {
          clinicId: tenant.clinicId,
          abhaNumberHash: abhaHash,
          status: { in: ["LINKED", "PENDING", "VERIFICATION_REQUIRED"] },
          NOT: { patientId },
        },
        include: { patient: true },
      });
      if (existingSame) {
        if (body.confirmPossibleMatchPatientId !== existingSame.patientId) {
          throw new HttpError(409, "POSSIBLE_MATCH", "Possible match found. Confirm before linking.", {
            possibleMatchPatientId: existingSame.patientId,
            possibleMatchName: `${existingSame.patient.firstName} ${existingSame.patient.lastName}`.trim(),
            abhaMasked: masked,
          });
        }
        throw new HttpError(
          409,
          "ABHA_ALREADY_LINKED",
          "This ABHA is already linked to another patient in this clinic.",
        );
      }

      const providerResult = await abdmProvider.linkAbha({
        abhaNumber: digits,
        patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      });
      if (!providerResult.ok) {
        throw new HttpError(503, providerResult.code, providerResult.message);
      }

      const nextStatus = providerResult.verificationRequired ? "VERIFICATION_REQUIRED" : "PENDING";
      const identity = await prisma.digitalHealthIdentity.upsert({
        where: { patientId },
        create: {
          clinicId: tenant.clinicId,
          patientId,
          abhaNumberHash: abhaHash,
          abhaMasked: masked,
          abhaAddress: body.abhaAddress ?? null,
          status: nextStatus,
          verificationStatus: "PENDING",
          source: providerResult.mode === "gateway" ? "ABDM_GATEWAY" : "LINK_INTENT",
          sandboxMode: providerResult.mode !== "gateway" || abdmProvider.getConnectionInfo().environment !== "production",
          errorMessage: null,
        },
        update: {
          abhaNumberHash: abhaHash,
          abhaMasked: masked,
          abhaAddress: body.abhaAddress ?? null,
          status: nextStatus,
          verificationStatus: "PENDING",
          source: providerResult.mode === "gateway" ? "ABDM_GATEWAY" : "LINK_INTENT",
          sandboxMode: providerResult.mode !== "gateway" || abdmProvider.getConnectionInfo().environment !== "production",
          errorMessage: null,
        },
      });

      await audit(tenant, "abha.link", "DigitalHealthIdentity", identity.id, {
        status: identity.status,
        sandbox: identity.sandboxMode,
      });

      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "ABHA_VERIFICATION_REQUIRED",
            triggerEventId: `abha_verify_${identity.id}`,
            patientId,
            vars: {
              clinic_name: tenant.clinicName,
              patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
            },
          }),
        )
        .catch(() => undefined);

      return ok(c, {
        identity: serializeIdentity(identity, patientId),
        providerMessage: providerResult.message,
        connection: abdmProvider.getConnectionInfo(),
      });
    },
  )
  .post("/patients/:patientId/abha/verify", validate("param", patientIdParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.ABHA_VERIFY);
    const { patientId } = c.req.valid("param");
    await loadPatient(tenant, patientId);
    const identity = await prisma.digitalHealthIdentity.findUnique({ where: { patientId } });
    if (!identity || identity.status === "NOT_LINKED") {
      throw new HttpError(422, "ABHA_NOT_LINKED", "ABHA is not linked to this patient.");
    }

    const result = await abdmProvider.verifyAbha({ abhaNumberHash: identity.abhaNumberHash ?? "" });
    if (!result.ok) {
      throw new HttpError(503, result.code, result.message);
    }

    // Only demo_intent may mark LINKED without gateway OTP. Gateway stays VERIFICATION_REQUIRED.
    const updated =
      result.mode === "demo_intent"
        ? await prisma.digitalHealthIdentity.update({
            where: { id: identity.id },
            data: {
              status: "LINKED",
              verificationStatus: "DEMO_VERIFIED",
              linkedAt: identity.linkedAt ?? new Date(),
              lastVerifiedAt: new Date(),
              sandboxMode: true,
              errorMessage: null,
            },
          })
        : await prisma.digitalHealthIdentity.update({
            where: { id: identity.id },
            data: {
              status: "VERIFICATION_REQUIRED",
              verificationStatus: "AWAITING_ABDM",
              errorMessage: result.message,
            },
          });

    await audit(tenant, "abha.verify", "DigitalHealthIdentity", updated.id, {
      mode: result.mode,
      status: updated.status,
    });

    if (updated.status === "LINKED") {
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "ABHA_LINKED",
            triggerEventId: `abha_linked_${updated.id}`,
            patientId,
            vars: { clinic_name: tenant.clinicName },
          }),
        )
        .catch(() => undefined);
    }

    return ok(c, {
      identity: serializeIdentity(updated, patientId),
      providerMessage: result.message,
    });
  })
  .delete("/patients/:patientId/abha", validate("param", patientIdParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.ABHA_LINK);
    const { patientId } = c.req.valid("param");
    await loadPatient(tenant, patientId);
    const identity = await prisma.digitalHealthIdentity.findUnique({ where: { patientId } });
    if (!identity) {
      return ok(c, { identity: serializeIdentity(null, patientId) });
    }
    const updated = await prisma.digitalHealthIdentity.update({
      where: { id: identity.id },
      data: {
        status: "NOT_LINKED",
        abhaNumberHash: null,
        abhaMasked: null,
        abhaAddress: null,
        verificationStatus: null,
        linkedAt: null,
        lastVerifiedAt: null,
        errorMessage: null,
        source: "UNLINKED",
      },
    });
    await audit(tenant, "abha.unlink", "DigitalHealthIdentity", updated.id);
    return ok(c, { identity: serializeIdentity(updated, patientId) });
  })

  // Consents
  .get("/patients/:patientId/consents", validate("param", patientIdParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CONSENT_VIEW);
    const { patientId } = c.req.valid("param");
    await loadPatient(tenant, patientId);
    const rows = await prisma.digitalHealthConsent.findMany({
      where: { ...clinicWhere(tenant), patientId },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { requestedAt: "desc" },
    });
    return ok(c, rows.map(serializeConsent));
  })
  .post(
    "/patients/:patientId/consents",
    validate("param", patientIdParam),
    validate("json", createConsentSchema),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
      const { patientId } = c.req.valid("param");
      const body = c.req.valid("json");
      const patient = await loadPatient(tenant, patientId);

      let careTaskId: string | null = null;
      if (body.createCareTask !== false) {
        const couple = await prisma.couple.findFirst({
          where: {
            clinicId: tenant.clinicId,
            OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
          },
          select: { id: true },
        });
        const task = await prisma.careTask.create({
          data: {
            clinicId: tenant.clinicId,
            ...(couple ? { coupleId: couple.id } : {}),
            title: `Digital health consent: ${body.purpose.slice(0, 80)}`,
            description:
              "Patient action required. Follow up on health-information consent. Do not share clinical details over WhatsApp.",
            category: "DIGITAL_HEALTH",
            status: "WAITING",
            priority: "NORMAL",
            dueDate: new Date(Date.now() + 2 * 86_400_000),
            ...(tenant.userId !== "system-worker" ? { createdById: tenant.userId } : {}),
          },
        });
        careTaskId = task.id;
      }

      const requester = await prisma.user.findUnique({
        where: { id: tenant.userId },
        select: { name: true },
      });
      const consent = await prisma.digitalHealthConsent.create({
        data: {
          clinicId: tenant.clinicId,
          patientId,
          purpose: body.purpose,
          requestedById: tenant.userId !== "system-worker" ? tenant.userId : null,
          requestedByName: requester?.name ?? "Clinic staff",
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 30 * 86_400_000),
          dataCategories: body.dataCategories,
          status: "PENDING",
          notes: body.notes ?? "Patient action required.",
          careTaskId,
          sandboxMode: !abdmProvider.getConnectionInfo().connected,
        },
        include: { patient: { select: { firstName: true, lastName: true } } },
      });

      await audit(tenant, "consent.create", "DigitalHealthConsent", consent.id, {
        status: consent.status,
      });

      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "CONSENT_REQUESTED",
            triggerEventId: `consent_req_${consent.id}`,
            patientId,
            vars: {
              clinic_name: tenant.clinicName,
              patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
            },
          }),
        )
        .catch(() => undefined);

      return ok(c, serializeConsent(consent), 201);
    },
  )
  .post("/consents/:id/approve", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const { id } = c.req.valid("param");
    const consent = await prisma.digitalHealthConsent.findUnique({
      where: { id },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    await requireClinicOwned(tenant, consent);
    if (!consent) throw new HttpError(404, "CONSENT_NOT_FOUND", "Consent request was not found.");
    if (consent.status !== "PENDING" && consent.status !== "DRAFT") {
      throw new HttpError(422, "INVALID_STATUS", "Only pending consent requests can be approved.");
    }
    const updated = await prisma.digitalHealthConsent.update({
      where: { id },
      data: { status: "ACTIVE", decidedAt: new Date() },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    await audit(tenant, "consent.approve", "DigitalHealthConsent", updated.id);
    return ok(c, serializeConsent(updated));
  })
  .post("/consents/:id/reject", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const { id } = c.req.valid("param");
    const consent = await prisma.digitalHealthConsent.findUnique({
      where: { id },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    await requireClinicOwned(tenant, consent);
    if (!consent) throw new HttpError(404, "CONSENT_NOT_FOUND", "Consent request was not found.");
    const updated = await prisma.digitalHealthConsent.update({
      where: { id },
      data: { status: "REJECTED", decidedAt: new Date() },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    await audit(tenant, "consent.reject", "DigitalHealthConsent", updated.id);
    return ok(c, serializeConsent(updated));
  })
  .post("/consents/:id/revoke", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CONSENT_MANAGE);
    const { id } = c.req.valid("param");
    const consent = await prisma.digitalHealthConsent.findUnique({
      where: { id },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    await requireClinicOwned(tenant, consent);
    if (!consent) throw new HttpError(404, "CONSENT_NOT_FOUND", "Consent request was not found.");
    const updated = await prisma.digitalHealthConsent.update({
      where: { id },
      data: { status: "REVOKED", decidedAt: new Date() },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    await audit(tenant, "consent.revoke", "DigitalHealthConsent", updated.id);
    return ok(c, serializeConsent(updated));
  })

  // Records / exchange
  .get("/patients/:patientId/health-records", validate("param", patientIdParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const { patientId } = c.req.valid("param");
    return ok(c, await buildTimeline(tenant, patientId));
  })
  .post(
    "/patients/:patientId/health-records/prepare",
    validate("param", patientIdParam),
    validate("json", prepareExchangeSchema),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.RECORD_EXPORT);
      const { patientId } = c.req.valid("param");
      const body = c.req.valid("json");
      const patient = await loadPatient(tenant, patientId);

      const existing = await prisma.healthRecordExchange.findUnique({
        where: {
          clinicId_idempotencyKey: {
            clinicId: tenant.clinicId,
            idempotencyKey: body.idempotencyKey,
          },
        },
      });
      if (existing) {
        return ok(c, serializeExchange(existing));
      }

      if (body.consentId) {
        const consent = await prisma.digitalHealthConsent.findUnique({ where: { id: body.consentId } });
        await requireClinicOwned(tenant, consent);
        if (!consent || consent.patientId !== patientId) {
          throw new HttpError(422, "CONSENT_MISMATCH", "Consent does not belong to this patient.");
        }
        if (consent.status !== "ACTIVE") {
          throw new HttpError(422, "CONSENT_REQUIRED", "Active consent is required before preparing a shareable exchange.");
        }
      }

      const timeline = await buildTimeline(tenant, patientId);
      const couples = await prisma.couple.findMany({
        where: {
          clinicId: tenant.clinicId,
          OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
        },
        select: { id: true },
      });
      const coupleIds = couples.map((c) => c.id);
      const dateFrom = body.dateFrom ? new Date(body.dateFrom) : null;
      const dateTo = body.dateTo ? new Date(body.dateTo) : null;

      const [appointments, consultations, treatments, carePlans, prescriptions, documents] =
        await Promise.all([
          coupleIds.length
            ? prisma.appointment.findMany({
                where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
                take: 50,
              })
            : [],
          coupleIds.length
            ? prisma.consultationNote.findMany({
                where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
                include: { createdBy: { select: { name: true } } },
                take: 50,
              })
            : [],
          coupleIds.length
            ? prisma.treatment.findMany({
                where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
                take: 50,
              })
            : [],
          coupleIds.length
            ? prisma.carePlan.findMany({
                where: { clinicId: tenant.clinicId, coupleId: { in: coupleIds } },
                take: 50,
              })
            : [],
          prisma.pharmacyPrescription.findMany({
            where: { clinicId: tenant.clinicId, patientId },
            include: { items: true, doctor: { select: { name: true } } },
            take: 50,
          }),
          prisma.document.findMany({
            where: { clinicId: tenant.clinicId, patientId },
            take: 50,
          }),
        ]);

      const bundle = buildInteropBundle({
        clinicId: tenant.clinicId,
        clinicName: tenant.clinicName,
        patient,
        appointments,
        consultations: consultations.map((x) => ({
          id: x.id,
          createdAt: x.consultationDate,
          reason: x.reasonForVisit,
          summary: x.summary,
          nextSteps: x.nextSteps,
          authorName: x.createdBy?.name ?? null,
        })),
        treatments,
        carePlans: carePlans.map((p) => ({
          id: p.id,
          type: String(p.type),
          status: p.status,
          updatedAt: p.updatedAt,
        })),
        prescriptions: prescriptions.map((rx) => ({
          id: rx.id,
          prescriptionDate: rx.prescriptionDate,
          status: rx.status,
          doctorName: rx.doctorName ?? rx.doctor?.name ?? null,
          items: rx.items.map((i) => ({
            medicineName: i.medicineName,
            dosage: i.dosage,
            instructions: i.instructions,
          })),
        })),
        documents,
        recordTypes: body.recordTypes,
        dateFrom,
        dateTo,
      });

      const exchange = await prisma.healthRecordExchange.create({
        data: {
          clinicId: tenant.clinicId,
          patientId,
          consentId: body.consentId ?? null,
          status: body.consentId ? "PREPARED" : "CONSENT_REQUIRED",
          purpose: body.purpose,
          recordTypes: body.recordTypes,
          dateFrom,
          dateTo,
          receivingEntity: body.receivingEntity ?? null,
          preparedPayload: bundle as object,
          idempotencyKey: body.idempotencyKey,
          sandboxMode: !abdmProvider.getConnectionInfo().connected,
          createdById: tenant.userId !== "system-worker" ? tenant.userId : null,
          preparedAt: new Date(),
        },
      });

      await audit(tenant, "record.prepare", "HealthRecordExchange", exchange.id, {
        status: exchange.status,
        resourceCount: bundle.resources.length,
      });

      return ok(
        c,
        {
          ...serializeExchange(exchange),
          timelineHint: timeline.categories,
        },
        201,
      );
    },
  )
  .post(
    "/health-record-exchanges/:id/share",
    validate("param", idParam),
    validate("json", shareExchangeSchema),
    async (c) => {
      const tenant = requirePermission(c, PERMISSIONS.RECORD_SHARE);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const exchange = await prisma.healthRecordExchange.findUnique({ where: { id } });
      await requireClinicOwned(tenant, exchange);
      if (!exchange) throw new HttpError(404, "EXCHANGE_NOT_FOUND", "Exchange was not found.");
      if (!exchange.preparedPayload) {
        throw new HttpError(422, "NOT_PREPARED", "Prepare the record before sharing.");
      }

      const consentId = body.consentId ?? exchange.consentId;
      if (!consentId) {
        throw new HttpError(422, "CONSENT_REQUIRED", "Active consent is required before sharing.");
      }
      const consent = await prisma.digitalHealthConsent.findUnique({ where: { id: consentId } });
      await requireClinicOwned(tenant, consent);
      if (!consent || consent.patientId !== exchange.patientId || consent.status !== "ACTIVE") {
        throw new HttpError(422, "CONSENT_REQUIRED", "Active consent is required before sharing.");
      }
      if (consent.expiresAt && consent.expiresAt.getTime() < Date.now()) {
        throw new HttpError(422, "CONSENT_EXPIRED", "Consent has expired.");
      }

      const sharing = await prisma.healthRecordExchange.update({
        where: { id },
        data: { status: "SHARING", consentId },
      });

      const shareResult = await abdmProvider.shareRecord({
        exchangeId: sharing.id,
        payloadSummary: "SMRKOMED_INTEROP_V1",
      });

      if (!shareResult.ok) {
        const failed = await prisma.healthRecordExchange.update({
          where: { id },
          data: {
            status: "FAILED",
            failureReason: shareResult.message,
          },
        });
        await audit(tenant, "record.exchange_failed", "HealthRecordExchange", failed.id, {
          code: shareResult.code,
        });

        const couple = await prisma.couple.findFirst({
          where: {
            clinicId: tenant.clinicId,
            OR: [
              { primaryPatientId: exchange.patientId },
              { partnerPatientId: exchange.patientId },
            ],
          },
          select: { id: true },
        });
        await prisma.careTask.create({
          data: {
            clinicId: tenant.clinicId,
            ...(couple ? { coupleId: couple.id } : {}),
            title: "Record sharing failed",
            description: shareResult.message,
            category: "DIGITAL_HEALTH",
            status: "WAITING",
            priority: "HIGH",
            dueDate: new Date(),
          },
        });

        throw new HttpError(503, shareResult.code, shareResult.message, {
          exchange: serializeExchange(failed),
        });
      }

      // Only reached if provider confirms — currently share always fails honestly when not fully wired.
      const shared = await prisma.healthRecordExchange.update({
        where: { id },
        data: {
          status: "SHARED",
          sharedAt: new Date(),
          externalReferenceId: shareResult.externalReferenceId,
          failureReason: null,
        },
      });
      await audit(tenant, "record.share", "HealthRecordExchange", shared.id);
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "RECORD_SHARED",
            triggerEventId: `record_shared_${shared.id}`,
            patientId: shared.patientId,
            vars: { clinic_name: tenant.clinicName },
          }),
        )
        .catch(() => undefined);
      return ok(c, serializeExchange(shared));
    },
  )
  .get("/health-record-exchanges/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.DIGITAL_HEALTH_VIEW);
    const { id } = c.req.valid("param");
    const exchange = await prisma.healthRecordExchange.findUnique({ where: { id } });
    await requireClinicOwned(tenant, exchange);
    if (!exchange) throw new HttpError(404, "EXCHANGE_NOT_FOUND", "Exchange was not found.");
    return ok(c, serializeExchange(exchange));
  });
