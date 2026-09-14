import {
  TenantAccessError,
  assertClinicAccess,
  assertOrganizationAccess,
  roleHasPermission,
  type PermissionKey,
  type StaffRole,
  type TenantContext,
} from "@smrkomed/database";

import { auth } from "@/lib/auth/auth";
import { forbidden, unauthorized } from "@/lib/api/response";

export type { TenantContext };

export async function getCurrentUser(): Promise<TenantContext | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.organizationId || !user.clinicId || !user.role) {
    return null;
  }
  return {
    userId: user.id,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    clinicId: user.clinicId,
    clinicName: user.clinicName,
    role: user.role,
  };
}

export async function requireUser(): Promise<TenantContext> {
  const user = await getCurrentUser();
  if (!user) {
    throw new TenantAccessError("Unauthorized");
  }
  return user;
}

export async function getCurrentOrganization() {
  const user = await requireUser();
  return { id: user.organizationId, name: user.organizationName };
}

export async function getCurrentClinic() {
  const user = await requireUser();
  return { id: user.clinicId, name: user.clinicName, organizationId: user.organizationId };
}

export async function requireOrganizationAccess(organizationId: string) {
  const user = await requireUser();
  assertOrganizationAccess(user, organizationId);
  return user;
}

export async function requireClinicAccess(clinicId: string) {
  const user = await requireUser();
  await assertClinicAccess(user, clinicId);
  return user;
}

export async function requireRole(...roles: StaffRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new TenantAccessError("You do not have the required role.");
  }
  return user;
}

export async function requirePermission(permission: PermissionKey) {
  const user = await requireUser();
  if (!roleHasPermission(user.role, permission)) {
    throw new TenantAccessError(`Missing permission: ${permission}`);
  }
  return user;
}

export async function requireSessionContext() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof TenantAccessError && error.message === "Unauthorized") {
      return unauthorized();
    }
    return forbidden(error instanceof Error ? error.message : "Forbidden");
  }
}

export function tenantErrorResponse(error: unknown) {
  if (error instanceof TenantAccessError) {
    if (error.message === "Unauthorized") return unauthorized();
    return forbidden(error.message);
  }
  return null;
}
