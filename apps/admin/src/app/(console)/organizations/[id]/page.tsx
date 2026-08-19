"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOrganization, patchOrganization } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const [tick, setTick] = useState(0);
  const { data, error, loading } = useAsync(() => fetchOrganization(params.id), [params.id, tick]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const organization = data["organization"] as {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    createdAt: string;
    modules: Array<{ module: string; enabled: boolean }>;
    clinics: Array<{ id: string; name: string; city: string | null; _count: { patients: number; leads: number } }>;
    subscription: { plan: string; status: string } | null;
  };
  const users = (data["users"] as Array<{ id: string; name: string; email: string }>) ?? [];
  const integrations = (data["integrations"] as Array<{ id: string; provider: string; status: string }>) ?? [];
  const auditLogs = (data["auditLogs"] as Array<{ id: string; action: string; createdAt: string }>) ?? [];

  async function toggleStatus() {
    await patchOrganization(organization.id, { status: organization.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" });
    setTick((n) => n + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={organization.name} description={organization.slug ?? organization.id} />
      <div className="flex items-center gap-3">
        <StatusBadge value={organization.status} />
        <Button variant="outline" size="sm" onClick={() => void toggleStatus()}>
          {organization.status === "ACTIVE" ? "Suspend organization" : "Activate organization"}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clinics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {organization.clinics.map((clinic) => (
              <Link key={clinic.id} href={`/clinics/${clinic.id}`} className="block hover:underline">
                {clinic.name} · {clinic.city ?? "—"} · {clinic._count.patients} patients
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription & modules</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{organization.subscription ? `${organization.subscription.plan} · ${organization.subscription.status}` : "No subscription"}</p>
            <ul className="mt-3 space-y-1">
              {organization.modules.map((mod) => (
                <li key={mod.module}>
                  {mod.module}: {mod.enabled ? "Enabled" : "Disabled"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {users.map((user) => (
            <Link key={user.id} href={`/users/${user.id}`} className="block hover:underline">
              {user.name} · {user.email}
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {integrations.length === 0 ? <p className="text-muted-foreground">No connections.</p> : null}
          {integrations.map((row) => (
            <Link key={row.id} href={`/integrations/${row.id}`} className="block hover:underline">
              {row.provider} · {row.status}
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent audit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
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
