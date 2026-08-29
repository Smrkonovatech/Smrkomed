import { prisma, writeAuditLog, type TenantContext } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { credentialService } from "../../credentials/service";
import { createMemoryRateLimiter } from "../../../middleware/rate-limit";
import { sendTemplateMessage, sendTextMessage } from "./graph";
import { normalizeWhatsAppPhone } from "./phone";
import { isSendableTemplateStatus } from "./templates";

const perUser = createMemoryRateLimiter(10, 60_000);
const perClinic = createMemoryRateLimiter(30, 60_000);

function assertRateLimit(userId: string, clinicId: string) {
  if (!perUser.consume(`wa-user:${userId}`).allowed) {
    throw new IntegrationError("PROVIDER_RATE_LIMITED", "Too many WhatsApp send attempts.", 429);
  }
  if (!perClinic.consume(`wa-clinic:${clinicId}`).allowed) {
    throw new IntegrationError("PROVIDER_RATE_LIMITED", "Clinic WhatsApp send limit reached.", 429);
  }
}

export async function sendWhatsAppTemplate(ctx: TenantContext, input: {
  conversationId?: string;
  patientId?: string;
  leadId?: string;
  templateId: string;
  parameters: string[];
}) {
  assertRateLimit(ctx.userId, ctx.clinicId);
  if (input.parameters.some((value) => value.length > 256) || input.parameters.length > 10) {
    throw new IntegrationError("INVALID_TEMPLATE", "Template parameters are invalid.", 422);
  }

  const integration = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
  });
  if (!integration || integration.organizationId !== ctx.organizationId || integration.status !== "ACTIVE") {
    throw new IntegrationError("WHATSAPP_NOT_CONNECTED", "WhatsApp is not connected for this clinic.", 409);
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { clinicId: ctx.clinicId, integrationId: integration.id, isActive: true },
  });
  if (!account) {
    throw new IntegrationError("PHONE_NOT_REGISTERED", "No active WhatsApp phone number is connected.", 409);
  }

  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: input.templateId, clinicId: ctx.clinicId, integrationId: integration.id },
  });
  if (!template) {
    throw new IntegrationError("INVALID_TEMPLATE", "Template was not found for this clinic.", 404);
  }
  if (!isSendableTemplateStatus(template.status)) {
    throw new IntegrationError("TEMPLATE_NOT_APPROVED", "Only Meta-approved templates can be sent.", 422);
  }
  if (template.parameterCount > 0 && input.parameters.length < template.parameterCount) {
    throw new IntegrationError("INVALID_TEMPLATE", "This template is missing required parameters.", 422);
  }

  const conversation = await resolveConversation(ctx, input, integration.id);
  const recipient = conversation.contactPhone;
  if (!recipient) {
    throw new IntegrationError("INVALID_RECIPIENT", "No WhatsApp number is associated with this conversation.", 422);
  }

  if (conversation.patientId) {
    const consent = await prisma.consent.findFirst({
      where: {
        clinicId: ctx.clinicId,
        patientId: conversation.patientId,
        channel: "WHATSAPP",
        consentType: "WHATSAPP_COMMUNICATION",
        status: "REVOKED",
      },
    });
    if (consent) {
      throw new IntegrationError("INVALID_RECIPIENT", "This patient has revoked WhatsApp communication.", 403);
    }
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
    action: "whatsapp.message.send.attempt",
    entityType: "Conversation",
    entityId: conversation.id,
    metadata: { template: template.name, language: template.language },
  });

  try {
    const result = await sendTemplateMessage({
      phoneNumberId: account.phoneNumberId,
      accessToken: token,
      to: recipient,
      name: template.name,
      language: template.language,
      parameters: input.parameters.slice(0, template.parameterCount || input.parameters.length),
    });
    const messages = result["messages"];
    const providerMessageId =
      Array.isArray(messages) && messages[0] && typeof messages[0] === "object"
        ? String((messages[0] as { id?: string }).id ?? "")
        : "";
    const stored = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        senderType: "STAFF",
        content: `Template: ${template.name}`,
        messageType: "template",
        providerMessageId: providerMessageId || null,
        status: "SENT",
      },
    });
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.message.send.success",
      entityType: "Message",
      entityId: stored.id,
      metadata: { template: template.name },
    });
    return { id: stored.id, status: stored.status, providerMessageId: stored.providerMessageId };
  } catch (error) {
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.message.send.failure",
      entityType: "Conversation",
      entityId: conversation.id,
      metadata: { template: template.name },
    });
    if (error instanceof IntegrationError && error.code === "AUTHORIZATION_EXPIRED") {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: "ACTION_REQUIRED", lastErrorCode: "AUTHORIZATION_EXPIRED", lastError: "WhatsApp connection requires attention." },
      });
    }
    throw error instanceof IntegrationError
      ? error
      : new IntegrationError("MESSAGE_SEND_FAILED", "WhatsApp could not send this template.", 500);
  }
}

/**
 * Session free-text reply (staff). Requires an open customer-care window on Meta's side.
 * Never used for mass broadcast. Marks sender as STAFF (not doctor persona).
 */
export async function sendWhatsAppSessionText(
  ctx: TenantContext,
  input: { conversationId: string; body: string },
) {
  assertRateLimit(ctx.userId, ctx.clinicId);
  const body = input.body.trim();
  if (!body || body.length > 4096) {
    throw new IntegrationError("INVALID_TEMPLATE", "Message body is required (max 4096 chars).", 422);
  }

  const integration = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
  });
  if (!integration || integration.organizationId !== ctx.organizationId || integration.status !== "ACTIVE") {
    throw new IntegrationError("WHATSAPP_NOT_CONNECTED", "WhatsApp is not connected for this clinic.", 409);
  }
  const account = await prisma.whatsAppAccount.findFirst({
    where: { clinicId: ctx.clinicId, integrationId: integration.id, isActive: true },
  });
  if (!account) {
    throw new IntegrationError("PHONE_NOT_REGISTERED", "No active WhatsApp phone number is connected.", 409);
  }

  const conversation = await resolveConversation(ctx, { conversationId: input.conversationId }, integration.id);
  const recipient = conversation.contactPhone;
  if (!recipient) {
    throw new IntegrationError("INVALID_RECIPIENT", "No WhatsApp number is associated with this conversation.", 422);
  }

  if (conversation.patientId) {
    const consent = await prisma.consent.findFirst({
      where: {
        clinicId: ctx.clinicId,
        patientId: conversation.patientId,
        channel: "WHATSAPP",
        consentType: "WHATSAPP_COMMUNICATION",
        status: "REVOKED",
      },
    });
    if (consent) {
      throw new IntegrationError("INVALID_RECIPIENT", "This patient has revoked WhatsApp communication.", 403);
    }
    const prefs = await prisma.communicationPreference.findUnique({
      where: { patientId: conversation.patientId },
    });
    if (prefs && !prefs.whatsappEnabled) {
      throw new IntegrationError("INVALID_RECIPIENT", "Patient has disabled WhatsApp in communication preferences.", 403);
    }
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
    action: "whatsapp.message.send.session.attempt",
    entityType: "Conversation",
    entityId: conversation.id,
    metadata: { kind: "session_text" },
  });

  try {
    const result = await sendTextMessage({
      phoneNumberId: account.phoneNumberId,
      accessToken: token,
      to: recipient,
      body,
    });
    const messages = result["messages"];
    const providerMessageId =
      Array.isArray(messages) && messages[0] && typeof messages[0] === "object"
        ? String((messages[0] as { id?: string }).id ?? "")
        : "";
    const stored = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        senderType: "STAFF",
        content: body,
        messageType: "text",
        providerMessageId: providerMessageId || null,
        status: "SENT",
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: conversation.status === "CLOSED" ? "OPEN" : "WAITING_PATIENT",
        updatedAt: new Date(),
        lastStaffReadAt: new Date(),
      },
    });
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.message.send.session.success",
      entityType: "Message",
      entityId: stored.id,
      metadata: {},
    });
    return { id: stored.id, status: stored.status, providerMessageId: stored.providerMessageId };
  } catch (error) {
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.message.send.session.failure",
      entityType: "Conversation",
      entityId: conversation.id,
      metadata: {},
    });
    throw error instanceof IntegrationError
      ? error
      : new IntegrationError(
          "MESSAGE_SEND_FAILED",
          "WhatsApp could not send this message. The 24-hour session window may be closed — use an approved template.",
          500,
        );
  }
}

async function resolveConversation(
  ctx: TenantContext,
  input: { conversationId?: string; patientId?: string; leadId?: string },
  _integrationId: string,
) {
  if (input.conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: input.conversationId, clinicId: ctx.clinicId, channel: "WHATSAPP" },
    });
    if (!conversation) throw new IntegrationError("INVALID_RECIPIENT", "Conversation was not found.", 404);
    if (conversation.contactPhone) return conversation;
    if (conversation.patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: conversation.patientId, clinicId: ctx.clinicId },
      });
      const phone = normalizeWhatsAppPhone(patient?.whatsappNumber || patient?.phone || "");
      if (!phone) throw new IntegrationError("INVALID_RECIPIENT", "No WhatsApp number is associated with this conversation.", 422);
      return prisma.conversation.update({
        where: { id: conversation.id },
        data: { contactPhone: phone },
      });
    }
    return conversation;
  }
  if (input.patientId) {
    const patient = await prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: ctx.clinicId },
    });
    if (!patient) throw new IntegrationError("INVALID_RECIPIENT", "Patient was not found.", 404);
    const phone = normalizeWhatsAppPhone(patient.whatsappNumber || patient.phone || "");
    if (!phone) throw new IntegrationError("INVALID_RECIPIENT", "Patient has no WhatsApp number.", 422);
    const existing = await prisma.conversation.findFirst({
      where: { clinicId: ctx.clinicId, channel: "WHATSAPP", patientId: patient.id },
    });
    if (existing) return existing;
    return prisma.conversation.create({
      data: {
        clinicId: ctx.clinicId,
        patientId: patient.id,
        contactPhone: phone,
        unmatched: false,
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
  }
  if (input.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: ctx.organizationId, clinicId: ctx.clinicId },
    });
    if (!lead) throw new IntegrationError("INVALID_RECIPIENT", "Lead was not found.", 404);
    const phone = normalizeWhatsAppPhone(lead.phone || "");
    if (!phone) throw new IntegrationError("INVALID_RECIPIENT", "Lead has no WhatsApp number.", 422);
    const existing = await prisma.conversation.findFirst({
      where: { clinicId: ctx.clinicId, channel: "WHATSAPP", leadId: lead.id },
    });
    if (existing) return existing;
    return prisma.conversation.create({
      data: {
        clinicId: ctx.clinicId,
        leadId: lead.id,
        contactPhone: phone,
        unmatched: !lead.patientId,
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
  }
  throw new IntegrationError("INVALID_RECIPIENT", "A conversation or patient is required.", 422);
}

export const WhatsAppMessagingService = {
  sendTemplate: sendWhatsAppTemplate,
};
