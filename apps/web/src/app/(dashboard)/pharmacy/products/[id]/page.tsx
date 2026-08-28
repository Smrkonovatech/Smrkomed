"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import {
  formatDate,
  formatDateTime,
  formatINR,
  stockStatusLabel,
  stockStatusTone,
  productStatusTone,
} from "@/components/pharmacy/format";
import { ProductThumb } from "@/components/pharmacy/product-thumb";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type ProductDetail = {
  id: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  category: string | null;
  subCategory: string | null;
  description: string | null;
  manufacturer: string | null;
  unit: string;
  packSize: string | null;
  medicineType: string | null;
  imageUrl: string | null;
  prescriptionRequired: boolean;
  minimumStock: number;
  reorderLevel: number;
  defaultPurchasePrice: number;
  defaultSellingPrice: number;
  defaultMrp: number;
  gstPercent: number;
  status: string;
  currentStock: number;
  lowStock: boolean;
  batches: Array<{
    id: string;
    batchNumber: string;
    availableQuantity: number;
    expiryDate: string | null;
    purchasePrice: number;
    sellingPrice: number;
    mrp: number;
    status: string;
    supplier?: { name: string } | null;
  }>;
  recentMovements: Array<{
    id: string;
    type: string;
    quantity: number;
    balanceAfter: number;
    reason: string | null;
    batchNumber?: string;
    actorName: string | null;
    createdAt: string;
  }>;
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await apiGet<ProductDetail>(`/api/v1/pharmacy/products/${id}`);
        if (!cancelled) setProduct(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load product.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <EmptyState
          title="Unable to load product."
          description={error ?? "Product not found."}
          action={
            <Button asChild variant="outline">
              <Link href="/pharmacy/products">Back to products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 rounded-lg text-muted-foreground">
        <Link href="/pharmacy/products">
          <ArrowLeft className="size-4" /> All products
        </Link>
      </Button>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start">
          <ProductThumb name={product.name} imageUrl={product.imageUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={product.status} tone={productStatusTone(product.status)} />
              {product.prescriptionRequired && <StatusBadge label="Rx required" tone="purple" />}
              {product.lowStock && <StatusBadge label="Low stock" tone="warning" />}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{product.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[product.genericName, product.manufacturer, product.category].filter(Boolean).join(" · ") || "No additional details"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoChip label="Current stock" value={`${product.currentStock} ${product.unit}`} />
            <InfoChip label="Selling price" value={formatINR(product.defaultSellingPrice)} />
            <InfoChip label="MRP" value={formatINR(product.defaultMrp)} />
            <InfoChip label="GST" value={`${product.gstPercent}%`} />
          </div>
        </div>
        {product.description && (
          <p className="border-b px-5 py-4 text-sm text-muted-foreground">{product.description}</p>
        )}
      </section>

      <section className="rounded-xl border bg-background p-4">
        <PageHeader title="Batches" subtitle="Stock by batch with expiry and pricing." />
        {!product.batches.length ? (
          <EmptyState
            title="No batches in stock."
            description="Receive inventory to create batches for this product."
            action={
              <Button asChild>
                <Link href="/pharmacy/inventory">Add stock</Link>
              </Button>
            }
          />
        ) : (
          <>
            <MobileCards className="md:hidden">
              {product.batches.map((batch) => (
                <RecordCard key={batch.id}>
                  <p className="font-semibold">Batch {batch.batchNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {batch.availableQuantity} {product.unit} · Exp {formatDate(batch.expiryDate)}
                  </p>
                  <div className="mt-2">
                    <StatusBadge label={stockStatusLabel[batch.status as keyof typeof stockStatusLabel] ?? batch.status} tone={stockStatusTone(batch.status)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatINR(batch.sellingPrice)} · {batch.supplier?.name ?? "No supplier"}
                  </p>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Batch</th>
                    <th className="px-4 py-2 font-medium">Qty</th>
                    <th className="px-4 py-2 font-medium">Expiry</th>
                    <th className="px-4 py-2 font-medium">Price</th>
                    <th className="px-4 py-2 font-medium">Supplier</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product.batches.map((batch) => (
                    <tr key={batch.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{batch.batchNumber}</td>
                      <td className="px-4 py-3">{batch.availableQuantity}</td>
                      <td className="px-4 py-3">{formatDate(batch.expiryDate)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(batch.sellingPrice)}</td>
                      <td className="px-4 py-3">{batch.supplier?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={stockStatusLabel[batch.status as keyof typeof stockStatusLabel] ?? batch.status}
                          tone={stockStatusTone(batch.status)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
          </>
        )}
      </section>

      {product.recentMovements.length > 0 && (
        <section className="rounded-xl border bg-background p-4">
          <h2 className="mb-3 text-sm font-semibold">Recent movements</h2>
          <ul className="space-y-2 text-sm">
            {product.recentMovements.map((move) => (
              <li key={move.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="font-medium">
                    {move.type.replaceAll("_", " ")} · {move.quantity > 0 ? "+" : ""}
                    {move.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {move.batchNumber ?? "Batch"} · {move.reason ?? "—"} · {move.actorName ?? "System"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(move.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
