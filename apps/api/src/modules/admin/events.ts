import { Hono } from "hono";
import { prisma, type IntegrationEventStatus, type IntegrationProvider } from "@smrkomed/database";
import { z } from "zod";

import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { pageMeta, skipTake } from "./pagination";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
  provider: z.string().optional(),
  status: z.enum(["RECEIVED", "PROCESSING", "PROCESSED", "FAILED", "IGNORED"]).optional(),
  organizationId: z.string().optional(),
  clinicId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const adminIntegrationEventRoutes = new Hono<AppEnv>().get(
  "/integration-events",
  validate("query", listSchema),
  async (c) => {
    const query = c.req.valid("query");
    const receivedAt =
      query.from || query.to
        ? {
            receivedAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {};
    const where = {
      ...(query.provider ? { provider: query.provider as IntegrationProvider } : {}),
      ...(query.status ? { status: query.status as IntegrationEventStatus } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...receivedAt,
    };
    const [total, rows] = await Promise.all([
      prisma.integrationEvent.count({ where }),
      prisma.integrationEvent.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        ...skipTake(query.page, query.pageSize),
        select: {
          id: true,
          provider: true,
          eventType: true,
          status: true,
          receivedAt: true,
          processedAt: true,
          error: true,
          organizationId: true,
          clinicId: true,
          integrationId: true,
          organization: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
        },
      }),
    ]);
    return ok(c, { items: rows, ...pageMeta(query.page, query.pageSize, total) });
  },
);
