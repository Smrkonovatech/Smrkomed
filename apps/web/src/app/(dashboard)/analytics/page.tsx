"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck2,
  FileText,
  HeartPulse,
  Layers,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { KpiCard, PageHeader, ProgressBar, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { clinicApi } from "@/lib/clinic-api";

interface AnalyticsOverviewData {
  organization: {
    totalPatients: number;
    newPatients: number;
    activePatients: number;
    totalAppointments: number;
    completedAppointments: number;
    noShowAppointments: number;
    activeTreatments: number;
    activeJourneys: number;
    taskCompletionRate: number;
    escalationsCount: number;
  };
  careLoop: {
    tasksCreated: number;
    tasksCompleted: number;
    tasksOverdue: number;
    tasksEscalated: number;
    patientResponseRate: number;
    automationSuccessCount: number;
    humanHandoffCount: number;
    averageResolutionHours: number;
    weeklyTrends: Array<{ day: string; created: number; completed: number }>;
  };
  patientEngagement: {
    messagesSent: number;
    messagesDelivered: number;
    messagesRead: number;
    patientResponses: number;
    taskCompletionCount: number;
    noResponseCount: number;
    deliveryRate: number;
    readRate: number;
    responseRate: number;
  };
  clinicalOperations: {
    reportsPending: number;
    reportsReviewed: number;
    followUpsCount: number;
    activeJourneys: number;
    dischargeQueue: number;
  };
  fertility: {
    activeIvfCycles: number;
    journeyStages: Array<{ stageName: string; count: number }>;
    monitoringWorkload: number;
    procedureWorkload: number;
    followUpWorkload: number;
    outcomes: { positive: number; negative: number; ongoing: number; total: number };
  };
  billing: {
    totalRevenue: number;
    totalPayments: number;
    outstanding: number;
    treatmentRevenue: number;
    pharmacyRevenue: number;
    collectionRate: number;
    packagesInvoicedCount?: number;
  };
  staff?: {
    totalStaffTasks: number;
    staffWorkload: Array<{
      role: string;
      totalTasks: number;
      completed: number;
      overdue: number;
      escalated: number;
      completionRate: number;
      workloadPct: number;
    }>;
  };
}

function TrendsBarChart({
  data,
  keyA,
  keyB,
  labelKey,
}: {
  data: Array<Record<string, string | number>>;
  keyA: string;
  keyB: string;
  labelKey: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(Number(d[keyA]) || 0, Number(d[keyB]) || 0)));
  return (
    <div className="flex h-48 min-h-48 items-end gap-3 overflow-x-auto pt-4">
      {data.map((d) => (
        <div key={String(d[labelKey])} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex h-36 w-full items-end justify-center gap-1.5">
            <div
              className="w-1/2 rounded-t-md bg-primary transition-all duration-500"
              style={{ height: `${((Number(d[keyA]) || 0) / max) * 100}%` }}
              title={`${keyA}: ${d[keyA]}`}
            />
            <div
              className="w-1/2 rounded-t-md bg-emerald-500 transition-all duration-500"
              style={{ height: `${((Number(d[keyB]) || 0) / max) * 100}%` }}
              title={`${keyB}: ${d[keyB]}`}
            />
          </div>
          <span className="truncate text-xs font-medium text-muted-foreground">{String(d[labelKey])}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "ORGANIZATION" | "CARE_LOOP" | "CLINICAL" | "FERTILITY" | "BILLING" | "STAFF"
  >("ALL");
  const [dateRange, setDateRange] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  function loadAnalytics(range = dateRange) {
    startTransition(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await clinicApi.analyticsOverview(
          range !== "all" ? { dateRange: range } : undefined,
        );
        setData(res);
      } catch (err: any) {
        setError(err?.message || "Failed to load clinical analytics");
      } finally {
        setLoading(false);
      }
    });
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  function handleDateRangeChange(range: string) {
    setDateRange(range);
    loadAnalytics(range);
  }

  const org = data?.organization;
  const cl = data?.careLoop;
  const pe = data?.patientEngagement;
  const clin = data?.clinicalOperations;
  const fert = data?.fertility;
  const bill = data?.billing;
  const staff = data?.staff;

  const exportUrl = `/api/v1/analytics/export?report=${
    activeTab === "CARE_LOOP"
      ? "care-loop"
      : activeTab === "BILLING"
      ? "billing"
      : activeTab === "STAFF"
      ? "staff"
      : "summary"
  }`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      <PageHeader
        title="Clinical Operations & Performance Analytics"
        subtitle="Live, verified analytics computed from SmrkoMed persisted clinical, operational, and billing records."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Selector */}
            <div className="flex items-center rounded-lg border bg-background p-0.5 text-xs">
              {[
                { id: "all", label: "All Time" },
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "90d", label: "90 Days" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleDateRangeChange(r.id)}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    dateRange === r.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <a
              href={exportUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
            >
              <FileText className="size-3.5" />
              Export CSV
            </a>

            <button
              onClick={() => loadAnalytics()}
              disabled={loading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading || isPending ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-2 text-xs sm:text-sm">
        {[
          { id: "ALL", label: "Unified Overview", icon: BarChart3 },
          { id: "ORGANIZATION", label: "Organisation", icon: Users },
          { id: "CARE_LOOP", label: "Care Loop & AI", icon: Bot },
          { id: "CLINICAL", label: "Clinical Operations", icon: HeartPulse },
          { id: "FERTILITY", label: "Fertility & IVF", icon: Layers },
          { id: "BILLING", label: "Billing & Revenue", icon: CreditCard },
          { id: "STAFF", label: "Staff Workload", icon: UserCheck },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-card h-28 animate-pulse rounded-xl bg-muted/40 p-4" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* SECTION 1: Top Core KPIs */}
          {(activeTab === "ALL" || activeTab === "ORGANIZATION") && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Active Patients"
                  value={String(org?.activePatients ?? 0)}
                  hint={`Total registered: ${org?.totalPatients ?? 0}`}
                  icon={Users}
                  tone="primary"
                />
                <KpiCard
                  label="Task Completion Rate"
                  value={`${org?.taskCompletionRate ?? 0}%`}
                  hint={`${cl?.tasksCompleted ?? 0} of ${cl?.tasksCreated ?? 0} completed`}
                  icon={CheckCircle2}
                  tone="success"
                />
                <KpiCard
                  label="Active IVF Journeys"
                  value={String(org?.activeJourneys ?? 0)}
                  hint={`${fert?.activeIvfCycles ?? 0} active cycles`}
                  icon={Layers}
                  tone="purple"
                />
                <KpiCard
                  label="Active Escalations"
                  value={String(org?.escalationsCount ?? 0)}
                  hint={org?.escalationsCount ? "Requires staff triage" : "All quiet"}
                  icon={AlertTriangle}
                  tone={org?.escalationsCount ? "danger" : "muted"}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="surface-card p-5">
                  <SectionHeading
                    title="Appointments Performance"
                    subtitle="Persisted clinic appointment outcomes"
                    icon={Calendar}
                    tone="primary"
                  />
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Total Booked</p>
                      <p className="num-display mt-1 text-2xl font-bold">{org?.totalAppointments ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-success/30 bg-success/10 p-3">
                      <p className="text-xs text-success">Completed</p>
                      <p className="num-display mt-1 text-2xl font-bold text-success">
                        {org?.completedAppointments ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-danger/30 bg-danger/10 p-3">
                      <p className="text-xs text-danger">No-Show / Cancelled</p>
                      <p className="num-display mt-1 text-2xl font-bold text-danger">
                        {org?.noShowAppointments ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Attendance Rate</span>
                      <span className="font-semibold text-foreground">
                        {org?.totalAppointments
                          ? Math.round((((org.completedAppointments ?? 0) / org.totalAppointments) * 1000) / 10)
                          : 0}
                        %
                      </span>
                    </div>
                    <ProgressBar
                      pct={
                        org?.totalAppointments
                          ? ((org.completedAppointments ?? 0) / org.totalAppointments) * 100
                          : 0
                      }
                      tone="success"
                    />
                  </div>
                </section>

                <section className="surface-card p-5">
                  <SectionHeading
                    title="New Patient Intake"
                    subtitle="Patients onboarded in last 30 days"
                    icon={TrendingUp}
                    tone="teal"
                  />
                  <div className="mt-4 flex items-center justify-between rounded-xl border bg-muted/20 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">New in last 30 days</p>
                      <p className="num-display mt-1 text-3xl font-bold text-foreground">
                        +{org?.newPatients ?? 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Active Proportion</p>
                      <p className="mt-1 text-sm font-semibold">
                        {org?.totalPatients
                          ? Math.round((((org.activePatients ?? 0) / org.totalPatients) * 1000) / 10)
                          : 0}
                        % active
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Active Registry</span>
                      <span className="font-semibold">{org?.activePatients ?? 0} / {org?.totalPatients ?? 0}</span>
                    </div>
                    <ProgressBar
                      pct={org?.totalPatients ? ((org.activePatients ?? 0) / org.totalPatients) * 100 : 0}
                      tone="teal"
                    />
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* SECTION 2: Care Loop & Patient Engagement */}
          {(activeTab === "ALL" || activeTab === "CARE_LOOP") && (
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Care Loop & Automated Workflow Intelligence
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Tasks Overdue"
                  value={String(cl?.tasksOverdue ?? 0)}
                  hint={cl?.tasksOverdue ? "Action needed" : "Zero overdue"}
                  icon={Clock}
                  tone={cl?.tasksOverdue ? "danger" : "success"}
                />
                <KpiCard
                  label="Patient Response Rate"
                  value={`${cl?.patientResponseRate ?? 0}%`}
                  hint="Inbound responses logged"
                  icon={Bot}
                  tone="purple"
                />
                <KpiCard
                  label="Automation Success"
                  value={String(cl?.automationSuccessCount ?? 0)}
                  hint="Completed without escalation"
                  icon={CheckCircle2}
                  tone="teal"
                />
                <KpiCard
                  label="Human Handoffs"
                  value={String(cl?.humanHandoffCount ?? 0)}
                  hint="Handled by clinical staff"
                  icon={UserCheck}
                  tone="info"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="surface-card p-5">
                  <SectionHeading
                    title="Weekly Task Flow"
                    subtitle="Tasks created vs completed over past 7 days"
                    icon={BarChart3}
                    tone="primary"
                  />
                  {cl?.weeklyTrends && cl.weeklyTrends.length > 0 ? (
                    <>
                      <TrendsBarChart data={cl.weeklyTrends} keyA="created" keyB="completed" labelKey="day" />
                      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-primary" /> Created
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-emerald-500" /> Completed
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="py-8 text-center text-xs text-muted-foreground">No recent task activity</p>
                  )}
                </section>

                <section className="surface-card p-5">
                  <SectionHeading
                    title="Patient Engagement & Channels"
                    subtitle="WhatsApp & messaging effectiveness"
                    icon={MessageSquare}
                    tone="purple"
                  />
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg border bg-muted/20 p-2.5">
                        <p className="text-muted-foreground">Sent</p>
                        <p className="text-lg font-bold">{pe?.messagesSent ?? 0}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-2.5">
                        <p className="text-muted-foreground">Delivered</p>
                        <p className="text-lg font-bold">{pe?.messagesDelivered ?? 0}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-2.5">
                        <p className="text-muted-foreground">Read</p>
                        <p className="text-lg font-bold">{pe?.messagesRead ?? 0}</p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Delivery Rate</span>
                          <span className="font-semibold">{pe?.deliveryRate ?? 0}%</span>
                        </div>
                        <ProgressBar pct={pe?.deliveryRate ?? 0} tone="purple" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Read Rate</span>
                          <span className="font-semibold">{pe?.readRate ?? 0}%</span>
                        </div>
                        <ProgressBar pct={pe?.readRate ?? 0} tone="teal" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Response Rate</span>
                          <span className="font-semibold">{pe?.responseRate ?? 0}%</span>
                        </div>
                        <ProgressBar pct={pe?.responseRate ?? 0} tone="primary" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>Average Resolution Time:</span>
                      <span className="font-semibold text-foreground">
                        {cl?.averageResolutionHours ?? 0} hours
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* SECTION 3: Clinical Operations & Diagnostics */}
          {(activeTab === "ALL" || activeTab === "CLINICAL") && (
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Clinical Operations & Diagnostic Governance
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Reports Pending Review"
                  value={String(clin?.reportsPending ?? 0)}
                  hint={clin?.reportsPending ? "Awaiting doctor sign-off" : "All reviewed"}
                  icon={FileText}
                  tone={clin?.reportsPending ? "danger" : "muted"}
                />
                <KpiCard
                  label="Reports Reviewed"
                  value={String(clin?.reportsReviewed ?? 0)}
                  hint="Doctor verified & signed off"
                  icon={FileCheck2}
                  tone="success"
                />
                <KpiCard
                  label="Follow-ups Scheduled"
                  value={String(clin?.followUpsCount ?? 0)}
                  hint="Active clinical reviews"
                  icon={Calendar}
                  tone="primary"
                />
                <KpiCard
                  label="Discharge Queue"
                  value={String(clin?.dischargeQueue ?? 0)}
                  hint="Cycles in completion stage"
                  icon={ArrowRight}
                  tone="teal"
                />
              </div>
            </div>
          )}

          {/* SECTION 4: Fertility & IVF Metrics */}
          {(activeTab === "ALL" || activeTab === "FERTILITY") && (
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Fertility Care & IVF Workload
              </h2>

              <div className="grid gap-4 xl:grid-cols-2">
                <section className="surface-card p-5">
                  <SectionHeading
                    title="Journey Stage Distribution"
                    subtitle="Couples active across 15 IVF protocol stages"
                    icon={Layers}
                    tone="purple"
                  />
                  {fert?.journeyStages && fert.journeyStages.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {fert.journeyStages.map((st) => (
                        <div key={st.stageName} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{st.stageName}</span>
                            <span className="tabular-nums font-semibold text-muted-foreground">
                              {st.count} {st.count === 1 ? "couple" : "couples"}
                            </span>
                          </div>
                          <ProgressBar
                            pct={
                              org?.activeJourneys ? (st.count / (org.activeJourneys || 1)) * 100 : 0
                            }
                            tone="purple"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      No active journey stages recorded
                    </p>
                  )}
                </section>

                <section className="surface-card p-5">
                  <SectionHeading
                    title="Clinical Workload by Activity"
                    subtitle="Appointments categorized by clinical specialty"
                    icon={Activity}
                    tone="primary"
                  />
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Follicular Scans & Monitoring</p>
                        <p className="text-xs text-muted-foreground">Ultrasounds & stimulation monitoring</p>
                      </div>
                      <span className="num-display text-xl font-bold text-primary">
                        {fert?.monitoringWorkload ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">OT Procedures (OPU / ET)</p>
                        <p className="text-xs text-muted-foreground">Oocyte pick-ups & embryo transfers</p>
                      </div>
                      <span className="num-display text-xl font-bold text-primary">
                        {fert?.procedureWorkload ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Follow-ups & Consultations</p>
                        <p className="text-xs text-muted-foreground">Beta-hCG reviews & counselling</p>
                      </div>
                      <span className="num-display text-xl font-bold text-primary">
                        {fert?.followUpWorkload ?? 0}
                      </span>
                    </div>

                    <div className="mt-4 border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground">Recorded Cycle Outcomes</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg border border-success/30 bg-success/10 p-2">
                          <p className="text-success font-medium">Positive</p>
                          <p className="text-lg font-bold text-success">{fert?.outcomes?.positive ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-muted bg-muted/20 p-2">
                          <p className="text-muted-foreground font-medium">Ongoing</p>
                          <p className="text-lg font-bold">{fert?.outcomes?.ongoing ?? 0}</p>
                        </div>
                        <div className="rounded-lg border border-danger/30 bg-danger/10 p-2">
                          <p className="text-danger font-medium">Negative</p>
                          <p className="text-lg font-bold text-danger">{fert?.outcomes?.negative ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* SECTION 5: Billing & Revenue Connection */}
          {(activeTab === "ALL" || activeTab === "BILLING") && (
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Billing & Financial Performance
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Total Invoiced"
                  value={`₹${(bill?.totalRevenue ?? 0).toLocaleString("en-IN")}`}
                  hint="All issued invoices"
                  icon={CreditCard}
                  tone="primary"
                />
                <KpiCard
                  label="Payments Collected"
                  value={`₹${(bill?.totalPayments ?? 0).toLocaleString("en-IN")}`}
                  hint={`Collection rate: ${bill?.collectionRate ?? 0}%`}
                  icon={CheckCircle2}
                  tone="success"
                />
                <KpiCard
                  label="Outstanding Balance"
                  value={`₹${(bill?.outstanding ?? 0).toLocaleString("en-IN")}`}
                  hint={bill?.outstanding ? "Receivables pending" : "Fully settled"}
                  icon={Clock}
                  tone={bill?.outstanding ? "danger" : "muted"}
                />
                <KpiCard
                  label="Treatment Packages"
                  value={`₹${(bill?.treatmentRevenue ?? 0).toLocaleString("en-IN")}`}
                  hint={`Pharmacy: ₹${(bill?.pharmacyRevenue ?? 0).toLocaleString("en-IN")}`}
                  icon={TrendingUp}
                  tone="purple"
                />
              </div>
            </div>
          )}

          {/* SECTION 6: Staff Workload Distribution */}
          {(activeTab === "ALL" || activeTab === "STAFF") && (
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Staff Workload & Task Execution
              </h2>

              <div className="surface-card p-5">
                <SectionHeading
                  title="Care Tasks by Staff Role"
                  subtitle="Live workload balance, completion progress, and clinical escalations across teams"
                  icon={UserCheck}
                  tone="primary"
                />

                {staff?.staffWorkload && staff.staffWorkload.length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {staff.staffWorkload.map((sw) => (
                      <div key={sw.role} className="rounded-xl border p-4 space-y-3 bg-card">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-sm tracking-wide">
                            {sw.role.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {sw.totalTasks} {sw.totalTasks === 1 ? "task" : "tasks"}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-lg border border-success/30 bg-success/10 p-2">
                            <p className="text-success font-medium">Completed</p>
                            <p className="text-base font-bold text-success">{sw.completed}</p>
                          </div>
                          <div className="rounded-lg border border-warning/30 bg-warning/10 p-2">
                            <p className="text-warning font-medium">Overdue</p>
                            <p className="text-base font-bold text-warning">{sw.overdue}</p>
                          </div>
                          <div className="rounded-lg border border-danger/30 bg-danger/10 p-2">
                            <p className="text-danger font-medium">Escalated</p>
                            <p className="text-base font-bold text-danger">{sw.escalated}</p>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Completion Rate</span>
                            <span className="font-semibold">{sw.completionRate}%</span>
                          </div>
                          <ProgressBar pct={sw.completionRate} tone="primary" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
