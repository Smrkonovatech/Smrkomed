/**
 * Phase 1 seed — ABC Fertility Centre + demo staff + couples/plans/tasks.
 * Password for all demo users: Demo@12345
 */
import { hash } from "bcryptjs";
import {
  CampaignStatus,
  CarePlanType,
  CareTaskPriority,
  CareTaskStatus,
  CarePlanStepStatus,
  EscalationSeverity,
  EscalationStatus,
  EscalationType,
  Gender,
  LeadSource,
  LeadStage,
  LeadStatus,
  StaffRole,
  TreatmentKind,
} from "@prisma/client";

import { PERMISSIONS, ROLE_DEFS, ROLE_PERMISSIONS, prisma } from "../src";

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
  console.log("Seeding SmrkoMed…");

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

  await prisma.leadActivity.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.careTask.deleteMany({ where: { clinicId: clinic.id, category: "CRM_FOLLOW_UP" } });
  await prisma.lead.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.campaign.deleteMany({ where: { clinicId: clinic.id } });

  const counsellorId = users["counsellor@abcfertility.demo"]!.id;
  const coordinatorIdForCrm = users["meera@abcfertility.demo"]!.id;

  const [ivfCampaign, evalCampaign, iuiCampaign] = await Promise.all([
    prisma.campaign.create({
      data: {
        organizationId: org.id,
        clinicId: clinic.id,
        name: "IVF September Campaign (demo)",
        source: "META_ADS" satisfies LeadSource,
        medium: "PAID_SOCIAL",
        treatmentFocus: "IVF",
        status: "ACTIVE" satisfies CampaignStatus,
        startDate: new Date("2026-09-01T00:00:00+05:30"),
        endDate: new Date("2026-09-30T00:00:00+05:30"),
      },
    }),
    prisma.campaign.create({
      data: {
        organizationId: org.id,
        clinicId: clinic.id,
        name: "Fertility Evaluation Campaign (demo)",
        source: "GOOGLE_ADS" satisfies LeadSource,
        medium: "PAID_SEARCH",
        treatmentFocus: "Fertility Evaluation",
        status: "ACTIVE" satisfies CampaignStatus,
      },
    }),
    prisma.campaign.create({
      data: {
        organizationId: org.id,
        clinicId: clinic.id,
        name: "IUI Campaign (demo)",
        source: "WEBSITE" satisfies LeadSource,
        medium: "ORGANIC",
        treatmentFocus: "IUI",
        status: "DRAFT" satisfies CampaignStatus,
      },
    }),
  ]);

  const demoLeads: Array<{
    name: string;
    phone: string;
    email: string;
    source: LeadSource;
    stage: LeadStage;
    status: LeadStatus;
    interest: string;
    campaignId?: string;
  }> = [
    { name: "Rahul Demo", phone: "+91 90000 10001", email: "rahul.demo@example.test", source: "WEBSITE", stage: "NEW_LEAD", status: "NEW", interest: "IVF", campaignId: ivfCampaign.id },
    { name: "Sneha Demo", phone: "+91 90000 10002", email: "sneha.demo@example.test", source: "WHATSAPP", stage: "CONTACTED", status: "OPEN", interest: "IUI", campaignId: iuiCampaign.id },
    { name: "Kiran Demo", phone: "+91 90000 10003", email: "kiran.demo@example.test", source: "INSTAGRAM", stage: "QUALIFIED", status: "OPEN", interest: "IVF", campaignId: ivfCampaign.id },
    { name: "Anjali Demo", phone: "+91 90000 10004", email: "anjali.demo@example.test", source: "META_ADS", stage: "CONSULTATION_BOOKED", status: "OPEN", interest: "Egg Freezing", campaignId: ivfCampaign.id },
    { name: "Vikram Demo", phone: "+91 90000 10005", email: "vikram.demo@example.test", source: "GOOGLE_ADS", stage: "CONSULTATION_COMPLETED", status: "OPEN", interest: "Fertility Evaluation", campaignId: evalCampaign.id },
    { name: "Divya Demo", phone: "+91 90000 10006", email: "divya.demo@example.test", source: "PHONE", stage: "INVESTIGATION", status: "OPEN", interest: "IVF" },
    { name: "Arjun Demo", phone: "+91 90000 10007", email: "arjun.demo@example.test", source: "REFERRAL", stage: "TREATMENT_DISCUSSION", status: "OPEN", interest: "IVF" },
    { name: "Priya Demo", phone: "+91 90000 10008", email: "priya.demo@example.test", source: "WALK_IN", stage: "TREATMENT_STARTED", status: "OPEN", interest: "IUI", campaignId: iuiCampaign.id },
    { name: "Neha Demo", phone: "+91 90000 10009", email: "neha.demo@example.test", source: "FACEBOOK", stage: "LOST", status: "LOST", interest: "Male Fertility" },
  ];

  for (const row of demoLeads) {
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        clinicId: clinic.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        source: row.source,
        sourceDetail: "demo seed",
        campaignId: row.campaignId ?? null,
        campaign: row.campaignId ? "demo" : null,
        treatmentInterest: row.interest,
        assignedToId: counsellorId,
        status: row.status,
        stage: row.stage,
        lostReason: row.stage === "LOST" ? "Timing" : null,
        lastActivityAt: new Date(),
        metadata: { demo: true },
      },
    });
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organizationId: org.id,
        clinicId: clinic.id,
        userId: coordinatorIdForCrm,
        type: "LEAD_CREATED",
        description: "Demo lead seeded for Phase 8 CRM.",
        metadata: { demo: true },
      },
    });
    if (row.stage !== "NEW_LEAD") {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          organizationId: org.id,
          clinicId: clinic.id,
          userId: counsellorId,
          type: "STAGE_CHANGED",
          description: `Demo stage set to ${row.stage.replaceAll("_", " ").toLowerCase()}.`,
          metadata: { demo: true },
        },
      });
    }
    if (row.stage === "NEW_LEAD" || row.stage === "CONTACTED") {
      await prisma.careTask.create({
        data: {
          clinicId: clinic.id,
          leadId: lead.id,
          title: "Call patient",
          description: "Demo follow-up — not a real patient.",
          category: "CRM_FOLLOW_UP",
          status: "WAITING",
          dueDate: new Date(Date.now() + (row.stage === "NEW_LEAD" ? 86_400_000 : -86_400_000)),
          createdById: coordinatorIdForCrm,
          assignments: { create: { userId: counsellorId } },
        },
      });
    }
  }

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
