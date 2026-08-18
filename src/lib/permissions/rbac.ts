import type { StaffRole } from "@prisma/client";

/** Permission keys used by the service layer (Phase 1 catalog). */
export const PERMISSIONS = {
  CLINIC_MANAGE: "clinic:manage",
  USERS_MANAGE: "users:manage",
  PATIENTS_READ: "patients:read",
  PATIENTS_WRITE: "patients:write",
  CARE_PLANS_WRITE: "care_plans:write",
  CARE_TASKS_WRITE: "care_tasks:write",
  CARE_LOOP_MANAGE: "care_loop:manage",
  CLINICAL_ESCALATIONS: "escalations:clinical",
  APPOINTMENTS_WRITE: "appointments:write",
  DOCUMENTS_WRITE: "documents:write",
  SETTINGS_MANAGE: "settings:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const rolePermissions: Record<StaffRole, PermissionKey[]> = {
  CLINIC_ADMIN: Object.values(PERMISSIONS),
  DOCTOR: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.CARE_PLANS_WRITE,
    PERMISSIONS.CARE_TASKS_WRITE,
    PERMISSIONS.CLINICAL_ESCALATIONS,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
  ],
  CARE_COORDINATOR: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.CARE_TASKS_WRITE,
    PERMISSIONS.CARE_LOOP_MANAGE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_WRITE,
  ],
  NURSE: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.CARE_TASKS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_WRITE,
  ],
  RECEPTIONIST: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
  ],
};

export function roleHasPermission(role: StaffRole, permission: PermissionKey) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function assertPermission(role: StaffRole, permission: PermissionKey) {
  if (!roleHasPermission(role, permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}
