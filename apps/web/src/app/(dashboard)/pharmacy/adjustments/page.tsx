"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { formatDateTime, type PageResult } from "@/components/pharmacy/format";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reason: string | null;
  productName?: string;
  batchNumber?: string;
  actorName: string | null;
  createdAt: string;
};

type BatchOption = {
  id: string;
  batchNumber: string;
  productId: string;
  product?: { id: string; name: string };
};

export default function PharmacyAdjustmentsPage() {
  const [data, setData] = useState<PageResult<Movement> | null>(null);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batchId: "",
    quantity: "",
    type: "ADJUSTMENT" as const,
    reason: "",
    direction: "decrease" as "increase" | "decrease",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<PageResult<Movement>>("/api/v1/pharmacy/inventory/movements?pageSize=50");
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load movements.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const batchRes = await apiGet<PageResult<BatchOption>>("/api/v1/pharmacy/inventory?pageSize=100");
        setBatches(batchRes.items);
      } catch {
        /* optional */
      }
    })();
  }, []);

  async function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    const batch = batches.find((b) => b.id === form.batchId);
    if (!batch?.product?.id && !batch?.productId) {
      toast.error("Select a batch.");
      return;
    }
    if (!form.quantity || !form.reason.trim()) {
      toast.error("Quantity and reason are required.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/pharmacy/inventory/adjust", {
        productId: batch.product?.id ?? batch.productId,
        batchId: form.batchId,
        quantity: Number(form.quantity),
        type: form.type,
        reason: form.reason.trim(),
        direction: form.direction,
      });
      toast.success("Adjustment recorded.");
      setForm({ batchId: "", quantity: "", type: "ADJUSTMENT", reason: "", direction: "decrease" });
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to record adjustment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Audit trail of inventory corrections and write-offs."
      />

      <section className="rounded-xl border bg-background p-4">
        <h2 className="mb-3 text-sm font-semibold">New adjustment</h2>
        <form onSubmit={submitAdjustment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1 sm:col-span-2">
            <Label>Batch</Label>
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required>
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.product?.name ?? "Product"} · {b.batchNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
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
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as "increase" | "decrease" })}>
              <option value="decrease">Decrease</option>
              <option value="increase">Increase</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Apply"}</Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-background">
        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState title="Unable to load movements." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : !data?.items.length ? (
          <EmptyState title="No stock movements yet." description="Adjustments and stock changes will appear here." />
        ) : (
          <>
            <MobileCards>
              {data.items.map((move) => (
                <RecordCard key={move.id}>
                  <p className="font-semibold">{move.type.replaceAll("_", " ")}</p>
                  <p className="text-sm text-muted-foreground">{move.productName ?? "Product"} · Batch {move.batchNumber ?? "—"}</p>
                  <p className="mt-2 text-sm">
                    {move.quantity > 0 ? "+" : ""}{move.quantity} · Balance {move.balanceAfter}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{move.reason ?? "—"} · {formatDateTime(move.createdAt)}</p>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 font-medium">Batch</th>
                    <th className="px-4 py-2 font-medium">Qty</th>
                    <th className="px-4 py-2 font-medium">Balance</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                    <th className="px-4 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((move) => (
                    <tr key={move.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{move.type.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3">{move.productName ?? "—"}</td>
                      <td className="px-4 py-3">{move.batchNumber ?? "—"}</td>
                      <td className="px-4 py-3">{move.quantity > 0 ? "+" : ""}{move.quantity}</td>
                      <td className="px-4 py-3">{move.balanceAfter}</td>
                      <td className="px-4 py-3">{move.reason ?? "—"}</td>
                      <td className="px-4 py-3">{formatDateTime(move.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
          </>
        )}
      </section>
    </div>
  );
}
