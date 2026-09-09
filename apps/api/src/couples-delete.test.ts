import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";
import { createCoupleRecord } from "./modules/couples/service";

const PREFIX = "couple-delete";
const app = createApp();

type Fixture = {
  ctx: TenantContext;
  token: string;
  clinicId: string;
  otherToken: string;
  otherClinicId: string;
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

  if (clinicIds.length > 0) {
    await prisma.careTask.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.treatment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.consent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.document.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  }
}

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

async function json(res: Response) {
  return res.json() as Promise<{
    success?: boolean;
    data?: { id?: string; deleted?: boolean; mode?: string };
    error?: { code?: string; message?: string };
  }>;
}

before(async () => {
  await cleanup();
  const adminRole = await prisma.role.upsert({
    where: { key: "CLINIC_ADMIN" },
    update: {},
    create: { key: "CLINIC_ADMIN", name: "Clinic Admin" },
  });

  const orgA = await prisma.organization.create({
    data: { name: "Couple Delete Org A", slug: `${PREFIX}-org-a` },
  });
  const clinicA = await prisma.clinic.create({
    data: {
      organizationId: orgA.id,
      name: "Couple Delete Clinic A",
      slug: `${PREFIX}-clinic-a`,
      city: "Bangalore",
    },
  });
  const adminA = await prisma.user.create({
    data: {
      email: `adminA@${PREFIX}.demo`,
      passwordHash: "unused",
      name: "Delete Admin A",
    },
  });
  await prisma.clinicMembership.create({
    data: {
      clinicId: clinicA.id,
      userId: adminA.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  const orgB = await prisma.organization.create({
    data: { name: "Couple Delete Org B", slug: `${PREFIX}-org-b` },
  });
  const clinicB = await prisma.clinic.create({
    data: {
      organizationId: orgB.id,
      name: "Couple Delete Clinic B",
      slug: `${PREFIX}-clinic-b`,
      city: "Delhi",
    },
  });
  const adminB = await prisma.user.create({
    data: {
      email: `adminB@${PREFIX}.demo`,
      passwordHash: "unused",
      name: "Delete Admin B",
    },
  });
  await prisma.clinicMembership.create({
    data: {
      clinicId: clinicB.id,
      userId: adminB.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });

  const tokenA = await encodeSessionToken({
    id: adminA.id,
    organizationId: orgA.id,
    organizationName: orgA.name,
    clinicId: clinicA.id,
    clinicName: clinicA.name,
    role: "CLINIC_ADMIN",
    name: adminA.name,
    email: adminA.email,
  });
  const tokenB = await encodeSessionToken({
    id: adminB.id,
    organizationId: orgB.id,
    organizationName: orgB.name,
    clinicId: clinicB.id,
    clinicName: clinicB.name,
    role: "CLINIC_ADMIN",
    name: adminB.name,
    email: adminB.email,
  });

  fixture = {
    ctx: {
      userId: adminA.id,
      organizationId: orgA.id,
      organizationName: orgA.name,
      clinicId: clinicA.id,
      clinicName: clinicA.name,
      role: "CLINIC_ADMIN",
    },
    token: tokenA,
    clinicId: clinicA.id,
    otherToken: tokenB,
    otherClinicId: clinicB.id,
  };
});

after(async () => {
  await cleanup();
});

test("DELETE /api/v1/couples/:id archives couple and primary patient by default", async () => {
  const couple = await createCoupleRecord(fixture.ctx, {
    primary: {
      fullName: "Archana Iyer",
      dob: "1991-03-12",
      phone: "+919888001122",
      email: "archana@test.demo",
    },
    treatment: "IVF",
  });

  const res = await app.request(`/api/v1/couples/${couple.id}`, {
    method: "DELETE",
    headers: cookie(fixture.token),
  });

  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.success, true);
  assert.equal(body.data?.deleted, true);
  assert.equal(body.data?.mode, "archived");

  // Verify in database: couple is archived
  const dbCouple = await prisma.couple.findUnique({ where: { id: couple.id } });
  assert.ok(dbCouple);
  assert.equal(dbCouple.status, "ARCHIVED");
  assert.equal(dbCouple.careLoopActive, false);

  // Verify in database: patient is archived
  const dbPatient = await prisma.patient.findUnique({ where: { id: couple.primaryPatientId } });
  assert.ok(dbPatient);
  assert.equal(dbPatient.status, "ARCHIVED");

  // Verify listCouples does not return archived couple
  const listRes = await app.request("/api/v1/couples", {
    method: "GET",
    headers: cookie(fixture.token),
  });
  const listBody = (await listRes.json()) as { success: boolean; data: { id: string }[] };
  assert.equal(listBody.success, true);
  assert.equal(listBody.data.some((c) => c.id === couple.id), false);
});

test("DELETE /api/v1/couples/:id?permanent=1 permanently deletes couple and patients", async () => {
  const couple = await createCoupleRecord(fixture.ctx, {
    primary: {
      fullName: "Deepa Nair",
      dob: "1993-07-21",
      phone: "+919888003344",
      email: "deepa@test.demo",
    },
    partner: {
      fullName: "Karthik Nair",
      dob: "1990-09-15",
      phone: "+919888005566",
    },
    treatment: "IUI",
    whatsappConsent: true,
  });

  const res = await app.request(`/api/v1/couples/${couple.id}?permanent=1`, {
    method: "DELETE",
    headers: cookie(fixture.token),
  });

  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.success, true);
  assert.equal(body.data?.deleted, true);
  assert.equal(body.data?.mode, "permanent");

  // Verify couple is completely removed
  const dbCouple = await prisma.couple.findUnique({ where: { id: couple.id } });
  assert.equal(dbCouple, null);

  // Verify patients are completely removed
  const dbPrimary = await prisma.patient.findUnique({ where: { id: couple.primaryPatientId } });
  assert.equal(dbPrimary, null);
  if (couple.partnerPatientId) {
    const dbPartner = await prisma.patient.findUnique({ where: { id: couple.partnerPatientId } });
    assert.equal(dbPartner, null);
  }
});

test("DELETE /api/v1/couples/:slug allows deletion by slug", async () => {
  const couple = await createCoupleRecord(fixture.ctx, {
    primary: {
      fullName: "Sunita Rao",
      dob: "1994-01-10",
      phone: "+919888007788",
    },
    treatment: "Evaluation",
  });

  const res = await app.request(`/api/v1/couples/${couple.slug}?permanent=1`, {
    method: "DELETE",
    headers: cookie(fixture.token),
  });

  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.success, true);
  assert.equal(body.data?.deleted, true);

  const dbCouple = await prisma.couple.findUnique({ where: { id: couple.id } });
  assert.equal(dbCouple, null);
});

test("DELETE /api/v1/couples/:id enforces tenant isolation", async () => {
  const couple = await createCoupleRecord(fixture.ctx, {
    primary: {
      fullName: "Isolation Test",
      dob: "1992-05-15",
      phone: "+919888009900",
    },
    treatment: "IVF",
  });

  // Clinic B admin tries to delete Clinic A couple
  const res = await app.request(`/api/v1/couples/${couple.id}`, {
    method: "DELETE",
    headers: cookie(fixture.otherToken),
  });

  assert.ok(
    res.status === 403 || res.status === 404,
    `Expected 403 or 404 for cross-tenant access, got ${res.status}`,
  );

  // Ensure couple still exists
  const dbCouple = await prisma.couple.findUnique({ where: { id: couple.id } });
  assert.ok(dbCouple);
  assert.equal(dbCouple.status, "ACTIVE");
});

test("DELETE /api/v1/patients/:id permanently deletes patient and associated couple", async () => {
  const couple = await createCoupleRecord(fixture.ctx, {
    primary: {
      fullName: "Ritu Verma",
      dob: "1995-11-20",
      phone: "+919888002233",
    },
    treatment: "IVF",
  });

  const res = await app.request(`/api/v1/patients/${couple.primaryPatientId}?permanent=1`, {
    method: "DELETE",
    headers: cookie(fixture.token),
  });

  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.success, true);
  assert.equal(body.data?.deleted, true);
  assert.equal(body.data?.mode, "permanent");

  const dbPatient = await prisma.patient.findUnique({ where: { id: couple.primaryPatientId } });
  assert.equal(dbPatient, null);

  const dbCouple = await prisma.couple.findUnique({ where: { id: couple.id } });
  assert.equal(dbCouple, null);
});
