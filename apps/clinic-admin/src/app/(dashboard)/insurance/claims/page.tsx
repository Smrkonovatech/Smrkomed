"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CLAIM_STATUS_FILTERS,
  claimStatusLabel,
  claimStatusTone,
  formatDate,
  formatINR,
  type PageResult,
} from "@/components/insurance/format";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiGet } from "@/lib/api/client";

type ClaimRow = {
  id: string;
  claimNumber: string;
  patientName: string | null;
  coupleLabel: string | null;
  providerName: string | null;
  tpaName: string | null;
  treatmentLabel: string | null;
  claimType: string;
  amountRequested: number;
  amountApproved: number;
  status: string;
  coordinatorName: string | null;
  updatedAt: string;
};

export default function InsuranceClaimsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [data, setData] = useState<PageResult<ClaimRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (query.trim()) params.set("q", query.trim());
    if (status && status !== "ALL") params.set("status", status);
    try {
      const next = await apiGet<PageResult<ClaimRow>>(`/api/v1/insurance/claims?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load claims.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [query, status]);

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Claims"
        subtitle="Pre-authorisations and treatment claims across insurers."
        actions={
          <Button className="rounded-lg" asChild>
            <Link href="/insurance/claims/new">
              <Plus className="size-4" /> New Claim
            </Link>
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search claim ID, patient, insurer…"
            className="h-9 max-w-md rounded-lg"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[200px] rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "All statuses" : claimStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingRows rows={5} />
        ) : error ? (
          <EmptyState
            title="Unable to load claims."
            description={error}
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : !data?.items.length ? (
          <EmptyState
            title="No claims found."
            description="Create a claim to start pre-authorisation or reimbursement."
            action={
              <Button asChild>
                <Link href="/insurance/claims/new">
                  <Plus className="size-4" /> New Claim
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((claim) => (
                <RecordCard key={claim.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{claim.claimNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {claim.coupleLabel ?? claim.patientName ?? "Patient"}
                      </p>
                    </div>
                    <StatusBadge label={claimStatusLabel(claim.status)} tone={claimStatusTone(claim.status)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {claim.providerName ?? "—"} · {claim.treatmentLabel ?? claim.claimType}
                  </p>
                  <p className="mt-1 text-sm tabular-nums">
                    Req {formatINR(claim.amountRequested)} · Appr {formatINR(claim.amountApproved)}
                  </p>
                  <Button size="sm" variant="outline" className="mt-3 w-full" asChild>
                    <Link href={`/insurance/claims/${claim.id}`}>View</Link>
                  </Button>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Claim ID</th>
                    <th className="px-4 py-2 font-medium">Patient / Couple</th>
                    <th className="px-4 py-2 font-medium">Provider</th>
                    <th className="px-4 py-2 font-medium">TPA</th>
                    <th className="px-4 py-2 font-medium">Treatment</th>
                    <th className="px-4 py-2 font-medium">Claim Type</th>
                    <th className="px-4 py-2 font-medium">Requested</th>
                    <th className="px-4 py-2 font-medium">Approved</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Coordinator</th>
                    <th className="px-4 py-2 font-medium">Updated</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((claim) => (
                    <tr key={claim.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{claim.claimNumber}</td>
                      <td className="px-4 py-3">{claim.coupleLabel ?? claim.patientName ?? "—"}</td>
                      <td className="px-4 py-3">{claim.providerName ?? "—"}</td>
                      <td className="px-4 py-3">{claim.tpaName ?? "—"}</td>
                      <td className="px-4 py-3">{claim.treatmentLabel ?? "—"}</td>
                      <td className="px-4 py-3">{claim.claimType.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(claim.amountRequested)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(claim.amountApproved)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={claimStatusLabel(claim.status)} tone={claimStatusTone(claim.status)} />
                      </td>
                      <td className="px-4 py-3">{claim.coordinatorName ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(claim.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/insurance/claims/${claim.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
          </>
        )}
      </section>
    </div>
  );
}
