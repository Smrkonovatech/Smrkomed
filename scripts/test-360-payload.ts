import { prisma, buildPatient360 } from '@smrkomed/database';

async function main() {
  const couple = await prisma.couple.findUnique({
    where: { id: 'cmu705hxx002nqt10v3hv25s4' },
    include: { clinic: true },
  });
  if (!couple) throw new Error('Couple not found');

  const tenant = {
    userId: 'test',
    organizationId: couple.clinic.organizationId,
    clinicId: couple.clinicId,
    role: 'CLINIC_ADMIN',
  };

  const p360 = await buildPatient360(tenant as any, couple.id);
  console.log('CurrentTreatment:', p360?.header?.currentTreatment);
  console.log('CurrentCarePlan:', p360?.header?.currentCarePlan);
  console.log('CarePlan steps count:', p360?.header?.currentCarePlan?.steps?.length);
  if (p360?.header?.currentCarePlan?.steps) {
    console.log('Steps:', p360.header.currentCarePlan.steps.map(s => `${s.sortOrder}: ${s.name} [${s.status}]`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
