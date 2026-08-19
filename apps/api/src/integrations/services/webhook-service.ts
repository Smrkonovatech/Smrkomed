import { Prisma } from "@prisma/client";
import { prisma } from "@smrkomed/database";

import { IntegrationError } from "../core/errors";
import { getProvider } from "../core/registry";
import { SAFE_INTEGRATION_SELECT } from "../core/serializer";
import type { FrameworkProviderId, NormalizedWebhookEvent } from "../core/types";
import { encryptString } from "../credentials/encryption";

const PAYLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function sanitizeEventMetadata(event: NormalizedWebhookEvent) {
  return {
    eventType: event.eventType,
    externalAccountId: event.externalAccountId,
  };
}

async function resolveIntegration(provider: FrameworkProviderId, event: NormalizedWebhookEvent) {
  if (!event.externalAccountId) return null;
  return prisma.integration.findFirst({
    where: { provider, externalAccountId: event.externalAccountId },
    select: SAFE_INTEGRATION_SELECT,
  });
}

export async function receiveWebhook(input: {
  providerSlug: string;
  headers: Headers;
  rawBody: string;
}) {
  const adapter = getProvider(input.providerSlug);
  const provider = adapter.id as FrameworkProviderId;

  await adapter.verifyWebhook(input.headers, input.rawBody);
  const event = adapter.parseWebhook(input.rawBody);
  if (!event.externalEventId) {
    throw new IntegrationError("MISSING_EVENT_ID", "Webhook event id is required.", 400);
  }

  const integration = await resolveIntegration(provider, event);
  if (!integration) {
    throw new IntegrationError("UNKNOWN_INTEGRATION", "No integration matches this webhook.", 404);
  }

  const existing = await prisma.integrationEvent.findUnique({
    where: { provider_externalEventId: { provider, externalEventId: event.externalEventId } },
    select: {
      id: true,
      status: true,
      eventType: true,
      receivedAt: true,
      processedAt: true,
      error: true,
      integrationId: true,
      organizationId: true,
      clinicId: true,
      provider: true,
      externalEventId: true,
    },
  });
  if (existing) {
    return { duplicate: true as const, event: existing };
  }

  try {
    const stored = await prisma.integrationEvent.create({
      data: {
        integrationId: integration.id,
        organizationId: integration.organizationId,
        clinicId: integration.clinicId,
        provider,
        externalEventId: event.externalEventId,
        eventType: event.eventType,
        status: "RECEIVED",
        metadata: sanitizeEventMetadata(event),
        encryptedPayload: encryptString(input.rawBody),
        payloadExpiresAt: new Date(Date.now() + PAYLOAD_RETENTION_MS),
      },
      select: {
        id: true,
        status: true,
        eventType: true,
        receivedAt: true,
        processedAt: true,
        error: true,
        integrationId: true,
        organizationId: true,
        clinicId: true,
        provider: true,
        externalEventId: true,
      },
    });
    return { duplicate: false as const, event: stored };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const dup = await prisma.integrationEvent.findUnique({
        where: { provider_externalEventId: { provider, externalEventId: event.externalEventId } },
        select: {
          id: true,
          status: true,
          eventType: true,
          receivedAt: true,
          processedAt: true,
          error: true,
          integrationId: true,
          organizationId: true,
          clinicId: true,
          provider: true,
          externalEventId: true,
        },
      });
      if (dup) return { duplicate: true as const, event: dup };
    }
    throw error;
  }
}

export const webhookService = {
  receive: receiveWebhook,
  payloadRetentionDays: 7,
};
