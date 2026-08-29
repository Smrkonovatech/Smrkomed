import { Hono } from "hono";
import { PERMISSIONS } from "@smrkomed/database";
import { z } from "zod";

import { getWhatsAppAnalytics, getWhatsAppClinicStatus, getWhatsAppConversation, listWhatsAppConversations } from "../../integrations/providers/whatsapp/clinic";
import { sendWhatsAppTemplate } from "../../integrations/providers/whatsapp/messaging";
import { completeWhatsAppConnect, startWhatsAppConnect } from "../../integrations/providers/whatsapp/onboarding";
import { listWhatsAppTemplates, syncWhatsAppTemplates } from "../../integrations/providers/whatsapp/sync";
import { integrationService } from "../../integrations/services/integration-service";
import { requireAnyPermission, requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

const callbackSchema = z.object({
  state: z.string().min(1).max(128),
  code: z.string().min(1).max(4000).optional(),
  wabaId: z.string().min(1).max(128).optional(),
  phoneNumberId: z.string().min(1).max(128).optional(),
});

const sendSchema = z.object({
  conversationId: z.string().min(1).max(64).optional(),
  patientId: z.string().min(1).max(64).optional(),
  templateId: z.string().min(1).max(64),
  parameters: z.array(z.string().max(256)).max(10).default([]),
});

const conversationParam = z.object({ id: z.string().min(1) });

export const whatsappClinicRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    return ok(c, await getWhatsAppClinicStatus(tenant));
  })
  .get("/status", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    return ok(c, await getWhatsAppClinicStatus(tenant));
  })
  .post("/connect", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    return ok(c, await startWhatsAppConnect(tenant));
  })
  .post("/callback", validate("json", callbackSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    const body = c.req.valid("json");
    return ok(
      c,
      await completeWhatsAppConnect(tenant, {
        state: body.state,
        ...(body.code ? { code: body.code } : {}),
        ...(body.wabaId ? { wabaId: body.wabaId } : {}),
        ...(body.phoneNumberId ? { phoneNumberId: body.phoneNumberId } : {}),
      }),
    );
  })
  .post("/disconnect", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    const result = await integrationService.disconnectConnection(tenant, "WHATSAPP_CLOUD");
    return ok(c, {
      ...result,
      disconnectScope:
        "SmrkoMed unsubscribed from this WhatsApp Business Account. The clinic still owns the WABA and phone number in Meta. Historical conversations were not deleted.",
    });
  })
  .post("/sync", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    return ok(c, await syncWhatsAppTemplates(tenant));
  })
  .get("/templates", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    return ok(c, await listWhatsAppTemplates(tenant));
  })
  .post("/messages/template", validate("json", sendSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_WRITE);
    const body = c.req.valid("json");
    return ok(
      c,
      await sendWhatsAppTemplate(tenant, {
        templateId: body.templateId,
        parameters: body.parameters,
        ...(body.conversationId ? { conversationId: body.conversationId } : {}),
        ...(body.patientId ? { patientId: body.patientId } : {}),
      }),
      201,
    );
  })
  .get("/conversations", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    return ok(c, await listWhatsAppConversations(tenant));
  })
  .get("/conversations/:id", validate("param", conversationParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    return ok(c, await getWhatsAppConversation(tenant, c.req.valid("param").id));
  })
  .get("/analytics", async (c) => {
    // Overview KPIs for Automation Center — clinic-scoped; not admin-only.
    const tenant = requireAnyPermission(c, [PERMISSIONS.PATIENTS_READ, PERMISSIONS.SETTINGS_MANAGE]);
    return ok(c, await getWhatsAppAnalytics(tenant));
  });
