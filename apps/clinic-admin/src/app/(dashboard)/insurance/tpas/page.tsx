"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { type PageResult } from "@/components/insurance/format";
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

type Tpa = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  policyCount?: number;
  claimCount?: number;
};

const emptyForm = {
  name: "",
  contact: "",
  email: "",
  phone: "",
  notes: "",
  isActive: true,
};

export default function InsuranceTpasPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PageResult<Tpa> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tpa | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (query.trim()) params.set("q", query.trim());
    try {
      const next = await apiGet<PageResult<Tpa>>(`/api/v1/insurance/tpas?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load TPAs.");
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

  function openEdit(tpa: Tpa) {
    setEditing(tpa);
    setForm({
      name: tpa.name,
      contact: tpa.contact ?? "",
      email: tpa.email ?? "",
      phone: tpa.phone ?? "",
      notes: tpa.notes ?? "",
      isActive: tpa.isActive,
    });
    setDialogOpen(true);
  }

  async function saveTpa(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("TPA name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contact: form.contact || null,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
        isActive: form.isActive,
      };
      if (editing) {
        await apiPatch(`/api/v1/insurance/tpas/${editing.id}`, payload);
        toast.success("TPA updated.");
      } else {
        await apiPost("/api/v1/insurance/tpas", payload);
        toast.success("TPA created.");
      }
      setDialogOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to save TPA.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="TPAs"
        subtitle="Third-party administrators linked to policies and claims."
        actions={
          <Button className="rounded-lg" onClick={openCreate}>
            <Plus className="size-4" /> Add TPA
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="border-b p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search TPAs"
            className="h-9 max-w-md rounded-lg"
          />
        </div>

        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState
            title="Unable to load TPAs."
            description={error}
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : !data?.items.length ? (
          <EmptyState
            title="No TPAs yet."
            description="Add TPAs when policies are managed through administrators."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add TPA
              </Button>
            }
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((tpa) => (
                <RecordCard key={tpa.id}>
                  <p className="font-semibold">{tpa.name}</p>
                  <p className="text-sm text-muted-foreground">{tpa.phone ?? tpa.email ?? "No contact"}</p>
                  <div className="mt-2">
                    <StatusBadge label={tpa.isActive ? "ACTIVE" : "INACTIVE"} tone={tpa.isActive ? "success" : "warning"} />
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => openEdit(tpa)}>
                    Edit
                  </Button>
                </RecordCard>
              ))}
            </MobileCards>
            <MdTableWrap>
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Contact</th>
                    <th className="px-4 py-2 font-medium">Policies</th>
                    <th className="px-4 py-2 font-medium">Claims</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((tpa) => (
                    <tr key={tpa.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{tpa.name}</td>
                      <td className="px-4 py-3">
                        <p>{tpa.contact ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{tpa.phone ?? tpa.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">{tpa.policyCount ?? "—"}</td>
                      <td className="px-4 py-3">{tpa.claimCount ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={tpa.isActive ? "ACTIVE" : "INACTIVE"} tone={tpa.isActive ? "success" : "warning"} />
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openEdit(tpa)}>
                          Edit
                        </Button>
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
          <form onSubmit={saveTpa}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit TPA" : "Add TPA"}</DialogTitle>
              <DialogDescription>Third-party administrator contact details.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="size-4 rounded border"
                  />
                  Active
                </label>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create TPA"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
