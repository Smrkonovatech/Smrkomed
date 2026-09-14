import { prisma } from "@smrkomed/database";
import { sendWhatsAppInteractiveButtons, sendWhatsAppAiSessionText } from "../../integrations/providers/whatsapp/messaging";
import { normalizeWhatsAppPhone } from "../../integrations/providers/whatsapp/phone";
import { audit } from "../../lib/audit";

/**
 * Care Loop Worker
 * 
 * Responsible for evaluating pending CareTasks and executing communication actions.
 * Follows idempotent design: checks task attempts, lastAction, and executes via channel.
 */
export async function processCareLoopExecutions(limit = 50, clinicId?: string) {
  const now = new Date();
  
  // Find due tasks that are WAITING or PENDING (using mapped enum)
  // Up to limit tasks that are due and haven't hit their escalation cap.
  const dueTasks = await prisma.careTask.findMany({
    where: {
      ...(clinicId ? { clinicId } : {}),
      dueDate: { lte: now },
      status: { in: ["WAITING", "UPCOMING", "PENDING", "ACTIVE"] },
      automationEnabled: true,
    },
    take: limit,
    include: {
      couple: {
        include: { primaryPatient: true, partnerPatient: true },
      },
    },
  });

  const results: any[] = [];
  
  for (const task of dueTasks) {
    try {
      const clinic = await prisma.clinic.findUnique({ where: { id: task.clinicId }, include: { organization: true } });
      if (!clinic) continue;
      
      const tenant = {
        userId: "system-worker",
        role: "CLINIC_ADMIN" as const,
        clinicId: clinic.id,
        organizationId: clinic.organizationId,
        clinicName: clinic.name,
        organizationName: clinic.organization?.name || "SmrkoMed",
      };

      // Idempotency check: if recently updated, wait before next attempt
      const hoursSinceLastAction = task.updatedAt ? (now.getTime() - task.updatedAt.getTime()) / 3600000 : 999;
      
      let newStatus = task.status;
      let newAttempts = task.attempts;
      let lastAction = task.lastAction;
      let escalation = false;

      if (task.attempts === 0) {
        // Initial dispatch
        await dispatchTaskMessage(tenant, task);
        newStatus = "ACTIVE"; // mapped to REMINDER_SENT
        newAttempts = 1;
        lastAction = "INITIAL_REMINDER_SENT";
        await audit(tenant, "careloop.task_reminded", "CareTask", task.id, { title: task.title, channel: task.communicationChannel });
      } else if (task.attempts < 3 && hoursSinceLastAction > 24) {
        // Follow-up after 24 hours of no response
        await dispatchTaskMessage(tenant, task, true);
        newAttempts += 1;
        lastAction = "FOLLOWUP_REMINDER_SENT";
        await audit(tenant, "careloop.task_followed_up", "CareTask", task.id, { attempt: newAttempts, title: task.title });
      } else if (task.attempts >= 3 && hoursSinceLastAction > 24) {
        // Max attempts reached without response -> escalate
        newStatus = "ESCALATED";
        lastAction = "ESCALATED_NO_RESPONSE";
        escalation = true;
      } else {
        // In cooldown period, skip
        continue;
      }

      await prisma.careTask.update({
        where: { id: task.id },
        data: {
          status: newStatus,
          attempts: newAttempts,
          lastAction,
        },
      });

      if (escalation) {
        const isDiagnostic =
          task.category === "DIAGNOSTIC" ||
          task.taskType === "DIAGNOSTIC_ORDER" ||
          task.title?.toLowerCase().includes("scan") ||
          task.title?.toLowerCase().includes("report");
        const isPayment =
          task.category === "PAYMENT" ||
          task.title?.toLowerCase().includes("payment") ||
          task.title?.toLowerCase().includes("invoice");
        const escalationType = isDiagnostic ? "MISSING_REPORT" : "TASK_OVERDUE";

        await prisma.escalation.create({
          data: {
            clinicId: task.clinicId,
            type: escalationType,
            severity: "MEDIUM",
            status: "OPEN",
            reason: isDiagnostic
              ? `Diagnostic test report pending/overdue: ${task.title}`
              : isPayment
                ? `Payment overdue / pending patient follow-up: ${task.title}`
                : `No patient response after ${task.attempts} reminders`,
            careTaskId: task.id,
            patientId: task.targetPatientId ?? task.couple?.primaryPatientId ?? null,
            coupleId: task.coupleId,
          }
        });
        await audit(tenant, "careloop.task_escalated", "CareTask", task.id, {
          reason: isDiagnostic ? "Missing diagnostic report" : "No response",
          type: escalationType,
        });
      }
      
      results.push({ taskId: task.id, status: newStatus, attempts: newAttempts });
    } catch (err) {
      console.error(`[CareLoop Worker] Failed to process task ${task.id}`, err);
      results.push({ taskId: task.id, error: err instanceof Error ? err.message : "Failed" });
    }
  }
  
  return results;
}

async function dispatchTaskMessage(tenant: any, task: any, isFollowUp: boolean = false) {
  if (process.env["MOCK_INTEGRATIONS_ENABLED"] === "1") {
    console.log(`[CareLoop Worker Mock] Dispatching message for task ${task.id}`);
    return;
  }

  if (task.communicationChannel !== "WHATSAPP") {
    // Other channels logic (e.g. AI Call) not implemented for Phase 3 
    return;
  }

  const couple = task.couple;
  if (!couple) return;

  const targetRole = task.targetRole || "PRIMARY";
  let targetPhone: string | undefined | null;
  let patientName: string = "Patient";

  if (targetRole === "PARTNER") {
    targetPhone = couple.partnerPatient?.phone || couple.primaryPatient?.phone;
    patientName = couple.partnerPatient?.firstName || "Partner";
  } else {
    targetPhone = couple.primaryPatient?.phone;
    patientName = couple.primaryPatient?.firstName || "Patient";
  }

  if (!targetPhone) return;
  const normalizedPhone = normalizeWhatsAppPhone(targetPhone);

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      clinicId: tenant.clinicId,
      OR: [
        { contactPhone: normalizedPhone },
        { contactPhone: `+${normalizedPhone}` },
        { contactPhone: normalizedPhone.replace(/^\+/, "") },
      ],
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: task.coupleId,
        contactPhone: normalizedPhone,
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
  }

  const prefix = isFollowUp ? "⚠️ Follow-up: " : "📋 ";
  const body = `Hi ${patientName},\n\n${prefix}${task.title}\n${task.description || "Please review and update your task status."}`;
  const footer = `${tenant.clinicName} • Care Loop`;

  // Standard structured responses
  const buttons = [
    { id: `task_done_${task.id}`, title: "✅ Done" },
    { id: `task_help_${task.id}`, title: "❓ Need Help" },
  ];

  try {
    await sendWhatsAppInteractiveButtons(tenant, {
      conversationId: conversation.id,
      body,
      footer,
      buttons,
    });
  } catch (err) {
    // fallback to text if templates unavailable
    try {
      const actionText = buttons.map((b) => `• Reply "${b.title}"`).join("\n");
      const fullSessionBody = `${body}\n\nActions:\n${actionText}`;
      await sendWhatsAppAiSessionText(tenant, {
        conversationId: conversation.id,
        body: fullSessionBody,
      });
    } catch (fallbackErr) {
      console.warn(`[CareLoop Worker] WhatsApp dispatch fallback failed for task ${task.id}:`, (fallbackErr as Error)?.message);
    }
  }
}
