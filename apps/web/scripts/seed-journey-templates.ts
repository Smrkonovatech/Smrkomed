import { PrismaClient } from "@prisma/client";
import { CLINICAL_15_STAGES } from "../src/lib/clinical-15-stages-data";

const prisma = new PrismaClient();

// This script safely seeds the IVF Standard Journey Template into the existing
// CarePlanTemplate architecture, bridging the frontend mock data to the real DB.

async function seedJourneyTemplates() {
  console.log("Seeding Journey Templates...");
  
  // 1. Get the first clinic to assign this template to
  // (In a real multi-tenant system, this might be a global system template or cloned per clinic)
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) {
    console.error("No clinic found. Please seed a clinic first.");
    process.exit(1);
  }

  // 2. Check if the template already exists
  const existingTemplate = await prisma.carePlanTemplate.findFirst({
    where: { 
      clinicId: clinic.id,
      name: "IVF Standard Journey",
    }
  });

  if (existingTemplate) {
    console.log(`Template "IVF Standard Journey" already exists with ID: ${existingTemplate.id}`);
    
    // We could choose to overwrite or skip. For safety, let's just delete the steps and recreate them
    // to ensure they match CLINICAL_15_STAGES.
    await prisma.carePlanTemplateTask.deleteMany({
      where: { templateId: existingTemplate.id }
    });
    
    await prisma.carePlanTemplateStep.deleteMany({
      where: { templateId: existingTemplate.id }
    });
    
    await seedSteps(existingTemplate.id);
    console.log("Steps updated.");
    process.exit(0);
  }

  // 3. Create the Template
  const template = await prisma.carePlanTemplate.create({
    data: {
      clinicId: clinic.id,
      type: "IVF", // Using CarePlanType.IVF
      name: "IVF Standard Journey",
      description: "Standard 15-stage IVF clinical pathway with automated Care Loop integration.",
      specialty: "FERTILITY",
      version: 1,
      isSystem: true,
      isActive: true,
      config: { 
        source: "CLINICAL_15_STAGES",
        migrated: true
      }
    }
  });

  console.log(`Created Template "IVF Standard Journey" with ID: ${template.id}`);

  // 4. Create the Steps
  await seedSteps(template.id);
  
  console.log("Seeding completed successfully.");
}

async function seedSteps(templateId: string) {
  let sortOrder = 0;
  for (const stage of CLINICAL_15_STAGES) {
    const step = await prisma.carePlanTemplateStep.create({
      data: {
        templateId,
        sortOrder: sortOrder++,
        name: stage.title,
        description: stage.subtitle,
        stageType: "CLINICAL",
        completionStrategy: "ALL_REQUIRED_TASKS_COMPLETE", 
        config: {
          shortCode: stage.shortCode,
          goal: stage.goal,
          objectives: stage.objectives,
          exceptions: stage.exceptions
        }
      }
    });

    // Create a default task for each stage based on the first objective, or a general task
    await prisma.carePlanTemplateTask.create({
      data: {
        templateId,
        stepId: step.id,
        sortOrder: 1,
        title: stage.objectives[0] || `Complete ${stage.title}`,
        description: `Operational task for ${stage.title}`,
        taskType: "PATIENT_TASK",
        ownerRole: "CARE_COORDINATOR",
        priority: "NORMAL",
        dueTimingDays: 0,
        dueTimingHours: 10
      }
    });

    console.log(`  - Seeded Step: ${stage.shortCode} - ${stage.title} with 1 Task`);
  }
}

seedJourneyTemplates()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
