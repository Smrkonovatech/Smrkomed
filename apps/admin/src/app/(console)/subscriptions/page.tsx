"use client";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchSubscriptions } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function SubscriptionsPage() {
  const { data, error, loading } = useAsync(() => fetchSubscriptions("page=1&pageSize=25"), []);
  return (
    <div>
      <PageHeader title="Subscriptions" description="Read-only. Payments are not implemented in this phase." />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} /> : null}
      {data && data.items.length === 0 ? <EmptyState label="No subscriptions yet." /> : null}
      {data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Renewal</TableHead>
              <TableHead>Clinics</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => {
              const org = row["organization"] as { name: string };
              const usage = row["usage"] as { clinics: number };
              return (
                <TableRow key={String(row["id"])}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{String(row["plan"])}</TableCell>
                  <TableCell>
                    <StatusBadge value={String(row["status"])} />
                  </TableCell>
                  <TableCell>{new Date(String(row["startDate"])).toLocaleDateString()}</TableCell>
                  <TableCell>{row["renewalDate"] ? new Date(String(row["renewalDate"])).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{usage.clinics}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
