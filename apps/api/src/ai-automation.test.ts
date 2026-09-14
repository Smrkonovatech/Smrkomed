import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { prisma } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = `ph10-ai-${Date.now()}`;
const app = createApp();

describe("Phase 10: Advanced Automation + Smrko AI Intelligence Layer", () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let clinicA: { id: string; name: string };
  let clinicB: { id: string; name: string };

  let tokenDoctorA: string;
  let tokenAdminB: string;

  let patientA: { id: string; firstName: string; lastName: string };
  let partnerA: { id: string; firstName: string; lastName: string };
  let coupleA: { id: string };
  let carePlanA: { id: string };
  let treatmentA: { id: string };
  let appointmentA: { id: string };
  let taskA: { id: string };
  let taskHelpA: { id: string };
  let taskVoiceA: { id: string };
  let taskVoiceB: { id: string };
  let taskCompletedA: { id: string };
  let flowA: { id: string };
  let flowExecutionA: { id: string };
  let diagnosticTaskA: { id: string };
  let conversationA: { id: string };
  let kbArticleA: { id: string };

  before(async () => {
    const passwordHash = await hash("Test@12345", 4);
    const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });
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
    const userAdminB = await prisma.user.create({
      data: { email: `${PREFIX}-adminb@test.demo`, passwordHash, name: "Admin B" },
    });

    await prisma.clinicMembership.create({
      data: { clinicId: clinicA.id, userId: userDoc.id, roleId: doctorRole.id, status: "ACTIVE" },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinicB.id, userId: userAdminB.id, roleId: adminRole.id, status: "ACTIVE" },
    });

    tokenDoctorA = await encodeSessionToken(
      {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "DOCTOR",
      },
      "authjs.session-token",
    );

    tokenAdminB = await encodeSessionToken(
      {
        id: userAdminB.id,
        name: userAdminB.name,
        email: userAdminB.email,
        organizationId: orgB.id,
        organizationName: orgB.name,
        clinicId: clinicB.id,
        clinicName: clinicB.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );

    // 1. Seed Patients & Couple
    patientA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Meera",
        lastName: "Deshmukh",
        phone: "+919811223344",
        gender: "FEMALE",
        status: "ACTIVE",
        dateOfBirth: new Date("1992-05-15"),
      },
    });
    partnerA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Rohan",
        lastName: "Deshmukh",
        phone: "+919811223345",
        gender: "MALE",
        status: "ACTIVE",
      },
    });
    coupleA = await prisma.couple.create({
      data: {
        clinicId: clinicA.id,
        primaryPatientId: patientA.id,
        partnerPatientId: partnerA.id,
        slug: `${PREFIX}-couple-a`,
        status: "ACTIVE",
      },
    });

    // 2. Seed Journey & CarePlan
    carePlanA = await prisma.carePlan.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        name: "Antagonist IVF ICSI Protocol",
        type: "IVF",
        status: "ACTIVE",
        currentStageIndex: 7,
        currentStageName: "Oocyte Pick-up (OPU)",
        outcome: "12 Mature Oocytes Retrieved",
      },
    });

    // Add protocol step
    await prisma.carePlanStep.create({
      data: {
        carePlanId: carePlanA.id,
        sortOrder: 7,
        name: "Oocyte Pick-up (OPU)",
        status: "CURRENT",
        detail: "Surgical follicle aspiration under sedation",
      },
    });

    // 3. Seed Treatment
    treatmentA = await prisma.treatment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        kind: "IVF",
        label: "Cycle 1 ICSI",
        status: "ACTIVE",
        stageIndex: 7,
        stageName: "Oocyte Pick-up (OPU)",
      },
    });

    // 4. Seed Today's Appointment
    appointmentA = await prisma.appointment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        type: "Oocyte Pick-up Procedure Review",
        room: "Consultation Suite 1",
        startsAt: new Date(),
        status: "CONFIRMED",
      },
    });

    // 5. Seed Consultation Note
    await prisma.consultationNote.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        createdById: userDoc.id,
        summary: "Pre-OPU assessment satisfactory. Ovarian response adequate on Day 11.",
        reasonForVisit: "Trigger verification",
      },
    });

    // 6. Seed CareTask for conditional automation
    taskA = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Administer HCG Trigger Injection",
        category: "MEDICATION",
        status: "WAITING",
        priority: "HIGH",
        automationEnabled: true,
        dueDate: new Date(Date.now() + 3600000),
      },
    });

    taskHelpA = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Administer Evening Progesterone",
        category: "MEDICATION",
        status: "WAITING",
        priority: "HIGH",
        automationEnabled: true,
      },
    });

    // 7. Seed Diagnostic Task with parameters
    diagnosticTaskA = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Serum Progesterone & Estradiol (E2/P4)",
        category: "DIAGNOSTICS",
        taskType: "DIAGNOSTICS",
        status: "IN_PROGRESS",
        metadata: {
          testName: "Serum Estradiol & Progesterone",
          results: [
            { parameter: "Estradiol (E2)", value: "2450", unit: "pg/mL", flag: "High" },
            { parameter: "Progesterone (P4)", value: "0.7", unit: "ng/mL", flag: "Normal" },
          ],
        },
      },
    });

    // 8. Seed Conversation with Messages
    conversationA = await prisma.conversation.create({
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
        conversationId: conversationA.id,
        direction: "OUTBOUND",
        senderType: "AI",
        content: "Hi Meera, please remember to take your trigger shot at 9:30 PM sharp.",
        status: "DELIVERED",
      },
    });

    await prisma.message.create({
      data: {
        conversationId: conversationA.id,
        direction: "INBOUND",
        senderType: "PATIENT",
        content: "I took the trigger injection at 9:30 PM. Feeling mild cramping, is that normal?",
        status: "DELIVERED",
      },
    });

    // 9. Seed Knowledge Base Article
    kbArticleA = await prisma.whatsAppKnowledgeArticle.create({
      data: {
        clinicId: clinicA.id,
        title: "Trigger Injection Timing & Normal Symptoms",
        category: "Medication & Injections",
        content:
          "The hCG or Lupron trigger shot matures eggs prior to oocyte retrieval. Mild pelvic fullness and mild cramping are expected. Severe pain or shortness of breath requires immediate clinical review.",
        keywords: "trigger, hcg, cramping, opu, injection",
        status: "PUBLISHED",
      },
    });

    // 10. Seed Voice Tasks
    taskVoiceA = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Voice Outreach Follow-up A (Clinical Symptom Test)",
        category: "MEDICATION",
        status: "WAITING",
        priority: "HIGH",
        automationEnabled: true,
      },
    });

    taskVoiceB = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Voice Outreach Follow-up B (Compliance Test)",
        category: "MEDICATION",
        status: "WAITING",
        priority: "NORMAL",
        automationEnabled: true,
      },
    });

    // 11. Seed Already-Completed Task for Idempotency
    taskCompletedA = await prisma.careTask.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA.id,
        carePlanId: carePlanA.id,
        title: "Already Completed Protocol Task",
        category: "GENERAL",
        status: "COMPLETED",
        completedAt: new Date(),
        priority: "NORMAL",
        automationEnabled: true,
      },
    });

    // 12. Seed WhatsApp Flow & Execution for Observability
    flowA = await prisma.whatsAppFlow.create({
      data: {
        clinicId: clinicA.id,
        name: `${PREFIX} Care Loop Flow`,
        triggerType: "JOURNEY_EVENT",
        status: "ACTIVE",
        definition: { nodes: [], edges: [] },
      },
    });

    flowExecutionA = await prisma.whatsAppFlowExecution.create({
      data: {
        clinicId: clinicA.id,
        flowId: flowA.id,
        idempotencyKey: `${PREFIX}-flow-exec-1`,
        patientId: patientA.id,
        coupleId: coupleA.id,
        triggerType: "JOURNEY_EVENT",
        status: "WAITING",
        currentNodeId: "node_wait_resp",
      },
    });
  });

  after(async () => {
    await prisma.whatsAppFlowExecutionStep.deleteMany({
      where: { execution: { clinicId: { in: [clinicA.id, clinicB.id] } } },
    });
    await prisma.whatsAppFlowExecution.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.whatsAppFlow.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.aIInteraction.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.whatsAppKnowledgeArticle.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.message.deleteMany({
      where: { conversation: { clinicId: { in: [clinicA.id, clinicB.id] } } },
    });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.consultationNote.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.carePlanStep.deleteMany({ where: { carePlanId: carePlanA.id } });
    await prisma.treatment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.user.deleteMany({ where: { email: { contains: PREFIX } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicA.id, clinicB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  });

  // 1. Status & Capability
  it("1. GET /api/v1/ai/status returns intelligence capabilities and safety guardrails", async () => {
    const res = await app.request("/api/v1/ai/status", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.safetyGuardrails.autonomousDiagnosisBlocked, true);
    assert.equal(body.data.safetyGuardrails.autonomousPrescriptionBlocked, true);
    assert.equal(body.data.safetyGuardrails.doctorAuthorityEnforced, true);
    assert.ok(body.data.disclaimer.includes("attending licensed physician"));
  });

  // 2. Prepare My Day
  it("2. POST /api/v1/ai/prepare-my-day generates factual clinical briefing with active IVF context", async () => {
    const res = await app.request("/api/v1/ai/prepare-my-day", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.summary.includes("appointment"));
    assert.equal(body.data.metrics.todayAppointmentsCount >= 1, true);
    assert.equal(body.data.metrics.activeTreatmentsCount >= 1, true);
    assert.equal(body.data.appointments[0].patientName, "Meera Deshmukh");
  });

  // 3. Patient Clinical Summary
  it("3. POST /api/v1/ai/patient-summary synthesizes cycle stage and consultation context", async () => {
    const res = await app.request("/api/v1/ai/patient-summary", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ patientId: patientA.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.patientName, "Meera Deshmukh");
    assert.ok(body.data.summary.includes("Oocyte Pick-up"));
    assert.equal(body.data.activeJourneyStage, "Oocyte Pick-up (OPU)");
  });

  // 4. Conversation Summary & Sentiment
  it("4. POST /api/v1/ai/conversation-summary analyzes patient intent and thread sentiment", async () => {
    const res = await app.request("/api/v1/ai/conversation-summary", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ conversationId: conversationA.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalMessagesAnalyzed, 2);
    assert.ok(body.data.summary.includes("Patient intent"));
  });

  // 5. Task Summary
  it("5. POST /api/v1/ai/task-summary summarizes clinical tasks and completion state", async () => {
    const res = await app.request("/api/v1/ai/task-summary", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ coupleId: coupleA.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.total >= 2, true);
    assert.ok(body.data.summary.includes("CareTasks"));
  });

  // 6. Journey Summary
  it("6. POST /api/v1/ai/journey-summary tracks 15-stage IVF protocol progress", async () => {
    const res = await app.request("/api/v1/ai/journey-summary", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ coupleId: coupleA.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalStages, 15);
    assert.equal(body.data.currentStageName, "Oocyte Pick-up (OPU)");
    assert.ok(body.data.summary.includes("15:"));
  });

  // 7. Report Summary
  it("7. POST /api/v1/ai/report-summary extracts parameters without autonomous diagnostic decisions", async () => {
    const res = await app.request("/api/v1/ai/report-summary", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ taskId: diagnosticTaskA.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.parametersCount, 2);
    assert.equal(body.data.flaggedCount, 1);
    assert.equal(body.data.doctorReviewPending, true);
    assert.ok(body.data.summary.includes("Doctor clinical evaluation required"));
  });

  // 8. Safe Message Drafting
  it("8. POST /api/v1/ai/draft-message drafts message requiring staff approval before send", async () => {
    const res = await app.request("/api/v1/ai/draft-message", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        patientId: patientA.id,
        intent: "MEDICATION_REMINDER",
        customContext: "Progesterone pessaries at 10 PM",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.approvalRequired, true);
    assert.ok(body.data.draftedMessage.includes("Meera"));
    assert.ok(body.data.draftedMessage.includes("Progesterone pessaries"));
  });

  // 9. Consultation SOAP Note Assist
  it("9. POST /api/v1/ai/consultation-assist drafts SOAP note requiring doctor final signature", async () => {
    const res = await app.request("/api/v1/ai/consultation-assist", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointmentA.id,
        clinicalImpressionNotes: "OPU recovery unremarkable. Mild pelvic tenderness, abdomen soft.",
        vitals: { bp: "118/76", pulse: "74", weight: "58 kg" },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.doctorAuthorizationRequired, true);
    assert.ok(body.data.proposedSoap.subjective.includes("Meera Deshmukh"));
    assert.ok(body.data.proposedSoap.objective.includes("118/76"));
    assert.ok(body.data.proposedSoap.plan.includes("luteal"));
  });

  // 10. Discharge Drafting
  it("10. POST /api/v1/ai/draft-discharge creates draft discharge requiring physician sign-off", async () => {
    const res = await app.request("/api/v1/ai/draft-discharge", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        coupleId: coupleA.id,
        clinicalSummary: "Uncomplicated OPU procedure with 12 mature oocytes retrieved. Luteal support initiated.",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.draftSummary.finalDischargeStatus, "DRAFT_PENDING_DOCTOR_AUTHORIZATION");
    assert.ok(body.data.clinicalSafetyNotice.includes("cannot independently finalise discharge"));
  });

  // 11. Knowledge Retrieval
  it("11. POST /api/v1/ai/knowledge-retrieve searches verified published knowledge articles", async () => {
    const res = await app.request("/api/v1/ai/knowledge-retrieve", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ query: "cramping after trigger injection" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalMatches >= 1, true);
    assert.ok(body.data.articles[0].title.includes("Trigger"));
  });

  // 12. Human Handoff
  it("12. POST /api/v1/ai/handoff pauses automation and creates priority staff escalation", async () => {
    const res = await app.request("/api/v1/ai/handoff", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationA.id,
        reason: "Patient reporting unexpected sharp unilateral pain",
        patientId: patientA.id,
        coupleId: coupleA.id,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "HUMAN_HANDOFF");
    assert.equal(body.data.assignedPriority, "HIGH");

    // Verify conversation state updated in database
    const updatedConvo = await prisma.conversation.findUnique({ where: { id: conversationA.id } });
    assert.equal(updatedConvo?.status, "HUMAN_HANDOFF");
    assert.ok(updatedConvo?.aiPausedAt);
  });

  // 13. Conditional Automation
  it("13. POST /api/v1/ai/conditional-automation executes rule-based workflow transitions", async () => {
    // A) Patient sends "DONE" -> marks task COMPLETED
    const resDone = await app.request("/api/v1/ai/conditional-automation", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        taskId: taskA.id,
        event: "PATIENT_RESPONSE",
        responsePayload: "DONE - Injection taken on time",
      }),
    });
    assert.equal(resDone.status, 200);
    const bodyDone = await resDone.json();
    assert.equal(bodyDone.data.actionTaken, "COMPLETED_AUTOMATICALLY");
    assert.equal(bodyDone.data.currentStatus, "COMPLETED");

    // Verify task updated in DB
    const updatedTask = await prisma.careTask.findUnique({ where: { id: taskA.id } });
    assert.equal(updatedTask?.status, "COMPLETED");
    assert.equal(updatedTask?.patientResponse, "DONE - Injection taken on time");

    // B) Patient reports "NEED HELP" -> marks task ESCALATED to CLINICAL priority
    const resHelp = await app.request("/api/v1/ai/conditional-automation", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        taskId: taskHelpA.id,
        event: "PATIENT_RESPONSE",
        responsePayload: "NEED HELP - syringe broke, missed medication",
      }),
    });
    assert.equal(resHelp.status, 200);
    const bodyHelp = await resHelp.json();
    assert.equal(bodyHelp.data.actionTaken, "ESCALATED_CLINICAL");
    assert.equal(bodyHelp.data.currentStatus, "ESCALATED");
  });

  // 14. Tenant Isolation
  it("14. Tenant Isolation: Clinic B cannot access Clinic A patient context", async () => {
    const res = await app.request("/api/v1/ai/patient-summary", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenAdminB}`, "content-type": "application/json" },
      body: JSON.stringify({ patientId: patientA.id }),
    });
    assert.equal(res.status, 404);
  });

  // 15. Audit & AI Interaction Logging
  it("15. Verifies AI interactions are persisted for clinical audit and cost governance", async () => {
    const interactionsCount = await prisma.aIInteraction.count({
      where: { clinicId: clinicA.id },
    });
    assert.equal(interactionsCount >= 5, true);
  });

  // 16. Explain Workflow Status
  it("16. POST /api/v1/ai/explain-workflow synthesizes factual protocol and milestone progress", async () => {
    const res = await app.request("/api/v1/ai/explain-workflow", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ coupleId: coupleA.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.currentStageIndex, 7);
    assert.equal(body.data.currentStageName, "Oocyte Pick-up (OPU)");
    assert.ok(body.data.explanation.includes("Stage 8 of 15"));
    assert.equal(body.data.workflowSourceOfTruth, "CarePlan & CareTask engine");
  });

  // 17. AI Voice Outreach - Clinical Concern Escalation
  it("17. POST /api/v1/ai/voice-escalation halts automation and escalates when clinical symptoms detected", async () => {
    const res = await app.request("/api/v1/ai/voice-escalation", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        taskId: taskVoiceA.id,
        transcript: "I am feeling severe dizziness and heavy bleeding since this morning",
        clinicalConcernFlagged: true,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.actionTaken, "STOPPED_AND_ESCALATED");
    assert.equal(body.data.escalationPriority, "CLINICAL");
    assert.ok(body.data.clinicalSafetyNotice.includes("Automated voice session halted"));

    // Verify task state in database
    const updated = await prisma.careTask.findUnique({ where: { id: taskVoiceA.id } });
    assert.equal(updated?.status, "ESCALATED");
    assert.equal(updated?.priority, "CLINICAL");

    // Verify AI interaction logged with HANDOFF
    const interaction = await prisma.aIInteraction.findFirst({
      where: { careTaskId: taskVoiceA.id, intent: "CLINICAL_CONCERN_DETECTED" },
    });
    assert.ok(interaction);
    assert.equal(interaction?.status, "HANDOFF");
  });

  // 18. AI Voice Outreach - Normal Compliance
  it("18. POST /api/v1/ai/voice-escalation completes task when patient confirms compliance", async () => {
    const res = await app.request("/api/v1/ai/voice-escalation", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        taskId: taskVoiceB.id,
        transcript: "Yes, I took all morning medications as scheduled and feeling fine.",
        clinicalConcernFlagged: false,
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.actionTaken, "COMPLETED_VIA_VOICE");

    const updated = await prisma.careTask.findUnique({ where: { id: taskVoiceB.id } });
    assert.equal(updated?.status, "COMPLETED");
  });

  // 19. Automation Observability
  it("19. GET /api/v1/ai/observability returns execution visibility and status breakdown", async () => {
    const res = await app.request("/api/v1/ai/observability", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalExecutions >= 1, true);
    assert.equal(typeof body.data.statusCounts.waiting, "number");
    assert.equal(body.data.statusCounts.waiting >= 1, true);
    assert.equal(body.data.executions[0].executionId, flowExecutionA.id);
  });

  // 20. AI Audit & Cost Governance
  it("20. GET /api/v1/ai/audit returns AI interaction history and deterministic cost controls", async () => {
    const res = await app.request("/api/v1/ai/audit", {
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalAiCalls >= 5, true);
    assert.equal(body.data.handoffCount >= 1, true);
    assert.ok(body.data.costPolicy.includes("Deterministic routing prioritised"));
    assert.ok(body.data.modelBreakdown["smrko-clinical-ai-v2"] >= 1);
  });

  // 21. Idempotency Check
  it("21. Idempotency: Repeated PATIENT_RESPONSE on completed task returns IDEMPOTENT_NOOP", async () => {
    const res = await app.request("/api/v1/ai/conditional-automation", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({
        taskId: taskCompletedA.id,
        event: "PATIENT_RESPONSE",
        responsePayload: "DONE - repeat response duplicate webhook",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.actionTaken, "IDEMPOTENT_NOOP");
    assert.equal(body.data.currentStatus, "COMPLETED");

    // Verify task status unchanged
    const task = await prisma.careTask.findUnique({ where: { id: taskCompletedA.id } });
    assert.equal(task?.status, "COMPLETED");
  });

  // 22. Failure & Validation Handling
  it("22. Failure Handling: Invalid IDs and non-existent entities return proper 400/404 errors", async () => {
    // Non-existent patient ID
    const resNotFound = await app.request("/api/v1/ai/patient-summary", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ patientId: "00000000-0000-0000-0000-000000000000" }),
    });
    assert.equal(resNotFound.status, 404);

    // Missing required field (body without required fields)
    const resValidation = await app.request("/api/v1/ai/conditional-automation", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenDoctorA}`, "content-type": "application/json" },
      body: JSON.stringify({ taskId: "invalid-id" }), // missing event
    });
    assert.equal(resValidation.status === 400 || resValidation.status === 422, true);
  });
});
