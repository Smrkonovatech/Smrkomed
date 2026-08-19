import { prisma } from "@smrkomed/database";
import type { Lead } from "@prisma/client";

import { explainScore } from "./constants";

export async function recomputeLeadScore(lead: Lead) {
  const [whatsapp, call] = await Promise.all([
    prisma.leadActivity.count({
      where: { leadId: lead.id, type: "WHATSAPP_RECEIVED" },
    }),
    prisma.leadActivity.count({
      where: { leadId: lead.id, type: "CALL_CONNECTED" },
    }),
  ]);
  const result = explainScore({
    createdAt: lead.createdAt,
    treatmentInterest: lead.treatmentInterest,
    nextFollowUpAt: lead.nextFollowUpAt,
    respondedWhatsApp: whatsapp > 0,
    callConnected: call > 0,
    stage: lead.stage,
  });
  if (result.score !== lead.score) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { score: result.score },
    });
  }
  return result;
}

export const LeadQualificationService = {
  async suggest(_leadId: string) {
    return {
      implemented: false,
      message: "AI qualification is not connected. A counsellor must qualify this lead.",
    };
  },
};
