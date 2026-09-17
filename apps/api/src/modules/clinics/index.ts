import { Hono } from "hono";
import { prisma } from "@smrkomed/database";
import { z } from "zod";

import { requireClinicAccess, tenantOf } from "../../lib/authz";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

const clinicSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  timezone: true,
  organizationId: true,
  branches: {
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      phone: true,
      hours: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

const updateClinicSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  city: z.string().max(80).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  website: z.string().max(120).optional().nullable().or(z.literal("")),
  timezone: z.string().max(60).optional(),
  hours: z.string().max(120).optional().nullable(),
});

const clinicIdParamSchema = z.object({
  id: z.string().min(1),
});

type UpdateClinicInput = z.infer<typeof updateClinicSchema>;

export const clinicRoutes = new Hono<AppEnv>()
  .get("/current", async (c) => {
    const tenant = tenantOf(c);
    await requireClinicAccess(c, tenant.clinicId);
    const clinic = await prisma.clinic.findFirst({
      where: { id: tenant.clinicId, organizationId: tenant.organizationId },
      select: clinicSelect,
    });
    return ok(c, clinic);
  })
  .patch("/current", validate("json", updateClinicSchema), async (c) => {
    const tenant = tenantOf(c);
    await requireClinicAccess(c, tenant.clinicId);
    const body = c.req.valid("json") as UpdateClinicInput;

    const data: Record<string, unknown> = {};
    if (body["name"] !== undefined) data["name"] = body["name"].trim();
    if (body["city"] !== undefined) data["city"] = body["city"]?.trim() || null;
    if (body["address"] !== undefined) data["address"] = body["address"]?.trim() || null;
    if (body["phone"] !== undefined) data["phone"] = body["phone"]?.trim() || null;
    if (body["email"] !== undefined) data["email"] = body["email"]?.trim() || null;
    if (body["website"] !== undefined) data["website"] = body["website"]?.trim() || null;
    if (body["timezone"] !== undefined) data["timezone"] = body["timezone"].trim();

    const updated = await prisma.clinic.update({
      where: { id: tenant.clinicId },
      data,
      select: clinicSelect,
    });

    if (body["hours"] !== undefined) {
      const primaryBranch = await prisma.clinicBranch.findFirst({
        where: { clinicId: tenant.clinicId },
        orderBy: { createdAt: "asc" },
      });
      if (primaryBranch) {
        await prisma.clinicBranch.update({
          where: { id: primaryBranch.id },
          data: { hours: body["hours"]?.trim() || null },
        });
      }
    }

    return ok(c, updated);
  })
  .patch("/:id", validate("param", clinicIdParamSchema), validate("json", updateClinicSchema), async (c) => {
    const tenant = tenantOf(c);
    const { id } = c.req.valid("param");
    await requireClinicAccess(c, id);
    const body = c.req.valid("json") as UpdateClinicInput;

    const data: Record<string, unknown> = {};
    if (body["name"] !== undefined) data["name"] = body["name"].trim();
    if (body["city"] !== undefined) data["city"] = body["city"]?.trim() || null;
    if (body["address"] !== undefined) data["address"] = body["address"]?.trim() || null;
    if (body["phone"] !== undefined) data["phone"] = body["phone"]?.trim() || null;
    if (body["email"] !== undefined) data["email"] = body["email"]?.trim() || null;
    if (body["website"] !== undefined) data["website"] = body["website"]?.trim() || null;
    if (body["timezone"] !== undefined) data["timezone"] = body["timezone"].trim();

    const updated = await prisma.clinic.update({
      where: { id },
      data,
      select: clinicSelect,
    });

    if (body["hours"] !== undefined) {
      const primaryBranch = await prisma.clinicBranch.findFirst({
        where: { clinicId: id },
        orderBy: { createdAt: "asc" },
      });
      if (primaryBranch) {
        await prisma.clinicBranch.update({
          where: { id: primaryBranch.id },
          data: { hours: body["hours"]?.trim() || null },
        });
      }
    }

    return ok(c, updated);
  })
  .get("/", async (c) => {
    const tenant = tenantOf(c);
    if (tenant.role === "ORGANIZATION_ADMIN" || tenant.role === "PLATFORM_ADMIN") {
      const clinics = await prisma.clinic.findMany({
        where: { organizationId: tenant.organizationId },
        select: clinicSelect,
        orderBy: { name: "asc" },
      });
      return ok(c, clinics);
    }
    await requireClinicAccess(c, tenant.clinicId);
    const clinic = await prisma.clinic.findFirst({
      where: { id: tenant.clinicId, organizationId: tenant.organizationId },
      select: clinicSelect,
    });
    return ok(c, clinic ? [clinic] : []);
  });

