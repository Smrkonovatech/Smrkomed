import { prisma } from '@smrkomed/database';

async function main() {
  const f = await prisma.whatsAppFlow.findUnique({ where: { id: 'cmtpj6foa001znv105flxjlj1' } });
  if (!f) return;
  const def = typeof f.definition === 'string' ? JSON.parse(f.definition) : f.definition;
  console.log('--- TARGET NODES CONFIG:');
  for (const n of def.nodes) {
    if (['n_welcome', 'n_channel_choice', 'n_call_ack'].includes(n.id)) {
      console.log(n.id, JSON.stringify(n.config || n.data));
    }
  }
  console.log('--- ALL EDGES:');
  for (const e of def.edges) {
    console.log(e.source, '-->', e.target, e.branch ? `(${e.branch})` : '');
  }
}

main().finally(() => prisma.$disconnect());
