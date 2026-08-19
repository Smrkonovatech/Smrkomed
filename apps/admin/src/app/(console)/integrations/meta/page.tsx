"use client";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMeta } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function MetaAdminPage() {
  const { data, error, loading } = useAsync(() => fetchMeta(), []);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  const connections = (data?.["connections"] as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Meta Ads" description="Management shell only. No Meta API calls." />
      {connections.length === 0 ? <EmptyState label="No Meta Ads connections." /> : null}
      {connections.map((row) => {
        const org = row["organization"] as { name: string };
        const clinic = row["clinic"] as { name: string };
        return (
          <Card key={String(row["id"])}>
            <CardHeader>
              <CardTitle>
                {org.name} · {clinic.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>
                Ad account: <StatusBadge value={String(row["connectionStatus"])} />
              </p>
              <p>Last sync: {row["lastSyncAt"] ? new Date(String(row["lastSyncAt"])).toLocaleString() : "—"}</p>
              <p>Campaigns: {String(row["campaignCount"])}</p>
              <p>Lead sync: {String(row["leadSyncStatus"])}</p>
              <p>Error: {String(row["lastError"] ?? "none")}</p>
            </CardContent>
          </Card>
        );
      })}
      <p className="text-sm text-muted-foreground">{String(data?.["note"] ?? "")}</p>
    </div>
  );
}
