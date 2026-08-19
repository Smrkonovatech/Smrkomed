"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Heart, Phone, TrendingUp, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { AddLeadForm } from "@/components/crm/add-lead-form";
import { EmptyState, KpiCard, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type Summary = {
  totals: {
    totalLeads: number;
    newLeads: number;
    uncontactedLeads: number;
    qualifiedLeads: number;
    consultationsBooked: number;
    treatmentStarted: number;
    lostLeads: number;
    followUpsDueToday: number;
    overdueFollowUps: number;
    conversionRate: number;
  };
  treatmentInterest: Array<{ interest: string; leads: number }>;
  sources: Array<{ source: string; label: string; leads: number }>;
  campaigns: Array<{ id: string; name: string; source: string; status: string; leads: number }>;
};

type FollowUp = {
  overdue: number;
  items: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    overdue: boolean;
    lead: { id: string; name: string } | null;
  }>;
};

export default function CrmDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextSummary, nextFollowUps] = await Promise.all([
          apiGet<Summary>("/api/v1/crm/summary"),
          apiGet<FollowUp>("/api/v1/crm/follow-ups?page=1&pageSize=8"),
        ]);
        if (cancelled) return;
        setSummary(nextSummary);
        setFollowUps(nextFollowUps);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load CRM.");
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
        <PageHeader title="CRM" subtitle="Fertility lead pipeline and counsellor follow-up." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <PageHeader title="CRM" subtitle="Fertility lead pipeline and counsellor follow-up." />
        <EmptyState title="Unable to load leads." description={error ?? "Please try again."} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />
      </div>
    );
  }

  const t = summary.totals;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="CRM"
        subtitle="Where this couple came from, who owns the conversation, and what happens next."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-lg" onClick={() => router.push("/crm/pipeline")}>
              Pipeline
            </Button>
            <Button variant="outline" className="rounded-lg" onClick={() => router.push("/crm/campaigns")}>
              Campaigns
            </Button>
            <AddLeadForm onCreated={(id) => router.push(`/crm/leads/${id}`)} />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Total leads" value={String(t.totalLeads)} icon={Users} tone="primary" />
        <KpiCard label="New leads" value={String(t.newLeads)} icon={UserPlus} tone="info" />
        <KpiCard label="Qualified" value={String(t.qualifiedLeads)} icon={Heart} tone="teal" />
        <KpiCard label="Consultations" value={String(t.consultationsBooked)} icon={CalendarCheck} tone="success" />
        <KpiCard label="Treatment started" value={String(t.treatmentStarted)} icon={TrendingUp} tone="purple" />
        <KpiCard label="Conversion rate" value={`${t.conversionRate}%`} hint="Treatment started / total leads" icon={Phone} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Follow-ups today</h2>
            {t.overdueFollowUps > 0 && (
              <Link href="/crm/leads?overdue=1" className="text-sm font-medium text-danger">
                {t.overdueFollowUps} follow-ups overdue
              </Link>
            )}
          </div>
          {!followUps?.items.length ? (
            <EmptyState title="No follow-ups due today." description="When a counsellor schedules a call, it will appear here." />
          ) : (
            <ul className="space-y-2">
              {followUps.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.lead?.name ?? "Lead"}</p>
                    <p className="text-muted-foreground">{item.title}</p>
                  </div>
                  {item.lead && (
                    <Link className="text-primary" href={`/crm/leads/${item.lead.id}`}>
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border bg-background p-4">
          <h2 className="mb-3 text-sm font-semibold">Lead sources</h2>
          {summary.sources.length === 0 ? (
            <EmptyState title="No leads yet." description="Website, WhatsApp and walk-in enquiries will appear as sources." />
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.sources.map((row) => (
                <li key={row.source} className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <StatusBadge label={String(row.leads)} tone="muted" dot={false} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-background p-4">
          <h2 className="mb-3 text-sm font-semibold">Treatment interest</h2>
          <ul className="space-y-2 text-sm">
            {summary.treatmentInterest.map((row) => (
              <li key={row.interest} className="flex justify-between">
                <span>{row.interest}</span>
                <span className="text-muted-foreground">{row.leads}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Campaign performance</h2>
            <Link href="/crm/campaigns" className="text-sm text-primary">
              View all
            </Link>
          </div>
          {summary.campaigns.length === 0 ? (
            <EmptyState title="No campaigns created." description="Create a campaign to attribute IVF and IUI enquiries." />
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.campaigns.map((row) => (
                <li key={row.id} className="flex items-center justify-between">
                  <Link href={`/crm/campaigns/${row.id}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                  <span className="text-muted-foreground">{row.leads} leads</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
