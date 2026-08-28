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

type Provider = {
  id: string;
  name: string;
  supportContact: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  notes: string | null;
  isActive: boolean;
  policyCount?: number;
  claimCount?: number;
};

const emptyForm = {
  name: "",
  supportContact: "",
  supportEmail: "",
  supportPhone: "",
  notes: "",
  isActive: true,
};

export default function InsuranceProvidersPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PageResult<Provider> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (query.trim()) params.set("q", query.trim());
    try {
      const next = await apiGet<PageResult<Provider>>(`/api/v1/insurance/providers?${params}`);
      setData(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load providers.");
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

  function openEdit(provider: Provider) {
    setEditing(provider);
    setForm({
      name: provider.name,
      supportContact: provider.supportContact ?? "",
      supportEmail: provider.supportEmail ?? "",
      supportPhone: provider.supportPhone ?? "",
      notes: provider.notes ?? "",
      isActive: provider.isActive,
    });
    setDialogOpen(true);
  }

  async function saveProvider(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Provider name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        supportContact: form.supportContact || null,
        supportEmail: form.supportEmail || null,
        supportPhone: form.supportPhone || null,
        notes: form.notes || null,
        isActive: form.isActive,
      };
      if (editing) {
        await apiPatch(`/api/v1/insurance/providers/${editing.id}`, payload);
        toast.success("Provider updated.");
      } else {
        await apiPost("/api/v1/insurance/providers", payload);
        toast.success("Provider created.");
      }
      setDialogOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to save provider.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Insurance Providers"
        subtitle="Insurers used for policies and claims."
        actions={
          <Button className="rounded-lg" onClick={openCreate}>
            <Plus className="size-4" /> Add provider
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="border-b p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search providers"
            className="h-9 max-w-md rounded-lg"
          />
        </div>

        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState
            title="Unable to load providers."
            description={error}
            action={<Button onClick={() => void load()}>Retry</Button>}
          />
        ) : !data?.items.length ? (
          <EmptyState
            title="No providers yet."
            description="Add insurers before creating policies and claims."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add provider
              </Button>
            }
          />
        ) : (
          <>
            <MobileCards>
              {data.items.map((provider) => (
                <RecordCard key={provider.id}>
                  <p className="font-semibold">{provider.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {provider.supportPhone ?? provider.supportEmail ?? "No contact"}
                  </p>
                  <div className="mt-2">
                    <StatusBadge
                      label={provider.isActive ? "ACTIVE" : "INACTIVE"}
                      tone={provider.isActive ? "success" : "warning"}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => openEdit(provider)}>
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
                    <th className="px-4 py-2 font-medium">Support</th>
                    <th className="px-4 py-2 font-medium">Policies</th>
                    <th className="px-4 py-2 font-medium">Claims</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((provider) => (
                    <tr key={provider.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{provider.name}</td>
                      <td className="px-4 py-3">
                        <p>{provider.supportContact ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {provider.supportPhone ?? provider.supportEmail ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">{provider.policyCount ?? "—"}</td>
                      <td className="px-4 py-3">{provider.claimCount ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={provider.isActive ? "ACTIVE" : "INACTIVE"}
                          tone={provider.isActive ? "success" : "warning"}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openEdit(provider)}>
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
          <form onSubmit={saveProvider}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit provider" : "Add provider"}</DialogTitle>
              <DialogDescription>Insurer details for policies and claims.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Support contact</Label>
                <Input
                  value={form.supportContact}
                  onChange={(e) => setForm({ ...form, supportContact: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Support phone</Label>
                <Input
                  value={form.supportPhone}
                  onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Support email</Label>
                <Input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
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
                {saving ? "Saving…" : editing ? "Save changes" : "Create provider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
