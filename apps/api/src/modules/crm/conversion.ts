import { prisma, phonesLikelyMatch, normalizeEmail, type TenantContext } from "@smrkomed/database";
import type { Lead } from "@prisma/client";

import { HttpError } from "../../lib/errors";
import { recordLeadActivity } from "./activity";

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || "Lead";
  const lastName = parts.slice(1).join(" ") || "Patient";
  return { firstName, lastName };
}

export async function findMatchingPatients(clinicId: string, phone?: string | null, email?: string | null) {
  const emailNorm = normalizeEmail(email);
  const suffix = (phone ?? "").replace(/\D/g, "").slice(-10);
  if (!emailNorm && suffix.length < 8) return [];
  const candidates = await prisma.patient.findMany({
    where: {
      clinicId,
      OR: [
        ...(emailNorm ? [{ email: emailNorm }] : []),
        ...(suffix.length >= 8
          ? [{ phone: { contains: suffix } }, { whatsappNumber: { contains: suffix } }]
          : []),
      ],
    },
    take: 25,
  });
  return candidates.filter(
    (row) =>
      (emailNorm && normalizeEmail(row.email) === emailNorm) ||
      phonesLikelyMatch(row.phone, phone) ||
      phonesLikelyMatch(row.whatsappNumber, phone),
  );
}

export async function convertLead(
  ctx: TenantContext,
  lead: Lead,
  input: {
    createCouple?: boolean;
    partnerName?: string | null;
    existingPatientId?: string | null;
    bookConsultationAt?: string | null;
  },
) {
  if (!lead.clinicId) {
    throw new HttpError(422, "CLINIC_REQUIRED", "A clinic is required to convert this lead.");
  }
  if (lead.status === "CONVERTED" && lead.patientId) {
    throw new HttpError(409, "ALREADY_CONVERTED", "This lead is already converted.");
  }

  let patientId = input.existingPatientId ?? lead.patientId;
  if (patientId) {
    const existing = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: lead.clinicId },
    });
    if (!existing) throw new HttpError(422, "PATIENT_NOT_FOUND", "Matching patient was not found in this clinic.");
    patientId = existing.id;
  } else {
    const matches = await findMatchingPatients(lead.clinicId, lead.phone, lead.email);
    if (matches.length > 0) {
      throw new HttpError(
        409,
        "EXISTING_PATIENT",
        "Lead could not be converted because a matching patient already exists.",
        { patients: matches.map((row) => ({ id: row.id, firstName: row.firstName, lastName: row.lastName })) },
      );
    }
    const { firstName, lastName } = splitName(lead.name);
    const created = await prisma.patient.create({
      data: {
        clinicId: lead.clinicId,
        firstName,
        lastName,
        phone: lead.phone,
        whatsappNumber: lead.phone,
        email: lead.email,
        preferredLanguage: lead.preferredLanguage || "en",
      },
    });
    patientId = created.id;
  }

  let coupleId = lead.coupleId;
  if (input.createCouple !== false) {
    if (!coupleId) {
      const existingCouple = await prisma.couple.findFirst({
        where: { clinicId: lead.clinicId, primaryPatientId: patientId },
      });
      if (existingCouple) {
        coupleId = existingCouple.id;
      } else {
        let partnerId: string | null = null;
        if (input.partnerName) {
          const partner = splitName(input.partnerName);
          const createdPartner = await prisma.patient.create({
            data: {
              clinicId: lead.clinicId,
              firstName: partner.firstName,
              lastName: partner.lastName,
            },
          });
          partnerId = createdPartner.id;
        }
        const couple = await prisma.couple.create({
          data: {
            clinicId: lead.clinicId,
            slug: `lead-${lead.id.slice(-8)}`,
            primaryPatientId: patientId,
            partnerPatientId: partnerId,
            assignedCoordinatorId: lead.assignedToId,
          },
        });
        coupleId = couple.id;
      }
    }
  }

  if (input.bookConsultationAt && coupleId) {
    await prisma.appointment.create({
      data: {
        clinicId: lead.clinicId,
        coupleId,
        leadId: lead.id,
        type: "Consultation",
        startsAt: new Date(input.bookConsultationAt),
        status: "CONFIRMED",
      },
    });
    await recordLeadActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      clinicId: lead.clinicId,
      userId: ctx.userId,
      type: "APPOINTMENT_BOOKED",
      description: "Consultation booked during conversion.",
    });
  }

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      patientId,
      coupleId,
      status: "CONVERTED",
      stage: "ACTIVE_PATIENT",
      convertedAt: new Date(),
    },
  });
  await recordLeadActivity({
    leadId: lead.id,
    organizationId: lead.organizationId,
    clinicId: lead.clinicId,
    userId: ctx.userId,
    type: "STAGE_CHANGED",
    description: "Stage changed to Active Patient.",
    metadata: { from: lead.stage, to: "ACTIVE_PATIENT", conversion: true },
  });
  await recordLeadActivity({
    leadId: lead.id,
    organizationId: lead.organizationId,
    clinicId: lead.clinicId,
    userId: ctx.userId,
    type: "LEAD_CONVERTED",
    description: "Lead converted to patient.",
    metadata: { patientId, coupleId },
  });
  return prisma.lead.findUniqueOrThrow({
    where: { id: updated.id },
    include: { assignedTo: { select: { id: true, name: true, email: true } }, campaignRecord: true },
  });
}
