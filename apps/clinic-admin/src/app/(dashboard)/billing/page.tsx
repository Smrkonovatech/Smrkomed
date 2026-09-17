"use client";

import { Eye, IndianRupee, Link2, MessageSquare, Plus, Receipt, Send } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDate,
  formatINR,
  INVOICE_STATUS_FILTERS,
  invoiceStatusTone,
  type InvoiceRow,
  type PageResult,
  type PaymentRow,
} from "@/components/payments/format";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
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
import { clinicApi } from "@/lib/clinic-api";
import { PERMISSIONS, roleHasPermission } from "@/lib/permissions/rbac";

type BillingErrors = {
  title?: string;
  amount?: string;
  patient?: string;
};

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  primaryCouples?: Array<{ id: string; slug?: string }>;
  partnerCouples?: Array<{ id: string; slug?: string }>;
};

export default function BillingPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canView = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_VIEW));
  const canCreate = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_CREATE));
  const canLink = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_LINK));

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<InvoiceRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Patients state for selection
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendingWhatsappId, setSendingWhatsappId] = useState<string | null>(null);

  const [selected, setSelected] = useState<InvoiceRow | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [form, setForm] = useState({
    coupleId: "",
    patientId: "",
    title: "",
    amount: "",
    dueDate: "",
    description: "",
  });
  const [errors, setErrors] = useState<BillingErrors>({});
  const [payAmount, setPayAmount] = useState("");
  const [payProvider, setPayProvider] = useState("CASH");
  const [saving, setSaving] = useState(false);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (query.trim()) params.set("q", query.trim());
    if (status && status !== "ALL") params.set("status", status);
    try {
      const next = await apiGet<PageResult<InvoiceRow>>(`/api/v1/payments/invoices?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load invoices.");
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
  }, [canView, page, status, query]);

  // Load patients list for dropdown
  useEffect(() => {
    if (!canView) return;
    setLoadingPatients(true);
    apiGet<PatientOption[]>("/api/v1/patients")
      .then((res) => {
        if (Array.isArray(res)) setPatients(res);
      })
      .catch((err) => {
        console.warn("Could not load patients for billing:", err);
      })
      .finally(() => {
        setLoadingPatients(false);
      });
  }, [canView]);

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    const pt = patients.find((p) => p.id === patientId);
    if (pt) {
      const coupleId = pt.primaryCouples?.[0]?.id || pt.partnerCouples?.[0]?.id || "";
      setForm((prev) => ({
        ...prev,
        patientId: pt.id,
        coupleId: coupleId,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        patientId: "",
        coupleId: "",
      }));
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const metrics = {
    collected: data?.items.filter((i) => i.status === "PAID").reduce((s, i) => s + i.paidAmount, 0) ?? 0,
    pending:
      data?.items
        .filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID")
        .reduce((s, i) => s + i.outstandingAmount, 0) ?? 0,
    overdue:
      data?.items.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.outstandingAmount, 0) ??
      0,
  };

  async function createInvoice(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) return;
    const nextErrors: BillingErrors = {};
    if (form.title.trim().length < 3) nextErrors.title = "Enter a title";
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      nextErrors.amount = "Enter a valid amount";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const created = await apiPost<InvoiceRow>("/api/v1/payments/invoices", {
        title: form.title.trim(),
        description: form.description.trim() || null,
        coupleId: form.coupleId.trim() || null,
        patientId: form.patientId.trim() || null,
        dueDate: form.dueDate || null,
        source: "MANUAL",
        lines: [
          {
            description: form.title.trim(),
            quantity: 1,
            unitAmount: Number(form.amount),
          },
        ],
      });

      const selPt = patients.find((p) => p.id === form.patientId);
      const targetPhone = selPt?.phone || selPt?.whatsappNumber || undefined;

      // Send payment link to patient WhatsApp
      if (sendWhatsApp && created?.id) {
        const payUrl = `${window.location.origin}/pay/${created.id}`;
        const waMsg = `ORDER #${created.invoiceNumber}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n*${form.title.trim()}*\nQuantity 1\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n*Total*                            *${formatINR(Number(form.amount))}*\n${form.dueDate ? `Due Date: ${form.dueDate}\n` : ""}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👉 *Pay Online with Razorpay:*\n${payUrl}`;

        try {
          await clinicApi.sendWhatsappToRecipient({
            patientId: form.patientId || undefined,
            coupleId: form.coupleId || undefined,
            phone: targetPhone,
            body: waMsg,
            header: `ORDER #${created.invoiceNumber}`,
            footer: "Hospex Healthcare • Secured by Razorpay",
            buttons: [
              { id: `pay_inv_${created.id}`, title: "Review and pay" },
            ],
            ctaUrl: {
              displayText: "Review and pay",
              url: payUrl,
            },
          });
          await navigator.clipboard.writeText(payUrl).catch(() => undefined);
          toast.success(`Invoice created & "Review and pay" card sent to patient on WhatsApp!`);
        } catch (waErr) {
          console.warn("Could not dispatch WhatsApp message:", waErr);
          toast.success("Invoice created. WhatsApp could not be sent.");
        }
      } else {
        toast.success("Invoice created.");
      }

      setNewOpen(false);
      setForm({
        coupleId: "",
        patientId: "",
        title: "",
        amount: "",
        dueDate: "",
        description: "",
      });
      setSelectedPatientId("");
      setErrors({});
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvoiceWhatsApp(invoice: InvoiceRow) {
    setSendingWhatsappId(invoice.id);
    const payUrl = `${window.location.origin}/pay/${invoice.id}`;
    const waMsg = `ORDER #${invoice.invoiceNumber}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n*${invoice.title}*\nQuantity 1\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n*Total*                            *${formatINR(invoice.outstandingAmount)}*\n${invoice.dueDate ? `Due Date: ${formatDate(invoice.dueDate)}\n` : ""}┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n👉 *Pay Online with Razorpay:*\n${payUrl}`;

    try {
      await clinicApi.sendWhatsappToRecipient({
        patientId: invoice.patientId ?? undefined,
        coupleId: invoice.coupleId ?? undefined,
        body: waMsg,
        header: `ORDER #${invoice.invoiceNumber}`,
        footer: "Hospex Healthcare • Secured by Razorpay",
        buttons: [
          { id: `pay_inv_${invoice.id}`, title: "Review and pay" },
        ],
        ctaUrl: {
          displayText: "Review and pay",
          url: payUrl,
        },
      });
      await navigator.clipboard.writeText(payUrl).catch(() => undefined);
      toast.success(`"Review and pay" card sent on WhatsApp & link copied!`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send WhatsApp message.");
    } finally {
      setSendingWhatsappId(null);
    }
  }

  function openCollect(invoice: InvoiceRow) {
    setSelected(invoice);
    setPayAmount(String(invoice.outstandingAmount));
    setPayProvider("RAZORPAY");
    setPayOpen(true);
  }

  async function collectPayment(event: FormEvent) {
    event.preventDefault();
    if (!selected || !canCreate) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    if (payProvider === "RAZORPAY") {
      // Redirect or open Razorpay Standard Checkout payment page
      window.open(`/pay/${selected.id}`, "_blank");
      setPayOpen(false);
      setSelected(null);
      return;
    }

    setSaving(true);
    try {
      const payment = await apiPost<PaymentRow>(
        `/api/v1/payments/invoices/${selected.id}/payments`,
        {
          amount,
          provider: payProvider,
          method: payProvider === "CASH" || payProvider === "MANUAL" ? "cash" : null,
        },
      );
      if (payment.paymentLinkUrl) {
        toast.success("Payment started — link available.");
      } else {
        toast.success("Payment recorded.");
      }
      setPayOpen(false);
      setSelected(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to collect payment.");
    } finally {
      setSaving(false);
    }
  }

  async function generateLink(invoice: InvoiceRow) {
    const payUrl = `${window.location.origin}/pay/${invoice.id}`;
    await navigator.clipboard.writeText(payUrl).catch(() => undefined);
    toast.success("Razorpay payment link copied to clipboard.");
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          title="Billing"
          subtitle="Issue invoices, track due balances, and follow up on collections."
        />
        <EmptyState
          title="You do not have access to billing."
          description="Ask a clinic admin for payments:view permission."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Billing"
        subtitle="Issue invoices, track due balances, and follow up on collections."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/payments">Payments</Link>
            </Button>
            {canCreate && (
              <Button className="rounded-lg" onClick={() => setNewOpen(true)}>
                <Plus className="size-4" /> New Invoice
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid divide-y rounded-xl border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { label: "Collected (page)", value: metrics.collected, tone: "text-success" },
          { label: "Pending (page)", value: metrics.pending, tone: "text-warning" },
          { label: "Overdue (page)", value: metrics.overdue, tone: "text-danger" },
        ].map((metric) => (
          <div key={metric.label} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
              <p className={`num-display mt-0.5 text-xl ${metric.tone}`}>{formatINR(metric.value)}</p>
            </div>
            <IndianRupee className={`size-4 ${metric.tone}`} />
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search invoice number or title…"
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
              {INVOICE_STATUS_FILTERS.map((s) => (
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
            title="Unable to load invoices."
            description={error}
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : !data?.items.length ? (
          <EmptyState
            title="No invoices yet."
            description="Create an invoice to start collecting patient payments."
            action={
              canCreate ? (
                <Button onClick={() => setNewOpen(true)}>
                  <Plus className="size-4" /> New Invoice
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div>
                <h2 className="text-sm font-semibold">Invoices</h2>
                <p className="text-xs text-muted-foreground">{data.total} billing records</p>
              </div>
              <Receipt className="size-4 text-muted-foreground" />
            </div>
            <MobileCards>
              {data.items.map((invoice) => (
                <RecordCard key={invoice.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{invoice.invoiceNumber}</p>
                      <p className="mt-0.5 text-sm">
                        {invoice.patient?.name ?? invoice.couple?.slug ?? "—"}
                      </p>
                    </div>
                    <StatusBadge
                      label={invoice.status.replaceAll("_", " ")}
                      tone={invoiceStatusTone(invoice.status)}
                    />
                  </div>
                  <p className="mt-2 truncate text-sm text-muted-foreground">{invoice.title}</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {formatINR(invoice.outstandingAmount)} outstanding
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setSelected(invoice)}>
                      <Eye className="size-3.5" /> View
                    </Button>
                    {invoice.outstandingAmount > 0 && canCreate && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openCollect(invoice)}>
                          Pay Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-700 hover:bg-emerald-50"
                          disabled={sendingWhatsappId === invoice.id}
                          onClick={() => void sendInvoiceWhatsApp(invoice)}
                        >
                          <MessageSquare className="size-3.5" />
                          WhatsApp
                        </Button>
                      </>
                    )}
                  </div>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <tr className="border-b">
                    {[
                      "Invoice",
                      "Patient / Couple",
                      "Title",
                      "Total",
                      "Outstanding",
                      "Due",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-3 py-2.5 font-medium first:pl-4">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((invoice) => (
                    <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-semibold">{invoice.invoiceNumber}</td>
                      <td className="px-3 py-2.5">
                        {invoice.patient?.name ?? invoice.couple?.slug ?? "—"}
                      </td>
                      <td className="max-w-[280px] px-3 py-2.5">
                        <span className="block truncate">{invoice.title}</span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold tabular-nums">
                        {formatINR(invoice.totalAmount)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {formatINR(invoice.outstandingAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={invoice.status.replaceAll("_", " ")}
                          tone={invoiceStatusTone(invoice.status)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(invoice)}>
                            <Eye className="size-3.5" /> View
                          </Button>
                          {invoice.outstandingAmount > 0 && canCreate && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCollect(invoice)}
                              >
                                Pay Now
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                                title="Send payment link on WhatsApp"
                                disabled={sendingWhatsappId === invoice.id}
                                onClick={() => void sendInvoiceWhatsApp(invoice)}
                              >
                                <MessageSquare className="size-3.5" />
                                {sendingWhatsappId === invoice.id ? "…" : "WhatsApp"}
                              </Button>
                              {canLink && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Copy Razorpay payment link"
                                  onClick={() => void generateLink(invoice)}
                                >
                                  <Link2 className="size-3.5" />
                                  Link
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {data.page} · {data.total} invoices
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

      {/* New Invoice Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={createInvoice}>
            <DialogHeader>
              <DialogTitle>New Invoice</DialogTitle>
              <DialogDescription>
                Select a patient to generate a bill with Razorpay checkout & WhatsApp link.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-4">
              {/* Patient Selector */}
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-patient-select">Patient</Label>
                <Select
                  value={selectedPatientId}
                  onValueChange={handleSelectPatient}
                  disabled={loadingPatients}
                >
                  <SelectTrigger id="invoice-patient-select" className="w-full">
                    <SelectValue placeholder={loadingPatients ? "Loading patients…" : "Select a patient"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {patients.map((pt) => {
                      const name = `${pt.firstName} ${pt.lastName || ""}`.trim();
                      const contact = pt.phone || pt.whatsappNumber || "";
                      return (
                        <SelectItem key={pt.id} value={pt.id}>
                          <span className="font-medium">{name}</span>
                          {contact && <span className="ml-2 text-xs text-muted-foreground">({contact})</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedPatient && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/50">
                    <span>📱 Contact: <span className="font-medium text-foreground">{selectedPatient.phone || selectedPatient.whatsappNumber || "Not provided"}</span></span>
                    {form.coupleId && <span className="text-muted-foreground/60">• Couple linked</span>}
                  </div>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="invoice-title">Invoice Title / Treatment</Label>
                <Input
                  id="invoice-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. IVF Stimulation Protocol / Consultation Fee"
                />
                {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="invoice-description">Description (optional)</Label>
                <Input
                  id="invoice-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Additional notes or package inclusions"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="invoice-amount">Amount (₹)</Label>
                  <Input
                    id="invoice-amount"
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 50000"
                  />
                  {errors.amount && <p className="text-xs text-danger">{errors.amount}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="invoice-due">Due date</Label>
                  <Input
                    id="invoice-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* WhatsApp Notification Toggle */}
              <div className="rounded-lg border bg-emerald-50/50 border-emerald-200/60 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-gray-300 text-emerald-600 accent-emerald-600"
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                      <MessageSquare className="size-4 text-emerald-600" />
                      Send invoice & payment link to patient on WhatsApp
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Patient will instantly receive an interactive WhatsApp message with a link to pay securely online via Razorpay.
                    </p>
                  </div>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canCreate}>
                {saving ? "Creating…" : "Create & Send Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog
        open={Boolean(selected) && !payOpen}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.invoiceNumber}</DialogTitle>
            <DialogDescription>Invoice details and payment status</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[110px_1fr]">
              <dt className="text-muted-foreground">Patient</dt>
              <dd className="font-medium">
                {selected.patient?.name ?? selected.couple?.slug ?? "—"}
              </dd>
              <dt className="text-muted-foreground">Title</dt>
              <dd>{selected.title}</dd>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold">{formatINR(selected.totalAmount)}</dd>
              <dt className="text-muted-foreground">Outstanding</dt>
              <dd className="font-semibold">{formatINR(selected.outstandingAmount)}</dd>
              <dt className="text-muted-foreground">Due date</dt>
              <dd>{formatDate(selected.dueDate)}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge
                  label={selected.status.replaceAll("_", " ")}
                  tone={invoiceStatusTone(selected.status)}
                />
              </dd>
            </dl>
          )}
          <DialogFooter>
            {selected && selected.outstandingAmount > 0 && canCreate && (
              <Button onClick={() => openCollect(selected)}>Pay with Razorpay</Button>
            )}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <form onSubmit={collectPayment}>
            <DialogHeader>
              <DialogTitle>Collect Payment</DialogTitle>
              <DialogDescription>
                {selected
                  ? `${selected.invoiceNumber} · outstanding ${formatINR(selected.outstandingAmount)}`
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
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Payment Mode / Gateway</Label>
                <Select value={payProvider} onValueChange={setPayProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAZORPAY">Razorpay (Standard Checkout)</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="MANUAL">Manual / Card POS</SelectItem>
                    <SelectItem value="CASHFREE">Cashfree</SelectItem>
                    <SelectItem value="PAYU">PayU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canCreate}>
                {payProvider === "RAZORPAY" ? "Open Razorpay Checkout" : saving ? "Saving…" : "Collect"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
