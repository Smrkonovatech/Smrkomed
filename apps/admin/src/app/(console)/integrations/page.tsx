"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchIntegrationHealth, fetchIntegrations } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function IntegrationsPage() {
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [q, setQ] = useState("");
  const params = useMemo(() => {
    const search = new URLSearchParams({ page: "1", pageSize: "25" });
    if (q) search.set("q", q);
    if (provider) search.set("provider", provider);
    if (status) search.set("status", status);
    if (organizationId) search.set("organizationId", organizationId);
    if (clinicId) search.set("clinicId", clinicId);
    return search.toString();
  }, [provider, status, organizationId, clinicId, q]);
  const { data, error, loading } = useAsync(() => fetchIntegrations(params), [params]);
  const health = useAsync(() => fetchIntegrationHealth(), []);

  const totals = (health.data?.["totals"] ?? null) as Record<string, number> | null;

  return (
    <div>
      <PageHeader title="Integrations" description="Connection metadata only. Secrets are never returned." />
      {totals ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(totals).map(([key, value]) => (
            <div key={key} className="rounded-xl border bg-card p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search clinic…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input className="max-w-[10rem]" placeholder="Organization id" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
        <Input className="max-w-[10rem]" placeholder="Clinic id" value={clinicId} onChange={(e) => setClinicId(e.target.value)} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">All providers</option>
          <option value="WHATSAPP_CLOUD">WHATSAPP</option>
          <option value="META_ADS">META</option>
          <option value="GOOGLE_ADS">GOOGLE</option>
        </select>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="NOT_CONNECTED">NOT_CONNECTED</option>
          <option value="CONNECTING">CONNECTING</option>
          <option value="CONNECTED">CONNECTED</option>
          <option value="ACTION_REQUIRED">ACTION_REQUIRED</option>
          <option value="ERROR">ERROR</option>
          <option value="DISCONNECTED">DISCONNECTED</option>
        </select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} /> : null}
      {data && data.items.length === 0 ? <EmptyState label="No integration connections." /> : null}
      {data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>External account</TableHead>
              <TableHead>Last sync</TableHead>
              <TableHead>Last error</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => {
              const org = row["organization"] as { name: string };
              const clinic = row["clinic"] as { name: string };
              return (
                <TableRow key={String(row["id"])}>
                  <TableCell>
                    <Link className="text-primary hover:underline" href={`/integrations/${String(row["id"])}`}>
                      {String(row["provider"])}
                    </Link>
                  </TableCell>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{clinic.name}</TableCell>
                  <TableCell>
                    <StatusBadge value={String(row["connectionStatus"])} />
                  </TableCell>
                  <TableCell>{String(row["externalAccount"] ?? "—")}</TableCell>
                  <TableCell>{row["lastSyncAt"] ? new Date(String(row["lastSyncAt"])).toLocaleString() : "—"}</TableCell>
                  <TableCell>{String(row["lastError"] ?? "—")}</TableCell>
                  <TableCell>{row["createdAt"] ? new Date(String(row["createdAt"])).toLocaleString() : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
