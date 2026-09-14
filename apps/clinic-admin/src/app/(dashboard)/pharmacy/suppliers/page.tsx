"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { type PageResult, productStatusTone } from "@/components/pharmacy/format";
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
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  status: string;
  purchaseOrderCount: number;
  batchCount: number;
};

const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
  licenseInfo: "",
  notes: "",
  status: "ACTIVE",
};

export default function PharmacySuppliersPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PageResult<Supplier> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (query.trim()) params.set("q", query.trim());
    try {
      const next = await apiGet<PageResult<Supplier>>(`/api/v1/pharmacy/suppliers?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load suppliers.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: "",
      gstNumber: supplier.gstNumber ?? "",
      licenseInfo: "",
      notes: "",
      status: supplier.status,
    });
    setDialogOpen(true);
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        gstNumber: form.gstNumber || null,
        licenseInfo: form.licenseInfo || null,
        notes: form.notes || null,
        status: form.status as "ACTIVE" | "INACTIVE",
      };
      if (editing) {
        await apiPatch(`/api/v1/pharmacy/suppliers/${editing.id}`, payload);
        toast.success("Supplier updated.");
      } else {
        await apiPost("/api/v1/pharmacy/suppliers", payload);
        toast.success("Supplier created.");
      }
      setDialogOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to save supplier.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Suppliers"
        subtitle="Medicine vendors and purchase contacts."
        actions={
          <Button className="rounded-lg" onClick={openCreate}>
            <Plus className="size-4" /> Add supplier
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="border-b p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suppliers"
            className="h-9 max-w-md rounded-lg"
          />
        </div>

        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState title="Unable to load suppliers." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
        ) : !data?.items.length ? (
          <EmptyState
            title="No suppliers yet."
            description="Add vendors to link purchase orders and stock intake."
            action={<Button onClick={openCreate}><Plus className="size-4" /> Add supplier</Button>}
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((supplier) => (
                <RecordCard key={supplier.id}>
                  <p className="font-semibold">{supplier.name}</p>
                  <p className="text-sm text-muted-foreground">{supplier.phone ?? supplier.email ?? "No contact"}</p>
                  <div className="mt-2">
                    <StatusBadge label={supplier.status} tone={productStatusTone(supplier.status)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{supplier.purchaseOrderCount} POs · {supplier.batchCount} batches</p>
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => openEdit(supplier)}>Edit</Button>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Contact</th>
                    <th className="px-4 py-2 font-medium">GST</th>
                    <th className="px-4 py-2 font-medium">Orders</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((supplier) => (
                    <tr key={supplier.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{supplier.name}</td>
                      <td className="px-4 py-3">
                        <p>{supplier.contactPerson ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{supplier.phone ?? supplier.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">{supplier.gstNumber ?? "—"}</td>
                      <td className="px-4 py-3">{supplier.purchaseOrderCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={supplier.status} tone={productStatusTone(supplier.status)} />
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openEdit(supplier)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MdTableWrap>
          </>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={saveSupplier}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle>
              <DialogDescription>Vendor details for purchase orders and stock intake.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Contact person</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>GST number</Label>
                <Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              {editing && (
                <div className="space-y-1">
                  <Label>Status</Label>
                  <select className="h-9 w-full rounded-md border px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create supplier"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
