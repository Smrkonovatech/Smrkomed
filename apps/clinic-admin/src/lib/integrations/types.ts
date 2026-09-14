import type { IntegrationProvider } from "@smrkomed/database";

export type ConnectionHealth = "ACTIVE" | "ACTION_REQUIRED" | "DISABLED" | "ERROR" | "PENDING";

export type PublicIntegration = {
  provider: IntegrationProvider;
  status: ConnectionHealth;
  displayName: string | null;
  externalAccountId: string | null;
  lastError: string | null;
};

export interface MessagingAdapter {
  sendMessage(to: string, body: string): Promise<{ id: string }>;
  sendTemplate(to: string, template: string): Promise<{ id: string }>;
  receiveMessage(payload: unknown): Promise<void>;
  getStatus(): Promise<ConnectionHealth>;
}

export interface AdsAdapter {
  getCampaigns(): Promise<Array<{ id: string; name: string; spend: number; leads: number }>>;
  getLeads(): Promise<Array<{ id: string; name: string; phone?: string }>>;
  getSpend(): Promise<{ amount: number; currency: string }>;
  getConversions(): Promise<{ leads: number; appointments: number }>;
}

export interface CalendarAdapter {
  getAvailability(date: string): Promise<string[]>;
  createAppointment(input: { title: string; start: string; end: string }): Promise<{ id: string }>;
  cancelAppointment(id: string): Promise<void>;
  rescheduleAppointment(id: string, start: string, end: string): Promise<void>;
}

export interface IntegrationAdapter {
  provider: IntegrationProvider;
  connect(input?: Record<string, string>): Promise<PublicIntegration>;
  disconnect(): Promise<void>;
  getStatus(): Promise<ConnectionHealth>;
}
