"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Fragment, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDate,
  formatDateTime,
  type PageResult,
  prescriptionStatusTone,
  reminderStatusTone,
} from "@/components/pharmacy/format";
import { ProductThumb } from "@/components/pharmacy/product-thumb";
import { ReminderMessageDialog } from "@/components/pharmacy/reminder-message-dialog";
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

type MedicationReminder = {
  id: string;
  scheduledAt: string;
  status: string;
  demoMessageBody: string | null;
};

type PrescriptionItem = {
  id: string;
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  timeOfDay: string | null;
  beforeAfterFood: string | null;
  quantityPrescribed: number;
  quantityDispensed: number;
  productId: string;
  productImageUrl?: string | null;
  batchId: string | null;
  reminders?: MedicationReminder[];
};

type Prescription = {
  id: string;
  patientName: string | null;
  doctorName: string | null;
  prescriptionDate: string;
  status: string;
  items: PrescriptionItem[];
};

type ProductOption = { id: string; name: string; imageUrl?: string | null };
type BatchOption = { id: string; batchNumber: string; availableQuantity: number; productId: string };

type RxLine = {
  productId: string;
  medicineName: string;
  quantityPrescribed: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  timeOfDay: string;
  beforeAfterFood: "" | "BEFORE" | "AFTER" | "WITH" | "ANY";
  scheduleReminders: boolean;
};

const emptyLine = (): RxLine => ({
  productId: "",
  medicineName: "",
  quantityPrescribed: "1",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
  timeOfDay: "",
  beforeAfterFood: "",
  scheduleReminders: true,
});

function itemScheduleSummary(item: PrescriptionItem) {
  return [item.dosage, item.frequency, item.timeOfDay, item.instructions].filter(Boolean).join(" · ");
}

export default function PharmacyPrescriptionsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Prescription> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dispenseRx, setDispenseRx] = useState<Prescription | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [viewReminder, setViewReminder] = useState<{ item: PrescriptionItem; reminder: MedicationReminder } | null>(null);

  const [createForm, setCreateForm] = useState({
    patientId: "",
    coupleId: "",
    doctorName: "",
    notes: "",
    scheduleReminders: true,
    lines: [emptyLine()] as RxLine[],
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
        duration: line.duration || null,
        instructions: line.instructions || null,
        timeOfDay: line.timeOfDay || null,
        beforeAfterFood: line.beforeAfterFood || null,
      }));
    if (!items.length) {
      toast.error("Add at least one medicine line.");
      return;
    }
    const scheduleReminders = createForm.lines.some((line) => line.scheduleReminders) && createForm.scheduleReminders;
    setSaving(true);
    try {
      await apiPost("/api/v1/pharmacy/prescriptions", {
        patientId: createForm.patientId.trim(),
        coupleId: createForm.coupleId || null,
        doctorName: createForm.doctorName || null,
        notes: createForm.notes || null,
        scheduleReminders,
        items,
      });
      toast.success("Prescription created.");
      setCreateOpen(false);
      setCreateForm({ patientId: "", coupleId: "", doctorName: "", notes: "", scheduleReminders: true, lines: [emptyLine()] });
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

  async function openReminderMessage(item: PrescriptionItem, reminder: MedicationReminder) {
    if (reminder.demoMessageBody) {
      setViewReminder({ item, reminder });
      return;
    }
    try {
      const detail = await apiGet<MedicationReminder & { demoMessageBody: string | null }>(
        `/api/v1/pharmacy/reminders/${reminder.id}`,
      );
      setViewReminder({ item, reminder: { ...reminder, demoMessageBody: detail.demoMessageBody } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to load reminder message.");
    }
  }

  function renderExpandedRx(rx: Prescription) {
    return (
      <div className="border-t bg-muted/20 px-4 py-3">
        <ul className="space-y-3">
          {rx.items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-start gap-3">
                <ProductThumb name={item.medicineName} imageUrl={item.productImageUrl ?? null} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.medicineName}</p>
                  {itemScheduleSummary(item) && (
                    <p className="text-xs text-muted-foreground">{itemScheduleSummary(item)}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Qty {item.quantityDispensed}/{item.quantityPrescribed}
                    {item.beforeAfterFood ? ` · ${item.beforeAfterFood} food` : ""}
                    {item.duration ? ` · ${item.duration}` : ""}
                  </p>
                </div>
              </div>
              {(item.reminders?.length ?? 0) > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Medication reminders</p>
                  <ul className="space-y-2">
                    {item.reminders!.map((reminder) => (
                      <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-xs text-muted-foreground">{formatDateTime(reminder.scheduledAt)}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge label={reminder.status.replaceAll("_", " ")} tone={reminderStatusTone(reminder.status)} />
                          <Button size="sm" variant="outline" onClick={() => void openReminderMessage(item, reminder)}>
                            View message
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
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
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 text-left"
                    onClick={() => setExpandedId(expandedId === rx.id ? null : rx.id)}
                  >
                    {expandedId === rx.id ? <ChevronDown className="mt-0.5 size-4 shrink-0" /> : <ChevronRight className="mt-0.5 size-4 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{rx.patientName ?? "Patient"}</p>
                      <p className="text-sm text-muted-foreground">{rx.doctorName ?? "Doctor"} · {formatDate(rx.prescriptionDate)}</p>
                      <div className="mt-2">
                        <StatusBadge label={rx.status.replaceAll("_", " ")} tone={prescriptionStatusTone(rx.status)} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{rx.items.length} medicine{rx.items.length === 1 ? "" : "s"}</p>
                    </div>
                  </button>
                  {expandedId === rx.id && renderExpandedRx(rx)}
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
                    <th className="px-4 py-2 font-medium" />
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
                    <Fragment key={rx.id}>
                      <tr className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0"
                            onClick={() => setExpandedId(expandedId === rx.id ? null : rx.id)}
                          >
                            {expandedId === rx.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </td>
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
                      {expandedId === rx.id && (
                        <tr>
                          <td colSpan={7} className="p-0">{renderExpandedRx(rx)}</td>
                        </tr>
                      )}
                    </Fragment>
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
                <div key={index} className="space-y-2 rounded-lg border p-3">
                  <select
                    className="h-9 w-full rounded-md border px-2 text-sm"
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Dosage" value={line.dosage} onChange={(e) => {
                      const next = [...createForm.lines];
                      next[index] = { ...line, dosage: e.target.value };
                      setCreateForm({ ...createForm, lines: next });
                    }} />
                    <Input placeholder="Frequency" value={line.frequency} onChange={(e) => {
                      const next = [...createForm.lines];
                      next[index] = { ...line, frequency: e.target.value };
                      setCreateForm({ ...createForm, lines: next });
                    }} />
                    <Input placeholder="Duration" value={line.duration} onChange={(e) => {
                      const next = [...createForm.lines];
                      next[index] = { ...line, duration: e.target.value };
                      setCreateForm({ ...createForm, lines: next });
                    }} />
                    <Input placeholder="Time of day" value={line.timeOfDay} onChange={(e) => {
                      const next = [...createForm.lines];
                      next[index] = { ...line, timeOfDay: e.target.value };
                      setCreateForm({ ...createForm, lines: next });
                    }} />
                    <Input placeholder="Instructions" className="sm:col-span-2" value={line.instructions} onChange={(e) => {
                      const next = [...createForm.lines];
                      next[index] = { ...line, instructions: e.target.value };
                      setCreateForm({ ...createForm, lines: next });
                    }} />
                    <select
                      className="h-9 rounded-md border px-2 text-sm"
                      value={line.beforeAfterFood}
                      onChange={(e) => {
                        const next = [...createForm.lines];
                        next[index] = { ...line, beforeAfterFood: e.target.value as RxLine["beforeAfterFood"] };
                        setCreateForm({ ...createForm, lines: next });
                      }}
                    >
                      <option value="">Food timing</option>
                      <option value="BEFORE">Before food</option>
                      <option value="AFTER">After food</option>
                      <option value="WITH">With food</option>
                      <option value="ANY">Any time</option>
                    </select>
                    <Input placeholder="Qty prescribed" type="number" min="1" value={line.quantityPrescribed} onChange={(e) => {
                      const next = [...createForm.lines];
                      next[index] = { ...line, quantityPrescribed: e.target.value };
                      setCreateForm({ ...createForm, lines: next });
                    }} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={line.scheduleReminders}
                      onChange={(e) => {
                        const next = [...createForm.lines];
                        next[index] = { ...line, scheduleReminders: e.target.checked };
                        setCreateForm({ ...createForm, lines: next });
                      }}
                    />
                    Schedule WhatsApp reminders
                  </label>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setCreateForm({ ...createForm, lines: [...createForm.lines, emptyLine()] })}>
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
                const product = products.find((p) => p.id === item.productId);
                return (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <ProductThumb
                        name={item.medicineName}
                        imageUrl={item.productImageUrl ?? product?.imageUrl ?? null}
                        size="md"
                      />
                      <div>
                        <p className="font-medium">{item.medicineName}</p>
                        {itemScheduleSummary(item) && (
                          <p className="text-xs text-muted-foreground">{itemScheduleSummary(item)}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Remaining: {remaining}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        className="h-9 rounded-md border px-2 text-sm"
                        value={dispenseLines[item.id]?.batchId ?? ""}
                        onChange={(e) => setDispenseLines({ ...dispenseLines, [item.id]: { batchId: e.target.value, quantity: dispenseLines[item.id]?.quantity ?? String(remaining) } })}
                      >
                        <option value="">Batch</option>
                        {productBatches.map((b) => (
                          <option key={b.id} value={b.id}>{b.batchNumber} ({b.availableQuantity} avail.)</option>
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

      <ReminderMessageDialog
        open={Boolean(viewReminder)}
        onOpenChange={(open) => { if (!open) setViewReminder(null); }}
        title={viewReminder?.item.medicineName ?? "WhatsApp reminder"}
        description={
          viewReminder
            ? formatDateTime(viewReminder.reminder.scheduledAt)
            : undefined
        }
        messageBody={viewReminder?.reminder.demoMessageBody ?? null}
      />
    </div>
  );
}
