import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { hash } from "bcryptjs";
import { prisma } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = `doc-del-${Date.now()}`;
const app = createApp();

describe("Doctor & Admin User Deletion Workflow", () => {
  let org: { id: string; name: string };
  let clinic: { id: string; name: string };

  let adminUser: { id: string; email: string };
  let doctorUser: { id: string; email: string };
  let platformAdminUser: { id: string; email: string };

  let tokenAdmin: string;
  let tokenPlatformAdmin: string;

  let coupleId: string;

  before(async () => {
    const passwordHash = await hash("Test@12345", 4);
    const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "CLINIC_ADMIN" } });
    const platformAdminRole = await prisma.role.findUniqueOrThrow({ where: { key: "PLATFORM_ADMIN" } });

    org = await prisma.organization.create({
      data: { name: `${PREFIX} Org`, slug: `${PREFIX}-org` },
    });
    clinic = await prisma.clinic.create({
      data: { organizationId: org.id, name: `${PREFIX} Clinic`, slug: `${PREFIX}-clinic` },
    });

    adminUser = await prisma.user.create({
      data: { email: `${PREFIX}-admin@test.demo`, passwordHash, name: "Clinic Admin" },
    });
    doctorUser = await prisma.user.create({
      data: { email: `${PREFIX}-doc@test.demo`, passwordHash, name: "Dr. Test ToDelete" },
    });
    platformAdminUser = await prisma.user.create({
      data: { email: `${PREFIX}-superadmin@test.demo`, passwordHash, name: "Platform Admin" },
    });

    await prisma.clinicMembership.createMany({
      data: [
        { clinicId: clinic.id, userId: adminUser.id, roleId: adminRole.id },
        { clinicId: clinic.id, userId: doctorUser.id, roleId: doctorRole.id },
        { clinicId: clinic.id, userId: platformAdminUser.id, roleId: platformAdminRole.id },
      ],
    });

    // Create doctor profile automation rule
    await prisma.automationRule.create({
      data: {
        clinicId: clinic.id,
        trigger: "DOCTOR_PROFILE",
        name: doctorUser.id,
        config: { displayName: "Dr. Test ToDelete", department: "Reproductive Medicine" },
      },
    });

    // Create a couple assigned to this doctor
    const primaryPatient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Jane",
        lastName: "Doe",
        gender: "FEMALE",
        dateOfBirth: new Date("1992-05-10"),
        phone: "+919999900001",
      },
    });

    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        primaryPatientId: primaryPatient.id,
        assignedDoctorId: doctorUser.id,
        slug: `${PREFIX}-couple-del`,
      },
    });
    coupleId = couple.id;

    tokenAdmin = await encodeSessionToken(
      {
        id: adminUser.id,
        name: "Clinic Admin",
        email: adminUser.email,
        role: "CLINIC_ADMIN",
        clinicId: clinic.id,
        clinicName: clinic.name,
        organizationId: org.id,
        organizationName: org.name,
      },
      "authjs.session-token",
    );

    tokenPlatformAdmin = await encodeSessionToken(
      {
        id: platformAdminUser.id,
        name: "Platform Admin",
        email: platformAdminUser.email,
        role: "PLATFORM_ADMIN",
        clinicId: clinic.id,
        clinicName: clinic.name,
        organizationId: org.id,
        organizationName: org.name,
      },
      "authjs.session-token",
    );
  });

  it("1. lists the doctor initially in GET /api/v1/doctors", async () => {
    const res = await app.request("/api/v1/doctors", {
      headers: { Cookie: `authjs.session-token=${tokenAdmin}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: true; data: any[] };
    const found = body.data.some((d) => d.staffUserId === doctorUser.id || d.id === `doc_${doctorUser.id}`);
    assert.ok(found, "Doctor should be present before deletion");
  });

  it("2. deletes the doctor via DELETE /api/v1/doctors/:id", async () => {
    const res = await app.request(`/api/v1/doctors/doc_${doctorUser.id}`, {
      method: "DELETE",
      headers: { Cookie: `authjs.session-token=${tokenAdmin}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: true; data: any };
    assert.equal(body.success, true);
    assert.equal(body.data.deletedId, `doc_${doctorUser.id}`);
  });

  it("3. verifies doctor is removed from clinic doctors list", async () => {
    const res = await app.request("/api/v1/doctors", {
      headers: { Cookie: `authjs.session-token=${tokenAdmin}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: true; data: any[] };
    const found = body.data.some((d) => d.staffUserId === doctorUser.id || d.id === `doc_${doctorUser.id}`);
    assert.equal(found, false, "Doctor must not appear in doctors list after deletion");
  });

  it("4. verifies assigned couples have doctor unassigned", async () => {
    const updatedCouple = await prisma.couple.findUniqueOrThrow({ where: { id: coupleId } });
    assert.equal(updatedCouple.assignedDoctorId, null, "Couple's assignedDoctorId should be null");
  });

  it("5. verifies doctor profile automation rule was deleted", async () => {
    const rule = await prisma.automationRule.findFirst({
      where: {
        clinicId: clinic.id,
        trigger: "DOCTOR_PROFILE",
        OR: [{ name: doctorUser.id }, { name: `doc_${doctorUser.id}` }],
      },
    });
    assert.equal(rule, null, "Doctor profile automation rule should be removed");
  });

  it("6. verifies DELETE /api/v1/doctors/:id returns 404 for non-existent doctor", async () => {
    const res = await app.request("/api/v1/doctors/doc_nonexistent_9999", {
      method: "DELETE",
      headers: { Cookie: `authjs.session-token=${tokenAdmin}` },
    });
    assert.equal(res.status, 404);
  });

  it("7. verifies admin user deletion via DELETE /api/v1/admin/users/:id", async () => {
    // Create a temporary user to delete via admin
    const tempUser = await prisma.user.create({
      data: {
        email: `${PREFIX}-temp@test.demo`,
        passwordHash: "hash",
        name: "Temp User ToDelete",
      },
    });
    await prisma.clinicMembership.create({
      data: {
        clinicId: clinic.id,
        userId: tempUser.id,
        roleId: (await prisma.role.findUniqueOrThrow({ where: { key: "NURSE" } })).id,
      },
    });

    const res = await app.request(`/api/v1/admin/users/${tempUser.id}`, {
      method: "DELETE",
      headers: { Cookie: `authjs.session-token=${tokenPlatformAdmin}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: true; data: any };
    assert.equal(body.success, true);
  });
});
