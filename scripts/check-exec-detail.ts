import { prisma } from '@smrkomed/database';

async function main() {
  const ex = await prisma.whatsAppFlowExecution.findUnique({
    where: { id: 'cmtsiaq0300xto6102btmy8cg' },
    include: { steps: true }
  });
  console.log('Execution:', JSON.stringify(ex, null, 2));
}

main().finally(() => prisma.$disconnect());
