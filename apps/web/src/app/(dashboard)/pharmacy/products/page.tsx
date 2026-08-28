"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatINR,
  type PageResult,
  productStatusTone,
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

type Product = {
  id: string;
  name: string;
  genericName: string | null;
  category: string | null;
  manufacturer: string | null;
  unit: string;
  currentStock: number;
  defaultSellingPrice: number;
  status: string;
  prescriptionRequired: boolean;
  imageUrl: string | null;
  lowStock: boolean;
};

const emptyForm = {
  name: "",
  genericName: "",
  category: "",
  manufacturer: "",
  unit: "unit",
  packSize: "",
  defaultPurchasePrice: "",
  defaultSellingPrice: "",
  defaultMrp: "",
  minimumStock: "0",
  reorderLevel: "0",
  prescriptionRequired: false,
};

export default function PharmacyProductsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    try {
      const next = await apiGet<PageResult<Product>>(`/api/v1/pharmacy/products?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load products.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, query, category, status]);

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiPost<Product>("/api/v1/pharmacy/products", {
        name: form.name.trim(),
        genericName: form.genericName || null,
        category: form.category || null,
        manufacturer: form.manufacturer || null,
        unit: form.unit || "unit",
        packSize: form.packSize || null,
        defaultPurchasePrice: form.defaultPurchasePrice ? Number(form.defaultPurchasePrice) : undefined,
        defaultSellingPrice: form.defaultSellingPrice ? Number(form.defaultSellingPrice) : undefined,
        defaultMrp: form.defaultMrp ? Number(form.defaultMrp) : undefined,
        minimumStock: Number(form.minimumStock) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        prescriptionRequired: form.prescriptionRequired,
      });
      toast.success("Product created.");
      setDialogOpen(false);
      setForm(emptyForm);
      router.push(`/pharmacy/products/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Products"
        subtitle="Medicine catalogue with pricing and stock thresholds."
        actions={
          <Button className="rounded-lg" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Add product
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="grid gap-3 border-b p-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search name, generic, or brand"
              className="h-9 rounded-lg pl-9"
            />
          </div>
          <Input
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            placeholder="Category"
            className="h-9 rounded-lg"
          />
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState title="Unable to load products." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : !data?.items.length ? (
          <EmptyState
            title={query || category || status ? "No products matched your filters." : "No products yet."}
            description="Add medicines to start tracking inventory and sales."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" /> Add product
              </Button>
            }
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((product) => (
                <RecordCard key={product.id}>
                  <div className="flex items-start gap-3">
                    <ProductThumb name={product.name} imageUrl={product.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category ?? "Uncategorised"}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge label={product.status} tone={productStatusTone(product.status)} />
                        {product.lowStock && <StatusBadge label="Low stock" tone="warning" />}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Stock: {product.currentStock} · {formatINR(product.defaultSellingPrice)}
                      </p>
                      <Button asChild size="sm" className="mt-3 w-full">
                        <Link href={`/pharmacy/products/${product.id}`}>Open</Link>
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
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 font-medium">Stock</th>
                    <th className="px-4 py-2 font-medium">Price</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((product) => (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductThumb name={product.name} imageUrl={product.imageUrl} />
                          <div>
                            <Link href={`/pharmacy/products/${product.id}`} className="font-medium hover:underline">
                              {product.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{product.genericName ?? product.manufacturer ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{product.category ?? "—"}</td>
                      <td className="px-4 py-3">
                        {product.currentStock} {product.unit}
                        {product.lowStock && (
                          <StatusBadge label="Low" tone="warning" className="ml-2" />
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(product.defaultSellingPrice)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={product.status} tone={productStatusTone(product.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {data.page} · {data.total} products
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={createProduct}>
            <DialogHeader>
              <DialogTitle>Add product</DialogTitle>
              <DialogDescription>Create a medicine entry in the pharmacy catalogue.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="prod-name">Name *</Label>
                <Input id="prod-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-generic">Generic name</Label>
                <Input id="prod-generic" value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-category">Category</Label>
                <Input id="prod-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-manufacturer">Manufacturer</Label>
                <Input id="prod-manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-unit">Unit</Label>
                <Input id="prod-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-purchase">Purchase price</Label>
                <Input id="prod-purchase" type="number" min="0" step="0.01" value={form.defaultPurchasePrice} onChange={(e) => setForm({ ...form, defaultPurchasePrice: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-selling">Selling price</Label>
                <Input id="prod-selling" type="number" min="0" step="0.01" value={form.defaultSellingPrice} onChange={(e) => setForm({ ...form, defaultSellingPrice: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-mrp">MRP</Label>
                <Input id="prod-mrp" type="number" min="0" step="0.01" value={form.defaultMrp} onChange={(e) => setForm({ ...form, defaultMrp: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-min">Minimum stock</Label>
                <Input id="prod-min" type="number" min="0" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-reorder">Reorder level</Label>
                <Input id="prod-reorder" type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.prescriptionRequired}
                  onChange={(e) => setForm({ ...form, prescriptionRequired: e.target.checked })}
                />
                Prescription required
              </label>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
