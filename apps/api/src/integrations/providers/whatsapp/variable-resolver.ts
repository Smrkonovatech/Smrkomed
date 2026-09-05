/**
 * Runtime WhatsApp template variable resolver.
 * Values come from SmrkoMed domain records at send/execution time — never hardcoded.
 *
 * Unsupported (no schema field today — do not invent):
 * - Arbitrary custom patient JSON fields (Patient has fixed columns only)
 * - doctor.specialty as a dedicated column (User.title is used as specialty proxy when present)
 * - couple.name as a stored field (derived from primary ± partner names)
 * - journey as a separate model (mapped from Treatment.stageName / status)
 */

import { prisma, type TenantContext } from "@smrkomed/database";

export type TemplateResolveContext = {
  patientId?: string | null;
  coupleId?: string | null;
  appointmentId?: string | null;
  treatmentId?: string | null;
  careTaskId?: string | null;
  /** Explicit overrides / automation previous-node output */
  previousNodeOutput?: Record<string, string>;
  /** Manual mapping overrides (highest precedence after previousNodeOutput merge order below) */
  overrides?: Record<string, string>;
};

export type ResolvedTemplateVariables = {
  values: Record<string, string>;
  sources: Record<string, string>;
  unsupportedRequested: string[];
};

/** Catalog of supported resolver keys for UI / Phase 3 automation. */
export const SUPPORTED_TEMPLATE_VARIABLE_CATALOG = {
  patient: [
    "patient.firstName",
    "patient.lastName",
    "patient.fullName",
    "patient.phone",
    "patient.email",
    "patient.whatsappNumber",
    "patient.status",
    "patient.preferredLanguage",
  ],
  couple: ["couple.slug", "couple.name", "couple.status", "couple.partnerName", "couple.careLoopActive"],
  doctor: ["doctor.name", "doctor.specialty", "doctor.title"],
  coordinator: ["coordinator.name"],
  clinic: ["clinic.name", "clinic.phone", "clinic.address", "clinic.website", "clinic.email", "clinic.city"],
  appointment: [
    "appointment.date",
    "appointment.time",
    "appointment.doctor",
    "appointment.location",
    "appointment.type",
    "appointment.status",
    "appointment.startsAt",
  ],
  treatment: ["treatment.type", "treatment.status", "treatment.label", "treatment.stage"],
  journey: ["journey.stage", "journey.status"],
  careLoop: ["careLoop.taskTitle", "careLoop.taskDueDate", "careLoop.taskStatus", "careLoop.taskPriority"],
  /** Legacy flat keys still accepted for existing automations */
  legacy: [
    "patient_name",
    "patient_first_name",
    "patient_phone",
    "clinic_name",
    "clinic_phone",
    "appointment_date",
    "appointment_time",
    "appointment_type",
    "doctor_name",
    "care_coordinator",
    "care_task_title",
  ],
} as const;

export const UNSUPPORTED_TEMPLATE_VARIABLES = [
  "Arbitrary custom patient fields (no Patient.customFields / JSON attributes in schema)",
  "doctor.specialty as a dedicated clinical specialty column (User.title used when available)",
  "Standalone Journey model (journey.* mapped from Treatment stage/status)",
  "Footer placeholders at send time (Meta does not accept footer parameters)",
] as const;

function setVar(
  values: Record<string, string>,
  sources: Record<string, string>,
  key: string,
  value: string | null | undefined,
  source: string,
  aliases: string[] = [],
) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return;
  values[key] = trimmed;
  sources[key] = source;
  for (const alias of aliases) {
    if (!values[alias]) {
      values[alias] = trimmed;
      sources[alias] = source;
    }
  }
}

function formatDate(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatTime(d: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

/**
 * Resolve template variables from clinic-scoped domain records.
 */
export async function resolveTemplateVariables(
  ctx: TenantContext,
  input: TemplateResolveContext = {},
): Promise<ResolvedTemplateVariables> {
  const values: Record<string, string> = {};
  const sources: Record<string, string> = {};
  const unsupportedRequested: string[] = [];

  const clinic = await prisma.clinic.findFirst({
    where: { id: ctx.clinicId, organizationId: ctx.organizationId },
  });
  if (!clinic) {
    return { values, sources, unsupportedRequested: ["clinic"] };
  }

  const tz = clinic.timezone || "Asia/Kolkata";
  setVar(values, sources, "clinic.name", clinic.name, "clinic", ["clinic_name"]);
  setVar(values, sources, "clinic.phone", clinic.phone, "clinic", ["clinic_phone"]);
  setVar(values, sources, "clinic.address", clinic.address, "clinic");
  setVar(values, sources, "clinic.website", clinic.website, "clinic");
  setVar(values, sources, "clinic.email", clinic.email, "clinic");
  setVar(values, sources, "clinic.city", clinic.city, "clinic");

  let coupleId = input.coupleId ?? null;
  let patientId = input.patientId ?? null;

  if (patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: ctx.clinicId },
    });
    if (patient) {
      const fullName = `${patient.firstName} ${patient.lastName}`.trim();
      setVar(values, sources, "patient.firstName", patient.firstName, "patient", ["patient_first_name"]);
      setVar(values, sources, "patient.lastName", patient.lastName, "patient");
      setVar(values, sources, "patient.fullName", fullName, "patient", ["patient_name"]);
      setVar(values, sources, "patient.phone", patient.phone, "patient", ["patient_phone"]);
      setVar(values, sources, "patient.whatsappNumber", patient.whatsappNumber, "patient");
      setVar(values, sources, "patient.email", patient.email, "patient");
      setVar(values, sources, "patient.status", patient.status, "patient");
      setVar(values, sources, "patient.preferredLanguage", patient.preferredLanguage, "patient");

      if (!coupleId) {
        const couple = await prisma.couple.findFirst({
          where: {
            clinicId: ctx.clinicId,
            OR: [{ primaryPatientId: patient.id }, { partnerPatientId: patient.id }],
          },
          select: { id: true },
        });
        coupleId = couple?.id ?? null;
      }
    }
  }

  if (coupleId) {
    const couple = await prisma.couple.findFirst({
      where: { id: coupleId, clinicId: ctx.clinicId },
      include: {
        primaryPatient: true,
        partnerPatient: true,
        assignedDoctor: true,
        assignedCoordinator: true,
      },
    });
    if (couple) {
      const primaryName = `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim();
      const partnerName = couple.partnerPatient
        ? `${couple.partnerPatient.firstName} ${couple.partnerPatient.lastName}`.trim()
        : "";
      const coupleName = partnerName ? `${primaryName} & ${partnerName}` : primaryName;
      setVar(values, sources, "couple.slug", couple.slug, "couple");
      setVar(values, sources, "couple.name", coupleName, "couple");
      setVar(values, sources, "couple.status", couple.status, "couple");
      setVar(values, sources, "couple.partnerName", partnerName, "couple");
      setVar(values, sources, "couple.careLoopActive", couple.careLoopActive ? "true" : "false", "couple");

      if (couple.assignedDoctor) {
        setVar(values, sources, "doctor.name", couple.assignedDoctor.name, "doctor", ["doctor_name"]);
        // User.title stands in for specialty — no dedicated specialty column
        setVar(values, sources, "doctor.title", couple.assignedDoctor.title, "doctor");
        setVar(values, sources, "doctor.specialty", couple.assignedDoctor.title, "doctor");
      }
      if (couple.assignedCoordinator) {
        setVar(values, sources, "coordinator.name", couple.assignedCoordinator.name, "coordinator", [
          "care_coordinator",
          "coordinator_name",
        ]);
      }

      if (!patientId) {
        patientId = couple.primaryPatientId;
        const fullName = primaryName;
        setVar(values, sources, "patient.firstName", couple.primaryPatient.firstName, "patient", [
          "patient_first_name",
        ]);
        setVar(values, sources, "patient.lastName", couple.primaryPatient.lastName, "patient");
        setVar(values, sources, "patient.fullName", fullName, "patient", ["patient_name"]);
        setVar(values, sources, "patient.phone", couple.primaryPatient.phone, "patient", ["patient_phone"]);
        setVar(values, sources, "patient.email", couple.primaryPatient.email, "patient");
      }
    }
  }

  if (input.appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, clinicId: ctx.clinicId },
    });
    if (appt) {
      setVar(values, sources, "appointment.date", formatDate(appt.startsAt, tz), "appointment", [
        "appointment_date",
      ]);
      setVar(values, sources, "appointment.time", formatTime(appt.startsAt, tz), "appointment", [
        "appointment_time",
      ]);
      setVar(values, sources, "appointment.doctor", appt.doctorName, "appointment", ["doctor_name"]);
      setVar(values, sources, "appointment.location", appt.room, "appointment");
      setVar(values, sources, "appointment.type", appt.type, "appointment", ["appointment_type"]);
      setVar(values, sources, "appointment.status", appt.status, "appointment");
      setVar(values, sources, "appointment.startsAt", appt.startsAt.toISOString(), "appointment", [
        "appointment_starts_at",
      ]);
      if (!coupleId && appt.coupleId) coupleId = appt.coupleId;
    }
  } else if (coupleId) {
    const upcoming = await prisma.appointment.findFirst({
      where: {
        clinicId: ctx.clinicId,
        coupleId,
        startsAt: { gte: new Date() },
        status: { in: ["CONFIRMED", "WAITING"] },
      },
      orderBy: { startsAt: "asc" },
    });
    if (upcoming) {
      setVar(values, sources, "appointment.date", formatDate(upcoming.startsAt, tz), "appointment", [
        "appointment_date",
      ]);
      setVar(values, sources, "appointment.time", formatTime(upcoming.startsAt, tz), "appointment", [
        "appointment_time",
      ]);
      setVar(values, sources, "appointment.doctor", upcoming.doctorName, "appointment");
      setVar(values, sources, "appointment.location", upcoming.room, "appointment");
      setVar(values, sources, "appointment.type", upcoming.type, "appointment", ["appointment_type"]);
      setVar(values, sources, "appointment.status", upcoming.status, "appointment");
      setVar(values, sources, "appointment.startsAt", upcoming.startsAt.toISOString(), "appointment", [
        "appointment_starts_at",
      ]);
    }
  }

  let treatment =
    input.treatmentId != null
      ? await prisma.treatment.findFirst({
          where: { id: input.treatmentId, clinicId: ctx.clinicId },
        })
      : null;
  if (!treatment && coupleId) {
    treatment = await prisma.treatment.findFirst({
      where: { clinicId: ctx.clinicId, coupleId },
      orderBy: { updatedAt: "desc" },
    });
  }
  if (treatment) {
    setVar(values, sources, "treatment.type", treatment.kind, "treatment");
    setVar(values, sources, "treatment.label", treatment.label, "treatment");
    setVar(values, sources, "treatment.status", treatment.status, "treatment");
    setVar(values, sources, "treatment.stage", treatment.stageName ?? String(treatment.stageIndex), "treatment");
    setVar(values, sources, "journey.stage", treatment.stageName ?? String(treatment.stageIndex), "journey");
    setVar(values, sources, "journey.status", treatment.status, "journey");
  }

  if (input.careTaskId) {
    const task = await prisma.careTask.findFirst({
      where: { id: input.careTaskId, clinicId: ctx.clinicId },
    });
    if (task) {
      setVar(values, sources, "careLoop.taskTitle", task.title, "careLoop", ["care_task_title"]);
      setVar(
        values,
        sources,
        "careLoop.taskDueDate",
        task.dueDate ? formatDate(task.dueDate, tz) : null,
        "careLoop",
      );
      setVar(values, sources, "careLoop.taskStatus", task.status, "careLoop");
      setVar(values, sources, "careLoop.taskPriority", task.priority, "careLoop");
    }
  } else if (coupleId) {
    const task = await prisma.careTask.findFirst({
      where: {
        clinicId: ctx.clinicId,
        coupleId,
        status: { not: "COMPLETED" },
      },
      orderBy: { dueDate: "asc" },
    });
    if (task) {
      setVar(values, sources, "careLoop.taskTitle", task.title, "careLoop", ["care_task_title"]);
      setVar(
        values,
        sources,
        "careLoop.taskDueDate",
        task.dueDate ? formatDate(task.dueDate, tz) : null,
        "careLoop",
      );
      setVar(values, sources, "careLoop.taskStatus", task.status, "careLoop");
      setVar(values, sources, "careLoop.taskPriority", task.priority, "careLoop");
    }
  }

  // Previous automation node output (explicit only)
  if (input.previousNodeOutput) {
    for (const [k, v] of Object.entries(input.previousNodeOutput)) {
      if (typeof v === "string" && v.trim()) {
        values[k] = v.trim();
        sources[k] = "previousNodeOutput";
      }
    }
  }

  // Manual overrides win
  if (input.overrides) {
    for (const [k, v] of Object.entries(input.overrides)) {
      if (typeof v === "string" && v.trim()) {
        values[k] = v.trim();
        sources[k] = "override";
      }
    }
  }

  return { values, sources, unsupportedRequested };
}

/**
 * Validate that all required template slots have non-empty values.
 */
export function validateTemplateVariables(
  requiredKeys: string[],
  values: Record<string, string>,
): { ok: true } | { ok: false; missing: string[] } {
  const missing = requiredKeys.filter((key) => !String(values[key] ?? "").trim());
  if (missing.length) return { ok: false, missing };
  return { ok: true };
}

/**
 * Map ordered slots → value map keys for validation / send.
 * Prefer resolver key; fall back to token / component.token.
 */
export function requiredKeysForSlots(
  slots: Array<{ key: string; token: string; component: string }>,
): string[] {
  return slots.map((s) => s.key);
}

export function resolveSlotValue(
  slot: { key: string; token: string; component: string },
  values: Record<string, string>,
): string {
  return (
    values[slot.key] ??
    values[slot.token] ??
    values[`${slot.component.toLowerCase()}.${slot.token}`] ??
    ""
  );
}
