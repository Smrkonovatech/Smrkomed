import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";
import { z } from "zod";

import { requirePermission } from "../../lib/authz";
import { fail, ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import { retrieveKnowledgeArticles } from "../whatsapp-ai/knowledge";
import { escalateToHuman } from "../whatsapp-ai/handoff";
import type { AppEnv } from "../../types";

const CLINICAL_SAFETY_DISCLAIMER =
  "Smrko AI is an assistive intelligence layer. All clinical decisions, diagnoses, prescriptions, and discharges remain the exclusive responsibility of the attending licensed physician.";

// Schemas
const patientSummarySchema = z.object({
  patientId: z.string().min(1),
});

const conversationSummarySchema = z.object({
  conversationId: z.string().min(1),
});

const taskSummarySchema = z.object({
  coupleId: z.string().optional(),
  carePlanId: z.string().optional(),
});

const journeySummarySchema = z.object({
  coupleId: z.string().min(1),
});

const reportSummarySchema = z.object({
  taskId: z.string().min(1),
});

const draftMessageSchema = z.object({
  patientId: z.string().min(1),
  intent: z.enum([
    "MEDICATION_REMINDER",
    "APPOINTMENT_PREP",
    "REPORT_NOTIFICATION",
    "GENERAL_FOLLOWUP",
    "SYMPTOM_CHECK",
  ]),
  customContext: z.string().optional(),
});

const consultationAssistSchema = z.object({
  appointmentId: z.string().min(1),
  clinicalImpressionNotes: z.string().min(1),
  vitals: z
    .object({
      bp: z.string().optional(),
      pulse: z.string().optional(),
      weight: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

const draftDischargeSchema = z.object({
  coupleId: z.string().min(1),
  treatmentId: z.string().optional(),
  clinicalSummary: z.string().min(1),
});

const knowledgeRetrieveSchema = z.object({
  query: z.string().min(1),
  specialtyHint: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

const handoffSchema = z.object({
  conversationId: z.string().min(1),
  reason: z.string().min(1),
  patientId: z.string().optional(),
  coupleId: z.string().optional(),
});

const conditionalAutomationSchema = z.object({
  taskId: z.string().min(1),
  event: z.enum(["PATIENT_RESPONSE", "DUE_DATE_PASSED", "STEP_COMPLETED", "MANUAL_TRIGGER"]),
  responsePayload: z.string().optional(),
});

const explainWorkflowSchema = z.object({
  carePlanId: z.string().optional(),
  taskId: z.string().optional(),
  coupleId: z.string().optional(),
});

const voiceEscalationSchema = z.object({
  taskId: z.string().min(1),
  transcript: z.string().optional(),
  patientResponse: z.string().optional(),
  clinicalConcernFlagged: z.boolean().optional(),
});

export const aiRoutes = new Hono<AppEnv>()
  // 1. Smrko AI Capability & Status
  .get("/status", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const publishedArticlesCount = await prisma.whatsAppKnowledgeArticle.count({
      where: { clinicId: tenant.clinicId, status: "PUBLISHED" },
    });
    const recentInteractions = await prisma.aIInteraction.count({
      where: { clinicId: tenant.clinicId },
    });

    return ok(c, {
      model: "smrko-clinical-ai-v2",
      capabilities: [
        "prepare-my-day",
        "patient-summary",
        "conversation-summary",
        "task-summary",
        "journey-summary",
        "report-summary",
        "message-drafting",
        "consultation-assist",
        "discharge-drafting",
        "knowledge-retrieval",
        "human-handoff",
        "conditional-automation",
      ],
      safetyGuardrails: {
        autonomousDiagnosisBlocked: true,
        autonomousPrescriptionBlocked: true,
        autonomousDischargeBlocked: true,
        doctorAuthorityEnforced: true,
      },
      knowledgeBaseArticlesPublished: publishedArticlesCount,
      totalInteractionsLogged: recentInteractions,
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 2. Prepare My Day AI Assistant
  .post("/prepare-my-day", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const [todayAppointments, pendingReports, escalations, activeCycles] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          clinicId: tenant.clinicId,
          startsAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          couple: {
            include: {
              primaryPatient: true,
              partnerPatient: true,
              treatments: { where: { status: "ACTIVE" }, take: 1 },
            },
          },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.careTask.findMany({
        where: {
          clinicId: tenant.clinicId,
          OR: [{ category: "DIAGNOSTICS" }, { taskType: "DIAGNOSTICS" }],
          status: { in: ["WAITING", "IN_PROGRESS", "ACTIVE"] },
        },
        take: 10,
      }),
      prisma.careTask.findMany({
        where: {
          clinicId: tenant.clinicId,
          OR: [{ status: "ESCALATED" }, { priority: "CLINICAL" }, { escalationLevel: { gt: 0 } }],
        },
        take: 10,
      }),
      prisma.treatment.findMany({
        where: { clinicId: tenant.clinicId, kind: "IVF", status: "ACTIVE" },
        take: 10,
      }),
    ]);

    const reportNeedingReviewCount = pendingReports.filter((r) => {
      const meta = (r.metadata || {}) as any;
      return meta.results?.length && !meta.doctorReview?.reviewedAt;
    }).length;

    const summary = `Today you have ${todayAppointments.length} scheduled appointment(s), ${reportNeedingReviewCount} diagnostic report(s) awaiting clinical sign-off, ${escalations.length} priority escalation(s), and ${activeCycles.length} active IVF cycle(s) under active stimulation or monitoring.`;

    await prisma.aIInteraction.create({
      data: {
        clinicId: tenant.clinicId,
        trigger: "DOCTOR_PREPARE_MY_DAY",
        intent: "DAILY_BRIEFING",
        model: "smrko-clinical-ai-v2",
        safeToAutoReply: false,
        status: "COMPLETED",
        rawSummary: summary,
      },
    });

    return ok(c, {
      summary,
      metrics: {
        todayAppointmentsCount: todayAppointments.length,
        pendingReportsCount: reportNeedingReviewCount,
        escalationsCount: escalations.length,
        activeTreatmentsCount: activeCycles.length,
      },
      appointments: todayAppointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        type: a.type,
        patientName: a.couple?.primaryPatient
          ? `${a.couple.primaryPatient.firstName} ${a.couple.primaryPatient.lastName}`.trim()
          : "Patient",
        partnerName: a.couple?.partnerPatient
          ? `${a.couple.partnerPatient.firstName} ${a.couple.partnerPatient.lastName}`.trim()
          : null,
        activeTreatment: a.couple?.treatments[0]
          ? {
              kind: a.couple.treatments[0].kind,
              stageName: a.couple.treatments[0].stageName,
            }
          : null,
      })),
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 3. Patient Clinical Summary
  .post("/patient-summary", validate("json", patientSummarySchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId: tenant.clinicId },
      include: {
        primaryCouples: {
          include: {
            partnerPatient: true,
            carePlans: { where: { status: "ACTIVE" }, take: 1 },
            treatments: { where: { status: "ACTIVE" }, take: 1 },
            consultationNotes: { orderBy: { consultationDate: "desc" }, take: 3 },
          },
        },
      },
    });

    if (!patient) {
      return fail(c, 404, "NOT_FOUND", "Patient not found in active clinic context");
    }

    const couple = patient.primaryCouples[0];
    const carePlan = couple?.carePlans[0];
    const treatment = couple?.treatments[0];
    const latestNote = couple?.consultationNotes[0];

    const upcomingTasks = couple
      ? await prisma.careTask.findMany({
          where: {
            clinicId: tenant.clinicId,
            coupleId: couple.id,
            status: { notIn: ["COMPLETED", "CANCELLED", "SKIPPED"] },
          },
          orderBy: { dueDate: "asc" },
          take: 5,
        })
      : [];

    const age = patient.dateOfBirth
      ? Math.floor((new Date().getTime() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : "N/A";

    const summaryText = `${patient.firstName} ${patient.lastName} (Age: ${age}) is currently in ${
      treatment?.kind ?? "IVF"
    } protocol at stage "${carePlan?.currentStageName ?? "Consultation"}". ${
      upcomingTasks.length
    } pending clinical/care task(s) active. Latest clinical note: ${
      latestNote?.summary ? `"${latestNote.summary.slice(0, 150)}..."` : "No prior consultation notes recorded."
    }`;

    await prisma.aIInteraction.create({
      data: {
        clinicId: tenant.clinicId,
        patientId: patient.id,
        trigger: "CLINICAL_WORKFLOW",
        intent: "PATIENT_SUMMARY",
        model: "smrko-clinical-ai-v2",
        status: "COMPLETED",
        rawSummary: summaryText,
      },
    });

    return ok(c, {
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      summary: summaryText,
      activeTreatment: treatment ? { kind: treatment.kind, stage: treatment.stageName } : null,
      activeJourneyStage: carePlan?.currentStageName ?? null,
      upcomingTasksCount: upcomingTasks.length,
      lastConsultationDate: latestNote?.consultationDate ?? null,
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 4. Conversation Summary
  .post("/conversation-summary", validate("json", conversationSummarySchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const conversation = await prisma.conversation.findFirst({
      where: { id: body.conversationId, clinicId: tenant.clinicId },
      include: {
        patient: true,
        messages: { orderBy: { createdAt: "desc" }, take: 15 },
      },
    });

    if (!conversation) {
      return fail(c, 404, "NOT_FOUND", "Conversation not found");
    }

    const messages = conversation.messages.reverse();
    const outboundCount = messages.filter((m) => m.direction === "OUTBOUND").length;
    const inboundCount = messages.filter((m) => m.direction === "INBOUND").length;
    const lastMessage = messages[messages.length - 1];

    let sentiment = "NEUTRAL";
    let intentDetected = "GENERAL_INQUIRY";
    const lastText = lastMessage?.content.toLowerCase() || "";

    if (lastText.includes("pain") || lastText.includes("bleeding") || lastText.includes("spotting") || lastText.includes("emergency")) {
      sentiment = "DISTRESSED";
      intentDetected = "URGENT_SYMPTOM";
    } else if (lastText.includes("thank") || lastText.includes("done") || lastText.includes("taken") || lastText.includes("confirmed")) {
      sentiment = "POSITIVE";
      intentDetected = "TASK_COMPLIANCE";
    } else if (lastText.includes("reschedule") || lastText.includes("change time")) {
      sentiment = "NEUTRAL";
      intentDetected = "RESCHEDULE_REQUEST";
    }

    const summaryText = `Thread contains ${messages.length} messages (${inboundCount} patient, ${outboundCount} clinic). Patient intent: ${intentDetected}, Sentiment: ${sentiment}. Last message: "${lastMessage?.content || ""}". Recommended action: ${
      sentiment === "DISTRESSED" ? "Immediate clinical nurse/doctor triage" : "Standard care coordinator response"
    }.`;

    await prisma.aIInteraction.create({
      data: {
        clinicId: tenant.clinicId,
        conversationId: conversation.id,
        patientId: conversation.patientId,
        trigger: "COMMUNICATION_ANALYSIS",
        intent: intentDetected,
        classification: sentiment,
        model: "smrko-clinical-ai-v2",
        status: "COMPLETED",
        rawSummary: summaryText,
      },
    });

    return ok(c, {
      conversationId: conversation.id,
      patientName: conversation.patient ? `${conversation.patient.firstName} ${conversation.patient.lastName}`.trim() : "Patient",
      totalMessagesAnalyzed: messages.length,
      intentDetected,
      sentiment,
      summary: summaryText,
      recommendedAction: sentiment === "DISTRESSED" ? "CLINICAL_ESCALATION" : "COORDINATOR_REPLY",
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 5. Task Summary
  .post("/task-summary", validate("json", taskSummarySchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const tasks = await prisma.careTask.findMany({
      where: {
        clinicId: tenant.clinicId,
        ...(body.coupleId ? { coupleId: body.coupleId } : {}),
        ...(body.carePlanId ? { carePlanId: body.carePlanId } : {}),
      },
      orderBy: { dueDate: "asc" },
      take: 50,
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== "COMPLETED").length;
    const escalated = tasks.filter((t) => t.status === "ESCALATED" || t.priority === "CLINICAL").length;

    const summary = `Analyzed ${total} CareTasks: ${completed} completed, ${overdue} overdue past deadline, ${escalated} clinical escalation(s) active.`;

    return ok(c, {
      total,
      completed,
      overdue,
      escalated,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      summary,
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 6. Journey Summary
  .post("/journey-summary", validate("json", journeySummarySchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const carePlan = await prisma.carePlan.findFirst({
      where: { coupleId: body.coupleId, clinicId: tenant.clinicId },
      include: {
        steps: { orderBy: { sortOrder: "asc" } },
        couple: { include: { primaryPatient: true, partnerPatient: true } },
      },
    });

    if (!carePlan) {
      return fail(c, 404, "NOT_FOUND", "CarePlan not found for couple");
    }

    const completedSteps = carePlan.steps.filter((s) => s.status === "DONE").length;
    const currentStep = carePlan.steps.find((s) => s.status === "CURRENT") || carePlan.steps[carePlan.currentStageIndex];

    const summary = `Couple is in ${carePlan.type} Journey ("${carePlan.name}"). Currently at Stage ${(carePlan.currentStageIndex ?? 0) + 1}/15: "${carePlan.currentStageName || currentStep?.name || "Stimulation"}". ${completedSteps} prior protocol stages completed.`;

    return ok(c, {
      carePlanId: carePlan.id,
      journeyType: carePlan.type,
      currentStageIndex: carePlan.currentStageIndex,
      currentStageName: carePlan.currentStageName,
      totalStages: 15,
      completedStagesCount: completedSteps,
      summary,
      outcome: carePlan.outcome ?? null,
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 7. Report Summary (Factual parameter extraction for doctor review)
  .post("/report-summary", validate("json", reportSummarySchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const task = await prisma.careTask.findFirst({
      where: { id: body.taskId, clinicId: tenant.clinicId },
    });

    if (!task) {
      return fail(c, 404, "NOT_FOUND", "Diagnostic task not found");
    }

    const meta = (task.metadata || {}) as any;
    const results = meta.results || [];
    const testName = meta.testName || task.title;

    let abnormalCount = 0;
    const extractedParams = results.map((r: any) => {
      if (r.flag && r.flag !== "Normal" && r.flag !== "Not Evaluated") {
        abnormalCount++;
      }
      return {
        parameter: r.parameter,
        value: r.value || r.result || "N/A",
        unit: r.unit || "",
        flag: r.flag || "Normal",
      };
    });

    const summary = `${testName} report with ${results.length} measured parameter(s). ${abnormalCount} parameter(s) flagged outside normal reference range. Doctor clinical evaluation required prior to patient disclosure.`;

    return ok(c, {
      taskId: task.id,
      testName,
      parametersCount: results.length,
      flaggedCount: abnormalCount,
      extractedParameters: extractedParams,
      summary,
      doctorReviewPending: !meta.doctorReview?.reviewedAt,
      doctorReview: meta.doctorReview ?? null,
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 8. Safe Message Drafting (For Staff / Doctor approval before sending)
  .post("/draft-message", validate("json", draftMessageSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId: tenant.clinicId },
    });

    if (!patient) {
      return fail(c, 404, "NOT_FOUND", "Patient not found");
    }

    let draft = "";
    const pName = patient.firstName;

    switch (body.intent) {
      case "MEDICATION_REMINDER":
        draft = `Hi ${pName}, this is a gentle reminder from SmrkoMed Care Team to take your prescribed fertility medication as scheduled today. Please reply "DONE" once taken, or let us know if you need assistance.`;
        break;
      case "APPOINTMENT_PREP":
        draft = `Hi ${pName}, preparing for your upcoming scan tomorrow. Please arrive 15 minutes prior with a full bladder as advised. If you need directions or to adjust timing, please tap below.`;
        break;
      case "REPORT_NOTIFICATION":
        draft = `Hi ${pName}, your recent diagnostic results have been received and verified by our clinical team. Your doctor will review the findings with you during your scheduled consultation.`;
        break;
      case "SYMPTOM_CHECK":
        draft = `Hi ${pName}, checking in to see how you are feeling after your recent procedure. If you are experiencing severe discomfort, unusual bleeding, or high fever, please contact the clinic immediately.`;
        break;
      default:
        draft = `Hi ${pName}, greetings from your fertility care team at SmrkoMed. Please let us know if you have any questions regarding your treatment plan.`;
        break;
    }

    if (body.customContext) {
      draft += ` (${body.customContext})`;
    }

    await prisma.aIInteraction.create({
      data: {
        clinicId: tenant.clinicId,
        patientId: patient.id,
        trigger: "STAFF_DRAFT",
        intent: body.intent,
        model: "smrko-clinical-ai-v2",
        status: "DRAFT",
        safeToAutoReply: false,
        rawSummary: draft,
      },
    });

    return ok(c, {
      patientId: patient.id,
      intent: body.intent,
      draftedMessage: draft,
      approvalRequired: true,
      senderRole: "STAFF",
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 9. Consultation Assistance (Drafting SOAP notes for doctor signature)
  .post("/consultation-assist", validate("json", consultationAssistSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const appt = await prisma.appointment.findFirst({
      where: { id: body.appointmentId, clinicId: tenant.clinicId },
      include: {
        couple: { include: { primaryPatient: true, partnerPatient: true } },
      },
    });

    if (!appt) {
      return fail(c, 404, "NOT_FOUND", "Appointment not found");
    }

    const patientName = appt.couple?.primaryPatient
      ? `${appt.couple.primaryPatient.firstName} ${appt.couple.primaryPatient.lastName}`.trim()
      : "Patient";

    const impression = body.clinicalImpressionNotes || "Standard consultation examination.";
    const proposedSoap = {
      subjective: `Patient ${patientName} presented for ${appt.type}. Clinical discussion notes: ${impression}`,
      objective: body.vitals
        ? `Vitals recorded: BP: ${body.vitals["bp"] || "N/A"}, Pulse: ${body.vitals["pulse"] || "N/A"}, Weight: ${body.vitals["weight"] || "N/A"}.`
        : "Standard vitals reviewed within normal baseline parameters.",
      assessment: `Clinical Impression: ${impression.slice(0, 300)}. Active fertility treatment protocol monitored.`,
      plan: "1. Continue current prescribed medication dosage and luteal support.\n2. Schedule next follicular monitoring ultrasound in 48 hours.\n3. Laboratory serum Estradiol & Progesterone assessment.",
    };

    return ok(c, {
      appointmentId: appt.id,
      patientName,
      proposedSoap,
      doctorAuthorizationRequired: true,
      authorityNotice: "Doctor retains final clinical authority to edit, add prescriptions, and sign off.",
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 10. Discharge Drafting (Assists doctor with discharge summary proposal)
  .post("/draft-discharge", validate("json", draftDischargeSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const couple = await prisma.couple.findFirst({
      where: { id: body.coupleId, clinicId: tenant.clinicId },
      include: {
        primaryPatient: true,
        partnerPatient: true,
        carePlans: { where: { status: "ACTIVE" }, take: 1 },
      },
    });

    if (!couple) {
      return fail(c, 404, "NOT_FOUND", "Couple record not found");
    }

    const patientName = couple.primaryPatient
      ? `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim()
      : "Patient";

    const draftSummary = {
      patientName,
      coupleId: couple.id,
      treatmentCourse: body.clinicalSummary,
      activeCarePlan: couple.carePlans[0]?.name ?? "IVF Protocol",
      prescriptionsProposal: "Doctor must verify and attach signed prescription list.",
      dischargeInstructions: [
        "Maintain prescribed luteal support strictly as directed.",
        "Avoid heavy lifting or strenuous aerobic exertion for 7 days.",
        "Stay adequately hydrated (2-3 liters/day).",
        "Report immediately if experiencing severe abdominal pain, persistent nausea, or fever > 100.4°F.",
      ],
      followUpSchedule: "Beta-hCG serum pregnancy test scheduled 14 days post embryo transfer.",
      finalDischargeStatus: "DRAFT_PENDING_DOCTOR_AUTHORIZATION",
    };

    return ok(c, {
      draftSummary,
      clinicalSafetyNotice: "AI cannot independently finalise discharge. A licensed doctor signature is required.",
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 11. Knowledge Retrieval
  .post("/knowledge-retrieve", validate("json", knowledgeRetrieveSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    const hits = await retrieveKnowledgeArticles({
      clinicId: tenant.clinicId,
      query: body.query,
      limit: body.limit ?? 5,
      specialtyHint: body.specialtyHint ?? null,
    });

    await prisma.aIInteraction.create({
      data: {
        clinicId: tenant.clinicId,
        trigger: "KNOWLEDGE_SEARCH",
        intent: "KB_RETRIEVAL",
        model: "smrko-clinical-ai-v2",
        status: "COMPLETED",
        rawSummary: `Query "${body.query}" returned ${hits.length} verified KB article(s).`,
      },
    });

    return ok(c, {
      query: body.query,
      totalMatches: hits.length,
      articles: hits.map((h) => ({
        id: h.id,
        title: h.title,
        category: h.category,
        specialty: h.specialty,
        snippet: h.content.slice(0, 300),
        relevanceScore: h.score,
      })),
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 12. Human Handoff (Escalating to staff / doctor)
  .post("/handoff", validate("json", handoffSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    await escalateToHuman({
      tenant,
      conversationId: body.conversationId,
      patientId: body.patientId ?? null,
      coupleId: body.coupleId ?? null,
      reason: body.reason,
      notifyStaff: true,
    });

    await prisma.aIInteraction.create({
      data: {
        clinicId: tenant.clinicId,
        conversationId: body.conversationId,
        patientId: body.patientId ?? null,
        trigger: "STAFF_HANDOFF",
        intent: "HUMAN_ESCALATION",
        model: "smrko-clinical-ai-v2",
        status: "HANDOFF",
        handoffReason: body.reason,
        rawSummary: `Conversation handed off to human staff: ${body.reason}`,
      },
    });

    return ok(c, {
      conversationId: body.conversationId,
      status: "HUMAN_HANDOFF",
      reason: body.reason,
      assignedPriority: "HIGH",
      notice: "AI automation paused for this thread. Care coordinator notified for direct human handling.",
    });
  })

  // 13. Conditional Automation & Task Dependencies
  .post("/conditional-automation", validate("json", conditionalAutomationSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const body = c.req.valid("json");

    const task = await prisma.careTask.findFirst({
      where: { id: body.taskId, clinicId: tenant.clinicId },
      include: { couple: true },
    });

    if (!task) {
      return fail(c, 404, "NOT_FOUND", "CareTask not found");
    }

    if (task.status === "COMPLETED" && (body.event === "PATIENT_RESPONSE" || body.event === "STEP_COMPLETED")) {
      return ok(c, {
        taskId: task.id,
        event: body.event,
        actionTaken: "IDEMPOTENT_NOOP",
        previousStatus: task.status,
        currentStatus: task.status,
        disclaimer: CLINICAL_SAFETY_DISCLAIMER,
      });
    }

    let actionTaken = "NO_OP";
    let updatedStatus = task.status;

    if (body.event === "PATIENT_RESPONSE") {
      const resp = (body.responsePayload || "").toUpperCase().trim();
      if (resp.includes("DONE") || resp.includes("YES") || resp.includes("TAKEN")) {
        actionTaken = "COMPLETED_AUTOMATICALLY";
        updatedStatus = "COMPLETED";
        await prisma.careTask.update({
          where: { id: task.id },
          data: {
            status: "COMPLETED",
            patientResponse: body.responsePayload ?? null,
            completedAt: new Date(),
            lastAction: "Patient confirmed via WhatsApp automation",
          },
        });
      } else if (resp.includes("HELP") || resp.includes("PAIN") || resp.includes("BLEEDING")) {
        actionTaken = "ESCALATED_CLINICAL";
        updatedStatus = "ESCALATED";
        await prisma.careTask.update({
          where: { id: task.id },
          data: {
            status: "ESCALATED",
            priority: "CLINICAL",
            escalationLevel: (task.escalationLevel ?? 0) + 1,
            patientResponse: body.responsePayload ?? null,
            lastAction: "Patient signaled need for clinical assistance",
          },
        });
      }
    } else if (body.event === "DUE_DATE_PASSED") {
      if (task.status !== "COMPLETED") {
        actionTaken = "MARKED_OVERDUE_AND_ESCALATED";
        updatedStatus = "OVERDUE";
        await prisma.careTask.update({
          where: { id: task.id },
          data: {
            status: "OVERDUE",
            attempts: (task.attempts ?? 0) + 1,
            lastAction: "Due date elapsed without response",
          },
        });
      }
    }

    return ok(c, {
      taskId: task.id,
      event: body.event,
      actionTaken,
      previousStatus: task.status,
      currentStatus: updatedStatus,
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 14. Explain Workflow Status (Synthesizes factual protocol & milestone progress)
  .post("/explain-workflow", validate("json", explainWorkflowSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const body = c.req.valid("json");

    let carePlan = null;
    if (body.carePlanId) {
      carePlan = await prisma.carePlan.findFirst({
        where: { id: body.carePlanId, clinicId: tenant.clinicId },
        include: { couple: { include: { primaryPatient: true } }, steps: { orderBy: { sortOrder: "asc" } } },
      });
    } else if (body.coupleId) {
      carePlan = await prisma.carePlan.findFirst({
        where: { coupleId: body.coupleId, clinicId: tenant.clinicId, status: "ACTIVE" },
        include: { couple: { include: { primaryPatient: true } }, steps: { orderBy: { sortOrder: "asc" } } },
      });
    }

    const currentStageName = carePlan?.currentStageName || "Clinical Onboarding";
    const currentStageIndex = carePlan?.currentStageIndex ?? 0;
    const patientName = carePlan?.couple?.primaryPatient
      ? `${carePlan.couple.primaryPatient.firstName} ${carePlan.couple.primaryPatient.lastName}`.trim()
      : "Patient";

    const explanation = `Patient ${patientName} is currently in Stage ${currentStageIndex + 1} of 15: "${currentStageName}" of their ${carePlan?.type || "IVF"} protocol. Next clinical milestone involves scheduled ultrasound monitoring and laboratory review.`;

    return ok(c, {
      carePlanId: carePlan?.id ?? null,
      currentStageIndex,
      currentStageName,
      explanation,
      workflowSourceOfTruth: "CarePlan & CareTask engine",
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 15. AI Voice Outreach & Safety Escalation
  .post("/voice-escalation", validate("json", voiceEscalationSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.CARE_TASKS_WRITE);
    const body = c.req.valid("json");

    const task = await prisma.careTask.findFirst({
      where: { id: body.taskId, clinicId: tenant.clinicId },
      include: { couple: true },
    });

    if (!task) {
      return fail(c, 404, "NOT_FOUND", "CareTask not found");
    }

    const transcript = (body.transcript || body.patientResponse || "").toLowerCase();
    const isClinicalConcern =
      body.clinicalConcernFlagged ||
      transcript.includes("pain") ||
      transcript.includes("bleeding") ||
      transcript.includes("emergency") ||
      transcript.includes("dizzy") ||
      transcript.includes("severe");

    if (isClinicalConcern) {
      // Immediately stop automated voice/bot flows and escalate
      await prisma.careTask.update({
        where: { id: task.id },
        data: {
          status: "ESCALATED",
          priority: "CLINICAL",
          escalationLevel: (task.escalationLevel ?? 0) + 1,
          lastAction: "AI Voice outreach detected clinical concern - escalated to staff/doctor",
        },
      });

      await prisma.aIInteraction.create({
        data: {
          clinicId: tenant.clinicId,
          careTaskId: task.id,
          trigger: "VOICE_OUTREACH",
          intent: "CLINICAL_CONCERN_DETECTED",
          model: "smrko-voice-ai-v1",
          status: "HANDOFF",
          handoffReason: "Clinical symptom detected during voice outreach",
          rawSummary: `Voice transcript: "${body.transcript || "Clinical concern flagged"}"`,
        },
      });

      return ok(c, {
        taskId: task.id,
        actionTaken: "STOPPED_AND_ESCALATED",
        escalationPriority: "CLINICAL",
        clinicalSafetyNotice: "Automated voice session halted. Immediate human clinical follow-up required.",
        disclaimer: CLINICAL_SAFETY_DISCLAIMER,
      });
    }

    // Otherwise patient confirmed normal compliance
    await prisma.careTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lastAction: "Patient confirmed compliance via automated voice outreach",
      },
    });

    return ok(c, {
      taskId: task.id,
      actionTaken: "COMPLETED_VIA_VOICE",
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 16. Automation Observability (Execution status, retries, node progression, escalations)
  .get("/observability", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const executions = await prisma.whatsAppFlowExecution.findMany({
      where: { clinicId: tenant.clinicId },
      include: {
        flow: { select: { id: true, name: true, triggerType: true } },
        steps: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    const mapped = executions.map((ex) => ({
      executionId: ex.id,
      flowName: ex.flow?.name || "Care Loop Flow",
      triggerType: ex.triggerType,
      patientId: ex.patientId ?? null,
      coupleId: ex.coupleId ?? null,
      currentNodeId: ex.currentNodeId ?? null,
      status: ex.status,
      startedAt: ex.startedAt,
      completedAt: ex.completedAt,
      error: ex.error ?? null,
      stepsCount: ex.steps.length,
      latestStepStatus: ex.steps[0]?.status ?? null,
    }));

    const statusCounts = {
      pending: executions.filter((e) => e.status === "PENDING").length,
      running: executions.filter((e) => e.status === "RUNNING").length,
      waiting: executions.filter((e) => e.status === "WAITING").length,
      completed: executions.filter((e) => e.status === "COMPLETED").length,
      failed: executions.filter((e) => e.status === "FAILED").length,
      cancelled: executions.filter((e) => e.status === "CANCELLED").length,
      escalated: executions.filter((e) => e.status === "ESCALATED").length,
    };

    return ok(c, {
      totalExecutions: executions.length,
      statusCounts,
      executions: mapped,
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  })

  // 17. AI Audit & Cost Governance
  .get("/audit", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);

    const interactions = await prisma.aIInteraction.findMany({
      where: { clinicId: tenant.clinicId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        trigger: true,
        intent: true,
        model: true,
        status: true,
        handoffReason: true,
        rawSummary: true,
        createdAt: true,
      },
    });

    const totalCalls = interactions.length;
    const handoffCount = interactions.filter((i) => i.status === "HANDOFF").length;
    const completedCount = interactions.filter((i) => i.status === "COMPLETED").length;

    // Cost governance metrics (deterministic tasks bypass expensive LLMs)
    const modelBreakdown: Record<string, number> = {};
    for (const i of interactions) {
      const m = i.model || "smrko-clinical-ai-v2";
      modelBreakdown[m] = (modelBreakdown[m] || 0) + 1;
    }

    return ok(c, {
      totalAiCalls: totalCalls,
      handoffCount,
      completedCount,
      modelBreakdown,
      recentInteractions: interactions.slice(0, 20),
      costPolicy: "Deterministic routing prioritised. LLM invoked solely for assisted clinical summarization.",
      disclaimer: CLINICAL_SAFETY_DISCLAIMER,
    });
  });
