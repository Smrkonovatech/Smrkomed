"use client";

import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchIntegrationHealth } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function IntegrationHealthPage() {
  const { data, error, loading } = useAsync(() => fetchIntegrationHealth(), []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const totals = (data["totals"] ?? {}) as Record<string, number>;
  const items = (data["items"] ?? []) as Array<{
    id: string;
    provider: string;
    connectionStatus: string;
    lastError: string | null;
    lastSyncAt: string | null;
  }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration health"
        description="Stored connection state only. External providers are not probed."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(totals).map(([key, value]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm">{key}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
            <span>{row.provider}</span>
            <StatusBadge value={row.connectionStatus} />
            <span className="text-muted-foreground">{row.lastError ?? "No stored error"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
