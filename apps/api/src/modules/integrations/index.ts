import { Hono } from "hono";
import { PERMISSIONS } from "@smrkomed/database";
import { z } from "zod";

import { parseProviderId } from "../../integrations/core/registry";
import { stubOAuth } from "../../integrations/core/oauth";
import { integrationService } from "../../integrations/services/integration-service";
import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { whatsappClinicRoutes } from "./whatsapp";

const providerParam = z.object({
  provider: z.string().min(1),
});

export const integrationRoutes = new Hono<AppEnv>()
  .route("/whatsapp", whatsappClinicRoutes)
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    return ok(c, await integrationService.listConnections(tenant));
  })
  .get("/:provider/status", validate("param", providerParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    const provider = parseProviderId(c.req.valid("param").provider);
    return ok(c, await integrationService.getStatus(tenant, provider));
  })
  .post("/:provider/connect", validate("param", providerParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    const provider = parseProviderId(c.req.valid("param").provider);
    return ok(c, await integrationService.createConnection(tenant, provider));
  })
  .post("/:provider/disconnect", validate("param", providerParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    const provider = parseProviderId(c.req.valid("param").provider);
    return ok(c, await integrationService.disconnectConnection(tenant, provider));
  })
  .get("/:provider/oauth/start", validate("param", providerParam), async (c) => {
    requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    const provider = parseProviderId(c.req.valid("param").provider);
    await stubOAuth(provider).getAuthorizationUrl({
      clinicId: c.get("tenant").clinicId,
      organizationId: c.get("tenant").organizationId,
      redirectUri: `${c.req.url.replace(/\/oauth\/start$/, "/oauth/callback")}`,
      state: "unused",
    });
    return ok(c, { provider });
  })
  .get("/:provider", validate("param", providerParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.SETTINGS_MANAGE);
    const provider = parseProviderId(c.req.valid("param").provider);
    return ok(c, await integrationService.getConnection(tenant, provider));
  });
