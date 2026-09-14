import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { prisma } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = `ph9-ana-${Date.now()}`;
const app = createApp();

describe("Phase 9: Real Analytics & Reporting Integration", () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let clinicA: { id: string; name: string };
  let clinicB: { id: string; name: string };

  let tokenUserA: string;
  let tokenUserB: string;

  before(async () => {
    const passwordHash = await hash("Test@12345", 4);
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

    const userA = await prisma.user.create({
      data: { email: `${PREFIX}-admin-a@test.demo`, passwordHash, name: "Admin A" },
    });
    const userB = await prisma.user.create({
      data: { email: `${PREFIX}-admin-b@test.demo`, passwordHash, name: "Admin B" },
    });

    await prisma.clinicMembership.create({
      data: { clinicId: clinicA.id, userId: userA.id, roleId: adminRole.id, status: "ACTIVE" },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinicB.id, userId: userB.id, roleId: adminRole.id, status: "ACTIVE" },
    });

    tokenUserA = await encodeSessionToken(
      {
        id: userA.id,
        name: userA.name,
        email: userA.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );
    tokenUserB = await encodeSessionToken(
      {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        organizationId: orgB.id,
        organizationName: orgB.name,
        clinicId: clinicB.id,
        clinicName: clinicB.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );

    // 1. Seed Clinic A Patients & Couple
    const patientA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Meera",
        lastName: "Sharma",
        phone: "+919876543210",
        gender: "FEMALE",
        status: "ACTIVE",
      },
    });
    const partnerA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Vikram",
        lastName: "Sharma",
        phone: "+919876543211",
        gender: "MALE",
        status: "ACTIVE",
      },
    });
    const coupleA = await prisma.couple.create({
      data: {
        clinicId: clinicA.id,
        primaryPatientId: patientA.id,
        partnerPatientId: partnerA.id,
        slug: `${PREFIX}-couple-a`,
        status: "ACTIVE",
      },
    });

    // 2. Seed Clinic A CarePlan, Treatment & IVF Cycle
    const carePlanA = await prisma.carePlan.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        name: "Meera & Vikram IVF Care Plan",
        status: "ACTIVE",
        type: "IVF",
        currentStageIndex: 5,
        currentStageName: "Ovarian Stimulation",
        outcome: "Ongoing Clinical Protocol",
      },
    });

    const treatmentA = await prisma.treatment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        kind: "IVF",
        label: "IVF ICSI Cycle 1",
        status: "ACTIVE",
        stageIndex: 5,
        stageName: "Ovarian Stimulation",
      },
    });

    await prisma.iVFCycle.create({
      data: {
        treatmentId: treatmentA.id,
        cycleNumber: 1,
        notes: "Stimulation cycle day 6",
      },
    });

    // 3. Seed Clinic A Appointments
    const now = new Date();
    await prisma.appointment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        type: "Follicular Monitoring Scan",
        startsAt: new Date(now.getTime() + 3600000),
        status: "CONFIRMED",
      },
    });
    await prisma.appointment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        type: "Oocyte Pick-up (OPU)",
        startsAt: new Date(now.getTime() - 86400000),
        status: "COMPLETED",
      },
    });
    await prisma.appointment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        type: "Clinical Follow-up & Review",
        startsAt: new Date(now.getTime() + 7200000),
        status: "CONFIRMED",
      },
    });

    // 4. Seed Clinic A CareTasks (Routine, Overdue, Escalated, Completed)
    await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Stimulation Injection Confirmation",
        status: "COMPLETED",
        priority: "NORMAL",
        automationEnabled: true,
        escalationLevel: 0,
        patientResponse: "DONE - Injection taken at 8:00 AM",
        completedAt: new Date(now.getTime() - 3600000),
      },
    });
    await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Severe Pain & Spotting Reported",
        status: "ESCALATED",
        priority: "CLINICAL",
        escalationLevel: 1,
        automationEnabled: false,
      },
    });
    await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Fasting Ultrasound Prep",
        status: "OVERDUE",
        priority: "HIGH",
        dueDate: new Date(now.getTime() - 7200000),
        attempts: 2,
        patientResponse: null,
      },
    });

    // 5. Seed Diagnostic Tasks (Pending review vs Reviewed)
    await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Serum Estradiol (E2)",
        category: "DIAGNOSTICS",
        taskType: "DIAGNOSTICS",
        status: "IN_PROGRESS",
        metadata: {
          testName: "Serum Estradiol",
          results: [{ parameter: "Estradiol", value: "1420", unit: "pg/mL", flag: "Normal" }],
          resultsEnteredAt: new Date().toISOString(),
        },
      },
    });
    await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Serum Progesterone (P4)",
        category: "DIAGNOSTICS",
        taskType: "DIAGNOSTICS",
        status: "COMPLETED",
        metadata: {
          testName: "Serum Progesterone",
          results: [{ parameter: "Progesterone", value: "0.8", unit: "ng/mL", flag: "Normal" }],
          doctorReview: {
            reviewedAt: new Date().toISOString(),
            reviewedBy: "Dr. Ananya Rao",
            action: "APPROVE",
            doctorNotes: "Optimal for trigger shot timing",
          },
        },
      },
    });

    // 6. Seed WhatsApp Messages
    const convoA = await prisma.conversation.create({
      data: {
        clinicId: clinicA.id,
        patientId: patientA.id,
        coupleId: coupleA.id,
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
    await prisma.message.create({
      data: {
        conversationId: convoA.id,
        direction: "OUTBOUND",
        senderType: "SYSTEM",
        content: "Please take your medication on schedule.",
        status: "DELIVERED",
      },
    });
    await prisma.message.create({
      data: {
        conversationId: convoA.id,
        direction: "OUTBOUND",
        senderType: "STAFF",
        content: "Your scan is confirmed for 10 AM tomorrow.",
        status: "READ",
      },
    });
    await prisma.message.create({
      data: {
        conversationId: convoA.id,
        direction: "INBOUND",
        senderType: "PATIENT",
        content: "Thank you, I will be on time.",
        status: "DELIVERED",
      },
    });

    // 7. Seed Billing & Invoices
    await prisma.billingInvoice.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        patientId: patientA.id,
        invoiceNumber: `${PREFIX}-INV-001`,
        title: "IVF Cycle Package",
        totalAmount: 150000,
        paidAmount: 100000,
        source: "TREATMENT",
        status: "PARTIALLY_PAID",
      },
    });
    await prisma.billingInvoice.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        patientId: patientA.id,
        invoiceNumber: `${PREFIX}-INV-002`,
        title: "Hormone Injections & Pharmacy",
        totalAmount: 25000,
        paidAmount: 25000,
        source: "PHARMACY",
        status: "PAID",
      },
    });
    await prisma.billingPayment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        patientId: patientA.id,
        provider: "MANUAL",
        amount: 125000,
        status: "SUCCESS",
      },
    });

    // 8. Seed Clinic B dummy patient for tenant isolation verification
    await prisma.patient.create({
      data: {
        clinicId: clinicB.id,
        firstName: "ClinicB",
        lastName: "Patient",
        phone: "+919111122222",
        gender: "FEMALE",
        status: "ACTIVE",
      },
    });
  });

  after(async () => {
    await prisma.billingPayment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.billingInvoice.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.message.deleteMany({
      where: { conversation: { clinicId: { in: [clinicA.id, clinicB.id] } } },
    });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.iVFCycle.deleteMany({
      where: { treatment: { clinicId: { in: [clinicA.id, clinicB.id] } } },
    });
    await prisma.treatment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicA.id, clinicB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  });

  it("1. GET /api/v1/analytics/summary returns backward-compatible basic counts", async () => {
    const res = await app.request("/api/v1/analytics/summary", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.patients >= 2, true);
    assert.equal(body.data.appointments >= 3, true);
    assert.equal(body.data.carePlans >= 1, true);
    assert.equal(body.data.careTasks >= 5, true);
  });

  it("2. GET /api/v1/analytics/overview returns unified real analytics without fake data", async () => {
    const res = await app.request("/api/v1/analytics/overview", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    const data = body.data;

    // Organization
    assert.equal(data.organization.totalPatients >= 2, true);
    assert.equal(data.organization.activePatients >= 2, true);
    assert.equal(data.organization.totalAppointments >= 3, true);
    assert.equal(data.organization.completedAppointments >= 1, true);
    assert.equal(data.organization.activeTreatments >= 1, true);
    assert.equal(data.organization.activeJourneys >= 1, true);
    assert.equal(data.organization.escalationsCount >= 1, true);

    // Care Loop
    assert.equal(data.careLoop.tasksCreated >= 5, true);
    assert.equal(data.careLoop.tasksCompleted >= 2, true);
    assert.equal(data.careLoop.tasksOverdue >= 1, true);
    assert.equal(data.careLoop.tasksEscalated >= 1, true);
    assert.equal(data.careLoop.automationSuccessCount >= 1, true);
    assert.equal(Array.isArray(data.careLoop.weeklyTrends), true);

    // Patient Engagement
    assert.equal(data.patientEngagement.messagesSent >= 2, true);
    assert.equal(data.patientEngagement.messagesDelivered >= 2, true);
    assert.equal(data.patientEngagement.messagesRead >= 1, true);
    assert.equal(data.patientEngagement.patientResponses >= 1, true);
    assert.equal(data.patientEngagement.deliveryRate > 0, true);

    // Clinical Operations
    assert.equal(data.clinicalOperations.reportsPending >= 1, true);
    assert.equal(data.clinicalOperations.reportsReviewed >= 1, true);
    assert.equal(data.clinicalOperations.followUpsCount >= 1, true);

    // Fertility
    assert.equal(data.fertility.activeIvfCycles >= 1, true);
    assert.equal(data.fertility.monitoringWorkload >= 1, true);
    assert.equal(data.fertility.procedureWorkload >= 1, true);
    assert.equal(data.fertility.journeyStages.length >= 1, true);

    // Billing
    assert.equal(data.billing.totalRevenue, 175000);
    assert.equal(data.billing.totalPayments, 125000);
    assert.equal(data.billing.outstanding, 50000);
    assert.equal(data.billing.treatmentRevenue, 150000);
    assert.equal(data.billing.pharmacyRevenue, 25000);
    assert.equal(data.billing.collectionRate, 71.4);
  });

  it("3. GET /api/v1/analytics/organization returns isolated organization metrics", async () => {
    const res = await app.request("/api/v1/analytics/organization", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.activePatients >= 2, true);
    assert.equal(body.data.activeJourneys >= 1, true);
  });

  it("4. GET /api/v1/analytics/care-loop returns Care Loop metrics and weekly trend", async () => {
    const res = await app.request("/api/v1/analytics/care-loop", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.tasksCreated >= 5, true);
    assert.equal(body.data.tasksCompleted >= 2, true);
    assert.equal(body.data.tasksOverdue >= 1, true);
    assert.equal(body.data.weeklyTrends.length, 7);
  });

  it("5. GET /api/v1/analytics/patient-engagement returns communication rates", async () => {
    const res = await app.request("/api/v1/analytics/patient-engagement", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.messagesSent, 2);
    assert.equal(body.data.patientResponses, 1);
    assert.equal(body.data.readRate, 50);
  });

  it("6. GET /api/v1/analytics/clinical-operations returns diagnostic and follow-up metrics", async () => {
    const res = await app.request("/api/v1/analytics/clinical-operations", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.reportsPending >= 1, true);
    assert.equal(body.data.reportsReviewed >= 1, true);
  });

  it("7. GET /api/v1/analytics/fertility returns active cycles, stage distribution and workloads", async () => {
    const res = await app.request("/api/v1/analytics/fertility", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.activeIvfCycles >= 1, true);
    assert.equal(body.data.monitoringWorkload >= 1, true);
    assert.equal(body.data.procedureWorkload >= 1, true);
  });

  it("8. GET /api/v1/analytics/billing returns real financial sums and collection rate", async () => {
    const res = await app.request("/api/v1/analytics/billing", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalRevenue, 175000);
    assert.equal(body.data.treatmentRevenue, 150000);
    assert.equal(body.data.pharmacyRevenue, 25000);
    assert.equal(body.data.outstanding, 50000);
  });

  it("9. Tenant Isolation: Clinic B sees zero of Clinic A data", async () => {
    const res = await app.request("/api/v1/analytics/overview", {
      headers: { Cookie: `authjs.session-token=${tokenUserB}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    const bData = body.data;

    // Clinic B only has 1 patient seeded, 0 appointments, 0 invoices, 0 tasks
    assert.equal(bData.organization.totalPatients, 1);
    assert.equal(bData.organization.totalAppointments, 0);
    assert.equal(bData.organization.activeJourneys, 0);
    assert.equal(bData.careLoop.tasksCreated, 0);
    assert.equal(bData.patientEngagement.messagesSent, 0);
    assert.equal(bData.clinicalOperations.reportsPending, 0);
    assert.equal(bData.clinicalOperations.reportsReviewed, 0);
    assert.equal(bData.fertility.activeIvfCycles, 0);
    assert.equal(bData.billing.totalRevenue, 0);
    assert.equal(bData.billing.totalPayments, 0);
  });

  it("10. GET /api/v1/analytics/staff returns real task distribution by staff role", async () => {
    const res = await app.request("/api/v1/analytics/staff", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalStaffTasks >= 3, true);
    assert.ok(Array.isArray(body.data.staffWorkload));
    assert.equal(body.data.staffWorkload.length >= 1, true);
  });

  it("11. GET /api/v1/analytics/export streams real CSV analytics reports", async () => {
    const resSummary = await app.request("/api/v1/analytics/export?report=summary", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(resSummary.status, 200);
    assert.ok(resSummary.headers.get("content-type")?.includes("text/csv"));
    const textSummary = await resSummary.text();
    assert.ok(textSummary.includes("Metric,Value,Generated At"));
    assert.ok(textSummary.includes("Total Patients"));

    const resCareLoop = await app.request("/api/v1/analytics/export?report=care-loop", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(resCareLoop.status, 200);
    const textCareLoop = await resCareLoop.text();
    assert.ok(textCareLoop.includes("ID,Title,Category,Status"));
  });

  it("12. GET /api/v1/analytics/overview supports date range filters", async () => {
    const res = await app.request("/api/v1/analytics/overview?dateRange=7d", {
      headers: { Cookie: `authjs.session-token=${tokenUserA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.organization);
    assert.ok(body.data.staff.staffWorkload);
  });

  it("13. RBAC: Unauthenticated analytics requests are rejected with 401", async () => {
    const res = await app.request("/api/v1/analytics/overview");
    assert.equal(res.status, 401);
  });
});
