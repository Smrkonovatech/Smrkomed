import { prisma } from '@smrkomed/database';

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { phone: { contains: '8095423222' } }
  });
  if (!patient) {
    console.error('Patient not found');
    return;
  }

  // Find or create couple for patient
  let couple = await prisma.couple.findFirst({
    where: {
      clinicId: patient.clinicId,
      OR: [{ primaryPatientId: patient.id }, { partnerPatientId: patient.id }]
    }
  });

  if (!couple) {
    couple = await prisma.couple.create({
      data: {
        clinicId: patient.clinicId,
        slug: `c-${patient.id.slice(-8)}-${Date.now().toString(36)}`,
        primaryPatientId: patient.id,
      }
    });
  }

  // Wednesday, Sept 9, 2026 at 9:00 AM IST (03:30 UTC)
  const startsAt = new Date('2026-09-09T03:30:00.000Z');

  // Check if already booked
  const existing = await prisma.appointment.findFirst({
    where: {
      clinicId: patient.clinicId,
      startsAt,
      coupleId: couple.id,
    }
  });

  if (existing) {
    console.log('Appointment already exists:', existing);
    return;
  }

  const appt = await prisma.appointment.create({
    data: {
      clinicId: patient.clinicId,
      coupleId: couple.id,
      doctorName: 'Dr. Ananya Rao',
      type: 'CONSULTATION',
      startsAt,
      durationMin: 30,
      status: 'CONFIRMED',
      notes: `Booked via AI Voice Call (${patient.firstName} ${patient.lastName || ''})`.trim(),
    }
  });

  console.log('Created appointment:', appt);

  // Send WhatsApp confirmation message
  const conv = await prisma.conversation.findFirst({
    where: { contactPhone: { contains: '8095423222' } },
    orderBy: { updatedAt: 'desc' }
  });

  if (conv) {
    const confirmationText = `You're all set! 🎉\n\nYour appointment is confirmed:\n\n👩‍⚕️ Dr. Ananya Rao\n📅 Wednesday, 9 Sep 2026\n⏰ 09:00 AM\n📍 ABC Fertility Centre\n\nWe'll remind you before your appointment!`;
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: 'OUTBOUND',
        senderType: 'STAFF',
        content: confirmationText,
        messageType: 'text',
        status: 'SENT',
      }
    });
    console.log('Created WhatsApp confirmation message in conversation', conv.id);
  }
}

main().finally(() => prisma.$disconnect());
