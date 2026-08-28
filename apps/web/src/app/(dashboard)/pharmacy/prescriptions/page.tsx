"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDate,
  formatINR,
  type PageResult,
  prescriptionStatusTone,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Prescription = {
  id: string;
  patientName: string | null;
  doctorName: string | null;
  prescriptionDate: string;
  status: string;
  items: Array<{
    id: string;
    medicineName: string;
    quantityPrescribed: number;
    quantityDispensed: number;
    productId: string;
    batchId: string | null;
  }>;
};

type ProductOption = { id: string; name: string };
type BatchOption = { id: string; batchNumber: string; availableQuantity: number; productId: string };

type RxLine = { productId: string; medicineName: string; quantityPrescribed: string; dosage: string; frequency: string };

export default function PharmacyPrescriptionsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Prescription> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dispenseRx, setDispenseRx] = useState<Prescription | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);

  const [createForm, setCreateForm] = useState({
    patientId: "",
    coupleId: "",
    doctorName: "",
    notes: "",
    lines: [{ productId: "", medicineName: "", quantityPrescribed: "1", dosage: "", frequency: "" }] as RxLine[],
  });

  const [dispenseLines, setDispenseLines] = useState<Record<string, { batchId: string; quantity: string }>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<PageResult<Prescription>>(`/api/v1/pharmacy/prescriptions?page=${page}&pageSize=25`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load prescriptions.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  useEffect(() => {
    if (!createOpen && !dispenseRx) return;
    void (async () => {
      try {
        const [prodRes, batchRes] = await Promise.all([
          apiGet<PageResult<ProductOption>>("/api/v1/pharmacy/products?pageSize=100&status=ACTIVE"),
          apiGet<PageResult<BatchOption>>("/api/v1/pharmacy/inventory?pageSize=100"),
        ]);
        setProducts(prodRes.items);
        setBatches(batchRes.items.filter((b) => b.availableQuantity > 0));
      } catch {
        /* optional */
      }
    })();
  }, [createOpen, dispenseRx]);

  async function createPrescription(event: FormEvent) {
    event.preventDefault();
    if (!createForm.patientId.trim()) {
      toast.error("Patient ID is required.");
      return;
    }
    const items = createForm.lines
      .filter((line) => line.productId && line.quantityPrescribed)
      .map((line) => ({
        productId: line.productId,
        medicineName: line.medicineName || undefined,
        quantityPrescribed: Number(line.quantityPrescribed),
        dosage: line.dosage || null,
        frequency: line.frequency || null,
      }));
    if (!items.length) {
      toast.error("Add at least one medicine line.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/pharmacy/prescriptions", {
        patientId: createForm.patientId.trim(),
        coupleId: createForm.coupleId || null,
        doctorName: createForm.doctorName || null,
        notes: createForm.notes || null,
        items,
      });
      toast.success("Prescription created.");
      setCreateOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create prescription.");
    } finally {
      setSaving(false);
    }
  }

  async function dispensePrescription(event: FormEvent) {
    event.preventDefault();
    if (!dispenseRx) return;
    const items = dispenseRx.items
      .map((item) => {
        const entry = dispenseLines[item.id];
        if (!entry?.batchId || !entry.quantity) return null;
        return { itemId: item.id, batchId: entry.batchId, quantity: Number(entry.quantity) };
      })
      .filter(Boolean);
    if (!items.length) {
      toast.error("Select batch and quantity for at least one item.");
      return;
    }
    setSaving(true);
    try {
      await apiPost(`/api/v1/pharmacy/prescriptions/${dispenseRx.id}/dispense`, { items });
      toast.success("Prescription dispensed.");
      setDispenseRx(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to dispense prescription.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Prescriptions"
        subtitle="Doctor prescriptions and pharmacy dispensing."
        actions={
          <Button className="rounded-lg" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New prescription
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState title="Unable to load prescriptions." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : !data?.items.length ? (
          <EmptyState
            title="No prescriptions yet."
            description="Prescriptions awaiting dispense will appear here."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> New prescription</Button>}
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((rx) => (
                <RecordCard key={rx.id}>
                  <p className="font-semibold">{rx.patientName ?? "Patient"}</p>
                  <p className="text-sm text-muted-foreground">{rx.doctorName ?? "Doctor"} · {formatDate(rx.prescriptionDate)}</p>
                  <div className="mt-2">
                    <StatusBadge label={rx.status.replaceAll("_", " ")} tone={prescriptionStatusTone(rx.status)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{rx.items.length} medicine{rx.items.length === 1 ? "" : "s"}</p>
                  {(rx.status === "PENDING" || rx.status === "PARTIALLY_DISPENSED") && (
                    <Button size="sm" className="mt-3 w-full" onClick={() => { setDispenseRx(rx); setDispenseLines({}); }}>
                      Dispense
                    </Button>
                  )}
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Patient</th>
                    <th className="px-4 py-2 font-medium">Doctor</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Items</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((rx) => (
                    <tr key={rx.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{rx.patientName ?? "—"}</td>
                      <td className="px-4 py-3">{rx.doctorName ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(rx.prescriptionDate)}</td>
                      <td className="px-4 py-3">{rx.items.length}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={rx.status.replaceAll("_", " ")} tone={prescriptionStatusTone(rx.status)} />
                      </td>
                      <td className="px-4 py-3">
                        {(rx.status === "PENDING" || rx.status === "PARTIALLY_DISPENSED") && (
                          <Button size="sm" variant="outline" onClick={() => { setDispenseRx(rx); setDispenseLines({}); }}>
                            Dispense
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
          <form onSubmit={createPrescription}>
            <DialogHeader>
              <DialogTitle>New prescription</DialogTitle>
              <DialogDescription>Record medicines prescribed for a patient.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Patient ID *</Label>
                <Input value={createForm.patientId} onChange={(e) => setCreateForm({ ...createForm, patientId: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Couple ID</Label>
                <Input value={createForm.coupleId} onChange={(e) => setCreateForm({ ...createForm, coupleId: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Doctor name</Label>
                <Input value={createForm.doctorName} onChange={(e) => setCreateForm({ ...createForm, doctorName: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {createForm.lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
                  <select
                    className="h-9 rounded-md border px-2 text-sm sm:col-span-2"
                    value={line.productId}
                    onChange={(e) => {
                      const product = products.find((p) => p.id === e.target.value);
                      const next = [...createForm.lines];
                      next[index] = { ...line, productId: e.target.value, medicineName: product?.name ?? "" };
                      setCreateForm({ ...createForm, lines: next });
                    }}
                  >
                    <option value="">Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <Input placeholder="Qty" type="number" min="1" value={line.quantityPrescribed} onChange={(e) => {
                    const next = [...createForm.lines];
                    next[index] = { ...line, quantityPrescribed: e.target.value };
                    setCreateForm({ ...createForm, lines: next });
                  }} />
                  <Input placeholder="Dosage" value={line.dosage} onChange={(e) => {
                    const next = [...createForm.lines];
                    next[index] = { ...line, dosage: e.target.value };
                    setCreateForm({ ...createForm, lines: next });
                  }} />
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setCreateForm({ ...createForm, lines: [...createForm.lines, { productId: "", medicineName: "", quantityPrescribed: "1", dosage: "", frequency: "" }] })}>
                Add medicine
              </Button>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create prescription"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(dispenseRx)} onOpenChange={(open) => !open && setDispenseRx(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <form onSubmit={dispensePrescription}>
            <SheetHeader>
              <SheetTitle>Dispense prescription</SheetTitle>
              <SheetDescription>{dispenseRx?.patientName ?? "Patient"} · select batches to dispense</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {dispenseRx?.items.map((item) => {
                const remaining = item.quantityPrescribed - item.quantityDispensed;
                const productBatches = batches.filter((b) => b.productId === item.productId);
                return (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-medium">{item.medicineName}</p>
                    <p className="text-xs text-muted-foreground">Remaining: {remaining}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        className="h-9 rounded-md border px-2 text-sm"
                        value={dispenseLines[item.id]?.batchId ?? ""}
                        onChange={(e) => setDispenseLines({ ...dispenseLines, [item.id]: { batchId: e.target.value, quantity: dispenseLines[item.id]?.quantity ?? String(remaining) } })}
                      >
                        <option value="">Batch</option>
                        {productBatches.map((b) => (
                          <option key={b.id} value={b.id}>{b.batchNumber} ({b.availableQuantity})</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        max={remaining}
                        placeholder="Qty"
                        value={dispenseLines[item.id]?.quantity ?? ""}
                        onChange={(e) => setDispenseLines({ ...dispenseLines, [item.id]: { batchId: dispenseLines[item.id]?.batchId ?? "", quantity: e.target.value } })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDispenseRx(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Dispensing…" : "Confirm dispense"}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
