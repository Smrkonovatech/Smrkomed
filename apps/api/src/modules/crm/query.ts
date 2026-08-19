import { prisma, organizationScope, type TenantContext } from "@smrkomed/database";
import type { LeadSource, LeadStage, LeadStatus, Prisma } from "@prisma/client";

import type { LeadSort } from "./constants";

export type LeadListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  stage?: LeadStage;
  status?: LeadStatus;
  source?: LeadSource;
  campaignId?: string;
  assignedUserId?: string;
  treatmentInterest?: string;
  createdFrom?: Date;
  createdTo?: Date;
  sort?: LeadSort;
};

export function leadWhere(ctx: TenantContext, query: LeadListQuery): Prisma.LeadWhereInput {
  const filters: Prisma.LeadWhereInput[] = [organizationScope(ctx)];
  if (ctx.role !== "ORGANIZATION_ADMIN") {
    filters.push({ clinicId: ctx.clinicId });
  }
  if (query.stage) filters.push({ stage: query.stage });
  if (query.status) filters.push({ status: query.status });
  if (query.source) filters.push({ source: query.source });
  if (query.campaignId) filters.push({ campaignId: query.campaignId });
  if (query.assignedUserId) filters.push({ assignedToId: query.assignedUserId });
  if (query.treatmentInterest) {
    filters.push({ treatmentInterest: { contains: query.treatmentInterest, mode: "insensitive" } });
  }
  if (query.createdFrom || query.createdTo) {
    filters.push({
      createdAt: {
        ...(query.createdFrom ? { gte: query.createdFrom } : {}),
        ...(query.createdTo ? { lte: query.createdTo } : {}),
      },
    });
  }
  if (query.search) {
    const q = query.search.trim();
    filters.push({
      OR: [
        { id: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q.replace(/\D/g, "").slice(-10) || q } },
        { email: { contains: q, mode: "insensitive" } },
        { campaign: { contains: q, mode: "insensitive" } },
        { campaignRecord: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: filters };
}

export function leadOrderBy(sort: LeadSort | undefined): Prisma.LeadOrderByWithRelationInput {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "lastActivity") return { lastActivityAt: "desc" };
  if (sort === "nextFollowUp") return { nextFollowUpAt: "asc" };
  if (sort === "priority") return { score: "desc" };
  return { createdAt: "desc" };
}

export const leadInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
  campaignRecord: { select: { id: true, name: true, source: true, status: true } },
} as const;

export async function listLeads(ctx: TenantContext, query: LeadListQuery) {
  const where = leadWhere(ctx, query);
  const [total, items] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: leadOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { total, items };
}
