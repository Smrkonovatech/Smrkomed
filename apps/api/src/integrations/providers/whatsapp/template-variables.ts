/**
 * Canonical WhatsApp template variable parser.
 * Single source for detecting HEADER / BODY / BUTTON placeholders.
 * Do not duplicate this logic elsewhere — import from here.
 */

export type TemplateVariableSlot = {
  /** Component owning the placeholder */
  component: "HEADER" | "BODY" | "BUTTON";
  /** Meta button index when component === BUTTON */
  buttonIndex?: number;
  /** Button type when known (URL, QUICK_REPLY, PHONE_NUMBER, COPY_CODE, …) */
  buttonType?: string;
  /** Positional index within that component (1-based for Meta {{n}}) */
  index: number;
  /** Raw token without braces, e.g. "1" or "patient_name" */
  token: string;
  /** True when token is purely numeric (Meta positional) */
  positional: boolean;
  /** Suggested automation / resolver key (aliases applied where known) */
  key: string;
};

export type ParsedTemplateComponents = {
  header: string | null;
  body: string | null;
  footer: string | null;
  buttons: Array<{
    type: string;
    text?: string;
    url?: string;
    phone_number?: string;
    example?: unknown;
  }> | null;
  /** Ordered unique slots across header → body → buttons */
  variables: TemplateVariableSlot[];
  /** Flat unique keys for UI / automation mapping */
  variableKeys: string[];
  /** Body-only parameter count (legacy send compatibility) */
  bodyParameterCount: number;
  /** Total required text parameters across header+body+dynamic buttons */
  parameterCount: number;
  /** Raw Meta components array preserved when provided */
  components: unknown[] | null;
};

const PLACEHOLDER_RE = /\{\{\s*([0-9A-Za-z_]+)\s*\}\}/g;

/** Well-known named aliases → resolver catalog keys */
const TOKEN_ALIASES: Record<string, string> = {
  patient_name: "patient.fullName",
  patient_first_name: "patient.firstName",
  patient_last_name: "patient.lastName",
  patient_phone: "patient.phone",
  patient_email: "patient.email",
  doctor_name: "doctor.name",
  clinic_name: "clinic.name",
  clinic_phone: "clinic.phone",
  appointment_date: "appointment.date",
  appointment_time: "appointment.time",
  appointment_type: "appointment.type",
  care_coordinator: "coordinator.name",
  coordinator_name: "coordinator.name",
  treatment_name: "treatment.type",
  care_task_title: "careLoop.taskTitle",
  medicine_name: "medicine.name",
  medicine_dosage: "medicine.dosage",
  medicine_time: "medicine.time",
  payment_amount: "payment.amount",
  payment_due_date: "payment.dueDate",
};

function extractFromText(
  text: string | null | undefined,
  component: TemplateVariableSlot["component"],
  extra?: Pick<TemplateVariableSlot, "buttonIndex" | "buttonType">,
): TemplateVariableSlot[] {
  if (!text) return [];
  const slots: TemplateVariableSlot[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    const token = match[1] ?? "";
    if (!token || seen.has(token)) continue;
    seen.add(token);
    const positional = /^\d+$/.test(token);
    const index = positional ? Number(token) : slots.length + 1;
    const key = positional
      ? `${component.toLowerCase()}.${token}`
      : (TOKEN_ALIASES[token] ?? token);
    slots.push({
      component,
      index,
      token,
      positional,
      key,
      ...(extra?.buttonIndex !== undefined ? { buttonIndex: extra.buttonIndex } : {}),
      ...(extra?.buttonType ? { buttonType: extra.buttonType } : {}),
    });
  }
  return slots.sort((a, b) => a.index - b.index);
}

function asButton(row: unknown): {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
  example?: unknown;
} | null {
  if (!row || typeof row !== "object") return null;
  const b = row as Record<string, unknown>;
  const type = String(b["type"] ?? "").toUpperCase();
  if (!type) return null;
  return {
    type,
    ...(typeof b["text"] === "string" ? { text: b["text"] } : {}),
    ...(typeof b["url"] === "string" ? { url: b["url"] } : {}),
    ...(typeof b["phone_number"] === "string" ? { phone_number: b["phone_number"] } : {}),
    ...("example" in b ? { example: b["example"] } : {}),
  };
}

/**
 * Parse Meta message template components into structured fields + variable slots.
 */
export function parseWhatsAppTemplateComponents(rawComponents: unknown): ParsedTemplateComponents {
  if (!Array.isArray(rawComponents)) {
    return {
      header: null,
      body: null,
      footer: null,
      buttons: null,
      variables: [],
      variableKeys: [],
      bodyParameterCount: 0,
      parameterCount: 0,
      components: null,
    };
  }

  let header: string | null = null;
  let body: string | null = null;
  let footer: string | null = null;
  const buttons: NonNullable<ParsedTemplateComponents["buttons"]> = [];
  const variables: TemplateVariableSlot[] = [];

  for (const comp of rawComponents) {
    if (!comp || typeof comp !== "object") continue;
    const item = comp as {
      type?: string;
      text?: string;
      format?: string;
      buttons?: unknown[];
    };
    const type = (item.type ?? "").toUpperCase();

    if (type === "HEADER") {
      // TEXT headers may contain {{n}}; MEDIA headers do not take text placeholders here
      header = typeof item.text === "string" ? item.text : null;
      variables.push(...extractFromText(header, "HEADER"));
    } else if (type === "BODY") {
      body = typeof item.text === "string" ? item.text : null;
      variables.push(...extractFromText(body, "BODY"));
    } else if (type === "FOOTER") {
      footer = typeof item.text === "string" ? item.text : null;
      // Footer placeholders are not supported by Meta Cloud API for send — detect for display only
    } else if (type === "BUTTONS" && Array.isArray(item.buttons)) {
      item.buttons.forEach((btnRaw, buttonIndex) => {
        const btn = asButton(btnRaw);
        if (!btn) return;
        buttons.push(btn);
        // Dynamic URL buttons: https://example.com/{{1}}
        if (btn.type === "URL" && btn.url) {
          variables.push(
            ...extractFromText(btn.url, "BUTTON", { buttonIndex, buttonType: btn.type }),
          );
        }
        // COPY_CODE may use example; text itself is usually static
        if (btn.type === "COPY_CODE" && typeof btn.example === "string") {
          // example is sample only — no send-time variable unless url-style placeholder present
        }
      });
    }
  }

  const bodySlots = variables.filter((v) => v.component === "BODY");
  const bodyParameterCount = bodySlots.length
    ? Math.max(...bodySlots.map((v) => v.index), bodySlots.length)
    : 0;

  const variableKeys = [...new Set(variables.map((v) => v.key))];

  return {
    header,
    body,
    footer,
    buttons: buttons.length > 0 ? buttons : null,
    variables,
    variableKeys,
    bodyParameterCount,
    parameterCount: variables.length,
    components: rawComponents as unknown[],
  };
}

/**
 * Apply resolved values into template text for preview (never for Meta approval claims).
 * Keys may be token ("1"), dotted key ("patient.fullName"), or component.key ("body.1").
 */
export function applyTemplatePreview(
  text: string | null | undefined,
  values: Record<string, string>,
): string {
  if (!text) return "";
  return text.replace(PLACEHOLDER_RE, (full, token: string) => {
    if (values[token] != null && values[token] !== "") return values[token];
    const alias = TOKEN_ALIASES[token];
    if (alias && values[alias]) return values[alias];
    const bodyKey = `body.${token}`;
    if (values[bodyKey]) return values[bodyKey];
    const headerKey = `header.${token}`;
    if (values[headerKey]) return values[headerKey];
    return full;
  });
}

/** Build ordered body parameter strings for legacy / positional Meta send. */
export function buildOrderedParameters(
  slots: TemplateVariableSlot[],
  component: "HEADER" | "BODY" | "BUTTON",
  values: Record<string, string>,
  buttonIndex?: number,
): string[] {
  const filtered = slots
    .filter((s) => s.component === component)
    .filter((s) => (buttonIndex === undefined ? true : s.buttonIndex === buttonIndex))
    .sort((a, b) => a.index - b.index);

  const byIndex = new Map<number, string>();
  for (const slot of filtered) {
    const value =
      values[slot.key] ??
      values[slot.token] ??
      values[`${component.toLowerCase()}.${slot.token}`] ??
      "";
    byIndex.set(slot.index, value);
  }

  if (byIndex.size === 0) return [];
  const max = Math.max(...byIndex.keys());
  const out: string[] = [];
  for (let i = 1; i <= max; i++) {
    out.push(byIndex.get(i) ?? "");
  }
  return out;
}

export function isApprovedTemplateStatus(status: string) {
  return status === "APPROVED";
}

/** Demo/sample values for UI preview only — never used for live send. */
export const TEMPLATE_PREVIEW_SAMPLE_VALUES: Record<string, string> = {
  "1": "Priya",
  "2": "2 Sep 2026",
  "3": "10:30 AM",
  "4": "Dr. Ananya Rao",
  "patient.fullName": "Priya Sharma",
  "patient.firstName": "Priya",
  "patient.lastName": "Sharma",
  "patient.phone": "+91 90000 00000",
  "patient.email": "priya@example.com",
  "doctor.name": "Dr. Ananya Rao",
  "doctor.specialty": "Reproductive Medicine",
  "coordinator.name": "Meera Iyer",
  "clinic.name": "SmrkoMed Demo Clinic",
  "clinic.phone": "+91 80 0000 0000",
  "clinic.address": "Demo Address",
  "clinic.website": "https://example.com",
  "appointment.date": "2 Sep 2026",
  "appointment.time": "10:30 AM",
  "appointment.doctor": "Dr. Ananya Rao",
  "appointment.location": "OPD-2",
  "treatment.type": "IVF",
  "treatment.status": "ACTIVE",
  "journey.stage": "Stimulation",
  "journey.status": "ACTIVE",
  "careLoop.taskTitle": "Upload lab report",
  "careLoop.taskDueDate": "5 Sep 2026",
  "careLoop.taskStatus": "WAITING",
  patient_name: "Priya Sharma",
  doctor_name: "Dr. Ananya Rao",
  clinic_name: "SmrkoMed Demo Clinic",
  appointment_date: "2 Sep 2026",
  appointment_time: "10:30 AM",
};
