import { prisma } from '@smrkomed/database';

async function main() {
  const couple = await prisma.couple.findFirst({
    where: {
      OR: [
        { id: 'cmu705hxx002nqt10v3hv25s4' },
        { primaryPatientId: 'cmu705hxk002jqt10r20fzcdu' },
        { primaryPatient: { phone: { contains: '7892265880' } } },
      ],
    },
    include: {
      primaryPatient: true,
      partnerPatient: true,
      treatments: true,
      carePlans: {
        include: {
          steps: { orderBy: { sortOrder: 'asc' } },
          tasks: { orderBy: { dueDate: 'asc' } },
        },
      },
      careTasks: { orderBy: { dueDate: 'asc' } },
      appointments: true,
    },
  });

  if (!couple) {
    console.log('Couple NOT FOUND');
    return;
  }

  console.log('FOUND COUPLE:');
  console.log('ID:', couple.id);
  console.log('Slug:', couple.slug);
  console.log('Clinic ID:', couple.clinicId);
  console.log('Primary Patient:', couple.primaryPatient?.firstName, couple.primaryPatient?.lastName, couple.primaryPatient?.id);
  console.log('Partner Patient:', couple.partnerPatient?.firstName, couple.partnerPatient?.lastName, couple.partnerPatient?.id);
  console.log('Treatments:', couple.treatments);
  console.log('CarePlans count:', couple.carePlans.length);
  for (const cp of couple.carePlans) {
    console.log(`CarePlan ${cp.id}: name=${cp.name}, status=${cp.status}, currentStep=${cp.currentStep}, stepsCount=${cp.steps.length}, tasksCount=${cp.tasks.length}`);
    for (const st of cp.steps) {
      console.log(`   Step ${st.sortOrder}: ${st.name} [status=${st.status}]`);
    }
  }
  console.log('CareTasks count:', couple.careTasks.length);
  for (const ct of couple.careTasks) {
    console.log(`CareTask: "${ct.title}" | Due: ${ct.dueDate?.toISOString()} | Time: ${ct.dueTime} | Cat: ${ct.category} | Status: ${ct.status} | taskType: ${ct.taskType}`);
  }
  console.log('Appointments count:', couple.appointments.length);
  for (const ap of couple.appointments) {
    console.log(`Appointment: ${ap.type} at ${ap.startsAt.toISOString()} status=${ap.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
