import type { Lead, LeadActivity, User } from "@prisma/client";

import {
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
  LEAD_STATUS_LABELS,
  scoreBand,
  type LEAD_STATUSES,
} from "./constants";
import { maskPhone } from "./sanitize";

type Assigned = Pick<User, "id" | "name" | "email"> | null;
type CampaignRef = { id: string; name: string; source: string; status: string } | null;

function lifecycleLabel(status: string) {
  return LEAD_STATUS_LABELS[status as (typeof LEAD_STATUSES)[number]] ?? status;
}

export function serializeLead(
  lead: Lead & { assignedTo?: Assigned; campaignRecord?: CampaignRef },
  options?: { maskPhone?: boolean },
) {
  return {
    id: lead.id,
    organizationId: lead.organizationId,
    clinicId: lead.clinicId,
    name: lead.name,
    phone: options?.maskPhone ? maskPhone(lead.phone) : lead.phone,
    email: lead.email,
    preferredLanguage: lead.preferredLanguage,
    location: lead.location,
    source: lead.source,
    sourceLabel: LEAD_SOURCE_LABELS[lead.source],
    sourceDetail: lead.sourceDetail,
    campaign: lead.campaignRecord?.name ?? lead.campaign,
    campaignId: lead.campaignId,
    medium: lead.medium,
    externalLeadId: lead.externalLeadId,
    landingPage: lead.landingPage,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    utmTerm: lead.utmTerm,
    utmContent: lead.utmContent,
    treatmentInterest: lead.treatmentInterest,
    assignedToId: lead.assignedToId,
    assignedTo: lead.assignedTo
      ? { id: lead.assignedTo.id, name: lead.assignedTo.name, email: lead.assignedTo.email }
      : null,
    status: lead.status,
    statusLabel: lifecycleLabel(lead.status),
    stage: lead.stage,
    stageLabel: LEAD_STAGE_LABELS[lead.stage],
    score: lead.score,
    scoreBand: scoreBand(lead.score),
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    lastActivityAt: lead.lastActivityAt?.toISOString() ?? null,
    lostReason: lead.lostReason,
    convertedAt: lead.convertedAt?.toISOString() ?? null,
    patientId: lead.patientId,
    coupleId: lead.coupleId,
    conversationId: lead.conversationId,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export function serializeLeadActivity(row: LeadActivity & { user?: Assigned }) {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.type,
    description: row.description,
    metadata: row.metadata,
    user: row.user ? { id: row.user.id, name: row.user.name } : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeCampaign(row: {
  id: string;
  organizationId: string;
  clinicId: string | null;
  name: string;
  source: string;
  medium: string | null;
  campaignExternalId: string | null;
  treatmentFocus: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { leads: number };
}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clinicId: row.clinicId,
    name: row.name,
    source: row.source,
    sourceLabel: LEAD_SOURCE_LABELS[row.source as keyof typeof LEAD_SOURCE_LABELS] ?? row.source,
    medium: row.medium,
    campaignExternalId: row.campaignExternalId,
    treatmentFocus: row.treatmentFocus,
    status: row.status,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    leadCount: row._count?.leads ?? undefined,
  };
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / Math.max(pageSize, 1))),
  };
}
