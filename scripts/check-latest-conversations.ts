import { prisma } from '@smrkomed/database';

async function main() {
  const convs = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      messages: { take: 3, orderBy: { createdAt: 'desc' } }
    }
  });

  for (const c of convs) {
    console.log({
      id: c.id,
      contactPhone: c.contactPhone,
      unmatched: c.unmatched,
      patientId: c.patientId,
      patientName: c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : null,
      patientPhone: c.patient?.phone,
      pendingAction: c.pendingAction,
      recentMessages: c.messages.map((m) => ({ dir: m.direction, text: m.content.slice(0, 80) }))
    });
  }
}

main().finally(() => prisma.$disconnect());
