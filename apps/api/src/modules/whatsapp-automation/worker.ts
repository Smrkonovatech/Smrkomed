import { prisma } from "@smrkomed/database";

import { env } from "../../config/env";
import { resumeDueExecutions } from "./engine";
import { dispatchWhatsAppTrigger } from "./triggers";
import { processDueCampaigns } from "./campaigns";
import type { TenantContext } from "@smrkomed/database";

let timer: ReturnType<typeof setInterval> | null = null;
let ticking = false;

async function clinicTenant(clinicId: string): Promise<TenantContext | null> {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return null;
  return {
    userId: "system-worker",
    role: "CLINIC_ADMIN",
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    clinicName: clinic.name,
    organizationName: "",
  };
}

/** Emit scheduled triggers for appointments ~24h out and care tasks due today. */
export async function emitScheduledTriggers(limit = 50, clinicId?: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 3_600_000);
  const windowEnd = new Date(now.getTime() + 25 * 3_600_000);
  const results: Array<{ type: string; id: string; matched?: number; error?: string }> = [];
  const clinicFilter = clinicId ? { clinicId } : {};

  const appointments = await prisma.appointment.findMany({
    where: {
      ...clinicFilter,
      startsAt: { gte: windowStart, lte: windowEnd },
      status: "CONFIRMED",
    },
    take: limit,
  });

  for (const appt of appointments) {
    const tenant = await clinicTenant(appt.clinicId);
    if (!tenant) continue;
    try {
      const out = await dispatchWhatsAppTrigger({
        tenant,
        triggerType: "APPOINTMENT_TOMORROW",
        triggerEventId: `appt_tomorrow_${appt.id}_${appt.startsAt.toISOString().slice(0, 10)}`,
        coupleId: appt.coupleId,
        vars: {
          appointment_id: appt.id,
          appointment_date: appt.startsAt.toISOString().slice(0, 10),
          appointment_time: appt.startsAt.toISOString().slice(11, 16),
          appointment_starts_at: appt.startsAt.toISOString(),
          doctor_name: appt.doctorName ?? "",
          clinic_name: tenant.clinicName,
        },
      });
      results.push({ type: "APPOINTMENT_TOMORROW", id: appt.id, matched: out.matched });
    } catch (err) {
      results.push({
        type: "APPOINTMENT_TOMORROW",
        id: appt.id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  const soonStart = new Date(now.getTime() + 90 * 60_000);
  const soonEnd = new Date(now.getTime() + 150 * 60_000);
  const soonAppts = await prisma.appointment.findMany({
    where: {
      ...clinicFilter,
      startsAt: { gte: soonStart, lte: soonEnd },
      status: "CONFIRMED",
    },
    take: limit,
  });

  for (const appt of soonAppts) {
    const tenant = await clinicTenant(appt.clinicId);
    if (!tenant) continue;
    try {
      const out = await dispatchWhatsAppTrigger({
        tenant,
        triggerType: "APPOINTMENT_2H",
        triggerEventId: `appt_2h_${appt.id}_${appt.startsAt.toISOString().slice(0, 13)}`,
        coupleId: appt.coupleId,
        vars: {
          appointment_id: appt.id,
          appointment_date: appt.startsAt.toISOString().slice(0, 10),
          appointment_time: appt.startsAt.toISOString().slice(11, 16),
          doctor_name: appt.doctorName ?? "",
          clinic_name: tenant.clinicName,
        },
      });
      results.push({ type: "APPOINTMENT_2H", id: appt.id, matched: out.matched });
    } catch (err) {
      results.push({
        type: "APPOINTMENT_2H",
        id: appt.id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const dueTasks = await prisma.careTask.findMany({
    where: {
      ...clinicFilter,
      dueDate: { gte: dayStart, lte: dayEnd },
      status: { not: "COMPLETED" },
    },
    take: limit,
  });

  for (const task of dueTasks) {
    const tenant = await clinicTenant(task.clinicId);
    if (!tenant) continue;
    const overdue = task.dueDate && task.dueDate.getTime() < now.getTime();
    const triggerType = overdue ? "CARE_TASK_OVERDUE" : "CARE_TASK_DUE";
    try {
      const out = await dispatchWhatsAppTrigger({
        tenant,
        triggerType,
        triggerEventId: `${triggerType.toLowerCase()}_${task.id}_${dayStart.toISOString().slice(0, 10)}`,
        coupleId: task.coupleId,
        vars: {
          care_task_id: task.id,
          care_task_title: task.title,
          clinic_name: tenant.clinicName,
        },
      });
      results.push({ type: triggerType, id: task.id, matched: out.matched });
    } catch (err) {
      results.push({
        type: triggerType,
        id: task.id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  const overdueInvoices = await prisma.billingInvoice.findMany({
    where: {
      ...clinicFilter,
      dueDate: { lt: now },
      status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    take: limit,
    select: {
      id: true,
      clinicId: true,
      patientId: true,
      coupleId: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
    },
  });

  for (const inv of overdueInvoices) {
    const tenant = await clinicTenant(inv.clinicId);
    if (!tenant) continue;
    const balance = Number(inv.totalAmount) - Number(inv.paidAmount);
    if (balance <= 0) continue;
    try {
      const out = await dispatchWhatsAppTrigger({
        tenant,
        triggerType: "PAYMENT_OVERDUE",
        triggerEventId: `payment_overdue_${inv.id}_${dayStart.toISOString().slice(0, 10)}`,
        patientId: inv.patientId,
        coupleId: inv.coupleId,
        vars: {
          payment_amount: String(balance),
          payment_due_date: inv.dueDate?.toISOString().slice(0, 10) ?? "",
          clinic_name: tenant.clinicName,
        },
      });
      results.push({ type: "PAYMENT_OVERDUE", id: inv.id, matched: out.matched });
    } catch (err) {
      results.push({
        type: "PAYMENT_OVERDUE",
        id: inv.id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  // Medication due → MEDICINE_REMINDER (idempotent per reminder id + day hour)
  const dueReminders = await prisma.medicationReminder.findMany({
    where: {
      ...clinicFilter,
      status: { in: ["SCHEDULED", "PENDING", "DUE"] },
      scheduledAt: {
        gte: new Date(now.getTime() - 30 * 60_000),
        lte: new Date(now.getTime() + 15 * 60_000),
      },
    },
    include: {
      prescriptionItem: true,
      patient: true,
    },
    take: limit,
  });

  for (const reminder of dueReminders) {
    const tenant = await clinicTenant(reminder.clinicId);
    if (!tenant) continue;
    try {
      if (reminder.status === "SCHEDULED" || reminder.status === "PENDING") {
        await prisma.medicationReminder.update({
          where: { id: reminder.id },
          data: { status: "DUE" },
        });
      }
      const out = await dispatchWhatsAppTrigger({
        tenant,
        triggerType: "MEDICINE_REMINDER",
        triggerEventId: `medicine_reminder_${reminder.id}`,
        patientId: reminder.patientId,
        vars: {
          medicine_name: reminder.prescriptionItem.medicineName,
          medicine_dosage: reminder.prescriptionItem.dosage ?? "",
          medicine_time: reminder.prescriptionItem.timeOfDay ?? reminder.scheduledAt.toISOString().slice(11, 16),
          medicine_instructions: reminder.prescriptionItem.instructions ?? "",
          clinic_name: tenant.clinicName,
          patient_name: `${reminder.patient.firstName} ${reminder.patient.lastName}`.trim(),
        },
      });
      results.push({ type: "MEDICINE_REMINDER", id: reminder.id, matched: out.matched });
    } catch (err) {
      results.push({
        type: "MEDICINE_REMINDER",
        id: reminder.id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  // Medication missed (past due window, still SCHEDULED/DUE) → mark MISSED + Care Task + trigger
  const missedReminders = await prisma.medicationReminder.findMany({
    where: {
      ...clinicFilter,
      status: { in: ["SCHEDULED", "PENDING", "DUE", "SENT"] },
      scheduledAt: { lt: new Date(now.getTime() - 2 * 3_600_000) },
    },
    include: { prescriptionItem: true, patient: true },
    take: limit,
  });

  for (const reminder of missedReminders) {
    const tenant = await clinicTenant(reminder.clinicId);
    if (!tenant) continue;
    try {
      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: { status: "MISSED" },
      });

      let coupleId: string | null = null;
      const couple = await prisma.couple.findFirst({
        where: {
          clinicId: reminder.clinicId,
          OR: [
            { primaryPatientId: reminder.patientId },
            { partnerPatientId: reminder.patientId },
          ],
        },
        select: { id: true },
      });
      coupleId = couple?.id ?? null;

      await prisma.careTask.create({
        data: {
          clinicId: reminder.clinicId,
          ...(coupleId ? { coupleId } : {}),
          title: `Missed medication: ${reminder.prescriptionItem.medicineName}`,
          description: [
            `Scheduled: ${reminder.scheduledAt.toISOString()}`,
            `Dose: ${reminder.prescriptionItem.dosage ?? "As prescribed"}`,
            reminder.prescriptionItem.instructions
              ? `Instructions: ${reminder.prescriptionItem.instructions}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          category: "MEDICATION",
          status: "WAITING",
          priority: "HIGH",
          dueDate: now,
        },
      });

      const out = await dispatchWhatsAppTrigger({
        tenant,
        triggerType: "MEDICINE_MISSED",
        triggerEventId: `medicine_missed_${reminder.id}`,
        patientId: reminder.patientId,
        ...(coupleId ? { coupleId } : {}),
        vars: {
          medicine_name: reminder.prescriptionItem.medicineName,
          medicine_dosage: reminder.prescriptionItem.dosage ?? "",
          medicine_time: reminder.prescriptionItem.timeOfDay ?? "",
          clinic_name: tenant.clinicName,
        },
      });
      results.push({ type: "MEDICINE_MISSED", id: reminder.id, matched: out.matched });
    } catch (err) {
      results.push({
        type: "MEDICINE_MISSED",
        id: reminder.id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  // Medication starting tomorrow (first dose window)
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const startingItems = await prisma.pharmacyPrescriptionItem.findMany({
    where: {
      prescription: { ...clinicFilter, status: { not: "CANCELLED" } },
      startDate: { gte: tomorrowStart, lte: tomorrowEnd },
    },
    include: {
      prescription: true,
      product: true,
    },
    take: limit,
  });

  for (const item of startingItems) {
    const tenant = await clinicTenant(item.prescription.clinicId);
    if (!tenant) continue;
    try {
      const out = await dispatchWhatsAppTrigger({
        tenant,
        triggerType: "MEDICINE_STARTING",
        triggerEventId: `medicine_starting_${item.id}_${tomorrowStart.toISOString().slice(0, 10)}`,
        patientId: item.prescription.patientId,
        coupleId: item.prescription.coupleId,
        vars: {
          medicine_name: item.medicineName,
          medicine_dosage: item.dosage ?? "",
          medicine_time: item.timeOfDay ?? "",
          medicine_instructions: item.instructions ?? "",
          clinic_name: tenant.clinicName,
        },
      });
      results.push({ type: "MEDICINE_STARTING", id: item.id, matched: out.matched });
    } catch (err) {
      results.push({
        type: "MEDICINE_STARTING",
        id: item.id,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }

  return results;
}

export async function processAutomationTick(opts?: { clinicId?: string }) {
  if (ticking) return { skipped: true as const, reason: "already_running" };
  ticking = true;
  try {
    const resumed = await resumeDueExecutions(25, opts?.clinicId);
    const scheduled = await emitScheduledTriggers(40, opts?.clinicId);
    const campaigns = opts?.clinicId
      ? []
      : await processDueCampaigns(5).catch(() => []);
    return {
      skipped: false as const,
      resumed: resumed.length,
      resumeResults: resumed,
      scheduled: scheduled.length,
      scheduledResults: scheduled,
      campaigns,
      clinicScoped: Boolean(opts?.clinicId),
      at: new Date().toISOString(),
    };
  } finally {
    ticking = false;
  }
}

/**
 * Smallest production-safe scheduler for Railway long-running API:
 * setInterval when WHATSAPP_AUTOMATION_WORKER=1 (or production default on).
 * Vercel can also hit POST /internal/tick with X-WhatsApp-Worker-Secret.
 */
export function startWhatsAppAutomationWorker() {
  if (timer) return;
  if (!env.whatsappAutomationWorker) {
    console.log("[whatsapp-automation] Worker disabled (set WHATSAPP_AUTOMATION_WORKER=1 to enable in-process tick).");
    return;
  }
  const ms = env.whatsappAutomationWorkerIntervalMs;
  console.log(`[whatsapp-automation] In-process worker starting (every ${ms}ms)`);
  void processAutomationTick().catch((err) => {
    console.error("[whatsapp-automation] initial tick failed", err instanceof Error ? err.message : err);
  });
  timer = setInterval(() => {
    void processAutomationTick().catch((err) => {
      console.error("[whatsapp-automation] tick failed", err instanceof Error ? err.message : err);
    });
  }, ms);
  if (typeof timer.unref === "function") timer.unref();
}

export function stopWhatsAppAutomationWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
