import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = `ph-fixes-${Date.now()}`;
const app = createApp();

describe("Doctor App Backend Fixes Verification", () => {
  let org: { id: string; name: string };
  let clinic: { id: string; name: string };
  let doctorUser: any;
  let tokenDoctor: string;
  let patient: any;
  let couple: any;
  let treatment: any;

  before(async () => {
    const passwordHash = await hash("Doctor@12345", 4);
    const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });

    org = await prisma.organization.create({
      data: { name: `${PREFIX} Org`, slug: `${PREFIX}-org` },
    });

    clinic = await prisma.clinic.create({
      data: { organizationId: org.id, name: `${PREFIX} Clinic`, slug: `${PREFIX}-clinic` },
    });

    doctorUser = await prisma.user.create({
      data: {
        email: `${PREFIX}-doctor@test.demo`,
        passwordHash,
        name: "Dr. Ananya Rao",
        title: "Senior Fertility Specialist",
      },
    });

    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: doctorUser.id, roleId: doctorRole.id },
    });

    tokenDoctor = await encodeSessionToken(
      {
        id: doctorUser.id,
        name: doctorUser.name,
        email: doctorUser.email,
        organizationId: org.id,
        organizationName: org.name,
        clinicId: clinic.id,
        clinicName: clinic.name,
        role: "DOCTOR",
      },
      "authjs.session-token",
    );

    patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Priya",
        lastName: "Nair",
        gender: "FEMALE",
        phone: "+919876543299",
      },
    });

    couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        slug: `${PREFIX}-couple`,
        primaryPatientId: patient.id,
        assignedDoctorId: doctorUser.id,
      },
    });

    treatment = await prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        kind: "IVF",
        label: "IVF Cycle 1",
        status: "ACTIVE",
        stageIndex: 3,
        stageName: "Ovarian Stimulation",
      },
    });

    // Create a consultation note
    await prisma.consultationNote.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        createdById: doctorUser.id,
        reasonForVisit: "Day 6 Follicular Scan",
        summary: "Good follicular response, 8 follicles > 12mm.",
        nextSteps: "Continue rFSH 150 IU, add Cetrotide tomorrow.",
      },
    });
  });

  it("1. Response envelope provides both ok: true and success: true", async () => {
    const res = await app.request("/api/v1/doctors/schedule", {
      headers: { cookie: `authjs.session-token=${tokenDoctor}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.ok, true);
    assert.ok(body.data);
  });

  it("2. GET /api/v1/care-loop returns 200 with summary, exceptions, and active journeys", async () => {
    const res = await app.request("/api/v1/care-loop", {
      headers: { cookie: `authjs.session-token=${tokenDoctor}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.ok, true);
    assert.ok(body.data.summary);
    assert.ok(Array.isArray(body.data.exceptions));
    assert.ok(Array.isArray(body.data.urgentTasks));
    assert.ok(Array.isArray(body.data.activeJourneys));
  });

  it("3. GET /api/v1/treatments returns 200 with treatments list and supports filters", async () => {
    const res = await app.request(`/api/v1/treatments?coupleId=${couple.id}`, {
      headers: { cookie: `authjs.session-token=${tokenDoctor}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, treatment.id);
    assert.equal(body.data[0].kind, "IVF");
  });

  it("4. GET /api/v1/doctors/:id/availability returns 200 for doctor id and 'me'", async () => {
    // Test with 'me'
    const resMe = await app.request("/api/v1/doctors/me/availability", {
      headers: { cookie: `authjs.session-token=${tokenDoctor}` },
    });
    assert.equal(resMe.status, 200);
    const bodyMe = (await resMe.json()) as any;
    assert.equal(bodyMe.success, true);
    assert.equal(bodyMe.ok, true);
    assert.ok(bodyMe.data.doctorId);
    assert.ok(Array.isArray(bodyMe.data.daySlots));
    assert.ok(Array.isArray(bodyMe.data.weeklySchedule));

    // Test with specific doctor ID
    const resId = await app.request(`/api/v1/doctors/${doctorUser.id}/availability`, {
      headers: { cookie: `authjs.session-token=${tokenDoctor}` },
    });
    assert.equal(resId.status, 200);
    const bodyId = (await resId.json()) as any;
    assert.equal(bodyId.success, true);
    assert.equal(bodyId.data.doctorId, doctorUser.id);
  });

  it("5. GET /api/v1/doctors/:id/consultations returns 200 with consultation history", async () => {
    const res = await app.request(`/api/v1/doctors/${doctorUser.id}/consultations`, {
      headers: { cookie: `authjs.session-token=${tokenDoctor}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].reasonForVisit, "Day 6 Follicular Scan");
    assert.equal(body.data[0].patientName, "Priya Nair");
  });
});
