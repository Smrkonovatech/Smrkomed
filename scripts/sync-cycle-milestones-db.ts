import { prisma } from '@smrkomed/database';

export const CYCLE_STAGE_GAPS = [
  { name: "01. Baseline & Lead Appointment", stage: "Baseline", gapDays: 0, category: "Milestone", time: "09:30 AM", desc: "Baseline pelvic ultrasound & hormonal profile" },
  { name: "02. Initial Consultation", stage: "Consultation", gapDays: 2, category: "Consultation", time: "11:00 AM", desc: "Doctor consultation & IVF stimulation protocol review" },
  { name: "03. Pre-IVF Workup & Lab Screening", stage: "Baseline", gapDays: 3, category: "Diagnostic", time: "10:00 AM", desc: "Infectious disease screen & baseline bloodwork" },
  { name: "04. Treatment Planning & Consent", stage: "Consultation", gapDays: 4, category: "Milestone", time: "02:00 PM", desc: "Signed treatment consent & medication schedule briefing" },
  { name: "05. Ovarian Stimulation Start", stage: "Monitoring", gapDays: 6, category: "Medication", time: "08:00 AM", desc: "Day 1 of Gonadotropin (Gonal-F/Menopur) injections" },
  { name: "06. Follicular Monitoring - Scan 1", stage: "Monitoring", gapDays: 9, category: "Scan", time: "10:30 AM", desc: "Transvaginal ultrasound for lead follicle cohort & endometrial thickness" },
  { name: "07. Follicular Monitoring - Scan 2", stage: "Monitoring", gapDays: 12, category: "Scan", time: "10:30 AM", desc: "Ultrasound tracking follicles (≥18mm) & serum Estradiol (E2)" },
  { name: "08. Trigger Shot (hCG / Lupron)", stage: "Procedure", gapDays: 13, category: "Medication", time: "09:00 PM", desc: "Final oocyte maturation trigger precisely 36 hours prior to retrieval" },
  { name: "09. OPU / Egg Retrieval (Procedure)", stage: "Procedure", gapDays: 15, category: "Procedure", time: "09:00 AM", desc: "Ultrasound-guided transvaginal oocyte pick-up in OT under sedation" },
  { name: "10. ICSI & Embryo Insemination", stage: "Procedure", gapDays: 16, category: "Lab", time: "11:00 AM", desc: "Embryology lab fertilization check & 2PN verification" },
  { name: "11. Embryo Culture & Cleavage Grading", stage: "Transfer", gapDays: 18, category: "Lab", time: "12:00 PM", desc: "Day 3/Day 5 blastocyst assessment & cryopreservation planning" },
  { name: "12. Embryo Transfer Procedure", stage: "Transfer", gapDays: 20, category: "Procedure", time: "11:30 AM", desc: "Ultrasound-guided intrauterine blastocyst transfer" },
  { name: "13. Luteal Phase Support Review", stage: "Transfer", gapDays: 23, category: "Medication", time: "03:00 PM", desc: "Progesterone supplementation & symptoms check" },
  { name: "14. Beta HCG Pregnancy Test", stage: "Follow up", gapDays: 28, category: "Diagnostic", time: "09:00 AM", desc: "Quantitative serum Beta-hCG blood test for cycle outcome confirmation" },
  { name: "15. Clinical Outcome & Follow-up", stage: "Follow up", gapDays: 30, category: "Follow up", time: "04:00 PM", desc: "Doctor review of Beta-hCG results & ongoing prenatal care plan" },
];

async function main() {
  console.log("Syncing cycle milestones to Care Calendar in Database...");

  const couples = await prisma.couple.findMany({
    where: { status: "ACTIVE" },
    include: {
      treatments: { where: { status: "ACTIVE" } },
      careTasks: true,
    },
  });

  for (const couple of couples) {
    // Determine cycle start date (use treatment.startedAt or couple.createdAt)
    const activeTreatment = couple.treatments[0];
    const baseDate = activeTreatment?.startedAt
      ? new Date(activeTreatment.startedAt)
      : new Date("2026-09-15T00:00:00.000Z");

    console.log(`Processing couple: ${couple.id} (slug: ${couple.slug}), Cycle Start: ${baseDate.toISOString().split("T")[0]}`);

    for (const milestone of CYCLE_STAGE_GAPS) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + milestone.gapDays);
      dueDate.setHours(10, 0, 0, 0);

      // Check if task already exists for this milestone
      const existingTask = await prisma.careTask.findFirst({
        where: {
          coupleId: couple.id,
          title: milestone.name,
        },
      });

      const isCompleted = dueDate <= new Date();

      if (!existingTask) {
        await prisma.careTask.create({
          data: {
            clinicId: couple.clinicId,
            coupleId: couple.id,
            title: milestone.name,
            description: `${milestone.desc} (Cycle Day ${milestone.gapDays + 1}, +${milestone.gapDays} days from cycle start)`,
            category: milestone.category,
            status: isCompleted ? "COMPLETED" : "WAITING",
            dueDate: dueDate,
            dueTime: milestone.time,
            priority: milestone.stage === "Procedure" ? "CLINICAL" : "NORMAL",
            taskType: "CLINICAL_MILESTONE",
            ownerRole: "CARE_TEAM",
          },
        });
        console.log(`  + Created milestone in DB: ${milestone.name} -> ${dueDate.toISOString().split("T")[0]}`);
      } else {
        await prisma.careTask.update({
          where: { id: existingTask.id },
          data: {
            dueDate: dueDate,
            dueTime: milestone.time,
            description: `${milestone.desc} (Cycle Day ${milestone.gapDays + 1}, +${milestone.gapDays} days from cycle start)`,
            category: milestone.category,
          },
        });
        console.log(`  ~ Updated milestone in DB: ${milestone.name} -> ${dueDate.toISOString().split("T")[0]}`);
      }
    }
  }

  console.log("Successfully synced all cycle milestones to database!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
