import { prisma } from '@smrkomed/database';

async function main() {
  const executions = await prisma.whatsAppFlowExecution.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: {
      id: true,
      status: true,
      currentNodeId: true,
      updatedAt: true,
      startedAt: true,
      error: true,
      context: true,
      steps: {
        select: {
          id: true,
          nodeId: true,
          nodeType: true,
          status: true,
          output: true,
          error: true,
          startedAt: true,
          completedAt: true
        }
      }
    }
  });

  for (const ex of executions) {
    const ctx = ex.context as any;
    console.log('=== EXECUTION:', ex.id);
    console.log('Status:', ex.status, 'Node:', ex.currentNodeId);
    console.log('Started:', ex.startedAt?.toISOString(), 'Updated:', ex.updatedAt.toISOString());
    console.log('Error:', ex.error);
    console.log('Vars:', {
      msg: ctx?.vars?.message_text,
      phone: ctx?.vars?.sender_phone,
      bookingChannel: ctx?.vars?.bookingChannel,
      channel_choice: ctx?.vars?.channel_choice
    });
    console.log('Steps:', ex.steps.map(s => ({
      nodeId: s.nodeId,
      type: s.nodeType,
      status: s.status,
      startedAt: s.startedAt?.toISOString()
    })));
  }
}

main().finally(() => prisma.$disconnect());
