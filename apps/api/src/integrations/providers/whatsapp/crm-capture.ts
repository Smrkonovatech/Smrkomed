import { prisma, phonesLikelyMatch, phoneSuffix } from "@smrkomed/database";

import { recordLeadActivity } from "../../../modules/crm/activity";

export async function attachWhatsAppInboundToCrm(input: {
  clinicId: string;
  organizationId: string;
  conversationId: string;
  phone: string;
  patientId: string | null;
  preview: string | null;
}) {
  const suffix = phoneSuffix(input.phone);
  const candidates = suffix.length >= 8
    ? await prisma.lead.findMany({
        where: { clinicId: input.clinicId, organizationId: input.organizationId, phone: { contains: suffix } },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];
  let lead = candidates.find((row) => phonesLikelyMatch(row.phone, input.phone)) ?? null;

  if (!lead && !input.patientId) {
    lead = await prisma.lead.create({
      data: {
        organizationId: input.organizationId,
        clinicId: input.clinicId,
        name: `WhatsApp ${suffix || input.phone}`,
        phone: input.phone,
        source: "WHATSAPP",
        sourceDetail: "Inbound WhatsApp",
        status: "NEW",
        stage: "NEW_LEAD",
        conversationId: input.conversationId,
        lastActivityAt: new Date(),
      },
    });
    await recordLeadActivity({
      leadId: lead.id,
      organizationId: input.organizationId,
      clinicId: input.clinicId,
      type: "LEAD_CREATED",
      description: "Lead created from unknown WhatsApp contact.",
      metadata: { source: "WHATSAPP" },
    });
  }

  if (!lead) return;

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { leadId: lead.id },
  });
  if (lead.conversationId !== input.conversationId) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { conversationId: input.conversationId, lastActivityAt: new Date() },
    });
  }
  await recordLeadActivity({
    leadId: lead.id,
    organizationId: input.organizationId,
    clinicId: input.clinicId,
    type: "WHATSAPP_RECEIVED",
    description: "WhatsApp message received.",
    metadata: { conversationId: input.conversationId, preview: input.preview ? input.preview.slice(0, 80) : null },
  });
}
