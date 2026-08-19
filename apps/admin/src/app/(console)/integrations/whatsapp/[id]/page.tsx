"use client";

import { useParams } from "next/navigation";

import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWhatsAppDetail } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function WhatsAppAdminDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading } = useAsync(() => fetchWhatsAppDetail(params.id), [params.id]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;
  const org = data["organization"] as { name: string };
  const clinic = data["clinic"] as { name: string };
  const templates = data["templates"] as Record<string, number>;
  const messages = data["messages"] as Record<string, number>;
  const events = (data["recentEvents"] as Array<Record<string, unknown>>) ?? [];
  const errors = (data["recentErrors"] as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={`${clinic.name} WhatsApp`} description={`${org.name} · platform monitoring only`} />
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Status: <StatusBadge value={String(data["connectionStatus"])} />
          </p>
          <p>WABA: {String(data["waba"] ?? "—")}</p>
          <p>Phone: {String(data["phone"] ?? "—")}</p>
          <p>Last sync: {data["lastSyncAt"] ? new Date(String(data["lastSyncAt"])).toLocaleString() : "—"}</p>
          <p>Last webhook: {data["lastWebhook"] ? new Date(String((data["lastWebhook"] as { receivedAt: string }).receivedAt)).toLocaleString() : "—"}</p>
          <p>Error: {String(data["lastError"] ?? "none")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Approved templates: {templates?.["approved"] ?? 0}</p>
          <p>Pending templates: {templates?.["pending"] ?? 0}</p>
          <p>Rejected templates: {templates?.["rejected"] ?? 0}</p>
          <p>Messages sent: {messages?.["sent"] ?? 0}</p>
          <p>Inbound: {messages?.["inbound"] ?? 0}</p>
          <p>Delivered: {messages?.["delivered"] ?? 0}</p>
          <p>Read: {messages?.["read"] ?? 0}</p>
          <p>Failed: {messages?.["failed"] ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {events.length === 0 ? <p className="text-muted-foreground">No events yet.</p> : null}
          {events.map((event) => (
            <p key={String(event["id"])}>
              {String(event["eventType"])} · {String(event["status"])} · {new Date(String(event["receivedAt"])).toLocaleString()}
            </p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent errors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {errors.length === 0 ? <p className="text-muted-foreground">No errors.</p> : null}
          {errors.map((event) => (
            <p key={String(event["id"])}>
              {String(event["eventType"])} · {String(event["error"] ?? event["status"])} · {new Date(String(event["receivedAt"])).toLocaleString()}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
