import { Hono } from "hono";
import { prisma } from "@smrkomed/database";
import { z } from "zod";

import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { pageMeta, skipTake } from "./pagination";

const SENSITIVE = /password|token|secret|credential|authorization|cookie/i;

const listSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
  q: z.string().trim().max(200).optional(),
  organizationId: z.string().optional(),
  clinicId: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function redactMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const entries = Object.entries(metadata as Record<string, unknown>).filter(
    ([key]) => !SENSITIVE.test(key),
  );
  return Object.fromEntries(entries);
}

export const adminAuditRoutes = new Hono<AppEnv>().get(
  "/audit-logs",
  validate("query", listSchema),
  async (c) => {
    const query = c.req.valid("query");
    const where = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.clinicId ? { clinicId: query.clinicId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" as const } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.q
        ? {
            OR: [
              { action: { contains: query.q, mode: "insensitive" as const } },
              { entityType: { contains: query.q, mode: "insensitive" as const } },
              { entityId: { contains: query.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...skipTake(query.page, query.pageSize),
        include: {
          actor: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
        },
      }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      timestamp: row.createdAt,
      user: row.actor,
      organization: row.organization,
      clinic: row.clinic,
      action: row.action,
      resource: row.entityType,
      resourceId: row.entityId,
      metadata: redactMetadata(row.metadata),
    }));
    return ok(c, { items, ...pageMeta(query.page, query.pageSize, total) });
  },
);
