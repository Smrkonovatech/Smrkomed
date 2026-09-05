/**
 * Production WhatsApp template operations for Phase 1.
 * Reuses WhatsAppTemplate model + sendWhatsAppTemplate — no second store or sender.
 */

import { prisma, type TenantContext, type WhatsAppTemplateStatus } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { sendWhatsAppTemplate } from "./messaging";
import {
  applyTemplatePreview,
  buildOrderedParameters,
  isApprovedTemplateStatus,
  parseWhatsAppTemplateComponents,
  TEMPLATE_PREVIEW_SAMPLE_VALUES,
  type ParsedTemplateComponents,
} from "./template-variables";
import {
  resolveSlotValue,
  resolveTemplateVariables,
  SUPPORTED_TEMPLATE_VARIABLE_CATALOG,
  UNSUPPORTED_TEMPLATE_VARIABLES,
  validateTemplateVariables,
  type TemplateResolveContext,
} from "./variable-resolver";

export type TemplateDetail = {
  id: string;
  externalId: string | null;
  name: string;
  language: string;
  category: string;
  status: WhatsAppTemplateStatus;
  parameterCount: number;
  rejectionReason: string | null;
  header: string | null;
  body: string | null;
  footer: string | null;
  buttons: unknown;
  variables: unknown;
  components: unknown;
  lastSyncedAt: Date | null;
  parsed: ParsedTemplateComponents;
  sourceOfTruth: "META";
  sendable: boolean;
};

function toDetail(row: {
  id: string;
  externalId: string | null;
  name: string;
  language: string;
  category: string;
  status: WhatsAppTemplateStatus;
  parameterCount: number;
  rejectionReason: string | null;
  header: string | null;
  body: string | null;
  footer: string | null;
  buttons: unknown;
  variables: unknown;
  components: unknown;
  lastSyncedAt: Date | null;
}): TemplateDetail {
  const parsed = parseWhatsAppTemplateComponents(row.components);
  // Prefer stored text fields when components parse empty (legacy rows)
  if (!parsed.header && row.header) parsed.header = row.header;
  if (!parsed.body && row.body) parsed.body = row.body;
  if (!parsed.footer && row.footer) parsed.footer = row.footer;
  if (!parsed.buttons && row.buttons && Array.isArray(row.buttons)) {
    parsed.buttons = row.buttons as ParsedTemplateComponents["buttons"];
  }
  if (parsed.variables.length === 0 && Array.isArray(row.variables)) {
    // Fallback: rebuild body slots from stored variable tokens
    const tokens = row.variables.filter((v): v is string => typeof v === "string");
    parsed.variables = tokens.map((token, i) => ({
      component: "BODY" as const,
      index: /^\d+$/.test(token) ? Number(token) : i + 1,
      token,
      positional: /^\d+$/.test(token),
      key: /^\d+$/.test(token) ? `body.${token}` : token,
    }));
    parsed.variableKeys = [...new Set(parsed.variables.map((v) => v.key))];
    parsed.bodyParameterCount = parsed.variables.length;
    parsed.parameterCount = parsed.variables.length;
  }

  return {
    ...row,
    parsed,
    sourceOfTruth: "META",
    sendable: isApprovedTemplateStatus(row.status),
  };
}

export async function listWhatsAppTemplatesDetailed(ctx: TenantContext) {
  const rows = await prisma.whatsAppTemplate.findMany({
    where: { clinicId: ctx.clinicId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return rows.map(toDetail);
}

/** Phase 3 / automation: only Meta-APPROVED templates for this clinic. */
export async function listApprovedWhatsAppTemplates(ctx: TenantContext) {
  const rows = await prisma.whatsAppTemplate.findMany({
    where: { clinicId: ctx.clinicId, status: "APPROVED" },
    orderBy: [{ name: "asc" }, { language: "asc" }],
  });
  return rows.map(toDetail);
}

export async function getWhatsAppTemplateDetail(ctx: TenantContext, templateId: string) {
  const row = await prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, clinicId: ctx.clinicId },
  });
  if (!row) {
    throw new IntegrationError("INVALID_TEMPLATE", "Template was not found for this clinic.", 404);
  }
  return toDetail(row);
}

export function previewWhatsAppTemplate(
  detail: TemplateDetail,
  values: Record<string, string>,
  opts?: { sample?: boolean },
) {
  const merged = opts?.sample ? { ...TEMPLATE_PREVIEW_SAMPLE_VALUES, ...values } : values;
  return {
    sourceOfTruth: "META" as const,
    previewKind: opts?.sample ? ("DEMO_SAMPLE_DATA" as const) : ("RESOLVED_DATA" as const),
    disclaimer: opts?.sample
      ? "Preview uses DEMO/SAMPLE data only. It is not a live patient message and does not imply Meta approval of local drafts."
      : "Preview uses resolved clinic/patient data. Sending still requires an APPROVED Meta template.",
    header: applyTemplatePreview(detail.parsed.header ?? detail.header, merged),
    body: applyTemplatePreview(detail.parsed.body ?? detail.body, merged),
    footer: detail.parsed.footer ?? detail.footer,
    buttons: detail.parsed.buttons,
    variables: detail.parsed.variables,
    valuesUsed: merged,
  };
}

export async function resolveAndValidateTemplate(
  ctx: TenantContext,
  input: {
    templateId: string;
    resolve?: TemplateResolveContext;
    /** Explicit positional body params (legacy) */
    parameters?: string[];
  },
) {
  const detail = await getWhatsAppTemplateDetail(ctx, input.templateId);
  const resolved = await resolveTemplateVariables(ctx, input.resolve ?? {});
  const values = { ...resolved.values };

  // Legacy positional body parameters → body.1, body.2, …
  if (input.parameters?.length) {
    input.parameters.forEach((p, i) => {
      const token = String(i + 1);
      values[token] = p;
      values[`body.${token}`] = p;
    });
  }

  const missing: string[] = [];
  for (const slot of detail.parsed.variables) {
    const v = resolveSlotValue(slot, values);
    if (!String(v).trim()) {
      missing.push(slot.key);
    } else {
      values[slot.key] = v;
      values[slot.token] = v;
    }
  }

  const headerParams = buildOrderedParameters(detail.parsed.variables, "HEADER", values);
  const bodyParams = buildOrderedParameters(detail.parsed.variables, "BODY", values);
  const buttonGroups = new Map<number, string[]>();
  for (const slot of detail.parsed.variables.filter((s) => s.component === "BUTTON")) {
    const idx = slot.buttonIndex ?? 0;
    if (!buttonGroups.has(idx)) {
      buttonGroups.set(idx, buildOrderedParameters(detail.parsed.variables, "BUTTON", values, idx));
    }
  }

  return {
    template: detail,
    values,
    sources: resolved.sources,
    missing,
    valid: missing.length === 0,
    componentParameters: {
      header: headerParams,
      body: bodyParams,
      buttons: [...buttonGroups.entries()].map(([index, parameters]) => ({
        index,
        parameters,
        subType: detail.parsed.variables.find((s) => s.buttonIndex === index)?.buttonType ?? "url",
      })),
    },
  };
}

export async function testSendWhatsAppTemplate(
  ctx: TenantContext,
  input: {
    templateId: string;
    patientId?: string;
    conversationId?: string;
    appointmentId?: string;
    careTaskId?: string;
    treatmentId?: string;
    coupleId?: string;
    /** Manual overrides for unresolved slots */
    overrides?: Record<string, string>;
    parameters?: string[];
  },
) {
  const detail = await getWhatsAppTemplateDetail(ctx, input.templateId);
  if (!detail.sendable) {
    throw new IntegrationError(
      "TEMPLATE_NOT_APPROVED",
      `Only Meta-approved templates can be sent. Current status: ${detail.status}.`,
      422,
    );
  }

  const prepared = await resolveAndValidateTemplate(ctx, {
    templateId: input.templateId,
    resolve: {
      ...(input.patientId ? { patientId: input.patientId } : {}),
      ...(input.coupleId ? { coupleId: input.coupleId } : {}),
      ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
      ...(input.careTaskId ? { careTaskId: input.careTaskId } : {}),
      ...(input.treatmentId ? { treatmentId: input.treatmentId } : {}),
      ...(input.overrides ? { overrides: input.overrides } : {}),
    },
    ...(input.parameters ? { parameters: input.parameters } : {}),
  });

  if (!prepared.valid) {
    throw new IntegrationError(
      "INVALID_TEMPLATE",
      `Missing required template variables: ${prepared.missing.join(", ")}`,
      422,
    );
  }

  // Prefer body params for legacy sendWhatsAppTemplate; also pass componentParameters
  const bodyParams =
    prepared.componentParameters.body.length > 0
      ? prepared.componentParameters.body
      : (input.parameters ?? []);

  const result = await sendWhatsAppTemplate(ctx, {
    templateId: input.templateId,
    parameters: bodyParams,
    componentParameters: prepared.componentParameters,
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.patientId ? { patientId: input.patientId } : {}),
  });

  return {
    ok: true as const,
    messageId: result.id,
    providerMessageId: result.providerMessageId,
    status: result.status,
    template: {
      id: detail.id,
      name: detail.name,
      language: detail.language,
      status: detail.status,
    },
    missing: [] as string[],
    // Never include tokens / credentials
  };
}

export function getTemplateVariableCatalog() {
  return {
    supported: SUPPORTED_TEMPLATE_VARIABLE_CATALOG,
    unsupported: UNSUPPORTED_TEMPLATE_VARIABLES,
    note: "Values resolve from SmrkoMed records at send time. Meta APPROVED status is required to send.",
  };
}

// Re-exports for Phase 3 consumers
export {
  resolveTemplateVariables,
  validateTemplateVariables,
  parseWhatsAppTemplateComponents,
  sendWhatsAppTemplate,
};
