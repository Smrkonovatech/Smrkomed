"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { AddLeadForm } from "@/components/crm/add-lead-form";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api/client";
import { STAGE_LABELS, STAGE_ORDER, SOURCE_OPTIONS, type LeadRow, type PageResult } from "@/lib/crm";

export default function CrmLeadsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<LeadRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "25", sort: "newest" });
      if (query.trim()) params.set("search", query.trim());
      if (stage !== "ALL") params.set("stage", stage);
      if (source !== "ALL") params.set("source", source);
      try {
        const next = await apiGet<PageResult<LeadRow>>(`/api/v1/leads?${params}`);
        if (!cancelled) setData(next);
      } catch {
        if (!cancelled) {
          setError("Unable to load leads.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, query, source, stage]);

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Leads"
        subtitle="Search the fertility pipeline by name, phone, email, campaign, or source."
        actions={<AddLeadForm onCreated={(id) => router.push(`/crm/leads/${id}`)} />}
      />
      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="grid gap-3 border-b p-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search name, phone, email, or lead ID"
              className="h-9 rounded-lg pl-9"
            />
          </div>
          <select className="h-9 rounded-md border px-2 text-sm" value={stage} onChange={(e) => { setPage(1); setStage(e.target.value); }}>
            <option value="ALL">All stages</option>
            {STAGE_ORDER.map((item) => (
              <option key={item} value={item}>{STAGE_LABELS[item]}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border px-2 text-sm" value={source} onChange={(e) => { setPage(1); setSource(e.target.value); }}>
            <option value="ALL">All sources</option>
            {SOURCE_OPTIONS.map((item) => (
              <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
        {error ? (
          <EmptyState title="Unable to load leads." description={error} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />
        ) : loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading leads…</p>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Users}
            title={query || stage !== "ALL" ? "No leads matched your filters." : "No leads yet."}
            description="Website, WhatsApp and walk-in enquiries will appear in this list."
          />
        ) : (
          <>
          <MobileCards>
            {data.items.map((lead) => (
              <RecordCard key={lead.id}>
                <p className="font-semibold">{lead.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lead.sourceLabel} · {lead.campaign ?? "No campaign"}
                </p>
                <div className="mt-2">
                  <StatusBadge label={lead.stageLabel} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {lead.assignedTo?.name ?? "Unassigned"} · Next:{" "}
                  {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString() : "—"}
                </p>
                <Button asChild size="sm" className="mt-3 w-full">
                  <Link href={`/crm/leads/${lead.id}`}>Open</Link>
                </Button>
              </RecordCard>
            ))}
          </MobileCards>
          <MdTableWrap>
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Campaign</th>
                  <th className="px-4 py-2 font-medium">Stage</th>
                  <th className="px-4 py-2 font-medium">Counsellor</th>
                  <th className="px-4 py-2 font-medium">Score</th>
                  <th className="px-4 py-2 font-medium">Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/crm/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{lead.phone ?? lead.email}</p>
                    </td>
                    <td className="px-4 py-3">{lead.sourceLabel}</td>
                    <td className="px-4 py-3">{lead.campaign ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge label={lead.stageLabel} /></td>
                    <td className="px-4 py-3">{lead.assignedTo?.name ?? "Unassigned"}</td>
                    <td className="px-4 py-3">{lead.score} · {lead.scoreBand}</td>
                    <td className="px-4 py-3">{lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MdTableWrap>
          </>
        )}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
