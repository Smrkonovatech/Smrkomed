import type { CarePlanType, PrismaClient } from "@prisma/client";
import { CarePlanStepStatus } from "@prisma/client";

import { DEMO_COUPLES } from "./seed-demo-couples";
import { day, fertilitySteps, type StaffMap } from "./seed-demo-types";

export async function seedAbcClinicClinicalData(input: {
  prisma: PrismaClient;
  clinicId: string;
  organizationId: string;
  users: StaffMap;
  templateIds: Partial<Record<CarePlanType, string>>;
}) {
  const { prisma, clinicId, organizationId, users, templateIds } = input;
  const meera = users["meera@abcfertility.demo"]!;
  const kavya = users["kavya@abcfertility.demo"]!;
  const counsellor = users["counsellor@abcfertility.demo"]!;
  const admin = users["admin@abcfertility.demo"]!;

  const categories = await prisma.documentCategory.findMany({ where: { clinicId } });
  const categoryByKey = Object.fromEntries(categories.map((c) => [c.key, c.id]));

  const coupleIds: Record<string, string> = {};
  let taskCount = 0;
  let appointmentCount = 0;
  let documentCount = 0;
  let carePlanCount = 0;
  let treatmentCount = 0;
  let ivfCycleCount = 0;
  let iuiCycleCount = 0;

  for (const item of DEMO_COUPLES) {
    const doctor = users[item.doctorEmail]!;
    const coordinator = users[item.coordinatorEmail]!;
    const createdAt = day(-item.registeredDaysAgo, 9);

    const primary = await prisma.patient.create({
      data: {
        clinicId,
        firstName: item.primary.firstName,
        lastName: item.primary.lastName,
        dateOfBirth: new Date(item.primary.dob),
        gender: item.primary.gender,
        phone: item.primary.phone,
        whatsappNumber: item.primary.phone,
        email: item.primary.email,
        preferredLanguage: item.primary.language,
        createdAt,
      },
    });
    const partner = await prisma.patient.create({
      data: {
        clinicId,
        firstName: item.partner.firstName,
        lastName: item.partner.lastName,
        dateOfBirth: new Date(item.partner.dob),
        gender: item.partner.gender,
        phone: item.partner.phone,
        whatsappNumber: item.partner.phone,
        email: item.partner.email,
        preferredLanguage: item.partner.language,
        createdAt,
      },
    });

    await prisma.consent.create({
      data: {
        clinicId,
        patientId: primary.id,
        channel: "WHATSAPP",
        consentType: "WHATSAPP_COMMUNICATION",
        status: item.careLoopActive ? "GRANTED" : "PENDING",
        consentedAt: item.careLoopActive ? createdAt : null,
        source: "seed",
      },
    });

    const couple = await prisma.couple.create({
      data: {
        clinicId,
        slug: item.slug,
        primaryPatientId: primary.id,
        partnerPatientId: partner.id,
        assignedCoordinatorId: coordinator.id,
        assignedDoctorId: doctor.id,
        careLoopActive: item.careLoopActive,
        status: item.coupleStatus,
        createdAt,
      },
    });
    coupleIds[item.slug] = couple.id;

    const planStatus =
      item.coupleStatus === "COMPLETED" ? "COMPLETED" : item.careLoopActive ? "ACTIVE" : "CANCELLED";

    const chosenTemplateId = templateIds[item.planType] ?? undefined;
    const templateRecord = chosenTemplateId
      ? await prisma.carePlanTemplate.findUnique({
          where: { id: chosenTemplateId },
          include: { steps: { orderBy: { sortOrder: "asc" } } },
        })
      : null;

    const stepNames =
      templateRecord && templateRecord.steps.length > 0
        ? templateRecord.steps.map((s) => s.name)
        : fertilitySteps;

    const plan = await prisma.carePlan.create({
      data: {
        clinicId,
        coupleId: couple.id,
        templateId: templateRecord?.id,
        templateVersion: templateRecord?.version ?? 1,
        snapshotData: templateRecord
          ? {
              name: templateRecord.name,
              version: templateRecord.version,
              steps: templateRecord.steps.map((s) => ({ sortOrder: s.sortOrder, name: s.name, stageType: s.stageType })),
            }
          : undefined,
        type: item.planType,
        name: item.planName,
        status: planStatus,
        approvalStatus: "APPROVED",
        approvedById: doctor.id,
        approvedAt: createdAt,
        startDate: createdAt,
        currentStep: item.stageIndex,
        currentStageIndex: item.stageIndex,
        currentStageName: item.stageName,
        assignedDoctorId: doctor.id,
        assignedCoordinatorId: coordinator.id,
        createdById: doctor.id,
        steps: {
          create: stepNames.map((name, sortOrder) => ({
            sortOrder,
            name,
            status:
              item.coupleStatus === "COMPLETED" || sortOrder < item.stageIndex
                ? CarePlanStepStatus.DONE
                : sortOrder === item.stageIndex
                  ? CarePlanStepStatus.CURRENT
                  : CarePlanStepStatus.PENDING,
          })),
        },
      },
      include: { steps: true },
    });
    carePlanCount += 1;

    const treatment = await prisma.treatment.create({
      data: {
        clinicId,
        coupleId: couple.id,
        carePlanId: plan.id,
        kind: item.treatmentKind,
        label: item.label,
        status: item.treatmentStatus,
        stageIndex: item.stageIndex,
        stageName: item.stageName,
        startedAt: createdAt,
      },
    });
    treatmentCount += 1;

    if (item.treatmentKind === "IVF" || item.treatmentKind === "FET") {
      await prisma.iVFCycle.create({
        data: {
          treatmentId: treatment.id,
          cycleNumber: 1,
          notes: item.cycleNotes ?? `${item.label} · ${item.stageName}`,
        },
      });
      ivfCycleCount += 1;
      // Extra completed prior cycle for Arjun/Neha so IVF cycle demos have ≥8 records
      if (item.slug === "arjun-neha") {
        // IVFCycle is 1:1 with Treatment — create a prior completed treatment+cycle
        const prior = await prisma.treatment.create({
          data: {
            clinicId,
            coupleId: couple.id,
            kind: "IVF",
            label: "IVF-2025-PREV",
            status: "COMPLETED",
            stageIndex: 6,
            stageName: "Completed",
            startedAt: day(-180),
          },
        });
        treatmentCount += 1;
        await prisma.iVFCycle.create({
          data: {
            treatmentId: prior.id,
            cycleNumber: 1,
            notes: "Prior completed IVF cycle (demo)",
          },
        });
        ivfCycleCount += 1;
      }
    }
    if (item.treatmentKind === "IUI") {
      await prisma.iUICycle.create({
        data: {
          treatmentId: treatment.id,
          cycleNumber: 1,
          notes: item.cycleNotes ?? `${item.label} · ${item.stageName}`,
        },
      });
      iuiCycleCount += 1;
    }

    const currentStep = plan.steps.find((s) => s.sortOrder === item.stageIndex) ?? plan.steps[0];
    for (const task of item.tasks) {
      const taskObj = task as typeof task & { dueTime?: string; note?: string };
      const assigneeId =
        task.assignTo === "doctor" ? doctor.id : task.assignTo === "kavya" ? kavya.id : meera.id;
      const ownerRole = task.assignTo === "doctor" ? "DOCTOR" : task.assignTo === "patient" ? "PATIENT" : "COORDINATOR";
      const createdTask = await prisma.careTask.create({
        data: {
          clinicId,
          coupleId: couple.id,
          carePlanId: plan.id,
          carePlanStepId: currentStep?.id,
          title: task.title,
          description: taskObj.note ?? null,
          category: task.category,
          status: task.status,
          priority: task.priority,
          taskType: task.category === "Medication" ? "MEDICATION_TASK" : task.category === "Appointment" ? "APPOINTMENT_TASK" : "STAFF_TASK",
          ownerRole,
          source: "TEMPLATE",
          dueDate: day(task.dueOffset),
          dueTime: taskObj.dueTime ?? "10:00",
          createdById: meera.id,
          completedAt: task.status === "COMPLETED" ? day(task.dueOffset) : null,
          automationEnabled: true,
          aiFollowUpEnabled: true,
          escalationEnabled: true,
        },
      });
      await prisma.taskAssignment.create({
        data: { careTaskId: createdTask.id, userId: assigneeId },
      });
      taskCount += 1;

      // Seed explicit open exceptions for primary demonstration couples
      if (item.slug === "priya-rahul" && task.title === "Medication acknowledgement") {
        await prisma.escalation.create({
          data: {
            clinicId,
            coupleId: couple.id,
            patientId: primary.id,
            careTaskId: createdTask.id,
            type: "TASK_OVERDUE",
            severity: "HIGH",
            reason: "Medication confirmation missing — 2 hours overdue",
            status: "OPEN",
            assignedToId: coordinator.id,
          },
        });
      }
      if (item.slug === "anita-rahul" && task.title === "Review monitoring report") {
        await prisma.escalation.create({
          data: {
            clinicId,
            coupleId: couple.id,
            patientId: primary.id,
            careTaskId: createdTask.id,
            type: "CLINICAL",
            severity: "HIGH",
            reason: "Monitoring report ready for review — lead follicles 18mm & 17mm",
            status: "OPEN",
            assignedToId: doctor.id,
          },
        });
      }
    }

    for (const esc of item.escalations ?? []) {
      const relatedTask = await prisma.careTask.findFirst({
        where: { coupleId: couple.id },
        orderBy: { createdAt: "asc" },
      });
      await prisma.escalation.create({
        data: {
          clinicId,
          coupleId: couple.id,
          patientId: primary.id,
          ...(relatedTask?.id ? { careTaskId: relatedTask.id } : {}),
          type: esc.type,
          severity: esc.severity,
          reason: esc.reason,
          status: esc.status ?? "OPEN",
          assignedToId: esc.type === "CLINICAL" ? doctor.id : meera.id,
        },
      });
    }

    for (const appt of item.appointments) {
      await prisma.appointment.create({
        data: {
          clinicId,
          coupleId: couple.id,
          type: appt.type,
          doctorName: appt.doctorName,
          room: appt.room,
          startsAt: day(appt.dayOffset, appt.hour),
          durationMin: 30,
          status: appt.status,
          notes: appt.notes,
        },
      });
      appointmentCount += 1;
    }

    for (const doc of item.documents) {
      const categoryId = categoryByKey[doc.categoryKey];
      await prisma.document.create({
        data: {
          clinicId,
          coupleId: couple.id,
          patientId: primary.id,
          ...(categoryId ? { categoryId } : {}),
          name: doc.name,
          mimeType: "application/pdf",
          sizeBytes: 128_000,
          uploadedById: meera.id,
          status: doc.status,
          storageKey: `demo/${item.slug}/${doc.name.replaceAll(" ", "-").toLowerCase()}.pdf`,
        },
      });
      documentCount += 1;
    }

    try {
      await prisma.consultationNote.create({
        data: {
          clinicId,
          coupleId: couple.id,
          createdById: doctor.id,
          consultationDate: day(-Math.min(item.registeredDaysAgo, 14), 11),
          summary: `Demo consultation for ${item.primary.firstName} & ${item.partner.firstName}. Stage: ${item.stageName}.`,
          reasonForVisit: item.stageName,
          nextSteps: item.tasks[0]?.title ?? "Continue care plan",
        },
      });
    } catch {
      // Table may be missing until migrations are applied
    }

    const conversation = await prisma.conversation.create({
      data: {
        clinicId,
        coupleId: couple.id,
        patientId: primary.id,
        contactPhone: primary.phone ?? undefined,
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          senderType: "STAFF",
          content: `Hi ${item.partner.firstName}, Meera from ABC Fertility — reminder about your ${item.appointments[0]?.type ?? "visit"}.`,
          status: "DELIVERED",
        },
        {
          conversationId: conversation.id,
          direction: "INBOUND",
          senderType: "PATIENT",
          content: "Thank you, we will be there.",
          status: "READ",
        },
      ],
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        clinicId,
        actorId: meera.id,
        action: "care_loop.activity",
        entityType: "Couple",
        entityId: couple.id,
        metadata: {
          patient: `${item.primary.firstName} + ${item.partner.firstName}`,
          activity: `Care Loop ${item.careLoopActive ? "active" : "paused"} · ${item.stageName}`,
          tone: item.coupleStatus === "ON_HOLD" ? "warning" : "info",
        },
      },
    });
  }

  const extras: Array<{
    slug: string;
    type: string;
    doctorName: string;
    room: string;
    dayOffset: number;
    hour: number;
    status: "CONFIRMED" | "WAITING" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  }> = [
    {
      slug: "arjun-neha",
      type: "Ultrasound",
      doctorName: "Dr. Rahul Menon",
      room: "Scan 2",
      dayOffset: 5,
      hour: 9,
      status: "CONFIRMED",
    },
    {
      slug: "vikram-anjali",
      type: "Egg retrieval",
      doctorName: "Dr. Ananya Rao",
      room: "OT 1",
      dayOffset: -12,
      hour: 7,
      status: "COMPLETED",
    },
    {
      slug: "mohit-shru",
      type: "Counselling",
      doctorName: "Meera Counsel",
      room: "Counselling",
      dayOffset: 6,
      hour: 16,
      status: "CONFIRMED",
    },
    {
      slug: "aditya-pooja",
      type: "Blood test",
      doctorName: "Dr. Rahul Menon",
      room: "Lab",
      dayOffset: 3,
      hour: 8,
      status: "CONFIRMED",
    },
    {
      slug: "amit-sneha",
      type: "Doctor review",
      doctorName: "Dr. Priya Nair",
      room: "Consult 3",
      dayOffset: 2,
      hour: 13,
      status: "WAITING",
    },
  ];
  for (const appt of extras) {
    const coupleId = coupleIds[appt.slug];
    if (!coupleId) continue;
    await prisma.appointment.create({
      data: {
        clinicId,
        coupleId,
        type: appt.type,
        doctorName: appt.doctorName,
        room: appt.room,
        startsAt: day(appt.dayOffset, appt.hour),
        durationMin: 30,
        status: appt.status,
      },
    });
    appointmentCount += 1;
  }

  const extraTasks = [
    { slug: "arjun-neha", title: "Confirm tomorrow's follicular scan", category: "Appointment", status: "WAITING" as const, priority: "HIGH" as const, dueOffset: 0 },
    { slug: "vikram-anjali", title: "Upload blood report for transfer clearance", category: "Document", status: "IN_PROGRESS" as const, priority: "HIGH" as const, dueOffset: 0 },
    { slug: "rohan-priya", title: "Escalate missing lab to doctor", category: "Doctor Review", status: "OVERDUE" as const, priority: "CLINICAL" as const, dueOffset: -1 },
    { slug: "nikhil-aisha", title: "Reschedule missed follow-up", category: "Appointment", status: "WAITING" as const, priority: "HIGH" as const, dueOffset: 1 },
    { slug: "mohit-shru", title: "Prepare consultation packet", category: "Care Plan", status: "COMPLETED" as const, priority: "NORMAL" as const, dueOffset: -1 },
    { slug: "amit-sneha", title: "Billing reconciliation check", category: "Billing", status: "WAITING" as const, priority: "LOW" as const, dueOffset: 4 },
    { slug: "manish-kavya", title: "Send pause acknowledgement WhatsApp", category: "Communication", status: "COMPLETED" as const, priority: "NORMAL" as const, dueOffset: -4 },
    { slug: "aditya-pooja", title: "Share evaluation FAQ", category: "Communication", status: "IN_PROGRESS" as const, priority: "LOW" as const, dueOffset: 1 },
    { slug: "suresh-divya", title: "Archive completed journey folder", category: "Document", status: "COMPLETED" as const, priority: "LOW" as const, dueOffset: -6 },
    { slug: "karan-riya", title: "Track FET resume window", category: "Care Plan", status: "WAITING" as const, priority: "NORMAL" as const, dueOffset: 10 },
  ];
  for (const task of extraTasks) {
    const coupleId = coupleIds[task.slug];
    if (!coupleId) continue;
    const created = await prisma.careTask.create({
      data: {
        clinicId,
        coupleId,
        title: task.title,
        category: task.category,
        status: task.status,
        priority: task.priority,
        dueDate: day(task.dueOffset),
        dueTime: "11:00",
        createdById: meera.id,
        completedAt: task.status === "COMPLETED" ? day(task.dueOffset) : null,
      },
    });
    await prisma.taskAssignment.create({ data: { careTaskId: created.id, userId: meera.id } });
    taskCount += 1;
  }

  await prisma.leadActivity.deleteMany({ where: { clinicId } });
  await prisma.careTask.deleteMany({ where: { clinicId, category: "CRM_FOLLOW_UP" } });
  await prisma.lead.deleteMany({ where: { clinicId } });
  await prisma.campaign.deleteMany({ where: { clinicId } });

  const [ivfCampaign, evalCampaign, iuiCampaign] = await Promise.all([
    prisma.campaign.create({
      data: {
        organizationId,
        clinicId,
        name: "IVF Awareness Campaign",
        source: "INSTAGRAM",
        medium: "PAID_SOCIAL",
        treatmentFocus: "IVF",
        status: "ACTIVE",
        startDate: day(-30),
        endDate: day(30),
      },
    }),
    prisma.campaign.create({
      data: {
        organizationId,
        clinicId,
        name: "Fertility Evaluation Push",
        source: "GOOGLE",
        medium: "PAID_SEARCH",
        treatmentFocus: "Evaluation",
        status: "ACTIVE",
      },
    }),
    prisma.campaign.create({
      data: {
        organizationId,
        clinicId,
        name: "IUI Walk-in Drive",
        source: "WEBSITE",
        medium: "ORGANIC",
        treatmentFocus: "IUI",
        status: "DRAFT",
      },
    }),
  ]);

  const demoLeads = [
    { name: "Rahul + Sneha", phone: "+919000010001", email: "rahul.sneha@demo.lead", source: "INSTAGRAM" as const, stage: "NEW_LEAD" as const, status: "NEW" as const, interest: "IVF", campaignId: ivfCampaign.id },
    { name: "Vivek + Aarti", phone: "+919000010002", email: "vivek.aarti@demo.lead", source: "WEBSITE" as const, stage: "CONSULTATION_BOOKED" as const, status: "OPEN" as const, interest: "Evaluation", campaignId: evalCampaign.id },
    { name: "Sameer + Nisha", phone: "+919000010003", email: "sameer.nisha@demo.lead", source: "REFERRAL" as const, stage: "ACTIVE_PATIENT" as const, status: "CONVERTED" as const, interest: "IVF" },
    { name: "Kiran Demo", phone: "+919000010004", email: "kiran.lead@demo.lead", source: "GOOGLE" as const, stage: "CONTACTED" as const, status: "OPEN" as const, interest: "IUI", campaignId: iuiCampaign.id },
    { name: "Anjali Walk-in", phone: "+919000010005", email: "anjali.walkin@demo.lead", source: "WALK_IN" as const, stage: "QUALIFIED" as const, status: "OPEN" as const, interest: "FET" },
    { name: "Vikram WhatsApp", phone: "+919000010006", email: "vikram.wa@demo.lead", source: "WHATSAPP" as const, stage: "TREATMENT_DISCUSSION" as const, status: "OPEN" as const, interest: "IVF", campaignId: ivfCampaign.id },
    { name: "Divya Phone", phone: "+919000010007", email: "divya.phone@demo.lead", source: "PHONE" as const, stage: "CONSULTATION_COMPLETED" as const, status: "OPEN" as const, interest: "Evaluation" },
    { name: "Arjun Follow-up", phone: "+919000010008", email: "arjun.fu@demo.lead", source: "WEBSITE" as const, stage: "CONTACTED" as const, status: "OPEN" as const, interest: "IUI" },
    { name: "Neha Lost", phone: "+919000010009", email: "neha.lost@demo.lead", source: "FACEBOOK" as const, stage: "LOST" as const, status: "LOST" as const, interest: "IVF" },
    { name: "Pooja Converted", phone: "+919000010010", email: "pooja.conv@demo.lead", source: "REFERRAL" as const, stage: "TREATMENT_STARTED" as const, status: "CONVERTED" as const, interest: "IVF", campaignId: ivfCampaign.id },
  ];

  let leadCount = 0;
  for (const row of demoLeads) {
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        clinicId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        source: row.source,
        sourceDetail: "demo seed",
        campaignId: row.campaignId ?? null,
        campaign: row.campaignId ? "demo" : null,
        treatmentInterest: row.interest,
        assignedToId: counsellor.id,
        status: row.status,
        stage: row.stage,
        lostReason: row.stage === "LOST" ? "Timing" : null,
        lastActivityAt: new Date(),
        metadata: { demo: true },
      },
    });
    leadCount += 1;
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organizationId,
        clinicId,
        userId: meera.id,
        type: "LEAD_CREATED",
        description: "Demo lead seeded for ABC Fertility CRM.",
        metadata: { demo: true },
      },
    });
    if (row.stage === "NEW_LEAD" || row.stage === "CONTACTED") {
      const crmTask = await prisma.careTask.create({
        data: {
          clinicId,
          leadId: lead.id,
          title: `CRM follow-up — ${row.name}`,
          description: "Demo CRM follow-up task",
          category: "CRM_FOLLOW_UP",
          status: "WAITING",
          dueDate: day(row.stage === "NEW_LEAD" ? 1 : -1),
          createdById: meera.id,
        },
      });
      await prisma.taskAssignment.create({ data: { careTaskId: crmTask.id, userId: meera.id } });
      taskCount += 1;
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      clinicId,
      actorId: admin.id,
      action: "SEED_DEMO_DATASET",
      entityType: "Clinic",
      entityId: clinicId,
      metadata: {
        couples: DEMO_COUPLES.length,
        tasks: taskCount,
        appointments: appointmentCount,
        documents: documentCount,
        carePlans: carePlanCount,
        treatments: treatmentCount,
        ivfCycles: ivfCycleCount,
        iuiCycles: iuiCycleCount,
        leads: leadCount,
      },
    },
  });

  return {
    couples: DEMO_COUPLES.length,
    patients: DEMO_COUPLES.length * 2,
    carePlans: carePlanCount,
    treatments: treatmentCount,
    ivfCycles: ivfCycleCount,
    iuiCycles: iuiCycleCount,
    tasks: taskCount,
    appointments: appointmentCount,
    documents: documentCount,
    leads: leadCount,
    campaigns: 3,
  };
}
