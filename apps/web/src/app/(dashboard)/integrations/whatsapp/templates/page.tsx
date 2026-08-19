"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api/client";

type Template = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED" | "PAUSED";
  lastSyncedAt: string | null;
};

function tone(status: Template["status"]) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING" || status === "PAUSED") return "warning" as const;
  return "danger" as const;
}

function label(status: Template["status"]) {
  if (status === "APPROVED") return "Approved";
  if (status === "PENDING") return "Pending";
  if (status === "REJECTED") return "Rejected";
  if (status === "DISABLED") return "Disabled";
  return "Paused";
}

export default function WhatsAppTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<Template[]>("/api/v1/integrations/whatsapp/templates")
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load templates."));
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery = !q || row.name.toLowerCase().includes(q.toLowerCase());
        const matchesStatus = !status || row.status === status;
        return matchesQuery && matchesStatus;
      }),
    [q, rows, status],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="WhatsApp Templates"
        subtitle="Statuses come from Meta. SmrkoMed does not mark a template approved unless Meta confirms it."
      />
      {error ? <p className="text-sm text-warning-foreground">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search templates" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="DISABLED">Disabled</option>
          <option value="PAUSED">Paused</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Template</th>
              <th className="px-4 py-2">Language</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Last synced</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No templates yet. Sync after connecting WhatsApp.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.language}</td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={label(row.status)} tone={tone(row.status)} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
