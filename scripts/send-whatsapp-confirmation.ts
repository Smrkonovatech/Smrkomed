import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from '@smrkomed/database';
import { sendWhatsAppAiSessionText } from '../apps/api/src/integrations/providers/whatsapp/messaging';

async function main() {
  const conv = await prisma.conversation.findFirst({
    where: { contactPhone: { contains: '8095423222' } },
    orderBy: { updatedAt: 'desc' }
  });
  if (!conv) {
    console.error('Conversation not found');
    return;
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: conv.clinicId }
  });
  if (!clinic) return;

  const tenant = {
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    organizationName: 'SmrkoMed',
    userId: 'system',
    clinicName: clinic.name,
    role: 'CLINIC_ADMIN' as const,
  };

  const body = `You're all set, Manideep! 🎉\n\nYour appointment is confirmed:\n\n👩‍⚕️ Dr. Ananya Rao\n📅 Wednesday, 9 Sep 2026\n⏰ 09:00 AM\n📍 ABC Fertility Centre\n\nWe'll remind you before your appointment!`;

  const res = await sendWhatsAppAiSessionText(tenant, {
    conversationId: conv.id,
    body,
  });

  console.log('Sent WhatsApp confirmation:', res);
}

main().finally(() => prisma.$disconnect());
