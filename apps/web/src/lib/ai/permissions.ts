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
];

export function canUseAi(tenant: TenantContext): boolean {
  return roleHasPermission(tenant.role, PERMISSIONS.PATIENTS_READ);
}

export function canProposeMutations(tenant: TenantContext): boolean {
  return roleHasPermission(tenant.role, PERMISSIONS.CARE_TASKS_WRITE);
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
    return true;
  });
}

export function assertToolAllowed(tenant: TenantContext, tool: AiToolName) {
  if (!allowedTools(tenant).includes(tool)) {
    throw new Error(`Tool not permitted: ${tool}`);
  }
}
