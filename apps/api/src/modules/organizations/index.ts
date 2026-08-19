import { Hono } from "hono";
import { prisma } from "@smrkomed/database";

import { tenantOf } from "../../lib/authz";
import { ok } from "../../lib/http";
import type { AppEnv } from "../../types";

export const organizationRoutes = new Hono<AppEnv>().get("/current", async (c) => {
  const tenant = tenantOf(c);
  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    select: { id: true, name: true, slug: true },
  });
  return ok(c, organization);
});
