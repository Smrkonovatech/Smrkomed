"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  formatDate,
  stockStatusLabel,
  stockStatusTone,
} from "@/components/pharmacy/format";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type Alerts = {
  lowStock: Array<{ productId: string; name: string; currentStock: number; minimumStock: number; reorderLevel: number }>;
  expiringSoon: Array<{
    id: string;
    batchNumber: string;
    availableQuantity: number;
    expiryDate: string | null;
    daysRemaining: number | null;
    status: string;
    product?: { id: string; name: string };
  }>;
  expired: Array<{
    id: string;
    batchNumber: string;
    availableQuantity: number;
    expiryDate: string | null;
    status: string;
    product?: { id: string; name: string };
  }>;
};

export default function PharmacyAlertsPage() {
  const [warningDays, setWarningDays] = useState("30");
  const [data, setData] = useState<Alerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<Alerts>(`/api/v1/pharmacy/alerts?warningDays=${warningDays}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load alerts.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [warningDays]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Expiry & Alerts"
        subtitle="Low stock, expiring batches, and expired inventory."
        actions={
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={warningDays}
            onChange={(e) => setWarningDays(e.target.value)}
          >
            <option value="30">30 day warning</option>
            <option value="60">60 day warning</option>
            <option value="90">90 day warning</option>
          </select>
        }
      />

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <EmptyState title="Unable to load alerts." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
      ) : !data ? null : (
        <>
          <section className="rounded-xl border bg-background p-4">
            <h2 className="mb-3 text-sm font-semibold">Low stock</h2>
            {!data.lowStock.length ? (
              <EmptyState title="No low stock alerts." description="Products below reorder level will appear here." />
            ) : (
              <AlertList
                rows={data.lowStock.map((row) => ({
                  key: row.productId,
                  title: row.name,
                  subtitle: `Min ${row.minimumStock} · Reorder ${row.reorderLevel}`,
                  badge: `${row.currentStock} left`,
                  tone: "warning" as const,
                  href: `/pharmacy/products/${row.productId}`,
                }))}
              />
            )}
          </section>

          <section className="rounded-xl border bg-background p-4">
            <h2 className="mb-3 text-sm font-semibold">Expiring soon</h2>
            {!data.expiringSoon.length ? (
              <EmptyState title="No batches expiring soon." description={`Nothing expiring within ${warningDays} days.`} />
            ) : (
              <>
                <MobileCards className="md:hidden">
                  {data.expiringSoon.map((batch) => (
                    <RecordCard key={batch.id}>
                      <p className="font-semibold">{batch.product?.name ?? "Product"}</p>
                      <p className="text-sm text-muted-foreground">Batch {batch.batchNumber} · {formatDate(batch.expiryDate)}</p>
                      <div className="mt-2">
                        <StatusBadge label={`${batch.availableQuantity} units`} tone="warning" />
                      </div>
                    </RecordCard>
                  ))}
                </MobileCards>
                <MdTableWrap>
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Product</th>
                        <th className="px-4 py-2 font-medium">Batch</th>
                        <th className="px-4 py-2 font-medium">Qty</th>
                        <th className="px-4 py-2 font-medium">Expiry</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expiringSoon.map((batch) => (
                        <tr key={batch.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{batch.product?.name ?? "—"}</td>
                          <td className="px-4 py-3">{batch.batchNumber}</td>
                          <td className="px-4 py-3">{batch.availableQuantity}</td>
                          <td className="px-4 py-3">{formatDate(batch.expiryDate)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge label={stockStatusLabel[batch.status as keyof typeof stockStatusLabel] ?? batch.status} tone={stockStatusTone(batch.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </MdTableWrap>
              </>
            )}
          </section>

          <section className="rounded-xl border bg-background p-4">
            <h2 className="mb-3 text-sm font-semibold">Expired</h2>
            {!data.expired.length ? (
              <EmptyState title="No expired batches with stock." description="Expired inventory requiring action will appear here." />
            ) : (
              <>
                <MobileCards className="md:hidden">
                  {data.expired.map((batch) => (
                    <RecordCard key={batch.id}>
                      <p className="font-semibold">{batch.product?.name ?? "Product"}</p>
                      <p className="text-sm text-muted-foreground">Batch {batch.batchNumber} · Exp {formatDate(batch.expiryDate)}</p>
                      <div className="mt-2">
                        <StatusBadge label="Expired" tone="danger" />
                      </div>
                    </RecordCard>
                  ))}
                </MobileCards>
                <MdTableWrap>
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Product</th>
                        <th className="px-4 py-2 font-medium">Batch</th>
                        <th className="px-4 py-2 font-medium">Qty</th>
                        <th className="px-4 py-2 font-medium">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expired.map((batch) => (
                        <tr key={batch.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{batch.product?.name ?? "—"}</td>
                          <td className="px-4 py-3">{batch.batchNumber}</td>
                          <td className="px-4 py-3">{batch.availableQuantity}</td>
                          <td className="px-4 py-3">{formatDate(batch.expiryDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </MdTableWrap>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AlertList({
  rows,
}: {
  rows: Array<{ key: string; title: string; subtitle: string; badge: string; tone: "warning" | "danger"; href?: string }>;
}) {
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            {row.href ? (
              <Link href={row.href} className="font-medium hover:underline">{row.title}</Link>
            ) : (
              <p className="font-medium">{row.title}</p>
            )}
            <p className="text-xs text-muted-foreground">{row.subtitle}</p>
          </div>
          <StatusBadge label={row.badge} tone={row.tone} />
        </li>
      ))}
    </ul>
  );
}
