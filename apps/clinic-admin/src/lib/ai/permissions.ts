import { roleHasPermission, PERMISSIONS, type TenantContext } from "@smrkomed/database";

import type { AiToolName } from "./types";

const READ_TOOLS: AiToolName[] = [
  "getClinicSummary",
  "getClinicPriorities",
  "getCouple",
  "getCoupleSummary",
  "getPatientJourney",
  "searchPatients",
  "getOverdueTasks",
  "getCoupleTasks",
  "getTodaysAppointments",
  "getUpcomingAppointments",
  "getActivity",
  "getRecentActivity",
  "getConsultationNotes",
  "getCarePlanStatus",
  "getFollowUpQueue",
  "getInactivePatients",
  "getStaff",
  "getTeamWorkload",
  "getPrepareMyDay",
  "getPatientAttentionScore",
  "getNavigationHelp",
  "draftPatientMessage",
  "proposeCreateTask",
  "getTodaysCollections",
  "getOutstandingPayments",
  "getFailedPayments",
  "getPatientPaymentHistory",
  "getOverdueInvoices",
  "getClinicOutstandingTotal",
  "getPatientMedications",
  "getMedicationSchedule",
  "getPrescriptionSummary",
  "getPharmacyInventory",
  "getLowStockMedicines",
  "getPendingDispensing",
  "getMedicationFollowUps",
  "getPatientDigitalHealthStatus",
  "getPatientConsents",
  "getPatientHealthTimeline",
  "getRecordSharingStatus",
  "getPatient360",
  "getPatientTimeline",
  "getCurrentMedications",
  "getPendingCareTasks",
  "getPatientDocuments",
  "getPatientCommunicationSummary",
  "getPatientPaymentStatus",
  "getPatientInsuranceStatus",
  "preparePatientConsultation",
];

export function canUseAi(tenant: TenantContext): boolean {
  return roleHasPermission(tenant.role, PERMISSIONS.PATIENTS_READ);
}

export function canProposeMutations(tenant: TenantContext): boolean {
  return roleHasPermission(tenant.role, PERMISSIONS.CARE_TASKS_WRITE);
}

export function canViewPayments(tenant: TenantContext): boolean {
  return roleHasPermission(tenant.role, PERMISSIONS.PAYMENTS_VIEW);
}

export function canViewPharmacy(tenant: TenantContext): boolean {
  return roleHasPermission(tenant.role, PERMISSIONS.PHARMACY_VIEW);
}

export function canViewDigitalHealth(tenant: TenantContext): boolean {
  return roleHasPermission(tenant.role, PERMISSIONS.DIGITAL_HEALTH_VIEW);
}

export function allowedTools(tenant: TenantContext): AiToolName[] {
  if (!canUseAi(tenant)) return [];
  return READ_TOOLS.filter((tool) => {
    if (tool === "proposeCreateTask") return canProposeMutations(tenant);
    if (tool === "getStaff") {
      return (
        roleHasPermission(tenant.role, PERMISSIONS.PATIENTS_READ) ||
        roleHasPermission(tenant.role, PERMISSIONS.CARE_TASKS_WRITE)
      );
    }
    if (
      tool === "getTodaysCollections" ||
      tool === "getOutstandingPayments" ||
      tool === "getFailedPayments" ||
      tool === "getPatientPaymentHistory" ||
      tool === "getOverdueInvoices" ||
      tool === "getClinicOutstandingTotal" ||
      tool === "getPatientPaymentStatus"
    ) {
      return canViewPayments(tenant);
    }
    if (
      tool === "getPatientMedications" ||
      tool === "getMedicationSchedule" ||
      tool === "getPrescriptionSummary" ||
      tool === "getPharmacyInventory" ||
      tool === "getLowStockMedicines" ||
      tool === "getPendingDispensing" ||
      tool === "getMedicationFollowUps" ||
      tool === "getCurrentMedications"
    ) {
      return canViewPharmacy(tenant);
    }
    if (
      tool === "getPatientDigitalHealthStatus" ||
      tool === "getPatientConsents" ||
      tool === "getPatientHealthTimeline" ||
      tool === "getRecordSharingStatus"
    ) {
      return canViewDigitalHealth(tenant);
    }
    if (tool === "getPatientInsuranceStatus") {
      return roleHasPermission(tenant.role, PERMISSIONS.INSURANCE_VIEW);
    }
    return true;
  });
}

export function assertToolAllowed(tenant: TenantContext, tool: AiToolName) {
  if (!allowedTools(tenant).includes(tool)) {
    throw new Error(`Tool not permitted: ${tool}`);
  }
}
