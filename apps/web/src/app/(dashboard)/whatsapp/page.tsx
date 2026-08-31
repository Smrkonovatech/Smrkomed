"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Plus,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AiCoordinationPanel } from "@/components/whatsapp/center/ai-coordination";
import { CarePlanWhatsAppBridge } from "@/components/whatsapp/center/care-plan-bridge";
import {
  PreviewBanner,
  WaMetric,
  WaSection,
  WaStatusPill,
} from "@/components/whatsapp/center/section";
import { EmptyState, LoadingRows } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";
import {
  DEMO_ACTIVITY,
  DEMO_ATTENTION,
  DEMO_AUTOMATIONS,
  FLAGSHIP_FLOW_STEPS,
} from "@/lib/whatsapp/center-demo";
import { cn } from "@/lib/utils";

type Overview = {
  connection: { connected: boolean; displayName: string | null; phone: string | null };
  today: {
    messagesSent: number;
    messagesReceived: number;
    activeFlows: number;
    completedFlows: number;
    failedFlows: number;
    pendingReplies: number;
    escalated: number;
    successRate: number | null;
  };
  activeConversations: number;
  templates: { approved: number; pending: number; rejected: number; total: number };
  hasData: boolean;
  workerNote: string;
};

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
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <EmptyState
          title="Unable to load Automation Center"
          description={error ?? "Please try again."}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  const live = overview.hasData;
  const t = overview.today;
  const messagesToday = live ? String(t.messagesSent + t.messagesReceived) : "2,481";
  const activeConvos = live ? String(overview.activeConversations) : "184";
  const automationsRunning = live ? String(t.activeFlows) : "28";
  const attention = live ? String(t.escalated + t.pendingReplies) : "12";

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm text-muted-foreground">
            Manage patient conversations, approved templates and automated care workflows.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {overview.connection.connected ? (
              <WaStatusPill
                label={`Connected · ${overview.connection.displayName ?? "WhatsApp"}`}
                tone="success"
              />
            ) : (
              <WaStatusPill label="WhatsApp not connected" tone="warning" />
            )}
            <WaStatusPill
              label={`${overview.templates.approved} templates approved`}
              tone="primary"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/whatsapp/templates/new">
              <Plus className="size-4" /> Create Template
            </Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/whatsapp/flows/new">
              <Plus className="size-4" /> Create Flow
            </Link>
          </Button>
        </div>
      </div>

      {!live ? <PreviewBanner /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WaMetric label="Messages today" value={messagesToday} hint={live ? "Sent + received" : "Sample"} />
        <WaMetric label="Active conversations" value={activeConvos} />
        <WaMetric label="Automations running" value={automationsRunning} />
        <WaMetric
          label="Patients requiring attention"
          value={attention}
          hint={live ? "Escalations + pending replies" : "Sample"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <WaSection
          title="Active automations"
          subtitle="Care Loop workflows currently coordinating patient communication"
          action={
            <Button asChild variant="ghost" size="sm" className="rounded-lg text-primary">
              <Link href="/whatsapp/automations">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <ul className="space-y-2">
            {DEMO_AUTOMATIONS.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3.5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{row.name}</p>
                    <WaStatusPill
                      label={row.status}
                      tone={row.status === "Needs Attention" ? "warning" : "success"}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Trigger: {row.trigger} · {row.patients.toLocaleString()} patients · {row.metric}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Last activity {row.lastActivity}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-lg">
                  <Link href={`/whatsapp/automations/${row.id}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        </WaSection>

        <WaSection title="Attention required" subtitle="Only important exceptions">
          <ul className="space-y-2">
            {(live
              ? [
                  t.pendingReplies > 0
                    ? {
                        id: "live-pending",
                        label: `${t.pendingReplies} conversations awaiting reply`,
                        tone: "warning" as const,
                      }
                    : null,
                  t.failedFlows > 0
                    ? {
                        id: "live-fail",
                        label: `${t.failedFlows} failed automation executions today`,
                        tone: "danger" as const,
                      }
                    : null,
                  t.escalated > 0
                    ? {
                        id: "live-esc",
                        label: `${t.escalated} escalations today`,
                        tone: "danger" as const,
                      }
                    : null,
                  overview.templates.rejected > 0
                    ? {
                        id: "live-rej",
                        label: `${overview.templates.rejected} template(s) rejected`,
                        tone: "danger" as const,
                      }
                    : null,
                ].filter(Boolean)
              : DEMO_ATTENTION
            ).map((item) =>
              item ? (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
                    item.tone === "danger"
                      ? "border-rose-200/80 bg-rose-50/50"
                      : "border-orange-200/80 bg-orange-50/50",
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      item.tone === "danger" ? "text-rose-700" : "text-orange-700",
                    )}
                  />
                  <span>{item.label}</span>
                </li>
              ) : null,
            )}
            {live && t.escalated === 0 && t.pendingReplies === 0 && t.failedFlows === 0 ? (
              <li className="flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2.5 text-sm text-emerald-900">
                <CheckCircle2 className="size-4" /> No urgent exceptions today.
              </li>
            ) : null}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full rounded-lg">
            <Link href="/whatsapp/inbox?filter=escalated">Open inbox exceptions</Link>
          </Button>
        </WaSection>
      </div>

      <WaSection title="Recent automation activity" subtitle="What Care Loop already did">
        <ul className="divide-y divide-border/60">
          {DEMO_ACTIVITY.map((row) => (
            <li key={`${row.time}-${row.title}`} className="flex flex-wrap items-start gap-4 py-3 first:pt-0 last:pb-0">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                {row.time}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {row.couple} · {row.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </WaSection>

      <CarePlanWhatsAppBridge />

      <WaSection
        title="Flagship flow · IVF Patient Care Journey"
        subtitle="Doctor-approved plan → Care Loop → WhatsApp → response → task / escalation"
        action={
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/whatsapp/flows/new">
              <Workflow className="size-3.5" /> Open builder
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {FLAGSHIP_FLOW_STEPS.map((step, index) => (
            <span
              key={step}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium"
            >
              <span className="grid size-4 place-items-center rounded-full bg-primary-soft text-[9px] font-bold text-primary">
                {index + 1}
              </span>
              {step}
            </span>
          ))}
        </div>
      </WaSection>

      <AiCoordinationPanel />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MessageCircle className="size-3.5" />
        {overview.workerNote}
      </p>
    </div>
  );
}
