"use client";

import { Download, Eye, FileBarChart, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reports = [
  {
    name: "Care Loop performance",
    detail: "Task completion, response rate, escalations",
    cadence: "Weekly",
    owner: "Care operations",
    rows: [
      ["Tasks completed", "91%"],
      ["Patient response rate", "88%"],
      ["Escalations", "14"],
    ],
  },
  {
    name: "Patient journey",
    detail: "Stage-wise progression by treatment type",
    cadence: "Monthly",
    owner: "Clinical operations",
    rows: [
      ["Journeys on track", "84%"],
      ["Average stage duration", "12 days"],
      ["Needs attention", "23"],
    ],
  },
  {
    name: "Appointment utilization",
    detail: "Slots, no-shows, doctor load",
    cadence: "Weekly",
    owner: "Front office",
    rows: [
      ["Slot utilization", "78%"],
      ["No-show rate", "6%"],
      ["Peak window", "10 AM–1 PM"],
    ],
  },
  {
    name: "Revenue & collections",
    detail: "Package-wise revenue and pending payments",
    cadence: "Monthly",
    owner: "Billing",
    rows: [
      ["Invoiced", "₹3,12,000"],
      ["Collected", "₹2,56,500"],
      ["Outstanding", "₹55,500"],
    ],
  },
  {
    name: "Enquiry conversion",
    detail: "Lead source to consultation conversion",
    cadence: "Monthly",
    owner: "Counselling",
    rows: [
      ["New enquiries", "126"],
      ["Consultations", "73"],
      ["Treatment starts", "31"],
    ],
  },
  {
    name: "Document compliance",
    detail: "Consent and report completeness",
    cadence: "Quarterly",
    owner: "Clinic administration",
    rows: [
      ["Complete records", "94%"],
      ["Missing consent", "7"],
      ["Awaiting review", "12"],
    ],
  },
];

const periods = ["Last 7 days", "Last 30 days", "This quarter", "Year to date"];
type Report = (typeof reports)[number];

function exportReport(report: Report, period: string) {
  const csv = [
    ["Report", report.name],
    ["Period", period],
    ["Owner", report.owner],
    [],
    ["Measure", "Value"],
    ...report.rows,
  ]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${period
    .toLowerCase()
    .replaceAll(" ", "-")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success(`${report.name} exported`);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("Last 30 days");
  const [selected, setSelected] = useState<Report | null>(null);
  const generatedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    [period],
  );

  return (
    <div className="mx-auto max-w-[1300px]">
      <PageHeader
        title="Reports"
        subtitle="Owner and administrator reports for operational review and governance."
        actions={
          <div className="w-44">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="rounded-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Report catalog</h2>
            <p className="text-xs text-muted-foreground">
              {reports.length} operational reports · {period}
            </p>
          </div>
          <FileBarChart className="size-4 text-muted-foreground" />
        </div>
        <ul className="divide-y">
          {reports.map((r) => (
            <li
              key={r.name}
              className="grid gap-3 px-4 py-3 hover:bg-muted/25 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge label={r.cadence} tone="muted" />
                <span className="truncate text-xs text-muted-foreground">{r.owner}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                  <Eye className="size-3.5" /> View
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportReport(r, period)}>
                  <Download className="size-3.5" /> Export CSV
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-3 flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Report access and exports are intended for clinic owners and administrators.
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {period} · Generated {generatedAt}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div>
              <div className="mb-4 rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">Report owner</p>
                <p className="mt-0.5 text-sm font-semibold">{selected.owner}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selected.detail}</p>
              </div>
              <div className="overflow-hidden rounded-lg border">
                {selected.rows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b px-3 py-2.5 text-sm last:border-0"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selected && exportReport(selected, period)}
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
