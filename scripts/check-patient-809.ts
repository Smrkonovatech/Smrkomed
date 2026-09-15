import { prisma } from '@smrkomed/database';

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { phone: { contains: '8095423222' } }
  });
  console.log('Patient in DB:', patient);

  if (patient && patient.lastName === 'Registered') {
    await prisma.patient.update({
      where: { id: patient.id },
      data: { lastName: '' }
    });
    console.log('Cleaned up lastName from "Registered" to ""');
  }
}

main().finally(() => prisma.$disconnect());
