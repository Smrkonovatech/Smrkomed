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

export function claimStatusTone(status: string): Tone {
  switch (status) {
    case "APPROVED":
    case "PAID":
    case "CLOSED":
      return "success";
    case "PARTIALLY_APPROVED":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "PAYMENT_PENDING":
      return "info";
    case "QUERY":
    case "FINAL_BILL_PENDING":
    case "DRAFT":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "muted";
  }
}

export function policyStatusTone(status: string): Tone {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PENDING_VERIFICATION":
      return "warning";
    case "EXPIRED":
    case "CANCELLED":
      return "danger";
    default:
      return "muted";
  }
}

export function priorityTone(priority: string): Tone {
  switch (priority?.toUpperCase()) {
    case "URGENT":
    case "HIGH":
      return "danger";
    case "NORMAL":
    case "MEDIUM":
      return "info";
    case "LOW":
      return "muted";
    default:
      return "muted";
  }
}

export function claimStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export const CLAIM_STATUS_FILTERS = [
  "ALL",
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "QUERY",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "REJECTED",
  "FINAL_BILL_PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "CLOSED",
] as const;

export const CLAIM_STATUS_OPTIONS = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "QUERY",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "REJECTED",
  "FINAL_BILL_PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "CLOSED",
] as const;
