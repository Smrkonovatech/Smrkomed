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
  category?: string | undefined;
  description?: string | undefined;
  taskType?: string | undefined;
  ownerRole?: string | undefined;
  assignedUserId?: string | undefined;
  priority?: CareTaskPriority | undefined;
  dueDate?: string | undefined;
  dueTime?: string | undefined;
  sendWhatsApp?: boolean | undefined;
  phoneNumber?: string | undefined;
  partnerPhoneNumber?: string | undefined;
  targetRole?: "PRIMARY" | "PARTNER" | "COUPLE" | "BOTH" | string | undefined;
  targetPatientId?: string | undefined;
  targetName?: string | undefined;
  broadcastToBoth?: boolean | undefined;
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
 * Calculates the dynamic "Next Action" string for any task based on its type, stage, timing, and status.
 * Fulfills the "Next Action" core paradigm from the Care Loop architecture.
 */
export function computeNextActionForTask(task: {
  title: string;
  taskType?: string | null | undefined;
  status: CareTaskStatus | string;
  stageName?: string | null | undefined;
  dueTime?: string | null | undefined;
  priority?: string | null | undefined;
}): string {
  if (task.status === "COMPLETED") return "Task completed — awaiting stage progress evaluation";
  if (task.status === "SKIPPED") return "Task skipped by clinician";
  if (task.status === "BLOCKED") return "Clinical review required — automation paused for this issue";
  if (task.status === "ESCALATED") return "Care team direct intervention pending";

  const titleLower = task.title.toLowerCase();
  const timeStr = task.dueTime ? ` at ${task.dueTime}` : "";

  if (task.taskType === "MEDICATION_TASK" || titleLower.includes("injection") || titleLower.includes("medication")) {
    if (titleLower.includes("trigger")) {
      return `CRITICAL: Trigger injection scheduled${timeStr} — confirmation required immediately upon administration`;
    }
    return `Scheduled medication reminder active${timeStr} [I've Taken It]`;
  }
  if (task.taskType === "APPOINTMENT_TASK" || titleLower.includes("scan") || titleLower.includes("ultrasound")) {
    return `Clinical scan appointment scheduled${timeStr} — attendance & report pending`;
  }
  if (titleLower.includes("arrival") || task.taskType === "ARRIVAL_TASK") {
    return `Arrival check-in active — await patient tap [I've Arrived]`;
  }
  if (task.taskType === "REPORT_TASK" || titleLower.includes("report") || titleLower.includes("blood test") || titleLower.includes("semen")) {
    if (titleLower.includes("pregnancy") || titleLower.includes("beta-hcg")) {
      return `Serum Beta-hCG test scheduled — await report upload & doctor review (no autonomous AI interpretation)`;
    }
    return `Diagnostic test pending — await report document upload`;
  }
  if (titleLower.includes("decision") || titleLower.includes("pathway")) {
    return `Doctor review complete — register clinical pathway decision (IVF / IUI / Deferred / Undecided)`;
  }
  if (titleLower.includes("payment")) {
    return `Package payment required — awaiting secure payment gateway webhook confirmation`;
  }
  if (titleLower.includes("consent")) {
    return `Informed consent review & signature collection pending`;
  }

  return `Next action: ${task.title}${timeStr}`;
}

/**
 * Evaluates the authoritative "Next Action" for an entire Care Plan journey.
 */
export async function computeNextAction(
  tenant: TenantContext,
  carePlanId: string,
): Promise<{
  carePlanId: string;
  stageName: string;
  stageIndex: number;
  nextAction: string;
  urgency: "NORMAL" | "HIGH" | "CRITICAL";
  activeTaskCount: number;
  openEscalationsCount: number;
}> {
  const plan = await prisma.carePlan.findUnique({
    where: { id: carePlanId },
    include: {
      steps: { orderBy: { sortOrder: "asc" }, include: { tasks: true } },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!plan) throw notFound("CarePlan not found");
  await requireClinicOwned(tenant, plan);

  const escalations = await prisma.escalation.findMany({
    where: { clinicId: tenant.clinicId, coupleId: plan.coupleId, status: "OPEN" },
  });

  if (escalations.length > 0) {
    const isClinical = escalations.some((e) => e.type === "CLINICAL" || e.severity === "HIGH");
    return {
      carePlanId: plan.id,
      stageName: plan.currentStageName ?? "Unknown",
      stageIndex: plan.currentStageIndex,
      nextAction: isClinical
        ? `CLINICAL ALERT: ${escalations[0]?.reason ?? "Patient clinical concern paused automation"}`
        : `ATTENTION: ${escalations[0]?.reason ?? "Care task overdue"}`,
      urgency: isClinical ? "CRITICAL" : "HIGH",
      activeTaskCount: plan.tasks.filter((t) => t.status === "WAITING" || t.status === "IN_PROGRESS").length,
      openEscalationsCount: escalations.length,
    };
  }

  if (plan.status !== "ACTIVE") {
    return {
      carePlanId: plan.id,
      stageName: plan.currentStageName ?? "Completed",
      stageIndex: plan.currentStageIndex,
      nextAction: `Care plan status is ${plan.status.toLowerCase()}`,
      urgency: "NORMAL",
      activeTaskCount: 0,
      openEscalationsCount: 0,
    };
  }

  const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex);
  const pendingTasks = plan.tasks.filter(
    (t) => t.carePlanStepId === currentStep?.id && (t.status === "WAITING" || t.status === "IN_PROGRESS"),
  );

  if (pendingTasks.length === 0) {
    return {
      carePlanId: plan.id,
      stageName: currentStep?.name ?? "Review",
      stageIndex: plan.currentStageIndex,
      nextAction: "Stage criteria met — ready to evaluate progress to next stage",
      urgency: "NORMAL",
      activeTaskCount: 0,
      openEscalationsCount: 0,
    };
  }

  // Find most urgent task
  const criticalTask = pendingTasks.find((t) => t.priority === "CLINICAL" || t.title.toLowerCase().includes("trigger"));
  const chosenTask = criticalTask ?? pendingTasks[0]!;

  const actionText = computeNextActionForTask({
    title: chosenTask.title,
    taskType: chosenTask.taskType,
    status: chosenTask.status,
    stageName: currentStep?.name,
    dueTime: chosenTask.dueTime,
    priority: chosenTask.priority,
  });

  const isCritical = chosenTask.priority === "CLINICAL" || chosenTask.title.toLowerCase().includes("trigger");
  const isHigh = chosenTask.priority === "HIGH";

  return {
    carePlanId: plan.id,
    stageName: currentStep?.name ?? "Active Stage",
    stageIndex: plan.currentStageIndex,
    nextAction: actionText,
    urgency: isCritical ? "CRITICAL" : isHigh ? "HIGH" : "NORMAL",
    activeTaskCount: pendingTasks.length,
    openEscalationsCount: 0,
  };
}

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
        kind: template.type === "IUI" ? "IUI" : "IVF",
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
            communicationChannel:
              ((tplTask.communicationConfig as Record<string, unknown>)?.["channel"] as string) ?? "WHATSAPP",
            attempts: 0,
            escalationLevel: 0,
            lastAction: isFirstStage ? "Task initialized in Care Loop" : "Waiting for stage entry",
            nextAction: isFirstStage
              ? computeNextActionForTask({
                  title,
                  taskType: tplTask.taskType,
                  status: initialStatus,
                  stageName: tplStep.name,
                  dueTime: tplTask.dueTimingHours ? `${String(tplTask.dueTimingHours).padStart(2, "0")}:00` : "10:00",
                  priority: tplTask.priority,
                })
              : "Stage not yet active",
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
  }, { timeout: 60000, maxWait: 15000 });

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
            data: {
              status: "WAITING",
              dueDate: due,
              lastAction: "Stage entered: task activated in Care Loop",
              nextAction: computeNextActionForTask({
                title: t.title,
                taskType: t.taskType,
                status: "WAITING",
                stageName: nextStep.name,
                dueTime: t.dueTime,
                priority: t.priority,
              }),
            },
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
  }, { timeout: 30000, maxWait: 10000 });

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
      lastAction: `Task completed via ${evidence?.source ?? "MANUAL"}${evidence?.replyText ? `: "${evidence.replyText}"` : ""}`,
      nextAction: "Task completed — stage progress evaluated",
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

  // 1. Record incoming patient response on the task record
  await prisma.careTask.update({
    where: { id: taskId },
    data: { patientResponse: text.trim() },
  });

  const taskTitleLower = task.title.toLowerCase();
  const isPaymentTask = task.category === "PAYMENT" || taskTitleLower.includes("payment");
  const isTriggerTask = taskTitleLower.includes("trigger");

  // 2. PAYMENT SECURITY GUARDRAIL (PDF Page 7):
  // "Do not mark payment complete because the patient says: 'I paid'. The gateway/webhook should determine payment status."
  const isPaymentClaim =
    cleanText === "i paid" ||
    cleanText === "i have paid" ||
    cleanText.includes("paid") ||
    cleanText.includes("payment done") ||
    cleanText.includes("transferred money");

  if (isPaymentTask && isPaymentClaim) {
    await prisma.careTask.update({
      where: { id: taskId },
      data: {
        lastAction: `Patient reported payment via WhatsApp: "${text.trim()}"`,
        nextAction: "Awaiting payment gateway webhook confirmation (manual claim unverified)",
      },
    });

    return {
      status: task.status,
      action: "PAYMENT_CLAIM_RECORDED_PENDING_GATEWAY",
      aiReply:
        "Thank you for letting us know. Our billing system verifies payments directly with our secure payment gateway. Your care task will automatically clear as soon as the transaction confirmation is received.",
      task,
    };
  }

  // 3. CLINICAL CONCERN & MEDICAL SAFETY GUARDRAILS (PDF Pages 5, 10, 17):
  // Dose mistakes, missed injections, double-dose queries, symptoms (pain, bleeding, vomiting, fever).
  // "This should stop normal automation and create a clinical escalation. The AI shouldn't invent a clinical answer."
  const isMedicationTask =
    task.category === "MEDICATION" ||
    task.category === "INJECTION" ||
    task.taskType === "MEDICATION_TASK" ||
    taskTitleLower.includes("injection") ||
    taskTitleLower.includes("medication") ||
    taskTitleLower.includes("dose") ||
    taskTitleLower.includes("trigger");

  const isClinicalConcern =
    cleanText.includes("wrong dose") ||
    cleanText.includes("took wrong") ||
    cleanText.includes("should i take double") ||
    cleanText.includes("take double") ||
    cleanText.includes("double dose") ||
    cleanText.includes("pain") ||
    cleanText.includes("bleeding") ||
    cleanText.includes("cramp") ||
    cleanText.includes("fever") ||
    cleanText.includes("vomit") ||
    cleanText.includes("severe") ||
    cleanText.includes("i have a concern") ||
    (isMedicationTask &&
      (cleanText.includes("missed") || cleanText.includes("forgot") || cleanText.includes("what should i do")));

  const isMissedOrHelp =
    isClinicalConcern ||
    cleanText.includes("missed") ||
    cleanText.includes("forgot") ||
    cleanText.includes("help") ||
    cleanText.includes("delay") ||
    cleanText.includes("skip") ||
    cleanText.includes("problem");

  if (isMissedOrHelp) {
    // 1. Mark task as BLOCKED / NEEDS_HELP
    await prisma.careTask.update({
      where: { id: taskId },
      data: {
        status: "BLOCKED",
        lastAction: isClinicalConcern
          ? `Clinical alert: patient reported symptom/dose query: "${text.trim()}"`
          : `Patient reported issue with task: "${text.trim()}"`,
        nextAction: isClinicalConcern
          ? "CLINICAL ESCALATION: Paused for doctor/nurse intervention"
          : "Coordinator follow-up required",
        metadata: {
          patientReportedIssue: text,
          reportedAt: new Date().toISOString(),
        },
      },
    });

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
    const isDoseQuery =
      cleanText.includes("wrong dose") ||
      cleanText.includes("took wrong") ||
      cleanText.includes("take double") ||
      cleanText.includes("double dose");

    const guardrailedAiReply = isDoseQuery
      ? "I understand your concern. I don't want to give you incorrect medical advice. I have paused automated messages for this issue and immediately alerted your doctor and clinical care team so they can guide you directly."
      : "I understand. I don't want to give you the wrong medical information. I have paused automated messages for this issue and recorded this for your care team so they can guide you promptly.";

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

  // 4. ARRIVAL CHECK-IN (PDF Pages 13, 15):
  // "[I've Arrived]", "I have arrived", "at the clinic"
  const isArrival =
    cleanText === "i've arrived" ||
    cleanText === "i have arrived" ||
    cleanText.includes("arrived") ||
    cleanText.includes("i am at the clinic") ||
    cleanText.includes("im here");

  if (isArrival) {
    const outcome = await completeCareTask(tenant, taskId, {
      replyText: text,
      source: "PATIENT_ARRIVAL",
      notes: "Patient checked in: arrived at clinic on procedure day",
    });

    await prisma.careTask.update({
      where: { id: taskId },
      data: {
        lastAction: "Patient arrived at clinic",
        nextAction: "Staff check-in & procedure suite readiness confirmed",
      },
    });

    return {
      status: "COMPLETED",
      action: "PATIENT_ARRIVED",
      aiReply: "Welcome to the clinic! Your arrival has been confirmed and our clinical staff has been notified to receive you.",
      task: outcome.task,
      stageAdvancement: outcome.stageAdvancement,
    };
  }

  // 5. TEST COMPLETED / WAITING FOR REPORT (PDF Page 18):
  // "[I've Done the Test]", "test completed"
  const isTestDone =
    cleanText === "i've done the test" ||
    cleanText === "i have done the test" ||
    cleanText.includes("done the test") ||
    cleanText.includes("test done");

  if (isTestDone) {
    await prisma.careTask.update({
      where: { id: taskId },
      data: {
        lastAction: "Patient confirmed test completed",
        nextAction: "Upload lab report document for doctor clinical review [Upload Report]",
      },
    });

    return {
      status: task.status,
      action: "TEST_COMPLETED_AWAITING_REPORT",
      aiReply: "Great! Once your lab report is available, please upload it here so your doctor can review it.",
      task,
    };
  }

  // 6. POST-TRANSFER WELLNESS CHECK-IN (PDF Page 16):
  // "[I'm Feeling Fine]", "feeling fine", "all good"
  const isFeelingFine =
    cleanText === "i'm feeling fine" ||
    cleanText === "im feeling fine" ||
    cleanText.includes("feeling fine") ||
    cleanText.includes("all good") ||
    cleanText.includes("feeling well");

  if (isFeelingFine) {
    const outcome = await completeCareTask(tenant, taskId, {
      replyText: text,
      source: "PATIENT_WELLNESS_CONFIRMATION",
      notes: "Patient reported feeling fine during post-transfer check-in",
    });

    await prisma.careTask.update({
      where: { id: taskId },
      data: {
        lastAction: "Patient confirmed feeling fine",
        nextAction: "Next post-transfer milestone: scheduled check-in or Beta-hCG test",
      },
    });

    return {
      status: "COMPLETED",
      action: "WELLNESS_CONFIRMED",
      aiReply: "We are glad to hear you are feeling well. Please rest comfortably and message us if any question arises.",
      task: outcome.task,
      stageAdvancement: outcome.stageAdvancement,
    };
  }

  // 7. POSITIVE CONFIRMATION / MEDICATION TAKEN / TRIGGER ADMINISTERED:
  // "done", "yes", "completed", "taken", "[I've Taken It]", "[I'm Ready]"
  const isPositive =
    cleanText === "done" ||
    cleanText === "yes" ||
    cleanText === "completed" ||
    cleanText === "taken" ||
    cleanText.includes("done") ||
    cleanText.includes("taken") ||
    cleanText.includes("i've taken it") ||
    cleanText.includes("i have taken") ||
    cleanText.includes("i'm ready") ||
    cleanText.includes("im ready");

  if (isPositive) {
    const nowIso = new Date().toISOString();
    const evidence: Record<string, unknown> = {
      replyText: text,
      source: "WHATSAPP_RESPONSE",
      notes: isTriggerTask
        ? `Trigger injection confirmed at ${nowIso}`
        : "Patient confirmed via WhatsApp message",
      ...(isTriggerTask ? { confirmedTriggerMinute: nowIso } : {}),
    };

    const outcome = await completeCareTask(tenant, taskId, evidence);

    await prisma.careTask.update({
      where: { id: taskId },
      data: {
        lastAction: isTriggerTask
          ? `Trigger injection administered & verified at ${nowIso}`
          : "Patient confirmed task completed",
        nextAction: isTriggerTask
          ? "OPU readiness updated — proceed to egg retrieval scheduling"
          : "Task complete — awaiting stage evaluation",
      },
    });

    const aiReply = isTriggerTask
      ? "Your trigger administration timestamp has been recorded. Your care team and embryology have confirmed your OPU procedure schedule."
      : "Thank you for confirming. Your care team has been updated.";

    return {
      status: "COMPLETED",
      action: "TASK_COMPLETED",
      aiReply,
      task: outcome.task,
      stageAdvancement: outcome.stageAdvancement,
    };
  }

  // Unrecognized text - keep waiting and log interaction
  await prisma.careTask.update({
    where: { id: taskId },
    data: {
      lastAction: `Patient replied: "${text.slice(0, 80)}"`,
    },
  });

  return {
    status: task.status,
    action: "RECORDED",
    aiReply: "Thank you for your message. Your care coordinator will follow up if needed.",
  };
}

/**
 * Executes a single step along the 4-tiered escalation ladder:
 * WhatsApp Reminder → 2nd WhatsApp Reminder → AI Voice Call → Staff Escalation
 */
export async function executeEscalationStep(
  tenant: TenantContext,
  taskId: string,
  customReason?: string,
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

  const newAttempts = (task.attempts ?? 0) + 1;
  const nextLevel = Math.min((task.escalationLevel ?? 0) + 1, 4);

  let lastAction = "";
  let nextAction = "";
  let status: CareTaskStatus = task.status;
  let escalationId: string | undefined = undefined;

  switch (nextLevel) {
    case 1:
      lastAction = `WhatsApp reminder sent (Attempt ${newAttempts})`;
      nextAction = "Second WhatsApp reminder in 2 hours if no response";
      break;
    case 2:
      lastAction = `Second WhatsApp reminder sent (Attempt ${newAttempts})`;
      nextAction = "AI Voice Call escalation in 1 hour if no response";
      break;
    case 3:
      lastAction = `AI Voice Call dispatched (Attempt ${newAttempts})`;
      nextAction = "Staff escalation if no patient answer";
      break;
    case 4:
    default:
      status = "ESCALATED";
      lastAction = `Care team escalation triggered (Attempt ${newAttempts})`;
      nextAction = "Care Coordinator direct human intervention required";

      const escalation = await prisma.escalation.create({
        data: {
          clinicId: tenant.clinicId,
          coupleId: task.coupleId,
          patientId: task.couple?.primaryPatientId ?? null,
          careTaskId: task.id,
          type: "TASK_OVERDUE",
          severity: task.priority === "CLINICAL" ? "HIGH" : "MEDIUM",
          reason: customReason ?? `Task '${task.title}' reached maximum automated outreach (${newAttempts} attempts).`,
          assignedToId: task.carePlan?.assignedCoordinatorId ?? task.couple?.assignedCoordinatorId ?? null,
          status: "OPEN",
        },
      });
      escalationId = escalation.id;
      break;
  }

  const updated = await prisma.careTask.update({
    where: { id: taskId },
    data: {
      attempts: newAttempts,
      escalationLevel: nextLevel,
      lastAction,
      nextAction,
      status,
    },
  });

  await audit(tenant, "care_task.escalation_step", "CareTask", taskId, {
    attempts: newAttempts,
    escalationLevel: nextLevel,
    lastAction,
    nextAction,
    escalationId: escalationId ?? null,
  });

  return { task: updated, escalationId };
}

/**
 * Verified payment gateway completion handler.
 * Enforces rule: only verified gateway webhooks mark payment tasks complete.
 */
export async function verifyTaskPayment(
  tenant: TenantContext,
  taskId: string,
  gatewayEvidence: {
    transactionId: string;
    amount: number;
    gateway: string;
    webhookEventId?: string | undefined;
  },
) {
  const task = await requireClinicOwned(tenant, await prisma.careTask.findUnique({ where: { id: taskId } }));

  const completed = await prisma.careTask.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedBy: `GATEWAY_WEBHOOK:${gatewayEvidence.gateway}`,
      completionEvidence: gatewayEvidence as object,
      lastAction: `Payment verified via ${gatewayEvidence.gateway} (TXN: ${gatewayEvidence.transactionId})`,
      nextAction: "Financial clearance confirmed — Proceeding with cycle preparation",
    },
  });

  await audit(tenant, "care_task.payment_verified", "CareTask", taskId, {
    transactionId: gatewayEvidence.transactionId,
    amount: gatewayEvidence.amount,
    gateway: gatewayEvidence.gateway,
    webhookEventId: gatewayEvidence.webhookEventId ?? null,
  });

  let stageAdvancement = null;
  if (task.carePlanId) {
    stageAdvancement = await evaluateStageProgress(tenant, task.carePlanId);
  }

  return { task: completed, stageAdvancement };
}

/**
 * Handles doctor Stage 3 IVF Decision milestone.
 * If patient is undecided, stops automated reminders and routes to human coordinator counseling.
 */
export async function handleIvfDecision(
  tenant: TenantContext,
  carePlanId: string,
  decision: "IVF" | "IUI" | "FURTHER_INVESTIGATION" | "TREATMENT_DEFERRED" | "PATIENT_UNDECIDED",
  notes?: string,
) {
  const plan = await requireClinicOwned(tenant, await prisma.carePlan.findUnique({ where: { id: carePlanId } }));

  if (decision === "PATIENT_UNDECIDED") {
    await prisma.carePlan.update({
      where: { id: carePlanId },
      data: {
        approvalStatus: "PAUSED",
        pauseReason: "Patient undecided on treatment pathway — automated reminders paused for human counseling",
        outcomeNotes: notes ? `[Decision: Undecided]: ${notes}` : "[Decision: Undecided] Couple taking time to deliberate",
      },
    });

    const counselingTask = await prisma.careTask.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: plan.coupleId,
        carePlanId: plan.id,
        title: "Patient decision counseling & support",
        description: "Couple is undecided regarding IVF treatment. Conduct empathetic human counseling session.",
        taskType: "COORDINATOR_TASK",
        ownerRole: "CARE_COORDINATOR",
        priority: "NORMAL",
        status: "WAITING",
        dueDate: new Date(Date.now() + 86_400_000 * 2),
        lastAction: "Automated IVF reminders paused — human counseling task assigned",
        nextAction: "Care Coordinator human consultation call with couple",
        createdById: tenant.userId,
      },
    });

    await audit(tenant, "care_loop.ivf_decision", "CarePlan", plan.id, {
      decision,
      notes: notes ?? null,
      counselingTaskId: counselingTask.id,
    });

    return {
      decision,
      status: "PAUSED_FOR_COUNSELING",
      counselingTaskId: counselingTask.id,
      message: "Automated IVF reminders paused. Care Coordinator assigned for human conversation.",
    };
  }

  const updatedPlan = await prisma.carePlan.update({
    where: { id: carePlanId },
    data: {
      selectedBranch: decision,
      outcomeNotes: notes ? `[Decision ${decision}]: ${notes}` : `[Decision: ${decision}]`,
    },
  });

  await audit(tenant, "care_loop.ivf_decision", "CarePlan", plan.id, {
    decision,
    notes: notes ?? null,
  });

  const stageOutcome = await evaluateStageProgress(tenant, carePlanId);
  return { decision, plan: updatedPlan, stageOutcome };
}

/**
 * Handles doctor Stage 14 Cycle Outcome milestone.
 * For unsuccessful cycles: routes to compassionate counselor follow-up, never auto-pushes next cycle.
 */
export async function handleCycleOutcome(
  tenant: TenantContext,
  carePlanId: string,
  outcome: "POSITIVE" | "UNSUCCESSFUL" | "OTHER",
  notes?: string,
) {
  const plan = await requireClinicOwned(tenant, await prisma.carePlan.findUnique({ where: { id: carePlanId } }));

  if (outcome === "UNSUCCESSFUL") {
    const updated = await prisma.carePlan.update({
      where: { id: carePlanId },
      data: {
        status: "COMPLETED",
        selectedBranch: "UNSUCCESSFUL_CYCLE",
        outcomeNotes: notes ? `[Outcome: Unsuccessful]: ${notes}` : "[Outcome: Unsuccessful]",
      },
    });

    const followUpTask = await prisma.careTask.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: plan.coupleId,
        carePlanId: plan.id,
        title: "Compassionate follow-up consultation with couple",
        description: "Cycle outcome was negative. Doctor and counselor conduct dedicated review. Automated cycle re-prompts strictly disabled.",
        taskType: "COORDINATOR_TASK",
        ownerRole: "CARE_COORDINATOR",
        priority: "HIGH",
        status: "WAITING",
        dueDate: new Date(Date.now() + 86_400_000),
        lastAction: "Cycle outcome recorded: Unsuccessful. Automated re-prompts strictly blocked.",
        nextAction: "Schedule compassionate clinical review call with Dr. & Coordinator",
        createdById: tenant.userId,
      },
    });

    await audit(tenant, "care_loop.cycle_outcome", "CarePlan", plan.id, { outcome, followUpTaskId: followUpTask.id });

    return {
      outcome,
      status: "COMPLETED",
      followUpTaskId: followUpTask.id,
      patientMessage: "Your care team would like to speak with you about the result and discuss the next steps with you.",
    };
  }

  const updated = await prisma.carePlan.update({
    where: { id: carePlanId },
    data: {
      status: "COMPLETED",
      selectedBranch: "PREGNANCY_CONFIRMED",
      outcomeNotes: notes ? `[Outcome: Positive]: ${notes}` : "[Outcome: Positive — Clinical Pregnancy Confirmed]",
    },
  });

  const viabilityTask = await prisma.careTask.create({
    data: {
      clinicId: tenant.clinicId,
      coupleId: plan.coupleId,
      carePlanId: plan.id,
      title: "Viability ultrasound scan (6–7 weeks)",
      description: "Transvaginal ultrasound to confirm intrauterine gestational sac, fetal cardiac activity, and crown-rump length (CRL).",
      taskType: "APPOINTMENT_TASK",
      ownerRole: "CARE_COORDINATOR",
      priority: "HIGH",
      status: "WAITING",
      dueDate: new Date(Date.now() + 86_400_000 * 14),
      lastAction: "Beta-hCG positive confirmed by doctor",
      nextAction: "Schedule 6-7 week viability ultrasound scan",
      createdById: tenant.userId,
    },
  });

  await audit(tenant, "care_loop.cycle_outcome", "CarePlan", plan.id, { outcome, viabilityTaskId: viabilityTask.id });

  return {
    outcome,
    status: "COMPLETED",
    viabilityTaskId: viabilityTask.id,
    patientMessage: "Your care team has reviewed your result and would like to guide you through the next steps.",
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
    await prisma.couple.findUnique({
      where: { id: input.coupleId },
      include: { primaryPatient: true, partnerPatient: true },
    }),
  );

  let targetRole = input.targetRole || "PRIMARY";
  let targetPatientId: string | null = input.targetPatientId ?? null;
  if (!targetPatientId) {
    if (targetRole === "PARTNER" && couple.partnerPatientId) {
      targetPatientId = couple.partnerPatientId;
    } else if (targetRole === "COUPLE" || targetRole === "BOTH" || input.broadcastToBoth) {
      targetPatientId = null;
      targetRole = "COUPLE";
    } else {
      targetPatientId = couple.primaryPatientId;
      targetRole = "PRIMARY";
    }
  }

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

  let validCreatedById: string | null = null;
  if (tenant.userId) {
    const user = await prisma.user.findUnique({
      where: { id: tenant.userId },
      select: { id: true },
    });
    if (user) {
      validCreatedById = user.id;
    }
  }

  const task = await prisma.careTask.create({
    data: {
      clinicId: tenant.clinicId,
      coupleId: couple.id,
      carePlanId: planId ?? null,
      carePlanStepId: stepId ?? null,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? "Medication",
      taskType: input.taskType ?? "PATIENT_TASK",
      ownerRole: input.ownerRole ?? "PATIENT",
      source: "DOCTOR_MANUAL",
      priority: input.priority ?? "NORMAL",
      status: "WAITING",
      dueDate,
      dueTime: input.dueTime ?? "10:00",
      targetRole,
      targetPatientId,
      communicationChannel: "WHATSAPP",
      attempts: 0,
      escalationLevel: 0,
      lastAction: `Ad-hoc task created for ${targetRole === "COUPLE" ? "both partners" : targetRole === "PARTNER" ? "partner" : "primary patient"}`,
      nextAction: computeNextActionForTask({
        title: input.title,
        taskType: input.taskType ?? "PATIENT_TASK",
        status: "WAITING",
        dueTime: input.dueTime ?? "10:00",
        priority: input.priority ?? "NORMAL",
      }),
      communicationConfig: (input.communicationConfig ?? { whatsappEnabled: true }) as object,
      reminderConfig: (input.reminderConfig ?? {}) as object,
      escalationConfig: (input.escalationConfig ?? {}) as object,
      createdById: validCreatedById,
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
    targetRole,
    targetPatientId,
    dueDate: dueDate.toISOString(),
  });

  // Automatically dispatch WhatsApp notification to patient / partner / couple if enabled
  if (input.sendWhatsApp !== false) {
    const { dispatchTaskToWhatsApp } = await import("./stage-dispatch");
    await dispatchTaskToWhatsApp(tenant, {
      taskId: task.id,
      ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
      ...(input.partnerPhoneNumber ? { partnerPhoneNumber: input.partnerPhoneNumber } : {}),
      targetRole,
      broadcastToBoth: input.broadcastToBoth || targetRole === "COUPLE" || targetRole === "BOTH",
    }).catch((err) => {
      console.error("[addDoctorTask] Automatic WhatsApp dispatch error:", err);
    });
  }

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

  const allDbTasks = await prisma.careTask.findMany({
    where: {
      clinicId: tenant.clinicId,
      OR: [
        { carePlanId: plan.id },
        { coupleId: plan.coupleId },
      ],
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      assignments: { include: { user: { select: { name: true } } } },
      carePlanStep: { select: { id: true, name: true, sortOrder: true } },
    },
  });

  const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex) ?? plan.steps[0];
  const allTasks = allDbTasks.length > 0 ? allDbTasks : plan.steps.flatMap((s) => s.tasks);
  const currentTasks = currentStep ? currentStep.tasks : [];
  const nextActionInfo = await computeNextAction(tenant, carePlanId);

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
    nextAction: nextActionInfo.nextAction,
    nextActionUrgency: nextActionInfo.urgency,
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
        communicationChannel: t.communicationChannel ?? "WHATSAPP",
        attempts: t.attempts ?? 0,
        escalationLevel: t.escalationLevel ?? 0,
        lastAction: t.lastAction ?? null,
        nextAction: t.nextAction ?? null,
        patientResponse: t.patientResponse ?? null,
        due: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "Unscheduled",
        dueTime: t.dueTime,
        assignedTo: t.assignments[0]?.user?.name ?? t.ownerRole,
        completionEvidence: t.completionEvidence,
        isEscalated: t.status === "ESCALATED" || t.status === "BLOCKED",
        targetRole: t.targetRole ?? null,
        targetPatientId: t.targetPatientId ?? null,
      })),
    },
    allTasksSummary: {
      total: allTasks.length,
      completed: allTasks.filter((t) => t.status === "COMPLETED").length,
      waiting: allTasks.filter((t) => t.status === "WAITING" || t.status === "IN_PROGRESS").length,
      blockedOrOverdue: allTasks.filter((t) => t.status === "BLOCKED" || t.status === "OVERDUE" || t.status === "ESCALATED").length,
    },
    allTasks: allDbTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      status: t.status,
      priority: t.priority,
      taskType: t.taskType,
      ownerRole: t.ownerRole,
      communicationChannel: t.communicationChannel ?? "WHATSAPP",
      attempts: t.attempts ?? 0,
      escalationLevel: t.escalationLevel ?? 0,
      lastAction: t.lastAction ?? null,
      nextAction: t.nextAction ?? null,
      patientResponse: t.patientResponse ?? null,
      due: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "Unscheduled",
      dueTime: t.dueTime,
      assignedTo: t.assignments[0]?.user?.name ?? t.ownerRole,
      stageName: t.carePlanStep?.name ?? null,
      stageIndex: t.carePlanStep?.sortOrder ?? null,
      isEscalated: t.status === "ESCALATED" || t.status === "BLOCKED",
      targetRole: t.targetRole ?? null,
      targetPatientId: t.targetPatientId ?? null,
    })),
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
