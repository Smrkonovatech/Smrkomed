"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Template = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED" | "PAUSED";
  lastSyncedAt: string | null;
  rejectionReason?: string | null;
};

const VARIABLES = [
  "patient_name",
  "doctor_name",
  "clinic_name",
  "appointment_date",
  "appointment_time",
  "treatment_name",
  "medicine_name",
  "medicine_time",
  "payment_amount",
  "payment_link",
  "care_coordinator",
] as const;

function tone(status: Template["status"]) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING" || status === "PAUSED") return "warning" as const;
  return "danger" as const;
}

function label(status: Template["status"]) {
  if (status === "APPROVED") return "Approved by Meta";
  if (status === "PENDING") return "Pending Meta";
  if (status === "REJECTED") return "Rejected by Meta";
  if (status === "DISABLED") return "Disabled";
  return "Paused";
}

function applyPreview(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export default function WhatsAppTemplatesCenterPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("UTILITY");
  const [draftLanguage, setDraftLanguage] = useState("en");
  const [draftHeader, setDraftHeader] = useState("");
  const [draftBody, setDraftBody] = useState(
    "Hi {{patient_name}}, your appointment with {{doctor_name}} is on {{appointment_date}} at {{appointment_time}}.",
  );
  const [draftFooter, setDraftFooter] = useState("{{clinic_name}}");

  const [usage, setUsage] = useState<
    Record<string, { flows: Array<{ id: string; name: string; status: string; active: boolean }> }>
  >({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, usageRes] = await Promise.all([
        apiGet<Template[]>("/api/v1/integrations/whatsapp/templates"),
        apiGet<{ items: Array<{ templateName: string; flows: Array<{ id: string; name: string; status: string; active: boolean }> }> }>(
          "/api/v1/whatsapp-automation/template-usage",
        ).catch(() => ({ items: [] })),
      ]);
      setRows(next);
      const map: typeof usage = {};
      for (const item of usageRes.items) {
        map[item.templateName.toLowerCase()] = { flows: item.flows };
      }
      setUsage(map);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery = !q || row.name.toLowerCase().includes(q.toLowerCase());
        const matchesStatus = !status || row.status === status;
        return matchesQuery && matchesStatus;
      }),
    [q, rows, status],
  );

  const sampleVars: Record<string, string> = {
    patient_name: "Priya",
    doctor_name: "Dr. Ananya Rao",
    clinic_name: "ABC Fertility Centre",
    appointment_date: "2 Sep 2026",
    appointment_time: "10:30 AM",
    treatment_name: "IVF",
    medicine_name: "Folic Acid",
    medicine_time: "8:00 AM",
    payment_amount: "₹15,000",
    payment_link: "https://pay.example/demo",
    care_coordinator: "Meera Iyer",
  };

  const previewBody = applyPreview(draftBody, sampleVars);
  const previewHeader = applyPreview(draftHeader, sampleVars);
  const previewFooter = applyPreview(draftFooter, sampleVars);

  const insertVariable = (key: string) => {
    setDraftBody((prev) => `${prev}{{${key}}}`);
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await apiPost("/api/v1/integrations/whatsapp/sync", {});
      toast.success("Synced templates from Meta.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sync failed. Connect WhatsApp in Settings first.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Templates"
        subtitle="Statuses come from Meta. SmrkoMed never marks a template approved unless Meta confirms it."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync from Meta"}
            </Button>
          </div>
        }
      />

      {error ? (
        <EmptyState title="Unable to load templates." description={error} action={<Button onClick={() => void load()}>Retry</Button>} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="DISABLED">Disabled</option>
              <option value="PAUSED">Paused</option>
            </select>
          </div>

          {loading ? (
            <LoadingRows rows={4} />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-2">Template</th>
                    <th className="px-4 py-2">Language</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Used in flows</th>
                    <th className="px-4 py-2">Last synced</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                        No templates yet. Connect WhatsApp and sync, or create drafts in Meta Business Manager.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const used = usage[row.name.toLowerCase()]?.flows ?? [];
                      const activeCount = used.filter((f) => f.active).length;
                      return (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3">{row.language}</td>
                        <td className="px-4 py-3">{row.category}</td>
                        <td className="px-4 py-3">
                          <StatusBadge label={label(row.status)} tone={tone(row.status)} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {used.length === 0
                            ? "—"
                            : `${used.length} flow${used.length === 1 ? "" : "s"}${activeCount ? ` (${activeCount} active)` : ""}`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="surface-card space-y-3 p-4">
          <h2 className="text-sm font-semibold">Live WhatsApp-style preview</h2>
          <p className="text-xs text-muted-foreground">
            Draft composer for clinic copy. Submitting for Meta approval is done in Meta Business Manager; then use
            Sync. This preview does not send messages.
          </p>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="appointment_reminder" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
              >
                <option value="UTILITY">Utility</option>
                <option value="MARKETING">Marketing</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Input value={draftLanguage} onChange={(e) => setDraftLanguage(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Header</Label>
            <Input value={draftHeader} onChange={(e) => setDraftHeader(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea value={draftBody} onChange={(e) => setDraftBody(e.target.value)} rows={4} />
          </div>
          <div className="flex flex-wrap gap-1">
            {VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                className="rounded-md border bg-muted/40 px-2 py-0.5 text-[10px] font-medium hover:bg-muted"
                onClick={() => insertVariable(v)}
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Footer</Label>
            <Input value={draftFooter} onChange={(e) => setDraftFooter(e.target.value)} />
          </div>
          <div className="rounded-2xl bg-[#e5ddd5] p-3">
            <div className="ml-auto max-w-[90%] rounded-lg bg-[#dcf8c6] px-3 py-2 text-sm shadow-sm">
              {previewHeader ? <p className="mb-1 font-semibold">{previewHeader}</p> : null}
              <p className="whitespace-pre-wrap">{previewBody}</p>
              {previewFooter ? <p className="mt-2 text-[11px] text-muted-foreground">{previewFooter}</p> : null}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              toast.message("Draft kept locally for preview only.", {
                description: "Create/submit the template in Meta, then Sync here. SmrkoMed will not invent approval.",
              })
            }
          >
            Save draft note
          </Button>
        </aside>
      </div>
    </div>
  );
}
