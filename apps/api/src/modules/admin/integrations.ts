import { Hono } from "hono";
import { prisma, writeAuditLog, type IntegrationProvider, type IntegrationStatus } from "@smrkomed/database";
import { z } from "zod";

import { parseProviderId } from "../../integrations/core/registry";
import { parseConnectionStatusFilter } from "../../integrations/core/status";
import { tenantOf } from "../../lib/authz";
import { HttpError, notFound } from "../../lib/errors";
import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { SAFE_INTEGRATION_SELECT, maskAccount, toConnectionStatus } from "./integrations-shared";
import { pageMeta, skipTake } from "./pagination";
import { summarizeIntegrationHealth } from "../../integrations/services/health-service";
import { getAdminWhatsAppDetail, listAdminWhatsApp, listAdminWhatsAppErrors } from "./whatsapp";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
  q: z.string().trim().max(200).optional(),
  provider: z.string().optional(),
  status: z.string().optional(),
  organizationId: z.string().optional(),
  clinicId: z.string().optional(),
});

const idParam = z.object({ id: z.string().min(1) });

function publicIntegration<
  T extends {
    status: IntegrationStatus;
    externalAccountId: string | null;
  },
>(row: T) {
  const { externalAccountId, ...rest } = row;
  return {
    ...rest,
    connectionStatus: toConnectionStatus(row.status),
    externalAccount: maskAccount(externalAccountId),
  };
}

export const adminIntegrationRoutes = new Hono<AppEnv>()
  .get("/integrations/whatsapp", async (c) => {
    return ok(c, await listAdminWhatsApp());
  })
  .get("/integrations/whatsapp/errors", async (c) => {
    return ok(c, { items: await listAdminWhatsAppErrors() });
  })
  .get("/integrations/whatsapp/:id", validate("param", idParam), async (c) => {
    const row = await getAdminWhatsAppDetail(c.req.valid("param").id);
    if (!row) throw notFound("WhatsApp integration not found.");
    return ok(c, row);
  })
  .get("/integrations/meta", async (c) => {
    const integrations = await prisma.integration.findMany({
      where: { provider: "META_ADS" },
      select: {
        ...SAFE_INTEGRATION_SELECT,
        clinic: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
      },
    });
    return ok(c, {
      connections: integrations.map((row) => ({
        ...publicIntegration(row),
        organization: row.clinic.organization,
        clinic: { id: row.clinic.id, name: row.clinic.name },
        campaignCount: 0,
        leadSyncStatus: "NOT_IMPLEMENTED",
      })),
      note: "Meta OAuth, Marketing API, campaigns, and lead sync are not implemented yet.",
    });
  })
  .get("/integrations/google", async (c) => {
    const integrations = await prisma.integration.findMany({
      where: { provider: "GOOGLE_ADS" },
      select: {
        ...SAFE_INTEGRATION_SELECT,
        clinic: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
      },
    });
    return ok(c, {
      connections: integrations.map((row) => ({
        ...publicIntegration(row),
        organization: row.clinic.organization,
        clinic: { id: row.clinic.id, name: row.clinic.name },
        campaignCount: 0,
        leadSyncStatus: "NOT_IMPLEMENTED",
      })),
      note: "Google OAuth and Google Ads API are not implemented yet.",
    });
  })
  .get("/integrations/health", async (c) => {
    const query = c.req.query();
    const provider = query["provider"] ? parseProviderId(query["provider"]) : undefined;
    return ok(
      c,
      await summarizeIntegrationHealth({
        ...(query["organizationId"] ? { organizationId: query["organizationId"] } : {}),
        ...(query["clinicId"] ? { clinicId: query["clinicId"] } : {}),
        ...(provider ? { provider } : {}),
      }),
    );
  })
  .get("/integrations", validate("query", listSchema), async (c) => {
    const query = c.req.valid("query");
    const status = parseConnectionStatusFilter(query.status);
    const provider = query.provider ? (query.provider as IntegrationProvider) : undefined;
    const where = {
      ...(status === undefined ? {} : { status }),
      ...(provider ? { provider } : {}),
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.q
        ? {
            OR: [
              { displayName: { contains: query.q, mode: "insensitive" as const } },
              { clinic: { name: { contains: query.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.integration.count({ where }),
      prisma.integration.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        ...skipTake(query.page, query.pageSize),
        select: {
          ...SAFE_INTEGRATION_SELECT,
          clinic: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
        },
      }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      status: row.status,
      connectionStatus: toConnectionStatus(row.status),
      displayName: row.displayName,
      lastSyncAt: row.lastSyncAt,
      lastError: row.lastError,
      lastErrorCode: row.lastErrorCode,
      createdAt: row.createdAt,
      organizationId: row.organizationId,
      clinicId: row.clinicId,
      organization: row.clinic.organization,
      clinic: { id: row.clinic.id, name: row.clinic.name },
      externalAccount: maskAccount(row.externalAccountId),
    }));
    return ok(c, { items, ...pageMeta(query.page, query.pageSize, total) });
  })
  .get("/integrations/:id", validate("param", idParam), async (c) => {
    const { id } = c.req.valid("param");
    const row = await prisma.integration.findUnique({
      where: { id },
      select: {
        ...SAFE_INTEGRATION_SELECT,
        clinic: { select: { id: true, name: true, organization: { select: { id: true, name: true } } } },
      },
    });
    if (!row) throw notFound("Integration not found.");
    return ok(c, {
      ...publicIntegration(row),
      organization: row.clinic.organization,
      clinic: { id: row.clinic.id, name: row.clinic.name },
      lastWebhook: null,
    });
  })
  .post("/integrations/:id/disconnect", validate("param", idParam), async (c) => {
    const tenant = tenantOf(c);
    const { id } = c.req.valid("param");
    const row = await prisma.integration.findUnique({
      where: { id },
      select: { id: true, provider: true, status: true, clinicId: true },
    });
    if (!row) throw notFound("Integration not found.");
    await writeAuditLog({
      actorId: tenant.userId,
      clinicId: row.clinicId,
      action: "admin.integration.disconnect.attempt",
      entityType: "Integration",
      entityId: id,
      metadata: { provider: row.provider },
    });
    throw new HttpError(
      501,
      "PROVIDER_DISCONNECT_NOT_IMPLEMENTED",
      "External provider disconnect is not implemented yet. The local connection was not changed.",
    );
  });
