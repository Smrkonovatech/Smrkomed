import { Hono } from "hono";
import { prisma } from "@smrkomed/database";
import { z } from "zod";

import { ok } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { pageMeta, skipTake } from "./pagination";

const listSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
  q: z.string().trim().max(200).optional(),
});

export const adminSubscriptionRoutes = new Hono<AppEnv>().get(
  "/subscriptions",
  validate("query", listSchema),
  async (c) => {
    const query = c.req.valid("query");
    const where = {
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.q
        ? { organization: { name: { contains: query.q, mode: "insensitive" as const } } }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...skipTake(query.page, query.pageSize),
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              status: true,
              _count: { select: { clinics: true } },
            },
          },
        },
      }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      organization: row.organization,
      plan: row.plan,
      status: row.status,
      startDate: row.createdAt,
      renewalDate: row.currentPeriodEnd,
      trialEndsAt: row.trialEndsAt,
      usage: { clinics: row.organization._count.clinics },
    }));
    return ok(c, { items, ...pageMeta(query.page, query.pageSize, total) });
  },
);
