import type { Context } from "hono";
import type { PermissionKey, StaffRole, TenantContext } from "@smrkomed/database";
import {
  assertClinicAccess,
  assertOrganizationAccess,
  resolveAuthorizedClinic,
  roleHasPermission,
} from "@smrkomed/database";

import { forbidden } from "./errors";
import type { AppEnv } from "../types";

export function tenantOf(c: Context<AppEnv>): TenantContext {
  return c.get("tenant");
}

export function requirePermission(c: Context<AppEnv>, permission: PermissionKey) {
  return requireAnyPermission(c, [permission]);
}

export function requireAnyPermission(c: Context<AppEnv>, permissions: readonly PermissionKey[]) {
  const tenant = tenantOf(c);
  if (!permissions.some((permission) => roleHasPermission(tenant.role, permission))) {
    throw forbidden(`Missing permission: ${permissions.join(" or ")}`);
  }
  return tenant;
}

export function requireRole(c: Context<AppEnv>, roles: readonly StaffRole[]) {
  const tenant = tenantOf(c);
  if (!roles.includes(tenant.role)) {
    throw forbidden("Insufficient role for this action.");
  }
  return tenant;
}

export function requireOrganizationAccess(c: Context<AppEnv>, organizationId: string) {
  const tenant = tenantOf(c);
  assertOrganizationAccess(tenant, organizationId);
  return tenant;
}

export async function requireClinicAccess(c: Context<AppEnv>, clinicId: string) {
  const tenant = tenantOf(c);
  return assertClinicAccess(tenant, clinicId);
}

export { assertClinicAccess, assertOrganizationAccess, resolveAuthorizedClinic };
