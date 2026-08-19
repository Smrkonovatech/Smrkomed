"use client";

import Link from "next/link";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWhatsApp } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function WhatsAppAdminPage() {
  const { data, error, loading } = useAsync(() => fetchWhatsApp(), []);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  const accounts = (data?.["connectedClinics"] as Array<Record<string, unknown>>) ?? [];
  const templates = data?.["templates"] as Record<string, number> | undefined;
  const totals = data?.["totals"] as Record<string, number> | undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp" description="Connection monitoring only. Tokens and patient message content are never shown." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">Connected</p>
            <p className="text-2xl font-semibold">{totals?.["connected"] ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">Action required</p>
            <p className="text-2xl font-semibold">{totals?.["actionRequired"] ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs uppercase text-muted-foreground">Errors</p>
            <p className="text-2xl font-semibold">{totals?.["errors"] ?? 0}</p>
          </CardContent>
        </Card>
      </div>
      {accounts.length === 0 ? <EmptyState label="No WhatsApp accounts connected." /> : null}
      {accounts.map((row) => {
        const templatesRow = row["templates"] as Record<string, number> | undefined;
        return (
          <Card key={String(row["id"])}>
            <CardHeader>
              <CardTitle>
                <Link className="hover:underline" href={`/integrations/whatsapp/${String(row["id"])}`}>
                  {String(row["clinicName"])} · {String(row["organizationName"])}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                Status: <StatusBadge value={String(row["connectionStatus"])} />
              </p>
              <p>WABA: {String(row["waba"] ?? "—")}</p>
              <p>Phone: {String(row["phone"] ?? "—")}</p>
              <p>
                Templates: {templatesRow?.["approved"] ?? 0} approved · {templatesRow?.["pending"] ?? 0} pending ·{" "}
                {templatesRow?.["rejected"] ?? 0} rejected
              </p>
              <p>Last webhook: {row["lastWebhook"] ? new Date(String((row["lastWebhook"] as { receivedAt: string }).receivedAt)).toLocaleString() : "—"}</p>
              <p>Last message: {row["lastMessage"] ? new Date(String((row["lastMessage"] as { createdAt: string }).createdAt)).toLocaleString() : "—"}</p>
              <p>Last error: {String(row["lastError"] ?? "none")}</p>
            </CardContent>
          </Card>
        );
      })}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Total: {templates?.["total"] ?? 0} · Approved: {templates?.["approved"] ?? 0} · Pending:{" "}
            {templates?.["pending"] ?? 0} · Rejected: {templates?.["rejected"] ?? 0}
          </p>
          <p className="mt-2">{String(data?.["note"] ?? "")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
