import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { PERMISSIONS, prisma, roleHasPermission } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = `ph8-doc-${Date.now()}`;
const app = createApp();

describe("Phase 8: Doctor Workflow + Doctor App Hardening", () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let clinicA: { id: string; name: string };
  let clinicB: { id: string; name: string };

  let doctorA: string;
  let receptionistA: string;
  let adminB: string;

  let tokenDoctorA: string;
  let tokenReceptionistA: string;
  let tokenAdminB: string;

  let patientA: string;
  let partnerA: string;
  let coupleA: string;
  let appointmentA: string;
  let treatmentA: string;
  let diagnosticTaskA: string;
  let escalationTaskA: string;
  let routineTaskA: string;
  let conversationA: string;

  before(async () => {
    const passwordHash = await hash("Test@12345", 4);
    const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });
    const receptionistRole = await prisma.role.findUniqueOrThrow({ where: { key: "RECEPTIONIST" } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "CLINIC_ADMIN" } });

    orgA = await prisma.organization.create({
      data: { name: `${PREFIX} Org A`, slug: `${PREFIX}-org-a` },
    });
    orgB = await prisma.organization.create({
      data: { name: `${PREFIX} Org B`, slug: `${PREFIX}-org-b` },
    });

    clinicA = await prisma.clinic.create({
      data: { organizationId: orgA.id, name: `${PREFIX} Clinic A`, slug: `${PREFIX}-clinic-a` },
    });
    clinicB = await prisma.clinic.create({
      data: { organizationId: orgB.id, name: `${PREFIX} Clinic B`, slug: `${PREFIX}-clinic-b` },
    });

    const userDoc = await prisma.user.create({
      data: { email: `${PREFIX}-doc@test.demo`, passwordHash, name: "Dr. Ananya Rao" },
    });
    const userRecep = await prisma.user.create({
      data: { email: `${PREFIX}-recep@test.demo`, passwordHash, name: "Front Desk Staff" },
    });
    const userB = await prisma.user.create({
      data: { email: `${PREFIX}-admin-b@test.demo`, passwordHash, name: "Tenant B Admin" },
    });

    doctorA = userDoc.id;
    receptionistA = userRecep.id;
    adminB = userB.id;

    await prisma.clinicMembership.createMany({
      data: [
        { clinicId: clinicA.id, userId: doctorA, roleId: doctorRole.id },
        { clinicId: clinicA.id, userId: receptionistA, roleId: receptionistRole.id },
        { clinicId: clinicB.id, userId: adminB, roleId: adminRole.id },
      ],
    });

    tokenDoctorA = await encodeSessionToken(
      {
        id: doctorA,
        name: "Dr. Ananya Rao",
        email: userDoc.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "DOCTOR",
      },
      "authjs.session-token",
    );

    tokenReceptionistA = await encodeSessionToken(
      {
        id: receptionistA,
        name: "Front Desk Staff",
        email: userRecep.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "RECEPTIONIST",
      },
      "authjs.session-token",
    );

    tokenAdminB = await encodeSessionToken(
      {
        id: adminB,
        name: "Tenant B Admin",
        email: userB.email,
        organizationId: orgB.id,
        organizationName: orgB.name,
        clinicId: clinicB.id,
        clinicName: clinicB.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );

    // Create Patient, Partner, Couple
    const pat = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Meera",
        lastName: "Deshmukh",
        phone: "+919811122233",
        dateOfBirth: new Date("1993-08-12"),
        gender: "FEMALE",
      },
    });
    patientA = pat.id;

    const part = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Rohan",
        lastName: "Deshmukh",
        phone: "+919811122234",
        dateOfBirth: new Date("1991-04-25"),
        gender: "MALE",
      },
    });
    partnerA = part.id;

    const cpl = await prisma.couple.create({
      data: {
        clinicId: clinicA.id,
        slug: `cpl-doc-${Date.now()}`,
        primaryPatientId: patientA,
        partnerPatientId: partnerA,
        assignedDoctorId: doctorA,
        careLoopActive: true,
      },
    });
    coupleA = cpl.id;

    // Create Today's Appointment
    const now = new Date();
    const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30, 0, 0);
    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        doctorName: "Dr. Ananya Rao",
        type: "IVF Follicular Monitoring",
        status: "CONFIRMED",
        startsAt: todayNoon,
        durationMin: 30,
        room: "Scan Room 2",
        notes: "Stimulation Day 6 assessment",
      },
    });
    appointmentA = appt.id;

    // Create Active IVF Treatment
    const tr = await prisma.treatment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        kind: "IVF",
        label: "ICSI Treatment Protocol A",
        status: "ACTIVE",
        stageIndex: 4,
        stageName: "Ovarian Stimulation & Trigger",
        startedAt: new Date(Date.now() - 6 * 86400000),
        ivfCycle: {
          create: {
            cycleNumber: 1,
            notes: "Stimulation underway, good response",
          },
        },
      },
    });
    treatmentA = tr.id;

    // Create Diagnostic Task awaiting review
    const diagTask = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        title: "Diagnostic Result: Serum Estradiol (E2) & LH",
        description: "Estradiol: 1850 pg/mL (High). LH: 1.8 mIU/mL (Normal). Awaiting doctor review.",
        category: "DIAGNOSTIC",
        status: "WAITING",
        priority: "NORMAL",
        dueDate: todayNoon,
      },
    });
    diagnosticTaskA = diagTask.id;

    // Create Clinical Escalation Task
    const escTask = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        title: "Clinical Escalation: Severe abdominal discomfort reported",
        description: "Patient reported mild nausea and bloating post stimulation injection.",
        category: "CLINICAL",
        status: "OVERDUE",
        priority: "HIGH",
        lastAction: "ESCALATED",
        dueDate: new Date(Date.now() - 3600000),
      },
    });
    escalationTaskA = escTask.id;

    // Create Routine Automation Task (Should NOT appear in doctor exceptions)
    const routTask = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        title: "Automated WhatsApp Reminder: Drink 2L water",
        description: "Routine lifestyle reminder",
        category: "REMINDER",
        status: "COMPLETED",
        priority: "LOW",
        dueDate: todayNoon,
      },
    });
    routineTaskA = routTask.id;

    // Create Priority Conversation with Staff Handoff
    const conv = await prisma.conversation.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        patientId: patientA,
        contactPhone: "+919811122233",
        priority: "HIGH",
        status: "OPEN",
        handoffAt: new Date(),
        handoffReason: "Patient requesting clinical guidance on medication timing",
      },
    });
    conversationA = conv.id;
  });

  after(async () => {
    await prisma.consultationNote.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.iVFCycle.deleteMany({ where: { treatment: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.treatment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [doctorA, receptionistA, adminB] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicA.id, clinicB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  });

  // 1. Doctor Home & Prepare My Day
  it("1. aggregates real persisted data for Prepare My Day briefing and doctor priorities", async () => {
    const res = await app.request("/api/v1/doctors/prepare-my-day", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: true; data: any };
    assert.ok(body.data.briefing);
    assert.ok(body.data.briefing.summary.includes("appointment"));
    assert.ok(body.data.briefing.metrics.todayAppointmentsCount >= 1);
    assert.ok(body.data.briefing.metrics.pendingReportsCount >= 1);
    assert.ok(body.data.briefing.metrics.escalationsCount >= 1);
    assert.ok(body.data.briefing.metrics.activeTreatmentsCount >= 1);

    // Verify today's appointment list has active IVF treatment context
    const appt = body.data.todayAppointments.find((a: any) => a.id === appointmentA);
    assert.ok(appt);
    assert.equal(appt.patientName, "Meera Deshmukh");
    assert.equal(appt.partnerName, "Rohan Deshmukh");
    assert.equal(appt.room, "Scan Room 2");
    assert.ok(appt.activeTreatment);
    assert.equal(appt.activeTreatment.kind, "IVF");
    assert.equal(appt.activeTreatment.stageName, "Ovarian Stimulation & Trigger");

    // Verify pending reports list
    const rep = body.data.pendingReports.find((r: any) => r.id === diagnosticTaskA);
    assert.ok(rep);
    assert.ok(rep.title.includes("Estradiol"));

    // Verify clinical escalations list
    const esc = body.data.clinicalEscalations.find((e: any) => e.id === escalationTaskA);
    assert.ok(esc);
    assert.equal(esc.priority, "HIGH");
  });

  // 2. Schedule
  it("2. returns chronological day and week schedule with patient and treatment badges", async () => {
    const dayRes = await app.request("/api/v1/doctors/schedule?range=day", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });
    assert.equal(dayRes.status, 200);
    const dayBody = (await dayRes.json()) as { success: true; data: any };
    assert.equal(dayBody.data.range, "day");
    assert.ok(dayBody.data.count >= 1);
    const found = dayBody.data.appointments.find((a: any) => a.id === appointmentA);
    assert.ok(found);
    assert.equal(found.type, "IVF Follicular Monitoring");

    const weekRes = await app.request("/api/v1/doctors/schedule?range=week", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });
    assert.equal(weekRes.status, 200);
    const weekBody = (await weekRes.json()) as { success: true; data: any };
    assert.equal(weekBody.data.range, "week");
  });

  // 3. Consultation Note & Start/Complete
  it("3. allows doctor to start/complete consultation and persist structured clinical notes", async () => {
    const res = await app.request(`/api/v1/doctors/consultations/${appointmentA}`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenDoctorA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "COMPLETED",
        reasonForVisit: "Stimulation Day 6 Scan & Hormone Review",
        impression: "Right ovary: 4 follicles (14-16mm). Left ovary: 5 follicles (12-15mm). Endometrium: 9.2mm triple line.",
        summary: "Patient tolerating gonadotropins well. Mild bloating managed with hydration. Estradiol rising appropriately.",
        clinicalNotes: "Recommended beginning GnRH antagonist tonight to prevent premature LH surge.",
        prescriptionNotes: "Cetrotide 0.25mg SubQ daily at 9:00 PM for 3 days. Continue Menopur 150 IU.",
        nextSteps: "Repeat follicular ultrasound and serum E2 in 48 hours.",
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { success: true; data: any };
    assert.equal(body.data.appointmentId, appointmentA);
    assert.equal(body.data.status, "COMPLETED");
    assert.ok(body.data.consultationNote.id);
    assert.ok(body.data.consultationNote.summary.includes("Right ovary"));
    assert.ok(body.data.consultationNote.summary.includes("Cetrotide"));

    // Verify appointment status updated to COMPLETED in database
    const apptDb = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentA } });
    assert.equal(apptDb.status, "COMPLETED");

    // Verify ConsultationNote record in database
    const noteDb = await prisma.consultationNote.findFirstOrThrow({
      where: { coupleId: coupleA },
    });
    assert.equal(noteDb.createdById, doctorA);
    assert.ok(noteDb.summary.includes("Right ovary"));
  });

  // 4. Report Review Queue & Doctor Sign-off
  it("4. lists diagnostic reports and allows doctor to sign off with clinical note", async () => {
    const queueRes = await app.request("/api/v1/doctors/reports?filter=pending_review", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });
    assert.equal(queueRes.status, 200);
    const queueBody = (await queueRes.json()) as { success: true; data: any[] };
    assert.ok(queueBody.data.some((r) => r.id === diagnosticTaskA));

    // Sign off on the report
    const reviewRes = await app.request(`/api/v1/doctors/reports/${diagnosticTaskA}/review`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenDoctorA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "APPROVED",
        clinicalNotes: "Estradiol level consistent with 9 mature follicles developing. Proceed with planned trigger timing.",
      }),
    });

    assert.equal(reviewRes.status, 200);
    const reviewBody = (await reviewRes.json()) as { success: true; data: any };
    assert.equal(reviewBody.data.id, diagnosticTaskA);
    assert.equal(reviewBody.data.status, "COMPLETED");
    assert.ok(reviewBody.data.lastAction.includes("DOCTOR_REVIEWED:APPROVED"));

    // Verify database task has updated description with doctor clinical note
    const taskDb = await prisma.careTask.findUniqueOrThrow({ where: { id: diagnosticTaskA } });
    assert.equal(taskDb.status, "COMPLETED");
    assert.ok(taskDb.description?.includes("consistent with 9 mature follicles"));
  });

  // 5. Care Loop Exceptions Filter (No routine spam)
  it("5. filters Care Loop to exceptions only (escalations, overdues) and excludes routine reminders", async () => {
    const res = await app.request("/api/v1/doctors/care-loop-exceptions", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: true; data: any[] };
    const taskIds = body.data.map((t) => t.id);

    // Escalation task MUST be included
    assert.ok(taskIds.includes(escalationTaskA));

    // Routine reminder task MUST NOT be included
    assert.ok(!taskIds.includes(routineTaskA));
  });

  // 6. Relevant Messages
  it("6. shows prioritized clinical conversations and staff handoffs", async () => {
    const res = await app.request("/api/v1/doctors/messages", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: true; data: any[] };
    const conv = body.data.find((c) => c.id === conversationA);
    assert.ok(conv);
    assert.equal(conv.priority, "HIGH");
    assert.equal(conv.patientName, "Meera Deshmukh");
    assert.ok(conv.handoffReason.includes("medication timing"));
  });

  // 7. Clinical Authority Enforcement (RBAC)
  it("7. prevents non-clinical roles from signing off consultations or clinical reviews", async () => {
    // Receptionist cannot sign off consultation note
    const consultRes = await app.request(`/api/v1/doctors/consultations/${appointmentA}`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenReceptionistA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "COMPLETED",
        summary: "Attempted consultation note by receptionist",
      }),
    });
    assert.equal(consultRes.status, 403);

    // Receptionist cannot sign off clinical report review
    const repRes = await app.request(`/api/v1/doctors/reports/${diagnosticTaskA}/review`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenReceptionistA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "APPROVED",
        clinicalNotes: "Unauthorized review",
      }),
    });
    assert.equal(repRes.status, 403);
  });

  // 8. Tenant Isolation
  it("8. prevents cross-tenant access to doctor briefing, schedule, and consultations", async () => {
    // Tenant B cannot access Tenant A's appointment consultation
    const crossConsult = await app.request(`/api/v1/doctors/consultations/${appointmentA}`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenAdminB}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "COMPLETED",
        summary: "Cross-tenant intrusion attempt",
      }),
    });
    assert.ok(crossConsult.status === 403 || crossConsult.status === 404);

    // Tenant B's prepare-my-day does not leak Tenant A's appointments or patients
    const bPmd = await app.request("/api/v1/doctors/prepare-my-day", {
      headers: { Cookie: `authjs.session-token=${tokenAdminB}` },
    });
    assert.equal(bPmd.status, 200);
    const bBody = (await bPmd.json()) as { success: true; data: any };
    assert.ok(!bBody.data.todayAppointments.some((a: any) => a.id === appointmentA));
    assert.ok(!bBody.data.clinicalEscalations.some((e: any) => e.id === escalationTaskA));
  });

  // 9. Refresh & State Persistence
  it("9. confirms consultation notes, appointment status, and report sign-offs persist across reloads", async () => {
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentA } });
    assert.equal(appt.status, "COMPLETED");

    const note = await prisma.consultationNote.findFirstOrThrow({ where: { coupleId: coupleA } });
    assert.ok(note.summary.includes("Cetrotide"));

    const task = await prisma.careTask.findUniqueOrThrow({ where: { id: diagnosticTaskA } });
    assert.equal(task.status, "COMPLETED");
  });

  // 10. ABDM/ABHA Protection Check
  it("10. verifies zero changes to ABDM/ABHA files and protected models", () => {
    const gitDiff = execSync('git diff --name-only | findstr /i "abdm abha" || echo OK', {
      encoding: "utf-8",
    });
    assert.ok(gitDiff.includes("OK") || gitDiff.trim() === "");
  });
});
