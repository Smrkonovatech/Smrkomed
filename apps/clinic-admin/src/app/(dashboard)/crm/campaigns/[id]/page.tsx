"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { apiGet } from "@/lib/api/client";
import type { LeadRow } from "@/lib/crm";

type Detail = {
  campaign: {
    id: string;
    name: string;
    sourceLabel: string;
    medium: string | null;
    status: string;
    treatmentFocus: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  funnel: {
    leads: number;
    qualified: number;
    consultationsBooked: number;
    treatmentStarted: number;
    lost: number;
  };
  leads: LeadRow[];
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiGet<Detail>(`/api/v1/campaigns/${params.id}`)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load campaign.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (error) return <EmptyState title="Unable to load campaign." description={error} />;
  if (!data) return <p className="p-6 text-sm text-muted-foreground">Loading campaign…</p>;

  const c = data.campaign;
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <PageHeader title={c.name} subtitle={`${c.sourceLabel}${c.medium ? ` · ${c.medium}` : ""}`} />
      <div className="flex flex-wrap gap-2 text-sm">
        <StatusBadge label={c.status} />
        {c.treatmentFocus && <StatusBadge label={c.treatmentFocus} tone="teal" />}
      </div>
      <section className="grid gap-3 sm:grid-cols-5">
        {Object.entries({
          Leads: data.funnel.leads,
          Qualified: data.funnel.qualified,
          Consultations: data.funnel.consultationsBooked,
          Treatment: data.funnel.treatmentStarted,
          Lost: data.funnel.lost,
        }).map(([label, value]) => (
          <div key={label} className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>
      <p className="text-xs text-muted-foreground">Ad spend is hidden until a live ads provider supplies it. Revenue is not estimated here.</p>
      {!data.leads.length ? (
        <EmptyState title="No leads matched your filters." description="Leads attributed to this campaign will appear here." />
      ) : (
        <ul className="divide-y rounded-xl border">
          {data.leads.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <Link href={`/crm/leads/${lead.id}`} className="font-medium hover:underline">{lead.name}</Link>
              <span className="text-muted-foreground">{lead.stageLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
