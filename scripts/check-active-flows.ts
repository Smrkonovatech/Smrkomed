import { prisma } from '@smrkomed/database';

async function run() {
  const flows = await prisma.whatsAppFlow.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, definition: true }
  });
  for (const f of flows) {
    console.log('--- FLOW:', f.id, f.name);
    const def = typeof f.definition === 'string' ? JSON.parse(f.definition) : f.definition;
    const choiceNode = def.nodes?.find((n: any) => n.id === 'n_channel_choice');
    console.log('Choice node buttons:', choiceNode?.data?.buttons);
    const edges = def.edges?.filter((e: any) => e.source === 'n_channel_choice' || e.target === 'n_channel_choice');
    console.log('Edges connected to n_channel_choice:', edges);
  }

  // Also check the most recent whatsAppFlowExecution to see what state the user was in!
  const recentExecs = await prisma.whatsAppFlowExecution.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      flowId: true,
      status: true,
      currentNodeId: true,
      context: true,
      updatedAt: true,
      error: true
    }
  });
  console.log('--- RECENT EXECUTIONS:');
  for (const ex of recentExecs) {
    console.log({
      id: ex.id,
      flowId: ex.flowId,
      status: ex.status,
      currentNodeId: ex.currentNodeId,
      updatedAt: ex.updatedAt,
      error: ex.error,
      context: ex.context
    });
  }
}

run().finally(() => prisma.$disconnect());
