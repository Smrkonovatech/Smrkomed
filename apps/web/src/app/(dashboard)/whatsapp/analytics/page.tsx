"use client";

import { useEffect, useState } from "react";

import { EmptyState, KpiCard, LoadingRows, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";
import { MessageSquare, Send, Users, Workflow } from "lucide-react";

type Analytics = {
  rangeDays: number;
  hasData: boolean;
  emptyMessage: string | null;
  messages: { sent: number; delivered: number; read: number; failed: number; replies: number };
  conversations: { open: number; resolved: number; humanHandoff: number; escalated: number };
  consentRate: number | null;
  automationByStatus: Record<string, number>;
  staffWorkload: Array<{ staffId: string | null; name: string; assignedConversations: number }>;
};

export default function WhatsAppAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setData(await apiGet<Analytics>("/api/v1/whatsapp-automation/analytics/detailed"));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Unable to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Analytics" subtitle="Real clinic-scoped metrics (last 30 days)." />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Unable to load analytics"
        description={error ?? "Try again."}
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  if (!data.hasData) {
    return (
      <div className="space-y-4">
        <PageHeader title="Analytics" subtitle="Real clinic-scoped metrics (last 30 days)." />
        <EmptyState title="Not enough data yet." description="Send templates, run flows, or receive replies to populate metrics." />
      </div>
    );
  }

  const m = data.messages;
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader title="Analytics" subtitle={`Last ${data.rangeDays} days · clinic scoped · never invented KPIs.`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Sent" value={String(m.sent)} icon={Send} />
        <KpiCard label="Delivered" value={String(m.delivered)} icon={Send} />
        <KpiCard label="Replies" value={String(m.replies)} icon={MessageSquare} />
        <KpiCard label="Failed" value={String(m.failed)} icon={Send} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open conversations" value={String(data.conversations.open)} icon={Users} />
        <KpiCard label="Resolved / closed" value={String(data.conversations.resolved)} icon={Users} />
        <KpiCard label="Human handoff" value={String(data.conversations.humanHandoff)} icon={Users} />
        <KpiCard label="Escalated" value={String(data.conversations.escalated)} icon={Workflow} />
      </div>

      <section className="surface-card space-y-2 p-4">
        <h2 className="text-sm font-semibold">Consent rate</h2>
        <p className="text-sm text-muted-foreground">
          {data.consentRate == null ? "Not enough consent records." : `${data.consentRate}% GRANTED of recorded WhatsApp consents`}
        </p>
      </section>

      <section className="surface-card space-y-2 p-4">
        <h2 className="text-sm font-semibold">Automation (30d)</h2>
        {Object.keys(data.automationByStatus).length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough data yet.</p>
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {Object.entries(data.automationByStatus).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-card space-y-2 p-4">
        <h2 className="text-sm font-semibold">Staff workload</h2>
        <p className="text-xs text-muted-foreground">Operational visibility — not a punitive ranking.</p>
        {data.staffWorkload.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assigned conversations yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.staffWorkload.map((s) => (
              <li key={s.staffId ?? s.name}>
                {s.name}: {s.assignedConversations} assigned
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
