"use client";

import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/page-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAuditLogs } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function AuditLogsPage() {
  const [q, setQ] = useState("");
  const params = useMemo(() => new URLSearchParams({ page: "1", pageSize: "25", q }).toString(), [q]);
  const { data, error, loading } = useAsync(() => fetchAuditLogs(params), [params]);

  return (
    <div>
      <PageHeader title="Audit logs" description="Operational events. Secrets and clinical records are not shown." />
      <Input className="mb-4 max-w-sm" placeholder="Search action or resource…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} /> : null}
      {data && data.items.length === 0 ? <EmptyState label="No audit events." /> : null}
      {data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => {
              const user = row["user"] as { name: string } | null;
              const org = row["organization"] as { name: string } | null;
              const clinic = row["clinic"] as { name: string } | null;
              return (
                <TableRow key={String(row["id"])}>
                  <TableCell>{new Date(String(row["timestamp"])).toLocaleString()}</TableCell>
                  <TableCell>{user?.name ?? "—"}</TableCell>
                  <TableCell>{org?.name ?? "—"}</TableCell>
                  <TableCell>{clinic?.name ?? "—"}</TableCell>
                  <TableCell>{String(row["action"])}</TableCell>
                  <TableCell>
                    {String(row["resource"] ?? "—")} {row["resourceId"] ? `· ${String(row["resourceId"])}` : ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
