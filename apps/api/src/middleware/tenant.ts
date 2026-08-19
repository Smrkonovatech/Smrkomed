import { createMiddleware } from "hono/factory";
import type { TenantContext } from "@smrkomed/database";

import { unauthenticated } from "../lib/errors";
import type { AppEnv } from "../types";

export const tenantMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const claims = c.get("claims");
  if (!claims) {
    throw unauthenticated("Session is missing tenant context. Sign in again.");
  }

  const tenant: TenantContext = {
    userId: claims.id,
    organizationId: claims.organizationId,
    organizationName: claims.organizationName,
    clinicId: claims.clinicId,
    clinicName: claims.clinicName,
    role: claims.role,
  };
  c.set("tenant", tenant);
  await next();
});
