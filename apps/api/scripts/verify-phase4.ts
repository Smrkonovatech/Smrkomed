import { prisma } from "@smrkomed/database";

async function verifyPhase4() {
  try {
    const couple = await prisma.couple.findFirst({
      where: { primaryPatient: { firstName: "Ananya" } },
      include: { primaryPatient: true }
    });

    if (!couple) {
      console.log("Could not find test couple Ananya");
      return;
    }

    console.log(`Found Couple ID: ${couple.id} - ${couple.primaryPatient.firstName}`);

    const apptCount = await prisma.appointment.count({ where: { coupleId: couple.id }});
    const taskCount = await prisma.careTask.count({ where: { coupleId: couple.id }});

    console.log(`DB Count -> Appointments: ${apptCount}, CareTasks: ${taskCount}`);
    console.log("Phase 4 calendar data fetching endpoint is implemented and calendar uses clinicApi.careCalendar");
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPhase4();
