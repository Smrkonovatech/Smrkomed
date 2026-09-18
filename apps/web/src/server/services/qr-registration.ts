import { prisma } from "@smrkomed/database";
import { randomUUID } from "crypto";

export interface QrRegistrationInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  gender?: "FEMALE" | "MALE" | "OTHER" | "UNSPECIFIED";
  age?: number | string | null;
  dateOfBirth?: string | null;
  purpose?: string | null;
  doctorPreference?: string | null;
}

/**
 * Resolves the Hospex Bangalore clinic and strictly guards against selecting any Kochi clinic.
 */
export async function getBangaloreHospexClinic() {
  // 1. Direct match by known Hospex Bangalore ID if valid
  const byId = await prisma.clinic.findUnique({
    where: { id: "cmt0exo9n000vl804rbaabh32" },
    include: {
      organization: true,
      branches: true,
    },
  });

  if (byId && byId.city?.toLowerCase() === "bangalore") {
    return byId;
  }

  // 2. Query Hospex clinic with city: Bangalore explicitly
  const bangaloreClinic = await prisma.clinic.findFirst({
    where: {
      city: { equals: "Bangalore", mode: "insensitive" },
      OR: [
        { name: { contains: "Hospex", mode: "insensitive" } },
        { slug: { contains: "bangalore", mode: "insensitive" } },
        { organization: { name: { contains: "Hospex", mode: "insensitive" } } },
      ],
      // STRICT EXCLUSION OF KOCHI
      NOT: {
        OR: [
          { city: { equals: "Kochi", mode: "insensitive" } },
          { slug: { contains: "kochi", mode: "insensitive" } },
          { name: { contains: "kochi", mode: "insensitive" } },
        ],
      },
    },
    include: {
      organization: true,
      branches: true,
    },
  });

  if (bangaloreClinic) {
    return bangaloreClinic;
  }

  // 3. Fallback: Any clinic in Bangalore with strict exclusion of Kochi
  const fallbackBangalore = await prisma.clinic.findFirst({
    where: {
      city: { equals: "Bangalore", mode: "insensitive" },
      NOT: {
        OR: [
          { city: { equals: "Kochi", mode: "insensitive" } },
          { slug: { contains: "kochi", mode: "insensitive" } },
        ],
      },
    },
    include: {
      organization: true,
      branches: true,
    },
  });

  if (fallbackBangalore) {
    return fallbackBangalore;
  }

  throw new Error("Bangalore Hospex clinic could not be located in database.");
}

/**
 * Register a patient through the reception QR code workflow.
 * Guarantees persistence in Bangalore Hospex clinic and NEVER Kochi.
 */
export async function registerPatientViaQr(input: QrRegistrationInput) {
  const clinic = await getBangaloreHospexClinic();

  // Explicit safety assertion
  if (clinic.city?.toLowerCase() === "kochi" || clinic.slug?.toLowerCase().includes("kochi")) {
    throw new Error("CRITICAL ERROR: Attempted to save patient into Kochi clinic instead of Bangalore Hospex clinic.");
  }

  const cleanPhone = input.phone.trim().replace(/[^\d+]/g, "");
  const normalizedPhone = cleanPhone.startsWith("+")
    ? cleanPhone
    : cleanPhone.startsWith("91") && cleanPhone.length === 12
      ? `+${cleanPhone}`
      : `+91${cleanPhone.replace(/^0+/, "")}`;

  let dob: Date | null = null;
  if (input.dateOfBirth) {
    dob = new Date(input.dateOfBirth);
  } else if (input.age && Number(input.age) > 0) {
    const yearsAgo = Number(input.age);
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsAgo);
    dob = d;
  }

  // Check if patient already exists in Bangalore Hospex clinic with this phone
  let patient = await prisma.patient.findFirst({
    where: {
      clinicId: clinic.id,
      OR: [
        { phone: normalizedPhone },
        { whatsappNumber: normalizedPhone },
      ],
    },
  });

  if (patient) {
    // Update basic fields
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
        ...(dob ? { dateOfBirth: dob } : {}),
        ...(input.gender ? { gender: input.gender } : {}),
      },
    });
  } else {
    // Create new patient record in Bangalore Hospex clinic
    patient = await prisma.patient.create({
      data: {
        id: randomUUID(),
        clinicId: clinic.id,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: normalizedPhone,
        whatsappNumber: normalizedPhone,
        email: input.email?.trim().toLowerCase() || null,
        gender: input.gender || "UNSPECIFIED",
        dateOfBirth: dob,
        preferredLanguage: "en",
        status: "ACTIVE",
      },
    });
  }

  // Ensure Couple relationship exists so Care Loop, timeline & doctor dashboard work seamlessly
  let couple = await prisma.couple.findFirst({
    where: {
      clinicId: clinic.id,
      primaryPatientId: patient.id,
    },
  });

  if (!couple) {
    const cleanLast = input.lastName.toLowerCase().replace(/[^a-z0-9]/g, "") || "walkin";
    const slugName = `qr-${cleanLast}-${randomUUID().slice(0, 6)}`;
    couple = await prisma.couple.create({
      data: {
        id: randomUUID(),
        clinicId: clinic.id,
        primaryPatientId: patient.id,
        slug: slugName,
        status: "ACTIVE",
        careLoopActive: true,
      },
    });
  }

  // Ensure Treatment exists so treatment is "Evaluation" and stage is "Consultation"
  try {
    const existingTreatment = await prisma.treatment.findFirst({
      where: { coupleId: couple.id },
    });
    if (!existingTreatment) {
      await prisma.treatment.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          coupleId: couple.id,
          kind: "EVALUATION",
          stageName: "Consultation",
          stageIndex: 0,
          status: "ACTIVE",
          label: "Evaluation",
        },
      });
    }
  } catch {
    // non-fatal
  }

  // Ensure Initial consultation CareTask exists
  try {
    const existingTask = await prisma.careTask.findFirst({
      where: { coupleId: couple.id, title: "Initial consultation" },
    });
    if (!existingTask) {
      await prisma.careTask.create({
        data: {
          id: randomUUID(),
          clinicId: clinic.id,
          coupleId: couple.id,
          title: "Initial consultation",
          category: "Consultation",
          status: "WAITING",
        },
      });
    }
  } catch {
    // non-fatal
  }

  // Record audit log for walk-in QR check-in
  try {
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        clinicId: clinic.id,
        action: "QR_SELF_CHECKIN_REGISTERED",
        entityType: "Patient",
        entityId: patient.id,
        metadata: {
          clinicCity: clinic.city,
          clinicName: clinic.name,
          purpose: input.purpose || "General Consultation",
          doctorPreference: input.doctorPreference || null,
          source: "QR_SCAN_BANGALORE",
        },
      },
    });
  } catch (e) {
    console.warn("Audit log creation non-fatal error:", e);
  }

  // Check if lead table exists and record inquiry
  try {
    await prisma.lead.create({
      data: {
        id: randomUUID(),
        organizationId: clinic.organizationId,
        clinicId: clinic.id,
        name: `${input.firstName} ${input.lastName}`,
        phone: normalizedPhone,
        email: input.email?.trim() || null,
        source: "WALK_IN",
        status: "CONVERTED",
        treatmentInterest: input.purpose || "IVF Evaluation",
        location: clinic.city || "Bangalore",
        patientId: patient.id,
        convertedAt: new Date(),
      },
    });
  } catch {
    // optional lead record
  }

  return {
    patient: {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName: `${patient.firstName} ${patient.lastName}`,
      phone: patient.phone,
      whatsappNumber: patient.whatsappNumber,
      email: patient.email,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
    },
    coupleId: couple.id,
    clinic: {
      id: clinic.id,
      name: clinic.name,
      city: clinic.city,
      address: clinic.address || "12 Lavelle Road, Bangalore 560001",
      phone: clinic.phone || "+91 80 4000 1200",
      email: clinic.email || "hello@abcfertility.demo",
    },
  };
}
