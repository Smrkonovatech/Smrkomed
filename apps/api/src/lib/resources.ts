import { assertClinicAccess, assertOrganizationAccess, type TenantContext } from "@smrkomed/database";

import { notFound } from "./errors";

export async function requireClinicOwned<T extends { clinicId: string }>(ctx: TenantContext, record: T | null) {
  if (!record) throw notFound();
  await assertClinicAccess(ctx, record.clinicId);
  return record;
}

export function requireOrgOwned<T extends { organizationId: string }>(ctx: TenantContext, record: T | null) {
  if (!record) throw notFound();
  assertOrganizationAccess(ctx, record.organizationId);
  return record;
}
