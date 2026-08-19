"use client";

import Link from "next/link";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboard } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function DashboardPage() {
  const { data, error, loading } = useAsync(() => fetchDashboard(), []);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <EmptyState label="No platform data yet." />;

  const cards = [
    ["Organizations", data.totals.organizations],
    ["Clinics", data.totals.clinics],
    ["Active users", data.totals.activeUsers],
    ["Active subscriptions", data.totals.activeSubscriptions],
    ["WhatsApp connected", data.totals.whatsappConnected],
    ["Meta connected", data.totals.metaConnected],
    ["Google connected", data.totals.googleConnected],
    ["Leads", data.totals.leadCount],
    ["Campaigns", data.totals.campaignCount],
  ] as const;

  return (
    <div>
      <PageHeader title="Dashboard" description="Live platform totals from the Hono API." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold num-display">{value}</CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent signups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentSignups.length === 0 ? (
              <p className="text-muted-foreground">No organizations yet.</p>
            ) : (
              data.recentSignups.map((org) => (
                <Link key={org.id} href={`/organizations/${org.id}`} className="flex justify-between rounded-md px-2 py-1 hover:bg-muted">
                  <span>{org.name}</span>
                  <StatusBadge value={org.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integration errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentIntegrationErrors.length === 0 ? (
              <p className="text-muted-foreground">No integration errors.</p>
            ) : (
              data.recentIntegrationErrors.map((row) => (
                <div key={row.id} className="rounded-md border px-3 py-2">
                  <p className="font-medium">
                    {row.provider} · {row.clinic.organization.name}
                  </p>
                  <p className="text-muted-foreground">{row.lastError ?? row.status}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
