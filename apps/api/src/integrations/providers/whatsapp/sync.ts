import { prisma, writeAuditLog, type TenantContext } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { credentialService } from "../../credentials/service";
import { listMessageTemplates } from "./graph";
import { countBodyParameters, mapMetaTemplateStatus } from "./templates";

export async function syncWhatsAppTemplates(ctx: TenantContext) {
  const integration = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
  });
  if (!integration || integration.status !== "ACTIVE" || !integration.externalAccountId) {
    throw new IntegrationError("WHATSAPP_NOT_CONNECTED", "WhatsApp is not connected for this clinic.", 409);
  }
  const credentials = credentialService.decrypt(integration.encryptedCredentials);
  const token = credentials.accessToken ?? credentials.systemUserToken;
  if (!token) {
    throw new IntegrationError("AUTHORIZATION_EXPIRED", "WhatsApp authorization requires attention.", 401);
  }
  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "whatsapp.template.sync",
    entityType: "Integration",
    entityId: integration.id,
  });
  const payload = await listMessageTemplates(integration.externalAccountId, token);
  const rows = Array.isArray(payload["data"]) ? (payload["data"] as Array<Record<string, unknown>>) : [];
  const now = new Date();
  for (const row of rows) {
    const name = String(row["name"] ?? "");
    const language = String(row["language"] ?? "en");
    if (!name) continue;
    await prisma.whatsAppTemplate.upsert({
      where: { integrationId_name_language: { integrationId: integration.id, name, language } },
      create: {
        clinicId: ctx.clinicId,
        integrationId: integration.id,
        externalId: typeof row["id"] === "string" ? row["id"] : null,
        name,
        language,
        category: String(row["category"] ?? "UTILITY"),
        status: mapMetaTemplateStatus(typeof row["status"] === "string" ? row["status"] : undefined),
        parameterCount: countBodyParameters(row["components"]),
        rejectionReason: typeof row["rejected_reason"] === "string" ? row["rejected_reason"] : null,
        lastSyncedAt: now,
      },
      update: {
        externalId: typeof row["id"] === "string" ? row["id"] : null,
        category: String(row["category"] ?? "UTILITY"),
        status: mapMetaTemplateStatus(typeof row["status"] === "string" ? row["status"] : undefined),
        parameterCount: countBodyParameters(row["components"]),
        rejectionReason: typeof row["rejected_reason"] === "string" ? row["rejected_reason"] : null,
        lastSyncedAt: now,
      },
    });
  }
  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: now },
  });
  return listWhatsAppTemplates(ctx);
}

export async function listWhatsAppTemplates(ctx: TenantContext) {
  return prisma.whatsAppTemplate.findMany({
    where: { clinicId: ctx.clinicId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      language: true,
      category: true,
      status: true,
      parameterCount: true,
      rejectionReason: true,
      lastSyncedAt: true,
    },
  });
}
