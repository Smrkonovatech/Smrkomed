"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  IndianRupee,
  Package,
  Pill,
  ShoppingCart,
  Stethoscope,
  Warehouse,
} from "lucide-react";
import { useEffect, useState } from "react";

import { formatDate, formatDateTime, formatINR, prescriptionStatusTone, reminderStatusTone } from "@/components/pharmacy/format";
import { ProductThumb } from "@/components/pharmacy/product-thumb";
import { ReminderMessageDialog } from "@/components/pharmacy/reminder-message-dialog";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, KpiCard, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet } from "@/lib/api/client";

type Dashboard = {
  totals: {
    products: number;
    activeProducts?: number;
    stockItems: number;
    lowStock: number;
    outOfStock?: number;
    expiringSoon: number;
    expired?: number;
    todaySales: number;
    todaySalesAmount: number;
    todayPrescriptions?: number;
    pendingPrescriptions: number;
    pendingDispensing?: number;
    upcomingReminders?: number;
  };
  lowStock: Array<{
    productId: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
  }>;
  expiringSoon: Array<{
    id: string;
    batchNumber: string;
    availableQuantity: number;
    expiryDate: string | null;
    daysRemaining: number | null;
    product?: { id: string; name: string };
  }>;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    patientName: string | null;
    totalAmount: number;
    soldAt: string;
    paymentStatus: string;
  }>;
  pendingPrescriptions: Array<{
    id: string;
    patientName: string | null;
    doctorName: string | null;
    prescriptionDate: string;
    status: string;
    items: Array<{ medicineName: string; productImageUrl?: string | null }>;
  }>;
  upcomingReminders?: Array<{
    id: string;
    medicineName: string | null;
    patientName: string | null;
    scheduledAt: string;
    status: string;
    demoMessageBody: string | null;
  }>;
};

export default function PharmacyDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewReminder, setViewReminder] = useState<NonNullable<Dashboard["upcomingReminders"]>[number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await apiGet<Dashboard>("/api/v1/pharmacy/dashboard");
        if (!cancelled) setData(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load pharmacy dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <PageHeader title="Pharmacy" subtitle="Inventory, dispensing, and clinic pharmacy billing." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <PageHeader title="Pharmacy" subtitle="Inventory, dispensing, and clinic pharmacy billing." />
        <EmptyState
          title="Unable to load pharmacy dashboard."
          description={error ?? "Please try again."}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  const t = data.totals;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Pharmacy"
        subtitle="Track stock, dispense prescriptions, and manage clinic pharmacy sales."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-lg" onClick={() => router.push("/pharmacy/sales")}>
              New sale
            </Button>
            <Button variant="outline" className="rounded-lg" onClick={() => router.push("/pharmacy/inventory")}>
              Add stock
            </Button>
            <Button className="rounded-lg" onClick={() => router.push("/pharmacy/prescriptions")}>
              Prescriptions
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <KpiCard label="Total medicines" value={String(t.products)} icon={Pill} tone="primary" />
        <KpiCard label="Active products" value={String(t.activeProducts ?? t.products)} icon={Pill} tone="info" />
        <KpiCard label="Low stock" value={String(t.lowStock)} icon={AlertTriangle} tone="warning" />
        <KpiCard label="Out of stock" value={String(t.outOfStock ?? 0)} icon={Package} tone="danger" />
        <KpiCard label="Expiring soon" value={String(t.expiringSoon)} icon={Package} tone="purple" />
        <KpiCard label="Expired" value={String(t.expired ?? 0)} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Today's sales" value={String(t.todaySales)} hint={formatINR(t.todaySalesAmount)} icon={IndianRupee} tone="success" />
        <KpiCard label="Today's prescriptions" value={String(t.todayPrescriptions ?? 0)} icon={ClipboardList} tone="teal" />
        <KpiCard label="Pending dispensing" value={String(t.pendingDispensing ?? t.pendingPrescriptions)} icon={Stethoscope} tone="teal" />
        {t.upcomingReminders != null && (
          <KpiCard label="Upcoming reminders" value={String(t.upcomingReminders)} icon={Bell} tone="purple" />
        )}
      </div>

      <section className="rounded-xl border bg-background p-4">
        <h2 className="mb-3 text-sm font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["/pharmacy/products", "Add product", Pill],
              ["/pharmacy/inventory", "Receive stock", Warehouse],
              ["/pharmacy/sales", "Create sale", ShoppingCart],
              ["/pharmacy/prescriptions", "New prescription", ClipboardList],
              ["/pharmacy/purchase-orders", "Purchase order", Package],
              ["/pharmacy/alerts", "View alerts", AlertTriangle],
            ] as Array<[string, string, LucideIcon]>
          ).map(([href, label, Icon]) => (
            <Button key={href} variant="outline" className="rounded-lg" asChild>
              <Link href={href}>
                <Icon className="size-4" /> {label}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      {(data.upcomingReminders?.length ?? 0) > 0 && (
        <section className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Upcoming medication reminders</h2>
            <Link href="/pharmacy/prescriptions" className="text-sm text-primary">
              View prescriptions
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {data.upcomingReminders!.map((reminder) => (
              <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{reminder.medicineName ?? "Medication"}</p>
                  <p className="text-xs text-muted-foreground">
                    {reminder.patientName ?? "Patient"} · {formatDateTime(reminder.scheduledAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={reminder.status.replaceAll("_", " ")} tone={reminderStatusTone(reminder.status)} />
                  <Button size="sm" variant="outline" onClick={() => setViewReminder(reminder)}>
                    View message
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Low stock</h2>
            <Link href="/pharmacy/alerts" className="text-sm text-primary">
              View all
            </Link>
          </div>
          {!data.lowStock.length ? (
            <EmptyState title="No low stock items." description="Products below reorder level will appear here." />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.lowStock.map((row) => (
                <li key={row.productId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <Link href={`/pharmacy/products/${row.productId}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                  <StatusBadge label={`${row.currentStock} left`} tone="warning" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Expiring soon</h2>
            <Link href="/pharmacy/alerts" className="text-sm text-primary">
              View all
            </Link>
          </div>
          {!data.expiringSoon.length ? (
            <EmptyState title="No batches expiring soon." description="Batches nearing expiry will appear here." />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.expiringSoon.map((row) => (
                <li key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="font-medium">{row.product?.name ?? "Product"}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch {row.batchNumber} · {formatDate(row.expiryDate)}
                    </p>
                  </div>
                  <StatusBadge label={`${row.availableQuantity} units`} tone="warning" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent sales</h2>
            <Link href="/pharmacy/sales" className="text-sm text-primary">
              View all
            </Link>
          </div>
          {!data.recentSales.length ? (
            <EmptyState title="No sales yet." description="Pharmacy sales will appear here." />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="font-medium">{sale.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.patientName ?? "Walk-in"} · {formatDate(sale.soldAt)}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatINR(sale.totalAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pending prescriptions</h2>
            <Link href="/pharmacy/prescriptions" className="text-sm text-primary">
              View all
            </Link>
          </div>
          {!data.pendingPrescriptions.length ? (
            <EmptyState title="No pending prescriptions." description="Prescriptions awaiting dispense will appear here." />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.pendingPrescriptions.map((rx) => {
                const firstItem = rx.items[0];
                return (
                <li key={rx.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {firstItem?.productImageUrl && (
                      <ProductThumb name={firstItem.medicineName} imageUrl={firstItem.productImageUrl} size="md" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{rx.patientName ?? "Patient"}</p>
                      <p className="text-xs text-muted-foreground">
                        {rx.doctorName ?? "Doctor"} · {rx.items.length} item{rx.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge label={rx.status.replaceAll("_", " ")} tone={prescriptionStatusTone(rx.status)} />
                </li>
              );})}
            </ul>
          )}
        </section>
      </div>

      <ReminderMessageDialog
        open={Boolean(viewReminder)}
        onOpenChange={(open) => { if (!open) setViewReminder(null); }}
        title={viewReminder?.medicineName ?? "WhatsApp reminder"}
        description={
          viewReminder
            ? `${viewReminder.patientName ?? "Patient"} · ${formatDateTime(viewReminder.scheduledAt)}`
            : undefined
        }
        messageBody={viewReminder?.demoMessageBody ?? null}
      />
    </div>
  );
}
