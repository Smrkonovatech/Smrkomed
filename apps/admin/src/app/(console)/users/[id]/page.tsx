"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUser, patchUser } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

const ROLES = [
  "CLINIC_ADMIN",
  "ORGANIZATION_ADMIN",
  "DOCTOR",
  "CARE_COORDINATOR",
  "NURSE",
  "RECEPTIONIST",
  "COUNSELOR",
  "MARKETING",
  "READ_ONLY",
] as const;

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const [tick, setTick] = useState(0);
  const { data, error, loading } = useAsync(() => fetchUser(params.id), [params.id, tick]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const user = data["user"] as {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    memberships: Array<{ id: string; role: { key: string; name: string }; clinic: { name: string; organization: { name: string } } }>;
  };
  const permissions = (data["permissions"] as string[]) ?? [];
  const auditLogs = (data["auditLogs"] as Array<{ id: string; action: string; createdAt: string }>) ?? [];
  const primary = user.memberships[0];

  async function toggleActive() {
    await patchUser(user.id, { isActive: !user.isActive });
    setTick((n) => n + 1);
  }

  async function changeRole(role: string) {
    await patchUser(user.id, { role, membershipId: primary?.id });
    setTick((n) => n + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={user.name} description={user.email} />
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge value={user.isActive ? "ACTIVE" : "DISABLED"} />
        <Button variant="outline" size="sm" onClick={() => void toggleActive()}>
          {user.isActive ? "Disable user" : "Enable user"}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {user.memberships.map((row) => (
            <p key={row.id}>
              {row.clinic.organization.name} · {row.clinic.name} · {row.role.name}
            </p>
          ))}
          {primary ? (
            <select
              className="mt-2 h-9 rounded-md border bg-background px-2 text-sm"
              value={primary.role.key}
              onChange={(e) => void changeRole(e.target.value)}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          {permissions.map((key) => (
            <span key={key} className="rounded-md bg-muted px-2 py-1">
              {key}
            </span>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {auditLogs.length === 0 ? <p>No audit history.</p> : null}
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
