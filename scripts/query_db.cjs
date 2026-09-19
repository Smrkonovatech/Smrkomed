require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const couples = await prisma.couple.findMany({
    include: {
      primaryPatient: true,
      partnerPatient: true,
      carePlans: {
        include: {
          steps: { include: { tasks: true } },
          tasks: true,
        }
      },
      careTasks: {
        orderBy: { createdAt: 'desc' }
      },
      escalations: true,
      appointments: true,
      assignedDoctor: true,
      assignedCoordinator: true,
      clinic: true,
    }
  });

  console.log(`Total couples in DB: ${couples.length}`);
  couples.forEach((c) => {
    console.log(`Couple: ${c.primaryPatient?.firstName} ${c.primaryPatient?.lastName} & ${c.partnerPatient?.firstName || ''} ${c.partnerPatient?.lastName || ''} (ID: ${c.id}, slug: ${c.slug})`);
    console.log(`  Care Plans: ${c.carePlans.length}`);
    console.log(`  Care Tasks: ${c.careTasks.length}`);
    console.log(`  Escalations: ${c.escalations.length}`);
    console.log(`  Appointments: ${c.appointments.length}`);
    if (c.careTasks.length > 0) {
      console.log(`  First 3 tasks:`, c.careTasks.slice(0, 3).map(t => ({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate })));
    }
  });

  const totalTasks = await prisma.careTask.count();
  const totalEscalations = await prisma.escalation.count();
  const totalPlans = await prisma.carePlan.count();
  console.log(`Global counts -> Tasks: ${totalTasks}, Escalations: ${totalEscalations}, Plans: ${totalPlans}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
