/**
 * SEND_TEMPLATE node configuration helpers (Phase 3).
 * Persisted inside WhatsAppFlow.definition JSON — no second template store.
 */

import { prisma } from "@smrkomed/database";

import {
  parseWhatsAppTemplateComponents,
  type TemplateVariableSlot,
} from "../../integrations/providers/whatsapp/template-variables";
import { SUPPORTED_TEMPLATE_VARIABLE_CATALOG } from "../../integrations/providers/whatsapp/variable-resolver";
import type { FlowDefinition, FlowNode } from "./types";
import type { ValidationIssue } from "./validate";

export type SendTemplateNodeConfig = {
  /** Canonical Meta-synced template id for this clinic */
  templateId?: string;
  /** Denormalized for canvas display / legacy library flows */
  templateName?: string;
  templateLanguage?: string;
  /**
   * Maps parsed slot key (e.g. body.1, header.1, patient.fullName alias)
   * → resolver catalog source (e.g. patient.firstName, appointment.date)
   */
  variableMappings?: Record<string, string>;
  /** @deprecated Prefer variableMappings — still honored when mappings empty */
  variableKeys?: string[];
};

export type VariableSourceOption = {
  value: string;
  label: string;
  group: string;
};

/** Flat picker options for the automation builder. */
export function listAutomationVariableSources(): VariableSourceOption[] {
  const out: VariableSourceOption[] = [];
  const push = (group: string, value: string, label: string) => {
    out.push({ group, value, label });
  };

  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.patient) {
    push("Patient", key, key.replace("patient.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.couple) {
    push("Couple", key, key.replace("couple.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.doctor) {
    push("Doctor", key, key.replace("doctor.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.coordinator) {
    push("Coordinator", key, key.replace("coordinator.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.clinic) {
    push("Clinic", key, key.replace("clinic.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.appointment) {
    push("Appointment", key, key.replace("appointment.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.treatment) {
    push("Treatment", key, key.replace("treatment.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.journey) {
    push("Journey", key, key.replace("journey.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.careLoop) {
    push("Care Loop", key, key.replace("careLoop.", ""));
  }
  for (const key of SUPPORTED_TEMPLATE_VARIABLE_CATALOG.legacy) {
    push("Legacy aliases", key, key);
  }

  push("Previous node", "previousNode.output", "Generic previous output key (set via overrides)");
  push("Previous node", "medicine_name", "medicine_name (lookup nodes)");
  push("Previous node", "medicine_dosage", "medicine_dosage");
  push("Previous node", "appointment_date", "appointment_date");
  push("Previous node", "appointment_time", "appointment_time");
  push("Previous node", "doctor_name", "doctor_name");
  push("Previous node", "patient_name", "patient_name");
  push("Previous node", "clinic_name", "clinic_name");

  return out;
}

export function parseSendTemplateConfig(config: Record<string, unknown>): SendTemplateNodeConfig {
  const mappingsRaw = config["variableMappings"];
  let variableMappings: Record<string, string> | undefined;
  if (mappingsRaw && typeof mappingsRaw === "object" && !Array.isArray(mappingsRaw)) {
    variableMappings = {};
    for (const [k, v] of Object.entries(mappingsRaw as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) variableMappings[k] = v.trim();
    }
  }
  return {
    ...(typeof config["templateId"] === "string" ? { templateId: config["templateId"] } : {}),
    ...(typeof config["templateName"] === "string" ? { templateName: config["templateName"] } : {}),
    ...(typeof config["templateLanguage"] === "string"
      ? { templateLanguage: config["templateLanguage"] }
      : {}),
    ...(variableMappings ? { variableMappings } : {}),
    ...(Array.isArray(config["variableKeys"])
      ? { variableKeys: config["variableKeys"].filter((x): x is string => typeof x === "string") }
      : {}),
  };
}

export function humanLabelForSlot(slot: TemplateVariableSlot): string {
  if (slot.component === "HEADER") return `Header {{${slot.token}}}`;
  if (slot.component === "BUTTON") return `Button ${slot.buttonIndex ?? 0} {{${slot.token}}}`;
  return `Body {{${slot.token}}}`;
}

/**
 * Async clinic-scoped validation for SEND_TEMPLATE nodes (activation + validate endpoint).
 */
export async function validateSendTemplateNodes(
  clinicId: string,
  definition: FlowDefinition,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const nodes = definition.nodes.filter((n) => n.type === "SEND_TEMPLATE");
  if (nodes.length === 0) return issues;

  const allowedSources = new Set(listAutomationVariableSources().map((s) => s.value));

  for (const node of nodes) {
    const cfg = parseSendTemplateConfig(node.config);
    if (!cfg.templateId && !cfg.templateName) {
      issues.push({
        code: "TEMPLATE",
        message: `Send Template node "${node.label}" requires an approved template selection.`,
        nodeId: node.id,
      });
      continue;
    }

    const template = cfg.templateId
      ? await prisma.whatsAppTemplate.findFirst({
          where: { id: cfg.templateId, clinicId },
        })
      : await prisma.whatsAppTemplate.findFirst({
          where: {
            clinicId,
            name: cfg.templateName!,
            ...(cfg.templateLanguage ? { language: cfg.templateLanguage } : {}),
          },
        });

    if (!template) {
      issues.push({
        code: "TEMPLATE",
        message: `Template configured on "${node.label}" was not found for this clinic.`,
        nodeId: node.id,
      });
      continue;
    }

    if (template.status !== "APPROVED") {
      issues.push({
        code: "TEMPLATE_NOT_APPROVED",
        message: `Template "${template.name}" on "${node.label}" is ${template.status}, not APPROVED by Meta.`,
        nodeId: node.id,
      });
      continue;
    }

    if (cfg.templateLanguage && cfg.templateLanguage !== template.language) {
      issues.push({
        code: "TEMPLATE_LANGUAGE",
        message: `Template language mismatch on "${node.label}": expected ${template.language}.`,
        nodeId: node.id,
      });
    }

    const parsed = parseWhatsAppTemplateComponents(template.components);
    const slots = parsed.variables;
    const mappings: Record<string, string> = { ...(cfg.variableMappings ?? {}) };

    // Legacy variableKeys: treat as ordered body sources when mappings empty
    if (slots.length > 0 && Object.keys(mappings).length === 0 && (cfg.variableKeys?.length ?? 0) > 0) {
      const bodySlots = slots.filter((s) => s.component === "BODY");
      cfg.variableKeys!.forEach((source, i) => {
        const slot = bodySlots[i];
        if (slot) mappings[slot.key] = source;
      });
    }

    for (const slot of slots) {
      const source = mappings[slot.key] ?? mappings[slot.token] ?? "";
      if (!String(source).trim()) {
        const label = humanLabelForMissingSlot(slot, template.name);
        issues.push({
          code: "TEMPLATE_VARIABLE",
          message: `${label} is required for this template on node "${node.label}".`,
          nodeId: node.id,
        });
        continue;
      }
      const okSource =
        allowedSources.has(source) ||
        source.startsWith("previous.") ||
        source.startsWith("vars.") ||
        /^[a-zA-Z][a-zA-Z0-9_.]*$/.test(source);
      if (!okSource) {
        issues.push({
          code: "TEMPLATE_MAPPING",
          message: `Invalid variable source "${source}" on "${node.label}".`,
          nodeId: node.id,
        });
      }
    }
  }

  return issues;
}

function humanLabelForMissingSlot(
  slot: TemplateVariableSlot,
  templateName: string,
): string {
  if (slot.component === "HEADER") return `Header {{${slot.token}}}`;
  if (slot.component === "BUTTON") return `Button parameter {{${slot.token}}}`;
  const token = slot.token.toLowerCase();
  if (token === "2" || token.includes("time") || slot.key.includes("time")) {
    return "Appointment time";
  }
  if (token === "1" || token.includes("name") || slot.key.includes("firstName")) {
    return `Variable {{${slot.token}}} (often patient name)`;
  }
  return `Variable {{${slot.token}}} for template "${templateName}"`;
}

/** Merge Phase 1 resolved values + node mappings into slot value map for send. */
export function applyVariableMappings(
  slots: TemplateVariableSlot[],
  mappings: Record<string, string>,
  resolvedValues: Record<string, string>,
  executionVars: Record<string, string> = {},
): { values: Record<string, string>; missing: string[]; mapped: Record<string, string> } {
  const values: Record<string, string> = { ...resolvedValues, ...executionVars };
  const mapped: Record<string, string> = {};
  const missing: string[] = [];

  for (const slot of slots) {
    const source = mappings[slot.key] ?? mappings[slot.token] ?? "";
    if (!source) {
      // Fall back to resolver already filling slot.key / aliases
      const existing = values[slot.key] ?? values[slot.token] ?? "";
      if (!String(existing).trim()) missing.push(slot.key);
      continue;
    }
    const v =
      resolvedValues[source] ??
      executionVars[source] ??
      resolvedValues[source.replace(/^vars\./, "")] ??
      executionVars[source.replace(/^vars\./, "")] ??
      executionVars[source.replace(/^previous\./, "")] ??
      "";
    const trimmed = String(v).trim();
    mapped[slot.key] = source;
    if (!trimmed) {
      missing.push(slot.key);
      continue;
    }
    values[slot.key] = trimmed;
    values[slot.token] = trimmed;
    values[`${slot.component.toLowerCase()}.${slot.token}`] = trimmed;
  }

  return { values, missing, mapped };
}

/** Expand legacy variableKeys into body.* mappings when variableMappings is empty. */
export function effectiveVariableMappings(
  cfg: SendTemplateNodeConfig,
  slots: TemplateVariableSlot[],
): Record<string, string> {
  const mappings: Record<string, string> = { ...(cfg.variableMappings ?? {}) };
  if (Object.keys(mappings).length === 0 && (cfg.variableKeys?.length ?? 0) > 0) {
    const bodySlots = slots.filter((s) => s.component === "BODY");
    cfg.variableKeys!.forEach((source, i) => {
      const slot = bodySlots[i];
      if (slot) mappings[slot.key] = source;
    });
  }
  return mappings;
}

export function sendTemplateNodes(definition: FlowDefinition): FlowNode[] {
  return definition.nodes.filter((n) => n.type === "SEND_TEMPLATE");
}
