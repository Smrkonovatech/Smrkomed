export { pingDatabase, prisma } from "./client";
export { PERMISSIONS, ROLE_DEFS, ROLE_PERMISSIONS, assertPermission, roleHasPermission, type PermissionKey } from "./permissions";
export { TenantAccessError, isTenantAccessError } from "./errors";
export {
  assertClinicAccess,
  assertOrganizationAccess,
  clinicScope,
  getClinicInOrganization,
  isOrganizationAdmin,
  isPlatformAdmin,
  organizationScope,
  resolveAuthorizedClinic,
  type TenantContext,
} from "./tenant";
export {
  connectIntegrationRecord,
  createLeadForTenant,
  disconnectIntegrationRecord,
  getAppointmentsForClinic,
  getCarePlansForClinic,
  getIntegrationsForClinic,
  getLeadsForOrganization,
  getPatientsForClinic,
  ingestPublicLeadByClinicSlug,
  findDuplicateLeads,
  rejectForeignTenant,
} from "./access";
export { normalizeEmail, phoneSuffix, phonesLikelyMatch, digitsOnly } from "./phone";
export { writeAuditLog, writeTenantAuditLog } from "./audit";
export { DEMO_PASSWORD, ensureDemoWorkspace, isDemoLogin } from "./demo-workspace";
export type * from "@prisma/client";
