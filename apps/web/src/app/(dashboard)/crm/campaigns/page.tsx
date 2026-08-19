"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api/client";
import { SOURCE_OPTIONS, TREATMENT_OPTIONS, type PageResult } from "@/lib/crm";

type Campaign = {
  id: string;
  name: string;
  source: string;
  sourceLabel: string;
  medium: string | null;
  status: string;
  treatmentFocus: string | null;
  leadCount?: number;
};

export default function CampaignsPage() {
  const router = useRouter();
  const [data, setData] = useState<PageResult<Campaign> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [source, setSource] = useState<(typeof SOURCE_OPTIONS)[number]>("META_ADS");
  const [medium, setMedium] = useState("PAID_SOCIAL");
  const [treatmentFocus, setTreatmentFocus] = useState("IVF");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiGet<PageResult<Campaign>>("/api/v1/campaigns?page=1&pageSize=25")
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load campaigns.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function create() {
    setBusy(true);
    try {
      const created = await apiPost<{ id: string }>("/api/v1/campaigns", { name, source, medium, treatmentFocus, status: "DRAFT" });
      router.push(`/crm/campaigns/${created.id}`);
    } catch {
      setError("Campaign could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader title="Campaigns" subtitle="Attribute IVF and fertility evaluation enquiries without connecting ad accounts." />
      {error && <p className="text-sm text-danger">{error}</p>}
      <section className="rounded-xl border bg-background p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 lg:col-span-2">
          <Label>Campaign name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="IVF September 2026" />
        </div>
        <div className="space-y-1">
          <Label>Source</Label>
          <select className="h-9 w-full rounded-md border px-2 text-sm" value={source} onChange={(e) => setSource(e.target.value as (typeof SOURCE_OPTIONS)[number])}>
            {SOURCE_OPTIONS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Treatment</Label>
          <select className="h-9 w-full rounded-md border px-2 text-sm" value={treatmentFocus} onChange={(e) => setTreatmentFocus(e.target.value)}>
            {TREATMENT_OPTIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Medium</Label>
          <Input value={medium} onChange={(e) => setMedium(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button disabled={busy || !name.trim()} onClick={() => void create()}>Create campaign</Button>
        </div>
      </section>
      {!data?.items.length ? (
        <EmptyState title="No campaigns created." description="Create IVF September Campaign or a fertility evaluation campaign to start attribution." />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-2">Name</th>
              <th>Source</th>
              <th>Status</th>
              <th>Leads</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="py-3"><Link className="font-medium hover:underline" href={`/crm/campaigns/${row.id}`}>{row.name}</Link></td>
                <td>{row.sourceLabel}</td>
                <td><StatusBadge label={row.status} /></td>
                <td>{row.leadCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
