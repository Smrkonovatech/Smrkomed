import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";
import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";
import { processCareLoopExecutions } from "./modules/care-loop/worker";

const PREFIX = "diag-test";
const app = createApp();

let tenantA: TenantContext;
let tenantB: TenantContext;
let clinicAId: string;
let clinicBId: string;
let doctorAId: string;
let nurseAId: string;
let patientAId: string;
let coupleAId: string;
let carePlanAId: string;
let stepAId: string;

let tokenDoctorA: string;
let tokenNurseA: string;
let tokenDoctorB: string;

function authHeaders(token: string, extraHeaders: Record<string, string> = {}) {
  return {
    "content-type": "application/json",
    cookie: `authjs.session-token=${token}`,
    ...extraHeaders,
  };
}

before(async () => {
  // Create Organization & Clinic A
  const orgA = await prisma.organization.create({
    data: { name: `${PREFIX}-org-A` },
  });

  const clinicA = await prisma.clinic.create({
    data: {
      organizationId: orgA.id,
      name: `${PREFIX}-clinic-A`,
      slug: `${PREFIX}-clinic-a-${Date.now()}`,
    },
  });
  clinicAId = clinicA.id;

  // Roles
  const doctorRole = await prisma.role.upsert({
    where: { key: "DOCTOR" },
    update: {},
    create: { key: "DOCTOR", name: "Doctor" },
  });

  const nurseRole = await prisma.role.upsert({
    where: { key: "NURSE" },
    update: {},
    create: { key: "NURSE", name: "Nurse" },
  });

  // Doctor in Clinic A
  const docUser = await prisma.user.create({
    data: {
      name: "Dr. Diagnostic Reviewer",
      email: `${PREFIX}-doc-${Date.now()}@test.com`,
      passwordHash: "unused",
      phone: "+919800000001",
    },
  });
  doctorAId = docUser.id;

  await prisma.clinicMembership.create({
    data: {
      clinicId: clinicA.id,
      userId: docUser.id,
      roleId: doctorRole.id,
      status: "ACTIVE",
    },
  });

  // Nurse in Clinic A (non-doctor)
  const nurseUser = await prisma.user.create({
    data: {
      name: "Nurse Lab Tech",
      email: `${PREFIX}-nurse-${Date.now()}@test.com`,
      passwordHash: "unused",
      phone: "+919800000002",
    },
  });
  nurseAId = nurseUser.id;

  await prisma.clinicMembership.create({
    data: {
      clinicId: clinicA.id,
      userId: nurseUser.id,
      roleId: nurseRole.id,
      status: "ACTIVE",
    },
  });

  tenantA = {
    organizationId: orgA.id,
    organizationName: orgA.name,
    clinicId: clinicA.id,
    clinicName: clinicA.name,
    userId: docUser.id,
    role: "DOCTOR",
  };

  // Generate Session Tokens
  tokenDoctorA = await encodeSessionToken({
    id: docUser.id,
    name: docUser.name,
    email: docUser.email,
    organizationId: orgA.id,
    organizationName: orgA.name,
    clinicId: clinicA.id,
    clinicName: clinicA.name,
    role: "DOCTOR",
  });

  tokenNurseA = await encodeSessionToken({
    id: nurseUser.id,
    name: nurseUser.name,
    email: nurseUser.email,
    organizationId: orgA.id,
    organizationName: orgA.name,
    clinicId: clinicA.id,
    clinicName: clinicA.name,
    role: "NURSE",
  });

  // Patient and Couple in Clinic A
  const patientA = await prisma.patient.create({
    data: {
      clinicId: clinicA.id,
      firstName: "Sneha",
      lastName: "Kulkarni",
      phone: "+919876543299",
      whatsappNumber: "+919876543299",
    },
  });
  patientAId = patientA.id;

  const coupleA = await prisma.couple.create({
    data: {
      clinicId: clinicA.id,
      primaryPatientId: patientA.id,
      slug: `${PREFIX}-couple-a-${Date.now()}`,
    },
  });
  coupleAId = coupleA.id;

  // Journey & Step in Clinic A
  const carePlanA = await prisma.carePlan.create({
    data: {
      clinicId: clinicA.id,
      coupleId: coupleA.id,
      type: "IVF",
      name: "IVF Cycle 1 - Diagnostics",
      status: "ACTIVE",
    },
  });
  carePlanAId = carePlanA.id;

  const stepA = await prisma.carePlanStep.create({
    data: {
      carePlanId: carePlanA.id,
      sortOrder: 1,
      name: "Ovarian Stimulation & Monitoring",
      status: "PENDING",
    },
  });
  stepAId = stepA.id;

  // Clinic B for Tenant Isolation
  const orgB = await prisma.organization.create({
    data: { name: `${PREFIX}-org-B` },
  });
  const clinicB = await prisma.clinic.create({
    data: {
      organizationId: orgB.id,
      name: `${PREFIX}-clinic-B`,
      slug: `${PREFIX}-clinic-b-${Date.now()}`,
    },
  });
  clinicBId = clinicB.id;

  const userB = await prisma.user.create({
    data: {
      name: "Dr. Clinic B",
      email: `${PREFIX}-doc-b-${Date.now()}@test.com`,
      passwordHash: "unused",
      phone: "+919800000003",
    },
  });

  await prisma.clinicMembership.create({
    data: {
      clinicId: clinicB.id,
      userId: userB.id,
      roleId: doctorRole.id,
      status: "ACTIVE",
    },
  });

  tenantB = {
    organizationId: orgB.id,
    organizationName: orgB.name,
    clinicId: clinicB.id,
    clinicName: clinicB.name,
    userId: userB.id,
    role: "DOCTOR",
  };

  tokenDoctorB = await encodeSessionToken({
    id: userB.id,
    name: userB.name,
    email: userB.email,
    organizationId: orgB.id,
    organizationName: orgB.name,
    clinicId: clinicB.id,
    clinicName: clinicB.name,
    role: "DOCTOR",
  });
});

after(async () => {
  try {
    // Cleanup test records
    await prisma.escalation.deleteMany({ where: { clinicId: { in: [clinicAId, clinicBId] } } });
    await prisma.document.deleteMany({ where: { clinicId: { in: [clinicAId, clinicBId] } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: [clinicAId, clinicBId] } } });
    await prisma.carePlanStep.deleteMany({ where: { carePlanId: carePlanAId } });
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: [clinicAId, clinicBId] } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: [clinicAId, clinicBId] } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicAId, clinicBId] } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: [clinicAId, clinicBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [doctorAId, nurseAId, tenantB.userId] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicAId, clinicBId] } } });
    await prisma.organization.deleteMany({ where: { name: { in: [`${PREFIX}-org-A`, `${PREFIX}-org-B`] } } });
  } catch {
    // Safe teardown
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Doctor orders diagnostic test
// ─────────────────────────────────────────────────────────────────────────────
let createdOrderId = "";

test("1. Doctor orders diagnostic test and order persists with care task and document", async () => {
  const res = await app.request("/api/v1/diagnostics", {
    method: "POST",
    headers: authHeaders(tokenDoctorA),
    body: JSON.stringify({
      patientId: patientAId,
      coupleId: coupleAId,
      testName: "AMH & Hormone Panel",
      category: "Fertility Lab",
      priority: "Routine",
      specimenType: "Blood (Serum)",
      carePlanStepId: stepAId,
      notes: "Pre-stimulation hormone evaluation",
    }),
  });

  assert.equal(res.status, 201);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.testName, "AMH & Hormone Panel");
  assert.equal(json.data.category, "Fertility Lab");
  assert.equal(json.data.status, "Ordered");
  assert.ok(json.data.id);
  createdOrderId = json.data.id;

  // Verify DB persistence
  const dbTask = await prisma.careTask.findUniqueOrThrow({
    where: { id: createdOrderId },
    include: { documents: true },
  });
  assert.equal(dbTask.clinicId, clinicAId);
  assert.equal(dbTask.taskType, "DIAGNOSTIC_ORDER");
  assert.equal(dbTask.status, "WAITING");
  assert.equal(dbTask.documents.length, 1);
  assert.equal(dbTask.documents[0]?.status, "AWAITING_UPLOAD");
  assert.equal(dbTask.documents[0]?.name, "AMH & Hormone Panel Report");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Lab queue visibility
// ─────────────────────────────────────────────────────────────────────────────
test("2. Lab staff sees active orders in diagnostic queue", async () => {
  const res = await app.request("/api/v1/diagnostics?category=Fertility Lab", {
    method: "GET",
    headers: authHeaders(tokenNurseA),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  const match = json.data.find((o: any) => o.id === createdOrderId);
  assert.ok(match, "Lab queue must include ordered diagnostic");
  assert.equal(match.status, "Ordered");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Lab collects sample
// ─────────────────────────────────────────────────────────────────────────────
test("3. Lab records sample collection and order transitions to Processing", async () => {
  const res = await app.request(`/api/v1/diagnostics/${createdOrderId}/sample`, {
    method: "POST",
    headers: authHeaders(tokenNurseA),
    body: JSON.stringify({
      sampleId: "SMPL-AMH-9981",
      sampleType: "Blood (Serum)",
      collectedBy: "Nurse Lab Tech",
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.status, "Processing");
  assert.equal(json.data.specimen.sampleId, "SMPL-AMH-9981");

  // Verify DB state
  const dbTask = await prisma.careTask.findUniqueOrThrow({ where: { id: createdOrderId } });
  assert.equal(dbTask.status, "IN_PROGRESS");
  const meta: any = dbTask.metadata ?? {};
  assert.ok(meta.specimen?.barcode === "SMPL-AMH-9981" || meta.specimen?.sampleId === "SMPL-AMH-9981");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Lab enters results with parameters and flags
// ─────────────────────────────────────────────────────────────────────────────
test("4. Lab enters diagnostic results with parameters, units, and flags", async () => {
  const res = await app.request(`/api/v1/diagnostics/${createdOrderId}/results`, {
    method: "POST",
    headers: authHeaders(tokenNurseA),
    body: JSON.stringify({
      results: [
        { parameter: "AMH (Anti-Müllerian Hormone)", result: "2.85", unit: "ng/mL", range: "1.0 - 3.5", flag: "Normal" },
        { parameter: "TSH", result: "1.92", unit: "mIU/L", range: "0.4 - 4.0", flag: "Normal" },
        { parameter: "Prolactin", result: "14.2", unit: "ng/mL", range: "5.0 - 25.0", flag: "Normal" },
        { parameter: "FSH", result: "6.4", unit: "mIU/mL", range: "3.5 - 12.5", flag: "Normal" },
      ],
      findings: "Ovarian reserve markers within optimal fertility range.",
      technicianNotes: "Specimen processed on Cobas e411 analyzer.",
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.status, "Result Ready");
  assert.equal(json.data.results.length, 4);
  assert.equal(json.data.documentStatus, "UPLOADED");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Unverified results cannot be doctor-approved
// ─────────────────────────────────────────────────────────────────────────────
test("5. Unverified reports cannot be accepted as verified clinical facts", async () => {
  // Attempt to review before verification
  // Create an unverified order
  const rawOrder = await prisma.careTask.create({
    data: {
      clinicId: clinicAId,
      coupleId: coupleAId,
      title: "Unverified Test",
      taskType: "DIAGNOSTIC_ORDER",
      status: "IN_PROGRESS",
      metadata: { status: "Processing", testName: "Unverified Test" },
    },
  });

  const res = await app.request(`/api/v1/diagnostics/${rawOrder.id}/review`, {
    method: "POST",
    headers: authHeaders(tokenDoctorA),
    body: JSON.stringify({
      doctorNotes: "Trying to review before lab verification",
      action: "APPROVE",
    }),
  });

  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.error.code, "VERIFICATION_REQUIRED");
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Lab staff verifies results
// ─────────────────────────────────────────────────────────────────────────────
test("6. Lab supervisor verifies results and document moves to DOCTOR_REVIEW", async () => {
  const res = await app.request(`/api/v1/diagnostics/${createdOrderId}/verify`, {
    method: "POST",
    headers: authHeaders(tokenNurseA),
    body: JSON.stringify({
      verifiedBy: "Senior Biochemist",
      notes: "Internal quality controls within 2 SD.",
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.status, "Verified");
  assert.equal(json.data.verification.status, "Verified");
  assert.equal(json.data.documentStatus, "DOCTOR_REVIEW");

  // Verify DB state
  const dbDoc = await prisma.document.findFirstOrThrow({ where: { careTaskId: createdOrderId } });
  assert.equal(dbDoc.status, "DOCTOR_REVIEW");
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Doctor review queue displays verified order
// ─────────────────────────────────────────────────────────────────────────────
test("7. Doctor review queue displays verified diagnostic order", async () => {
  const res = await app.request("/api/v1/diagnostics/review-queue", {
    method: "GET",
    headers: authHeaders(tokenDoctorA),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  const match = json.data.find((o: any) => o.id === createdOrderId);
  assert.ok(match, "Verified order must be in doctor review queue");
  assert.equal(match.status, "Verified");
  assert.equal(match.results.length, 4);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Non-clinical role cannot sign off doctor review (RBAC)
// ─────────────────────────────────────────────────────────────────────────────
test("8. Non-clinical role cannot sign off clinical doctor review (RBAC)", async () => {
  const res = await app.request(`/api/v1/diagnostics/${createdOrderId}/review`, {
    method: "POST",
    headers: authHeaders(tokenNurseA),
    body: JSON.stringify({
      doctorNotes: "Nurse trying to approve",
      action: "APPROVE",
    }),
  });

  assert.equal(res.status, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Doctor reviews and approves with clinical notes
// ─────────────────────────────────────────────────────────────────────────────
test("9. Doctor reviews and approves with clinical notes, completing task and advancing journey", async () => {
  const res = await app.request(`/api/v1/diagnostics/${createdOrderId}/review`, {
    method: "POST",
    headers: authHeaders(tokenDoctorA),
    body: JSON.stringify({
      doctorNotes: "AMH 2.85 ng/mL indicates good ovarian reserve. Proceed with standard GnRH antagonist protocol.",
      action: "APPROVE",
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.status, "Doctor Reviewed");
  assert.equal(json.data.careTaskStatus, "COMPLETED");
  assert.equal(json.data.documentStatus, "REVIEWED");

  // Verify Journey Step was marked DONE
  const dbStep = await prisma.carePlanStep.findUniqueOrThrow({ where: { id: stepAId } });
  assert.equal(dbStep.status, "DONE");
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Patient detail diagnostic overview reflects completed state
// ─────────────────────────────────────────────────────────────────────────────
test("10. Patient detail diagnostic overview reflects completed diagnostic history", async () => {
  const res = await app.request(`/api/v1/diagnostics/patient/${patientAId}`, {
    method: "GET",
    headers: authHeaders(tokenDoctorA),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.summary.total >= 1, true);
  assert.equal(json.data.summary.reviewed >= 1, true);

  const match = json.data.orders.find((o: any) => o.id === createdOrderId);
  assert.ok(match);
  assert.equal(match.status, "Doctor Reviewed");
  assert.equal(match.doctorReview.action, "APPROVE");
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Fertility diagnostics: Follicular Scan & Semen Analysis
// ─────────────────────────────────────────────────────────────────────────────
test("11. Fertility diagnostics: Follicular scan & Semen Analysis order and workflow", async () => {
  // Order Semen Analysis
  const saRes = await app.request("/api/v1/diagnostics", {
    method: "POST",
    headers: authHeaders(tokenDoctorA),
    body: JSON.stringify({
      patientId: patientAId,
      coupleId: coupleAId,
      testName: "Semen Analysis (WHO 6th Ed)",
      category: "Semen Analysis",
      priority: "Routine",
      specimenType: "Semen",
    }),
  });
  assert.equal(saRes.status, 201);
  const saOrder = (await saRes.json()).data;

  // Lab enters andrology parameters
  await app.request(`/api/v1/diagnostics/${saOrder.id}/results`, {
    method: "POST",
    headers: authHeaders(tokenNurseA),
    body: JSON.stringify({
      results: [
        { parameter: "Volume", result: "3.2", unit: "mL", range: ">= 1.4", flag: "Normal" },
        { parameter: "Concentration", result: "45", unit: "M/mL", range: ">= 16", flag: "Normal" },
        { parameter: "Total Motility (PR+NP)", result: "58", unit: "%", range: ">= 42", flag: "Normal" },
        { parameter: "Progressive Motility (PR)", result: "42", unit: "%", range: ">= 30", flag: "Normal" },
        { parameter: "Normal Morphology", result: "5.5", unit: "%", range: ">= 4.0", flag: "Normal" },
      ],
      findings: "Normozoospermia as per WHO 6th edition criteria.",
    }),
  });

  // Verify
  await app.request(`/api/v1/diagnostics/${saOrder.id}/verify`, {
    method: "POST",
    headers: authHeaders(tokenNurseA),
    body: JSON.stringify({ verifiedBy: "Senior Andrologist" }),
  });

  // Doctor review
  const docRevRes = await app.request(`/api/v1/diagnostics/${saOrder.id}/review`, {
    method: "POST",
    headers: authHeaders(tokenDoctorA),
    body: JSON.stringify({
      doctorNotes: "Semen parameters normal. Suitable for conventional IVF / ICSI.",
      action: "APPROVE",
    }),
  });
  assert.equal(docRevRes.status, 200);
  assert.equal((await docRevRes.json()).data.status, "Doctor Reviewed");
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Care Loop handles missing diagnostic report with MISSING_REPORT escalation
// ─────────────────────────────────────────────────────────────────────────────
test("12. Care Loop worker detects overdue diagnostic report and creates MISSING_REPORT escalation", async () => {
  // Create an overdue diagnostic order
  const overdueTask = await prisma.careTask.create({
    data: {
      clinicId: clinicAId,
      coupleId: coupleAId,
      targetPatientId: patientAId,
      title: "Day 9 Follicular Ultrasound Scan",
      category: "DIAGNOSTIC",
      taskType: "DIAGNOSTIC_ORDER",
      status: "WAITING",
      dueDate: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
      attempts: 3, // max attempts
      updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // > 24 hours cooldown
      automationEnabled: true,
      metadata: { status: "Ordered", testName: "Day 9 Follicular Ultrasound Scan" },
    },
  });

  // Run care loop worker
  const results = await processCareLoopExecutions(10, clinicAId);
  assert.ok(results.some((r) => r.taskId === overdueTask.id && r.status === "ESCALATED"));

  // Verify escalation was created with type MISSING_REPORT
  const escalation = await prisma.escalation.findFirstOrThrow({
    where: { careTaskId: overdueTask.id },
  });
  assert.equal(escalation.type, "MISSING_REPORT");
  assert.ok(escalation.reason.includes("Diagnostic test report pending/overdue"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Tenant Isolation
// ─────────────────────────────────────────────────────────────────────────────
test("13. Tenant isolation prevents Clinic B from viewing or reviewing Clinic A diagnostics", async () => {
  // Clinic B cannot get order from Clinic A
  const resGet = await app.request(`/api/v1/diagnostics/${createdOrderId}`, {
    method: "GET",
    headers: authHeaders(tokenDoctorB),
  });
  assert.ok(resGet.status === 403 || resGet.status === 404, "Must reject cross-tenant access with 403 or 404");

  // Clinic B cannot review Clinic A order
  const resReview = await app.request(`/api/v1/diagnostics/${createdOrderId}/review`, {
    method: "POST",
    headers: authHeaders(tokenDoctorB),
    body: JSON.stringify({
      doctorNotes: "Malicious cross-tenant review",
      action: "APPROVE",
    }),
  });
  assert.ok(resReview.status === 403 || resReview.status === 404, "Must reject cross-tenant review with 403 or 404");
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Retest request workflow
// ─────────────────────────────────────────────────────────────────────────────
test("14. Doctor can request re-test, reverting order to Ordered state for fresh collection", async () => {
  // Create verified order
  const order = await prisma.careTask.create({
    data: {
      clinicId: clinicAId,
      coupleId: coupleAId,
      targetPatientId: patientAId,
      title: "Lipemic Serum Test",
      category: "DIAGNOSTIC",
      taskType: "DIAGNOSTIC_ORDER",
      status: "ACTIVE",
      metadata: {
        status: "Verified",
        testName: "Lipemic Serum Test",
        results: [{ parameter: "Estradiol", result: "450", unit: "pg/mL", flag: "Abnormal" }],
      },
    },
  });

  const res = await app.request(`/api/v1/diagnostics/${order.id}/review`, {
    method: "POST",
    headers: authHeaders(tokenDoctorA),
    body: JSON.stringify({
      doctorNotes: "Sample appears hemolyzed. Please re-collect fasting sample.",
      action: "REQUEST_RETEST",
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.data.status, "Ordered");
  assert.equal(json.data.careTaskStatus, "WAITING");
  assert.equal(json.data.doctorReview.action, "REQUEST_RETEST");
});
