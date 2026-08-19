import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "phase5-admin";
const app = createApp();

type Fixture = {
  tokenPlatform: string;
  tokenOrgAdmin: string;
  tokenClinicAdmin: string;
  tokenDoctor: string;
  orgAId: string;
  orgBId: string;
  clinicAId: string;
  userAId: string;
  integrationAId: string;
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
    await prisma.message.deleteMany({ where: { conversation: { clinicId: { in: clinicIds } } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppTemplate.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppAccount.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationOauthState.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integration.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.leadActivity.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lead.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.campaign.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.leadActivity.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.lead.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.campaign.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.subscription.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((row) => row.id) } } });
  }
}

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

async function tokenFor(ctx: TenantContext, email: string, name: string) {
  return encodeSessionToken(
    {
      id: ctx.userId,
      name,
      email,
      organizationId: ctx.organizationId,
      organizationName: ctx.organizationName,
      clinicId: ctx.clinicId,
      clinicName: ctx.clinicName,
      role: ctx.role,
    },
    "authjs.session-token",
  );
}

before(async () => {
  await cleanup();
  const roles = await Promise.all(
    (["PLATFORM_ADMIN", "ORGANIZATION_ADMIN", "CLINIC_ADMIN", "DOCTOR"] as const).map((key) =>
      prisma.role.upsert({
        where: { key },
        update: {},
        create: { key, name: key },
      }),
    ),
  );
  const role = Object.fromEntries(roles.map((row) => [row.key, row.id]));

  async function makeOrg(label: "a" | "b" | "p", staffRole: "ORGANIZATION_ADMIN" | "CLINIC_ADMIN" | "DOCTOR" | "PLATFORM_ADMIN") {
    const organization = await prisma.organization.create({
      data: { name: `Admin Org ${label.toUpperCase()}`, slug: `${PREFIX}-org-${label}`, status: "ACTIVE" },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `Admin Clinic ${label.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${label}`,
        city: "Bangalore",
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `${label}@${PREFIX}.demo`,
        passwordHash: "unused-admin-test-hash",
        name: `Admin User ${label.toUpperCase()}`,
      },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: user.id, roleId: role[staffRole]!, status: "ACTIVE" },
    });
    const ctx: TenantContext = {
      userId: user.id,
      organizationId: organization.id,
      organizationName: organization.name,
      clinicId: clinic.id,
      clinicName: clinic.name,
      role: staffRole,
    };
    return { organization, clinic, user, ctx, token: await tokenFor(ctx, user.email, user.name) };
  }

  const platform = await makeOrg("p", "PLATFORM_ADMIN");
  const orgA = await makeOrg("a", "ORGANIZATION_ADMIN");
  const clinicAdmin = await prisma.user.create({
    data: { email: `clinic@${PREFIX}.demo`, passwordHash: "unused", name: "Clinic Admin A" },
  });
  await prisma.clinicMembership.create({
    data: { clinicId: orgA.clinic.id, userId: clinicAdmin.id, roleId: role["CLINIC_ADMIN"]!, status: "ACTIVE" },
  });
  const doctor = await prisma.user.create({
    data: { email: `doctor@${PREFIX}.demo`, passwordHash: "unused", name: "Doctor A" },
  });
  await prisma.clinicMembership.create({
    data: { clinicId: orgA.clinic.id, userId: doctor.id, roleId: role["DOCTOR"]!, status: "ACTIVE" },
  });
  const orgB = await makeOrg("b", "CLINIC_ADMIN");

  const integration = await prisma.integration.create({
    data: {
      organizationId: orgA.organization.id,
      clinicId: orgA.clinic.id,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      displayName: "WhatsApp A",
      encryptedCredentials: "super-secret-token",
      externalAccountId: "waba_secret_account",
    },
  });
  await prisma.patient.create({ data: { clinicId: orgA.clinic.id, firstName: "Priya", lastName: "Admin" } });
  await prisma.subscription.create({
    data: {
      organizationId: orgA.organization.id,
      plan: "GROWTH",
      status: "ACTIVE",
      trialEndsAt: new Date("2026-09-01T00:00:00.000Z"),
    },
  });

  const clinicAdminCtx: TenantContext = {
    userId: clinicAdmin.id,
    organizationId: orgA.organization.id,
    organizationName: orgA.organization.name,
    clinicId: orgA.clinic.id,
    clinicName: orgA.clinic.name,
    role: "CLINIC_ADMIN",
  };
  const doctorCtx: TenantContext = {
    userId: doctor.id,
    organizationId: orgA.organization.id,
    organizationName: orgA.organization.name,
    clinicId: orgA.clinic.id,
    clinicName: orgA.clinic.name,
    role: "DOCTOR",
  };

  fixture = {
    tokenPlatform: platform.token,
    tokenOrgAdmin: orgA.token,
    tokenClinicAdmin: await tokenFor(clinicAdminCtx, clinicAdmin.email, clinicAdmin.name),
    tokenDoctor: await tokenFor(doctorCtx, doctor.email, doctor.name),
    orgAId: orgA.organization.id,
    orgBId: orgB.organization.id,
    clinicAId: orgA.clinic.id,
    userAId: orgA.user.id,
    integrationAId: integration.id,
  };
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test("unauthenticated admin request is 401", async () => {
  const res = await app.request("/api/v1/admin/organizations");
  assert.equal(res.status, 401);
});

test("organization admin cannot access platform admin routes", async () => {
  const res = await app.request("/api/v1/admin/organizations", { headers: cookie(fixture.tokenOrgAdmin) });
  assert.equal(res.status, 403);
});

test("clinic admin cannot access platform admin routes", async () => {
  const res = await app.request("/api/v1/admin/dashboard", { headers: cookie(fixture.tokenClinicAdmin) });
  assert.equal(res.status, 403);
});

test("doctor cannot access platform admin routes", async () => {
  const res = await app.request("/api/v1/admin/users", { headers: cookie(fixture.tokenDoctor) });
  assert.equal(res.status, 403);
});

test("platform admin can list organizations including A and B", async () => {
  const res = await app.request("/api/v1/admin/organizations?page=1&pageSize=25", {
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as { items: { id: string }[]; page: number; pageSize: number; total: number };
  assert.equal(data.page, 1);
  assert.equal(data.pageSize, 25);
  assert.equal(data.items.some((row) => row.id === fixture.orgAId), true);
  assert.equal(data.items.some((row) => row.id === fixture.orgBId), true);
});

test("platform admin can inspect organization A and B", async () => {
  const a = await app.request(`/api/v1/admin/organizations/${fixture.orgAId}`, {
    headers: cookie(fixture.tokenPlatform),
  });
  const b = await app.request(`/api/v1/admin/organizations/${fixture.orgBId}`, {
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
});

test("unknown organization is 404", async () => {
  const res = await app.request("/api/v1/admin/organizations/does-not-exist", {
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(res.status, 404);
});

test("GET /api/v1/admin/dashboard", async () => {
  const res = await app.request("/api/v1/admin/dashboard", { headers: cookie(fixture.tokenPlatform) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as { totals: { organizations: number } };
  assert.equal(data.totals.organizations > 0, true);
});

test("GET /api/v1/admin/clinics and users", async () => {
  const clinics = await app.request("/api/v1/admin/clinics?q=Admin Clinic A", {
    headers: cookie(fixture.tokenPlatform),
  });
  const users = await app.request(`/api/v1/admin/users?organizationId=${fixture.orgAId}`, {
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(clinics.status, 200);
  assert.equal(users.status, 200);
  const clinicBody = await json(clinics);
  const items = (clinicBody["data"] as { items: { id: string }[] }).items;
  assert.equal(items.some((row) => row.id === fixture.clinicAId), true);
});

test("GET /api/v1/admin/integrations redacts credentials", async () => {
  const res = await app.request("/api/v1/admin/integrations", { headers: cookie(fixture.tokenPlatform) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const items = (body["data"] as { items: Record<string, unknown>[] }).items;
  const match = items.find((row) => row["id"] === fixture.integrationAId);
  assert.equal(Boolean(match), true);
  assert.equal("encryptedCredentials" in (match ?? {}), false);
  assert.equal("externalAccountId" in (match ?? {}), false);
  assert.equal(String(match?.["externalAccount"]).includes("waba_secret_account"), false);
});

test("GET /api/v1/admin/integrations/:id never returns secrets", async () => {
  const res = await app.request(`/api/v1/admin/integrations/${fixture.integrationAId}`, {
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as Record<string, unknown>;
  assert.equal("encryptedCredentials" in data, false);
  assert.equal("config" in data, false);
});

test("GET /api/v1/admin/audit-logs", async () => {
  const res = await app.request("/api/v1/admin/audit-logs?page=1&pageSize=10", {
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(res.status, 200);
});

test("GET /api/v1/admin/system/health", async () => {
  const res = await app.request("/api/v1/admin/system/health", { headers: cookie(fixture.tokenPlatform) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as Record<string, unknown>;
  assert.equal(data["api"], "ok");
  assert.equal("DATABASE_URL" in data, false);
  assert.equal("AUTH_SECRET" in data, false);
});

test("organization admin cannot read another organization via clinic APIs", async () => {
  const res = await app.request(`/api/v1/clinics/current`, { headers: cookie(fixture.tokenOrgAdmin) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const clinic = body["data"] as { organizationId: string };
  assert.equal(clinic.organizationId, fixture.orgAId);
});
