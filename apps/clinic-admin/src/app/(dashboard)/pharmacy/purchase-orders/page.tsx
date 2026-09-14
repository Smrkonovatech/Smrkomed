"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDate,
  formatINR,
  type PageResult,
  poStatusTone,
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

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  supplier?: { name: string };
  items: Array<{
    id: string;
    productId: string;
    quantityOrdered: number;
    quantityReceived: number;
    product?: { name: string };
  }>;
};

type SupplierOption = { id: string; name: string };
type ProductOption = { id: string; name: string };

type PoLine = { productId: string; quantityOrdered: string; purchasePrice: string };

export default function PharmacyPurchaseOrdersPage() {
  const [data, setData] = useState<PageResult<PurchaseOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [createForm, setCreateForm] = useState({
    supplierId: "",
    expectedDelivery: "",
    notes: "",
    lines: [{ productId: "", quantityOrdered: "1", purchasePrice: "" }] as PoLine[],
  });

  const [receiveLines, setReceiveLines] = useState<Record<string, { quantityReceived: string; batchNumber: string; expiryDate: string }>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<PageResult<PurchaseOrder>>("/api/v1/pharmacy/purchase-orders?pageSize=25");
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load purchase orders.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!createOpen && !receivePo) return;
    void (async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          apiGet<PageResult<SupplierOption>>("/api/v1/pharmacy/suppliers?pageSize=100&status=ACTIVE"),
          apiGet<PageResult<ProductOption>>("/api/v1/pharmacy/products?pageSize=100&status=ACTIVE"),
        ]);
        setSuppliers(supRes.items);
        setProducts(prodRes.items);
      } catch {
        /* optional */
      }
    })();
  }, [createOpen, receivePo]);

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    if (!createForm.supplierId) {
      toast.error("Select a supplier.");
      return;
    }
    const items = createForm.lines
      .filter((line) => line.productId && line.quantityOrdered && line.purchasePrice)
      .map((line) => ({
        productId: line.productId,
        quantityOrdered: Number(line.quantityOrdered),
        purchasePrice: Number(line.purchasePrice),
      }));
    if (!items.length) {
      toast.error("Add at least one line item.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/pharmacy/purchase-orders", {
        supplierId: createForm.supplierId,
        expectedDelivery: createForm.expectedDelivery || null,
        notes: createForm.notes || null,
        status: "ORDERED",
        items,
      });
      toast.success("Purchase order created.");
      setCreateOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create purchase order.");
    } finally {
      setSaving(false);
    }
  }

  async function receiveOrder(event: FormEvent) {
    event.preventDefault();
    if (!receivePo) return;
    const items = receivePo.items
      .map((item) => {
        const entry = receiveLines[item.id];
        if (!entry?.quantityReceived || !entry.batchNumber || !entry.expiryDate) return null;
        return {
          itemId: item.id,
          quantityReceived: Number(entry.quantityReceived),
          batchNumber: entry.batchNumber.trim(),
          expiryDate: entry.expiryDate,
        };
      })
      .filter(Boolean);
    if (!items.length) {
      toast.error("Fill receive details for at least one item.");
      return;
    }
    setSaving(true);
    try {
      await apiPost(`/api/v1/pharmacy/purchase-orders/${receivePo.id}/receive`, { items });
      toast.success("Stock received.");
      setReceivePo(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to receive stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Purchase Orders"
        subtitle="Order medicines from suppliers and receive stock."
        actions={
          <Button className="rounded-lg" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Create order
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState title="Unable to load purchase orders." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : !data?.items.length ? (
          <EmptyState
            title="No purchase orders yet."
            description="Create orders to replenish pharmacy stock."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Create order</Button>}
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((po) => (
                <RecordCard key={po.id}>
                  <p className="font-semibold">{po.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{po.supplier?.name ?? "Supplier"} · {formatDate(po.orderDate)}</p>
                  <div className="mt-2">
                    <StatusBadge label={po.status.replaceAll("_", " ")} tone={poStatusTone(po.status)} />
                  </div>
                  <p className="mt-2 text-sm font-semibold tabular-nums">{formatINR(po.totalAmount)}</p>
                  {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                    <Button size="sm" className="mt-3 w-full" onClick={() => { setReceivePo(po); setReceiveLines({}); }}>
                      Receive
                    </Button>
                  )}
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Order</th>
                    <th className="px-4 py-2 font-medium">Supplier</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Items</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((po) => (
                    <tr key={po.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{po.orderNumber}</td>
                      <td className="px-4 py-3">{po.supplier?.name ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(po.orderDate)}</td>
                      <td className="px-4 py-3">{po.items.length}</td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(po.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={po.status.replaceAll("_", " ")} tone={poStatusTone(po.status)} />
                      </td>
                      <td className="px-4 py-3">
                        {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                          <Button size="sm" variant="outline" onClick={() => { setReceivePo(po); setReceiveLines({}); }}>
                            Receive
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
          </>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={createOrder}>
            <DialogHeader>
              <DialogTitle>Create purchase order</DialogTitle>
              <DialogDescription>Order medicines from a supplier.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Supplier *</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={createForm.supplierId} onChange={(e) => setCreateForm({ ...createForm, supplierId: e.target.value })} required>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Expected delivery</Label>
                <Input type="date" value={createForm.expectedDelivery} onChange={(e) => setCreateForm({ ...createForm, expectedDelivery: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {createForm.lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
                  <select className="h-9 rounded-md border px-2 text-sm" value={line.productId} onChange={(e) => {
                    const next = [...createForm.lines];
                    next[index] = { ...line, productId: e.target.value };
                    setCreateForm({ ...createForm, lines: next });
                  }}>
                    <option value="">Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <Input type="number" min="1" placeholder="Qty" value={line.quantityOrdered} onChange={(e) => {
                    const next = [...createForm.lines];
                    next[index] = { ...line, quantityOrdered: e.target.value };
                    setCreateForm({ ...createForm, lines: next });
                  }} />
                  <Input type="number" min="0" step="0.01" placeholder="Price" value={line.purchasePrice} onChange={(e) => {
                    const next = [...createForm.lines];
                    next[index] = { ...line, purchasePrice: e.target.value };
                    setCreateForm({ ...createForm, lines: next });
                  }} />
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setCreateForm({ ...createForm, lines: [...createForm.lines, { productId: "", quantityOrdered: "1", purchasePrice: "" }] })}>
                Add line
              </Button>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create order"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receivePo)} onOpenChange={(open) => !open && setReceivePo(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={receiveOrder}>
            <DialogHeader>
              <DialogTitle>Receive stock</DialogTitle>
              <DialogDescription>{receivePo?.orderNumber} · enter batch details per line</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {receivePo?.items.map((item) => {
                const remaining = item.quantityOrdered - item.quantityReceived;
                if (remaining <= 0) return null;
                return (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-medium">{item.product?.name ?? "Product"}</p>
                    <p className="text-xs text-muted-foreground">Remaining: {remaining}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <Input placeholder="Qty received" type="number" min="1" max={remaining} value={receiveLines[item.id]?.quantityReceived ?? ""} onChange={(e) => setReceiveLines({ ...receiveLines, [item.id]: { ...receiveLines[item.id], quantityReceived: e.target.value, batchNumber: receiveLines[item.id]?.batchNumber ?? "", expiryDate: receiveLines[item.id]?.expiryDate ?? "" } })} />
                      <Input placeholder="Batch number" value={receiveLines[item.id]?.batchNumber ?? ""} onChange={(e) => setReceiveLines({ ...receiveLines, [item.id]: { ...receiveLines[item.id], batchNumber: e.target.value, quantityReceived: receiveLines[item.id]?.quantityReceived ?? "", expiryDate: receiveLines[item.id]?.expiryDate ?? "" } })} />
                      <Input type="date" value={receiveLines[item.id]?.expiryDate ?? ""} onChange={(e) => setReceiveLines({ ...receiveLines, [item.id]: { ...receiveLines[item.id], expiryDate: e.target.value, quantityReceived: receiveLines[item.id]?.quantityReceived ?? "", batchNumber: receiveLines[item.id]?.batchNumber ?? "" } })} />
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setReceivePo(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Receiving…" : "Confirm receive"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
