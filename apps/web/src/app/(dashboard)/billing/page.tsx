"use client";

import { Download, Eye, IndianRupee, Plus, Receipt, Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
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
import { useAppState } from "@/lib/app-state";
import {
  coupleLabel,
  couples,
  getCouple,
  invoices as demoInvoices,
  type Invoice,
} from "@/lib/demo-data";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
type BillingErrors = {
  coupleId?: string;
  treatment?: string;
  amount?: string;
  dueDate?: string;
};

function downloadInvoice(invoice: Invoice) {
  const content = [
    "CLINIC FLOW PRO",
    `Invoice: ${invoice.id}`,
    `Couple: ${coupleLabel(getCouple(invoice.coupleId))}`,
    `Treatment: ${invoice.item}`,
    `Amount: ${inr(invoice.amount)}`,
    `Due date: ${invoice.date}`,
    `Status: ${invoice.status}`,
    "",
    "This is a demo invoice generated from the billing workspace.",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${invoice.id}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function BillingPage() {
  const appState = useAppState() as ReturnType<typeof useAppState> & {
    invoices?: Invoice[];
  };
  const sourceInvoices = appState.invoices ?? demoInvoices;
  const [localInvoices, setLocalInvoices] = useState<Invoice[]>(sourceInvoices);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ coupleId: "", treatment: "", amount: "", dueDate: "" });
  const [errors, setErrors] = useState<BillingErrors>({});

  const metrics = useMemo(
    () => ({
      collected: localInvoices
        .filter((invoice) => invoice.status === "Paid")
        .reduce((total, invoice) => total + invoice.amount, 0),
      pending: localInvoices
        .filter((invoice) => invoice.status === "Pending")
        .reduce((total, invoice) => total + invoice.amount, 0),
      overdue: localInvoices
        .filter((invoice) => invoice.status === "Overdue")
        .reduce((total, invoice) => total + invoice.amount, 0),
    }),
    [localInvoices],
  );

  function createInvoice(event: FormEvent) {
    event.preventDefault();
    const nextErrors: BillingErrors = {};
    if (!form.coupleId) nextErrors.coupleId = "Select a couple";
    if (form.treatment.trim().length < 3) nextErrors.treatment = "Enter a treatment";
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0)
      nextErrors.amount = "Enter a valid amount";
    if (!form.dueDate) nextErrors.dueDate = "Select a due date";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const created: Invoice = {
      id: `INV-${2050 + localInvoices.length}`,
      coupleId: form.coupleId,
      item: form.treatment.trim(),
      amount: Number(form.amount),
      date: new Date(`${form.dueDate}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "Pending",
    };
    setLocalInvoices((current) => [created, ...current]);
    setForm({ coupleId: "", treatment: "", amount: "", dueDate: "" });
    setErrors({});
    setNewOpen(false);
    toast.success(`${created.id} created`);
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Billing"
        subtitle="Issue invoices, track due balances, and follow up on collections."
        actions={
          <Button className="rounded-lg" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> New Invoice
          </Button>
        }
      />

      <div className="mb-4 grid divide-y rounded-xl border bg-background sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { label: "Collected", value: metrics.collected, tone: "text-success" },
          { label: "Pending", value: metrics.pending, tone: "text-warning" },
          { label: "Overdue", value: metrics.overdue, tone: "text-danger" },
        ].map((metric) => (
          <div key={metric.label} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
              <p className={`num-display mt-0.5 text-xl ${metric.tone}`}>{inr(metric.value)}</p>
            </div>
            <IndianRupee className={`size-4 ${metric.tone}`} />
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Invoices</h2>
            <p className="text-xs text-muted-foreground">{localInvoices.length} billing records</p>
          </div>
          <Receipt className="size-4 text-muted-foreground" />
        </div>
        <MobileCards>
          {localInvoices.map((invoice) => (
            <RecordCard key={invoice.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{invoice.id}</p>
                  <p className="mt-0.5 text-sm">{coupleLabel(getCouple(invoice.coupleId))}</p>
                </div>
                <StatusBadge
                  label={invoice.status}
                  tone={
                    invoice.status === "Paid"
                      ? "success"
                      : invoice.status === "Pending"
                        ? "warning"
                        : "danger"
                  }
                />
              </div>
              <p className="mt-2 truncate text-sm text-muted-foreground">{invoice.item}</p>
              <p className="mt-1 font-semibold tabular-nums">{inr(invoice.amount)}</p>
              <Button size="sm" className="mt-3 w-full" onClick={() => setSelected(invoice)}>
                <Eye className="size-3.5" /> View
              </Button>
            </RecordCard>
          ))}
        </MobileCards>
        <MdTableWrap>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr className="border-b">
                {["Invoice", "Couple", "Treatment", "Amount", "Due date", "Status", "Actions"].map(
                  (heading) => (
                    <th key={heading} className="px-3 py-2.5 font-medium first:pl-4">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {localInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-semibold">{invoice.id}</td>
                  <td className="px-3 py-2.5">{coupleLabel(getCouple(invoice.coupleId))}</td>
                  <td className="max-w-[280px] px-3 py-2.5">
                    <span className="block truncate">{invoice.item}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold tabular-nums">
                    {inr(invoice.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{invoice.date}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge
                      label={invoice.status}
                      tone={
                        invoice.status === "Paid"
                          ? "success"
                          : invoice.status === "Pending"
                            ? "warning"
                            : "danger"
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(invoice)}>
                        <Eye className="size-3.5" /> View
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Download invoice"
                        onClick={() => downloadInvoice(invoice)}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      {invoice.status !== "Paid" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setLocalInvoices((current) =>
                                current.map((item) =>
                                  item.id === invoice.id ? { ...item, status: "Paid" } : item,
                                ),
                              );
                              toast.success(`Payment recorded for ${invoice.id}`);
                            }}
                          >
                            Record payment
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Send reminder"
                            onClick={() => toast.success(`Reminder sent for ${invoice.id}`)}
                          >
                            <Send className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MdTableWrap>
      </section>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <form onSubmit={createInvoice}>
            <DialogHeader>
              <DialogTitle>New invoice</DialogTitle>
              <DialogDescription>Create a clinic invoice with a clear due date.</DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-4">
              <div className="grid gap-1.5">
                <Label>Couple</Label>
                <Select
                  value={form.coupleId}
                  onValueChange={(value) => setForm((current) => ({ ...current, coupleId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select couple" />
                  </SelectTrigger>
                  <SelectContent>
                    {couples.map((couple) => (
                      <SelectItem key={couple.id} value={couple.id}>
                        {coupleLabel(couple)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.coupleId && <p className="text-xs text-danger">{errors.coupleId}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-treatment">Treatment</Label>
                <Input
                  id="invoice-treatment"
                  value={form.treatment}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, treatment: event.target.value }))
                  }
                  placeholder="e.g. IVF Cycle 02 — Instalment 1"
                />
                {errors.treatment && <p className="text-xs text-danger">{errors.treatment}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="invoice-amount">Amount (₹)</Label>
                  <Input
                    id="invoice-amount"
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, amount: event.target.value }))
                    }
                  />
                  {errors.amount && <p className="text-xs text-danger">{errors.amount}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="invoice-due">Due date</Label>
                  <Input
                    id="invoice-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dueDate: event.target.value }))
                    }
                  />
                  {errors.dueDate && <p className="text-xs text-danger">{errors.dueDate}</p>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.id}</DialogTitle>
            <DialogDescription>Invoice details and payment status</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[110px_1fr]">
              <dt className="text-muted-foreground">Couple</dt>
              <dd className="font-medium">{coupleLabel(getCouple(selected.coupleId))}</dd>
              <dt className="text-muted-foreground">Treatment</dt>
              <dd>{selected.item}</dd>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-semibold">{inr(selected.amount)}</dd>
              <dt className="text-muted-foreground">Due date</dt>
              <dd>{selected.date}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge label={selected.status} tone="muted" />
              </dd>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => selected && downloadInvoice(selected)}>
              <Download className="size-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
