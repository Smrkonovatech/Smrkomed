/** Permission keys persisted by seed and checked by the service layer. */
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
  LEADS_READ: "leads:read",
  LEADS_CREATE: "leads:create",
  LEADS_UPDATE: "leads:update",
  LEADS_ASSIGN: "leads:assign",
  LEADS_ARCHIVE: "leads:archive",
  LEADS_EXPORT: "leads:export",
  CAMPAIGNS_READ: "campaigns:read",
  CAMPAIGNS_MANAGE: "campaigns:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = {
  CLINIC_ADMIN: ALL_PERMISSIONS,
  DOCTOR: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.CARE_PLANS_WRITE,
    PERMISSIONS.CARE_TASKS_WRITE,
    PERMISSIONS.CLINICAL_ESCALATIONS,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.LEADS_READ,
  ],
  CARE_COORDINATOR: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.CARE_TASKS_WRITE,
    PERMISSIONS.CARE_LOOP_MANAGE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.LEADS_ASSIGN,
  ],
  NURSE: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.CARE_TASKS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.LEADS_READ,
  ],
  RECEPTIONIST: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
  ],
  PLATFORM_ADMIN: ALL_PERMISSIONS,
  ORGANIZATION_ADMIN: ALL_PERMISSIONS,
  COUNSELOR: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.CARE_LOOP_MANAGE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.CAMPAIGNS_READ,
  ],
  MARKETING: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.CAMPAIGNS_READ,
    PERMISSIONS.CAMPAIGNS_MANAGE,
  ],
  READ_ONLY: [PERMISSIONS.PATIENTS_READ, PERMISSIONS.LEADS_READ, PERMISSIONS.CAMPAIGNS_READ],
} as const;

export const ROLE_DEFS = [
  { key: "CLINIC_ADMIN", name: "Clinic Admin", description: "Full clinic administration" },
  { key: "DOCTOR", name: "Doctor", description: "Clinical care and escalations" },
  { key: "CARE_COORDINATOR", name: "Care Coordinator", description: "Care Loop and patient follow-through" },
  { key: "NURSE", name: "Nurse", description: "Clinical support operations" },
  { key: "RECEPTIONIST", name: "Receptionist", description: "Front desk and appointments" },
  { key: "PLATFORM_ADMIN", name: "Platform Admin", description: "SmrkoMed internal administrator across all organizations" },
  { key: "ORGANIZATION_ADMIN", name: "Organization Admin", description: "Customer administrator for a single organization" },
  { key: "COUNSELOR", name: "Counselor", description: "Patient counselling and follow-through" },
  { key: "MARKETING", name: "Marketing", description: "Marketing and enquiry visibility" },
  { key: "READ_ONLY", name: "Read only", description: "View patient records without write access" },
] as const;

export function roleHasPermission(
  role: keyof typeof ROLE_PERMISSIONS,
  permission: PermissionKey,
) {
  return (ROLE_PERMISSIONS[role] as readonly PermissionKey[]).includes(permission);
}

export function assertPermission(
  role: keyof typeof ROLE_PERMISSIONS,
  permission: PermissionKey,
) {
  if (!roleHasPermission(role, permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}
