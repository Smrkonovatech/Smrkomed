import { prisma } from '@smrkomed/database';

export const USER_15_STAGES = [
  {
    sortOrder: 1,
    gapDays: 0, // Sept 1
    name: "01. Lead / Appointment",
    stageType: "Baseline",
    category: "Milestone",
    time: "10:00 AM",
    description: "Initial patient lead qualification and clinic intake appointment",
  },
  {
    sortOrder: 2,
    gapDays: 3, // Sept 4
    name: "02. Initial Consultation",
    stageType: "Consultation",
    category: "Consultation",
    time: "11:00 AM",
    description: "Primary doctor fertility consultation & medical history review",
  },
  {
    sortOrder: 3,
    gapDays: 6, // Sept 7
    name: "03. Fertility Investigation / Workup",
    stageType: "Baseline",
    category: "Diagnostic",
    time: "10:00 AM",
    description: "Baseline hormonal panel (AMH, FSH, LH, E2), viral screen & semen analysis",
  },
  {
    sortOrder: 4,
    gapDays: 9, // Sept 10
    name: "04. IVF Decision",
    stageType: "Consultation",
    category: "Milestone",
    time: "02:00 PM",
    description: "Clinical review of investigation reports and formal IVF/ICSI treatment decision",
  },
  {
    sortOrder: 5,
    gapDays: 12, // Sept 13
    name: "05. Treatment Planning & Consent",
    stageType: "Consultation",
    category: "Milestone",
    time: "03:00 PM",
    description: "Stimulation protocol customized, counseling completed, and informed consent signed",
  },
  {
    sortOrder: 6,
    gapDays: 15, // Sept 16
    name: "06. Cycle Preparation",
    stageType: "Baseline",
    category: "Medication",
    time: "09:00 AM",
    description: "Pre-cycle priming, baseline ultrasound scan & stimulation medication briefing",
  },
  {
    sortOrder: 7,
    gapDays: 18, // Sept 19
    name: "07. Ovarian Stimulation",
    stageType: "Monitoring",
    category: "Medication",
    time: "08:30 AM",
    description: "Day 1 gonadotropin injections start for controlled ovarian stimulation",
  },
  {
    sortOrder: 8,
    gapDays: 21, // Sept 22
    name: "08. Follicular Monitoring",
    stageType: "Monitoring",
    category: "Scan",
    time: "10:30 AM",
    description: "Transvaginal ultrasound follicular monitoring and serum Estradiol (E2) tracking",
  },
  {
    sortOrder: 9,
    gapDays: 24, // Sept 25
    name: "09. Trigger",
    stageType: "Procedure",
    category: "Medication",
    time: "09:30 PM",
    description: "Final oocyte maturation trigger shot administration strictly timed before retrieval",
  },
  {
    sortOrder: 10,
    gapDays: 27, // Sept 28
    name: "10. OPU (Oocyte Pick-Up)",
    stageType: "Procedure",
    category: "Procedure",
    time: "09:00 AM",
    description: "Transvaginal ultrasound-guided oocyte retrieval procedure under sedation in OT",
  },
  {
    sortOrder: 11,
    gapDays: 30, // Oct 1
    name: "11. Embryology",
    stageType: "Procedure",
    category: "Lab",
    time: "11:30 AM",
    description: "Sperm preparation, ICSI / IVF fertilization, 2PN verification & embryo culture",
  },
  {
    sortOrder: 12,
    gapDays: 33, // Oct 4
    name: "12. Transfer / FET",
    stageType: "Transfer",
    category: "Procedure",
    time: "11:00 AM",
    description: "Ultrasound-guided blastocyst embryo transfer into uterine cavity",
  },
  {
    sortOrder: 13,
    gapDays: 36, // Oct 7
    name: "13. Post-Transfer (Two-Week Wait)",
    stageType: "Transfer",
    category: "Medication",
    time: "02:00 PM",
    description: "Luteal phase support with progesterone supplementation and symptom monitoring",
  },
  {
    sortOrder: 14,
    gapDays: 39, // Oct 10
    name: "14. Pregnancy Test",
    stageType: "Follow up",
    category: "Diagnostic",
    time: "09:00 AM",
    description: "Quantitative serum Beta-hCG blood test for biochemical pregnancy outcome",
  },
  {
    sortOrder: 15,
    gapDays: 42, // Oct 13
    name: "15. Outcome",
    stageType: "Follow up",
    category: "Follow up",
    time: "04:00 PM",
    description: "Doctor consultation for clinical pregnancy confirmation and antenatal care handoff",
  },
];

async function main() {
  console.log("Starting 15-Stage IVF Cycle Seeding for Rohit & Trisha...");

  // Find the target couple
  const couple = await prisma.couple.findFirst({
    where: {
      OR: [
        { id: "cmu705hxx002nqt10v3hv25s4" },
        { primaryPatientId: "cmu705hxk002jqt10r20fzcdu" },
        { primaryPatient: { phone: { contains: "7892265880" } } },
        { partnerPatient: { phone: { contains: "7795559724" } } },
      ],
    },
    include: {
      primaryPatient: true,
      partnerPatient: true,
      treatments: true,
    },
  });

  if (!couple) {
    throw new Error("Target couple not found!");
  }

  console.log(`Found couple: ${couple.id} (${couple.primaryPatient?.firstName} & ${couple.partnerPatient?.firstName}) in clinic: ${couple.clinicId}`);

  // Base date: Sept 1, 2026 at 10:00 AM IST (04:30 UTC)
  const cycleStartDate = new Date("2026-09-01T04:30:00.000Z");
  const simulationToday = new Date("2026-09-18T23:59:59.000Z");

  // Deactivate any existing CarePlans for this couple
  await prisma.carePlan.updateMany({
    where: { coupleId: couple.id },
    data: { status: "CANCELLED" },
  });

  // Remove old or conflicting milestone care tasks for this couple
  await prisma.careTask.deleteMany({
    where: {
      coupleId: couple.id,
      OR: [
        { taskType: "CLINICAL_MILESTONE" },
        { category: "Milestone" },
        { title: { startsWith: "01." } },
        { title: { startsWith: "02." } },
        { title: { startsWith: "03." } },
        { title: { startsWith: "04." } },
        { title: { startsWith: "05." } },
        { title: { startsWith: "06." } },
        { title: { startsWith: "07." } },
        { title: { startsWith: "08." } },
        { title: { startsWith: "09." } },
        { title: { startsWith: "10." } },
        { title: { startsWith: "11." } },
        { title: { startsWith: "12." } },
        { title: { startsWith: "13." } },
        { title: { startsWith: "14." } },
        { title: { startsWith: "15." } },
      ],
    },
  });

  console.log("Cleared old milestone tasks.");

  // Create active 15-stage CarePlan
  const currentStageNum = 7; // Stage 7 is Ovarian Stimulation (Sept 19)
  const carePlan = await prisma.carePlan.create({
    data: {
      clinicId: couple.clinicId,
      coupleId: couple.id,
      name: "IVF Standard Care Loop (15 Stages)",
      type: "IVF",
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      startDate: cycleStartDate,
      currentStageIndex: currentStageNum,
      currentStep: currentStageNum,
      currentStageName: USER_15_STAGES[currentStageNum - 1]!.name,
      createdById: couple.primaryPatientId,
    },
  });

  console.log(`Created CarePlan: ${carePlan.id} with current stage ${carePlan.currentStageName}`);

  // Create steps and tasks
  for (const item of USER_15_STAGES) {
    // Due date is Sept 1 + gapDays at 10:00 AM IST
    const dueDate = new Date(cycleStartDate);
    dueDate.setDate(dueDate.getDate() + item.gapDays);

    const isDone = dueDate <= simulationToday;
    const isCurrent = item.sortOrder === currentStageNum;
    const stepStatus = isDone ? "DONE" : isCurrent ? "CURRENT" : "PENDING";
    const taskStatus = isDone ? "COMPLETED" : "WAITING";

    const step = await prisma.carePlanStep.create({
      data: {
        carePlanId: carePlan.id,
        sortOrder: item.sortOrder,
        name: item.name,
        stageType: item.stageType,
        status: stepStatus,
        detail: item.description,
        completedAt: isDone ? dueDate : null,
      },
    });

    const isProcedure = item.stageType === "Procedure";

    const task = await prisma.careTask.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        carePlanId: carePlan.id,
        carePlanStepId: step.id,
        title: item.name,
        description: `${item.description} (Cycle Day ${item.gapDays + 1})`,
        category: item.category,
        taskType: "CLINICAL_MILESTONE",
        ownerRole: "CARE_TEAM",
        targetRole: "PATIENT",
        priority: isProcedure ? "CLINICAL" : "NORMAL",
        status: taskStatus,
        dueDate: dueDate,
        dueTime: item.time,
        completedAt: isDone ? dueDate : null,
        automationEnabled: true,
        escalationEnabled: true,
      },
    });

    console.log(
      `  [Step ${item.sortOrder}] ${item.name} -> ${dueDate.toISOString().split("T")[0]} (${task.status})`
    );
  }

  // Update couple's Treatment to match
  const activeTreatment = couple.treatments.find((t) => t.status === "ACTIVE") || couple.treatments[0];
  if (activeTreatment) {
    await prisma.treatment.update({
      where: { id: activeTreatment.id },
      data: {
        clinicId: couple.clinicId,
        carePlanId: carePlan.id,
        startedAt: cycleStartDate,
        stageIndex: currentStageNum,
        stageName: USER_15_STAGES[currentStageNum - 1]!.name,
        status: "ACTIVE",
        label: "IVF / ICSI Treatment",
        kind: "IVF",
      },
    });
    console.log(`Updated Treatment ${activeTreatment.id} to link with CarePlan ${carePlan.id}`);
  } else {
    await prisma.treatment.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        carePlanId: carePlan.id,
        startedAt: cycleStartDate,
        stageIndex: currentStageNum,
        stageName: USER_15_STAGES[currentStageNum - 1]!.name,
        status: "ACTIVE",
        label: "IVF / ICSI Treatment",
        kind: "IVF",
      },
    });
    console.log(`Created new Treatment for couple ${couple.id}`);
  }

  console.log("\n==================================================");
  console.log("Successfully fed all 15 stages to database!");
  console.log("Dates start on Sept 1, 2026, spaced exactly 3 days apart.");
  console.log("Care Calendar, IVF Cycle widget, and Patient 360 updated!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
