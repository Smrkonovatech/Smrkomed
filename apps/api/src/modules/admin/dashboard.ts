import { Hono } from "hono";
import { prisma, writeAuditLog } from "@smrkomed/database";

import { tenantOf } from "../../lib/authz";
import { ok } from "../../lib/http";
import type { AppEnv } from "../../types";

export const adminDashboardRoutes = new Hono<AppEnv>().get("/dashboard", async (c) => {
  const tenant = tenantOf(c);
  const [
    organizations,
    clinics,
    activeUsers,
    activeSubscriptions,
    whatsappConnected,
    metaConnected,
    googleConnected,
    leadCount,
    campaignCount,
    recentOrganizations,
    recentIntegrationErrors,
    recentEvents,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.clinic.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.integration.count({ where: { provider: "WHATSAPP_CLOUD", status: "ACTIVE" } }),
    prisma.integration.count({ where: { provider: "META_ADS", status: "ACTIVE" } }),
    prisma.integration.count({ where: { provider: "GOOGLE_ADS", status: "ACTIVE" } }),
    prisma.lead.count(),
    prisma.campaign.count(),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, slug: true, status: true, createdAt: true },
    }),
    prisma.integration.findMany({
      where: { OR: [{ status: "ERROR" }, { lastError: { not: null } }] },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        provider: true,
        status: true,
        lastError: true,
        lastSyncAt: true,
        clinic: { select: { name: true, organization: { select: { name: true } } } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        organizationId: true,
        clinicId: true,
        actorId: true,
      },
    }),
  ]);

  await writeAuditLog({
    actorId: tenant.userId,
    action: "admin.dashboard.view",
    entityType: "Platform",
  });

  return ok(c, {
    totals: {
      organizations,
      clinics,
      activeUsers,
      activeSubscriptions,
      whatsappConnected,
      metaConnected,
      googleConnected,
      leadCount,
      campaignCount,
    },
    recentSignups: recentOrganizations,
    recentIntegrationErrors,
    recentEvents,
  });
});
