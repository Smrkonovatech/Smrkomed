import { createMiddleware } from "hono/factory";
import { isPlatformAdmin } from "@smrkomed/database";

import { forbidden } from "../../lib/errors";
import type { AppEnv } from "../../types";

export const requirePlatformAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const tenant = c.get("tenant");
  if (!tenant || !isPlatformAdmin(tenant.role)) {
    throw forbidden("Platform administrator access is required.");
  }
  await next();
});
