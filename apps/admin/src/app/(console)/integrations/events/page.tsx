"use client";

import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchIntegrationEvents } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function IntegrationEventsPage() {
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const params = useMemo(() => {
    const search = new URLSearchParams({ page: "1", pageSize: "25" });
    if (provider) search.set("provider", provider);
    if (status) search.set("status", status);
    if (organizationId) search.set("organizationId", organizationId);
    if (clinicId) search.set("clinicId", clinicId);
    return search.toString();
  }, [provider, status, organizationId, clinicId]);
  const { data, error, loading } = useAsync(() => fetchIntegrationEvents(params), [params]);

  return (
    <div>
      <PageHeader
        title="Integration events"
        description="Webhook receipts only. Raw payloads and credentials are not shown."
      />
      <div className="mb-4 flex flex-wrap gap-2">
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
          <option value="RECEIVED">RECEIVED</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="PROCESSED">PROCESSED</option>
          <option value="FAILED">FAILED</option>
          <option value="IGNORED">IGNORED</option>
        </select>
      </div>
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} /> : null}
      {data && data.items.length === 0 ? <EmptyState label="No integration events." /> : null}
      {data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Event type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => {
              const org = row["organization"] as { name: string };
              const clinic = row["clinic"] as { name: string };
              return (
                <TableRow key={String(row["id"])}>
                  <TableCell>{String(row["provider"])}</TableCell>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{clinic.name}</TableCell>
                  <TableCell>{String(row["eventType"])}</TableCell>
                  <TableCell>
                    <StatusBadge value={String(row["status"])} />
                  </TableCell>
                  <TableCell>{new Date(String(row["receivedAt"])).toLocaleString()}</TableCell>
                  <TableCell>{row["processedAt"] ? new Date(String(row["processedAt"])).toLocaleString() : "—"}</TableCell>
                  <TableCell>{String(row["error"] ?? "—")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
