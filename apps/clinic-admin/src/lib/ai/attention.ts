/** Deterministic operational attention — never medical risk. */

export type AttentionCategory =
  | "Needs Attention"
  | "Follow-up Due"
  | "Appointment Risk"
  | "Care Plan Delay"
  | "No Recent Activity"
  | "Unassigned";

/** UI severity for Copilot cards — operational only. */
export type AttentionSeverity = "high" | "medium" | "info";

export type AttentionItem = {
  id: string;
  coupleId: string;
  coupleSlug: string;
  coupleLabel: string;
  treatment?: string;
  category: AttentionCategory;
  severity: AttentionSeverity;
  reason: string;
  suggestedAction: "create_follow_up" | "draft_whatsapp" | "view_patient";
};

export function severityForCategory(category: AttentionCategory): AttentionSeverity {
  switch (category) {
    case "Care Plan Delay":
    case "Appointment Risk":
    case "Follow-up Due":
      return "high";
    case "Needs Attention":
    case "No Recent Activity":
      return "medium";
    case "Unassigned":
    default:
      return "info";
  }
}

export type FollowUpBucket = "URGENT" | "DUE_SOON" | "INACTIVE" | "UPCOMING";

export type FollowUpQueueItem = {
  id: string;
  bucket: FollowUpBucket;
  coupleId: string;
  coupleSlug: string;
  coupleLabel: string;
  treatment?: string;
  reason: string;
  dueLabel?: string;
  assignedStaff?: string;
  lastActivityLabel?: string;
  priority?: EngagementLevel;
  suggestedAction?: string;
};

/** Operational engagement level — never medical/clinical risk. */
export type EngagementLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PatientAttentionScore = {
  coupleId: string;
  coupleSlug: string;
  coupleLabel: string;
  treatment?: string;
  level: EngagementLevel;
  label: "Needs Attention" | "Follow-up Risk" | "Engagement Risk" | "On Track";
  reasons: string[];
  recommendedAction: string;
  score: number;
};

export type PrepareMyDayItem = {
  id: string;
  time: string;
  kind: "appointment" | "follow_up" | "overdue_task";
  coupleId: string;
  coupleSlug: string;
  coupleLabel: string;
  appointmentType: string;
  treatment?: string;
  checklist: Array<{ label: string; tone: "ok" | "warn" | "info" }>;
};

export type TeamWorkloadItem = {
  id: string;
  name: string;
  roleHint: string;
  activePatients: number;
  openTasks: number;
  appointmentsToday: number;
  overdueTasks: number;
  followUpsDue: number;
};

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function withSeverity(
  item: Omit<AttentionItem, "severity"> & { severity?: AttentionSeverity },
): AttentionItem {
  return {
    ...item,
    severity: item.severity ?? severityForCategory(item.category),
  };
}

/** Deterministic patient attention score from operational signals only. */
export function scorePatientAttention(input: {
  coupleId: string;
  coupleSlug: string;
  coupleLabel: string;
  treatment?: string;
  careLoopPaused?: boolean;
  statusNeedsAttention?: boolean;
  overdueTaskCount: number;
  pendingTaskCount: number;
  missedAppointmentCount: number;
  upcomingAppointmentCount: number;
  unassignedDoctor?: boolean;
  unassignedCoordinator?: boolean;
  noResponseException?: boolean;
  inactiveDays?: number;
}): PatientAttentionScore {
  const reasons: string[] = [];
  let score = 0;

  if (input.overdueTaskCount > 0) {
    score += 30 + Math.min(input.overdueTaskCount, 3) * 10;
    reasons.push(
      `${input.overdueTaskCount} overdue task${input.overdueTaskCount === 1 ? "" : "s"}`,
    );
  }
  if (input.missedAppointmentCount > 0) {
    score += 25;
    reasons.push("Missed / no-show appointment on record");
  }
  if (input.upcomingAppointmentCount > 0 && input.pendingTaskCount > 0) {
    score += 15;
    reasons.push("Upcoming appointment with pending preparation tasks");
  }
  if (input.careLoopPaused || input.statusNeedsAttention) {
    score += 20;
    reasons.push(
      input.careLoopPaused
        ? "Care Loop paused"
        : "Couple status marked Needs Attention",
    );
  }
  if (input.noResponseException) {
    score += 20;
    reasons.push("Unanswered communication exception on record");
  }
  if ((input.inactiveDays ?? 0) >= 7) {
    score += 15;
    reasons.push(`No recent recorded interaction for ${input.inactiveDays} days`);
  }
  if (input.unassignedDoctor || input.unassignedCoordinator) {
    score += 8;
    reasons.push("Doctor or coordinator assignment missing");
  }

  let level: EngagementLevel = "LOW";
  if (score >= 70) level = "CRITICAL";
  else if (score >= 45) level = "HIGH";
  else if (score >= 20) level = "MEDIUM";

  const label =
    level === "LOW"
      ? "On Track"
      : level === "MEDIUM"
        ? "Follow-up Risk"
        : level === "HIGH"
          ? "Needs Attention"
          : "Engagement Risk";

  const recommendedAction =
    level === "LOW"
      ? "No urgent operational action from current records."
      : input.overdueTaskCount > 0
        ? "Coordinator follow-up on overdue care tasks"
        : input.upcomingAppointmentCount > 0
          ? "Prepare consultation and clear pending tasks"
          : "Coordinator follow-up";

  return {
    coupleId: input.coupleId,
    coupleSlug: input.coupleSlug,
    coupleLabel: input.coupleLabel,
    ...(input.treatment ? { treatment: input.treatment } : {}),
    level,
    label,
    reasons: reasons.length ? reasons : ["No operational attention signals in current records."],
    recommendedAction,
    score,
  };
}

/** Server-side: build attention from Prisma-shaped rows. */
export function buildPatientAttention(input: {
  couples: Array<{
    id: string;
    slug: string;
    label: string;
    treatment?: string | null;
    stage?: string | null;
    careLoopActive: boolean;
    doctorName?: string | null;
    coordinatorName?: string | null;
    updatedAt: Date;
    overdueTaskCount: number;
    pendingTaskCount: number;
    missedAppointmentCount: number;
    upcomingAppointmentCount: number;
    pendingDocumentCount: number;
    lastConsultationAt?: Date | null;
  }>;
  inactiveDays?: number;
}): AttentionItem[] {
  const inactiveDays = input.inactiveDays ?? 7;
  const now = new Date();
  const items: Array<Omit<AttentionItem, "severity">> = [];

  for (const couple of input.couples) {
    const inactiveFor = daysBetween(couple.updatedAt, now);
    const unassignedDoctor = !couple.doctorName;
    const unassignedCoordinator = !couple.coordinatorName;

    if (couple.overdueTaskCount > 0) {
      items.push({
        id: `overdue-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: couple.label,
        ...(couple.treatment ? { treatment: couple.treatment } : {}),
        category: "Care Plan Delay",
        reason: `${couple.overdueTaskCount} overdue care task${couple.overdueTaskCount === 1 ? "" : "s"} in clinic records.`,
        suggestedAction: "create_follow_up",
      });
    }

    if (couple.missedAppointmentCount > 0) {
      items.push({
        id: `missed-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: couple.label,
        ...(couple.treatment ? { treatment: couple.treatment } : {}),
        category: "Appointment Risk",
        reason: `${couple.missedAppointmentCount} missed/no-show appointment${couple.missedAppointmentCount === 1 ? "" : "s"} recorded.`,
        suggestedAction: "create_follow_up",
      });
    }

    if (couple.upcomingAppointmentCount === 0 && couple.pendingTaskCount > 0) {
      items.push({
        id: `nofollow-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: couple.label,
        ...(couple.treatment ? { treatment: couple.treatment } : {}),
        category: "Follow-up Due",
        reason: "Pending tasks exist and no upcoming appointment is scheduled.",
        suggestedAction: "create_follow_up",
      });
    }

    if (unassignedDoctor || unassignedCoordinator) {
      const missing = [
        unassignedDoctor ? "doctor" : null,
        unassignedCoordinator ? "coordinator" : null,
      ]
        .filter(Boolean)
        .join(" and ");
      items.push({
        id: `unassigned-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: couple.label,
        ...(couple.treatment ? { treatment: couple.treatment } : {}),
        category: "Unassigned",
        reason: `No assigned ${missing} in clinic records.`,
        suggestedAction: "view_patient",
      });
    }

    if (!couple.careLoopActive) {
      items.push({
        id: `paused-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: couple.label,
        ...(couple.treatment ? { treatment: couple.treatment } : {}),
        category: "Needs Attention",
        reason: "Care Loop is paused — may need coordinator follow-up.",
        suggestedAction: "draft_whatsapp",
      });
    }

    if (inactiveFor >= inactiveDays) {
      items.push({
        id: `inactive-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: couple.label,
        ...(couple.treatment ? { treatment: couple.treatment } : {}),
        category: "No Recent Activity",
        reason: `No recorded clinic activity update for ${inactiveFor} days.`,
        suggestedAction: "create_follow_up",
      });
    }

    if (couple.pendingDocumentCount > 0 && couple.upcomingAppointmentCount > 0) {
      items.push({
        id: `docs-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: couple.label,
        ...(couple.treatment ? { treatment: couple.treatment } : {}),
        category: "Needs Attention",
        reason: `${couple.pendingDocumentCount} pending document${couple.pendingDocumentCount === 1 ? "" : "s"} with an upcoming appointment.`,
        suggestedAction: "view_patient",
      });
    }
  }

  const order: Record<AttentionCategory, number> = {
    "Needs Attention": 0,
    "Appointment Risk": 1,
    "Care Plan Delay": 2,
    "Follow-up Due": 3,
    "No Recent Activity": 4,
    Unassigned: 5,
  };
  return items
    .map((item) => withSeverity(item))
    .sort((a, b) => order[a.category] - order[b.category])
    .slice(0, 40);
}

export function buildFollowUpQueue(input: {
  overdueTasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    coupleId: string | null;
    coupleSlug: string | null;
    coupleLabel: string | null;
    treatment?: string | null;
    assignedStaff?: string | null;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    coupleId: string | null;
    coupleSlug: string | null;
    coupleLabel: string | null;
    treatment?: string | null;
    assignedStaff?: string | null;
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    coupleId: string | null;
    coupleSlug: string | null;
    coupleLabel: string | null;
    treatment?: string | null;
    assignedStaff?: string | null;
  }>;
  noResponse: AttentionItem[];
  inactive: AttentionItem[];
}): FollowUpQueueItem[] {
  const items: FollowUpQueueItem[] = [];

  for (const task of input.overdueTasks) {
    if (!task.coupleId || !task.coupleSlug) continue;
    items.push({
      id: `od-${task.id}`,
      bucket: "URGENT",
      coupleId: task.coupleId,
      coupleSlug: task.coupleSlug,
      coupleLabel: task.coupleLabel ?? "Patient",
      ...(task.treatment ? { treatment: task.treatment } : {}),
      reason: `Overdue: ${task.title}`,
      priority: "HIGH",
      suggestedAction: "Create follow-up task",
      ...(task.dueDate
        ? {
            dueLabel: task.dueDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
          }
        : {}),
      ...(task.assignedStaff ? { assignedStaff: task.assignedStaff } : {}),
    });
  }

  for (const task of input.todayTasks) {
    if (!task.coupleId || !task.coupleSlug) continue;
    items.push({
      id: `td-${task.id}`,
      bucket: "URGENT",
      coupleId: task.coupleId,
      coupleSlug: task.coupleSlug,
      coupleLabel: task.coupleLabel ?? "Patient",
      ...(task.treatment ? { treatment: task.treatment } : {}),
      reason: `Due today: ${task.title}`,
      dueLabel: "Today",
      priority: "HIGH",
      suggestedAction: "Complete or reassign today",
      ...(task.assignedStaff ? { assignedStaff: task.assignedStaff } : {}),
    });
  }

  for (const task of input.upcomingTasks) {
    if (!task.coupleId || !task.coupleSlug) continue;
    items.push({
      id: `up-${task.id}`,
      bucket: "DUE_SOON",
      coupleId: task.coupleId,
      coupleSlug: task.coupleSlug,
      coupleLabel: task.coupleLabel ?? "Patient",
      ...(task.treatment ? { treatment: task.treatment } : {}),
      reason: `Upcoming: ${task.title}`,
      priority: "MEDIUM",
      suggestedAction: "Prepare follow-up",
      ...(task.dueDate
        ? {
            dueLabel: task.dueDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
          }
        : {}),
      ...(task.assignedStaff ? { assignedStaff: task.assignedStaff } : {}),
    });
  }

  for (const item of input.noResponse) {
    items.push({
      id: `nr-${item.id}`,
      bucket: "INACTIVE",
      coupleId: item.coupleId,
      coupleSlug: item.coupleSlug,
      coupleLabel: item.coupleLabel,
      ...(item.treatment ? { treatment: item.treatment } : {}),
      reason: item.reason,
      priority: "HIGH",
      suggestedAction: "Draft WhatsApp / call script",
    });
  }

  for (const item of input.inactive) {
    items.push({
      id: `in-${item.id}`,
      bucket: "INACTIVE",
      coupleId: item.coupleId,
      coupleSlug: item.coupleSlug,
      coupleLabel: item.coupleLabel,
      ...(item.treatment ? { treatment: item.treatment } : {}),
      reason: item.reason,
      priority: "MEDIUM",
      suggestedAction: "Coordinator check-in",
    });
  }

  return items.slice(0, 50);
}

/** Client AppState → attention cards (operational only). */
export function buildClientAttention(input: {
  couples: Array<{
    id: string;
    slug: string;
    primary: { name: string };
    partner?: { name: string } | null;
    treatment: string;
    doctor: string;
    coordinator: string;
    careLoop: "Active" | "Paused";
    status: string;
    nextStep: string;
  }>;
  tasks: Array<{ id: string; coupleId: string; title: string; status: string; due: string }>;
  appointments: Array<{ id: string; coupleId: string; type: string; status: string; date?: string }>;
  documents: Array<{ coupleId: string; status: string }>;
}): AttentionItem[] {
  const items: Array<Omit<AttentionItem, "severity">> = [];

  for (const couple of input.couples) {
    const label = couple.partner
      ? `${couple.primary.name} + ${couple.partner.name}`
      : couple.primary.name;
    const coupleTasks = input.tasks.filter((t) => t.coupleId === couple.id);
    const overdue = coupleTasks.filter((t) => t.status === "overdue" || t.status === "escalated");
    const pending = coupleTasks.filter((t) => t.status !== "completed");
    const coupleAppts = input.appointments.filter((a) => a.coupleId === couple.id);
    const missed = coupleAppts.filter((a) => a.status === "No-show");
    const upcoming = coupleAppts.filter(
      (a) => a.status === "Confirmed" || a.status === "Waiting",
    );
    const pendingDocs = input.documents.filter(
      (d) => d.coupleId === couple.id && d.status === "Awaiting Upload",
    );

    if (overdue.length) {
      items.push({
        id: `c-overdue-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: label,
        treatment: couple.treatment,
        category: "Care Plan Delay",
        reason: `${overdue.length} overdue care task${overdue.length === 1 ? "" : "s"}: ${overdue[0]!.title}.`,
        suggestedAction: "create_follow_up",
      });
    }

    if (missed.length) {
      items.push({
        id: `c-missed-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: label,
        treatment: couple.treatment,
        category: "Appointment Risk",
        reason: `Missed appointment recorded: ${missed[0]!.type}.`,
        suggestedAction: "create_follow_up",
      });
    }

    if (couple.careLoop === "Paused" || couple.status === "Needs Attention") {
      items.push({
        id: `c-attn-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: label,
        treatment: couple.treatment,
        category: "Needs Attention",
        reason:
          couple.careLoop === "Paused"
            ? "Care Loop is paused in clinic records."
            : "Couple status is marked Needs Attention.",
        suggestedAction: "draft_whatsapp",
      });
    }

    if (pending.length && upcoming.length === 0) {
      items.push({
        id: `c-fu-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: label,
        treatment: couple.treatment,
        category: "Follow-up Due",
        reason: "Open tasks with no upcoming appointment scheduled.",
        suggestedAction: "create_follow_up",
      });
    }

    if (!couple.doctor?.trim() || !couple.coordinator?.trim()) {
      items.push({
        id: `c-un-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: label,
        treatment: couple.treatment,
        category: "Unassigned",
        reason: "Doctor or coordinator assignment is missing.",
        suggestedAction: "view_patient",
      });
    }

    if (couple.careLoop === "Paused" && overdue.length === 0) {
      items.push({
        id: `c-inactive-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: label,
        treatment: couple.treatment,
        category: "No Recent Activity",
        reason: "Paused Care Loop with no overdue tasks — may need a check-in.",
        suggestedAction: "create_follow_up",
      });
    }

    if (pendingDocs.length && upcoming.length) {
      items.push({
        id: `c-docs-${couple.id}`,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        coupleLabel: label,
        treatment: couple.treatment,
        category: "Needs Attention",
        reason: `${pendingDocs.length} document(s) awaiting upload before appointment.`,
        suggestedAction: "view_patient",
      });
    }
  }

  return items.map((item) => withSeverity(item)).slice(0, 40);
}

export function buildClientFollowUpQueue(input: {
  couples: Array<{
    id: string;
    slug: string;
    primary: { name: string };
    partner?: { name: string } | null;
    treatment: string;
    doctor: string;
    coordinator: string;
  }>;
  tasks: Array<{
    id: string;
    coupleId: string;
    title: string;
    status: string;
    due: string;
    assignedTo: string;
  }>;
  appointments?: Array<{
    coupleId: string;
    type: string;
    status: string;
    date?: string;
    time: string;
  }>;
  attention: AttentionItem[];
}): FollowUpQueueItem[] {
  const coupleMap = new Map(input.couples.map((c) => [c.id, c]));
  const items: FollowUpQueueItem[] = [];

  for (const task of input.tasks) {
    const couple = coupleMap.get(task.coupleId);
    if (!couple) continue;
    const label = couple.partner
      ? `${couple.primary.name} + ${couple.partner.name}`
      : couple.primary.name;
    let bucket: FollowUpBucket | null = null;
    let priority: EngagementLevel = "MEDIUM";
    if (task.status === "overdue" || task.status === "escalated") {
      bucket = "URGENT";
      priority = "HIGH";
    } else if (task.status !== "completed" && /today/i.test(task.due)) {
      bucket = "URGENT";
      priority = "HIGH";
    } else if (task.status === "waiting" || task.status === "in_progress") {
      bucket = "DUE_SOON";
      priority = "MEDIUM";
    }
    if (!bucket) continue;
    items.push({
      id: `task-${task.id}`,
      bucket,
      coupleId: couple.id,
      coupleSlug: couple.slug,
      coupleLabel: label,
      treatment: couple.treatment,
      reason: task.title,
      dueLabel: task.due,
      assignedStaff: task.assignedTo || couple.coordinator,
      priority,
      suggestedAction: bucket === "URGENT" ? "Create follow-up / complete today" : "Prepare follow-up",
    });
  }

  for (const a of input.attention) {
    if (a.category === "Needs Attention" || a.category === "No Recent Activity") {
      items.push({
        id: `attn-${a.id}`,
        bucket: "INACTIVE",
        coupleId: a.coupleId,
        coupleSlug: a.coupleSlug,
        coupleLabel: a.coupleLabel,
        ...(a.treatment ? { treatment: a.treatment } : {}),
        reason: a.reason,
        priority: a.severity === "high" ? "HIGH" : "MEDIUM",
        suggestedAction: "Draft WhatsApp / call script",
      });
    }
  }

  for (const appt of input.appointments ?? []) {
    if (appt.status === "Completed" || appt.status === "No-show") continue;
    const couple = coupleMap.get(appt.coupleId);
    if (!couple) continue;
    const label = couple.partner
      ? `${couple.primary.name} + ${couple.partner.name}`
      : couple.primary.name;
    items.push({
      id: `appt-${appt.coupleId}-${appt.time}`,
      bucket: "UPCOMING",
      coupleId: couple.id,
      coupleSlug: couple.slug,
      coupleLabel: label,
      treatment: couple.treatment,
      reason: `${appt.type} · ${appt.time}`,
      dueLabel: appt.date ?? "Scheduled",
      priority: "MEDIUM",
      suggestedAction: "Prepare consultation",
      assignedStaff: couple.doctor,
    });
  }

  return items.slice(0, 50);
}

export type TaskRecommendation = {
  id: string;
  coupleId: string;
  coupleSlug: string;
  coupleLabel: string;
  title: string;
  reason: string;
  dueDate?: string;
};

/** Suggest prep tasks when appointment is soon and no prep task exists. */
export function buildTaskRecommendations(input: {
  couples: Array<{
    id: string;
    slug: string;
    primary: { name: string };
    partner?: { name: string } | null;
  }>;
  tasks: Array<{ coupleId: string; title: string; status: string }>;
  appointments: Array<{
    id: string;
    coupleId: string;
    type: string;
    status: string;
    date?: string;
  }>;
}): TaskRecommendation[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const recs: TaskRecommendation[] = [];
  for (const appt of input.appointments) {
    if (appt.status === "Completed" || appt.status === "No-show") continue;
    const date = appt.date ? new Date(`${appt.date}T00:00:00`) : today;
    if (date < today || date >= dayAfter) continue;
    const couple = input.couples.find((c) => c.id === appt.coupleId);
    if (!couple) continue;
    const hasPrep = input.tasks.some(
      (t) =>
        t.coupleId === couple.id &&
        t.status !== "completed" &&
        /prep|preparation|checklist|bring/i.test(t.title),
    );
    if (hasPrep) continue;
    const label = couple.partner
      ? `${couple.primary.name} + ${couple.partner.name}`
      : couple.primary.name;
    const dueIso = date.toISOString().slice(0, 10);
    recs.push({
      id: `prep-${appt.id}`,
      coupleId: couple.id,
      coupleSlug: couple.slug,
      coupleLabel: label,
      title: `Preparation for ${appt.type}`,
      reason: `Appointment ${date.getTime() === today.getTime() ? "today" : "tomorrow"} (${appt.type}) with no preparation task in records.`,
      dueDate: dueIso,
    });
  }
  return recs.slice(0, 8);
}

/** Deterministic Prepare My Day schedule from AppState. */
export function buildPrepareMyDay(input: {
  couples: Array<{
    id: string;
    slug: string;
    primary: { name: string };
    partner?: { name: string } | null;
    treatment: string;
    stage: string;
    nextStep: string;
    careLoop: "Active" | "Paused";
    status: string;
  }>;
  tasks: Array<{ id: string; coupleId: string; title: string; status: string; due: string }>;
  appointments: Array<{
    id: string;
    coupleId: string;
    type: string;
    status: string;
    time: string;
    date?: string;
  }>;
}): PrepareMyDayItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const coupleMap = new Map(input.couples.map((c) => [c.id, c]));
  const items: PrepareMyDayItem[] = [];

  const todays = input.appointments
    .filter((a) => {
      if (a.status === "Completed" || a.status === "No-show") return false;
      if (!a.date) return true;
      const d = new Date(`${a.date}T00:00:00`);
      return d >= today && d < tomorrow;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  for (const appt of todays.slice(0, 10)) {
    const couple = coupleMap.get(appt.coupleId);
    const label = couple
      ? couple.partner
        ? `${couple.primary.name} + ${couple.partner.name}`
        : couple.primary.name
      : "Patient";
    const coupleTasks = input.tasks.filter((t) => t.coupleId === appt.coupleId);
    const overdue = coupleTasks.filter((t) => t.status === "overdue" || t.status === "escalated");
    const pending = coupleTasks.filter((t) => t.status !== "completed");
    const checklist: PrepareMyDayItem["checklist"] = [
      { label: "Previous consultation summary", tone: "ok" },
      {
        label: couple ? `Current treatment stage: ${couple.stage}` : "Current treatment stage",
        tone: "info",
      },
      {
        label: pending.length ? `Pending tasks (${pending.length})` : "No pending tasks on record",
        tone: pending.length ? "info" : "ok",
      },
      {
        label: couple?.nextStep
          ? `Next planned action: ${couple.nextStep}`
          : "Next planned action not recorded",
        tone: "ok",
      },
    ];
    if (overdue.length) {
      checklist.push({
        label: `Follow-up task overdue: ${overdue[0]!.title}`,
        tone: "warn",
      });
    }
    items.push({
      id: `appt-${appt.id}`,
      time: appt.time,
      kind: "appointment",
      coupleId: appt.coupleId,
      coupleSlug: couple?.slug ?? "",
      coupleLabel: label,
      appointmentType: appt.type,
      ...(couple?.treatment ? { treatment: couple.treatment } : {}),
      checklist,
    });
  }

  for (const task of input.tasks.filter((t) => t.status === "overdue" || t.status === "escalated").slice(0, 6)) {
    const couple = coupleMap.get(task.coupleId);
    if (!couple) continue;
    const label = couple.partner
      ? `${couple.primary.name} + ${couple.partner.name}`
      : couple.primary.name;
    items.push({
      id: `od-${task.id}`,
      time: "Overdue",
      kind: "overdue_task",
      coupleId: couple.id,
      coupleSlug: couple.slug,
      coupleLabel: label,
      appointmentType: task.title,
      treatment: couple.treatment,
      checklist: [
        { label: `Task: ${task.title}`, tone: "warn" },
        { label: `Due: ${task.due}`, tone: "info" },
        { label: `Stage: ${couple.stage}`, tone: "ok" },
      ],
    });
  }

  for (const couple of input.couples.filter(
    (c) => c.careLoop === "Paused" || c.status === "Needs Attention",
  ).slice(0, 5)) {
    if (items.some((i) => i.coupleId === couple.id && i.kind === "follow_up")) continue;
    const label = couple.partner
      ? `${couple.primary.name} + ${couple.partner.name}`
      : couple.primary.name;
    items.push({
      id: `fu-${couple.id}`,
      time: "Follow-up",
      kind: "follow_up",
      coupleId: couple.id,
      coupleSlug: couple.slug,
      coupleLabel: label,
      appointmentType: "Follow-up required",
      treatment: couple.treatment,
      checklist: [
        {
          label:
            couple.careLoop === "Paused"
              ? "Reason: Care Loop paused / no recent activity signal"
              : "Reason: Status Needs Attention",
          tone: "warn",
        },
        { label: `Next step on record: ${couple.nextStep || "Not available in SmrkoMed."}`, tone: "info" },
      ],
    });
  }

  return items.slice(0, 16);
}

/** Deterministic team workload from AppState staff + couples/tasks/appointments. */
export function buildTeamWorkload(input: {
  staff: Array<{ id: string; name: string; role: string; roleName: string }>;
  couples: Array<{ id: string; doctor: string; coordinator: string; careLoop: string }>;
  tasks: Array<{ coupleId: string; status: string; due: string; assignedTo: string }>;
  appointments: Array<{ coupleId: string; doctor: string; status: string; date?: string }>;
}): TeamWorkloadItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rows = input.staff.map((member) => {
    const name = member.name.trim();
    const isDoctor = /doctor|DOCTOR|fertility|clinician/i.test(
      `${member.role} ${member.roleName} ${name}`,
    );
    const activePatients = input.couples.filter((c) =>
      isDoctor
        ? c.doctor === name || c.doctor.includes(name)
        : c.coordinator === name || c.coordinator.includes(name),
    ).length;
    const appointmentsToday = input.appointments.filter((a) => {
      if (a.status === "Completed" || a.status === "No-show") return false;
      const onToday = !a.date || (() => {
        const d = new Date(`${a.date}T00:00:00`);
        return d >= today && d < tomorrow;
      })();
      return onToday && (a.doctor === name || a.doctor.includes(name));
    }).length;
    const relatedCoupleIds = new Set(
      input.couples
        .filter((c) =>
          isDoctor
            ? c.doctor === name || c.doctor.includes(name)
            : c.coordinator === name || c.coordinator.includes(name),
        )
        .map((c) => c.id),
    );
    const overdueTasks = input.tasks.filter(
      (t) =>
        (t.status === "overdue" || t.status === "escalated") &&
        (relatedCoupleIds.has(t.coupleId) || t.assignedTo === name),
    ).length;
    const followUpsDue = input.tasks.filter(
      (t) =>
        t.status !== "completed" &&
        /today/i.test(t.due) &&
        (relatedCoupleIds.has(t.coupleId) || t.assignedTo === name),
    ).length;

    return {
      id: member.id,
      name,
      roleHint: member.roleName || member.role,
      activePatients,
      openTasks: input.tasks.filter(
        (t) =>
          t.status !== "completed" &&
          (relatedCoupleIds.has(t.coupleId) || t.assignedTo === name),
      ).length,
      appointmentsToday,
      overdueTasks,
      followUpsDue,
    };
  });

  return rows
    .filter((r) => r.activePatients > 0 || r.appointmentsToday > 0 || r.overdueTasks > 0)
    .sort(
      (a, b) =>
        b.overdueTasks + b.followUpsDue + b.appointmentsToday -
        (a.overdueTasks + a.followUpsDue + a.appointmentsToday),
    )
    .slice(0, 12);
}
