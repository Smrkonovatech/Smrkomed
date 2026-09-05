import {
  prisma,
  type CareTaskPriority,
  type CareTaskStatus,
  type TenantContext,
} from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { HttpError, notFound } from "../../lib/errors";
import { requireClinicOwned } from "../../lib/resources";
import { dispatchCareLoopTrigger } from "../whatsapp-automation/inbound-dispatch";

export type AssignTreatmentPlanInput = {
  coupleId: string;
  templateId: string;
  doctorId?: string | undefined;
  coordinatorId?: string | undefined;
  startDate?: string | Date | undefined;
  customValues?: {
    protocolNotes?: string | undefined;
    prescriptionNotes?: string | undefined;
    baselineDate?: string | undefined;
  } | undefined;
};

export type AddDoctorTaskInput = {
  coupleId: string;
  carePlanId?: string | undefined;
  stageStepId?: string | undefined;
  title: string;
  description?: string | undefined;
  taskType?: string | undefined;
  ownerRole?: string | undefined;
  assignedUserId?: string | undefined;
  priority?: CareTaskPriority | undefined;
  dueDate?: string | undefined;
  dueTime?: string | undefined;
  communicationConfig?: {
    whatsappEnabled?: boolean | undefined;
    templateName?: string | undefined;
  } | undefined;
  reminderConfig?: {
    remindAtHours?: number | undefined;
  } | undefined;
  escalationConfig?: {
    escalateAfterHours?: number | undefined;
    escalateTo?: string | undefined;
  } | undefined;
};

export type ModifyDoctorTaskInput = {
  title?: string | undefined;
  description?: string | undefined;
  priority?: CareTaskPriority | undefined;
  dueDate?: string | undefined;
  dueTime?: string | undefined;
  rescheduleReason?: string | undefined;
  skipReason?: string | undefined;
  status?: CareTaskStatus | undefined;
  assignedUserId?: string | undefined;
};

/**
 * Checks whether WhatsApp is configured for this clinic.
 * Returns an honest status — never falsifies delivery.
 */
export async function checkClinicWhatsAppIntegration(clinicId: string): Promise<{
  configured: boolean;
  phoneNumber?: string | undefined;
  reason?: string | undefined;
}> {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { clinicId, isActive: true },
  });
  if (account) {
    return { configured: true, phoneNumber: account.displayPhoneNumber ?? account.phoneNumberId };
  }

  const integration = await prisma.integration.findFirst({
    where: { clinicId, provider: "WHATSAPP_CLOUD", status: "ACTIVE" },
  });
  if (integration) {
    return { configured: true, phoneNumber: integration.displayName ?? undefined };
  }

  return {
    configured: false,
    reason: "WhatsApp integration is not configured for this clinic.",
  };
}

/**
 * Activates a Treatment Plan for a couple based on an approved template.
 * Snapshots the template so subsequent template edits will not alter active patient journeys.
 */
export async function activatePatientTreatmentPlan(
  tenant: TenantContext,
  input: AssignTreatmentPlanInput,
) {
  const couple = await requireClinicOwned(
    tenant,
    await prisma.couple.findUnique({
      where: { id: input.coupleId },
      include: { primaryPatient: true, partnerPatient: true },
    }),
  );

  const template = await prisma.carePlanTemplate.findFirst({
    where: {
      id: input.templateId,
      OR: [{ clinicId: tenant.clinicId }, { isSystem: true }],
      isActive: true,
    },
    include: {
      steps: {
        orderBy: { sortOrder: "asc" },
        include: { tasks: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!template) {
    throw new HttpError(404, "TEMPLATE_NOT_FOUND", "Treatment plan template not found or inactive.");
  }

  // Doctor validation
  let doctorId = input.doctorId;
  if (!doctorId && tenant.role === "DOCTOR") {
    doctorId = tenant.userId;
  }
  if (doctorId) {
    const docMember = await prisma.clinicMembership.findFirst({
      where: { clinicId: tenant.clinicId, userId: doctorId, status: "ACTIVE" },
    });
    if (!docMember) doctorId = undefined;
  }

  // Coordinator validation
  let coordinatorId = input.coordinatorId;
  if (coordinatorId) {
    const coordMember = await prisma.clinicMembership.findFirst({
      where: { clinicId: tenant.clinicId, userId: coordinatorId, status: "ACTIVE" },
    });
    if (!coordMember) coordinatorId = undefined;
  }

  const startDate = input.startDate ? new Date(input.startDate) : new Date();

  // Snapshot template version data so future edits to clinic templates never alter this journey
  const snapshotData = {
    templateId: template.id,
    templateName: template.name,
    version: template.version,
    specialty: template.specialty,
    type: template.type,
    config: template.config,
    customValues: input.customValues ?? {},
    stages: template.steps.map((s) => ({
      sortOrder: s.sortOrder,
      name: s.name,
      description: s.description,
      stageType: s.stageType,
      completionStrategy: s.completionStrategy,
      tasks: s.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        taskType: t.taskType,
        ownerRole: t.ownerRole,
        priority: t.priority,
        triggerEvent: t.triggerEvent,
        dueTimingDays: t.dueTimingDays,
        dueTimingHours: t.dueTimingHours,
        communicationConfig: t.communicationConfig,
        reminderConfig: t.reminderConfig,
        escalationConfig: t.escalationConfig,
        completionCondition: t.completionCondition,
        requiredAction: t.requiredAction,
      })),
    })),
  };

  const patientName = `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim();

  const plan = await prisma.$transaction(async (tx) => {
    // 1. Create PatientTreatmentPlan (CarePlan)
    const newPlan = await tx.carePlan.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        templateId: template.id,
        templateVersion: template.version,
        snapshotData: snapshotData as object,
        type: template.type,
        name: template.name,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        approvedById: tenant.userId,
        approvedAt: new Date(),
        startDate,
        currentStep: 0,
        currentStageIndex: 0,
        currentStageName: template.steps[0]?.name ?? "Consultation",
        assignedDoctorId: doctorId ?? null,
        assignedCoordinatorId: coordinatorId ?? null,
        createdById: tenant.userId,
      },
    });

    // 2. Create Treatment record if not present
    await tx.treatment.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        carePlanId: newPlan.id,
        kind: template.type === "IVF" ? "IVF" : "EVALUATION",
        label: `${template.name} - ${couple.primaryPatient.firstName}`,
        status: "ACTIVE",
        stageIndex: 0,
        stageName: template.steps[0]?.name ?? "Consultation",
        startedAt: startDate,
      },
    });

    // 3. Create stages (CarePlanStep) for all template stages
    const createdSteps: Array<{ id: string; sortOrder: number; name: string }> = [];
    for (const st of template.steps) {
      const step = await tx.carePlanStep.create({
        data: {
          carePlanId: newPlan.id,
          sortOrder: st.sortOrder,
          name: st.name,
          detail: st.description,
          stageType: st.stageType,
          completionStrategy: st.completionStrategy,
          stageConfig: (st.config ?? {}) as object,
          status: st.sortOrder === 0 ? "CURRENT" : "PENDING",
        },
      });
      createdSteps.push(step);
    }

    // 4. Generate tasks for Stage 0 (active/waiting) and future stages (upcoming/not_started)
    for (const tplStep of template.steps) {
      const matchingStep = createdSteps.find((s) => s.sortOrder === tplStep.sortOrder);
      const isFirstStage = tplStep.sortOrder === 0;

      for (const tplTask of tplStep.tasks) {
        // Event-relative due date calculation
        const due = new Date(startDate.getTime() + tplTask.dueTimingDays * 86_400_000);

        // Replace template variables
        const title = tplTask.title
          .replaceAll("{{patient_name}}", patientName)
          .replaceAll("{{clinic_name}}", tenant.clinicName ?? "SmrkoMed Clinic");

        const description = (tplTask.description ?? "")
          .replaceAll("{{patient_name}}", patientName)
          .replaceAll("{{clinic_name}}", tenant.clinicName ?? "SmrkoMed Clinic");

        const initialStatus: CareTaskStatus = isFirstStage ? "WAITING" : "UPCOMING";

        const careTask = await tx.careTask.create({
          data: {
            clinicId: tenant.clinicId,
            coupleId: couple.id,
            carePlanId: newPlan.id,
            carePlanStepId: matchingStep?.id ?? null,
            title,
            description: description || null,
            category: tplTask.taskType.replace("_TASK", ""),
            taskType: tplTask.taskType,
            ownerRole: tplTask.ownerRole,
            source: "TEMPLATE",
            status: initialStatus,
            priority: tplTask.priority,
            dueDate: isFirstStage ? due : null,
            dueTime: tplTask.dueTimingHours ? `${String(tplTask.dueTimingHours).padStart(2, "0")}:00` : "10:00",
            triggerEvent: tplTask.triggerEvent,
            communicationConfig: (tplTask.communicationConfig ?? {}) as object,
            reminderConfig: (tplTask.reminderConfig ?? {}) as object,
            escalationConfig: (tplTask.escalationConfig ?? {}) as object,
            completionCondition: (tplTask.completionCondition ?? {}) as object,
            createdById: tenant.userId,
            automationEnabled: true,
            aiFollowUpEnabled: true,
            escalationEnabled: true,
          },
        });

        // Assign to role user
        let assigneeId: string | undefined = undefined;
        if (tplTask.ownerRole === "DOCTOR" && doctorId) assigneeId = doctorId;
        else if (tplTask.ownerRole === "CARE_COORDINATOR" && coordinatorId) assigneeId = coordinatorId;

        if (assigneeId) {
          await tx.taskAssignment.create({
            data: { careTaskId: careTask.id, userId: assigneeId },
          });
        }
      }
    }

    return newPlan;
  });

  // Audit plan activation
  await audit(tenant, "treatment_plan.activate", "CarePlan", plan.id, {
    coupleId: couple.id,
    templateName: template.name,
    version: template.version,
    doctorId: doctorId ?? null,
    coordinatorId: coordinatorId ?? null,
  });

  // Check honest WhatsApp status and attempt dispatch if configured
  const waStatus = await checkClinicWhatsAppIntegration(tenant.clinicId);

  return {
    plan,
    whatsappIntegration: waStatus,
  };
}

/**
 * Evaluates current stage completion criteria and advances the journey when satisfied.
 */
export async function evaluateStageProgress(tenant: TenantContext, carePlanId: string) {
  const plan = await prisma.carePlan.findUnique({
    where: { id: carePlanId },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      tasks: true,
      couple: { include: { primaryPatient: true } },
    },
  });

  if (!plan) throw notFound("CarePlan not found");
  await requireClinicOwned(tenant, plan);

  if (plan.status !== "ACTIVE") {
    return { advanced: false, reason: `Plan is not active (current status: ${plan.status})` };
  }

  const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex);
  if (!currentStep) return { advanced: false, reason: "Current step not found" };

  const currentTasks = plan.tasks.filter((t) => t.carePlanStepId === currentStep.id);

  // Evaluate completion strategy
  let isStageComplete = false;

  if (currentStep.completionStrategy === "DOCTOR_APPROVAL_REQUIRED") {
    // Stage requires a completed DOCTOR_TASK or explicit approval
    const docTask = currentTasks.find((t) => t.ownerRole === "DOCTOR" || t.taskType === "DOCTOR_TASK");
    isStageComplete = docTask ? docTask.status === "COMPLETED" : true;
  } else {
    // Default: ALL_REQUIRED_TASKS_COMPLETE
    const pendingTasks = currentTasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "SKIPPED" && t.status !== "CANCELLED",
    );
    isStageComplete = pendingTasks.length === 0;
  }

  if (!isStageComplete) {
    return {
      advanced: false,
      currentStage: currentStep.name,
      stageIndex: plan.currentStageIndex,
      remainingTasks: currentTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "SKIPPED").length,
    };
  }

  // Advance to next stage!
  const nextStageIndex = plan.currentStageIndex + 1;
  const nextStep = plan.steps.find((s) => s.sortOrder === nextStageIndex);

  await prisma.$transaction(async (tx) => {
    // 1. Mark current stage DONE
    await tx.carePlanStep.update({
      where: { id: currentStep.id },
      data: { status: "DONE", completedAt: new Date(), completedById: tenant.userId },
    });

    if (nextStep) {
      // 2. Mark next stage CURRENT
      await tx.carePlanStep.update({
        where: { id: nextStep.id },
        data: { status: "CURRENT" },
      });

      // 3. Update CarePlan currentStage
      await tx.carePlan.update({
        where: { id: plan.id },
        data: {
          currentStep: nextStageIndex,
          currentStageIndex: nextStageIndex,
          currentStageName: nextStep.name,
        },
      });

      // 4. Activate tasks for the newly entered stage
      const tasksToActivate = plan.tasks.filter((t) => t.carePlanStepId === nextStep.id);
      for (const t of tasksToActivate) {
        if (t.status === "UPCOMING" || t.status === "NOT_STARTED") {
          const due = new Date(Date.now() + 86_400_000); // Activate with fresh relative offset
          await tx.careTask.update({
            where: { id: t.id },
            data: { status: "WAITING", dueDate: due },
          });
        }
      }

      // 5. Update Treatment cycle stage
      await tx.treatment.updateMany({
        where: { carePlanId: plan.id },
        data: { stageIndex: nextStageIndex, stageName: nextStep.name },
      });
    } else {
      // Journey complete
      await tx.carePlan.update({
        where: { id: plan.id },
        data: { status: "COMPLETED" },
      });
      await tx.treatment.updateMany({
        where: { carePlanId: plan.id },
        data: { status: "COMPLETED" },
      });
    }
  });

  await audit(tenant, "care_loop.advance_stage", "CarePlan", plan.id, {
    fromStage: currentStep.name,
    toStage: nextStep?.name ?? "COMPLETED",
    nextStageIndex,
  });

  void dispatchCareLoopTrigger({
    tenant,
    triggerType: "CARE_LOOP_STAGE_CHANGED",
    triggerEventId: `care_loop_stage_${plan.id}_${plan.currentStageIndex}_to_${nextStageIndex}`,
    coupleId: plan.coupleId,
    patientId: plan.couple?.primaryPatientId ?? null,
    vars: {
      care_plan_id: plan.id,
      couple_id: plan.coupleId,
      from_stage: currentStep.name,
      to_stage: nextStep?.name ?? "COMPLETED",
      stage_index: String(nextStageIndex),
      journey_stage: nextStep?.name ?? "COMPLETED",
    },
  }).catch(() => undefined);

  return {
    advanced: true,
    completedStage: currentStep.name,
    nextStage: nextStep?.name ?? "COMPLETED",
    nextStageIndex,
  };
}

/**
 * Completes a task with evidence and automatically evaluates stage progression.
 */
export async function completeCareTask(
  tenant: TenantContext,
  taskId: string,
  evidence?: {
    replyText?: string | undefined;
    documentId?: string | undefined;
    notes?: string | undefined;
    source?: string | undefined;
  } | undefined,
) {
  const task = await requireClinicOwned(tenant, await prisma.careTask.findUnique({ where: { id: taskId } }));

  const completed = await prisma.careTask.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedBy: tenant.userId ?? "PATIENT",
      completionEvidence: (evidence ?? { source: "MANUAL" }) as object,
    },
  });

  // Resolve any open escalation linked to this task
  await prisma.escalation.updateMany({
    where: { careTaskId: taskId, status: "OPEN" },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await audit(tenant, "care_task.complete", "CareTask", task.id, {
    title: task.title,
    source: evidence?.source ?? "MANUAL",
  });

  void dispatchCareLoopTrigger({
    tenant,
    triggerType: "CARE_TASK_COMPLETED",
    triggerEventId: `care_task_completed_${task.id}`,
    coupleId: task.coupleId,
    vars: {
      care_task_id: task.id,
      care_task_title: task.title,
      care_task_status: "COMPLETED",
      care_plan_id: task.carePlanId ?? "",
      couple_id: task.coupleId ?? "",
    },
  }).catch(() => undefined);

  // Evaluate stage progress if this task belongs to an active Care Plan
  let stageAdvancement = null;
  if (task.carePlanId) {
    stageAdvancement = await evaluateStageProgress(tenant, task.carePlanId);
  }

  return { task: completed, stageAdvancement };
}

/**
 * Interprets a patient response (e.g. from WhatsApp or Simulation).
 * STRICT MEDICAL GUARDRAIL: Never provides medical advice or alters dosages independently.
 */
export async function handlePatientResponse(
  tenant: TenantContext,
  taskId: string,
  text: string,
) {
  const task = await requireClinicOwned(
    tenant,
    await prisma.careTask.findUnique({
      where: { id: taskId },
      include: {
        couple: { include: { primaryPatient: true, assignedDoctor: true, assignedCoordinator: true } },
        carePlan: true,
      },
    }),
  );

  const cleanText = text.trim().toLowerCase();
  const isPositive =
    cleanText === "done" ||
    cleanText === "yes" ||
    cleanText === "completed" ||
    cleanText === "taken" ||
    cleanText.includes("done") ||
    cleanText.includes("i have taken");

  const isMissedOrHelp =
    cleanText.includes("missed") ||
    cleanText.includes("forgot") ||
    cleanText.includes("help") ||
    cleanText.includes("delay") ||
    cleanText.includes("skip") ||
    cleanText.includes("pain") ||
    cleanText.includes("bleeding") ||
    cleanText.includes("problem");

  if (isPositive) {
    const outcome = await completeCareTask(tenant, taskId, {
      replyText: text,
      source: "WHATSAPP_RESPONSE",
      notes: "Patient confirmed via WhatsApp message",
    });
    return {
      status: "COMPLETED",
      action: "TASK_COMPLETED",
      aiReply: "Thank you for confirming. Your care team has been updated.",
      task: outcome.task,
      stageAdvancement: outcome.stageAdvancement,
    };
  }

  if (isMissedOrHelp) {
    // 1. Mark task as BLOCKED / NEEDS_HELP
    await prisma.careTask.update({
      where: { id: taskId },
      data: {
        status: "BLOCKED",
        metadata: {
          patientReportedIssue: text,
          reportedAt: new Date().toISOString(),
        },
      },
    });

    const isClinicalConcern =
      cleanText.includes("pain") ||
      cleanText.includes("bleeding") ||
      cleanText.includes("missed") ||
      cleanText.includes("vomit") ||
      cleanText.includes("severe") ||
      cleanText.includes("injection");

    const reason = isClinicalConcern
      ? `Patient reported clinical concern: "${text}"`
      : `Patient reported issue with task: "${text}"`;

    const escalationType = isClinicalConcern ? "CLINICAL" : "TASK_OVERDUE";
    const assigneeId = isClinicalConcern
      ? task.carePlan?.assignedDoctorId ?? task.couple?.assignedDoctorId
      : task.carePlan?.assignedCoordinatorId ?? task.couple?.assignedCoordinatorId;

    // 2. Create Exception/Escalation for Care Team
    const escalation = await prisma.escalation.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: task.coupleId,
        patientId: task.couple?.primaryPatient?.id ?? null,
        careTaskId: task.id,
        type: escalationType,
        severity: isClinicalConcern ? "HIGH" : "MEDIUM",
        reason,
        assignedToId: assigneeId ?? null,
        status: "OPEN",
      },
    });

    // 3. Strict AI Guardrail: empathetic disclaimer refusing clinical advice
    const guardrailedAiReply =
      "I understand. I don't want to give you the wrong medical information. I have recorded this for your care team so they can guide you promptly.";

    await audit(tenant, "care_loop.patient_exception", "CareTask", task.id, {
      text,
      escalationId: escalation.id,
      isClinicalConcern,
    });

    return {
      status: "BLOCKED",
      action: "EXCEPTION_CREATED",
      aiReply: guardrailedAiReply,
      escalationId: escalation.id,
      assignedRole: isClinicalConcern ? "DOCTOR" : "COORDINATOR",
    };
  }

  // Unrecognized text - keep waiting and log interaction
  return {
    status: task.status,
    action: "RECORDED",
    aiReply: "Thank you for your message. Your care coordinator will follow up if needed.",
  };
}

/**
 * Handles doctor branching decisions (e.g. Fresh Transfer vs Freeze-All / FET).
 */
export async function handleBranchDecision(
  tenant: TenantContext,
  carePlanId: string,
  branch: "FRESH_TRANSFER" | "FREEZE_ALL_FET" | "PREGNANCY_CONFIRMED" | "UNSUCCESSFUL_CYCLE",
  notes?: string,
) {
  const plan = await requireClinicOwned(tenant, await prisma.carePlan.findUnique({ where: { id: carePlanId } }));

  const updated = await prisma.carePlan.update({
    where: { id: carePlanId },
    data: {
      selectedBranch: branch,
      ...(notes ? { outcomeNotes: `${plan.outcomeNotes ?? ""}\n[Branch ${branch}]: ${notes}`.trim() } : {}),
    },
  });

  await audit(tenant, "care_loop.branch_decision", "CarePlan", plan.id, {
    branch,
    notes: notes ?? null,
  });

  // Evaluate stage progress now that branch decision is registered
  const stageOutcome = await evaluateStageProgress(tenant, carePlanId);

  return { plan: updated, stageOutcome };
}

/**
 * Pauses an active Care Plan and its automation pings.
 */
export async function pauseCarePlan(tenant: TenantContext, carePlanId: string, reason: string) {
  const plan = await requireClinicOwned(tenant, await prisma.carePlan.findUnique({ where: { id: carePlanId } }));

  const updated = await prisma.carePlan.update({
    where: { id: carePlanId },
    data: {
      status: "ACTIVE", // Keep ACTIVE in enum or ON_HOLD
      approvalStatus: "PAUSED",
      pausedAt: new Date(),
      pauseReason: reason,
    },
  });

  await audit(tenant, "care_plan.pause", "CarePlan", plan.id, { reason });
  return updated;
}

/**
 * Resumes a paused Care Plan.
 */
export async function resumeCarePlan(tenant: TenantContext, carePlanId: string) {
  const plan = await requireClinicOwned(tenant, await prisma.carePlan.findUnique({ where: { id: carePlanId } }));

  const updated = await prisma.carePlan.update({
    where: { id: carePlanId },
    data: {
      approvalStatus: "APPROVED",
      resumedAt: new Date(),
      pauseReason: null,
    },
  });

  await audit(tenant, "care_plan.resume", "CarePlan", plan.id);
  return updated;
}

/**
 * Allows doctor to add a patient-specific ad-hoc task into the Care Loop.
 */
export async function addDoctorTask(tenant: TenantContext, input: AddDoctorTaskInput) {
  const couple = await requireClinicOwned(
    tenant,
    await prisma.couple.findUnique({ where: { id: input.coupleId } }),
  );

  let planId = input.carePlanId;
  let stepId = input.stageStepId;

  if (!planId) {
    const activePlan = await prisma.carePlan.findFirst({
      where: { coupleId: couple.id, clinicId: tenant.clinicId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    planId = activePlan?.id;
  }

  if (planId && !stepId) {
    const plan = await prisma.carePlan.findUnique({
      where: { id: planId },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    const currentStep = plan?.steps.find((s) => s.sortOrder === plan.currentStageIndex);
    stepId = currentStep?.id;
  }

  const dueDate = input.dueDate
    ? new Date(input.dueDate.includes("T") ? input.dueDate : `${input.dueDate}T00:00:00`)
    : new Date();

  const task = await prisma.careTask.create({
    data: {
      clinicId: tenant.clinicId,
      coupleId: couple.id,
      carePlanId: planId ?? null,
      carePlanStepId: stepId ?? null,
      title: input.title,
      description: input.description ?? null,
      taskType: input.taskType ?? "PATIENT_TASK",
      ownerRole: input.ownerRole ?? "PATIENT",
      source: "DOCTOR_MANUAL",
      priority: input.priority ?? "NORMAL",
      status: "WAITING",
      dueDate,
      dueTime: input.dueTime ?? "10:00",
      communicationConfig: (input.communicationConfig ?? { whatsappEnabled: true }) as object,
      reminderConfig: (input.reminderConfig ?? {}) as object,
      escalationConfig: (input.escalationConfig ?? {}) as object,
      createdById: tenant.userId,
      automationEnabled: true,
      aiFollowUpEnabled: true,
      escalationEnabled: true,
      ...(input.assignedUserId
        ? { assignments: { create: { userId: input.assignedUserId } } }
        : {}),
    },
    include: {
      assignments: { include: { user: { select: { name: true } } } },
      carePlanStep: true,
    },
  });

  await audit(tenant, "doctor.add_task", "CareTask", task.id, {
    coupleId: couple.id,
    title: task.title,
    dueDate: dueDate.toISOString(),
  });

  const patientId = couple.primaryPatientId;
  void dispatchCareLoopTrigger({
    tenant,
    triggerType: "CARE_TASK_CREATED",
    triggerEventId: `care_task_created_${task.id}`,
    coupleId: couple.id,
    patientId,
    vars: {
      care_task_id: task.id,
      care_task_title: task.title,
      care_task_status: task.status,
      care_plan_id: task.carePlanId ?? "",
      couple_id: couple.id,
    },
  }).catch(() => undefined);

  if (input.assignedUserId) {
    void dispatchCareLoopTrigger({
      tenant,
      triggerType: "CARE_TASK_ASSIGNED",
      triggerEventId: `care_task_assigned_${task.id}_${input.assignedUserId}`,
      coupleId: couple.id,
      patientId,
      vars: {
        care_task_id: task.id,
        care_task_title: task.title,
        assignee_id: input.assignedUserId,
        couple_id: couple.id,
      },
    }).catch(() => undefined);
  }

  return task;
}

/**
 * Modifies, reschedules, or skips an existing clinical task with audit trail.
 */
export async function modifyDoctorTask(
  tenant: TenantContext,
  taskId: string,
  patch: ModifyDoctorTaskInput,
) {
  const task = await requireClinicOwned(tenant, await prisma.careTask.findUnique({ where: { id: taskId } }));

  const dataToUpdate: Record<string, unknown> = {};

  if (patch.title !== undefined) dataToUpdate["title"] = patch.title;
  if (patch.description !== undefined) dataToUpdate["description"] = patch.description;
  if (patch.priority !== undefined) dataToUpdate["priority"] = patch.priority;

  if (patch.dueDate !== undefined) {
    const newDueDate = patch.dueDate
      ? new Date(patch.dueDate.includes("T") ? patch.dueDate : `${patch.dueDate}T00:00:00`)
      : null;
    dataToUpdate["dueDate"] = newDueDate;
    dataToUpdate["originalDueDate"] = task.originalDueDate ?? task.dueDate;
    dataToUpdate["rescheduledAt"] = new Date();
    dataToUpdate["rescheduledReason"] = patch.rescheduleReason ?? "Rescheduled by doctor";
  }

  if (patch.dueTime !== undefined) dataToUpdate["dueTime"] = patch.dueTime;

  if (patch.status === "SKIPPED") {
    dataToUpdate["status"] = "SKIPPED";
    dataToUpdate["skippedAt"] = new Date();
    dataToUpdate["skippedReason"] = patch.skipReason ?? "Skipped by clinician";
  } else if (patch.status !== undefined) {
    dataToUpdate["status"] = patch.status;
  }

  const updated = await prisma.careTask.update({
    where: { id: taskId },
    data: dataToUpdate,
  });

  if (patch.assignedUserId) {
    await prisma.taskAssignment.deleteMany({ where: { careTaskId: taskId } });
    await prisma.taskAssignment.create({
      data: { careTaskId: taskId, userId: patch.assignedUserId },
    });
  }

  await audit(tenant, "doctor.modify_task", "CareTask", taskId, {
    title: task.title,
    status: patch.status ?? task.status,
  });

  if (patch.assignedUserId) {
    void dispatchCareLoopTrigger({
      tenant,
      triggerType: "CARE_TASK_ASSIGNED",
      triggerEventId: `care_task_assigned_${taskId}_${patch.assignedUserId}_${Date.now()}`,
      coupleId: task.coupleId,
      vars: {
        care_task_id: taskId,
        care_task_title: task.title,
        assignee_id: patch.assignedUserId,
        couple_id: task.coupleId ?? "",
      },
    }).catch(() => undefined);
  }

  // Evaluate stage progression if skipped or status changed
  if (patch.status === "SKIPPED" && task.carePlanId) {
    await evaluateStageProgress(tenant, task.carePlanId);
  }

  return updated;
}

/**
 * Returns full journey execution model for a patient.
 */
export async function getJourneyExecution(tenant: TenantContext, carePlanId: string) {
  const plan = await prisma.carePlan.findUnique({
    where: { id: carePlanId },
    include: {
      steps: {
        orderBy: { sortOrder: "asc" },
        include: {
          tasks: {
            orderBy: { createdAt: "asc" },
            include: { assignments: { include: { user: { select: { name: true } } } } },
          },
        },
      },
      couple: {
        include: {
          primaryPatient: true,
          partnerPatient: true,
          assignedDoctor: { select: { id: true, name: true, initials: true } },
          assignedCoordinator: { select: { id: true, name: true, initials: true } },
        },
      },
      approvedBy: { select: { id: true, name: true } },
      assignedDoctor: { select: { id: true, name: true } },
      assignedCoordinator: { select: { id: true, name: true } },
    },
  });

  if (!plan) throw notFound("CarePlan not found");
  await requireClinicOwned(tenant, plan);

  const exceptions = await prisma.escalation.findMany({
    where: { clinicId: tenant.clinicId, coupleId: plan.coupleId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  const recentAudits = await prisma.auditLog.findMany({
    where: { clinicId: tenant.clinicId, entityId: plan.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const waStatus = await checkClinicWhatsAppIntegration(tenant.clinicId);

  const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex) ?? plan.steps[0];
  const allTasks = plan.steps.flatMap((s) => s.tasks);
  const currentTasks = currentStep ? currentStep.tasks : [];

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      status: plan.status,
      approvalStatus: plan.approvalStatus,
      pausedAt: plan.pausedAt,
      pauseReason: plan.pauseReason,
      selectedBranch: plan.selectedBranch,
      templateVersion: plan.templateVersion,
      startDate: plan.startDate,
      currentStageIndex: plan.currentStageIndex,
      currentStageName: plan.currentStageName,
      doctor: plan.assignedDoctor?.name ?? plan.couple.assignedDoctor?.name ?? "Unassigned",
      coordinator: plan.assignedCoordinator?.name ?? plan.couple.assignedCoordinator?.name ?? "Unassigned",
      approvedBy: plan.approvedBy?.name ?? "Dr. Clinical Lead",
    },
    couple: {
      id: plan.couple.id,
      slug: plan.couple.slug,
      primaryName: `${plan.couple.primaryPatient.firstName} ${plan.couple.primaryPatient.lastName}`.trim(),
      partnerName: plan.couple.partnerPatient
        ? `${plan.couple.partnerPatient.firstName} ${plan.couple.partnerPatient.lastName}`.trim()
        : null,
      phone: plan.couple.primaryPatient.phone,
    },
    stages: plan.steps.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      name: s.name,
      status: s.status,
      stageType: s.stageType,
      completionStrategy: s.completionStrategy,
      totalTasks: s.tasks.length,
      completedTasks: s.tasks.filter((t) => t.status === "COMPLETED" || t.status === "SKIPPED").length,
    })),
    currentStage: {
      id: currentStep?.id,
      index: plan.currentStageIndex,
      name: currentStep?.name,
      status: currentStep?.status,
      tasks: currentTasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        taskType: t.taskType,
        ownerRole: t.ownerRole,
        due: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "Unscheduled",
        dueTime: t.dueTime,
        assignedTo: t.assignments[0]?.user?.name ?? t.ownerRole,
        completionEvidence: t.completionEvidence,
        isEscalated: t.status === "ESCALATED" || t.status === "BLOCKED",
      })),
    },
    allTasksSummary: {
      total: allTasks.length,
      completed: allTasks.filter((t) => t.status === "COMPLETED").length,
      waiting: allTasks.filter((t) => t.status === "WAITING" || t.status === "IN_PROGRESS").length,
      blockedOrOverdue: allTasks.filter((t) => t.status === "BLOCKED" || t.status === "OVERDUE" || t.status === "ESCALATED").length,
    },
    exceptions: exceptions.map((e) => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      reason: e.reason,
      status: e.status,
      createdAt: e.createdAt,
    })),
    whatsapp: waStatus,
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      action: a.action,
      time: a.createdAt,
      metadata: a.metadata,
    })),
  };
}
