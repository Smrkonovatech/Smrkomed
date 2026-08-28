"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  claimStatusLabel,
  claimStatusTone,
  formatDate,
  formatINR,
  policyStatusTone,
} from "@/components/insurance/format";
import { EmptyState, LoadingRows, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type Overview = {
  summary: {
    policies: number;
    activePolicies: number;
    claims: number;
    activeClaims: number;
    openQueries: number;
    amountRequested: number;
    amountApproved: number;
    amountPaid: number;
  };
  policies: Array<{
    id: string;
    policyName: string;
    policyNumber: string;
    providerName: string | null;
    status: string;
    eligibilityStatus: string;
    sumInsured: number;
    availableCoverage: number;
    expiryDate: string | null;
  }>;
  claims: Array<{
    id: string;
    claimNumber: string;
    treatmentLabel: string | null;
    status: string;
    amountRequested: number;
    amountApproved: number;
    updatedAt: string;
    providerName: string | null;
  }>;
};

export function PatientInsuranceTab({
  coupleId,
  patientId,
}: {
  coupleId: string;
  patientId?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!coupleId) {
        setLoading(false);
        return;
      }
      try {
        const next = await apiGet<Overview>(`/api/v1/insurance/couples/${coupleId}/overview`);
        if (!cancelled) setData(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load insurance overview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coupleId]);

  const policyHref = `/insurance/policies/new?coupleId=${encodeURIComponent(coupleId)}${
    patientId ? `&patientId=${encodeURIComponent(patientId)}` : ""
  }`;
  const claimHref = `/insurance/claims/new?coupleId=${encodeURIComponent(coupleId)}`;

  if (loading) return <LoadingRows rows={4} />;

  if (error || !data) {
    return (
      <EmptyState
        title="Insurance records will appear for patients linked in clinic records."
        description={error ?? "No insurance overview is available for this couple yet."}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={policyHref}>Add Policy</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={claimHref}>New Claim</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const hasActivePolicy = data.summary.activePolicies > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Insurance Overview</h3>
          <p className="text-xs text-muted-foreground">
            {data.summary.activePolicies} active polic{data.summary.activePolicies === 1 ? "y" : "ies"} ·{" "}
            {data.summary.activeClaims} active claim{data.summary.activeClaims === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={policyHref}>Add Policy</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={claimHref}>New Claim</Link>
          </Button>
        </div>
      </div>

      <section className="rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={hasActivePolicy ? "Policy on file" : "No active policy"}
            tone={hasActivePolicy ? "info" : "muted"}
          />
          {hasActivePolicy && (
            <StatusBadge label="Treatment Coverage: Verification Required" tone="warning" />
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          An active policy does not mean treatment is covered. Verify eligibility and benefits before counselling
          the patient.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          <p>
            Requested <span className="font-semibold tabular-nums">{formatINR(data.summary.amountRequested)}</span>
          </p>
          <p>
            Approved <span className="font-semibold tabular-nums">{formatINR(data.summary.amountApproved)}</span>
          </p>
          <p>
            Received <span className="font-semibold tabular-nums">{formatINR(data.summary.amountPaid)}</span>
          </p>
        </div>
      </section>

      <section className="rounded-xl border bg-background p-4">
        <h4 className="mb-3 text-sm font-semibold">Policies</h4>
        {!data.policies.length ? (
          <EmptyState title="No policies yet." description="Add a policy to begin pre-authorisation." />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.policies.map((policy) => (
              <li key={policy.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div>
                  <p className="font-medium">{policy.policyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {policy.providerName ?? "Insurer"} · {policy.policyNumber} · Sum {formatINR(policy.sumInsured)}
                  </p>
                </div>
                <StatusBadge label={policy.status.replaceAll("_", " ")} tone={policyStatusTone(policy.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-background p-4">
        <h4 className="mb-3 text-sm font-semibold">Claims</h4>
        {!data.claims.length ? (
          <EmptyState title="No claims yet." description="Create a claim when pre-auth or reimbursement is needed." />
        ) : (
          <ul className="space-y-2 text-sm">
            {data.claims.map((claim) => (
              <li key={claim.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div>
                  <Link href={`/insurance/claims/${claim.id}`} className="font-medium hover:underline">
                    {claim.claimNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {claim.treatmentLabel ?? claim.providerName ?? "Claim"} · {formatDate(claim.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">{formatINR(claim.amountRequested)}</span>
                  <StatusBadge label={claimStatusLabel(claim.status)} tone={claimStatusTone(claim.status)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-background p-4">
        <h4 className="mb-2 text-sm font-semibold">Pre-auths & documents</h4>
        <p className="text-sm text-muted-foreground">
          Pre-authorisation status follows each claim. Attach policy cards, estimates, and clinical documents from
          the Documents tab, then link them on the claim detail page.
        </p>
        {data.summary.openQueries > 0 && (
          <p className="mt-2 text-sm text-amber-700">
            {data.summary.openQueries} open insurer quer{data.summary.openQueries === 1 ? "y" : "ies"} need a
            response.
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-background p-4">
        <h4 className="mb-3 text-sm font-semibold">Recent claim activity</h4>
        {!data.claims.length ? (
          <p className="text-sm text-muted-foreground">Timeline will populate as claims progress.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.claims.slice(0, 8).map((claim) => (
              <li key={`tl-${claim.id}`} className="flex justify-between gap-2 rounded-lg border px-3 py-2">
                <span>
                  <Link href={`/insurance/claims/${claim.id}`} className="font-medium hover:underline">
                    {claim.claimNumber}
                  </Link>{" "}
                  · {claimStatusLabel(claim.status)}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(claim.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
