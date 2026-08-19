"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { disconnectIntegration, fetchIntegration } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAsync } from "@/lib/use-async";

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const { data, error, loading } = useAsync(() => fetchIntegration(params.id), [params.id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const org = data["organization"] as { name: string };
  const clinic = data["clinic"] as { name: string };

  async function onDisconnect() {
    try {
      await disconnectIntegration(params.id);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PROVIDER_DISCONNECT_NOT_IMPLEMENTED") {
        setMessage(err.message);
        return;
      }
      setMessage(err instanceof Error ? err.message : "Disconnect failed.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={String(data["provider"])} description={`${org.name} · ${clinic.name}`} />
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Status: <StatusBadge value={String(data["connectionStatus"])} />
          </p>
          <p>External account: {String(data["externalAccount"] ?? "—")}</p>
          <p>Last sync: {data["lastSyncAt"] ? new Date(String(data["lastSyncAt"])).toLocaleString() : "—"}</p>
          <p>Last webhook: {String(data["lastWebhook"] ?? "Not available yet")}</p>
          <p>Error: {String(data["lastError"] ?? "none")}</p>
          <Button variant="outline" size="sm" onClick={() => void onDisconnect()}>
            Request provider disconnect
          </Button>
          {message ? <p className="text-sm text-warning">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
