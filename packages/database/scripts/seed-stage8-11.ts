/**
 * Stage 8.11 — realistic Patient 360 scenarios (additive; no migrate reset).
 * Run: npx tsx packages/database/scripts/seed-stage8-11.ts
 */
import { createHash } from "node:crypto";
import { ensureDefaultRoles, prisma } from "../src";

const PREFIX = "s811";

function hashAbha(digits: string) {
  return createHash("sha256").update(`smrkomed-abha:${digits}`).digest("hex");
}

function maskAbha(digits: string) {
  return `XX-XXXX-XXXX-${digits.slice(-4)}`;
}

async function main() {
  await ensureDefaultRoles();
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "CLINIC_ADMIN" } });
  const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });
  const coordRole = await prisma.role.findUniqueOrThrow({ where: { key: "CARE_COORDINATOR" } });

  let org = await prisma.organization.findFirst({ where: { slug: `${PREFIX}-org` } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Stage 8.11 Verification Org", slug: `${PREFIX}-org` },
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { name: "Stage 8.11 Verification Org" },
    });
  }

  const clinic = await prisma.clinic.upsert({
    where: { slug: `${PREFIX}-clinic-a` },
    create: {
      organizationId: org.id,
      name: "Stage 8.11 Clinic A",
      slug: `${PREFIX}-clinic-a`,
      city: "Bangalore",
    },
    update: { name: "Stage 8.11 Clinic A" },
  });

  const clinicB = await prisma.clinic.upsert({
    where: { slug: `${PREFIX}-clinic-b` },
    create: {
      organizationId: org.id,
      name: "Stage 8.11 Clinic B",
      slug: `${PREFIX}-clinic-b`,
      city: "Chennai",
    },
    update: { name: "Stage 8.11 Clinic B" },
  });

  async function ensureUser(email: string, name: string, roleId: string, clinicId: string) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        passwordHash: "unused-stage8-11",
      },
      update: { name },
    });
    await prisma.clinicMembership.upsert({
      where: { clinicId_userId: { clinicId, userId: user.id } },
      create: { clinicId, userId: user.id, roleId, status: "ACTIVE" },
      update: { roleId, status: "ACTIVE" },
    });
    return user;
  }

  const admin = await ensureUser(`admin@${PREFIX}.demo`, "S811 Admin", adminRole.id, clinic.id);
  const doctor = await ensureUser(`doctor@${PREFIX}.demo`, "Dr S811", doctorRole.id, clinic.id);
  const coordinator = await ensureUser(
    `coord@${PREFIX}.demo`,
    "Coord S811",
    coordRole.id,
    clinic.id,
  );
  await ensureUser(`admin-b@${PREFIX}.demo`, "S811 Admin B", adminRole.id, clinicB.id);

  // Clean prior scenario couples for clinic A (additive re-seed)
  const oldCouples = await prisma.couple.findMany({
    where: { clinicId: clinic.id, slug: { startsWith: `${PREFIX}-p` } },
    select: { id: true, primaryPatientId: true, partnerPatientId: true },
  });
  const oldPatientIds = oldCouples.flatMap((c) =>
    [c.primaryPatientId, c.partnerPatientId].filter(Boolean),
  ) as string[];
  if (oldCouples.length) {
    const coupleIds = oldCouples.map((c) => c.id);
    await prisma.medicationReminder.deleteMany({ where: { clinicId: clinic.id, patientId: { in: oldPatientIds } } });
    await prisma.pharmacyPrescriptionItem.deleteMany({
      where: { prescription: { clinicId: clinic.id, patientId: { in: oldPatientIds } } },
    });
    await prisma.pharmacyPrescription.deleteMany({
      where: { clinicId: clinic.id, patientId: { in: oldPatientIds } },
    });
    await prisma.billingPayment.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.billingInvoice.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.insurancePolicy.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.message.deleteMany({
      where: { conversation: { clinicId: clinic.id, coupleId: { in: coupleIds } } },
    });
    await prisma.conversation.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.document.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.digitalHealthConsent.deleteMany({
      where: { clinicId: clinic.id, patientId: { in: oldPatientIds } },
    });
    await prisma.digitalHealthIdentity.deleteMany({
      where: { clinicId: clinic.id, patientId: { in: oldPatientIds } },
    });
    await prisma.healthRecordExchange.deleteMany({
      where: { clinicId: clinic.id, patientId: { in: oldPatientIds } },
    });
    await prisma.consultationNote.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.careTask.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.appointment.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.carePlanStep.deleteMany({ where: { carePlan: { coupleId: { in: coupleIds } } } });
    await prisma.carePlan.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.treatment.deleteMany({ where: { clinicId: clinic.id, coupleId: { in: coupleIds } } });
    await prisma.couple.deleteMany({ where: { id: { in: coupleIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: oldPatientIds } } });
  }

  async function makeCouple(opts: {
    n: number;
    firstName: string;
    lastName: string;
    withDoctor?: boolean;
    withCoord?: boolean;
  }) {
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: opts.firstName,
        lastName: opts.lastName,
        phone: `98888${String(10000 + opts.n).slice(-5)}`,
        gender: "FEMALE",
        dateOfBirth: new Date("1990-05-15"),
      },
    });
    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        slug: `${PREFIX}-p${opts.n}`,
        primaryPatientId: patient.id,
        careLoopActive: true,
        assignedDoctorId: opts.withDoctor ? doctor.id : null,
        assignedCoordinatorId: opts.withCoord ? coordinator.id : null,
      },
    });
    return { patient, couple };
  }

  // P1 — new patient, no treatment/tasks
  const p1 = await makeCouple({ n: 1, firstName: "New", lastName: "Patient" });

  // P2 — active treatment + doctor + coordinator
  const p2 = await makeCouple({
    n: 2,
    firstName: "Active",
    lastName: "Treatment",
    withDoctor: true,
    withCoord: true,
  });
  await prisma.treatment.create({
    data: {
      clinicId: clinic.id,
      coupleId: p2.couple.id,
      kind: "IVF",
      label: "IVF Cycle 1",
      status: "ACTIVE",
      stageName: "Stimulation",
    },
  });
  await prisma.carePlan.create({
    data: {
      clinicId: clinic.id,
      coupleId: p2.couple.id,
      type: "IVF",
      name: "IVF Care Plan",
      status: "ACTIVE",
      steps: {
        create: [
          { sortOrder: 0, name: "Baseline", status: "DONE" },
          { sortOrder: 1, name: "Stimulation", status: "CURRENT" },
        ],
      },
    },
  });

  // P3 — overdue follow-up
  const p3 = await makeCouple({ n: 3, firstName: "Overdue", lastName: "Followup", withCoord: true });
  await prisma.careTask.create({
    data: {
      clinicId: clinic.id,
      coupleId: p3.couple.id,
      title: "Overdue follow-up call",
      status: "OVERDUE",
      dueDate: new Date(Date.now() - 5 * 86_400_000),
    },
  });

  // P4 — upcoming appointment
  const p4 = await makeCouple({ n: 4, firstName: "Upcoming", lastName: "Appt", withDoctor: true });
  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      coupleId: p4.couple.id,
      type: "Follow-up consult",
      doctorName: doctor.name,
      startsAt: new Date(Date.now() + 2 * 86_400_000),
      status: "CONFIRMED",
    },
  });

  // P5 — medication + pharmacy (product/batch from existing pharmacy seed if any, else create)
  const p5 = await makeCouple({ n: 5, firstName: "Meds", lastName: "Patient", withDoctor: true });
  let product = await prisma.pharmacyProduct.findFirst({
    where: { clinicId: clinic.id, status: "ACTIVE" },
  });
  if (!product) {
    product = await prisma.pharmacyProduct.create({
      data: {
        clinicId: clinic.id,
        name: "Folic Acid 5mg",
        unit: "tablet",
        status: "ACTIVE",
        minimumStock: 10,
        reorderLevel: 20,
      },
    });
    await prisma.pharmacyBatch.create({
      data: {
        clinicId: clinic.id,
        productId: product.id,
        batchNumber: "S811-BATCH-1",
        expiryDate: new Date(Date.now() + 365 * 86_400_000),
        quantity: 100,
        availableQuantity: 100,
        purchasePrice: 5,
        sellingPrice: 10,
        mrp: 12,
      },
    });
  }
  const start = new Date();
  const end = new Date(Date.now() + 14 * 86_400_000);
  await prisma.pharmacyPrescription.create({
    data: {
      clinicId: clinic.id,
      patientId: p5.patient.id,
      coupleId: p5.couple.id,
      doctorId: doctor.id,
      doctorName: doctor.name,
      status: "PENDING",
      items: {
        create: [
          {
            productId: product.id,
            medicineName: product.name,
            dosage: "1 tablet",
            frequency: "Once daily",
            timeOfDay: "Morning",
            beforeAfterFood: "AFTER",
            instructions: "Take after breakfast",
            startDate: start,
            endDate: end,
            quantityPrescribed: 14,
            quantityDispensed: 0,
          },
        ],
      },
    },
  });

  // P6 — pending payment
  const p6 = await makeCouple({ n: 6, firstName: "Pending", lastName: "Payment" });
  await prisma.billingInvoice.create({
    data: {
      clinicId: clinic.id,
      coupleId: p6.couple.id,
      patientId: p6.patient.id,
      invoiceNumber: `S811-INV-${Date.now()}`,
      title: "Consultation fee",
      totalAmount: 5000,
      paidAmount: 0,
      status: "ISSUED",
      currency: "INR",
    },
  });

  // P7 — insurance
  const p7 = await makeCouple({ n: 7, firstName: "Insured", lastName: "Patient" });
  const existingInsurer = await prisma.insuranceProvider.findFirst({
    where: { clinicId: clinic.id, name: "Demo Health Insurance" },
  });
  const insurer =
    existingInsurer ??
    (await prisma.insuranceProvider.create({
      data: {
        clinicId: clinic.id,
        name: "Demo Health Insurance",
        integrationMode: "MANUAL_DEMO",
        isActive: true,
      },
    }));
  await prisma.insurancePolicy.create({
    data: {
      clinicId: clinic.id,
      coupleId: p7.couple.id,
      patientId: p7.patient.id,
      providerId: insurer.id,
      policyName: "Demo Family Floater",
      policyNumber: `S811-POL-7-${Date.now()}`,
      status: "ACTIVE",
      sumInsured: 200000,
      availableCoverage: 200000,
      eligibilityStatus: "PENDING",
    },
  });

  // P8 — WhatsApp conversation (no fake Meta delivery)
  const p8 = await makeCouple({ n: 8, firstName: "WhatsApp", lastName: "Thread" });
  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      coupleId: p8.couple.id,
      patientId: p8.patient.id,
      channel: "WHATSAPP",
      status: "OPEN",
      contactPhone: p8.patient.phone,
    },
  });
  await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: "OUTBOUND",
      senderType: "STAFF",
      content: "Clinic reminder (demo thread — not Meta-delivered).",
      status: "QUEUED",
    },
  });

  // P9 — ABHA linked (sandbox)
  const p9 = await makeCouple({ n: 9, firstName: "Abha", lastName: "Linked" });
  const digits = "98765432109876";
  await prisma.digitalHealthIdentity.create({
    data: {
      clinicId: clinic.id,
      patientId: p9.patient.id,
      abhaNumberHash: hashAbha(digits),
      abhaMasked: maskAbha(digits),
      status: "LINKED",
      verificationStatus: "DEMO_VERIFIED",
      linkedAt: new Date(),
      source: "DEMO_SEED",
      sandboxMode: true,
    },
  });
  await prisma.digitalHealthConsent.create({
    data: {
      clinicId: clinic.id,
      patientId: p9.patient.id,
      purpose: "Care continuity",
      status: "ACTIVE",
      dataCategories: ["Prescription", "Consultation"],
      sandboxMode: true,
      requestedByName: admin.name,
    },
  });

  // P10 — multiple timeline events
  const p10 = await makeCouple({
    n: 10,
    firstName: "Timeline",
    lastName: "Rich",
    withDoctor: true,
    withCoord: true,
  });
  await prisma.treatment.create({
    data: {
      clinicId: clinic.id,
      coupleId: p10.couple.id,
      kind: "IUI",
      label: "IUI Cycle 2",
      status: "ACTIVE",
    },
  });
  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      coupleId: p10.couple.id,
      type: "Scan",
      doctorName: doctor.name,
      startsAt: new Date(Date.now() - 3 * 86_400_000),
      status: "COMPLETED",
    },
  });
  await prisma.consultationNote.create({
    data: {
      clinicId: clinic.id,
      coupleId: p10.couple.id,
      createdById: doctor.id,
      summary: "Reviewed cycle response. Continue medications.",
      reasonForVisit: "Cycle review",
      nextSteps: "Follow-up in 5 days",
    },
  });
  await prisma.careTask.create({
    data: {
      clinicId: clinic.id,
      coupleId: p10.couple.id,
      title: "Send scan prep instructions",
      status: "WAITING",
      dueDate: new Date(Date.now() + 1 * 86_400_000),
    },
  });
  await prisma.document.create({
    data: {
      clinicId: clinic.id,
      coupleId: p10.couple.id,
      patientId: p10.patient.id,
      name: "Ultrasound report.pdf",
      status: "AWAITING_UPLOAD",
      // storageKey intentionally null — storage not connected
    },
  });
  await prisma.billingInvoice.create({
    data: {
      clinicId: clinic.id,
      coupleId: p10.couple.id,
      patientId: p10.patient.id,
      invoiceNumber: `S811-INV-T10-${Date.now()}`,
      title: "Cycle package",
      totalAmount: 25000,
      paidAmount: 10000,
      status: "PARTIALLY_PAID",
      currency: "INR",
    },
  });

  // Clinic B patient for isolation
  const bPatient = await prisma.patient.create({
    data: {
      clinicId: clinicB.id,
      firstName: "Foreign",
      lastName: "ClinicB",
      phone: "9777700001",
    },
  });
  await prisma.couple.create({
    data: {
      clinicId: clinicB.id,
      slug: `${PREFIX}-clinic-b-only`,
      primaryPatientId: bPatient.id,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        clinicA: clinic.slug,
        clinicB: clinicB.slug,
        scenarios: [
          "p1-new",
          "p2-active-treatment",
          "p3-overdue",
          "p4-upcoming-appt",
          "p5-medication",
          "p6-pending-payment",
          "p7-insurance",
          "p8-whatsapp",
          "p9-abha",
          "p10-timeline-rich",
        ],
        note: "No fake Meta/ABDM/payment gateway success.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
