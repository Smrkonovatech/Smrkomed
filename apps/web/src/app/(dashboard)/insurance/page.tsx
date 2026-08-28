"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  IndianRupee,
  MessageSquareWarning,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  claimStatusLabel,
  claimStatusTone,
  formatDate,
  formatINR,
  priorityTone,
} from "@/components/insurance/format";
import { EmptyState, KpiCard, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type IntegrationStatus = {
  mode: string;
  label: string;
  nhcxConnected: boolean;
  note: string;
};

type Dashboard = {
  kpis: {
    activeClaims: number;
    pendingPreauth: number;
    approvedClaims: number;
    rejectedClaims: number;
    needsAction: number;
    documentsPending: number;
    openQueries: number;
    amountRequested: number;
    amountApproved: number;
    amountReceived: number;
  };
  actionCenter: Array<{
    id: string;
    type: "CLAIM" | "QUERY";
    claimId: string;
    claimNumber: string;
    patientLabel: string;
    insurance: string;
    action: string;
    priority: string;
    dueDate: string | null;
    status: string;
  }>;
  integration?: {
    active: IntegrationStatus;
    future: IntegrationStatus[];
  };
};

type IntegrationOverview = {
  active: IntegrationStatus;
  future: IntegrationStatus[];
};

export default function InsuranceDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [integration, setIntegration] = useState<IntegrationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [dash, status] = await Promise.all([
          apiGet<Dashboard>("/api/v1/insurance/dashboard"),
          apiGet<IntegrationOverview>("/api/v1/insurance/integration-status"),
        ]);
        if (!cancelled) {
          setData(dash);
          setIntegration(status);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load insurance dashboard.");
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
        <PageHeader title="Insurance & Claims" subtitle="Pre-auth, claims, and insurer coordination." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <PageHeader title="Insurance & Claims" subtitle="Pre-auth, claims, and insurer coordination." />
        <EmptyState
          title="Unable to load insurance dashboard."
          description={error ?? "Please try again."}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  const k = data.kpis;
  const active = integration?.active ?? data.integration?.active;
  const nhcx = integration?.future?.[0] ?? data.integration?.future?.[0];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Insurance & Claims"
        subtitle="Track pre-authorisations, claims, documents, and insurer queries."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-lg" onClick={() => router.push("/insurance/claims")}>
              View Claims
            </Button>
            <Button className="rounded-lg" onClick={() => router.push("/insurance/claims/new")}>
              New Claim
            </Button>
          </div>
        }
      />

      {(active || nhcx) && (
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">
                Integration: {active?.label ?? "Manual / Demo"}
                {nhcx ? ` · ${nhcx.label}` : " · NHCX Not Connected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {active?.note ??
                  "Clinic staff manage insurance workflows inside SmrkoMed. No live insurer or NHCX API is connected."}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard label="Active Claims" value={String(k.activeClaims)} icon={ClipboardList} tone="primary" />
        <KpiCard label="Pending Pre-auth" value={String(k.pendingPreauth)} icon={Shield} tone="warning" />
        <KpiCard label="Approved" value={String(k.approvedClaims)} icon={ShieldCheck} tone="success" />
        <KpiCard label="Rejected" value={String(k.rejectedClaims)} icon={XCircle} tone="danger" />
        <KpiCard label="Needs Attention" value={String(k.needsAction)} icon={AlertTriangle} tone="purple" />
        <KpiCard label="Documents Pending" value={String(k.documentsPending)} icon={FileWarning} tone="warning" />
        <KpiCard label="Open Queries" value={String(k.openQueries)} icon={MessageSquareWarning} tone="info" />
        <KpiCard label="Amount Requested" value={formatINR(k.amountRequested)} icon={IndianRupee} tone="teal" />
        <KpiCard label="Amount Approved" value={formatINR(k.amountApproved)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Amount Received" value={formatINR(k.amountReceived)} icon={IndianRupee} tone="primary" />
      </div>

      <section className="rounded-xl border bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Insurance Action Center</h2>
          <Button variant="outline" size="sm" className="rounded-lg" asChild>
            <Link href="/insurance/claims">All claims</Link>
          </Button>
        </div>
        {!data.actionCenter.length ? (
          <EmptyState
            title="Nothing needs attention."
            description="Claims and queries that need follow-up will appear here."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.actionCenter.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.claimNumber} · {item.patientLabel} · {item.insurance}
                    {item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={item.priority} tone={priorityTone(item.priority)} />
                  <StatusBadge label={claimStatusLabel(item.status)} tone={claimStatusTone(item.status)} />
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/insurance/claims/${item.claimId}`}>Open</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
