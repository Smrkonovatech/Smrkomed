import { prisma } from "@smrkomed/database";

export type ConditionConfig = {
  /** Field path, e.g. appointment.status, patient.status, communication.patient_replied */
  field?: string;
  /** Legacy kind from Stage 1 library flows */
  kind?: string;
  operator?: string;
  value?: string | number | boolean;
  /** Optional AND group — all must pass when present */
  and?: ConditionConfig[];
  /** Optional OR group — any must pass when present */
  or?: ConditionConfig[];
  simulateBranch?: "yes" | "no";
};

export type ConditionEvalResult = {
  yes: boolean;
  branch: "yes" | "no";
  detail: Record<string, unknown>;
};

type EvalScope = {
  clinicId: string;
  patientId: string | null;
  coupleId: string | null;
  conversationId: string | null;
  vars: Record<string, string>;
  tags: string[];
  simulation: boolean;
};

function opCompare(left: unknown, operator: string, right: unknown): boolean {
  const op = operator || "equals";
  if (op === "exists") return left !== null && left !== undefined && left !== "";
  if (op === "not_exists") return left === null || left === undefined || left === "";
  if (op === "truthy") return Boolean(left);
  if (op === "falsy") return !left;

  const lStr = left == null ? "" : String(left);
  const rStr = right == null ? "" : String(right);
  const lNum = Number(left);
  const rNum = Number(right);
  const bothNum = !Number.isNaN(lNum) && !Number.isNaN(rNum) && lStr !== "" && rStr !== "";

  switch (op) {
    case "equals":
    case "eq":
      return bothNum ? lNum === rNum : lStr.toLowerCase() === rStr.toLowerCase();
    case "not_equals":
    case "neq":
      return bothNum ? lNum !== rNum : lStr.toLowerCase() !== rStr.toLowerCase();
    case "contains":
      return lStr.toLowerCase().includes(rStr.toLowerCase());
    case "gt":
      return bothNum && lNum > rNum;
    case "gte":
      return bothNum && lNum >= rNum;
    case "lt":
      return bothNum && lNum < rNum;
    case "lte":
      return bothNum && lNum <= rNum;
    case "in": {
      const list = rStr.split(",").map((s) => s.trim().toLowerCase());
      return list.includes(lStr.toLowerCase());
    }
    default:
      return lStr.toLowerCase() === rStr.toLowerCase();
  }
}

async function resolveField(field: string, scope: EvalScope): Promise<unknown> {
  const parts = field.split(".").filter(Boolean);
  const domain = parts[0] ?? field;
  const key = parts.slice(1).join(".") || domain;

  if (domain === "communication" || field === "patient_replied" || field === "no_response") {
    if (!scope.conversationId) return field === "no_response" || key === "no_response" ? true : false;
    const since = new Date(Date.now() - 7 * 86_400_000);
    const inbound = await prisma.message.count({
      where: {
        conversationId: scope.conversationId,
        direction: "INBOUND",
        createdAt: { gte: since },
      },
    });
    const conversation = await prisma.conversation.findFirst({
      where: { id: scope.conversationId, clinicId: scope.clinicId },
      select: { status: true, updatedAt: true },
    });
    if (field === "patient_replied" || key === "patient_replied") return inbound > 0;
    if (field === "no_response" || key === "no_response") return inbound === 0;
    if (key === "conversation_status" || key === "status") return conversation?.status ?? null;
    if (key === "last_message_at") return conversation?.updatedAt?.toISOString() ?? null;
    return inbound > 0;
  }

  if (domain === "patient" || domain === "tags") {
    if (key === "tag" || key === "has_tag" || domain === "tags") {
      return scope.tags;
    }
    if (!scope.patientId) return null;
    const patient = await prisma.patient.findFirst({
      where: { id: scope.patientId, clinicId: scope.clinicId },
    });
    if (!patient) return null;
    if (key === "status") return patient.status;
    if (key === "stage") {
      // Patient treatment stage via latest couple treatment when available
      if (scope.coupleId) {
        const treatment = await prisma.treatment.findFirst({
          where: { clinicId: scope.clinicId, coupleId: scope.coupleId },
          orderBy: { updatedAt: "desc" },
        });
        if (treatment) return treatment.stageName ?? String(treatment.stageIndex);
      }
      return scope.vars["treatment_stage"] ?? scope.vars["patient_stage"] ?? null;
    }
    if (key === "inactive_days") {
      const days = Math.floor((Date.now() - patient.updatedAt.getTime()) / 86_400_000);
      return days;
    }
    if (key === "firstName" || key === "first_name") return patient.firstName;
    if (key === "lastName" || key === "last_name") return patient.lastName;
    if (key === "phone") return patient.phone;
    return scope.vars[key] ?? null;
  }

  if (domain === "staff" || domain === "couple") {
    if (!scope.coupleId) return null;
    const couple = await prisma.couple.findFirst({
      where: { id: scope.coupleId, clinicId: scope.clinicId },
      select: {
        status: true,
        assignedDoctorId: true,
        assignedCoordinatorId: true,
        assignedDoctor: { select: { id: true, name: true } },
        assignedCoordinator: { select: { id: true, name: true } },
      },
    });
    if (!couple) return null;
    if (key === "doctor" || key === "assigned_doctor" || key === "assignedDoctorId") {
      return couple.assignedDoctorId ?? couple.assignedDoctor?.name ?? null;
    }
    if (key === "coordinator" || key === "assigned_coordinator" || key === "assignedCoordinatorId") {
      return couple.assignedCoordinatorId ?? couple.assignedCoordinator?.name ?? null;
    }
    if (key === "status") return couple.status;
    return null;
  }

  if (domain === "appointment") {
    if (!scope.coupleId && !scope.vars["appointment_id"]) return null;
    const appointment = scope.vars["appointment_id"]
      ? await prisma.appointment.findFirst({
          where: { id: scope.vars["appointment_id"], clinicId: scope.clinicId },
        })
      : scope.coupleId
        ? await prisma.appointment.findFirst({
            where: { clinicId: scope.clinicId, coupleId: scope.coupleId },
            orderBy: { startsAt: "asc" },
          })
        : null;
    if (!appointment) return null;
    if (key === "status") return appointment.status;
    if (key === "type") return appointment.type;
    if (key === "doctor" || key === "doctorName") return appointment.doctorName;
    if (key === "date" || key === "startsAt") return appointment.startsAt.toISOString();
    if (key === "days_until") {
      return Math.ceil((appointment.startsAt.getTime() - Date.now()) / 86_400_000);
    }
    return null;
  }

  if (domain === "care_task" || domain === "task") {
    const taskId = scope.vars["care_task_id"];
    const task = taskId
      ? await prisma.careTask.findFirst({ where: { id: taskId, clinicId: scope.clinicId } })
      : scope.coupleId
        ? await prisma.careTask.findFirst({
            where: { clinicId: scope.clinicId, coupleId: scope.coupleId },
            orderBy: { updatedAt: "desc" },
          })
        : null;
    if (!task) return null;
    if (key === "status") return task.status;
    if (key === "overdue") {
      return Boolean(task.dueDate && task.dueDate.getTime() < Date.now() && task.status !== "COMPLETED");
    }
    if (key === "due_date" || key === "dueDate") return task.dueDate?.toISOString() ?? null;
    if (key === "title") return task.title;
    if (key === "assigned" || key === "assigned_staff" || key === "assignee") {
      const assignment = await prisma.taskAssignment.findFirst({
        where: { careTaskId: task.id },
        select: { userId: true, user: { select: { name: true } } },
      });
      return assignment?.userId ?? assignment?.user?.name ?? null;
    }
    return null;
  }

  if (domain === "care_plan" || domain === "treatment") {
    if (!scope.coupleId) return null;
    if (domain === "treatment") {
      const treatment = await prisma.treatment.findFirst({
        where: { clinicId: scope.clinicId, coupleId: scope.coupleId },
        orderBy: { updatedAt: "desc" },
      });
      if (!treatment) return null;
      if (key === "name" || key === "type" || key === "label") return treatment.label;
      if (key === "stage") return treatment.stageName ?? String(treatment.stageIndex);
      if (key === "status") return treatment.status;
      return null;
    }
    const plan = await prisma.carePlan.findFirst({
      where: { clinicId: scope.clinicId, coupleId: scope.coupleId },
      orderBy: { updatedAt: "desc" },
    });
    if (!plan) return null;
    if (key === "status") return plan.status;
    if (key === "name" || key === "title") return plan.name;
    if (key === "stage" || key === "treatment") return plan.type;
    return null;
  }

  if (domain === "medication" || domain === "pharmacy") {
    if (!scope.patientId && !scope.coupleId) return null;
    const reminder = await prisma.medicationReminder.findFirst({
      where: {
        clinicId: scope.clinicId,
        ...(scope.patientId ? { patientId: scope.patientId } : {}),
        status: { in: ["PENDING", "SCHEDULED"] },
      },
      orderBy: { scheduledAt: "asc" },
    });
    if (key === "assigned") return Boolean(reminder);
    if (!reminder) return null;
    if (key === "medicine" || key === "name") return scope.vars["medicine_name"] ?? null;
    if (key === "timing" || key === "time") {
      return reminder.scheduledAt.toISOString() ?? scope.vars["medicine_time"] ?? null;
    }
    if (key === "duration") return scope.vars["medicine_duration"] ?? null;
    return Boolean(reminder);
  }

  if (domain === "payment") {
    if (!scope.patientId && !scope.coupleId) return null;
    const payment = await prisma.billingPayment.findFirst({
      where: {
        clinicId: scope.clinicId,
        ...(scope.patientId ? { patientId: scope.patientId } : {}),
        ...(scope.coupleId ? { coupleId: scope.coupleId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    if (!payment) {
      if (key === "pending") return false;
      if (key === "paid") return false;
      return null;
    }
    if (key === "status") return payment.status;
    if (key === "pending") return payment.status === "PENDING";
    if (key === "paid") return payment.status === "SUCCESS";
    if (key === "overdue") return payment.status === "PENDING" && scope.vars["payment_overdue"] === "true";
    if (key === "amount") return String(payment.amount);
    return payment.status;
  }

  if (domain === "workflow") {
    if (key === "tag" || key === "has_tag") return scope.tags;
    return scope.vars[key] ?? null;
  }

  return scope.vars[field] ?? scope.vars[key] ?? null;
}

async function evalOne(cfg: ConditionConfig, scope: EvalScope): Promise<ConditionEvalResult> {
  if (scope.simulation && cfg.simulateBranch === "yes") {
    return { yes: true, branch: "yes", detail: { simulated: true } };
  }
  if (scope.simulation && cfg.simulateBranch === "no") {
    return { yes: false, branch: "no", detail: { simulated: true } };
  }

  if (cfg.and?.length) {
    const parts = [];
    for (const c of cfg.and) {
      const r = await evalOne(c, scope);
      parts.push(r);
      if (!r.yes) return { yes: false, branch: "no", detail: { and: parts } };
    }
    return { yes: true, branch: "yes", detail: { and: parts } };
  }
  if (cfg.or?.length) {
    const parts = [];
    for (const c of cfg.or) {
      const r = await evalOne(c, scope);
      parts.push(r);
      if (r.yes) return { yes: true, branch: "yes", detail: { or: parts } };
    }
    return { yes: false, branch: "no", detail: { or: parts } };
  }

  // Legacy Stage 1 kind
  const kind = cfg.kind ?? "";
  if (kind === "patient_replied" || (!cfg.field && kind === "")) {
    const field = kind === "patient_replied" || !cfg.field ? "communication.patient_replied" : cfg.field!;
    const left = await resolveField(field, scope);
    const yes = opCompare(left, cfg.operator ?? "truthy", cfg.value ?? true);
    return { yes, branch: yes ? "yes" : "no", detail: { field, left, operator: cfg.operator ?? "truthy" } };
  }
  if (kind === "no_response") {
    const left = await resolveField("communication.no_response", scope);
    const yes = Boolean(left);
    return { yes, branch: yes ? "yes" : "no", detail: { kind, left } };
  }

  const field = cfg.field ?? kind;
  const left = await resolveField(field, scope);
  let yes: boolean;
  if (Array.isArray(left) && (cfg.operator === "contains" || field.includes("tag"))) {
    yes = left.map(String).some((t) => t.toLowerCase() === String(cfg.value ?? "").toLowerCase());
  } else {
    yes = opCompare(left, cfg.operator ?? "equals", cfg.value);
  }
  return {
    yes,
    branch: yes ? "yes" : "no",
    detail: { field, left, operator: cfg.operator ?? "equals", value: cfg.value },
  };
}

/** Server-side condition evaluation — clinic scoped via scope.clinicId queries. */
export async function evaluateCondition(
  config: Record<string, unknown>,
  scope: EvalScope,
): Promise<ConditionEvalResult> {
  return evalOne(config as ConditionConfig, scope);
}
