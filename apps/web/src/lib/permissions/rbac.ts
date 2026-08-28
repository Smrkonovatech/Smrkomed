/**
 * Client-safe RBAC helpers.
 * Import permissions from `@smrkomed/database/permissions` — never the package root —
 * so browser bundles do not pull Prisma / node:fs.
 */
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  assertPermission,
  roleHasPermission,
  type PermissionKey,
} from "@smrkomed/database/permissions";

export { PERMISSIONS, assertPermission, roleHasPermission, type PermissionKey };

export type StaffRole = keyof typeof ROLE_PERMISSIONS;

export function permissionsForRole(role: StaffRole): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[role];
}
