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
  PHARMACY_VIEW: "pharmacy:view",
  PHARMACY_MANAGE: "pharmacy:manage",
  PHARMACY_INVENTORY: "pharmacy:inventory",
  PHARMACY_SALES: "pharmacy:sales",
  PHARMACY_PRESCRIPTIONS: "pharmacy:prescriptions",
  PHARMACY_PURCHASE: "pharmacy:purchase",
  PHARMACY_REPORTS: "pharmacy:reports",
  PHARMACY_SETTINGS: "pharmacy:settings",
  INSURANCE_VIEW: "insurance:view",
  INSURANCE_EDIT: "insurance:edit",
  INSURANCE_CLAIMS_VIEW: "insurance:claims:view",
  INSURANCE_CLAIMS_CREATE: "insurance:claims:create",
  INSURANCE_CLAIMS_EDIT: "insurance:claims:edit",
  INSURANCE_PREAUTH: "insurance:preauth",
  INSURANCE_DOCUMENTS: "insurance:documents",
  INSURANCE_QUERIES: "insurance:queries",
  INSURANCE_FINANCIALS: "insurance:financials",
  INSURANCE_APPROVE: "insurance:approve",
  INSURANCE_EXPORT: "insurance:export",
  INSURANCE_SETTINGS: "insurance:settings",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const PHARMACY_ALL = [
  PERMISSIONS.PHARMACY_VIEW,
  PERMISSIONS.PHARMACY_MANAGE,
  PERMISSIONS.PHARMACY_INVENTORY,
  PERMISSIONS.PHARMACY_SALES,
  PERMISSIONS.PHARMACY_PRESCRIPTIONS,
  PERMISSIONS.PHARMACY_PURCHASE,
  PERMISSIONS.PHARMACY_REPORTS,
  PERMISSIONS.PHARMACY_SETTINGS,
] as const;

const INSURANCE_ALL = [
  PERMISSIONS.INSURANCE_VIEW,
  PERMISSIONS.INSURANCE_EDIT,
  PERMISSIONS.INSURANCE_CLAIMS_VIEW,
  PERMISSIONS.INSURANCE_CLAIMS_CREATE,
  PERMISSIONS.INSURANCE_CLAIMS_EDIT,
  PERMISSIONS.INSURANCE_PREAUTH,
  PERMISSIONS.INSURANCE_DOCUMENTS,
  PERMISSIONS.INSURANCE_QUERIES,
  PERMISSIONS.INSURANCE_FINANCIALS,
  PERMISSIONS.INSURANCE_APPROVE,
  PERMISSIONS.INSURANCE_EXPORT,
  PERMISSIONS.INSURANCE_SETTINGS,
] as const;

const INSURANCE_COORDINATOR = [
  PERMISSIONS.INSURANCE_VIEW,
  PERMISSIONS.INSURANCE_EDIT,
  PERMISSIONS.INSURANCE_CLAIMS_VIEW,
  PERMISSIONS.INSURANCE_CLAIMS_CREATE,
  PERMISSIONS.INSURANCE_CLAIMS_EDIT,
  PERMISSIONS.INSURANCE_PREAUTH,
  PERMISSIONS.INSURANCE_DOCUMENTS,
  PERMISSIONS.INSURANCE_QUERIES,
  PERMISSIONS.INSURANCE_FINANCIALS,
] as const;

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
    PERMISSIONS.PHARMACY_VIEW,
    PERMISSIONS.PHARMACY_PRESCRIPTIONS,
    PERMISSIONS.INSURANCE_VIEW,
    PERMISSIONS.INSURANCE_CLAIMS_VIEW,
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
    PERMISSIONS.PHARMACY_VIEW,
    ...INSURANCE_COORDINATOR,
  ],
  NURSE: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.CARE_TASKS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.PHARMACY_VIEW,
  ],
  RECEPTIONIST: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.INSURANCE_VIEW,
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
  PHARMACY_MANAGER: [
    PERMISSIONS.PATIENTS_READ,
    ...PHARMACY_ALL,
  ],
  PHARMACIST: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PHARMACY_VIEW,
    PERMISSIONS.PHARMACY_INVENTORY,
    PERMISSIONS.PHARMACY_SALES,
    PERMISSIONS.PHARMACY_PRESCRIPTIONS,
  ],
  PHARMACY_STAFF: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PHARMACY_VIEW,
    PERMISSIONS.PHARMACY_INVENTORY,
    PERMISSIONS.PHARMACY_SALES,
  ],
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
  { key: "PHARMACY_MANAGER", name: "Pharmacy Manager", description: "Full pharmacy operations and procurement" },
  { key: "PHARMACIST", name: "Pharmacist", description: "Dispensing, prescriptions, and pharmacy sales" },
  { key: "PHARMACY_STAFF", name: "Pharmacy Staff", description: "Inventory view and pharmacy sales" },
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
