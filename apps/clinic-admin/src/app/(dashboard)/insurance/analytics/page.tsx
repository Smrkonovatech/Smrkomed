"use client";

import {
  CheckCircle2,
  IndianRupee,
  Percent,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  claimStatusLabel,
  claimStatusTone,
  formatINR,
} from "@/components/insurance/format";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, KpiCard, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type Analytics = {
  totals: {
    claims: number;
    approved: number;
    rejected: number;
    partiallyApproved: number;
    approvalRate: number;
    amountRequested: number;
    amountApproved: number;
    amountRejected: number;
    amountPaid: number;
    patientResponsibility: number;
  };
  byStatus: Array<{
    status: string;
    count: number;
    amountRequested: number;
    amountApproved: number;
    amountPaid: number;
  }>;
  byProvider: Array<{
    providerId: string;
    providerName: string;
    count: number;
    amountRequested: number;
    amountApproved: number;
    amountPaid: number;
  }>;
};

export default function InsuranceAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<Analytics>("/api/v1/insurance/analytics");
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <PageHeader title="Insurance Analytics" subtitle="Approval rates and claim financials." />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <PageHeader title="Insurance Analytics" subtitle="Approval rates and claim financials." />
        <EmptyState
          title="Unable to load analytics."
          description={error ?? "Please try again."}
          action={<Button onClick={() => void load()}>Retry</Button>}
        />
      </div>
    );
  }

  const t = data.totals;
  const ratePct = `${(t.approvalRate * 100).toFixed(1)}%`;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="Insurance Analytics" subtitle="Approval rates and claim financials across insurers." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard label="Total claims" value={String(t.claims)} icon={Shield} tone="primary" />
        <KpiCard label="Approved" value={String(t.approved)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Rejected" value={String(t.rejected)} icon={XCircle} tone="danger" />
        <KpiCard label="Approval rate" value={ratePct} icon={Percent} tone="info" />
        <KpiCard label="Partially approved" value={String(t.partiallyApproved)} icon={Shield} tone="warning" />
        <KpiCard label="Requested" value={formatINR(t.amountRequested)} icon={IndianRupee} tone="teal" />
        <KpiCard label="Approved amount" value={formatINR(t.amountApproved)} icon={IndianRupee} tone="success" />
        <KpiCard label="Paid" value={formatINR(t.amountPaid)} icon={IndianRupee} tone="primary" />
        <KpiCard label="Rejected amount" value={formatINR(t.amountRejected)} icon={IndianRupee} tone="danger" />
        <KpiCard
          label="Patient responsibility"
          value={formatINR(t.patientResponsibility)}
          icon={IndianRupee}
          tone="purple"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">By status</h2>
          </div>
          {!data.byStatus.length ? (
            <EmptyState title="No claim data yet." description="Status breakdown will appear after claims are created." />
          ) : (
            <>
              <MobileCards>
                {data.byStatus.map((row) => (
                  <RecordCard key={row.status}>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge label={claimStatusLabel(row.status)} tone={claimStatusTone(row.status)} />
                      <span className="font-semibold">{row.count}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Req {formatINR(row.amountRequested)} · Appr {formatINR(row.amountApproved)}
                    </p>
                  </RecordCard>
                ))}
              </MobileCards>
              <MdTableWrap>
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Count</th>
                      <th className="px-4 py-2 font-medium">Requested</th>
                      <th className="px-4 py-2 font-medium">Approved</th>
                      <th className="px-4 py-2 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byStatus.map((row) => (
                      <tr key={row.status} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <StatusBadge label={claimStatusLabel(row.status)} tone={claimStatusTone(row.status)} />
                        </td>
                        <td className="px-4 py-3">{row.count}</td>
                        <td className="px-4 py-3 tabular-nums">{formatINR(row.amountRequested)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatINR(row.amountApproved)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatINR(row.amountPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MdTableWrap>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">By provider</h2>
          </div>
          {!data.byProvider.length ? (
            <EmptyState title="No provider breakdown." description="Provider totals will appear after claims are filed." />
          ) : (
            <>
              <MobileCards>
                {data.byProvider.map((row) => (
                  <RecordCard key={row.providerId}>
                    <p className="font-semibold">{row.providerName}</p>
                    <p className="text-sm text-muted-foreground">{row.count} claims</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Req {formatINR(row.amountRequested)} · Paid {formatINR(row.amountPaid)}
                    </p>
                  </RecordCard>
                ))}
              </MobileCards>
              <MdTableWrap>
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Provider</th>
                      <th className="px-4 py-2 font-medium">Claims</th>
                      <th className="px-4 py-2 font-medium">Requested</th>
                      <th className="px-4 py-2 font-medium">Approved</th>
                      <th className="px-4 py-2 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProvider.map((row) => (
                      <tr key={row.providerId} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{row.providerName}</td>
                        <td className="px-4 py-3">{row.count}</td>
                        <td className="px-4 py-3 tabular-nums">{formatINR(row.amountRequested)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatINR(row.amountApproved)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatINR(row.amountPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MdTableWrap>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
