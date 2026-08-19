import { Hono } from "hono";
import { z } from "zod";

import { stubOAuth } from "../../integrations/core/oauth";
import { getProvider, parseProviderId, parseWebhookProvider } from "../../integrations/core/registry";
import { whatsappProvider } from "../../integrations/providers/whatsapp/provider";
import { receiveWhatsAppWebhook, verifyWhatsAppChallenge } from "../../integrations/providers/whatsapp/webhook";
import { webhookService } from "../../integrations/services/webhook-service";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

const providerParam = z.object({ provider: z.string().min(1) });

export const publicIntegrationRoutes = new Hono<AppEnv>()
  .get("/integrations/:provider/oauth/callback", validate("param", providerParam), async (c) => {
    const provider = parseProviderId(c.req.valid("param").provider);
    await stubOAuth(provider).handleCallback({
      code: c.req.query("code") ?? "",
      state: c.req.query("state") ?? "",
    });
    return ok(c, { provider });
  })
  .get("/webhooks/whatsapp", async (c) => {
    const challenge = verifyWhatsAppChallenge({
      "hub.mode": c.req.query("hub.mode"),
      "hub.verify_token": c.req.query("hub.verify_token"),
      "hub.challenge": c.req.query("hub.challenge"),
    });
    return c.text(challenge, 200);
  })
  .post("/webhooks/:provider", validate("param", providerParam), async (c) => {
    parseWebhookProvider(c.req.valid("param").provider);
    const rawBody = await c.req.text();
    const adapter = getProvider(c.req.valid("param").provider);
    if (adapter === whatsappProvider) {
      const result = await receiveWhatsAppWebhook(c.req.raw.headers, rawBody);
      return ok(c, result);
    }
    const result = await webhookService.receive({
      providerSlug: c.req.valid("param").provider,
      headers: c.req.raw.headers,
      rawBody,
    });
    return ok(c, {
      received: true,
      duplicate: result.duplicate,
      event: {
        id: result.event.id,
        provider: result.event.provider,
        eventType: result.event.eventType,
        status: result.event.status,
        integrationId: result.event.integrationId,
        organizationId: result.event.organizationId,
        clinicId: result.event.clinicId,
        receivedAt: result.event.receivedAt,
      },
    });
  });
