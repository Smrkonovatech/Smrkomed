import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { hash } from "bcryptjs";

import {
  TenantAccessError,
  assertClinicAccess,
  createLeadForTenant,
  getAppointmentsForClinic,
  getCarePlansForClinic,
  getIntegrationsForClinic,
  getLeadsForOrganization,
  getPatientsForClinic,
  ingestPublicLeadByClinicSlug,
  prisma,
  type TenantContext,
} from "./index";

const PREFIX = "phase3-iso";

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
    await prisma.appointment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integration.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.leadActivity.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lead.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.campaign.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.leadActivity.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.lead.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.campaign.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

type Fixture = {
  ctxA: TenantContext;
  ctxB: TenantContext;
  clinicAId: string;
  clinicBId: string;
  patientAId: string;
  patientBId: string;
};

let fixture: Fixture;

before(async () => {
  await cleanup();
  const passwordHash = await hash("Demo@12345", 10);
  const adminRole = await prisma.role.upsert({
    where: { key: "CLINIC_ADMIN" },
    update: {},
    create: { key: "CLINIC_ADMIN", name: "Clinic Admin" },
  });

  async function makeTenant(label: "a" | "b") {
    const organization = await prisma.organization.create({
      data: { name: `Isolation Org ${label.toUpperCase()}`, slug: `${PREFIX}-org-${label}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `Isolation Clinic ${label.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${label}`,
        city: label === "a" ? "Bangalore" : "Chennai",
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `${label}@${PREFIX}.demo`,
        passwordHash,
        name: `User ${label.toUpperCase()}`,
      },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: user.id, roleId: adminRole.id, status: "ACTIVE" },
    });
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: label === "a" ? "Asha" : "Bhavna",
        lastName: "Iso",
      },
    });
    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        slug: `${PREFIX}-couple-${label}`,
        primaryPatientId: patient.id,
      },
    });
    await prisma.carePlan.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        type: "IVF",
        name: `Plan ${label.toUpperCase()}`,
      },
    });
    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        type: "Consult",
        startsAt: new Date("2026-09-01T04:30:00.000Z"),
      },
    });
    await prisma.lead.create({
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
    return { ctx, clinicId: clinic.id, patientId: patient.id };
  }

  const a = await makeTenant("a");
  const b = await makeTenant("b");
  fixture = {
    ctxA: a.ctx,
    ctxB: b.ctx,
    clinicAId: a.clinicId,
    clinicBId: b.clinicId,
    patientAId: a.patientId,
    patientBId: b.patientId,
  };
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test("clinic A retrieves only clinic A patients", async () => {
  const rows = await getPatientsForClinic(fixture.ctxA);
  assert.equal(rows.some((row) => row.id === fixture.patientAId), true);
  assert.equal(rows.some((row) => row.id === fixture.patientBId), false);
});

test("clinic A cannot retrieve clinic B patients", async () => {
  await assert.rejects(
    () => getPatientsForClinic(fixture.ctxA, fixture.clinicBId),
    TenantAccessError,
  );
});

test("clinic B cannot retrieve clinic A patients", async () => {
  await assert.rejects(
    () => getPatientsForClinic(fixture.ctxB, fixture.clinicAId),
    TenantAccessError,
  );
});

test("organization A cannot retrieve organization B leads", async () => {
  const leadsA = await getLeadsForOrganization(fixture.ctxA);
  const leadsB = await getLeadsForOrganization(fixture.ctxB);
  assert.equal(leadsA.every((row) => row.organizationId === fixture.ctxA.organizationId), true);
  assert.equal(leadsB.every((row) => row.organizationId === fixture.ctxB.organizationId), true);
  assert.equal(
    leadsA.some((row) => row.organizationId === fixture.ctxB.organizationId),
    false,
  );
});

test("authenticated lead creation cannot target another clinic", async () => {
  await assert.rejects(
    () =>
      createLeadForTenant(fixture.ctxA, {
        name: "Cross tenant",
        source: "WALK_IN",
        clinicId: fixture.clinicBId,
      }),
    TenantAccessError,
  );
});

test("public lead ingest uses clinic slug, not a supplied organization", async () => {
  const lead = await ingestPublicLeadByClinicSlug({
    clinicSlug: `${PREFIX}-clinic-a`,
    name: "Public Lead",
    phone: "9999999999",
  });
  assert.equal(lead.organizationId, fixture.ctxA.organizationId);
  assert.equal(lead.clinicId, fixture.clinicAId);
  assert.notEqual(lead.organizationId, fixture.ctxB.organizationId);
});

test("care plans are isolated by clinic", async () => {
  const plansA = await getCarePlansForClinic(fixture.ctxA);
  const plansB = await getCarePlansForClinic(fixture.ctxB);
  assert.equal(plansA.every((row) => row.clinicId === fixture.clinicAId), true);
  assert.equal(plansB.every((row) => row.clinicId === fixture.clinicBId), true);
  await assert.rejects(() => getCarePlansForClinic(fixture.ctxA, fixture.clinicBId), TenantAccessError);
});

test("appointments are isolated by clinic", async () => {
  const rowsA = await getAppointmentsForClinic(fixture.ctxA);
  const rowsB = await getAppointmentsForClinic(fixture.ctxB);
  assert.equal(rowsA.every((row) => row.clinicId === fixture.clinicAId), true);
  assert.equal(rowsB.every((row) => row.clinicId === fixture.clinicBId), true);
  await assert.rejects(() => getAppointmentsForClinic(fixture.ctxB, fixture.clinicAId), TenantAccessError);
});

test("integrations are isolated and omit credentials", async () => {
  const rowsA = await getIntegrationsForClinic(fixture.ctxA);
  const rowsB = await getIntegrationsForClinic(fixture.ctxB);
  assert.equal(rowsA.length, 1);
  assert.equal(rowsB.length, 1);
  assert.equal(rowsA[0]?.displayName, "WhatsApp A");
  assert.equal(rowsB[0]?.displayName, "WhatsApp B");
  assert.equal("encryptedCredentials" in (rowsA[0] ?? {}), false);
  await assert.rejects(() => getIntegrationsForClinic(fixture.ctxA, fixture.clinicBId), TenantAccessError);
});

test("clinic access helper rejects the other organization", async () => {
  await assert.rejects(() => assertClinicAccess(fixture.ctxA, fixture.clinicBId), TenantAccessError);
});
