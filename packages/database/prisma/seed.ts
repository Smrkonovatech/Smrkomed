/**
 * Phase 1 seed â€” ABC Fertility Centre + demo staff + couples/plans/tasks.
 * Password for all demo users: Demo@12345
 */
import { hash } from "bcryptjs";
import { CarePlanType, StaffRole } from "@prisma/client";

import { PERMISSIONS, ROLE_DEFS, ROLE_PERMISSIONS, prisma } from "../src";
import { fertilitySteps } from "./seed-demo-types";
import { seedAbcClinicClinicalData } from "./seed-demo-clinic";
import { seedClinicPharmacyData } from "./seed-demo-pharmacy";
import { seedClinicInsuranceData } from "./seed-demo-insurance";
import { seedClinicPaymentsData } from "./seed-demo-payments";

const DEMO_PASSWORD = "Demo@12345";

async function seedRoles() {
  const permissionKeys = Object.values(PERMISSIONS);
  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, name: key },
      update: {},
    });
  }

  const permissions = await prisma.permission.findMany();
  const byKey = Object.fromEntries(permissions.map((p) => [p.key, p.id]));

  for (const def of ROLE_DEFS) {
    const role = await prisma.role.upsert({
      where: { key: def.key },
      create: def,
      update: { name: def.name, description: def.description },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const allowed = ROLE_PERMISSIONS[def.key];
    await prisma.rolePermission.createMany({
      data: allowed.map((key) => ({
        roleId: role.id,
        permissionId: byKey[key]!,
      })),
    });
  }

  return prisma.role.findMany();
}

async function main() {
  console.log("Seeding SmrkoMedâ€¦");

  const roles = await seedRoles();
  const roleByKey = Object.fromEntries(roles.map((r) => [r.key, r]));

  const org = await prisma.organization.upsert({
    where: { id: "org_abc_fertility" },
    create: {
      id: "org_abc_fertility",
      name: "ABC Fertility Group",
      slug: "abc-fertility-group",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      onboardingCompletedAt: new Date(),
    },
    update: {
      name: "ABC Fertility Group",
      slug: "abc-fertility-group",
    },
  });

  const clinic = await prisma.clinic.upsert({
    where: { slug: "abc-fertility-bangalore" },
    create: {
      organizationId: org.id,
      name: "ABC Fertility Centre",
      slug: "abc-fertility-bangalore",
      city: "Bangalore",
      address: "12 Lavelle Road, Bangalore 560001",
      phone: "+91 80 4000 1200",
      email: "hello@abcfertility.demo",
      website: "https://abcfertility.demo",
      timezone: "Asia/Kolkata",
    },
    update: {
      name: "ABC Fertility Centre",
      city: "Bangalore",
      address: "12 Lavelle Road, Bangalore 560001",
      phone: "+91 80 4000 1200",
      email: "hello@abcfertility.demo",
    },
  });

  await prisma.clinicBranch.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.clinicBranch.createMany({
    data: [
      {
        clinicId: clinic.id,
        name: "Bangalore â€” Lavelle Road",
        city: "Bangalore",
        address: "12 Lavelle Road, Bangalore 560001",
        phone: "+91 80 4000 1200",
        hours: "Monâ€“Sat Â· 08:00 â€“ 20:00",
      },
      {
        clinicId: clinic.id,
        name: "Kochi â€” Panampilly",
        city: "Kochi",
        address: "Panampilly Nagar, Kochi 682036",
        phone: "+91 484 400 2200",
        hours: "Monâ€“Sat Â· 08:30 â€“ 19:00",
      },
    ],
  });

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const staff = [
    {
      email: "admin@abcfertility.demo",
      name: "Clinic Admin",
      initials: "CA",
      title: "Clinic Administrator",
      role: "CLINIC_ADMIN" as StaffRole,
    },
    {
      email: "ananya@abcfertility.demo",
      name: "Dr. Ananya Rao",
      initials: "AR",
      title: "Fertility Specialist",
      role: "DOCTOR" as StaffRole,
    },
    {
      email: "ravi@abcfertility.demo",
      name: "Dr. Rahul Menon",
      initials: "RM",
      title: "Reproductive Endocrinologist",
      role: "DOCTOR" as StaffRole,
    },
    {
      email: "priya@abcfertility.demo",
      name: "Dr. Priya Nair",
      initials: "PN",
      title: "Fertility Specialist",
      role: "DOCTOR" as StaffRole,
    },
    {
      email: "meera@abcfertility.demo",
      name: "Meera Iyer",
      initials: "MI",
      title: "Care Coordinator",
      role: "CARE_COORDINATOR" as StaffRole,
    },
    {
      email: "kavya@abcfertility.demo",
      name: "Kavya Sharma",
      initials: "KS",
      title: "Care Coordinator",
      role: "CARE_COORDINATOR" as StaffRole,
    },
    {
      email: "nisha@abcfertility.demo",
      name: "Nisha Fernandes",
      initials: "NF",
      title: "Front Desk",
      role: "RECEPTIONIST" as StaffRole,
    },
    {
      email: "counsellor@abcfertility.demo",
      name: "Meera Counsel",
      initials: "MC",
      title: "Fertility Counsellor",
      role: "COUNSELOR" as StaffRole,
    },
    {
      email: "marketing@abcfertility.demo",
      name: "Aisha Khan",
      initials: "AK",
      title: "Marketing",
      role: "MARKETING" as StaffRole,
    },
    {
      email: "readonly@abcfertility.demo",
      name: "Read Only",
      initials: "RO",
      title: "Read only",
      role: "READ_ONLY" as StaffRole,
    },
    {
      email: "platform@abcfertility.demo",
      name: "Org Admin",
      initials: "OA",
      title: "Organization Administrator",
      role: "ORGANIZATION_ADMIN" as StaffRole,
    },
    {
      email: "pharmamanager@abcfertility.demo",
      name: "Sanjay Mehta",
      initials: "SM",
      title: "Pharmacy Manager",
      role: "PHARMACY_MANAGER" as StaffRole,
    },
    {
      email: "pharmacist@abcfertility.demo",
      name: "Anita Desai",
      initials: "AD",
      title: "Pharmacist",
      role: "PHARMACIST" as StaffRole,
    },
    {
      email: "pharmastaff@abcfertility.demo",
      name: "Rohit Kumar",
      initials: "RK",
      title: "Pharmacy Staff",
      role: "PHARMACY_STAFF" as StaffRole,
    },
  ];

  const users: Record<string, { id: string; name: string }> = {};
  for (const person of staff) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      create: {
        email: person.email,
        passwordHash,
        name: person.name,
        initials: person.initials,
        title: person.title,
      },
      update: {
        passwordHash,
        name: person.name,
        initials: person.initials,
        title: person.title,
        isActive: true,
      },
    });
    users[person.email] = { id: user.id, name: user.name };
    await prisma.clinicMembership.upsert({
      where: { clinicId_userId: { clinicId: clinic.id, userId: user.id } },
      create: {
        clinicId: clinic.id,
        userId: user.id,
        roleId: roleByKey[person.role]!.id,
        status: "ACTIVE",
      },
      update: {
        roleId: roleByKey[person.role]!.id,
        status: "ACTIVE",
      },
    });
  }

  const platformOrg = await prisma.organization.upsert({
    where: { id: "org_smrkomed_platform" },
    create: {
      id: "org_smrkomed_platform",
      name: "SmrkoMed",
      slug: "smrkomed",
      status: "ACTIVE",
      onboardingCompletedAt: new Date(),
    },
    update: { name: "SmrkoMed", slug: "smrkomed", status: "ACTIVE" },
  });
  const platformClinic = await prisma.clinic.upsert({
    where: { slug: "smrkomed-internal" },
    create: {
      organizationId: platformOrg.id,
      name: "SmrkoMed Platform",
      slug: "smrkomed-internal",
      city: "Bangalore",
      timezone: "Asia/Kolkata",
    },
    update: { name: "SmrkoMed Platform", organizationId: platformOrg.id },
  });
  const platformUser = await prisma.user.upsert({
    where: { email: "platform@smrkomed.demo" },
    create: {
      email: "platform@smrkomed.demo",
      passwordHash,
      name: "SmrkoMed Platform Admin",
      initials: "SM",
      title: "Platform Administrator",
    },
    update: {
      passwordHash,
      name: "SmrkoMed Platform Admin",
      initials: "SM",
      title: "Platform Administrator",
      isActive: true,
    },
  });
  await prisma.clinicMembership.upsert({
    where: { clinicId_userId: { clinicId: platformClinic.id, userId: platformUser.id } },
    create: {
      clinicId: platformClinic.id,
      userId: platformUser.id,
      roleId: roleByKey["PLATFORM_ADMIN"]!.id,
      status: "ACTIVE",
    },
    update: { roleId: roleByKey["PLATFORM_ADMIN"]!.id, status: "ACTIVE" },
  });

  const templates: { type: CarePlanType; name: string }[] = [
    { type: "FERTILITY_EVALUATION", name: "Initial Fertility Evaluation" },
    { type: "IUI", name: "IUI Journey" },
    { type: "IVF", name: "IVF Standard Journey" },
    { type: "IVF", name: "IVF Basic" },
    { type: "IVF", name: "IVF Advanced Journey" },
    { type: "IVF", name: "Post Transfer Monitoring" },
    { type: "FET", name: "FET Journey" },
  ];

  const templateIds: Partial<Record<CarePlanType, string>> = {};
  for (const t of templates) {
    const existing = await prisma.carePlanTemplate.findFirst({
      where: { clinicId: clinic.id, type: t.type, name: t.name },
    });
    const template =
      existing ??
      (await prisma.carePlanTemplate.create({
        data: {
          clinicId: clinic.id,
          type: t.type,
          name: t.name,
          description: `${t.name} template for fertility care`,
          steps: {
            create: fertilitySteps.map((name, sortOrder) => ({ sortOrder, name })),
          },
        },
      }));
    // Prefer first template of each type for couple linking defaults
    if (!templateIds[t.type]) templateIds[t.type] = template.id;
  }

  const categories = [
    "LAB_REPORT",
    "SCAN_REPORT",
    "SEMEN_ANALYSIS",
    "CONSENT",
    "PRESCRIPTION",
    "TREATMENT_DOCUMENT",
    "OTHER",
  ];
  for (const key of categories) {
    await prisma.documentCategory.upsert({
      where: { clinicId_key: { clinicId: clinic.id, key } },
      create: { clinicId: clinic.id, key, name: key.replaceAll("_", " ") },
      update: {},
    });
  }

  // Clear clinic clinical demo rows for idempotent re-seed
  await prisma.billingRefund.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.billingPayment.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.billingInvoiceLine.deleteMany({ where: { invoice: { clinicId: clinic.id } } });
  await prisma.billingInvoice.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.paymentWebhookEvent.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.paymentGatewayConnection.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.insuranceClaimEvent.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.insurancePayment.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.insuranceQuery.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.insuranceClaimDocument.deleteMany({ where: { claim: { clinicId: clinic.id } } });
  await prisma.insuranceClaim.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.insurancePolicy.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.insuranceTpa.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.insuranceProvider.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.medicationReminder.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacySaleItem.deleteMany({ where: { sale: { clinicId: clinic.id } } });
  await prisma.pharmacySale.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacyPrescriptionItem.deleteMany({ where: { prescription: { clinicId: clinic.id } } });
  await prisma.pharmacyPrescription.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacyPurchaseOrderItem.deleteMany({ where: { purchaseOrder: { clinicId: clinic.id } } });
  await prisma.pharmacyPurchaseOrder.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacyStockMovement.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacyBatch.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacyProduct.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacySupplier.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.pharmacySetting.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.escalation.deleteMany({ where: { clinicId: clinic.id } });
  try {
    await prisma.consultationNote.deleteMany({ where: { clinicId: clinic.id } });
  } catch {
    console.warn("ConsultationNote table missing — skip clear (apply pending migrations for voice notes).");
  }
  await prisma.message.deleteMany({
    where: { conversation: { clinicId: clinic.id } },
  });
  await prisma.aIInteraction.deleteMany({
    where: { conversation: { clinicId: clinic.id } },
  });
  await prisma.conversation.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.document.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.taskAssignment.deleteMany({
    where: { careTask: { clinicId: clinic.id } },
  });
  await prisma.taskReminder.deleteMany({
    where: { careTask: { clinicId: clinic.id } },
  });
  await prisma.careTask.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.carePlanStep.deleteMany({
    where: { carePlan: { clinicId: clinic.id } },
  });
  await prisma.iVFCycle.deleteMany({
    where: { treatment: { clinicId: clinic.id } },
  });
  await prisma.iUICycle.deleteMany({
    where: { treatment: { clinicId: clinic.id } },
  });
  await prisma.treatment.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.carePlan.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.appointment.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.consent.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.couple.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.patient.deleteMany({ where: { clinicId: clinic.id } });

  const counts = await seedAbcClinicClinicalData({
    prisma,
    clinicId: clinic.id,
    organizationId: org.id,
    users,
    templateIds,
  });

  const pharmacyCounts = await seedClinicPharmacyData({
    prisma,
    clinicId: clinic.id,
    users,
    clinicName: clinic.name,
  });

  const insuranceCounts = await seedClinicInsuranceData({
    prisma,
    clinicId: clinic.id,
    users,
    clinicName: clinic.name,
  });

  const paymentsCounts = await seedClinicPaymentsData({
    prisma,
    clinicId: clinic.id,
    users,
    clinicName: clinic.name,
  });

  console.log("Clinical seed counts:", counts);
  console.log("Pharmacy seed:", pharmacyCounts);
  console.log("Insurance seed:", insuranceCounts);
  console.log("Payments seed:", paymentsCounts);

  console.log("Demo clinical dataset:", counts);
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      plan: "GROWTH",
      status: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: { plan: "GROWTH", status: "TRIALING" },
  });

  await prisma.organizationModule.deleteMany({ where: { organizationId: org.id } });
  await prisma.organizationModule.createMany({
    data: ["CARE_LOOP", "CRM", "APPOINTMENTS", "ANALYTICS", "MARKETING"].map((module) => ({
      organizationId: org.id,
      module: module as "CARE_LOOP" | "CRM" | "APPOINTMENTS" | "ANALYTICS" | "MARKETING",
      enabled: true,
    })),
  });

  await prisma.integration.upsert({
    where: { clinicId_provider: { clinicId: clinic.id, provider: "WHATSAPP_CLOUD" } },
    create: {
      organizationId: org.id,
      clinicId: clinic.id,
      provider: "WHATSAPP_CLOUD",
      status: "DISABLED",
      displayName: null,
    },
    update: { status: "DISABLED", organizationId: org.id },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      clinicId: clinic.id,
      actorId: users["admin@abcfertility.demo"]!.id,
      action: "SEED_COMPLETED",
      entityType: "Clinic",
      entityId: clinic.id,
      metadata: { note: "Phase 3 demo seed" },
    },
  });

  console.log("Seed complete.");
  console.log(`Clinic: ${clinic.name} (${clinic.slug})`);
  console.log("Demo password for all users:", DEMO_PASSWORD);
  console.log("Clinic accounts:");
  for (const person of staff) {
    console.log(`  - ${person.email} (${person.role})`);
  }
  console.log("SmrkoMed platform admin (Admin Portal):");
  console.log("  - platform@smrkomed.demo (PLATFORM_ADMIN)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
