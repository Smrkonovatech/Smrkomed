"use client";

import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSystemHealth } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function SystemHealthPage() {
  const { data, error, loading } = useAsync(() => fetchSystemHealth(), []);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const rows = [
    ["API", data["api"]],
    ["Database", data["database"]],
    ["Web", data["web"]],
    ["Environment", data["environment"]],
    ["Version", data["version"]],
  ] as const;

  return (
    <div>
      <PageHeader title="System health" description="Only services that exist today. Redis and workers are not reported." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {typeof value === "string" && ["ok", "connected", "disconnected"].includes(value) ? (
                <StatusBadge value={value} />
              ) : (
                <p className="text-lg font-semibold">{String(value)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
