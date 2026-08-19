import { apiGet, apiPatch, apiPost, type PageResult } from "./client";

export type DashboardData = {
  totals: {
    organizations: number;
    clinics: number;
    activeUsers: number;
    activeSubscriptions: number;
    whatsappConnected: number;
    metaConnected: number;
    googleConnected: number;
    leadCount: number;
    campaignCount: number;
  };
  recentSignups: Array<{ id: string; name: string; status: string; createdAt: string }>;
  recentIntegrationErrors: Array<{
    id: string;
    provider: string;
    status: string;
    lastError: string | null;
    clinic: { name: string; organization: { name: string } };
  }>;
  recentEvents: Array<{ id: string; action: string; entityType: string | null; createdAt: string }>;
};

export function fetchDashboard() {
  return apiGet<DashboardData>("/api/v1/admin/dashboard");
}

export function fetchOrganizations(params: string) {
  return apiGet<PageResult<Record<string, unknown>>>(`/api/v1/admin/organizations?${params}`);
}

export function fetchOrganization(id: string) {
  return apiGet<Record<string, unknown>>(`/api/v1/admin/organizations/${id}`);
}

export function patchOrganization(id: string, body: unknown) {
  return apiPatch(`/api/v1/admin/organizations/${id}`, body);
}

export function fetchClinics(params: string) {
  return apiGet<PageResult<Record<string, unknown>>>(`/api/v1/admin/clinics?${params}`);
}

export function fetchClinic(id: string) {
  return apiGet<Record<string, unknown>>(`/api/v1/admin/clinics/${id}`);
}

export function fetchUsers(params: string) {
  return apiGet<PageResult<Record<string, unknown>>>(`/api/v1/admin/users?${params}`);
}

export function fetchUser(id: string) {
  return apiGet<Record<string, unknown>>(`/api/v1/admin/users/${id}`);
}

export function patchUser(id: string, body: unknown) {
  return apiPatch(`/api/v1/admin/users/${id}`, body);
}

export function fetchSubscriptions(params: string) {
  return apiGet<PageResult<Record<string, unknown>>>(`/api/v1/admin/subscriptions?${params}`);
}

export function fetchIntegrations(params: string) {
  return apiGet<PageResult<Record<string, unknown>>>(`/api/v1/admin/integrations?${params}`);
}

export function fetchIntegration(id: string) {
  return apiGet<Record<string, unknown>>(`/api/v1/admin/integrations/${id}`);
}

export function disconnectIntegration(id: string) {
  return apiPost(`/api/v1/admin/integrations/${id}/disconnect`, {});
}

export function fetchWhatsApp() {
  return apiGet<Record<string, unknown>>("/api/v1/admin/integrations/whatsapp");
}

export function fetchWhatsAppDetail(id: string) {
  return apiGet<Record<string, unknown>>(`/api/v1/admin/integrations/whatsapp/${id}`);
}

export function fetchMeta() {
  return apiGet<Record<string, unknown>>("/api/v1/admin/integrations/meta");
}

export function fetchGoogle() {
  return apiGet<Record<string, unknown>>("/api/v1/admin/integrations/google");
}

export function fetchAuditLogs(params: string) {
  return apiGet<PageResult<Record<string, unknown>>>(`/api/v1/admin/audit-logs?${params}`);
}

export function fetchSystemHealth() {
  return apiGet<Record<string, unknown>>("/api/v1/admin/system/health");
}

export function fetchIntegrationHealth(params = "") {
  return apiGet<Record<string, unknown>>(`/api/v1/admin/integrations/health${params ? `?${params}` : ""}`);
}

export function fetchIntegrationEvents(params: string) {
  return apiGet<PageResult<Record<string, unknown>>>(`/api/v1/admin/integration-events?${params}`);
}
