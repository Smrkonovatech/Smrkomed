/**
 * Phase 1 seed — ABC Fertility Centre + demo staff + couples/plans/tasks.
 * Password for all demo users: Demo@12345
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import {
  CarePlanType,
  CareTaskPriority,
  CareTaskStatus,
  CarePlanStepStatus,
  EscalationSeverity,
  EscalationStatus,
  EscalationType,
  Gender,
  PrismaClient,
  StaffRole,
  TreatmentKind,
} from "@prisma/client";

import { PERMISSIONS } from "../src/lib/permissions/rbac";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo@12345";

const fertilitySteps = [
  "Consultation",
  "Baseline",
  "Monitoring",
  "Procedure",
  "Transfer",
  "Follow-up",
  "Pregnancy Test",
];

async function seedRoles() {
  const roleDefs: { key: StaffRole; name: string; description: string }[] = [
    { key: "CLINIC_ADMIN", name: "Clinic Admin", description: "Full clinic administration" },
    { key: "DOCTOR", name: "Doctor", description: "Clinical care and escalations" },
    {
      key: "CARE_COORDINATOR",
      name: "Care Coordinator",
      description: "Care Loop and patient follow-through",
    },
    { key: "NURSE", name: "Nurse", description: "Clinical support operations" },
    { key: "RECEPTIONIST", name: "Receptionist", description: "Front desk and appointments" },
  ];

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

  for (const def of roleDefs) {
    const role = await prisma.role.upsert({
      where: { key: def.key },
      create: def,
      update: { name: def.name, description: def.description },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const allowed =
      def.key === "CLINIC_ADMIN"
        ? permissionKeys
        : def.key === "DOCTOR"
          ? [
              PERMISSIONS.PATIENTS_READ,
              PERMISSIONS.PATIENTS_WRITE,
              PERMISSIONS.CARE_PLANS_WRITE,
              PERMISSIONS.CARE_TASKS_WRITE,
              PERMISSIONS.CLINICAL_ESCALATIONS,
              PERMISSIONS.DOCUMENTS_WRITE,
              PERMISSIONS.APPOINTMENTS_WRITE,
            ]
          : def.key === "CARE_COORDINATOR"
            ? [
                PERMISSIONS.PATIENTS_READ,
                PERMISSIONS.PATIENTS_WRITE,
                PERMISSIONS.CARE_TASKS_WRITE,
                PERMISSIONS.CARE_LOOP_MANAGE,
                PERMISSIONS.APPOINTMENTS_WRITE,
                PERMISSIONS.DOCUMENTS_WRITE,
              ]
            : def.key === "NURSE"
              ? [
                  PERMISSIONS.PATIENTS_READ,
                  PERMISSIONS.CARE_TASKS_WRITE,
                  PERMISSIONS.APPOINTMENTS_WRITE,
                  PERMISSIONS.DOCUMENTS_WRITE,
                ]
              : [PERMISSIONS.PATIENTS_READ, PERMISSIONS.PATIENTS_WRITE, PERMISSIONS.APPOINTMENTS_WRITE];

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
  console.log("Seeding SmrkoMed…");

  const roles = await seedRoles();
  const roleByKey = Object.fromEntries(roles.map((r) => [r.key, r]));

  const org = await prisma.organization.upsert({
    where: { id: "org_abc_fertility" },
    create: { id: "org_abc_fertility", name: "ABC Fertility Group" },
    update: { name: "ABC Fertility Group" },
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
      timezone: "Asia/Kolkata",
    },
    update: {
      name: "ABC Fertility Centre",
      city: "Bangalore",
      address: "12 Lavelle Road, Bangalore 560001",
    },
  });

  await prisma.clinicBranch.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.clinicBranch.createMany({
    data: [
      {
        clinicId: clinic.id,
        name: "Bangalore — Lavelle Road",
        city: "Bangalore",
        address: "12 Lavelle Road, Bangalore 560001",
        phone: "+91 80 4000 1200",
        hours: "Mon–Sat · 08:00 – 20:00",
      },
      {
        clinicId: clinic.id,
        name: "Kochi — Panampilly",
        city: "Kochi",
        address: "Panampilly Nagar, Kochi 682036",
        phone: "+91 484 400 2200",
        hours: "Mon–Sat · 08:30 – 19:00",
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
      name: "Dr. Ravi Menon",
      initials: "RM",
      title: "Reproductive Endocrinologist",
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
      email: "nisha@abcfertility.demo",
      name: "Nisha Fernandes",
      initials: "NF",
      title: "Front Desk",
      role: "RECEPTIONIST" as StaffRole,
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

  const doctorId = users["ananya@abcfertility.demo"]!.id;
  const coordinatorId = users["meera@abcfertility.demo"]!.id;

  const templates: { type: CarePlanType; name: string }[] = [
    { type: "FERTILITY_EVALUATION", name: "Fertility Evaluation" },
    { type: "IUI", name: "IUI Cycle" },
    { type: "IVF", name: "IVF Cycle" },
    { type: "FET", name: "FET Cycle" },
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
    templateIds[t.type] = template.id;
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

  // Clear clinic clinical demo rows for idempotent re-seed of couples
  await prisma.escalation.deleteMany({ where: { clinicId: clinic.id } });
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

  type CoupleSeed = {
    slug: string;
    primary: {
      firstName: string;
      lastName: string;
      dob: string;
      gender: Gender;
      phone: string;
    };
    partner: {
      firstName: string;
      lastName: string;
      dob: string;
      gender: Gender;
      phone: string;
    };
    planType: CarePlanType;
    treatmentKind: TreatmentKind;
    label: string;
    stageIndex: number;
    tasks: { title: string; category: string; status: CareTaskStatus; priority: CareTaskPriority }[];
    escalations?: {
      type: EscalationType;
      severity: EscalationSeverity;
      reason: string;
      status?: EscalationStatus;
    }[];
  };

  const couples: CoupleSeed[] = [
    {
      slug: "priya-rahul",
      primary: {
        firstName: "Priya",
        lastName: "Sharma",
        dob: "1995-03-12",
        gender: "FEMALE",
        phone: "+919845011221",
      },
      partner: {
        firstName: "Rahul",
        lastName: "Sharma",
        dob: "1992-07-08",
        gender: "MALE",
        phone: "+919845011222",
      },
      planType: "IVF",
      treatmentKind: "IVF",
      label: "IVF Cycle 01",
      stageIndex: 2,
      tasks: [
        {
          title: "Ultrasound",
          category: "Investigation",
          status: "OVERDUE",
          priority: "HIGH",
        },
        {
          title: "Routine care-plan follow-up",
          category: "Follow-up",
          status: "ESCALATED",
          priority: "CLINICAL",
        },
      ],
      escalations: [
        {
          type: "APPOINTMENT",
          severity: "MEDIUM",
          reason: "Patient hasn't confirmed ultrasound completion.",
        },
        {
          type: "CLINICAL",
          severity: "HIGH",
          reason: "Patient reported a new health concern during follow-up.",
        },
      ],
    },
    {
      slug: "anjali-arjun",
      primary: {
        firstName: "Anjali",
        lastName: "Sharma",
        dob: "1994-11-02",
        gender: "FEMALE",
        phone: "+919845022331",
      },
      partner: {
        firstName: "Arjun",
        lastName: "Nair",
        dob: "1991-01-19",
        gender: "MALE",
        phone: "+919845022332",
      },
      planType: "IUI",
      treatmentKind: "IUI",
      label: "IUI Cycle 02",
      stageIndex: 2,
      tasks: [
        {
          title: "Medication check-in — Day 6",
          category: "Medication",
          status: "OVERDUE",
          priority: "HIGH",
        },
      ],
      escalations: [
        {
          type: "NO_RESPONSE",
          severity: "MEDIUM",
          reason: "No response across WhatsApp and voice.",
        },
      ],
    },
    {
      slug: "sneha-kiran",
      primary: {
        firstName: "Sneha",
        lastName: "Reddy",
        dob: "1996-05-21",
        gender: "FEMALE",
        phone: "+919845033441",
      },
      partner: {
        firstName: "Kiran",
        lastName: "Reddy",
        dob: "1993-09-14",
        gender: "MALE",
        phone: "+919845033442",
      },
      planType: "FERTILITY_EVALUATION",
      treatmentKind: "EVALUATION",
      label: "Fertility Evaluation",
      stageIndex: 1,
      tasks: [
        {
          title: "Blood Test (AMH, TSH)",
          category: "Investigation",
          status: "WAITING",
          priority: "NORMAL",
        },
      ],
      escalations: [
        {
          type: "MISSING_REPORT",
          severity: "MEDIUM",
          reason: "Report expected but not received.",
        },
      ],
    },
    {
      slug: "meera-vivek",
      primary: {
        firstName: "Meera",
        lastName: "Krishnan",
        dob: "1993-02-28",
        gender: "FEMALE",
        phone: "+919845044551",
      },
      partner: {
        firstName: "Vivek",
        lastName: "Krishnan",
        dob: "1990-12-03",
        gender: "MALE",
        phone: "+919845044552",
      },
      planType: "IVF",
      treatmentKind: "IVF",
      label: "IVF Cycle 02",
      stageIndex: 3,
      tasks: [
        {
          title: "Consent form — Embryo Transfer",
          category: "Consent",
          status: "WAITING",
          priority: "HIGH",
        },
      ],
      escalations: [
        {
          type: "MISSING_REPORT",
          severity: "LOW",
          reason: "Signed consent not yet uploaded.",
        },
      ],
    },
    {
      slug: "kavya-rohit",
      primary: {
        firstName: "Kavya",
        lastName: "Menon",
        dob: "1997-08-16",
        gender: "FEMALE",
        phone: "+919845055661",
      },
      partner: {
        firstName: "Rohit",
        lastName: "Menon",
        dob: "1994-04-09",
        gender: "MALE",
        phone: "+919845055662",
      },
      planType: "IUI",
      treatmentKind: "IUI",
      label: "IUI Cycle 01",
      stageIndex: 0,
      tasks: [
        {
          title: "Partner investigation booking",
          category: "Investigation",
          status: "ESCALATED",
          priority: "CLINICAL",
        },
      ],
      escalations: [
        {
          type: "AI_UNABLE_TO_RESOLVE",
          severity: "HIGH",
          reason: "Patient asked a question outside Care Loop's scope.",
        },
      ],
    },
  ];

  for (const item of couples) {
    const primary = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: item.primary.firstName,
        lastName: item.primary.lastName,
        dateOfBirth: new Date(item.primary.dob),
        gender: item.primary.gender,
        phone: item.primary.phone,
        whatsappNumber: item.primary.phone,
        preferredLanguage: "en",
      },
    });
    const partner = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: item.partner.firstName,
        lastName: item.partner.lastName,
        dateOfBirth: new Date(item.partner.dob),
        gender: item.partner.gender,
        phone: item.partner.phone,
        whatsappNumber: item.partner.phone,
        preferredLanguage: "en",
      },
    });

    await prisma.consent.create({
      data: {
        clinicId: clinic.id,
        patientId: primary.id,
        channel: "WHATSAPP",
        consentType: "WHATSAPP_COMMUNICATION",
        status: "GRANTED",
        consentedAt: new Date(),
        source: "seed",
      },
    });

    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        slug: item.slug,
        primaryPatientId: primary.id,
        partnerPatientId: partner.id,
        assignedCoordinatorId: coordinatorId,
        assignedDoctorId: doctorId,
        careLoopActive: true,
        status: "ACTIVE",
      },
    });

    const plan = await prisma.carePlan.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        ...(templateIds[item.planType] ? { templateId: templateIds[item.planType] } : {}),
        type: item.planType,
        name: item.label,
        status: "ACTIVE",
        startDate: new Date("2026-07-01"),
        currentStep: item.stageIndex,
        createdById: doctorId,
        steps: {
          create: fertilitySteps.map((name, sortOrder) => ({
            sortOrder,
            name,
            status:
              sortOrder < item.stageIndex
                ? CarePlanStepStatus.DONE
                : sortOrder === item.stageIndex
                  ? CarePlanStepStatus.CURRENT
                  : CarePlanStepStatus.PENDING,
          })),
        },
      },
      include: { steps: true },
    });

    const treatment = await prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        carePlanId: plan.id,
        kind: item.treatmentKind,
        label: item.label,
        status: "ACTIVE",
        stageIndex: item.stageIndex,
        stageName: fertilitySteps[item.stageIndex] ?? "Consultation",
        startedAt: new Date("2026-07-01"),
      },
    });

    if (item.treatmentKind === "IVF") {
      await prisma.iVFCycle.create({
        data: { treatmentId: treatment.id, cycleNumber: 1 },
      });
    }
    if (item.treatmentKind === "IUI") {
      await prisma.iUICycle.create({
        data: { treatmentId: treatment.id, cycleNumber: item.slug.includes("02") ? 2 : 1 },
      });
    }

    const currentStep = plan.steps.find((s) => s.sortOrder === item.stageIndex);

    for (const task of item.tasks) {
      const createdTask = await prisma.careTask.create({
        data: {
          clinicId: clinic.id,
          coupleId: couple.id,
          carePlanId: plan.id,
          carePlanStepId: currentStep?.id,
          title: task.title,
          category: task.category,
          status: task.status,
          priority: task.priority,
          dueDate: new Date("2026-08-16"),
          dueTime: "10:00",
          createdById: doctorId,
          automationEnabled: true,
          aiFollowUpEnabled: true,
          escalationEnabled: true,
        },
      });

      await prisma.taskAssignment.create({
        data: {
          careTaskId: createdTask.id,
          userId: task.priority === "CLINICAL" ? doctorId : coordinatorId,
        },
      });
    }

    for (const esc of item.escalations ?? []) {
      const relatedTask = await prisma.careTask.findFirst({
        where: { coupleId: couple.id },
        orderBy: { createdAt: "asc" },
      });
      await prisma.escalation.create({
        data: {
          clinicId: clinic.id,
          coupleId: couple.id,
          patientId: primary.id,
          ...(relatedTask?.id ? { careTaskId: relatedTask.id } : {}),
          type: esc.type,
          severity: esc.severity,
          reason: esc.reason,
          status: esc.status ?? "OPEN",
          assignedToId: esc.type === "CLINICAL" ? doctorId : coordinatorId,
        },
      });
    }

    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        coupleId: couple.id,
        type: "Monitoring visit",
        doctorName: "Dr. Ananya Rao",
        room: "Scan 2",
        startsAt: new Date("2026-08-18T10:00:00+05:30"),
        durationMin: 30,
        status: "CONFIRMED",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      clinicId: clinic.id,
      actorId: users["admin@abcfertility.demo"]!.id,
      action: "SEED_COMPLETED",
      entityType: "Clinic",
      entityId: clinic.id,
      metadata: { note: "Phase 1 demo seed" },
    },
  });

  console.log("Seed complete.");
  console.log(`Clinic: ${clinic.name} (${clinic.slug})`);
  console.log("Demo password for all users:", DEMO_PASSWORD);
  console.log("Accounts:");
  for (const person of staff) {
    console.log(`  - ${person.email} (${person.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
