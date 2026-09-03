import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";
import {
  activatePatientTreatmentPlan,
  addDoctorTask,
  completeCareTask,
  evaluateStageProgress,
  getJourneyExecution,
  handleBranchDecision,
  handlePatientResponse,
  modifyDoctorTask,
  pauseCarePlan,
  resumeCarePlan,
} from "./modules/care-loop/engine";

const PREFIX = "test-careloop";
const app = createApp();

type Fixture = {
  ctx: TenantContext;
  token: string;
  clinicId: string;
  doctorUser: { id: string; name: string };
  coordinatorUser: { id: string; name: string };
  coupleId: string;
  templateId: string;
};

let fx: Fixture;

async function cleanup() {
  const clinics = await prisma.clinic.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true, organizationId: true },
  });
  const clinicIds = clinics.map((r) => r.id);
  const orgIds = [...new Set(clinics.map((r) => r.organizationId))];

  if (clinicIds.length > 0) {
    await prisma.escalation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.taskAssignment.deleteMany({ where: { careTask: { clinicId: { in: clinicIds } } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.carePlanStep.deleteMany({ where: { carePlan: { clinicId: { in: clinicIds } } } });
    await prisma.carePlan.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.treatment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.carePlanTemplateTask.deleteMany({ where: { template: { clinicId: { in: clinicIds } } } });
    await prisma.carePlanTemplateStep.deleteMany({ where: { template: { clinicId: { in: clinicIds } } } });
    await prisma.carePlanTemplate.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }

  await prisma.user.deleteMany({ where: { email: { endsWith: `@${PREFIX}.demo` } } });
  if (orgIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
}

before(async () => {
  await cleanup();

  const org = await prisma.organization.create({
    data: { name: "Care Loop Test Org", slug: `${PREFIX}-org` },
  });

  const clinic = await prisma.clinic.create({
    data: { organizationId: org.id, name: "Care Loop Test Clinic", slug: `${PREFIX}-clinic` },
  });

  const doctor = await prisma.user.create({
    data: {
      email: `doctor@${PREFIX}.demo`,
      passwordHash: "dummy",
      name: "Dr. Ananya Rao",
    },
  });

  const coordinator = await prisma.user.create({
    data: {
      email: `coordinator@${PREFIX}.demo`,
      passwordHash: "dummy",
      name: "Meera Iyer",
    },
  });

  const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });
  const coordRole = await prisma.role.findUniqueOrThrow({ where: { key: "CARE_COORDINATOR" } });

  await prisma.clinicMembership.createMany({
    data: [
      { clinicId: clinic.id, userId: doctor.id, roleId: doctorRole.id, status: "ACTIVE" },
      { clinicId: clinic.id, userId: coordinator.id, roleId: coordRole.id, status: "ACTIVE" },
    ],
  });

  // Create Patient & Couple (Priya + Rahul)
  const priya = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      firstName: "Priya",
      lastName: "Sharma",
      gender: "FEMALE",
      phone: "+919845011221",
      email: `priya@${PREFIX}.demo`,
    },
  });

  const rahul = await prisma.patient.create({
    data: {
      clinicId: clinic.id,
      firstName: "Rahul",
      lastName: "Sharma",
      gender: "MALE",
      phone: "+919845011222",
      email: `rahul@${PREFIX}.demo`,
    },
  });

  const couple = await prisma.couple.create({
    data: {
      clinicId: clinic.id,
      slug: `${PREFIX}-priya-rahul`,
      primaryPatientId: priya.id,
      partnerPatientId: rahul.id,
      assignedDoctorId: doctor.id,
      assignedCoordinatorId: coordinator.id,
      careLoopActive: true,
      status: "ACTIVE",
    },
  });

  // Create a 16-stage template for test clinic
  const template = await prisma.carePlanTemplate.create({
    data: {
      clinicId: clinic.id,
      name: "IVF — Standard Journey",
      specialty: "FERTILITY",
      type: "IVF",
      version: 1,
      isSystem: false,
      isActive: true,
    },
  });

  // Create 3 sample stages with tasks
  const s0 = await prisma.carePlanTemplateStep.create({
    data: {
      templateId: template.id,
      sortOrder: 0,
      name: "Fertility Consultation",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
    },
  });
  await prisma.carePlanTemplateTask.create({
    data: {
      templateId: template.id,
      stepId: s0.id,
      title: "Doctor consultation for {{patient_name}}",
      taskType: "DOCTOR_TASK",
      ownerRole: "DOCTOR",
      priority: "HIGH",
      dueTimingDays: 0,
      triggerEvent: "STAGE_STARTED",
    },
  });
  await prisma.carePlanTemplateTask.create({
    data: {
      templateId: template.id,
      stepId: s0.id,
      title: "Intake form completion",
      taskType: "PATIENT_TASK",
      ownerRole: "PATIENT",
      priority: "NORMAL",
      dueTimingDays: 1,
      triggerEvent: "STAGE_STARTED",
    },
  });

  const s1 = await prisma.carePlanTemplateStep.create({
    data: {
      templateId: template.id,
      sortOrder: 1,
      name: "Investigation / Workup",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
    },
  });
  await prisma.carePlanTemplateTask.create({
    data: {
      templateId: template.id,
      stepId: s1.id,
      title: "Hormone blood test",
      taskType: "PATIENT_TASK",
      ownerRole: "PATIENT",
      priority: "HIGH",
      dueTimingDays: 2,
    },
  });

  const s2 = await prisma.carePlanTemplateStep.create({
    data: {
      templateId: template.id,
      sortOrder: 2,
      name: "Ovarian Stimulation",
      completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE",
    },
  });
  await prisma.carePlanTemplateTask.create({
    data: {
      templateId: template.id,
      stepId: s2.id,
      title: "Daily stimulation injection",
      taskType: "MEDICATION_TASK",
      ownerRole: "PATIENT",
      priority: "HIGH",
      dueTimingDays: 1,
    },
  });

  const ctx: TenantContext = {
    organizationId: org.id,
    organizationName: org.name,
    clinicId: clinic.id,
    clinicName: clinic.name,
    userId: doctor.id,
    role: "DOCTOR",
  };

  const token = await encodeSessionToken(
    {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      organizationId: org.id,
      organizationName: org.name,
      clinicId: clinic.id,
      clinicName: clinic.name,
      role: "DOCTOR",
    },
    "authjs.session-token",
  );

  fx = {
    ctx,
    token,
    clinicId: clinic.id,
    doctorUser: { id: doctor.id, name: doctor.name },
    coordinatorUser: { id: coordinator.id, name: coordinator.name },
    coupleId: couple.id,
    templateId: template.id,
  };
});

after(async () => {
  await cleanup();
});

test("Care Loop: Assigns treatment plan and creates snapshot without executing raw template", async () => {
  const result = await activatePatientTreatmentPlan(fx.ctx, {
    coupleId: fx.coupleId,
    templateId: fx.templateId,
    doctorId: fx.doctorUser.id,
    coordinatorId: fx.coordinatorUser.id,
    customValues: { protocolNotes: "Antagonist protocol 225 IU" },
  });

  assert.ok(result.plan.id);
  assert.equal(result.plan.status, "ACTIVE");
  assert.equal(result.plan.approvalStatus, "APPROVED");
  assert.equal(result.plan.templateVersion, 1);
  assert.equal(result.plan.currentStageIndex, 0);
  assert.equal(result.plan.currentStageName, "Fertility Consultation");

  // Verify honest integration reporting (no fake sent message)
  assert.equal(result.whatsappIntegration.configured, false);
  assert.match(result.whatsappIntegration.reason ?? "", /not configured/);

  // Verify steps and tasks generated
  const steps = await prisma.carePlanStep.findMany({
    where: { carePlanId: result.plan.id },
    orderBy: { sortOrder: "asc" },
  });
  assert.equal(steps.length, 3);
  assert.equal(steps[0]?.status, "CURRENT");
  assert.equal(steps[1]?.status, "PENDING");

  // Verify Stage 0 tasks are WAITING while Stage 1 tasks are UPCOMING
  const tasks = await prisma.careTask.findMany({
    where: { carePlanId: result.plan.id },
  });
  const stage0Tasks = tasks.filter((t) => t.carePlanStepId === steps[0]?.id);
  const stage1Tasks = tasks.filter((t) => t.carePlanStepId === steps[1]?.id);

  assert.ok(stage0Tasks.length >= 2);
  assert.ok(stage0Tasks.every((t) => t.status === "WAITING"));
  assert.ok(stage1Tasks.every((t) => t.status === "UPCOMING"));

  // Verify variable replacement
  const docTask = stage0Tasks.find((t) => t.title.includes("Priya Sharma"));
  assert.ok(docTask, "Template variable {{patient_name}} should be resolved to Priya Sharma");
});

test("Care Loop: Stage completion and event-driven progression", async () => {
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
    include: { steps: { orderBy: { sortOrder: "asc" } }, tasks: true },
  });

  const stage0 = plan.steps[0]!;
  const stage0Tasks = plan.tasks.filter((t) => t.carePlanStepId === stage0.id);

  // Complete first task
  await completeCareTask(fx.ctx, stage0Tasks[0]!.id, { source: "DOCTOR", notes: "Consultation done" });
  const progress = await evaluateStageProgress(fx.ctx, plan.id);
  assert.equal(progress.advanced, false, "Should not advance with pending tasks");

  // Complete second task
  await completeCareTask(fx.ctx, stage0Tasks[1]!.id, { source: "PATIENT", notes: "Intake done" });

  // Now stage progress should advance automatically to Stage 1!
  const updatedPlan = await prisma.carePlan.findUniqueOrThrow({ where: { id: plan.id } });
  assert.equal(updatedPlan.currentStageIndex, 1);
  assert.equal(updatedPlan.currentStageName, "Investigation / Workup");

  // Verify Stage 1 tasks transitioned from UPCOMING to WAITING with calculated due dates
  const stage1Tasks = await prisma.careTask.findMany({
    where: { carePlanId: plan.id, carePlanStepId: plan.steps[1]!.id },
  });
  assert.ok(stage1Tasks.every((t) => t.status === "WAITING"));
  assert.ok(stage1Tasks.every((t) => t.dueDate !== null));
});

test("Care Loop: Reactive WhatsApp reply simulation — Positive completion ('Done')", async () => {
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex)!;
  const currentTask = await prisma.careTask.findFirstOrThrow({
    where: { carePlanStepId: currentStep.id, status: "WAITING" },
  });

  const response = await handlePatientResponse(fx.ctx, currentTask.id, "Done!");
  assert.equal(response.status, "COMPLETED");
  assert.equal(response.action, "TASK_COMPLETED");
  assert.match(response.aiReply, /Thank you for confirming/);

  const updatedTask = await prisma.careTask.findUniqueOrThrow({ where: { id: currentTask.id } });
  assert.equal(updatedTask.status, "COMPLETED");
  assert.ok(updatedTask.completedAt);
});

test("Care Loop: Reactive WhatsApp reply simulation — AI Medical Guardrail on 'I missed it'", async () => {
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  // Create an active medication task in the current stage
  const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex)!;
  const medTask = await prisma.careTask.create({
    data: {
      clinicId: fx.clinicId,
      coupleId: fx.coupleId,
      carePlanId: plan.id,
      carePlanStepId: currentStep.id,
      title: "Gonal-F 225 IU evening injection",
      taskType: "MEDICATION_TASK",
      ownerRole: "PATIENT",
      status: "WAITING",
      priority: "HIGH",
    },
  });

  const replyText = "I missed my injection. What should I do?";
  const response = await handlePatientResponse(fx.ctx, medTask.id, replyText);

  // STRICT GUARDRAIL ASSERTIONS:
  // 1. Never provides unauthorized autonomous clinical prescription or dosage change
  assert.match(response.aiReply, /I don't want to give you the wrong medical information/);
  assert.match(response.aiReply, /recorded this for your care team/);

  // 2. Task status set to BLOCKED / NEEDS_HELP
  assert.equal(response.status, "BLOCKED");

  // 3. Exception recorded in Escalation table for staff/clinician
  assert.ok(response.escalationId);
  const escalation = await prisma.escalation.findUniqueOrThrow({
    where: { id: response.escalationId },
  });
  assert.equal(escalation.status, "OPEN");
  assert.equal(escalation.type, "CLINICAL");
  assert.match(escalation.reason, /Patient reported clinical concern/);
  assert.equal(escalation.assignedToId, fx.doctorUser.id);
});

test("Care Loop: Doctor ad-hoc task addition, reschedule, and skip audit trail", async () => {
  const added = await addDoctorTask(fx.ctx, {
    coupleId: fx.coupleId,
    title: "Additional Estradiol blood check",
    priority: "HIGH",
    dueDate: "2026-09-10",
    dueTime: "09:00",
    description: "Doctor requested extra mid-cycle E2 level",
  });

  assert.equal(added.source, "DOCTOR_MANUAL");
  assert.equal(added.status, "WAITING");

  // Reschedule
  const rescheduled = await modifyDoctorTask(fx.ctx, added.id, {
    dueDate: "2026-09-11",
    rescheduleReason: "Patient travelling tomorrow",
  });
  assert.ok(rescheduled.rescheduledAt);
  assert.equal(rescheduled.rescheduledReason, "Patient travelling tomorrow");

  // Skip
  const skipped = await modifyDoctorTask(fx.ctx, added.id, {
    status: "SKIPPED",
    skipReason: "Ultrasound was sufficient, E2 check not needed",
  });
  assert.equal(skipped.status, "SKIPPED");
  assert.ok(skipped.skippedAt);
  assert.equal(skipped.skippedReason, "Ultrasound was sufficient, E2 check not needed");
});

test("Care Loop: Pause and resume patient care plan", async () => {
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
  });

  const paused = await pauseCarePlan(fx.ctx, plan.id, "Patient requested cycle pause due to travel");
  assert.equal(paused.approvalStatus, "PAUSED");
  assert.equal(paused.pauseReason, "Patient requested cycle pause due to travel");
  assert.ok(paused.pausedAt);

  const resumed = await resumeCarePlan(fx.ctx, plan.id);
  assert.equal(resumed.approvalStatus, "APPROVED");
  assert.equal(resumed.pauseReason, null);
  assert.ok(resumed.resumedAt);
});

test("Care Loop: Branch decision registers clinical pathway", async () => {
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
  });

  const branchResult = await handleBranchDecision(
    fx.ctx,
    plan.id,
    "FREEZE_ALL_FET",
    "High E2 and risk of mild OHSS: vitrify all blastocysts, plan FET next cycle",
  );

  assert.equal(branchResult.plan.selectedBranch, "FREEZE_ALL_FET");
  assert.match(branchResult.plan.outcomeNotes ?? "", /FREEZE_ALL_FET/);
});

test("Care Loop: Template isolation — Editing clinic template does not alter existing patient snapshot", async () => {
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
  });

  const initialSnapshot = plan.snapshotData as { version: number; templateName: string };
  assert.equal(initialSnapshot.version, 1);

  // Clinic modifies template to version 2
  await prisma.carePlanTemplate.update({
    where: { id: fx.templateId },
    data: { name: "IVF — Standard Journey V2 Modified", version: 2 },
  });

  // Verify patient plan still preserves its original version 1 snapshot
  const preservedPlan = await prisma.carePlan.findUniqueOrThrow({ where: { id: plan.id } });
  assert.equal(preservedPlan.templateVersion, 1);
  assert.equal(preservedPlan.name, "IVF — Standard Journey");
  const preservedSnapshot = preservedPlan.snapshotData as { version: number; templateName: string };
  assert.equal(preservedSnapshot.version, 1);
});

test("Care Loop: Complete Journey Execution Graph query", async () => {
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
  });

  const graph = await getJourneyExecution(fx.ctx, plan.id);
  assert.equal(graph.plan.id, plan.id);
  assert.ok(graph.stages.length >= 3);
  assert.equal(graph.couple.primaryName, "Priya Sharma");
  assert.equal(graph.whatsapp.configured, false);
  assert.ok(graph.allTasksSummary.total > 0);
});

test("Care Loop REST API: End-to-end endpoints through HTTP", async () => {
  const cookieHeader = { Cookie: `authjs.session-token=${fx.token}` };

  // 1. List templates
  const resTemplates = await app.request("/api/v1/treatment-plan-templates", {
    headers: cookieHeader,
  });
  assert.equal(resTemplates.status, 200);
  const tplData = (await resTemplates.json()) as { data: Array<{ id: string; name: string }> };
  assert.ok(Array.isArray(tplData.data));
  assert.ok(tplData.data.some((t) => t.name.includes("IVF")));

  // 2. Journey graph endpoint
  const plan = await prisma.carePlan.findFirstOrThrow({
    where: { coupleId: fx.coupleId, clinicId: fx.clinicId },
  });
  const resJourney = await app.request(`/api/v1/care-plans/${plan.id}/journey`, {
    headers: cookieHeader,
  });
  assert.equal(resJourney.status, 200);
  const journeyBody = (await resJourney.json()) as { data: { plan: { id: string }; stages: unknown[] } };
  assert.equal(journeyBody.data.plan.id, plan.id);
  assert.ok(journeyBody.data.stages.length >= 3);

  // 3. Exceptions endpoint
  const resExceptions = await app.request("/api/v1/care-loop/exceptions", {
    headers: cookieHeader,
  });
  assert.equal(resExceptions.status, 200);
  const excBody = (await resExceptions.json()) as { data: Array<{ id: string; type: string }> };
  assert.ok(Array.isArray(excBody.data));

  // 4. Analytics endpoint
  const resAnalytics = await app.request("/api/v1/care-loop/analytics", {
    headers: cookieHeader,
  });
  assert.equal(resAnalytics.status, 200);
  const anaBody = (await resAnalytics.json()) as { data: { activeJourneys: number; totalTasks: number } };
  assert.ok(anaBody.data.activeJourneys >= 1);
});
