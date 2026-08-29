"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Link2, Shield, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, KpiCard, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Dashboard = {
  connection: {
    connected: boolean;
    status: string;
    environment: string;
    message: string;
    facilityId: string | null;
    facilityConfigured: boolean;
    lastCheckedAt: string;
    demoLinkAllowed: boolean;
  };
  totals: {
    patientsLinkedToAbha: number;
    patientsNotLinked: number;
    pendingVerification: number;
    activeConsents: number;
    pendingConsentRequests: number;
    recordsShared: number;
    failedExchanges: number;
    totalPatients: number;
  };
  note: string | null;
};

type ConsentCenter = {
  cards: {
    active: number;
    pending: number;
    expiringSoon: number;
    revoked: number;
    rejected: number;
    expired: number;
  };
  items: Array<{
    id: string;
    patientName: string | null;
    purpose: string;
    requestedByName: string | null;
    requestedAt: string;
    expiresAt: string | null;
    status: string;
  }>;
};

export default function DigitalHealthDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [consents, setConsents] = useState<ConsentCenter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [dash, consentCenter] = await Promise.all([
        apiGet<Dashboard>("/api/v1/digital-health/dashboard"),
        apiGet<ConsentCenter>("/api/v1/digital-health/consents"),
      ]);
      setData(dash);
      setConsents(consentCenter);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load digital health dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function testConnection() {
    setTesting(true);
    try {
      const result = await apiPost<Dashboard["connection"]>("/api/v1/digital-health/abdm/test-connection", {});
      toast.message(result.message);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4">
        <PageHeader title="Digital Health" subtitle="ABHA identity, consent, and interoperability foundation." />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4">
        <PageHeader title="Digital Health" subtitle="ABHA identity, consent, and interoperability foundation." />
        <EmptyState title="Unable to load." description={error ?? ""} action={<Button onClick={() => void load()}>Retry</Button>} />
      </div>
    );
  }

  const t = data.totals;
  const c = data.connection;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Digital Health"
        subtitle="ABDM interoperability foundation — SMRKOMED remains the source of truth."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/settings">Settings</Link>
            </Button>
            <Button className="rounded-lg" disabled={testing} onClick={() => void testConnection()}>
              Test connection
            </Button>
          </div>
        }
      />

      <section className="rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">ABDM status</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Environment: {c.environment}
              {c.facilityId ? ` · Facility ${c.facilityId}` : " · Facility not configured"}
              {" · "}Checked {new Date(c.lastCheckedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {c.environment === "sandbox" && c.connected && (
              <span className="rounded-md bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase text-sky-900">
                ABDM SANDBOX
              </span>
            )}
            <StatusBadge
              label={c.connected ? "Connected" : "Not connected"}
              tone={c.connected ? "success" : "warning"}
            />
          </div>
        </div>
        {!c.connected && (
          <p className="mt-3 text-sm font-medium text-amber-900">ABDM connection required for live verification and exchange.</p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ABHA linked" value={String(t.patientsLinkedToAbha)} icon={Link2} tone="success" />
        <KpiCard label="Not linked" value={String(t.patientsNotLinked)} icon={Shield} tone="muted" />
        <KpiCard label="Pending verification" value={String(t.pendingVerification)} icon={ShieldAlert} tone="warning" />
        <KpiCard label="Active consents" value={String(t.activeConsents)} icon={Shield} tone="info" />
        <KpiCard label="Pending consent" value={String(t.pendingConsentRequests)} icon={ShieldAlert} tone="warning" />
        <KpiCard label="Records shared" value={String(t.recordsShared)} icon={Link2} tone="success" />
        <KpiCard label="Failed exchanges" value={String(t.failedExchanges)} icon={ShieldAlert} tone="danger" />
        <KpiCard label="Patients" value={String(t.totalPatients)} icon={Shield} tone="primary" />
      </div>

      {data.note && <p className="text-sm text-muted-foreground">{data.note}</p>}

      <section className="rounded-xl border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Consent center</h2>
        </div>
        {consents && (
          <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
            {Object.entries(consents.cards).map(([k, v]) => (
              <div key={k} className="rounded-lg border px-3 py-2">
                <p className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</p>
                <p className="text-lg font-semibold">{v}</p>
              </div>
            ))}
          </div>
        )}
        {!consents?.items.length ? (
          <EmptyState title="No consent requests." description="Create consent from a patient Digital Health tab." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Patient</th>
                  <th className="py-2 pr-3 font-medium">Purpose</th>
                  <th className="py-2 pr-3 font-medium">Requested by</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Expiry</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {consents.items.slice(0, 40).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{row.patientName ?? "—"}</td>
                    <td className="py-2 pr-3">{row.purpose}</td>
                    <td className="py-2 pr-3">{row.requestedByName ?? "—"}</td>
                    <td className="py-2 pr-3">{new Date(row.requestedAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-3">{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}</td>
                    <td className="py-2">
                      <StatusBadge label={row.status} tone={row.status === "ACTIVE" ? "success" : row.status === "PENDING" ? "warning" : "muted"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
