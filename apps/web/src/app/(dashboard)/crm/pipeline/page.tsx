"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api/client";
import { STAGE_LABELS, type LeadRow } from "@/lib/crm";

type Pipeline = {
  columns: Array<{ stage: string; total: number; items: LeadRow[] }>;
};

export default function CrmPipelinePage() {
  const [data, setData] = useState<Pipeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await apiGet<Pipeline>("/api/v1/crm/pipeline?page=1&pageSize=20");
        if (!cancelled) setData(next);
      } catch {
        if (!cancelled) setError("Unable to load pipeline.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function move(leadId: string, stage: string) {
    setBusyId(leadId);
    try {
      await apiPost(`/api/v1/leads/${leadId}/stage`, { stage });
      const next = await apiGet<Pipeline>("/api/v1/crm/pipeline?page=1&pageSize=20");
      setData(next);
    } catch {
      setError("Lead could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1800px]">
      <PageHeader title="Pipeline" subtitle="Counsellor-owned fertility journey from new enquiry to active patient." />
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {!data ? (
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {data.columns.map((column) => (
            <section key={column.stage} className="w-72 shrink-0 rounded-xl border bg-background">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <h2 className="text-sm font-semibold">{STAGE_LABELS[column.stage] ?? column.stage}</h2>
                <StatusBadge label={String(column.total)} tone="muted" dot={false} />
              </div>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                {column.items.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">No leads in this stage.</p>
                ) : (
                  column.items.map((lead) => (
                    <article key={lead.id} className="rounded-lg border p-3 text-sm">
                      <Link href={`/crm/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{lead.phone ?? "No phone"}</p>
                      <p className="mt-1 text-xs">{lead.sourceLabel}{lead.campaign ? ` · ${lead.campaign}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{lead.assignedTo?.name ?? "Unassigned"}</p>
                      <select
                        className="mt-2 h-8 w-full rounded-md border px-2 text-xs"
                        disabled={busyId === lead.id}
                        value={lead.stage}
                        onChange={(e) => void move(lead.id, e.target.value)}
                      >
                        {data.columns.map((item) => (
                          <option key={item.stage} value={item.stage}>
                            {STAGE_LABELS[item.stage]}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))
                )}
                {column.total > column.items.length && (
                  <p className="px-2 pb-2 text-center text-xs text-muted-foreground">
                    Showing {column.items.length} of {column.total}
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    </div>
  );
}
