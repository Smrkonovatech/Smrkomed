"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDate,
  formatDateTime,
  formatINR,
  invoiceStatusTone,
  paymentStatusTone,
  type FinancialsOverview,
  type InvoiceRow,
  type PaymentRow,
} from "@/components/payments/format";
import { EmptyState, LoadingRows, StatusBadge } from "@/components/ui-kit";
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

export function PatientFinancialsTab({
  coupleId,
  patientId,
}: {
  coupleId?: string;
  patientId?: string;
}) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canCreate = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_CREATE));
  const canLink = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_LINK));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinancialsOverview | null>(null);
  const [payInvoice, setPayInvoice] = useState<InvoiceRow | null>(null);
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("CASH");
  const [saving, setSaving] = useState(false);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);

  const load = async () => {
    if (!coupleId && !patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const path = coupleId
        ? `/api/v1/payments/couples/${coupleId}/financials`
        : `/api/v1/payments/patients/${patientId}/financials`;
      const next = await apiGet<FinancialsOverview>(path);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load financials.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [coupleId, patientId]);

  function openPay(invoice: InvoiceRow) {
    setPayInvoice(invoice);
    setAmount(String(invoice.outstandingAmount));
    setProvider("CASH");
  }

  async function collectPayment(event: FormEvent) {
    event.preventDefault();
    if (!payInvoice || !canCreate) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      const payment = await apiPost<PaymentRow>(
        `/api/v1/payments/invoices/${payInvoice.id}/payments`,
        {
          amount: value,
          provider,
          method: provider === "CASH" || provider === "MANUAL" ? "cash" : null,
        },
      );
      if (payment.paymentLinkUrl) {
        toast.success("Payment created with link.");
      } else {
        toast.success("Payment recorded.");
      }
      setPayInvoice(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to collect payment.");
    } finally {
      setSaving(false);
    }
  }

  async function sendPaymentLink(invoice: InvoiceRow) {
    if (!canCreate || !canLink) {
      toast.error("You need payments create and link permissions.");
      return;
    }
    setLinkBusy(invoice.id);
    try {
      const payment = await apiPost<PaymentRow>(
        `/api/v1/payments/invoices/${invoice.id}/payments`,
        {
          amount: invoice.outstandingAmount,
          provider: "RAZORPAY",
        },
      );
      if (payment.paymentLinkUrl) {
        await navigator.clipboard.writeText(payment.paymentLinkUrl).catch(() => undefined);
        toast.success("Payment link created and copied.");
      } else {
        const linked = await apiPost<PaymentRow>(`/api/v1/payments/payments/${payment.id}/link`, {
          description: invoice.title,
        });
        if (linked.paymentLinkUrl) {
          await navigator.clipboard.writeText(linked.paymentLinkUrl).catch(() => undefined);
          toast.success("Payment link created and copied.");
        } else {
          toast.success("Payment created. Connect a gateway to generate links.");
        }
      }
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create payment link.");
    } finally {
      setLinkBusy(null);
    }
  }

  if (!coupleId && !patientId) {
    return (
      <EmptyState
        title="Financials unavailable."
        description="Link this profile to a couple or patient record to load billing."
      />
    );
  }

  if (loading) return <LoadingRows rows={4} />;

  if (error || !data) {
    return (
      <EmptyState
        title="Unable to load financials."
        description={error ?? "Please try again."}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  const outstandingInvoices = data.invoices.filter((inv) => inv.outstandingAmount > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Financial summary</h3>
          <p className="text-xs text-muted-foreground">
            Outstanding and payment history for this {coupleId ? "couple" : "patient"}.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href="/billing">Open Billing</Link>
        </Button>
      </div>

      <section className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
          <p className="num-display mt-0.5 text-2xl text-warning">{formatINR(data.outstanding)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Collected</p>
          <p className="num-display mt-0.5 text-2xl text-success">{formatINR(data.collected)}</p>
        </div>
      </section>

      <section className="rounded-xl border bg-background">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Outstanding invoices</h4>
          <p className="text-xs text-muted-foreground">{outstandingInvoices.length} open</p>
        </div>
        {!outstandingInvoices.length ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No outstanding invoices.</p>
        ) : (
          <ul className="divide-y">
            {outstandingInvoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invoice.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.invoiceNumber} · Due {formatDate(invoice.dueDate)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={invoice.status.replaceAll("_", " ")}
                    tone={invoiceStatusTone(invoice.status)}
                  />
                  <span className="text-sm font-semibold tabular-nums">
                    {formatINR(invoice.outstandingAmount)}
                  </span>
                  {canCreate && (
                    <Button size="sm" onClick={() => openPay(invoice)}>
                      Pay Now
                    </Button>
                  )}
                  {canCreate && canLink && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={linkBusy === invoice.id}
                      onClick={() => void sendPaymentLink(invoice)}
                    >
                      {linkBusy === invoice.id ? "Sending…" : "Send Payment Link"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-background">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Payment history</h4>
          <p className="text-xs text-muted-foreground">{data.payments.length} recent</p>
        </div>
        {!data.payments.length ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {data.payments.map((payment) => (
              <li
                key={payment.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {payment.invoice?.title ?? payment.provider}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.invoice?.invoiceNumber ?? payment.id.slice(0, 8)} ·{" "}
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatINR(payment.amount)}
                </span>
                <StatusBadge
                  label={payment.status.replaceAll("_", " ")}
                  tone={paymentStatusTone(payment.status)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(payInvoice)} onOpenChange={(open) => !open && setPayInvoice(null)}>
        <DialogContent>
          <form onSubmit={collectPayment}>
            <DialogHeader>
              <DialogTitle>Collect payment</DialogTitle>
              <DialogDescription>
                {payInvoice
                  ? `${payInvoice.invoiceNumber} · outstanding ${formatINR(payInvoice.outstandingAmount)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 grid gap-3">
              <div className="space-y-1">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                    <SelectItem value="CASHFREE">Cashfree</SelectItem>
                    <SelectItem value="PAYU">PayU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayInvoice(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canCreate}>
                {saving ? "Saving…" : "Collect"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
