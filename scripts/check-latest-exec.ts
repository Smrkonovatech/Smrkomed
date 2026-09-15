import { prisma } from '@smrkomed/database';

async function main() {
  const recentExecs = await prisma.whatsAppFlowExecution.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      flowId: true,
      status: true,
      currentNodeId: true,
      updatedAt: true,
      startedAt: true,
      error: true,
      context: true
    }
  });

  for (const ex of recentExecs) {
    const ctx = ex.context as any;
    console.log({
      id: ex.id,
      status: ex.status,
      node: ex.currentNodeId,
      updatedAt: ex.updatedAt.toISOString(),
      startedAt: ex.startedAt?.toISOString(),
      msg: ctx?.vars?.message_text,
      phone: ctx?.vars?.sender_phone
    });
  }
}

main().finally(() => prisma.$disconnect());
