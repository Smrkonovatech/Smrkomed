import { prisma } from '@smrkomed/database';

async function main() {
  console.log('Seeding / Upgrading 15-stage care plans for all test couples...');

  const template = await prisma.carePlanTemplate.findFirst({
    where: {
      name: { contains: 'Care Loop Clinical Flow' },
      isSystem: true,
    },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
        include: { tasks: { orderBy: { sortOrder: 'asc' } } }
      }
    }
  });

  if (!template || template.steps.length !== 15) {
    console.error(`Error: Found template with ${template?.steps?.length} steps. Expected 15 steps.`);
    return;
  }

  console.log(`Found 15-step template: "${template.name}" with ${template.steps.length} steps.`);

  const targets = [
    { slugPattern: 'manideep', initialStage: 7, name: '07. Ovarian Stimulation' },
    { slugPattern: 'mohit-shru', initialStage: 2, name: '02. Initial Fertility Consultation' },
  ];

  for (const target of targets) {
    const couple = await prisma.couple.findFirst({
      where: {
        OR: [
          { slug: { contains: target.slugPattern } },
          { primaryPatient: { phone: { contains: '7795559724' } } },
          { partnerPatient: { phone: { contains: '7892265880' } } },
        ]
      },
      include: {
        primaryPatient: true,
        partnerPatient: true,
      }
    });

    if (!couple) {
      console.log(`Couple matching ${target.slugPattern} not found in DB`);
      continue;
    }

    console.log(`Processing couple: ${couple.primaryPatient?.firstName} & ${couple.partnerPatient?.firstName} (ID: ${couple.id})`);

    // Standardize slug and phone
    if (couple.primaryPatient && target.slugPattern === 'manideep') {
      await prisma.couple.update({ where: { id: couple.id }, data: { slug: 'manideep-mani' } });
      await prisma.patient.update({ where: { id: couple.primaryPatient.id }, data: { phone: '+917795559724' } });
    } else if (couple.primaryPatient && target.slugPattern === 'mohit-shru') {
      await prisma.couple.update({ where: { id: couple.id }, data: { slug: 'mohit-shru' } });
      await prisma.patient.update({ where: { id: couple.primaryPatient.id }, data: { phone: '+917892265880' } });
    }

    // Deactivate existing plans
    await prisma.carePlan.updateMany({
      where: { coupleId: couple.id },
      data: { status: 'CANCELLED' }
    });

    // Create 15-stage plan
    const plan = await prisma.carePlan.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        templateId: template.id,
        name: 'IVF — Standard Care Loop (15 Stages)',
        type: 'IVF',
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        startDate: new Date(),
        templateVersion: 3,
        currentStageIndex: target.initialStage,
        currentStep: target.initialStage,
        currentStageName: target.name,
        createdById: couple.primaryPatientId,
      }
    });

    // Seed the 15 steps
    for (const tStep of template.steps) {
      const status = tStep.sortOrder < target.initialStage ? 'DONE' : tStep.sortOrder === target.initialStage ? 'CURRENT' : 'PENDING';
      const planStep = await prisma.carePlanStep.create({
        data: {
          carePlanId: plan.id,
          name: tStep.name,
          detail: tStep.description,
          stageType: tStep.stageType,
          sortOrder: tStep.sortOrder,
          status,
          completionStrategy: tStep.completionStrategy,
          stageConfig: (tStep.config as any) ?? {},
        }
      });

      for (const tTask of tStep.tasks) {
        const taskStatus = status === 'DONE' ? 'COMPLETED' : status === 'CURRENT' ? 'WAITING' : 'PENDING';
        await prisma.careTask.create({
          data: {
            clinicId: couple.clinicId,
            coupleId: couple.id,
            carePlanId: plan.id,
            carePlanStepId: planStep.id,
            title: tTask.title,
            description: tTask.description,
            taskType: tTask.taskType,
            ownerRole: tTask.ownerRole,
            priority: tTask.priority,
            status: taskStatus,
            dueDate: new Date(Date.now() + (tTask.dueTimingDays || 0) * 86400000),
            communicationConfig: (tTask.communicationConfig as any) ?? {},
            reminderConfig: (tTask.reminderConfig as any) ?? {},
            escalationConfig: (tTask.escalationConfig as any) ?? {},
            metadata: {
              requiredAction: tTask.requiredAction,
              completionCondition: tTask.completionCondition,
            },
          }
        });
      }
    }

    console.log(`Successfully assigned 15 stages to ${couple.slug} at Stage ${target.initialStage}!`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
