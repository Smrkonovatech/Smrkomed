import type { Tone } from "@/lib/status";

export type PageResult<T> = { items: T[]; page: number; pageSize: number; total: number };

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING_SOON" | "EXPIRED";

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

export const stockStatusLabel: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
};

export function stockStatusTone(status: StockStatus | string): Tone {
  switch (status) {
    case "IN_STOCK":
      return "success";
    case "LOW_STOCK":
    case "EXPIRING_SOON":
      return "warning";
    case "OUT_OF_STOCK":
    case "EXPIRED":
      return "danger";
    default:
      return "muted";
  }
}

export function productStatusTone(status: string): Tone {
  if (status === "ACTIVE") return "success";
  if (status === "INACTIVE") return "warning";
  return "muted";
}

export function prescriptionStatusTone(status: string): Tone {
  if (status === "DISPENSED") return "success";
  if (status === "PARTIALLY_DISPENSED") return "info";
  if (status === "PENDING") return "warning";
  if (status === "CANCELLED") return "muted";
  return "muted";
}

export function poStatusTone(status: string): Tone {
  if (status === "RECEIVED") return "success";
  if (status === "ORDERED" || status === "PARTIALLY_RECEIVED") return "info";
  if (status === "DRAFT") return "muted";
  if (status === "CANCELLED") return "danger";
  return "muted";
}

export function paymentStatusTone(status: string): Tone {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "warning";
  if (status === "REFUNDED") return "muted";
  return "warning";
}
