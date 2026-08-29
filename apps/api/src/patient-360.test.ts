import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "stage8-360";
const app = createApp();

type Fixture = {
  tokenA: string;
  tokenB: string;
  coupleAId: string;
  coupleASlug: string;
  patientAId: string;
  coupleBId: string;
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
    where: { email: { endsWith: `@${PREFIX}.demo` } },
    select: { id: true },
  });
  const userIds = users.map((row) => row.id);

  if (clinicIds.length > 0) {
    await prisma.careTask.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: clinicIds } } });
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
  return res.json() as Promise<Record<string, unknown>>;
}

before(async () => {
  await cleanup();
  const adminRole = await prisma.role.upsert({
    where: { key: "CLINIC_ADMIN" },
    update: {},
    create: { key: "CLINIC_ADMIN", name: "Clinic Admin" },
  });

  async function makeTenant(label: "a" | "b") {
    const organization = await prisma.organization.create({
      data: { name: `S8 Org ${label.toUpperCase()}`, slug: `${PREFIX}-org-${label}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `S8 Clinic ${label.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${label}`,
        city: "Bangalore",
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `${label}@${PREFIX}.demo`,
        passwordHash: "unused-api-test-hash",
        name: `S8 User ${label.toUpperCase()}`,
      },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: user.id, roleId: adminRole.id, status: "ACTIVE" },
    });
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Patient",
        lastName: label.toUpperCase(),
        gender: "FEMALE",
      },
    });
    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        slug: `${PREFIX}-couple-${label}`,
        primaryPatientId: patient.id,
        careLoopActive: true,
      },
    });
    await prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        kind: "IVF",
        label: "IVF Cycle 1",
        status: "ACTIVE",
      },
    });
    await prisma.careTask.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        title: "Follow-up call",
        status: "WAITING",
        dueDate: new Date(Date.now() - 2 * 86_400_000),
      },
    });
    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        type: "Follow-up",
        doctorName: "Dr Test",
        startsAt: new Date(Date.now() + 3 * 86_400_000),
        status: "CONFIRMED",
      },
    });
    const ctx: TenantContext = {
      userId: user.id,
      organizationId: organization.id,
      organizationName: organization.name,
      clinicId: clinic.id,
      clinicName: clinic.name,
      role: "CLINIC_ADMIN",
    };
    const token = await encodeSessionToken(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: organization.id,
        organizationName: organization.name,
        clinicId: clinic.id,
        clinicName: clinic.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );
    return { ctx, token, couple, patient };
  }

  const a = await makeTenant("a");
  const b = await makeTenant("b");
  fixture = {
    tokenA: a.token,
    tokenB: b.token,
    coupleAId: a.couple.id,
    coupleASlug: a.couple.slug,
    patientAId: a.patient.id,
    coupleBId: b.couple.id,
  };
});

after(async () => {
  await cleanup();
});

test("GET couple 360 returns header, timeline, and operational alerts", async () => {
  const res = await app.request(`/api/v1/couples/${fixture.coupleAId}/360`, {
    headers: cookie(fixture.tokenA),
  });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as {
    header: { patientName: string; attentionStatus: string };
    timeline: { items: unknown[] };
    attention: { alerts: unknown[]; note: string };
    summaryCards: { pendingTasks: number };
  };
  assert.equal(data.header.patientName.includes("Patient"), true);
  assert.equal(data.summaryCards.pendingTasks >= 1, true);
  assert.equal(Array.isArray(data.timeline.items), true);
  assert.equal(data.timeline.items.length >= 1, true);
  assert.match(data.attention.note, /operational/i);
});

test("GET couple 360 by slug works", async () => {
  const res = await app.request(`/api/v1/couples/${fixture.coupleASlug}/360`, {
    headers: cookie(fixture.tokenA),
  });
  assert.equal(res.status, 200);
});

test("GET patient 360 alias resolves couple", async () => {
  const res = await app.request(`/api/v1/patients/${fixture.patientAId}/360`, {
    headers: cookie(fixture.tokenA),
  });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as { couple: { id: string } };
  assert.equal(data.couple.id, fixture.coupleAId);
});

test("Clinic B cannot read Clinic A Patient 360", async () => {
  const res = await app.request(`/api/v1/couples/${fixture.coupleAId}/360`, {
    headers: cookie(fixture.tokenB),
  });
  assert.equal(res.status, 404);
});

test("Clinic A cannot read Clinic B Patient 360", async () => {
  const res = await app.request(`/api/v1/couples/${fixture.coupleBId}/360`, {
    headers: cookie(fixture.tokenA),
  });
  assert.equal(res.status, 404);
});
