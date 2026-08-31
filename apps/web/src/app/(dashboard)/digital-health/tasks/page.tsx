"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

import { EmptyState, KpiCard, LoadingRows, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type Tasks = {
  cards: {
    withoutAbha: number;
    authenticationPending: number;
    consentPending: number;
    abhaLinked: number;
    recordRequestsPending: number;
  };
};

export default function AbdmTasksPage() {
  const [data, setData] = useState<Tasks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await apiGet<Tasks>("/api/v1/digital-health/tasks");
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load ABDM tasks.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingRows rows={3} />;
  if (error || !data) {
    return <EmptyState title="Unable to load tasks" description={error ?? ""} icon={Shield} />;
  }

  const c = data.cards;

  return (
    <div className="space-y-5">
      <PageHeader
        title="ABDM Tasks"
        subtitle="Operational queue for coordinators — registration, authentication, consent, and record follow-ups."
        actions={
          <Button asChild variant="outline">
            <Link href="/patients">Open patients</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Without ABHA" value={String(c.withoutAbha)} icon={Shield} tone="warning" />
        <KpiCard label="Auth pending" value={String(c.authenticationPending)} icon={Shield} tone="warning" />
        <KpiCard label="Consent pending" value={String(c.consentPending)} icon={Shield} tone="info" />
        <KpiCard label="ABHA linked" value={String(c.abhaLinked)} icon={Shield} tone="success" />
        <KpiCard label="Record issues" value={String(c.recordRequestsPending)} icon={Shield} tone="danger" />
      </div>

      <section className="rounded-xl border bg-card p-4 text-sm">
        <h2 className="font-semibold">Coordinator actions</h2>
        <ul className="mt-2 list-inside list-disc text-muted-foreground">
          <li>Create / Link ABHA from the patient Digital Health tab</li>
          <li>Retry authentication when status is pending</li>
          <li>Send patient a secure setup link via WhatsApp templates (never collect Aadhaar/OTP in chat)</li>
          <li>Request consent, then discover records only after grant</li>
          <li>Check Activity for failed transactions</li>
        </ul>
      </section>
    </div>
  );
}
