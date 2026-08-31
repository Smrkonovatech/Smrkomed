"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  MessageCircle,
  MessageSquare,
  Send,
  Workflow,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, KpiCard, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type Overview = {
  connection: { connected: boolean; displayName: string | null; phone: string | null };
  today: {
    messagesSent: number;
    messagesDelivered?: number;
    messagesFailed?: number;
    messagesRead?: number;
    messagesReceived: number;
    patientReplies?: number;
    activeFlows: number;
    completedFlows: number;
    failedFlows: number;
    waitingExecutions?: number;
    pendingReplies: number;
    escalated: number;
    successRate: number | null;
    skippedAutomation?: number;
  };
  consent?: { granted: number; revoked: number; eligible: number; blocked: number };
  knowledgeBase?: { published: number };
  activeConversations: number;
  templates: { approved: number; pending: number; rejected: number; total: number };
  hasData: boolean;
  workerNote: string;
};

function metricValue(n: number, hasData: boolean) {
  if (!hasData && n === 0) return "Not enough data";
  return String(n);
}

export default function WhatsAppOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiGet<Overview>("/api/v1/whatsapp-automation/overview");
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load WhatsApp overview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <PageHeader title="WhatsApp Automation" subtitle="Clinic communication + workflow center." />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <PageHeader title="WhatsApp Automation" subtitle="Clinic communication + workflow center." />
        <EmptyState
          title="Unable to load WhatsApp overview."
          description={error ?? "Please try again."}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  const hasData = overview.hasData;
  const t = overview.today;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="WhatsApp Automation"
        subtitle="Real database counts for this clinic. Never invented KPIs."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/whatsapp/inbox">Open Inbox</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/whatsapp/flows">Flows</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {overview.connection.connected ? (
          <StatusBadge
            label={`Connected · ${overview.connection.displayName ?? "WhatsApp"}${overview.connection.phone ? ` · ${overview.connection.phone}` : ""}`}
            tone="success"
          />
        ) : (
          <StatusBadge label="Not connected — connect WhatsApp to activate live messaging" tone="warning" />
        )}
        <span className="text-muted-foreground">
          Templates: {overview.templates.approved} approved
          {overview.templates.pending ? ` · ${overview.templates.pending} pending Meta` : ""}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Messages sent today" value={metricValue(t.messagesSent, hasData)} icon={Send} />
        <KpiCard label="Delivered today" value={metricValue(t.messagesDelivered ?? 0, hasData)} icon={CheckCircle2} />
        <KpiCard label="Replies today" value={metricValue(t.messagesReceived, hasData)} icon={MessageSquare} />
        <KpiCard label="Active conversations" value={metricValue(overview.activeConversations, hasData)} icon={MessageCircle} />
        <KpiCard label="Active flows" value={String(t.activeFlows)} icon={Workflow} />
        <KpiCard label="Pending (waiting)" value={metricValue(t.pendingReplies, hasData)} icon={Bell} />
        <KpiCard
          label="Failed today"
          value={metricValue(t.failedFlows, hasData || t.completedFlows > 0)}
          icon={XCircle}
          tone="danger"
        />
        <KpiCard
          label="Skipped (safety)"
          value={metricValue(t.skippedAutomation ?? 0, hasData || (t.skippedAutomation ?? 0) > 0)}
          icon={AlertTriangle}
        />
      </div>

      <section className="surface-card space-y-3 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Consent & knowledge</h2>
        {overview.consent ? (
          <p className="text-sm text-muted-foreground">
            Consent eligible: {overview.consent.eligible} · Revoked/blocked: {overview.consent.blocked}
            {overview.knowledgeBase
              ? ` · Published KB articles: ${overview.knowledgeBase.published}`
              : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Not enough consent data yet.</p>
        )}
      </section>

      <section className="surface-card space-y-3 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Attention</h2>
        {t.escalated > 0 ? (
          <p className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 text-warning-foreground" />
            {t.escalated} automation(s) escalated today — staff response may be needed.
            <Link href="/whatsapp/logs" className="text-primary hover:underline">
              View logs
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No escalations recorded today.</p>
        )}
      </section>

      <section className="surface-card space-y-3 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Automation health</h2>
        {t.successRate == null ? (
          <p className="text-sm text-muted-foreground">Not enough data — no completed or failed executions today.</p>
        ) : (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-success" />
            {t.successRate}% successful today ({t.completedFlows} completed · {t.failedFlows} failed)
          </p>
        )}
        <p className="text-xs text-muted-foreground">{overview.workerNote}</p>
      </section>
    </div>
  );
}
