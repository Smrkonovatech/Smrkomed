"use client";

import {
  CheckCircle2,
  IndianRupee,
  Receipt,
  RefreshCw,
  AlertTriangle,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDateTime,
  formatINR,
  PAYMENT_STATUS_FILTERS,
  paymentStatusTone,
  type PageResult,
  type PaymentRow,
  type PaymentsDashboard,
} from "@/components/payments/format";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, KpiCard, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { PERMISSIONS, roleHasPermission } from "@/lib/permissions/rbac";

export default function PaymentsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canView = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_VIEW));
  const canRefund = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_REFUND));

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [dashboard, setDashboard] = useState<PaymentsDashboard | null>(null);
  const [data, setData] = useState<PageResult<PaymentRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PaymentRow | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (status && status !== "ALL") params.set("status", status);
    try {
      const [dash, list] = await Promise.all([
        apiGet<PaymentsDashboard>("/api/v1/payments/dashboard"),
        apiGet<PageResult<PaymentRow>>(`/api/v1/payments/payments?${params}`),
      ]);
      setDashboard(dash);
      const filtered =
        query.trim().length > 0
          ? {
              ...list,
              items: list.items.filter((row) => {
                const hay = `${row.id} ${row.invoice?.invoiceNumber ?? ""} ${row.invoice?.title ?? ""} ${row.provider}`.toLowerCase();
                return hay.includes(query.trim().toLowerCase());
              }),
            }
          : list;
      setData(filtered);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load payments.");
      setDashboard(null);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    void load();
  }, [canView, page, status]);

  useEffect(() => {
    if (!canView) return;
    const handle = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function openRefund(payment: PaymentRow) {
    setSelected(payment);
    setRefundAmount(String(payment.amount));
    setRefundReason("");
    setRefundOpen(true);
  }

  async function submitRefund(event: FormEvent) {
    event.preventDefault();
    if (!selected || !canRefund) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }
    setSaving(true);
    try {
      await apiPost(`/api/v1/payments/payments/${selected.id}/refunds`, {
        amount,
        reason: refundReason.trim() || null,
      });
      toast.success("Refund submitted.");
      setRefundOpen(false);
      setSelected(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to refund payment.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadReceipt(payment: PaymentRow) {
    try {
      const receipt = await apiGet<{ paymentId: string; text: string }>(
        `/api/v1/payments/receipts/${payment.id}`,
      );
      const url = URL.createObjectURL(new Blob([receipt.text], { type: "text/plain;charset=utf-8" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt-${payment.id}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to download receipt.");
    }
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <PageHeader title="Payments" subtitle="Collections, refunds, and receipts." />
        <EmptyState
          title="You do not have access to payments."
          description="Ask a clinic admin for payments:view permission."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Track collections, pending settlements, refunds, and receipts."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/billing">Billing</Link>
            </Button>
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/settings/payments">Gateways</Link>
            </Button>
          </div>
        }
      />

      {dashboard && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Today collected"
            value={formatINR(dashboard.todayCollections.amount)}
            hint={`${dashboard.todayCollections.count} payments`}
            icon={CheckCircle2}
            tone="success"
          />
          <KpiCard
            label="Pending"
            value={formatINR(dashboard.pending.amount)}
            hint={`${dashboard.pending.count} in flight`}
            icon={Clock3}
            tone="warning"
          />
          <KpiCard
            label="Outstanding invoices"
            value={formatINR(dashboard.outstanding.amount)}
            hint={`${dashboard.outstanding.count} open`}
            icon={IndianRupee}
            tone="primary"
          />
          <KpiCard
            label="Failed today"
            value={formatINR(dashboard.failed.amount)}
            hint={`${dashboard.failed.count} failed`}
            icon={AlertTriangle}
            tone="danger"
          />
          <KpiCard
            label="Refunds today"
            value={formatINR(dashboard.refunds.amount)}
            hint={`${dashboard.refunds.count} refunds`}
            icon={RefreshCw}
            tone="info"
          />
        </div>
      )}

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search payment, invoice…"
            className="h-9 max-w-md rounded-lg"
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          >
            <SelectTrigger className="h-9 w-[200px] rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "ALL" ? "All statuses" : s.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <LoadingRows rows={5} />
        ) : error ? (
          <EmptyState
            title="Unable to load payments."
            description={error}
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : !data?.items.length ? (
          <EmptyState
            title="No payments yet."
            description="Payments appear when invoices are collected or payment links are paid."
            action={
              <Button asChild>
                <Link href="/billing">Go to Billing</Link>
              </Button>
            }
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((payment) => (
                <RecordCard key={payment.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold tabular-nums">{formatINR(payment.amount)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {payment.invoice?.invoiceNumber ?? "No invoice"} · {payment.provider}
                      </p>
                    </div>
                    <StatusBadge label={payment.status} tone={paymentStatusTone(payment.status)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelected(payment)}>
                      View
                    </Button>
                    {(payment.status === "SUCCESS" || payment.status === "PARTIALLY_REFUNDED") &&
                      canRefund && (
                        <Button size="sm" variant="outline" onClick={() => openRefund(payment)}>
                          Refund
                        </Button>
                      )}
                    <Button size="sm" variant="ghost" onClick={() => void downloadReceipt(payment)}>
                      <Receipt className="size-3.5" /> Receipt
                    </Button>
                  </div>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Invoice</th>
                    <th className="px-4 py-2 font-medium">Provider</th>
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {formatINR(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {payment.invoice ? (
                          <div>
                            <p className="font-medium">{payment.invoice.invoiceNumber}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {payment.invoice.title}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{payment.provider}</td>
                      <td className="px-4 py-3">{payment.method ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={payment.status.replaceAll("_", " ")}
                          tone={paymentStatusTone(payment.status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(payment)}>
                            View
                          </Button>
                          {(payment.status === "SUCCESS" ||
                            payment.status === "PARTIALLY_REFUNDED") &&
                            canRefund && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRefund(payment)}
                              >
                                Refund
                              </Button>
                            )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void downloadReceipt(payment)}
                          >
                            Receipt
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {data.page} · {data.total} payments
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * data.pageSize >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      <Dialog open={Boolean(selected) && !refundOpen} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment details</DialogTitle>
            <DialogDescription>Status and gateway references for this payment.</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[120px_1fr]">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-semibold">{formatINR(selected.amount)}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge
                  label={selected.status.replaceAll("_", " ")}
                  tone={paymentStatusTone(selected.status)}
                />
              </dd>
              <dt className="text-muted-foreground">Provider</dt>
              <dd>{selected.provider}</dd>
              <dt className="text-muted-foreground">Invoice</dt>
              <dd>{selected.invoice?.invoiceNumber ?? "—"}</dd>
              <dt className="text-muted-foreground">Method</dt>
              <dd>{selected.method ?? "—"}</dd>
              <dt className="text-muted-foreground">Paid at</dt>
              <dd>{formatDateTime(selected.paidAt)}</dd>
              {selected.paymentLinkUrl && (
                <>
                  <dt className="text-muted-foreground">Link</dt>
                  <dd className="break-all">
                    <a
                      href={selected.paymentLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {selected.paymentLinkUrl}
                    </a>
                  </dd>
                </>
              )}
              {selected.failureReason && (
                <>
                  <dt className="text-muted-foreground">Failure</dt>
                  <dd className="text-danger">{selected.failureReason}</dd>
                </>
              )}
            </dl>
          )}
          <DialogFooter>
            {selected && (
              <Button variant="outline" onClick={() => void downloadReceipt(selected)}>
                <Receipt className="size-4" /> Receipt
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <form onSubmit={submitRefund}>
            <DialogHeader>
              <DialogTitle>Refund payment</DialogTitle>
              <DialogDescription>
                Refund {selected ? formatINR(selected.amount) : ""} via the connected gateway when
                applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="refund-amount">Amount (₹)</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="refund-reason">Reason (optional)</Label>
                <Input
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canRefund}>
                {saving ? "Refunding…" : "Submit refund"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
