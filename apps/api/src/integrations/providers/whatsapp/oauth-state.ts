import { randomBytes } from "node:crypto";
import { prisma } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";

const TTL_MS = 10 * 60 * 1000;

export async function createWhatsAppOauthState(input: {
  userId: string;
  organizationId: string;
  clinicId: string;
}) {
  return prisma.integrationOauthState.create({
    data: {
      provider: "WHATSAPP_CLOUD",
      userId: input.userId,
      organizationId: input.organizationId,
      clinicId: input.clinicId,
      nonce: randomBytes(16).toString("hex"),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
}

export async function loadValidWhatsAppOauthState(
  id: string,
  ctx: { userId: string; organizationId: string; clinicId: string },
) {
  const row = await prisma.integrationOauthState.findUnique({ where: { id } });
  if (!row || row.provider !== "WHATSAPP_CLOUD") {
    throw new IntegrationError("AUTHORIZATION_FAILED", "Invalid WhatsApp connection state.", 401);
  }
  if (row.consumedAt) {
    throw new IntegrationError("AUTHORIZATION_FAILED", "WhatsApp connection state was already used.", 401);
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new IntegrationError("AUTHORIZATION_FAILED", "WhatsApp connection state expired.", 401);
  }
  if (row.userId !== ctx.userId || row.organizationId !== ctx.organizationId || row.clinicId !== ctx.clinicId) {
    throw new IntegrationError("AUTHORIZATION_FAILED", "WhatsApp connection state does not match this clinic.", 403);
  }
  return row;
}

export async function consumeWhatsAppOauthState(id: string) {
  await prisma.integrationOauthState.update({
    where: { id },
    data: { consumedAt: new Date() },
  });
}
