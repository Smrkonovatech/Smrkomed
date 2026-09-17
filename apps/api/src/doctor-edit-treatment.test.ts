import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "doc-tr-test";
const app = createApp();

type Fixture = {
  tokenDoctorA: string;
  tokenDoctorB: string;
  clinicAId: string;
  clinicBId: string;
  coupleAId: string;
  treatmentAId: string;
};

let fixture: Fixture;

async function cleanup() {
  const clinics = await prisma.clinic.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true, organizationId: true },
  });
  const clinicIds = clinics.map((row) => row.id);
  const orgIds = [...new Set(clinics.map((row) => row.organizationId))];

  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${PREFIX}.smrko` } },
    select: { id: true },
  });
  const userIds = users.map((row) => row.id);

  if (clinicIds.length > 0) {
    await prisma.iVFCycle.deleteMany({ where: { treatment: { clinicId: { in: clinicIds } } } });
    await prisma.iUICycle.deleteMany({ where: { treatment: { clinicId: { in: clinicIds } } } });
    await prisma.treatment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
}

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

async function json(res: Response) {
  const payload = (await res.json()) as Record<string, unknown>;
  return (payload && typeof payload === "object" && "data" in payload ? payload["data"] : payload) as any;
}

before(async () => {
  await cleanup();

  const orgA = await prisma.organization.create({
    data: { name: "Doc Org A", slug: `${PREFIX}-org-a` },
  });
  const clinicA = await prisma.clinic.create({
    data: { organizationId: orgA.id, name: "Doc Clinic A", slug: `${PREFIX}-clinic-a` },
  });

  const orgB = await prisma.organization.create({
    data: { name: "Doc Org B", slug: `${PREFIX}-org-b` },
  });
  const clinicB = await prisma.clinic.create({
    data: { organizationId: orgB.id, name: "Doc Clinic B", slug: `${PREFIX}-clinic-b` },
  });

  const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });

  const doctorA = await prisma.user.create({
    data: {
      name: "Dr. Sharma",
      email: `doctorA@${PREFIX}.smrko`,
      passwordHash: "dummy-hash",
    },
  });
  await prisma.clinicMembership.create({
    data: {
      clinicId: clinicA.id,
      userId: doctorA.id,
      roleId: doctorRole.id,
    },
  });

  const doctorB = await prisma.user.create({
    data: {
      name: "Dr. Patel",
      email: `doctorB@${PREFIX}.smrko`,
      passwordHash: "dummy-hash",
    },
  });
  await prisma.clinicMembership.create({
    data: {
      clinicId: clinicB.id,
      userId: doctorB.id,
      roleId: doctorRole.id,
    },
  });

  const patientA = await prisma.patient.create({
    data: {
      clinicId: clinicA.id,
      firstName: "Pooja",
      lastName: "Verma",
      phone: "+919876543210",
      whatsappNumber: "+919876543210",
      gender: "FEMALE",
      dateOfBirth: new Date("1992-05-10"),
    },
  });

  const coupleA = await prisma.couple.create({
    data: {
      clinicId: clinicA.id,
      slug: `${PREFIX}-cpl-a`,
      primaryPatientId: patientA.id,
      assignedDoctorId: doctorA.id,
    },
  });

  const treatmentA = await prisma.treatment.create({
    data: {
      clinicId: clinicA.id,
      coupleId: coupleA.id,
      kind: "IVF",
      label: "Initial IVF Assessment",
      status: "ACTIVE",
      stageIndex: 1,
      stageName: "Initial Consultation",
      startedAt: new Date(),
    },
  });

  await prisma.iVFCycle.create({
    data: {
      treatmentId: treatmentA.id,
      cycleNumber: 1,
      notes: "Baseline scan planned",
    },
  });

  const tokenDoctorA = await encodeSessionToken({
    id: doctorA.id,
    email: doctorA.email,
    name: doctorA.name,
    role: "DOCTOR",
    organizationId: orgA.id,
    organizationName: orgA.name,
    clinicId: clinicA.id,
    clinicName: clinicA.name,
  });

  const tokenDoctorB = await encodeSessionToken({
    id: doctorB.id,
    email: doctorB.email,
    name: doctorB.name,
    role: "DOCTOR",
    organizationId: orgB.id,
    organizationName: orgB.name,
    clinicId: clinicB.id,
    clinicName: clinicB.name,
  });

  fixture = {
    tokenDoctorA,
    tokenDoctorB,
    clinicAId: clinicA.id,
    clinicBId: clinicB.id,
    coupleAId: coupleA.id,
    treatmentAId: treatmentA.id,
  };
});

after(async () => {
  await cleanup();
});

test("Doctor can fetch treatment details via GET /api/v1/treatments/:id", async () => {
  const res = await app.request(`/api/v1/treatments/${fixture.treatmentAId}`, {
    headers: cookie(fixture.tokenDoctorA),
  });
  assert.equal(res.status, 200);
  const data = (await json(res)) as any;
  assert.equal(data.id, fixture.treatmentAId);
  assert.equal(data.kind, "IVF");
  assert.equal(data.label, "Initial IVF Assessment");
  assert.equal(data.stageName, "Initial Consultation");
  assert.equal(data.cycleNumber, 1);
  assert.equal(data.notes, "Baseline scan planned");
});

test("Doctor can edit treatment via PATCH /api/v1/treatments/:id", async () => {
  const res = await app.request(`/api/v1/treatments/${fixture.treatmentAId}`, {
    method: "PATCH",
    headers: {
      ...cookie(fixture.tokenDoctorA),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "IVF",
      label: "IVF Antagonist Protocol - Cycle 2",
      status: "ACTIVE",
      stageIndex: 4,
      stageName: "Ovarian Stimulation",
      cycleNumber: 2,
      notes: "Gonal-F 225 IU daily starting Day 2. Follicular scan Day 6.",
    }),
  });
  assert.equal(res.status, 200);
  const data = (await json(res)) as any;
  assert.equal(data.label, "IVF Antagonist Protocol - Cycle 2");
  assert.equal(data.stageIndex, 4);
  assert.equal(data.stageName, "Ovarian Stimulation");
  assert.equal(data.cycleNumber, 2);
  assert.equal(data.notes, "Gonal-F 225 IU daily starting Day 2. Follicular scan Day 6.");

  // Verify in database
  const updatedInDb = await prisma.treatment.findUnique({
    where: { id: fixture.treatmentAId },
    include: { ivfCycle: true },
  });
  assert.equal(updatedInDb?.label, "IVF Antagonist Protocol - Cycle 2");
  assert.equal(updatedInDb?.stageIndex, 4);
  assert.equal(updatedInDb?.stageName, "Ovarian Stimulation");
  assert.equal(updatedInDb?.ivfCycle?.cycleNumber, 2);
  assert.equal(updatedInDb?.ivfCycle?.notes, "Gonal-F 225 IU daily starting Day 2. Follicular scan Day 6.");
});

test("Doctor can edit treatment directly via PATCH /api/v1/couples/:id/treatment", async () => {
  const res = await app.request(`/api/v1/couples/${fixture.coupleAId}/treatment`, {
    method: "PATCH",
    headers: {
      ...cookie(fixture.tokenDoctorA),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stageIndex: 7,
      stageName: "Follicular Monitoring",
      status: "NEEDS_ATTENTION",
      notes: "Lead follicle 16mm on right ovary. Add Cetrotide 0.25mg.",
    }),
  });
  assert.equal(res.status, 200);
  const data = (await json(res)) as any;
  assert.equal(data.stageIndex, 7);
  assert.equal(data.stageName, "Follicular Monitoring");
  assert.equal(data.status, "NEEDS_ATTENTION");
  assert.equal(data.notes, "Lead follicle 16mm on right ovary. Add Cetrotide 0.25mg.");
});

test("Patient 360 aggregator returns updated treatment details including stage, cycleNumber, and notes", async () => {
  const res = await app.request(`/api/v1/couples/${fixture.coupleAId}/360`, {
    headers: cookie(fixture.tokenDoctorA),
  });
  assert.equal(res.status, 200);
  const data = (await json(res)) as any;
  assert.ok(data.header.currentTreatment);
  assert.equal(data.header.currentTreatment.id, fixture.treatmentAId);
  assert.equal(data.header.currentTreatment.stageName, "Follicular Monitoring");
  assert.equal(data.header.currentTreatment.status, "NEEDS_ATTENTION");
  assert.equal(data.header.currentTreatment.cycleNumber, 2);
  assert.equal(data.header.currentTreatment.notes, "Lead follicle 16mm on right ovary. Add Cetrotide 0.25mg.");
});

test("Tenant isolation: Doctor from Clinic B cannot view or edit Clinic A's treatment", async () => {
  const getRes = await app.request(`/api/v1/treatments/${fixture.treatmentAId}`, {
    headers: cookie(fixture.tokenDoctorB),
  });
  assert.equal(getRes.status, 404);

  const patchRes = await app.request(`/api/v1/treatments/${fixture.treatmentAId}`, {
    method: "PATCH",
    headers: {
      ...cookie(fixture.tokenDoctorB),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label: "Unauthorized attempt" }),
  });
  assert.equal(patchRes.status, 404);
});
