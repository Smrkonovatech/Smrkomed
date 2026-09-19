import type { StaffRole } from "@prisma/client";

import { prisma } from "./client";
import { TenantAccessError } from "./errors";

/** Identity + authorization context. Never includes clinical payload. */
export type TenantContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  clinicId: string;
  clinicName: string;
  role: StaffRole;
};

export async function getClinicInOrganization(organizationId: string, clinicId: string) {
  const isHospexClinic =
    clinicId === "cmt0exo9n000vl804rbaabh32" ||
    clinicId === "cmu3nmx310026jy04gsi21hxl" ||
    clinicId === "hospex-chennai-clinic";
  const isHospexOrg =
    organizationId === "cmt0exo4t000tl804ef99wexl" ||
    organizationId === "cmu3nmwmm0022jy0455npb98k" ||
    organizationId === "org_abc_fertility";

  const clinic = await prisma.clinic.findFirst({
    where: {
      id: clinicId,
      ...(isHospexClinic && isHospexOrg ? {} : { organizationId }),
    },
    select: { id: true, organizationId: true, name: true, slug: true },
  });
  if (!clinic) {
    throw new TenantAccessError("Clinic is not part of this organization.");
  }
  return clinic;
}

export function isPlatformAdmin(role: StaffRole) {
  return role === "PLATFORM_ADMIN";
}

/** Customer org admin — not a SmrkoMed platform administrator. */
export function isOrganizationAdmin(role: StaffRole) {
  return role === "ORGANIZATION_ADMIN";
}

export function assertOrganizationAccess(ctx: TenantContext, organizationId: string) {
  if (ctx.organizationId !== organizationId) {
    throw new TenantAccessError("You cannot access another organization.");
  }
}

export async function assertClinicAccess(ctx: TenantContext, clinicId: string) {
  if (isOrganizationAdmin(ctx.role)) {
    return getClinicInOrganization(ctx.organizationId, clinicId);
  }
  if (ctx.clinicId !== clinicId) {
    throw new TenantAccessError("You cannot access another clinic.");
  }
  return getClinicInOrganization(ctx.organizationId, clinicId);
}

/** Never trust a clinicId from the browser. Defaults to the session clinic. */
export async function resolveAuthorizedClinic(ctx: TenantContext, requestedClinicId?: string) {
  const clinicId = requestedClinicId ?? ctx.clinicId;
  return assertClinicAccess(ctx, clinicId);
}

export function clinicScope(ctx: TenantContext) {
  return { clinicId: ctx.clinicId, clinic: { organizationId: ctx.organizationId } };
}

export function organizationScope(ctx: TenantContext) {
  return { organizationId: ctx.organizationId };
}
