"use client";

import { useEffect, useState } from "react";

import {
  formatDate,
  formatDateTime,
  formatINR,
  stockStatusLabel,
} from "@/components/pharmacy/format";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet } from "@/lib/api/client";

type ReportSummary = Record<string, number>;

type SaleReportItem = {
  invoiceNumber?: string;
  patientName?: string | null;
  totalAmount?: number;
  soldAt?: string;
};

type BatchReportItem = {
  batchNumber?: string;
  availableQuantity?: number;
  expiryDate?: string | null;
  status?: string;
  product?: { name?: string };
};

type LowStockItem = {
  name?: string;
  currentStock?: number;
  minimumStock?: number;
  reorderLevel?: number;
};

type PurchaseItem = {
  orderNumber?: string;
  totalAmount?: number;
  orderDate?: string;
  status?: string;
  supplier?: { name?: string };
};

type MovementItem = {
  type?: string;
  productName?: string;
  batchNumber?: string;
  quantity?: number;
  createdAt?: string;
};

type SupplierItem = {
  name?: string;
  phone?: string | null;
  purchaseOrderCount?: number;
  batchCount?: number;
  status?: string;
};

type ReportResult = {
  type: string;
  summary: ReportSummary;
  items?: Array<SaleReportItem | BatchReportItem | LowStockItem | PurchaseItem | MovementItem | SupplierItem>;
  expiringSoon?: BatchReportItem[];
  expired?: BatchReportItem[];
};

const reportTypes = [
  ["sales", "Sales"],
  ["inventory", "Inventory"],
  ["low-stock", "Low stock"],
  ["expiry", "Expiry"],
  ["purchase", "Purchases"],
  ["movement", "Movements"],
  ["supplier", "Suppliers"],
] as const;

export default function PharmacyReportsPage() {
  const [reportType, setReportType] = useState<(typeof reportTypes)[number][0]>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ type: reportType });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const next = await apiGet<ReportResult>(`/api/v1/pharmacy/reports?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load report.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [reportType]);

  const summaryEntries = data ? Object.entries(data.summary) : [];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="Pharmacy Reports" subtitle="Sales, inventory, and operational summaries." />

      <section className="rounded-xl border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Report type</Label>
            <select
              className="h-9 w-full rounded-md border px-2 text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
            >
              {reportTypes.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void load()} disabled={loading}>
              {loading ? "Loading…" : "Run report"}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <EmptyState title="Unable to load report." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
      ) : !data ? null : (
        <>
          {summaryEntries.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summaryEntries.map(([key, value]) => (
                <div key={key} className="rounded-xl border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {key.toLowerCase().includes("amount") ? formatINR(value) : value.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </section>
          )}

          <section className="overflow-hidden rounded-xl border bg-background">
            {reportType === "expiry" ? (
              <ExpiryReport data={data} />
            ) : !data.items?.length ? (
              <EmptyState title="No results for this report." description="Try adjusting the date range or report type." />
            ) : (
              <GenericReportTable type={reportType} items={data.items} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function GenericReportTable({
  type,
  items,
}: {
  type: string;
  items: NonNullable<ReportResult["items"]>;
}) {
  if (type === "sales") {
    return (
      <ReportTable
        headers={["Invoice", "Patient", "Amount", "Date"]}
        rows={(items as SaleReportItem[]).map((item) => [
          item.invoiceNumber ?? "—",
          item.patientName ?? "Walk-in",
          formatINR(item.totalAmount ?? 0),
          formatDateTime(item.soldAt),
        ])}
      />
    );
  }
  if (type === "inventory") {
    const batchItems = items as BatchReportItem[];
    return (
      <>
        <MobileCards>
          {batchItems.map((item, i) => (
            <RecordCard key={i}>
              <p className="font-semibold">{item.product?.name ?? "Product"}</p>
              <p className="text-sm text-muted-foreground">Batch {item.batchNumber ?? "—"}</p>
              <p className="mt-2 text-sm">{item.availableQuantity ?? 0} units</p>
            </RecordCard>
          ))}
        </MobileCards>
        <MdTableWrap>
          <ReportTable
            headers={["Product", "Batch", "Available", "Expiry", "Status"]}
            rows={batchItems.map((item) => [
              item.product?.name ?? "—",
              item.batchNumber ?? "—",
              String(item.availableQuantity ?? 0),
              formatDate(item.expiryDate),
              item.status ?? "—",
            ])}
          />
        </MdTableWrap>
      </>
    );
  }
  if (type === "low-stock") {
    return (
      <ReportTable
        headers={["Product", "Current stock", "Minimum", "Reorder"]}
        rows={(items as LowStockItem[]).map((item) => [
          item.name ?? "—",
          String(item.currentStock ?? 0),
          String(item.minimumStock ?? 0),
          String(item.reorderLevel ?? 0),
        ])}
      />
    );
  }
  if (type === "purchase") {
    return (
      <ReportTable
        headers={["Order", "Supplier", "Amount", "Date", "Status"]}
        rows={(items as PurchaseItem[]).map((item) => [
          item.orderNumber ?? "—",
          item.supplier?.name ?? "—",
          formatINR(item.totalAmount ?? 0),
          formatDate(item.orderDate),
          item.status ?? "—",
        ])}
      />
    );
  }
  if (type === "movement") {
    return (
      <ReportTable
        headers={["Type", "Product", "Batch", "Qty", "When"]}
        rows={(items as MovementItem[]).map((item) => [
          (item.type ?? "—").replaceAll("_", " "),
          item.productName ?? "—",
          item.batchNumber ?? "—",
          String(item.quantity ?? 0),
          formatDateTime(item.createdAt),
        ])}
      />
    );
  }
  if (type === "supplier") {
    return (
      <ReportTable
        headers={["Name", "Phone", "POs", "Batches", "Status"]}
        rows={(items as SupplierItem[]).map((item) => [
          item.name ?? "—",
          item.phone ?? "—",
          String(item.purchaseOrderCount ?? 0),
          String(item.batchCount ?? 0),
          item.status ?? "—",
        ])}
      />
    );
  }
  return <EmptyState title="Unsupported report view." description="" />;
}

function ExpiryReport({ data }: { data: ReportResult }) {
  const expiring = data.expiringSoon ?? [];
  const expired = data.expired ?? [];
  if (!expiring.length && !expired.length) {
    return <EmptyState title="No expiry data." description="No batches in the selected warning window." />;
  }
  return (
    <div className="space-y-4 p-4">
      {expiring.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Expiring soon</h3>
          <ReportTable
            headers={["Product", "Batch", "Qty", "Expiry", "Status"]}
            rows={expiring.map((item) => [
              item.product?.name ?? "—",
              item.batchNumber ?? "—",
              String(item.availableQuantity ?? 0),
              formatDate(item.expiryDate),
              stockStatusLabel[item.status as keyof typeof stockStatusLabel] ?? item.status ?? "—",
            ])}
          />
        </div>
      )}
      {expired.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Expired</h3>
          <ReportTable
            headers={["Product", "Batch", "Qty", "Expiry"]}
            rows={expired.map((item) => [
              item.product?.name ?? "—",
              item.batchNumber ?? "—",
              String(item.availableQuantity ?? 0),
              formatDate(item.expiryDate),
            ])}
          />
        </div>
      )}
    </div>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <MdTableWrap>
      <table className="w-full min-w-[700px] text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-2 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0 hover:bg-muted/30">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </MdTableWrap>
  );
}
