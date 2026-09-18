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
  doctorId?: string | null;
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

  // 1. Resolve selected real doctor for Bangalore clinic
  let resolvedDoctorUser: { id: string; name: string; title: string | null } | null = null;
  if (input.doctorId && input.doctorId !== "first_available") {
    const cleanDocId = input.doctorId.replace(/^doc_/, "");
    const found = await prisma.user.findFirst({
      where: {
        id: cleanDocId,
        memberships: {
          some: { clinicId: clinic.id, status: "ACTIVE" },
        },
      },
      select: { id: true, name: true, title: true },
    });
    if (found) resolvedDoctorUser = found;
  }

  if (!resolvedDoctorUser && input.doctorPreference && input.doctorPreference !== "first_available") {
    const cleanPref = input.doctorPreference.replace(/^Dr\.\s*/i, "").trim();
    const found = await prisma.user.findFirst({
      where: {
        name: { contains: cleanPref, mode: "insensitive" },
        memberships: {
          some: { clinicId: clinic.id, status: "ACTIVE" },
        },
      },
      select: { id: true, name: true, title: true },
    });
    if (found) resolvedDoctorUser = found;
  }

  // Determine standard display name for appointment & notes
  const doctorDisplayName = resolvedDoctorUser
    ? (resolvedDoctorUser.name.startsWith("Dr.") ? resolvedDoctorUser.name : `Dr. ${resolvedDoctorUser.name}`)
    : (input.doctorPreference && input.doctorPreference !== "first_available" ? input.doctorPreference : "Assigned Specialist (Counter 2)");

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
        assignedDoctorId: resolvedDoctorUser?.id || null,
      },
    });
  } else if (resolvedDoctorUser && couple.assignedDoctorId !== resolvedDoctorUser.id) {
    await prisma.couple.update({
      where: { id: couple.id },
      data: { assignedDoctorId: resolvedDoctorUser.id },
    });
  }

  // Create or update today's Appointment for this patient and mapped doctor
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let appointment = await prisma.appointment.findFirst({
    where: {
      clinicId: clinic.id,
      coupleId: couple.id,
      startsAt: { gte: todayStart, lte: todayEnd },
    },
  });

  if (!appointment) {
    appointment = await prisma.appointment.create({
      data: {
        id: randomUUID(),
        clinicId: clinic.id,
        coupleId: couple.id,
        type: input.purpose || "IVF Consultation & Evaluation",
        doctorName: doctorDisplayName,
        room: "Counter 2 · Consultation Room",
        startsAt: new Date(),
        durationMin: 30,
        status: "WAITING",
        notes: `QR Self Check-In. Patient registered at Bangalore reception. Preferred Specialist: ${doctorDisplayName}.`,
      },
    });
  } else {
    appointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        doctorName: doctorDisplayName,
        type: input.purpose || appointment.type,
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

  // Ensure Initial consultation CareTask exists and is mapped to doctor
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
          targetRole: "DOCTOR",
          description: `Patient registered via QR for ${doctorDisplayName}.`,
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
          doctorId: resolvedDoctorUser?.id || null,
          doctorPreference: doctorDisplayName,
          appointmentId: appointment.id,
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
    appointmentId: appointment.id,
    doctor: {
      id: resolvedDoctorUser?.id || null,
      name: doctorDisplayName,
    },
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
