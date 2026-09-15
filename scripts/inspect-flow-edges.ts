import { prisma } from '@smrkomed/database';

async function run() {
  const f = await prisma.whatsAppFlow.findUnique({ where: { id: 'cmtpj6foa001znv105flxjlj1' } });
  if (!f) {
    console.log('Flow not found');
    return;
  }
  const def = typeof f.definition === 'string' ? JSON.parse(f.definition) : f.definition;
  console.log('--- NODES:');
  for (const n of def.nodes) {
    console.log(n.id, n.type, n.config?.waitForReply ? '(wait)' : '');
  }
  console.log('--- EDGES:');
  for (const e of def.edges) {
    console.log(e.source, '->', e.target, e.branch ? `[${e.branch}]` : '');
  }
}

run().finally(() => prisma.$disconnect());
