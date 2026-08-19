import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  assertPermission,
  roleHasPermission,
  type PermissionKey,
} from "@smrkomed/database";
import type { StaffRole } from "@smrkomed/database";

export { PERMISSIONS, assertPermission, roleHasPermission, type PermissionKey };

export function permissionsForRole(role: StaffRole): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[role];
}
