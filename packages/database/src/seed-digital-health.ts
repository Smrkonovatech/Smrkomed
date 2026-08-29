import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

function hashAbha(digits: string) {
  return createHash("sha256").update(`smrkomed-abha:${digits}`).digest("hex");
}

function maskAbha(digits: string) {
  return `XX-XXXX-XXXX-${digits.slice(-4)}`;
}

/**
 * Demo / sandbox digital-health scenarios. Clearly labelled sandboxMode.
 * Does not invent production ABDM exchange success without provider confirmation.
 */
export async function seedClinicDigitalHealthData(input: {
  prisma: PrismaClient;
  clinicId: string;
  users: Record<string, { id: string; name: string }>;
}) {
  const { prisma, clinicId, users } = input;
  const admin = users["admin@abcfertility.demo"];

  const patients = await prisma.patient.findMany({
    where: { clinicId, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  if (patients.length < 3) {
    return { skipped: true as const, reason: "Need at least 3 patients" };
  }

  await prisma.healthRecordExchange.deleteMany({ where: { clinicId } });
  await prisma.digitalHealthConsent.deleteMany({ where: { clinicId } });
  await prisma.digitalHealthIdentity.deleteMany({ where: { clinicId } });

  const [p0, p1, p2, p3, p4, p5, p6] = patients;

  // 1) No ABHA — leave p0 without identity row

  // 2) Linked ABHA (sandbox demo)
  const linkedDigits = "12345678901234";
  await prisma.digitalHealthIdentity.create({
    data: {
      clinicId,
      patientId: p1!.id,
      abhaNumberHash: hashAbha(linkedDigits),
      abhaMasked: maskAbha(linkedDigits),
      status: "LINKED",
      verificationStatus: "DEMO_VERIFIED",
      linkedAt: new Date(Date.now() - 10 * 86_400_000),
      lastVerifiedAt: new Date(Date.now() - 2 * 86_400_000),
      source: "DEMO_SEED",
      sandboxMode: true,
    },
  });

  // 3) Verification pending
  const pendingDigits = "22345678901234";
  await prisma.digitalHealthIdentity.create({
    data: {
      clinicId,
      patientId: p2!.id,
      abhaNumberHash: hashAbha(pendingDigits),
      abhaMasked: maskAbha(pendingDigits),
      status: "VERIFICATION_REQUIRED",
      verificationStatus: "PENDING",
      source: "DEMO_SEED",
      sandboxMode: true,
    },
  });

  // 4–7) Consent scenarios on patients with enough rows
  const targets = [p1, p2, p3, p4, p5, p6].filter(Boolean);
  const consentDefs: Array<{
    patientId: string;
    status: "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "REJECTED";
    purpose: string;
    expiresOffsetDays: number;
  }> = [
    {
      patientId: targets[0]!.id,
      status: "PENDING",
      purpose: "Share consultation summary with referred specialist",
      expiresOffsetDays: 14,
    },
    {
      patientId: targets[0]!.id,
      status: "ACTIVE",
      purpose: "Continuity of care within clinic network",
      expiresOffsetDays: 20,
    },
    {
      patientId: targets[1]?.id ?? targets[0]!.id,
      status: "EXPIRED",
      purpose: "Expired demo consent for record review",
      expiresOffsetDays: -3,
    },
    {
      patientId: targets[2]?.id ?? targets[0]!.id,
      status: "REVOKED",
      purpose: "Revoked demo consent",
      expiresOffsetDays: 10,
    },
    {
      patientId: targets[3]?.id ?? targets[0]!.id,
      status: "REJECTED",
      purpose: "Rejected demo consent request",
      expiresOffsetDays: 10,
    },
  ];

  const consentIds: string[] = [];
  for (const def of consentDefs) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + def.expiresOffsetDays);
    const row = await prisma.digitalHealthConsent.create({
      data: {
        clinicId,
        patientId: def.patientId,
        purpose: def.purpose,
        requestedById: admin?.id ?? null,
        requestedByName: admin?.name ?? "Clinic Admin",
        expiresAt,
        dataCategories: ["Consultation", "Prescription"],
        status: def.status === "EXPIRED" ? "ACTIVE" : def.status,
        decidedAt: def.status === "PENDING" ? null : new Date(),
        notes: "SANDBOX demo consent — not an ABDM gateway artefact.",
        sandboxMode: true,
      },
    });
    consentIds.push(row.id);
    if (def.status === "EXPIRED") {
      // Keep ACTIVE in DB but past expiry — API serializer treats as EXPIRED
      await prisma.digitalHealthConsent.update({
        where: { id: row.id },
        data: { expiresAt },
      });
    }
  }

  const activeConsentId = consentIds[1]!;

  // 8) Prepared record
  await prisma.healthRecordExchange.create({
    data: {
      clinicId,
      patientId: p1!.id,
      consentId: activeConsentId,
      status: "PREPARED",
      purpose: "Demo prepare — local interop DTO",
      recordTypes: ["Patient", "Encounter", "MedicationRequest"],
      preparedPayload: {
        format: "SMRKOMED_INTEROP_V1",
        disclaimer: "Demo sandbox payload",
        resources: [],
      },
      idempotencyKey: `demo_prep_${clinicId}_${p1!.id}`,
      sandboxMode: true,
      createdById: admin?.id ?? null,
      preparedAt: new Date(),
    },
  });

  // 9) Successful share is NOT seeded as production — only PREPARED / FAILED demos
  // Optional: FAILED exchange
  await prisma.healthRecordExchange.create({
    data: {
      clinicId,
      patientId: p2!.id,
      consentId: consentIds[0] ?? null,
      status: "FAILED",
      purpose: "Demo share attempt without ABDM gateway",
      recordTypes: ["Patient", "Document"],
      preparedPayload: { format: "SMRKOMED_INTEROP_V1", resources: [] },
      idempotencyKey: `demo_fail_${clinicId}_${p2!.id}`,
      failureReason: "ABDM integration is not connected. Record was prepared locally but not shared.",
      sandboxMode: true,
      createdById: admin?.id ?? null,
      preparedAt: new Date(Date.now() - 86_400_000),
    },
  });

  return {
    skipped: false as const,
    identities: 2,
    consents: consentDefs.length,
    exchanges: 2,
    patientsWithoutAbha: 1,
  };
}
