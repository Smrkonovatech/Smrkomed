"use client";

import { Plus, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDate,
  formatINR,
  type PageResult,
  stockStatusLabel,
  stockStatusTone,
} from "@/components/pharmacy/format";
import { ProductThumb } from "@/components/pharmacy/product-thumb";
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

type Batch = {
  id: string;
  batchNumber: string;
  availableQuantity: number;
  quantity: number;
  expiryDate: string | null;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  status: string;
  storageLocation: string | null;
  product?: { id: string; name: string; imageUrl?: string | null; unit?: string };
  supplier?: { id: string; name: string } | null;
};

type ProductOption = { id: string; name: string };
type SupplierOption = { id: string; name: string };

export default function PharmacyInventoryPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Batch> | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState({
    productId: "",
    supplierId: "",
    batchNumber: "",
    quantity: "",
    purchasePrice: "",
    sellingPrice: "",
    expiryDate: "",
    storageLocation: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: "",
    type: "ADJUSTMENT" as const,
    reason: "",
    direction: "decrease" as "increase" | "decrease",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (query.trim()) params.set("q", query.trim());
    try {
      const next = await apiGet<PageResult<Batch>>(`/api/v1/pharmacy/inventory?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load inventory.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, query]);

  useEffect(() => {
    void (async () => {
      try {
        const [prodRes, supRes] = await Promise.all([
          apiGet<PageResult<ProductOption>>("/api/v1/pharmacy/products?pageSize=100&status=ACTIVE"),
          apiGet<PageResult<SupplierOption>>("/api/v1/pharmacy/suppliers?pageSize=100&status=ACTIVE"),
        ]);
        setProducts(prodRes.items);
        setSuppliers(supRes.items);
      } catch {
        /* optional lookups */
      }
    })();
  }, []);

  async function addStock(event: FormEvent) {
    event.preventDefault();
    if (!addForm.productId || !addForm.batchNumber || !addForm.quantity) {
      toast.error("Product, batch number, and quantity are required.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/pharmacy/inventory", {
        productId: addForm.productId,
        supplierId: addForm.supplierId || null,
        batchNumber: addForm.batchNumber.trim(),
        quantity: Number(addForm.quantity),
        purchasePrice: addForm.purchasePrice ? Number(addForm.purchasePrice) : undefined,
        sellingPrice: addForm.sellingPrice ? Number(addForm.sellingPrice) : undefined,
        expiryDate: addForm.expiryDate || null,
        storageLocation: addForm.storageLocation || null,
      });
      toast.success("Stock added.");
      setAddOpen(false);
      setAddForm({ productId: "", supplierId: "", batchNumber: "", quantity: "", purchasePrice: "", sellingPrice: "", expiryDate: "", storageLocation: "" });
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to add stock.");
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock(event: FormEvent) {
    event.preventDefault();
    if (!selectedBatch?.product?.id || !adjustForm.quantity || !adjustForm.reason.trim()) {
      toast.error("Quantity and reason are required.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/pharmacy/inventory/adjust", {
        productId: selectedBatch.product!.id,
        batchId: selectedBatch.id,
        quantity: Number(adjustForm.quantity),
        type: adjustForm.type,
        reason: adjustForm.reason.trim(),
        direction: adjustForm.direction,
      });
      toast.success("Stock adjusted.");
      setAdjustOpen(false);
      setSelectedBatch(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to adjust stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Inventory"
        subtitle="Batch-level stock with expiry tracking."
        actions={
          <Button className="rounded-lg" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add stock
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="border-b p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search product or batch number"
              className="h-9 rounded-lg pl-9"
            />
          </div>
        </div>

        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState title="Unable to load inventory." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : !data?.items.length ? (
          <EmptyState
            title="No inventory batches."
            description="Receive stock to start tracking batch inventory."
            action={<Button onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add stock</Button>}
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((batch) => (
                <RecordCard key={batch.id}>
                  <div className="flex items-start gap-3">
                    <ProductThumb name={batch.product?.name ?? "Product"} imageUrl={batch.product?.imageUrl ?? null} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{batch.product?.name ?? "Product"}</p>
                      <p className="text-sm text-muted-foreground">Batch {batch.batchNumber}</p>
                      <div className="mt-2">
                        <StatusBadge label={stockStatusLabel[batch.status as keyof typeof stockStatusLabel] ?? batch.status} tone={stockStatusTone(batch.status)} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {batch.availableQuantity} units · Exp {formatDate(batch.expiryDate)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => {
                          setSelectedBatch(batch);
                          setAdjustForm({ quantity: "", type: "ADJUSTMENT", reason: "", direction: "decrease" });
                          setAdjustOpen(true);
                        }}
                      >
                        Adjust
                      </Button>
                    </div>
                  </div>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[960px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium">Batch</th>
                    <th className="px-4 py-2 font-medium">Available</th>
                    <th className="px-4 py-2 font-medium">Expiry</th>
                    <th className="px-4 py-2 font-medium">Price</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((batch) => (
                    <tr key={batch.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProductThumb name={batch.product?.name ?? "Product"} imageUrl={batch.product?.imageUrl ?? null} />
                          <span>{batch.product?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{batch.batchNumber}</td>
                      <td className="px-4 py-3">{batch.availableQuantity}</td>
                      <td className="px-4 py-3">{formatDate(batch.expiryDate)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(batch.sellingPrice)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={stockStatusLabel[batch.status as keyof typeof stockStatusLabel] ?? batch.status} tone={stockStatusTone(batch.status)} />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setAdjustForm({ quantity: "", type: "ADJUSTMENT", reason: "", direction: "decrease" });
                            setAdjustOpen(true);
                          }}
                        >
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
          </>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={addStock}>
            <DialogHeader>
              <DialogTitle>Add stock</DialogTitle>
              <DialogDescription>Receive a new batch into inventory.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Product *</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={addForm.productId} onChange={(e) => setAddForm({ ...addForm, productId: e.target.value })} required>
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Batch number *</Label>
                <Input value={addForm.batchNumber} onChange={(e) => setAddForm({ ...addForm, batchNumber: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={addForm.supplierId} onChange={(e) => setAddForm({ ...addForm, supplierId: e.target.value })}>
                  <option value="">None</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Expiry date</Label>
                <Input type="date" value={addForm.expiryDate} onChange={(e) => setAddForm({ ...addForm, expiryDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Purchase price</Label>
                <Input type="number" min="0" step="0.01" value={addForm.purchasePrice} onChange={(e) => setAddForm({ ...addForm, purchasePrice: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Selling price</Label>
                <Input type="number" min="0" step="0.01" value={addForm.sellingPrice} onChange={(e) => setAddForm({ ...addForm, sellingPrice: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Storage location</Label>
                <Input value={addForm.storageLocation} onChange={(e) => setAddForm({ ...addForm, storageLocation: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add stock"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={adjustStock}>
            <DialogHeader>
              <DialogTitle>Adjust stock</DialogTitle>
              <DialogDescription>
                {selectedBatch ? `${selectedBatch.product?.name} · Batch ${selectedBatch.batchNumber}` : "Adjust batch quantity"}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as typeof adjustForm.type })}>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="RETURNED">Returned</option>
                  <option value="TRANSFER_IN">Transfer in</option>
                  <option value="TRANSFER_OUT">Transfer out</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Direction</Label>
                <select className="h-9 w-full rounded-md border px-2 text-sm" value={adjustForm.direction} onChange={(e) => setAdjustForm({ ...adjustForm, direction: e.target.value as "increase" | "decrease" })}>
                  <option value="decrease">Decrease</option>
                  <option value="increase">Increase</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Reason *</Label>
                <Input value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} required />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Apply adjustment"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
