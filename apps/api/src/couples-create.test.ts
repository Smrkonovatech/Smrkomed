import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";
import { createCoupleRecord } from "./modules/couples/service";

const PREFIX = "couple-create";
const app = createApp();

type Fixture = {
  ctx: TenantContext;
  token: string;
  clinicId: string;
  doctorId: string;
  coordinatorId: string;
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
    data?: { id?: string; slug?: string; careLoop?: string; partner?: unknown };
    error?: { code?: string; message?: string; requestId?: string; details?: { step?: string } };
  }>;
}

before(async () => {
  await cleanup();
  const adminRole = await prisma.role.upsert({
    where: { key: "CLINIC_ADMIN" },
    update: {},
    create: { key: "CLINIC_ADMIN", name: "Clinic Admin" },
  });
  const doctorRole = await prisma.role.upsert({
    where: { key: "DOCTOR" },
    update: {},
    create: { key: "DOCTOR", name: "Doctor" },
  });
  const coordinatorRole = await prisma.role.upsert({
    where: { key: "CARE_COORDINATOR" },
    update: {},
    create: { key: "CARE_COORDINATOR", name: "Care Coordinator" },
  });

  const organization = await prisma.organization.create({
    data: { name: "Couple Create Org", slug: `${PREFIX}-org` },
  });
  const clinic = await prisma.clinic.create({
    data: {
      organizationId: organization.id,
      name: "Couple Create Clinic",
      slug: `${PREFIX}-clinic`,
      city: "Bangalore",
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: `admin@${PREFIX}.demo`,
      passwordHash: "unused",
      name: "Couple Admin",
    },
  });
  const doctor = await prisma.user.create({
    data: {
      email: `doctor@${PREFIX}.demo`,
      passwordHash: "unused",
      name: "Couple Doctor",
    },
  });
  const coordinator = await prisma.user.create({
    data: {
      email: `coord@${PREFIX}.demo`,
      passwordHash: "unused",
      name: "Couple Coordinator",
    },
  });
  await prisma.clinicMembership.createMany({
    data: [
      { clinicId: clinic.id, userId: admin.id, roleId: adminRole.id, status: "ACTIVE" },
      { clinicId: clinic.id, userId: doctor.id, roleId: doctorRole.id, status: "ACTIVE" },
      {
        clinicId: clinic.id,
        userId: coordinator.id,
        roleId: coordinatorRole.id,
        status: "ACTIVE",
      },
    ],
  });

  const ctx: TenantContext = {
    userId: admin.id,
    organizationId: organization.id,
    organizationName: organization.name,
    clinicId: clinic.id,
    clinicName: clinic.name,
    role: "CLINIC_ADMIN",
  };
  const token = await encodeSessionToken({
    id: admin.id,
    organizationId: organization.id,
    organizationName: organization.name,
    clinicId: clinic.id,
    clinicName: clinic.name,
    role: "CLINIC_ADMIN",
    name: admin.name,
    email: admin.email,
  });

  fixture = {
    ctx,
    token,
    clinicId: clinic.id,
    doctorId: doctor.id,
    coordinatorId: coordinator.id,
  };
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function primary(label: string) {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return {
    fullName: `${label} ${stamp}`,
    dob: "1990-01-15",
    phone: `98${stamp.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
    language: "English",
  };
}

test("create couple: primary only, care plan none, whatsapp off", async () => {
  const created = await createCoupleRecord(fixture.ctx, {
    primary: primary("PrimaryNone"),
    treatment: "IVF",
    whatsappConsent: false,
    carePlanTemplate: "None",
  });
  assert.ok(created.id);
  const plans = await prisma.carePlan.count({ where: { coupleId: created.id } });
  const tasks = await prisma.careTask.count({ where: { coupleId: created.id } });
  const consents = await prisma.consent.count({
    where: { patientId: created.primaryPatientId },
  });
  const treatments = await prisma.treatment.count({ where: { coupleId: created.id } });
  assert.equal(plans, 0);
  assert.equal(tasks, 0);
  assert.equal(consents, 0);
  assert.equal(treatments, 1);
  assert.equal(created.careLoopActive, false);
});

test("create couple: whatsapp on creates consent", async () => {
  const created = await createCoupleRecord(fixture.ctx, {
    primary: primary("PrimaryConsent"),
    treatment: "IVF",
    whatsappConsent: true,
    carePlanTemplate: "None",
  });
  const consents = await prisma.consent.count({
    where: { patientId: created.primaryPatientId, consentType: "WHATSAPP_COMMUNICATION" },
  });
  assert.equal(consents, 1);
});

test("create couple: care plan IVF creates plan and task", async () => {
  const created = await createCoupleRecord(fixture.ctx, {
    primary: primary("PrimaryPlan"),
    treatment: "IVF",
    whatsappConsent: false,
    carePlanTemplate: "IVF",
  });
  const plans = await prisma.carePlan.count({ where: { coupleId: created.id } });
  const tasks = await prisma.careTask.count({ where: { coupleId: created.id } });
  assert.equal(plans, 1);
  assert.equal(tasks, 1);
});

test("create couple: doctor and coordinator assignment", async () => {
  const created = await createCoupleRecord(fixture.ctx, {
    primary: primary("Assigned"),
    treatment: "IUI",
    whatsappConsent: false,
    carePlanTemplate: "None",
    assignedDoctorId: fixture.doctorId,
    assignedCoordinatorId: fixture.coordinatorId,
  });
  assert.equal(created.assignedDoctorId, fixture.doctorId);
  assert.equal(created.assignedCoordinatorId, fixture.coordinatorId);
});

test("create couple: partner creates two patients", async () => {
  const stamp = Date.now().toString(36);
  const created = await createCoupleRecord(fixture.ctx, {
    primary: {
      fullName: `PartnerA ${stamp}`,
      dob: "1988-02-01",
      phone: `9711${stamp.slice(-6)}`,
      language: "English",
    },
    partner: {
      fullName: `PartnerB ${stamp}`,
      dob: "1989-03-02",
      phone: `9722${stamp.slice(-6)}`,
      language: "English",
    },
    treatment: "IVF",
    whatsappConsent: true,
    carePlanTemplate: "None",
  });
  assert.ok(created.partnerPatientId);
  const consents = await prisma.consent.count({
    where: {
      patientId: { in: [created.primaryPatientId, created.partnerPatientId!] },
    },
  });
  assert.equal(consents, 2);
});

test("create couple: invalid doctor rejected", async () => {
  await assert.rejects(
    () =>
      createCoupleRecord(fixture.ctx, {
        primary: primary("BadDoctor"),
        treatment: "IVF",
        carePlanTemplate: "None",
        assignedDoctorId: "missing-doctor-id",
      }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "DOCTOR_NOT_FOUND",
  );
});

test("create couple: invalid coordinator rejected", async () => {
  await assert.rejects(
    () =>
      createCoupleRecord(fixture.ctx, {
        primary: primary("BadCoord"),
        treatment: "IVF",
        carePlanTemplate: "None",
        assignedCoordinatorId: "missing-coord-id",
      }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "COORDINATOR_NOT_FOUND",
  );
});

test("create couple: missing clinic fails cleanly", async () => {
  await assert.rejects(
    () =>
      createCoupleRecord(
        { ...fixture.ctx, clinicId: "missing-clinic-id" },
        {
          primary: primary("NoClinic"),
          treatment: "IVF",
          carePlanTemplate: "None",
        },
      ),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "CLINIC_NOT_FOUND",
  );
});

test("create couple: care task FK failure rolls back patient/couple/treatment/plan", async () => {
  const beforePatients = await prisma.patient.count({ where: { clinicId: fixture.clinicId } });
  const beforeCouples = await prisma.couple.count({ where: { clinicId: fixture.clinicId } });
  const beforeTreatments = await prisma.treatment.count({ where: { clinicId: fixture.clinicId } });
  const beforePlans = await prisma.carePlan.count({ where: { clinicId: fixture.clinicId } });

  const stamp = Date.now().toString(36);
  await assert.rejects(async () => {
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          clinicId: fixture.clinicId,
          firstName: "Rollback",
          lastName: stamp,
          phone: `9600${stamp.slice(-6)}`,
        },
        select: { id: true },
      });
      const couple = await tx.couple.create({
        data: {
          clinicId: fixture.clinicId,
          slug: `${PREFIX}-rb-${stamp}`,
          primaryPatientId: patient.id,
        },
        select: { id: true },
      });
      await tx.treatment.create({
        data: {
          clinicId: fixture.clinicId,
          coupleId: couple.id,
          kind: "IVF",
          label: "IVF intake",
          status: "ACTIVE",
        },
        select: { id: true },
      });
      const plan = await tx.carePlan.create({
        data: {
          clinicId: fixture.clinicId,
          coupleId: couple.id,
          type: "IVF",
          name: "IVF",
          status: "ACTIVE",
        },
        select: { id: true },
      });
      await tx.careTask.create({
        data: {
          clinicId: fixture.clinicId,
          coupleId: couple.id,
          carePlanId: plan.id,
          title: "Initial consultation",
          createdById: "definitely-missing-user-id",
        },
      });
    });
  });

  const afterPatients = await prisma.patient.count({ where: { clinicId: fixture.clinicId } });
  const afterCouples = await prisma.couple.count({ where: { clinicId: fixture.clinicId } });
  const afterTreatments = await prisma.treatment.count({ where: { clinicId: fixture.clinicId } });
  const afterPlans = await prisma.carePlan.count({ where: { clinicId: fixture.clinicId } });
  assert.equal(afterPatients, beforePatients);
  assert.equal(afterCouples, beforeCouples);
  assert.equal(afterTreatments, beforeTreatments);
  assert.equal(afterPlans, beforePlans);
});

test("HTTP POST /api/v1/couples returns 201 for care plan none", async () => {
  const person = primary("HttpNone");
  const res = await app.request("http://localhost/api/v1/couples", {
    method: "POST",
    headers: { "content-type": "application/json", ...cookie(fixture.token) },
    body: JSON.stringify({
      primary: person,
      treatment: "IVF",
      whatsappConsent: false,
      carePlanTemplate: "None",
    }),
  });
  const body = await json(res);
  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.ok(body.data?.id);
});

test("HTTP GET /api/v1/users/staff returns doctors and coordinators", async () => {
  const res = await app.request("http://localhost/api/v1/users/staff", {
    headers: cookie(fixture.token),
  });
  const body = (await res.json()) as {
    success: boolean;
    data: Array<{ id: string; role: string }>;
  };
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  const roles = body.data.map((row) => row.role);
  assert.ok(roles.includes("DOCTOR"));
  assert.ok(roles.includes("CARE_COORDINATOR"));
});

test("HTTP staff unauthenticated is 401", async () => {
  const res = await app.request("http://localhost/api/v1/users/staff");
  assert.equal(res.status, 401);
});
