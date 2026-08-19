import {
  prisma,
  type CarePlanType,
  type CareTaskStatus,
  type TenantContext,
  type TreatmentKind,
} from "@smrkomed/database";

import { HttpError, notFound } from "../../lib/errors";

export const coupleInclude = {
  primaryPatient: true,
  partnerPatient: true,
  assignedDoctor: { select: { id: true, name: true } },
  assignedCoordinator: { select: { id: true, name: true } },
  treatments: { orderBy: { createdAt: "desc" as const }, take: 1 },
  carePlans: { orderBy: { createdAt: "desc" as const }, take: 3 },
  careTasks: {
    where: { status: { notIn: ["CANCELLED"] as CareTaskStatus[] } },
    orderBy: { createdAt: "desc" as const },
    take: 8,
    select: { id: true, title: true, status: true, dueDate: true, completedAt: true },
  },
};

const TREATMENT_KIND: Record<"IVF" | "IUI" | "Evaluation" | "FET", TreatmentKind> = {
  IVF: "IVF",
  IUI: "IUI",
  Evaluation: "EVALUATION",
  FET: "FET",
};

const CARE_PLAN_TYPE: Record<"IVF" | "IUI" | "Evaluation" | "FET", CarePlanType> = {
  IVF: "IVF",
  IUI: "IUI",
  Evaluation: "FERTILITY_EVALUATION",
  FET: "FET",
};

const LANGUAGE: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Kannada: "kn",
  Malayalam: "ml",
  Tamil: "ta",
};

export function splitName(fullName: string) {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ");
  const firstName = parts[0] ?? trimmed;
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName: firstName.slice(0, 100), lastName: lastName.slice(0, 100) };
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "couple";
}

function languageCode(value?: string) {
  if (!value) return "en";
  return LANGUAGE[value] ?? value.slice(0, 16).toLowerCase();
}

function parseDate(value: string) {
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(422, "INVALID_DATE", "Enter a valid date.");
  }
  return parsed;
}

async function uniqueSlug(clinicId: string, base: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = await prisma.couple.findUnique({
      where: { clinicId_slug: { clinicId, slug } },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function staffId(clinicId: string, organizationId: string, id?: string, name?: string) {
  if (id) {
    const membership = await prisma.clinicMembership.findFirst({
      where: { clinicId, clinic: { organizationId }, userId: id, status: "ACTIVE" },
      select: { userId: true },
    });
    return membership?.userId ?? null;
  }
  if (!name) return null;
  const membership = await prisma.clinicMembership.findFirst({
    where: {
      clinicId,
      clinic: { organizationId },
      status: "ACTIVE",
      user: { name: { equals: name, mode: "insensitive" } },
    },
    select: { userId: true },
  });
  return membership?.userId ?? null;
}

export async function loadCouple(ctx: TenantContext, id: string) {
  const couple = await prisma.couple.findFirst({
    where: { id, clinicId: ctx.clinicId, clinic: { organizationId: ctx.organizationId } },
    include: coupleInclude,
  });
  return couple;
}

export async function listCouples(ctx: TenantContext) {
  return prisma.couple.findMany({
    where: {
      clinicId: ctx.clinicId,
      clinic: { organizationId: ctx.organizationId },
      status: { not: "ARCHIVED" },
    },
    include: coupleInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function createCoupleRecord(
  ctx: TenantContext,
  input: {
    primary: { fullName: string; dob: string; phone: string; email?: string | undefined; language?: string | undefined };
    partner?: { fullName: string; dob: string; phone: string; email?: string | undefined; language?: string | undefined } | undefined;
    treatment: "IVF" | "IUI" | "Evaluation" | "FET";
    assignedDoctorId?: string | undefined;
    assignedCoordinatorId?: string | undefined;
    doctorName?: string | undefined;
    coordinatorName?: string | undefined;
    whatsappConsent?: boolean | undefined;
    carePlanTemplate?: string | undefined;
  },
) {
  const doctorId = await staffId(
    ctx.clinicId,
    ctx.organizationId,
    input.assignedDoctorId,
    input.doctorName,
  );
  const coordinatorId = await staffId(
    ctx.clinicId,
    ctx.organizationId,
    input.assignedCoordinatorId,
    input.coordinatorName,
  );
  const primaryNames = splitName(input.primary.fullName);
  const partnerNames = input.partner ? splitName(input.partner.fullName) : null;
  const baseSlug = slugify(
    `${primaryNames.firstName}-${partnerNames?.firstName ?? "patient"}`,
  );
  const slug = await uniqueSlug(ctx.clinicId, baseSlug);
  const kind = TREATMENT_KIND[input.treatment];
  const planType = CARE_PLAN_TYPE[input.treatment];
  const createPlan = Boolean(input.carePlanTemplate && input.carePlanTemplate !== "None");

  const created = await prisma.$transaction(async (tx) => {
    const primary = await tx.patient.create({
      data: {
        clinicId: ctx.clinicId,
        firstName: primaryNames.firstName,
        lastName: primaryNames.lastName,
        dateOfBirth: parseDate(input.primary.dob),
        phone: input.primary.phone,
        whatsappNumber: input.primary.phone,
        ...(input.primary.email ? { email: input.primary.email } : {}),
        preferredLanguage: languageCode(input.primary.language),
      },
    });
    const partner = partnerNames && input.partner
      ? await tx.patient.create({
          data: {
            clinicId: ctx.clinicId,
            firstName: partnerNames.firstName,
            lastName: partnerNames.lastName,
            dateOfBirth: parseDate(input.partner.dob),
            phone: input.partner.phone,
            whatsappNumber: input.partner.phone,
            ...(input.partner.email ? { email: input.partner.email } : {}),
            preferredLanguage: languageCode(input.partner.language),
          },
        })
      : null;
    const couple = await tx.couple.create({
      data: {
        clinicId: ctx.clinicId,
        slug,
        primaryPatientId: primary.id,
        partnerPatientId: partner?.id ?? null,
        assignedDoctorId: doctorId,
        assignedCoordinatorId: coordinatorId,
        careLoopActive: input.whatsappConsent !== false,
      },
    });
    await tx.treatment.create({
      data: {
        clinicId: ctx.clinicId,
        coupleId: couple.id,
        kind,
        label: input.treatment === "Evaluation" ? "Fertility Evaluation" : `${input.treatment} intake`,
        status: "ACTIVE",
        stageIndex: 0,
        stageName: "Consultation",
        startedAt: new Date(),
      },
    });
    if (createPlan) {
      const plan = await tx.carePlan.create({
        data: {
          clinicId: ctx.clinicId,
          coupleId: couple.id,
          type: planType,
          name: input.carePlanTemplate === "None" ? `${input.treatment} plan` : (input.carePlanTemplate ?? `${input.treatment} plan`),
          status: "ACTIVE",
          startDate: new Date(),
          createdById: ctx.userId,
        },
      });
      await tx.careTask.create({
        data: {
          clinicId: ctx.clinicId,
          coupleId: couple.id,
          carePlanId: plan.id,
          title: "Initial consultation",
          category: "Consultation",
          status: "WAITING",
          createdById: ctx.userId,
        },
      });
    }
    if (input.whatsappConsent) {
      await tx.consent.createMany({
        data: [primary, partner].filter(Boolean).map((patient) => ({
          clinicId: ctx.clinicId,
          patientId: patient!.id,
          channel: "WHATSAPP" as const,
          consentType: "WHATSAPP_COMMUNICATION" as const,
          status: "GRANTED" as const,
          consentedAt: new Date(),
          source: "couple.create",
        })),
      });
    }
    return couple.id;
  });

  const loaded = await loadCouple(ctx, created);
  if (!loaded) throw notFound();
  return loaded;
}
