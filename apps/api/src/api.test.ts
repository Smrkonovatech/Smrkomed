import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "phase4-api";
const app = createApp();

type Fixture = {
  ctxA: TenantContext;
  ctxB: TenantContext;
  tokenA: string;
  tokenB: string;
  clinicAId: string;
  clinicBId: string;
  patientAId: string;
  patientBId: string;
  coupleAId: string;
  leadAId: string;
  leadBId: string;
  planAId: string;
  planBId: string;
  taskAId: string;
  appointmentAId: string;
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
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.leadActivity.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integration.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lead.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.campaign.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.leadActivity.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.lead.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.campaign.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
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
      data: { name: `API Org ${label.toUpperCase()}`, slug: `${PREFIX}-org-${label}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `API Clinic ${label.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${label}`,
        city: label === "a" ? "Bangalore" : "Chennai",
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `${label}@${PREFIX}.demo`,
        passwordHash: "unused-api-test-hash",
        name: `API User ${label.toUpperCase()}`,
      },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: user.id, roleId: adminRole.id, status: "ACTIVE" },
    });
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: label === "a" ? "Asha" : "Bhavna",
        lastName: "Api",
      },
    });
    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        slug: `${PREFIX}-couple-${label}`,
        primaryPatientId: patient.id,
      },
    });
    const plan = await prisma.carePlan.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        type: "IVF",
        name: `Plan ${label.toUpperCase()}`,
      },
    });
    const task = await prisma.careTask.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        carePlanId: plan.id,
        title: `Task ${label.toUpperCase()}`,
      },
    });
    const appointment = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        type: "Consult",
        startsAt: new Date("2026-09-01T04:30:00.000Z"),
      },
    });
    const lead = await prisma.lead.create({
      data: {
        organizationId: organization.id,
        clinicId: clinic.id,
        name: `Lead ${label.toUpperCase()}`,
        source: "WEBSITE",
      },
    });
    await prisma.integration.create({
      data: {
        organizationId: organization.id,
        clinicId: clinic.id,
        provider: "WHATSAPP_CLOUD",
        status: "ACTIVE",
        displayName: `WhatsApp ${label.toUpperCase()}`,
        encryptedCredentials: "should-never-be-returned",
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
    return {
      ctx,
      token,
      clinicId: clinic.id,
      patientId: patient.id,
      coupleId: couple.id,
      leadId: lead.id,
      planId: plan.id,
      taskId: task.id,
      appointmentId: appointment.id,
    };
  }

  const a = await makeTenant("a");
  const b = await makeTenant("b");
  fixture = {
    ctxA: a.ctx,
    ctxB: b.ctx,
    tokenA: a.token,
    tokenB: b.token,
    clinicAId: a.clinicId,
    clinicBId: b.clinicId,
    patientAId: a.patientId,
    patientBId: b.patientId,
    coupleAId: a.coupleId,
    leadAId: a.leadId,
    leadBId: b.leadId,
    planAId: a.planId,
    planBId: b.planId,
    taskAId: a.taskId,
    appointmentAId: a.appointmentId,
  };
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test("GET /api/v1/health", async () => {
  const res = await app.request("/api/v1/health");
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body["status"], "ok");
  assert.equal(body["database"], "connected");
  assert.equal("DATABASE_URL" in body, false);
});

test("unauthenticated request is 401", async () => {
  const res = await app.request("/api/v1/patients");
  assert.equal(res.status, 401);
  const body = await json(res);
  assert.equal((body["error"] as { code: string })["code"], "UNAUTHENTICATED");
});

test("authenticated request returns current clinic", async () => {
  const res = await app.request("/api/v1/clinics/current", { headers: cookie(fixture.tokenA) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as { id: string };
  assert.equal(data.id, fixture.clinicAId);
});

test("clinic A can access clinic A patient", async () => {
  const res = await app.request(`/api/v1/patients/${fixture.patientAId}`, { headers: cookie(fixture.tokenA) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as { id: string };
  assert.equal(data.id, fixture.patientAId);
});

test("clinic A cannot access clinic B patient", async () => {
  const res = await app.request(`/api/v1/patients/${fixture.patientBId}`, { headers: cookie(fixture.tokenA) });
  assert.equal(res.status, 403);
});

test("organization A cannot access organization B lead", async () => {
  const res = await app.request(`/api/v1/leads/${fixture.leadBId}`, { headers: cookie(fixture.tokenA) });
  assert.equal(res.status, 403);
});

test("create patient uses session clinic", async () => {
  const res = await app.request("/api/v1/patients", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Nisha", lastName: "Created", clinicId: fixture.clinicBId }),
  });
  assert.equal(res.status, 422);

  const created = await app.request("/api/v1/patients", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Nisha", lastName: "Created" }),
  });
  assert.equal(created.status, 201);
  const body = await json(created);
  const data = body["data"] as { clinicId: string; firstName: string };
  assert.equal(data.clinicId, fixture.clinicAId);
  assert.equal(data.firstName, "Nisha");
});

test("create lead is scoped to the session organization", async () => {
  const res = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Walk-in", source: "WALK_IN", organizationId: fixture.ctxB.organizationId }),
  });
  assert.equal(res.status, 422);

  const created = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Walk-in", source: "WALK_IN" }),
  });
  assert.equal(created.status, 201);
  const body = await json(created);
  const data = body["data"] as { organizationId: string; clinicId: string };
  assert.equal(data.organizationId, fixture.ctxA.organizationId);
  assert.equal(data.clinicId, fixture.clinicAId);
});

test("create appointment enforces clinic authorization", async () => {
  const res = await app.request("/api/v1/appointments", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "Content-Type": "application/json" },
    body: JSON.stringify({
      coupleId: fixture.coupleAId,
      type: "Scan",
      startsAt: "2026-09-02T04:30:00.000Z",
    }),
  });
  assert.equal(res.status, 201);
  const body = await json(res);
  const data = body["data"] as { clinicId: string };
  assert.equal(data.clinicId, fixture.clinicAId);
});

test("care plan access is clinic-scoped", async () => {
  const own = await app.request(`/api/v1/care-plans/${fixture.planAId}`, { headers: cookie(fixture.tokenA) });
  assert.equal(own.status, 200);
  const foreign = await app.request(`/api/v1/care-plans/${fixture.planBId}`, { headers: cookie(fixture.tokenA) });
  assert.equal(foreign.status, 403);
});

test("integration metadata never includes credentials", async () => {
  const res = await app.request("/api/v1/integrations", { headers: cookie(fixture.tokenA) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const rows = body["data"] as Record<string, unknown>[];
  assert.equal(rows.length > 0, true);
  for (const row of rows) {
    assert.equal("encryptedCredentials" in row, false);
    assert.equal("config" in row, false);
  }

  const one = await app.request("/api/v1/integrations/WHATSAPP_CLOUD", { headers: cookie(fixture.tokenA) });
  assert.equal(one.status, 200);
  const oneBody = await json(one);
  const data = oneBody["data"] as Record<string, unknown>;
  assert.equal("encryptedCredentials" in data, false);
});

test("care task update is clinic-scoped", async () => {
  const res = await app.request(`/api/v1/care-tasks/${fixture.taskAId}`, {
    method: "PATCH",
    headers: { ...cookie(fixture.tokenA), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
  assert.equal(res.status, 200);

  const foreign = await app.request(`/api/v1/appointments/${fixture.appointmentAId}`, {
    headers: cookie(fixture.tokenB),
  });
  assert.equal(foreign.status, 403);
});

test("clinic list does not include another organization's clinics", async () => {
  const res = await app.request("/api/v1/clinics", { headers: cookie(fixture.tokenA) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const rows = body["data"] as { id: string }[];
  assert.equal(rows.some((row) => row.id === fixture.clinicAId), true);
  assert.equal(rows.some((row) => row.id === fixture.clinicBId), false);
});

test("mutations write audit logs without clinical payload", async () => {
  const created = await app.request("/api/v1/patients", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Audit", lastName: "Check" }),
  });
  assert.equal(created.status, 201);
  const body = await json(created);
  const patient = body["data"] as { id: string };
  const logs = await prisma.auditLog.findMany({
    where: { clinicId: fixture.clinicAId, action: "patient.create", entityId: patient.id },
  });
  assert.equal(logs.length > 0, true);
  const metadata = logs[0]?.metadata as Record<string, unknown> | null;
  if (metadata) {
    assert.equal("password" in metadata, false);
    assert.equal("token" in metadata, false);
  }
});
