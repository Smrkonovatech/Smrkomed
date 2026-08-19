"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchClinic } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function ClinicDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading } = useAsync(() => fetchClinic(params.id), [params.id]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const clinic = data["clinic"] as {
    name: string;
    city: string | null;
    organization: { id: string; name: string };
    branches: Array<{ id: string; name: string; city: string | null }>;
    memberships: Array<{ user: { id: string; name: string; email: string }; role: { name: string } }>;
    integrations: Array<{ id: string; provider: string; connectionStatus: string }>;
  };
  const summaries = data["summaries"] as Record<string, number>;
  const auditLogs = (data["auditLogs"] as Array<{ id: string; action: string; createdAt: string }>) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={clinic.name} description={`${clinic.organization.name} · ${clinic.city ?? ""}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {Object.entries(summaries).map(([key, value]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm capitalize">{key}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold num-display">{value}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {clinic.branches.length === 0 ? "No branches." : clinic.branches.map((row) => <p key={row.id}>{row.name}</p>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {clinic.memberships.map((row) => (
            <Link key={row.user.id} href={`/users/${row.user.id}`} className="block hover:underline">
              {row.user.name} · {row.role.name}
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {clinic.integrations.length === 0 ? <p className="text-muted-foreground">No WhatsApp connections.</p> : null}
          {clinic.integrations.map((row) => (
            <div key={row.id} className="flex gap-2">
              <span>{row.provider}</span>
              <StatusBadge value={row.connectionStatus} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Audit</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {auditLogs.map((row) => (
            <p key={row.id}>
              {new Date(row.createdAt).toLocaleString()} · {row.action}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
