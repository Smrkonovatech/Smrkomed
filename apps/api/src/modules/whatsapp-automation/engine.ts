import { randomUUID } from "node:crypto";

import type { Prisma, TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { IntegrationError } from "../../integrations/core/errors";
import { classifyRetry } from "../../integrations/core/retry";
import { sendWhatsAppTemplate } from "../../integrations/providers/whatsapp/messaging";
import { evaluateCondition } from "./conditions";
import {
  DEFAULT_MAX_RETRIES,
  LOCK_TTL_MS,
  mergeExecutionContext,
  parseExecutionContext,
  type ExecutionContext,
  isLockHeld,
} from "./context";
import { nextNodes, parseDefinition } from "./validate";
import type { FlowDefinition, FlowNode } from "./types";
import { buildIdempotencyKey } from "./idempotency";
import {
  assertAutomationConsent,
  checkFrequencyLimits,
  getClinicCommSettings,
  missingRequiredVars,
  nextWorkingWindowStart,
} from "./safety";

export { buildIdempotencyKey };
type CtxVars = Record<string, string>;

function waitUntilFromConfig(config: Record<string, unknown>, vars: CtxVars): Date {
  const mode = String(config["mode"] ?? "duration");
  if (mode === "until_datetime" && config["until"]) {
    const d = new Date(String(config["until"]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (mode === "before_appointment") {
    const hours = Number(config["hoursBefore"] ?? 24);
    const apptIso = vars["appointment_starts_at"] ?? vars["appointment_date"];
    if (apptIso) {
      const appt = new Date(apptIso.includes("T") ? apptIso : `${apptIso}T09:00:00`);
      if (!Number.isNaN(appt.getTime())) {
        return new Date(appt.getTime() - hours * 3_600_000);
      }
    }
  }
  if (mode === "at_time") {
    const hour = Number(config["hour"] ?? 9);
    const minute = Number(config["minute"] ?? 0);
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    return next;
  }
  const amount = Number(config["amount"] ?? 0);
  const unit = String(config["unit"] ?? "minutes");
  const mult = unit === "days" ? 86_400_000 : unit === "hours" ? 3_600_000 : 60_000;
  return new Date(Date.now() + Math.max(0, amount) * mult);
}

function resolveTemplateParams(keys: string[], vars: CtxVars) {
  return keys.map((k) => vars[k] ?? vars[k.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? "");
}

async function loadApprovedTemplate(clinicId: string, templateName: string) {
  return prisma.whatsAppTemplate.findFirst({
    where: { clinicId, name: templateName, status: "APPROVED" },
  });
}

async function tryAcquireLock(executionId: string, clinicId: string): Promise<string | null> {
  const row = await prisma.whatsAppFlowExecution.findFirst({
    where: { id: executionId, clinicId },
  });
  if (!row) return null;
  const ctx = parseExecutionContext(row.context);
  if (isLockHeld(ctx)) return null;
  const lockToken = randomUUID();
  const lockedAt = new Date().toISOString();
  const lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS).toISOString();
  const updated = await prisma.whatsAppFlowExecution.updateMany({
    where: {
      id: executionId,
      clinicId,
      updatedAt: row.updatedAt,
    },
    data: {
      context: mergeExecutionContext(ctx, {
        lockedAt,
        lockToken,
        lockExpiresAt,
        lastAttemptAt: lockedAt,
      }),
    },
  });
  return updated.count === 1 ? lockToken : null;
}

async function releaseLock(executionId: string, clinicId: string, lockToken: string | null, patch?: Partial<ExecutionContext>) {
  const row = await prisma.whatsAppFlowExecution.findFirst({ where: { id: executionId, clinicId } });
  if (!row) return;
  const ctx = parseExecutionContext(row.context);
  if (lockToken && ctx.lockToken && ctx.lockToken !== lockToken) return;
  await prisma.whatsAppFlowExecution.update({
    where: { id: executionId },
    data: {
      context: mergeExecutionContext(ctx, {
        ...patch,
        lockedAt: null,
        lockToken: null,
        lockExpiresAt: null,
      }),
    },
  });
}

async function bumpFlowCounts(flowId: string, success: boolean) {
  await prisma.whatsAppFlow.update({
    where: { id: flowId },
    data: {
      lastRunAt: new Date(),
      ...(success ? { successCount: { increment: 1 } } : { failureCount: { increment: 1 } }),
    },
  });
}

async function scheduleRetryOrFail(
  executionId: string,
  clinicId: string,
  error: string,
  retryable: boolean,
) {
  const row = await prisma.whatsAppFlowExecution.findFirst({ where: { id: executionId, clinicId } });
  if (!row) return;
  const ctx = parseExecutionContext(row.context);
  const retryCount = (ctx.retryCount ?? 0) + 1;
  const maxRetries = ctx.maxRetries ?? DEFAULT_MAX_RETRIES;
  if (retryable && retryCount <= maxRetries) {
    const delayMs = Math.min(60_000 * 2 ** (retryCount - 1), 30 * 60_000);
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
    await prisma.whatsAppFlowExecution.update({
      where: { id: executionId },
      data: {
        status: "WAITING",
        error,
        resumeAt: new Date(nextRetryAt),
        context: mergeExecutionContext(ctx, {
          retryCount,
          maxRetries,
          lastError: error,
          lastAttemptAt: new Date().toISOString(),
          nextRetryAt,
          lockedAt: null,
          lockToken: null,
          lockExpiresAt: null,
        }),
      },
    });
    return;
  }
  await prisma.whatsAppFlowExecution.update({
    where: { id: executionId },
    data: {
      status: "FAILED",
      error,
      completedAt: new Date(),
      context: mergeExecutionContext(ctx, {
        retryCount,
        lastError: error,
        lastAttemptAt: new Date().toISOString(),
        nextRetryAt: null,
        lockedAt: null,
        lockToken: null,
        lockExpiresAt: null,
      }),
    },
  });
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof IntegrationError) {
    if (err.retryable) return true;
    return classifyRetry({ code: err.code, httpStatus: err.httpStatus }).retryable;
  }
  if (err instanceof HttpError) {
    return err.status === 429 || err.status >= 500;
  }
  return false;
}

/**
 * Advances a flow execution. WAIT nodes set status WAITING + resumeAt (durable).
 * Worker tick resumes due executions with locking.
 */
export async function runExecution(
  tenant: TenantContext,
  executionId: string,
  opts?: { simulation?: boolean; maxSteps?: number; skipLock?: boolean },
) {
  const simulation = opts?.simulation ?? false;
  const maxSteps = opts?.maxSteps ?? 40;

  let lockToken: string | null = null;
  if (!simulation && !opts?.skipLock) {
    lockToken = await tryAcquireLock(executionId, tenant.clinicId);
    if (!lockToken) {
      throw new HttpError(409, "EXECUTION_LOCKED", "This execution is already being processed.");
    }
  }

  try {
    const execution = await prisma.whatsAppFlowExecution.findFirst({
      where: { id: executionId, clinicId: tenant.clinicId },
      include: { flow: true },
    });
    if (!execution) throw new HttpError(404, "NOT_FOUND", "Execution not found");
    if (["COMPLETED", "FAILED", "CANCELLED", "ESCALATED"].includes(execution.status)) {
      return execution;
    }

    const definition = parseDefinition(execution.flow.definition);
    let ctx = parseExecutionContext(execution.context);
    const vars = { ...(ctx.vars ?? {}) } as CtxVars;
    let tags = [...(ctx.tags ?? [])];
    let currentId: string | null =
      execution.currentNodeId ?? definition.nodes.find((n) => n.type === "TRIGGER")?.id ?? null;
    if (!currentId) {
      await scheduleRetryOrFail(execution.id, tenant.clinicId, "No trigger node", false);
      throw new HttpError(422, "INVALID_FLOW", "Flow has no trigger node");
    }

    await prisma.whatsAppFlowExecution.update({
      where: { id: execution.id },
      data: { status: "RUNNING", error: null },
    });

    let steps = 0;
    while (currentId && steps < maxSteps) {
      steps += 1;
      const node = definition.nodes.find((n) => n.id === currentId);
      if (!node) {
        await scheduleRetryOrFail(execution.id, tenant.clinicId, `Missing node ${currentId}`, false);
        break;
      }

      // Skip re-running WAIT when worker advanced past it already (current is next)
      const step = await prisma.whatsAppFlowExecutionStep.create({
        data: {
          executionId: execution.id,
          nodeId: node.id,
          nodeType: node.type,
          status: "RUNNING",
          startedAt: new Date(),
          input: node.config as Prisma.InputJsonValue,
        },
      });

      try {
        const result = await executeNode(
          tenant,
          execution,
          node,
          definition,
          vars,
          tags,
          simulation,
          ctx,
        );
        if (result.tags) tags = result.tags;
        await prisma.whatsAppFlowExecutionStep.update({
          where: { id: step.id },
          data: {
            status:
              result.output &&
              typeof result.output === "object" &&
              "skipped" in result.output &&
              (result.output as { skipped?: boolean }).skipped
                ? "SKIPPED"
                : "COMPLETED",
            completedAt: new Date(),
            output: result.output as Prisma.InputJsonValue,
            ...((result.output as { reason?: string } | undefined)?.reason
              ? { error: String((result.output as { reason: string }).reason).slice(0, 500) }
              : {}),
          },
        });

        if (result.waitUntil) {
          ctx = {
            ...ctx,
            vars,
            tags,
            simulation,
            waitNextNodeId: result.nextNodeId ?? null,
          };
          await prisma.whatsAppFlowExecution.update({
            where: { id: execution.id },
            data: {
              status: "WAITING",
              currentNodeId: node.id,
              resumeAt: result.waitUntil,
              context: mergeExecutionContext(ctx, {
                lockedAt: null,
                lockToken: null,
                lockExpiresAt: null,
              }),
            },
          });
          return prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: execution.id } });
        }

        if (result.escalated) {
          await prisma.whatsAppFlowExecution.update({
            where: { id: execution.id },
            data: {
              status: "ESCALATED",
              completedAt: new Date(),
              currentNodeId: node.id,
              context: mergeExecutionContext(ctx, { vars, tags, simulation }),
            },
          });
          await bumpFlowCounts(execution.flowId, true);
          return prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: execution.id } });
        }

        if (result.done || node.type === "END") {
          await prisma.whatsAppFlowExecution.update({
            where: { id: execution.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              currentNodeId: node.id,
              context: mergeExecutionContext(ctx, { vars, tags, simulation }),
            },
          });
          await bumpFlowCounts(execution.flowId, true);
          return prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: execution.id } });
        }

        currentId = result.nextNodeId ?? null;
        ctx = { ...ctx, vars, tags, simulation };
        await prisma.whatsAppFlowExecution.update({
          where: { id: execution.id },
          data: {
            currentNodeId: currentId,
            context: mergeExecutionContext(ctx, {}),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Step failed";
        await prisma.whatsAppFlowExecutionStep.update({
          where: { id: step.id },
          data: { status: "FAILED", completedAt: new Date(), error: message },
        });
        const retryable = isRetryableError(err);
        await scheduleRetryOrFail(execution.id, tenant.clinicId, message, retryable);
        if (!retryable) await bumpFlowCounts(execution.flowId, false);
        throw err;
      }
    }

    return prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: execution.id } });
  } finally {
    if (lockToken) {
      await releaseLock(executionId, tenant.clinicId, lockToken).catch(() => undefined);
    }
  }
}

async function executeNode(
  tenant: TenantContext,
  execution: { id: string; patientId: string | null; coupleId: string | null; conversationId: string | null },
  node: FlowNode,
  definition: FlowDefinition,
  vars: CtxVars,
  tags: string[],
  simulation: boolean,
  _ctx: ExecutionContext,
): Promise<{
  output: Record<string, unknown>;
  nextNodeId?: string | null;
  waitUntil?: Date;
  done?: boolean;
  escalated?: boolean;
  tags?: string[];
}> {
  switch (node.type) {
    case "TRIGGER": {
      const next = nextNodes(definition, node.id)[0];
      return { output: { ok: true }, nextNodeId: next?.id ?? null };
    }
    case "WAIT": {
      const until = waitUntilFromConfig(node.config, vars);
      const next = nextNodes(definition, node.id)[0];
      if (simulation) {
        return {
          output: { simulatedWaitUntil: until.toISOString(), mode: node.config["mode"] ?? "duration" },
          nextNodeId: next?.id ?? null,
        };
      }
      // If resume already past (misconfigured past date), continue immediately
      if (until.getTime() <= Date.now()) {
        return { output: { waitSkipped: true, reason: "resumeAt already due" }, nextNodeId: next?.id ?? null };
      }
      return {
        output: { waitUntil: until.toISOString(), mode: node.config["mode"] ?? "duration" },
        nextNodeId: next?.id ?? null,
        waitUntil: until,
      };
    }
    case "CONDITION": {
      const evaluated = await evaluateCondition(node.config, {
        clinicId: tenant.clinicId,
        patientId: execution.patientId,
        coupleId: execution.coupleId,
        conversationId: execution.conversationId,
        vars,
        tags,
        simulation,
      });
      const next =
        nextNodes(definition, node.id, evaluated.branch)[0] ??
        nextNodes(definition, node.id, "default")[0];
      return {
        output: evaluated as unknown as Record<string, unknown>,
        nextNodeId: next?.id ?? null,
      };
    }
    case "SEND_TEMPLATE": {
      const templateName = String(node.config["templateName"] ?? "");
      const keys = Array.isArray(node.config["variableKeys"])
        ? (node.config["variableKeys"] as string[])
        : [];
      const params = resolveTemplateParams(keys, vars);
      const next = nextNodes(definition, node.id)[0];
      if (simulation) {
        return {
          output: { simulation: true, templateName, params, note: "TEST MODE — NO MESSAGE WILL BE SENT" },
          nextNodeId: next?.id ?? null,
        };
      }

      const settings = await getClinicCommSettings(tenant.clinicId);
      const consent = await assertAutomationConsent({
        clinicId: tenant.clinicId,
        patientId: execution.patientId,
        requireGranted: settings.requireConsentGranted,
      });
      if (!consent.ok) {
        if (execution.patientId) {
          await prisma.careTask
            .create({
              data: {
                clinicId: tenant.clinicId,
                coupleId: execution.coupleId,
                title: "Request WhatsApp consent",
                description: consent.reason,
                category: "WHATSAPP_CONSENT",
                status: "WAITING",
                priority: "NORMAL",
              },
            })
            .catch(() => undefined);
        }
        return {
          output: { skipped: true, reason: consent.reason },
          nextNodeId: next?.id ?? null,
        };
      }

      const freq = await checkFrequencyLimits({
        clinicId: tenant.clinicId,
        patientId: execution.patientId,
        maxPerDay: settings.maxMessagesPerDay,
        minDelayMinutes: settings.minDelayMinutes,
      });
      if (!freq.ok) {
        return { output: { skipped: true, reason: freq.reason }, nextNodeId: next?.id ?? null };
      }

      const missing = missingRequiredVars(keys, vars);
      if (missing.length) {
        return {
          output: {
            skipped: true,
            reason: `Required variable unavailable: ${missing.join(", ")}`,
          },
          nextNodeId: next?.id ?? null,
        };
      }

      const defer = nextWorkingWindowStart(new Date(), settings.workingHours);
      if (defer) {
        return {
          output: {
            deferred: true,
            reason: "Outside clinic working hours — waiting until next allowed window.",
            resumeAt: defer.toISOString(),
          },
          nextNodeId: node.id,
          waitUntil: defer,
        };
      }

      const template = await loadApprovedTemplate(tenant.clinicId, templateName);
      if (!template) {
        throw new HttpError(
          422,
          "TEMPLATE_NOT_APPROVED",
          `Reminder node requires an approved WhatsApp template. "${templateName}" is not approved by Meta for this clinic.`,
        );
      }
      if (!execution.patientId && !execution.conversationId) {
        throw new HttpError(422, "NO_RECIPIENT", "Patient or conversation required to send WhatsApp.");
      }
      const sendResult = await sendWhatsAppTemplate(tenant, {
        templateId: template.id,
        parameters: params,
        ...(execution.conversationId ? { conversationId: execution.conversationId } : {}),
        ...(execution.patientId ? { patientId: execution.patientId } : {}),
      });
      return {
        output: { templateId: template.id, sendResult },
        nextNodeId: next?.id ?? null,
      };
    }
    case "SEND_TEXT": {
      return {
        output: {
          skipped: true,
          reason: "Free-text WhatsApp send is not enabled. Use an approved SEND_TEMPLATE node.",
        },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
    }
    case "CREATE_TASK":
    case "ASSIGN_TASK": {
      const title = String(node.config["title"] ?? "WhatsApp automation follow-up");
      const priority = (String(node.config["priority"] ?? "NORMAL") as "LOW" | "NORMAL" | "HIGH") || "NORMAL";
      const assigneeId = typeof node.config["assigneeId"] === "string" ? node.config["assigneeId"] : null;
      if (simulation) {
        return {
          output: { simulation: true, title, assigneeId },
          nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
        };
      }
      const systemActor = tenant.userId === "system-worker" || !tenant.userId;
      const task = await prisma.careTask.create({
        data: {
          clinicId: tenant.clinicId,
          coupleId: execution.coupleId,
          title,
          description: String(node.config["description"] ?? "Created by WhatsApp automation flow"),
          category: "WHATSAPP_AUTOMATION",
          status: "WAITING",
          priority,
          ...(systemActor ? {} : { createdById: tenant.userId }),
          ...(assigneeId ? { assignments: { create: { userId: assigneeId } } } : {}),
        },
      });
      if (!systemActor) {
        await audit(tenant, "whatsapp.flow.create_task", "CareTask", task.id, { executionId: execution.id });
      }
      return {
        output: { careTaskId: task.id },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
    }
    case "ADD_TAG": {
      const tag = String(node.config["tag"] ?? "").trim();
      const nextTags = tag && !tags.includes(tag) ? [...tags, tag] : tags;
      return {
        output: { tags: nextTags, note: "Tags stored on execution context (clinic-scoped run)." },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
        tags: nextTags,
      };
    }
    case "REMOVE_TAG": {
      const tag = String(node.config["tag"] ?? "").trim();
      const nextTags = tags.filter((t) => t !== tag);
      return {
        output: { tags: nextTags },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
        tags: nextTags,
      };
    }
    case "ESCALATE":
    case "NOTIFY_STAFF": {
      const title = String(node.config["title"] ?? node.config["reason"] ?? "WhatsApp automation needs attention");
      const body = String(node.config["body"] ?? node.config["reason"] ?? "A patient conversation requires staff.");
      const systemActor = tenant.userId === "system-worker" || !tenant.userId;
      if (!simulation) {
        if (!systemActor) {
          await prisma.notification
            .create({
              data: {
                clinicId: tenant.clinicId,
                userId: tenant.userId,
                title,
                body,
                href: "/whatsapp/inbox",
              },
            })
            .catch(() => undefined);
        }
        if (node.type === "ESCALATE") {
          await prisma.careTask.create({
            data: {
              clinicId: tenant.clinicId,
              coupleId: execution.coupleId,
              title: `Escalate: ${title}`,
              description: body,
              category: "WHATSAPP_HANDOFF",
              status: "WAITING",
              priority: "HIGH",
              ...(systemActor ? {} : { createdById: tenant.userId }),
            },
          });
        }
      }
      return {
        output: { notified: true, simulation },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
        escalated: node.type === "ESCALATE",
      };
    }
    case "AI_DRAFT": {
      return {
        output: {
          note: "AI draft is available via Smrko AI chat — not auto-sent. Human must review.",
        },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
    }
    case "MEDICATION_LOOKUP": {
      const reminderId = String(node.config["reminderId"] ?? vars["medication_reminder_id"] ?? "");
      const itemId = String(node.config["prescriptionItemId"] ?? vars["prescription_item_id"] ?? "");
      let enriched: Record<string, string> = {};
      if (reminderId) {
        const reminder = await prisma.medicationReminder.findFirst({
          where: { id: reminderId, clinicId: tenant.clinicId },
          include: { prescriptionItem: true },
        });
        if (reminder) {
          enriched = {
            medicine_name: reminder.prescriptionItem.medicineName,
            medicine_dosage: reminder.prescriptionItem.dosage ?? "",
            medicine_time: reminder.prescriptionItem.timeOfDay ?? "",
            medicine_instructions: reminder.prescriptionItem.instructions ?? "",
          };
          Object.assign(vars, enriched);
        }
      } else if (itemId) {
        const item = await prisma.pharmacyPrescriptionItem.findFirst({
          where: { id: itemId, prescription: { clinicId: tenant.clinicId } },
        });
        if (item) {
          enriched = {
            medicine_name: item.medicineName,
            medicine_dosage: item.dosage ?? "",
            medicine_time: item.timeOfDay ?? "",
            medicine_instructions: item.instructions ?? "",
          };
          Object.assign(vars, enriched);
        }
      }
      return {
        output: { enriched: Object.keys(enriched).length > 0, ...enriched },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
    }
    case "PATIENT_LOOKUP": {
      const patientId = execution.patientId ?? String(node.config["patientId"] ?? vars["patient_id"] ?? "");
      let enriched: Record<string, string> = {};
      if (patientId) {
        const patient = await prisma.patient.findFirst({
          where: { id: patientId, clinicId: tenant.clinicId },
        });
        if (patient) {
          enriched = {
            patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
            patient_phone: patient.phone ?? "",
          };
          Object.assign(vars, enriched);
        }
      }
      return {
        output: { enriched: Object.keys(enriched).length > 0, ...enriched },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
    }
    case "APPOINTMENT_LOOKUP": {
      const appointmentId = String(node.config["appointmentId"] ?? vars["appointment_id"] ?? "");
      let enriched: Record<string, string> = {};
      if (appointmentId) {
        const appt = await prisma.appointment.findFirst({
          where: { id: appointmentId, clinicId: tenant.clinicId },
        });
        if (appt) {
          enriched = {
            appointment_id: appt.id,
            appointment_date: appt.startsAt.toISOString().slice(0, 10),
            appointment_time: appt.startsAt.toISOString().slice(11, 16),
            doctor_name: appt.doctorName ?? "",
          };
          Object.assign(vars, enriched);
        }
      }
      return {
        output: { enriched: Object.keys(enriched).length > 0, ...enriched },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
    }
    case "ASSIGN_STAFF": {
      return {
        output: { skipped: true, reason: "Use ASSIGN_TASK with assigneeId, or Inbox handoff." },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
    }
    case "END":
      return { output: { done: true }, done: true };
    default:
      return {
        output: { skipped: true, type: node.type },
        nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
      };
  }
}

export async function startFlowExecution(input: {
  tenant: TenantContext;
  flowId: string;
  triggerEventId: string;
  patientId?: string | null;
  coupleId?: string | null;
  conversationId?: string | null;
  vars?: CtxVars;
  simulation?: boolean;
}) {
  const flow = await prisma.whatsAppFlow.findFirst({
    where: { id: input.flowId, clinicId: input.tenant.clinicId },
  });
  if (!flow) throw new HttpError(404, "NOT_FOUND", "Flow not found");
  if (!input.simulation && flow.status !== "ACTIVE") {
    throw new HttpError(422, "FLOW_NOT_ACTIVE", "Activate the flow before live execution.");
  }

  const idempotencyKey = buildIdempotencyKey({
    clinicId: input.tenant.clinicId,
    flowId: flow.id,
    triggerType: flow.triggerType,
    triggerEventId: input.simulation ? `sim_${input.triggerEventId}_${Date.now()}` : input.triggerEventId,
    patientId: input.patientId ?? null,
  });

  const existing = await prisma.whatsAppFlowExecution.findUnique({
    where: { clinicId_idempotencyKey: { clinicId: input.tenant.clinicId, idempotencyKey } },
  });
  if (existing && !input.simulation) {
    return { execution: existing, duplicate: true as const };
  }

  const definition = parseDefinition(flow.definition) as FlowDefinition;
  const triggerNode = definition.nodes.find((n) => n.type === "TRIGGER");

  const execution = await prisma.whatsAppFlowExecution.create({
    data: {
      clinicId: input.tenant.clinicId,
      flowId: flow.id,
      status: "PENDING",
      triggerType: flow.triggerType,
      triggerEventId: input.triggerEventId,
      idempotencyKey,
      patientId: input.patientId ?? null,
      coupleId: input.coupleId ?? null,
      conversationId: input.conversationId ?? null,
      currentNodeId: triggerNode?.id ?? null,
      context: {
        vars: input.vars ?? {},
        simulation: Boolean(input.simulation),
        retryCount: 0,
        maxRetries: DEFAULT_MAX_RETRIES,
        tags: [],
      } as Prisma.InputJsonValue,
    },
  });

  const ran = await runExecution(input.tenant, execution.id, {
    simulation: Boolean(input.simulation),
  });
  return { execution: ran, duplicate: false as const };
}

export async function retryFailedExecution(tenant: TenantContext, executionId: string) {
  const row = await prisma.whatsAppFlowExecution.findFirst({
    where: { id: executionId, clinicId: tenant.clinicId },
  });
  if (!row) throw new HttpError(404, "NOT_FOUND", "Execution not found");
  if (row.status !== "FAILED") {
    throw new HttpError(422, "NOT_FAILED", "Only FAILED executions can be retried manually.");
  }
  const ctx = parseExecutionContext(row.context);
  await prisma.whatsAppFlowExecution.update({
    where: { id: row.id },
    data: {
      status: "PENDING",
      error: null,
      completedAt: null,
      context: mergeExecutionContext(ctx, {
        lastError: null,
        nextRetryAt: null,
        lockedAt: null,
        lockToken: null,
        lockExpiresAt: null,
      }),
    },
  });
  return runExecution(tenant, row.id);
}

/** Resume WAIT / retry-due executions with locking. Called by worker tick.
 * Optional clinicId scopes work to one clinic (required for session-authenticated ticks).
 */
export async function resumeDueExecutions(limit = 20, clinicId?: string) {
  const due = await prisma.whatsAppFlowExecution.findMany({
    where: {
      status: "WAITING",
      resumeAt: { lte: new Date() },
      ...(clinicId ? { clinicId } : {}),
    },
    take: limit,
    orderBy: { resumeAt: "asc" },
  });
  const results: Array<{ id: string; status?: string; error?: string; skipped?: string }> = [];
  for (const row of due) {
    const clinic = await prisma.clinic.findUnique({ where: { id: row.clinicId } });
    if (!clinic) continue;
    const fullTenant: TenantContext = {
      userId: "system-worker",
      role: "CLINIC_ADMIN",
      clinicId: row.clinicId,
      organizationId: clinic.organizationId,
      clinicName: clinic.name,
      organizationName: "",
    };
    const lockToken = await tryAcquireLock(row.id, row.clinicId);
    if (!lockToken) {
      results.push({ id: row.id, skipped: "locked" });
      continue;
    }
    try {
      const flow = await prisma.whatsAppFlow.findUnique({ where: { id: row.flowId } });
      if (!flow || flow.status !== "ACTIVE") {
        await prisma.whatsAppFlowExecution.update({
          where: { id: row.id },
          data: {
            status: "CANCELLED",
            error: "Flow is not ACTIVE",
            completedAt: new Date(),
            resumeAt: null,
          },
        });
        results.push({ id: row.id, status: "CANCELLED" });
        continue;
      }
      const def = parseDefinition(flow.definition);
      const ctx = parseExecutionContext(row.context);
      const waitId = row.currentNodeId;
      const waitNode = waitId ? def.nodes.find((n) => n.id === waitId) : null;
      // Advance past WAIT (or retry mid-node if nextRetry)
      let nextId = row.currentNodeId;
      if (waitNode?.type === "WAIT" || ctx.waitNextNodeId) {
        nextId =
          ctx.waitNextNodeId ?? (waitId ? nextNodes(def, waitId)[0]?.id : null) ?? row.currentNodeId;
      }
      await prisma.whatsAppFlowExecution.update({
        where: { id: row.id },
        data: {
          status: "RUNNING",
          currentNodeId: nextId,
          resumeAt: null,
          context: mergeExecutionContext(ctx, { waitNextNodeId: null }),
        },
      });
      const ran = await runExecution(fullTenant, row.id, { skipLock: true });
      results.push({ id: row.id, status: ran.status });
    } catch (err) {
      results.push({ id: row.id, error: err instanceof Error ? err.message : "resume failed" });
    } finally {
      await releaseLock(row.id, row.clinicId, lockToken).catch(() => undefined);
    }
  }
  return results;
}
