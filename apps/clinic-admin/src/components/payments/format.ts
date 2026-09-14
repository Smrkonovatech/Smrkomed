import type { Tone } from "@/lib/status";

export type PageResult<T> = { items: T[]; page: number; pageSize: number; total: number };

export function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function paymentStatusTone(status: string): Tone {
  switch (status) {
    case "SUCCESS":
    case "PAID":
      return "success";
    case "PENDING":
    case "PROCESSING":
    case "PARTIALLY_REFUNDED":
      return "warning";
    case "FAILED":
    case "CANCELLED":
      return "danger";
    case "REFUNDED":
      return "info";
    default:
      return "muted";
  }
}

export function invoiceStatusTone(status: string): Tone {
  switch (status) {
    case "PAID":
      return "success";
    case "ISSUED":
    case "PARTIALLY_PAID":
      return "warning";
    case "OVERDUE":
    case "CANCELLED":
    case "VOID":
      return "danger";
    case "DRAFT":
      return "muted";
    default:
      return "muted";
  }
}

export function gatewayStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "ERROR":
      return "danger";
    case "DISCONNECTED":
      return "muted";
    default:
      return "muted";
  }
}

export const PAYMENT_STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CANCELLED",
] as const;

export const INVOICE_STATUS_FILTERS = [
  "ALL",
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "VOID",
] as const;

export type PaymentRow = {
  id: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  provider: string;
  paymentLinkUrl: string | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
  invoice: { id: string; invoiceNumber: string; title: string } | null;
  refunds?: Array<{ id: string; amount: number; status: string }>;
};

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  patientId: string | null;
  coupleId: string | null;
  title: string;
  description: string | null;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  dueDate: string | null;
  issuedAt: string;
  source: string;
  patient: { id: string; name: string } | null;
  couple: { id: string; slug: string } | null;
  lines?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitAmount: number;
    lineTotal: number;
  }>;
};

export type PaymentsDashboard = {
  todayCollections: { amount: number; count: number };
  pending: { amount: number; count: number };
  outstanding: { amount: number; count: number };
  failed: { amount: number; count: number };
  refunds: { amount: number; count: number };
};

export type FinancialsOverview = {
  patientId?: string;
  coupleId?: string;
  outstanding: number;
  collected: number;
  invoices: InvoiceRow[];
  payments: PaymentRow[];
};

export type GatewayCapabilities = {
  upi: boolean;
  cards: boolean;
  netBanking: boolean;
  paymentLinks: boolean;
  refunds: boolean;
};

export type GatewayConnection = {
  id: string;
  provider: string;
  displayName: string | null;
  mode: "TEST" | "LIVE" | string;
  status: string;
  isDefault: boolean;
  isActive: boolean;
  lastTestedAt: string | null;
  lastError: string | null;
  hasCredentials: boolean;
  publicKeyLast4: string | null;
  config: {
    keyId?: string;
    appId?: string;
    merchantKey?: string;
    mode?: string;
  };
};

export type GatewayProviderCard = {
  provider: "RAZORPAY" | "CASHFREE" | "PAYU" | string;
  name: string;
  capabilities: GatewayCapabilities;
  connection: GatewayConnection | null;
};

export type GatewaysResponse = {
  catalog?: Array<{ provider: string; name: string; capabilities: GatewayCapabilities }>;
  connections?: GatewayProviderCard[];
  providers?: GatewayProviderCard[];
};

export function normalizeGatewayProviders(data: GatewaysResponse): GatewayProviderCard[] {
  if (Array.isArray(data.connections) && data.connections.length) return data.connections;
  if (Array.isArray(data.providers) && data.providers.length) return data.providers;
  return [];
}
