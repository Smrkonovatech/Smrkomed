import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { HttpError } from "../../lib/errors";
import { IntegrationError } from "../../integrations/core/errors";
import { classifyRetry } from "../../integrations/core/retry";
import {
  sendWhatsAppSessionText,
  sendWhatsAppTemplate,
} from "../../integrations/providers/whatsapp/messaging";
import { sendPatientDocumentOverWhatsApp } from "../../integrations/providers/whatsapp/outbound-media";
import {
  buildOrderedParameters,
  parseWhatsAppTemplateComponents,
} from "../../integrations/providers/whatsapp/template-variables";
import { resolveTemplateVariables } from "../../integrations/providers/whatsapp/variable-resolver";
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
  nextWorkingWindowStart,
} from "./safety";
import {
  applyVariableMappings,
  effectiveVariableMappings,
  parseSendTemplateConfig,
} from "./template-node-config";

export { buildIdempotencyKey };
type CtxVars = Record<string, string>;

type SendResultShape = { id?: string; providerMessageId?: string | null; status?: string };

/** If a prior COMPLETED step for this node already sent to Meta, reuse output (outbound idempotency). */
async function findPriorSuccessfulSend(
  executionId: string,
  nodeId: string,
): Promise<{ output: Record<string, unknown>; nextNodeId: string | null } | null> {
  const prior = await prisma.whatsAppFlowExecutionStep.findMany({
    where: { executionId, nodeId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  for (const step of prior) {
    const output =
      step.output && typeof step.output === "object" && !Array.isArray(step.output)
        ? (step.output as Record<string, unknown>)
        : null;
    if (!output) continue;
    const sendResult = output["sendResult"] as SendResultShape | undefined;
    if (sendResult?.providerMessageId || sendResult?.id) {
      const nextNodeId =
        typeof output["idempotentNextNodeId"] === "string" ? output["idempotentNextNodeId"] : null;
      return { output: { ...output, idempotentReplay: true }, nextNodeId };
    }
  }
  return null;
}

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

async function loadApprovedTemplateByConfig(
  clinicId: string,
  cfg: ReturnType<typeof parseSendTemplateConfig>,
) {
  if (cfg.templateId) {
    return prisma.whatsAppTemplate.findFirst({
      where: { id: cfg.templateId, clinicId, status: "APPROVED" },
    });
  }
  if (cfg.templateName) {
    return prisma.whatsAppTemplate.findFirst({
      where: {
        clinicId,
        name: cfg.templateName,
        status: "APPROVED",
        ...(cfg.templateLanguage ? { language: cfg.templateLanguage } : {}),
      },
    });
  }
  return null;
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

      // Outbound send nodes: skip Meta if a prior COMPLETED step already produced a provider id.
      if (
        !simulation &&
        (node.type === "SEND_TEMPLATE" || node.type === "SEND_TEXT" || node.type === "SEND_MEDIA")
      ) {
        const priorSend = await findPriorSuccessfulSend(execution.id, node.id);
        if (priorSend) {
          const nextId =
            priorSend.nextNodeId ??
            nextNodes(definition, node.id)[0]?.id ??
            null;
          await prisma.whatsAppFlowExecutionStep.create({
            data: {
              executionId: execution.id,
              nodeId: node.id,
              nodeType: node.type,
              status: "COMPLETED",
              startedAt: new Date(),
              completedAt: new Date(),
              input: node.config as Prisma.InputJsonValue,
              output: {
                ...priorSend.output,
                idempotentReplay: true,
                note: "Skipped Meta send — prior step already delivered (outbound idempotency).",
              } as Prisma.InputJsonValue,
            },
          });
          currentId = nextId;
          ctx = { ...ctx, vars, tags, simulation };
          await prisma.whatsAppFlowExecution.update({
            where: { id: execution.id },
            data: {
              currentNodeId: currentId,
              context: mergeExecutionContext(ctx, {}),
            },
          });
          if (!currentId) {
            await prisma.whatsAppFlowExecution.update({
              where: { id: execution.id },
              data: {
                status: "COMPLETED",
                completedAt: new Date(),
                context: mergeExecutionContext(ctx, { vars, tags, simulation }),
              },
            });
            await bumpFlowCounts(execution.flowId, true);
            return prisma.whatsAppFlowExecution.findUniqueOrThrow({ where: { id: execution.id } });
          }
          continue;
        }
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

        if (result.waitUntil || result.waitForReply) {
          ctx = {
            ...ctx,
            vars,
            tags,
            simulation,
            waitNextNodeId: result.nextNodeId ?? null,
            waitKind: result.waitForReply ? "reply" : (ctx.waitKind ?? "delay"),
          };
          await prisma.whatsAppFlowExecution.update({
            where: { id: execution.id },
            data: {
              status: "WAITING",
              currentNodeId: node.id,
              resumeAt: result.waitUntil ?? null,
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
  waitUntil?: Date | null;
  waitForReply?: boolean;
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
      const mode = String(node.config["mode"] ?? "duration");
      if (mode === "wait_for_reply") {
        const next = nextNodes(definition, node.id)[0];
        const timeoutHours = Number(node.config["timeoutHours"] ?? 0);
        if (simulation) {
          return {
            output: {
              simulation: true,
              waitKind: "reply",
              note: "TEST MODE — wait-for-reply skipped; continuing as if patient replied",
            },
            nextNodeId: next?.id ?? null,
          };
        }
        if (!execution.conversationId) {
          return {
            output: {
              skipped: true,
              reason: "WAIT_FOR_REPLY requires conversationId on the execution.",
            },
            nextNodeId: next?.id ?? null,
          };
        }
        const waitUntil =
          timeoutHours > 0 ? new Date(Date.now() + timeoutHours * 3_600_000) : null;
        return {
          output: {
            waitKind: "reply",
            conversationId: execution.conversationId,
            timeoutHours: timeoutHours || null,
            resumeAt: waitUntil?.toISOString() ?? null,
          },
          nextNodeId: next?.id ?? null,
          waitForReply: true,
          ...(waitUntil ? { waitUntil } : {}),
        };
      }
      const until = waitUntilFromConfig(node.config, vars);
      const next = nextNodes(definition, node.id)[0];
      if (simulation) {
        return {
          output: { simulatedWaitUntil: until.toISOString(), mode: node.config["mode"] ?? "duration" },
          nextNodeId: next?.id ?? null,
        };
      }
      if (until.getTime() <= Date.now()) {
        return { output: { waitSkipped: true, reason: "resumeAt already due" }, nextNodeId: next?.id ?? null };
      }
      return {
        output: { waitUntil: until.toISOString(), mode: node.config["mode"] ?? "duration", waitKind: "delay" },
        nextNodeId: next?.id ?? null,
        waitUntil: until,
      };
    }
    case "WAIT_FOR_REPLY": {
      const next = nextNodes(definition, node.id)[0];
      const timeoutHours = Number(node.config["timeoutHours"] ?? 0);
      if (simulation) {
        return {
          output: {
            simulation: true,
            waitKind: "reply",
            note: "TEST MODE — wait-for-reply skipped; continuing as if patient replied",
          },
          nextNodeId: next?.id ?? null,
        };
      }
      if (!execution.conversationId) {
        return {
          output: {
            skipped: true,
            reason: "WAIT_FOR_REPLY requires conversationId on the execution.",
          },
          nextNodeId: next?.id ?? null,
        };
      }
      const waitUntil =
        timeoutHours > 0 ? new Date(Date.now() + timeoutHours * 3_600_000) : null;
      return {
        output: {
          waitKind: "reply",
          conversationId: execution.conversationId,
          flowId: undefined,
          executionHint: "Persisted WAITING until inbound WhatsApp on conversationId",
          timeoutHours: timeoutHours || null,
          resumeAt: waitUntil?.toISOString() ?? null,
        },
        nextNodeId: next?.id ?? null,
        waitForReply: true,
        ...(waitUntil ? { waitUntil } : {}),
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
      const cfg = parseSendTemplateConfig(node.config);
      const next = nextNodes(definition, node.id)[0];

      const templateRow = cfg.templateId
        ? await prisma.whatsAppTemplate.findFirst({
            where: { id: cfg.templateId, clinicId: tenant.clinicId },
          })
        : cfg.templateName
          ? await prisma.whatsAppTemplate.findFirst({
              where: {
                clinicId: tenant.clinicId,
                name: cfg.templateName,
                ...(cfg.templateLanguage ? { language: cfg.templateLanguage } : {}),
              },
            })
          : null;

      if (!templateRow) {
        if (simulation) {
          return {
            output: {
              simulation: true,
              error: "TEMPLATE_NOT_FOUND",
              templateId: cfg.templateId ?? null,
              templateName: cfg.templateName ?? null,
              note: "TEST MODE — NO MESSAGE WILL BE SENT",
              reason: "Template was not found for this clinic (tenant isolation).",
            },
            nextNodeId: next?.id ?? null,
          };
        }
        throw new HttpError(
          422,
          "TEMPLATE_NOT_FOUND",
          `Send Template node "${node.label}" references a template that was not found for this clinic.`,
        );
      }

      if (templateRow.status !== "APPROVED") {
        if (simulation) {
          return {
            output: {
              simulation: true,
              error: "TEMPLATE_NOT_APPROVED",
              templateId: templateRow.id,
              templateName: templateRow.name,
              status: templateRow.status,
              note: "TEST MODE — NO MESSAGE WILL BE SENT",
              reason: `Template "${templateRow.name}" is ${templateRow.status}, not APPROVED.`,
            },
            nextNodeId: next?.id ?? null,
          };
        }
        throw new HttpError(
          422,
          "TEMPLATE_NOT_APPROVED",
          `Template "${templateRow.name}" is not APPROVED by Meta for this clinic.`,
        );
      }

      const parsed = parseWhatsAppTemplateComponents(templateRow.components);
      const mappings = effectiveVariableMappings(cfg, parsed.variables);
      const appointmentId = vars["appointment_id"] || vars["appointmentId"] || undefined;
      const careTaskId = vars["care_task_id"] || vars["careTaskId"] || undefined;
      const treatmentId = vars["treatment_id"] || vars["treatmentId"] || undefined;

      const resolved = await resolveTemplateVariables(tenant, {
        patientId: execution.patientId,
        coupleId: execution.coupleId,
        ...(appointmentId ? { appointmentId } : {}),
        ...(careTaskId ? { careTaskId } : {}),
        ...(treatmentId ? { treatmentId } : {}),
        previousNodeOutput: vars,
      });

      const applied = applyVariableMappings(
        parsed.variables,
        mappings,
        resolved.values,
        vars,
      );

      const headerParams = buildOrderedParameters(parsed.variables, "HEADER", applied.values);
      const bodyParams = buildOrderedParameters(parsed.variables, "BODY", applied.values);
      const buttonGroups = new Map<number, string[]>();
      for (const slot of parsed.variables.filter((s) => s.component === "BUTTON")) {
        const idx = slot.buttonIndex ?? 0;
        if (!buttonGroups.has(idx)) {
          buttonGroups.set(idx, buildOrderedParameters(parsed.variables, "BUTTON", applied.values, idx));
        }
      }
      const componentParameters = {
        header: headerParams,
        body: bodyParams,
        buttons: [...buttonGroups.entries()].map(([index, parameters]) => ({
          index,
          parameters,
          subType:
            parsed.variables.find((s) => s.buttonIndex === index)?.buttonType ?? "url",
        })),
      };

      if (simulation) {
        return {
          output: {
            simulation: true,
            templateId: templateRow.id,
            templateName: templateRow.name,
            templateLanguage: templateRow.language,
            status: templateRow.status,
            variableMappings: mappings,
            mappedSources: applied.mapped,
            resolvedPreview: Object.fromEntries(
              parsed.variables.map((s) => [s.key, applied.values[s.key] ?? ""]),
            ),
            missingVariables: applied.missing,
            valid: applied.missing.length === 0,
            note: "TEST MODE — NO MESSAGE WILL BE SENT. Sample preview values are never used for live sends.",
            ...(applied.missing.length
              ? {
                  reason: `Missing required variable mapping/value: ${applied.missing.join(", ")}`,
                }
              : {}),
          },
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

      if (applied.missing.length) {
        return {
          output: {
            skipped: true,
            reason: `Required variable unavailable: ${applied.missing.join(", ")}`,
            templateId: templateRow.id,
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

      const template = await loadApprovedTemplateByConfig(tenant.clinicId, {
        ...cfg,
        templateId: templateRow.id,
      });
      if (!template) {
        throw new HttpError(
          422,
          "TEMPLATE_NOT_APPROVED",
          `Template "${templateRow.name}" is not approved by Meta for this clinic.`,
        );
      }
      if (!execution.patientId && !execution.conversationId) {
        throw new HttpError(422, "NO_RECIPIENT", "Patient or conversation required to send WhatsApp.");
      }
      const sendResult = await sendWhatsAppTemplate(tenant, {
        templateId: template.id,
        parameters: bodyParams,
        componentParameters,
        ...(execution.conversationId ? { conversationId: execution.conversationId } : {}),
        ...(execution.patientId ? { patientId: execution.patientId } : {}),
      });
      return {
        output: {
          templateId: template.id,
          templateName: template.name,
          sendResult,
          mappingsApplied: applied.mapped,
          idempotentNextNodeId: next?.id ?? null,
        },
        nextNodeId: next?.id ?? null,
      };
    }
    case "SEND_TEXT": {
      const body = String(node.config["body"] ?? node.config["text"] ?? "").trim();
      const next = nextNodes(definition, node.id)[0];
      if (simulation) {
        return {
          output: {
            simulation: true,
            body,
            note: "TEST MODE — NO MESSAGE WILL BE SENT",
            requires: "Open WhatsApp customer-care session (conversationId)",
          },
          nextNodeId: next?.id ?? null,
        };
      }
      if (!body) {
        return {
          output: { skipped: true, reason: "Send Text node has empty body." },
          nextNodeId: next?.id ?? null,
        };
      }
      if (!execution.conversationId) {
        return {
          output: {
            skipped: true,
            reason:
              "SEND_TEXT requires an open conversation (24h session window). Use SEND_TEMPLATE outside the session window.",
          },
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
        return { output: { skipped: true, reason: consent.reason }, nextNodeId: next?.id ?? null };
      }
      const sendResult = await sendWhatsAppSessionText(tenant, {
        conversationId: execution.conversationId,
        body,
      });
      return {
        output: {
          sendResult,
          channel: "session_text",
          idempotentNextNodeId: next?.id ?? null,
        },
        nextNodeId: next?.id ?? null,
      };
    }
    case "SEND_MEDIA": {
      const documentId = String(node.config["documentId"] ?? "").trim();
      const caption = String(node.config["caption"] ?? "").trim();
      const next = nextNodes(definition, node.id)[0];
      if (simulation) {
        return {
          output: {
            simulation: true,
            documentId: documentId || null,
            caption: caption || null,
            note: "TEST MODE — NO MESSAGE WILL BE SENT",
            requires: "conversationId + patient document with storageKey",
          },
          nextNodeId: next?.id ?? null,
        };
      }
      if (!documentId) {
        return {
          output: {
            skipped: true,
            reason: "SEND_MEDIA needs documentId from clinic patient documents.",
          },
          nextNodeId: next?.id ?? null,
        };
      }
      if (!execution.conversationId) {
        return {
          output: {
            skipped: true,
            reason: "SEND_MEDIA requires an open conversation (session window).",
          },
          nextNodeId: next?.id ?? null,
        };
      }
      const sendResult = await sendPatientDocumentOverWhatsApp(tenant, {
        conversationId: execution.conversationId,
        documentId,
        ...(caption ? { caption } : {}),
      });
      return {
        output: {
          sendResult,
          documentId,
          idempotentNextNodeId: next?.id ?? null,
        },
        nextNodeId: next?.id ?? null,
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
      const promptHint = String(node.config["promptHint"] ?? node.config["instruction"] ?? "").trim();
      const tone = String(node.config["tone"] ?? "clinical_empathetic");
      const modeRaw = String(node.config["mode"] ?? "draft").toLowerCase();
      const mode = modeRaw === "send" ? "send" : "draft";
      const next = nextNodes(definition, node.id)[0];
      const patientMessage =
        vars["message_text"] ||
        vars["message_content"] ||
        String(node.config["userPrompt"] ?? "Hello");

      if (!execution.conversationId) {
        return {
          output: {
            skipped: true,
            reason: "AI_DRAFT requires conversationId",
            mode,
            promptHint: promptHint || null,
            tone,
          },
          nextNodeId: next?.id ?? null,
        };
      }

      const { runWhatsAppAiPipeline } = await import("../whatsapp-ai/pipeline");
      const result = await runWhatsAppAiPipeline({
        tenant,
        conversationId: execution.conversationId,
        patientMessage,
        trigger: "automation",
        mode,
        force: true,
        ...(promptHint ? { promptHint } : {}),
        simulation,
      });

      return {
        output: {
          phase: 5,
          mode,
          tone,
          promptHint: promptHint || null,
          requiresHumanReview: mode === "draft",
          autoSend: mode === "send" && !simulation,
          ...result,
          note: simulation
            ? "TEST MODE — AI draft only; no WhatsApp send"
            : mode === "draft"
              ? "Draft generated — not sent unless mode=send"
              : "AI send attempted per flow configuration",
        },
        nextNodeId: next?.id ?? null,
        ...(result.handoff ? { escalated: true } : {}),
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
      const assigneeId = typeof node.config["assigneeId"] === "string" ? node.config["assigneeId"] : "";
      if (simulation) {
        return {
          output: {
            simulation: true,
            assigneeId: assigneeId || null,
            note: "ASSIGN_STAFF creates a Care Task assignment when assigneeId is set.",
          },
          nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
        };
      }
      if (!assigneeId) {
        return {
          output: {
            skipped: true,
            reason: "ASSIGN_STAFF needs assigneeId (staff user). Prefer ASSIGN_TASK for titled work.",
          },
          nextNodeId: nextNodes(definition, node.id)[0]?.id ?? null,
        };
      }
      const systemActor = tenant.userId === "system-worker" || !tenant.userId;
      const task = await prisma.careTask.create({
        data: {
          clinicId: tenant.clinicId,
          coupleId: execution.coupleId,
          title: String(node.config["title"] ?? "Staff assignment"),
          description: String(node.config["description"] ?? "Assigned by WhatsApp automation"),
          category: "WHATSAPP_AUTOMATION",
          status: "WAITING",
          priority: "NORMAL",
          ...(systemActor ? {} : { createdById: tenant.userId }),
          assignments: { create: { userId: assigneeId } },
        },
      });
      return {
        output: { careTaskId: task.id, assigneeId },
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

  let execution;
  try {
    execution = await prisma.whatsAppFlowExecution.create({
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      !input.simulation
    ) {
      const raced = await prisma.whatsAppFlowExecution.findUnique({
        where: { clinicId_idempotencyKey: { clinicId: input.tenant.clinicId, idempotencyKey } },
      });
      if (raced) return { execution: raced, duplicate: true as const };
    }
    throw error;
  }

  if (!input.simulation) {
    await audit(input.tenant, "whatsapp.execution.start", "WhatsAppFlowExecution", execution.id, {
      flowId: flow.id,
      triggerEventId: input.triggerEventId,
    }).catch(() => undefined);
  }

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
