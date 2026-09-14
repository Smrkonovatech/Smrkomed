"use client";

import { Plus, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDateTime,
  formatINR,
  type PageResult,
  paymentStatusTone,
} from "@/components/pharmacy/format";
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
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Sale = {
  id: string;
  invoiceNumber: string;
  patientName: string | null;
  doctorName: string | null;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  itemCount: number;
  soldAt: string;
};

type ProductOption = { id: string; name: string };
type BatchOption = { id: string; batchNumber: string; availableQuantity: number; sellingPrice: number; productId: string };

type SaleLine = { productId: string; batchId: string; quantity: string; unitPrice: string };

export default function PharmacySalesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Sale> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);

  async function createInvoiceFromSale(sale: Sale) {
    setInvoiceBusy(sale.id);
    try {
      await apiPost(`/api/v1/payments/pharmacy-sales/${sale.id}/invoice`);
      toast.success("Invoice created — opening billing.");
      router.push("/billing");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create invoice.");
    } finally {
      setInvoiceBusy(null);
    }
  }

  const [form, setForm] = useState({
    patientId: "",
    coupleId: "",
    doctorName: "",
    paymentMethod: "CASH",
    notes: "",
    lines: [{ productId: "", batchId: "", quantity: "1", unitPrice: "" }] as SaleLine[],
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<PageResult<Sale>>(`/api/v1/pharmacy/sales?page=${page}&pageSize=25`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load sales.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  useEffect(() => {
    if (!dialogOpen) return;
    void (async () => {
      try {
        const [prodRes, batchRes] = await Promise.all([
          apiGet<PageResult<ProductOption>>("/api/v1/pharmacy/products?pageSize=100&status=ACTIVE"),
          apiGet<PageResult<BatchOption>>("/api/v1/pharmacy/inventory?pageSize=100&status=IN_STOCK"),
        ]);
        setProducts(prodRes.items);
        setBatches(batchRes.items.filter((b) => b.availableQuantity > 0));
      } catch {
        /* optional */
      }
    })();
  }, [dialogOpen]);

  function updateLine(index: number, patch: Partial<SaleLine>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  }

  async function createSale(event: FormEvent) {
    event.preventDefault();
    const items = form.lines
      .filter((line) => line.productId && line.batchId && line.quantity)
      .map((line) => ({
        productId: line.productId,
        batchId: line.batchId,
        quantity: Number(line.quantity),
        ...(line.unitPrice ? { unitPrice: Number(line.unitPrice) } : {}),
      }));
    if (!items.length) {
      toast.error("Add at least one product line.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/pharmacy/sales", {
        patientId: form.patientId || null,
        coupleId: form.coupleId || null,
        doctorName: form.doctorName || null,
        paymentMethod: form.paymentMethod,
        notes: form.notes || null,
        items,
      });
      toast.success("Sale recorded.");
      setDialogOpen(false);
      setForm({ patientId: "", coupleId: "", doctorName: "", paymentMethod: "CASH", notes: "", lines: [{ productId: "", batchId: "", quantity: "1", unitPrice: "" }] });
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create sale.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Sales & Billing"
        subtitle="Pharmacy counter sales and walk-in billing."
        actions={
          <Button className="rounded-lg" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Create sale
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState title="Unable to load sales." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : !data?.items.length ? (
          <EmptyState
            title="No sales yet."
            description="Pharmacy sales and invoices will appear here."
            action={<Button onClick={() => setDialogOpen(true)}><Plus className="size-4" /> Create sale</Button>}
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((sale) => (
                <RecordCard key={sale.id}>
                  <p className="font-semibold">{sale.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{sale.patientName ?? "Walk-in"} · {formatDateTime(sale.soldAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge label={sale.paymentStatus} tone={paymentStatusTone(sale.paymentStatus)} />
                    <StatusBadge label={sale.paymentMethod} tone="muted" dot={false} />
                  </div>
                  <p className="mt-2 text-sm font-semibold tabular-nums">{formatINR(sale.totalAmount)}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled={invoiceBusy === sale.id}
                    onClick={() => void createInvoiceFromSale(sale)}
                  >
                    <Receipt className="size-3.5" />
                    {invoiceBusy === sale.id ? "Creating…" : "Create invoice"}
                  </Button>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Invoice</th>
                    <th className="px-4 py-2 font-medium">Patient</th>
                    <th className="px-4 py-2 font-medium">Items</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Payment</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{sale.invoiceNumber}</td>
                      <td className="px-4 py-3">{sale.patientName ?? "Walk-in"}</td>
                      <td className="px-4 py-3">{sale.itemCount}</td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(sale.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={sale.paymentStatus} tone={paymentStatusTone(sale.paymentStatus)} />
                      </td>
                      <td className="px-4 py-3">{formatDateTime(sale.soldAt)}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={invoiceBusy === sale.id}
                          onClick={() => void createInvoiceFromSale(sale)}
                        >
                          {invoiceBusy === sale.id ? "Creating…" : "Create invoice"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>Page {data.page} · {data.total} sales</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={createSale}>
            <DialogHeader>
              <DialogTitle>Create sale</DialogTitle>
              <DialogDescription>Bill medicines from available batches.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Patient ID (optional)</Label>
                <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} placeholder="Patient record ID" />
              </div>
              <div className="space-y-1">
                <Label>Couple ID (optional)</Label>
                <Input value={form.coupleId} onChange={(e) => setForm({ ...form, coupleId: e.target.value })} placeholder="Couple record ID" />
              </div>
              <div className="space-y-1">
                <Label>Doctor name</Label>
                <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Payment method</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, lines: [...form.lines, { productId: "", batchId: "", quantity: "1", unitPrice: "" }] })}
                >
                  Add line
                </Button>
              </div>
              {form.lines.map((line, index) => {
                const productBatches = batches.filter((b) => b.productId === line.productId);
                return (
                  <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
                    <select className="h-9 rounded-md border px-2 text-sm" value={line.productId} onChange={(e) => updateLine(index, { productId: e.target.value, batchId: "" })}>
                      <option value="">Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select className="h-9 rounded-md border px-2 text-sm" value={line.batchId} onChange={(e) => updateLine(index, { batchId: e.target.value })}>
                      <option value="">Batch</option>
                      {productBatches.map((b) => (
                        <option key={b.id} value={b.id}>{b.batchNumber} ({b.availableQuantity})</option>
                      ))}
                    </select>
                    <Input type="number" min="1" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
                    <Input type="number" min="0" step="0.01" placeholder="Unit price" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: e.target.value })} />
                  </div>
                );
              })}
            </div>

            <div className="mt-3 space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create sale"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
