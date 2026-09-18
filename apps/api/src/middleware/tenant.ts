import { createMiddleware } from "hono/factory";
import { prisma, type TenantContext } from "@smrkomed/database";

import { unauthenticated } from "../lib/errors";
import type { AppEnv } from "../types";

export const tenantMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const claims = c.get("claims");
  if (!claims) {
    throw unauthenticated("Session is missing tenant context. Sign in again.");
  }

  let clinicId = claims.clinicId;
  let clinicName = claims.clinicName;
  let organizationId = claims.organizationId;
  let organizationName = claims.organizationName;

  const requestedClinic = c.req.header("x-clinic-id") || c.req.query("clinicId");
  if (requestedClinic) {
    const targetId =
      requestedClinic === "blr" || requestedClinic === "cmt0exo9n000vl804rbaabh32"
        ? "cmt0exo9n000vl804rbaabh32"
        : requestedClinic === "kochi" || requestedClinic === "cmu3nmx310026jy04gsi21hxl"
          ? "cmu3nmx310026jy04gsi21hxl"
          : requestedClinic;

    if (targetId && targetId !== clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          name: true,
          organizationId: true,
          organization: { select: { id: true, name: true } },
        },
      });
      if (clinic) {
        clinicId = clinic.id;
        clinicName = clinic.name;
        if (clinic.organizationId) {
          organizationId = clinic.organizationId;
        }
        if (clinic.organization?.name) {
          organizationName = clinic.organization.name;
        }
      }
    }
  }

  const tenant: TenantContext = {
    userId: claims.id,
    organizationId,
    organizationName,
    clinicId,
    clinicName,
    role: claims.role,
  };
  c.set("tenant", tenant);
  await next();
});
