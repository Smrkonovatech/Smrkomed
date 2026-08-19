"use client";

import { ApiError } from "@/lib/api/client";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{label}</div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 403) {
    return <p className="text-sm text-danger">You don't have permission to access this page.</p>;
  }
  if (error instanceof ApiError && error.status === 404) {
    return <p className="text-sm text-danger">Not found.</p>;
  }
  const message = error instanceof Error ? error.message : "Unable to load this page.";
  return <p className="text-sm text-danger">{message}</p>;
}

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "ACTIVE" || value === "CONNECTED" || value === "ok" || value === "connected"
      ? "bg-success-soft text-success"
      : value === "ERROR" || value === "SUSPENDED" || value === "disconnected"
        ? "bg-danger-soft text-danger"
        : "bg-warning-soft text-warning";
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>{value}</span>;
}
