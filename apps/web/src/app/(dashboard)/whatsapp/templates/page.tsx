"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, MessageSquare, Plus, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type TemplateButton = {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
};

type Template = {
  id: string;
  externalId?: string | null;
  name: string;
  language: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED" | "PAUSED";
  parameterCount?: number;
  header?: string | null;
  body?: string | null;
  footer?: string | null;
  buttons?: TemplateButton[] | null;
  variables?: string[] | null;
  components?: unknown;
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

function applyPreview(text: string | null | undefined, vars: Record<string, string>) {
  if (!text) return "";
  return text.replace(/\{\{(\d+|\w+)\}\}/g, (match, key: string) => {
    return vars[key] ?? match;
  });
}

export default function WhatsAppTemplatesCenterPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [panelMode, setPanelMode] = useState<"view" | "draft">("view");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Draft composer state
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
      if (next.length > 0) {
        const first = next[0] ?? null;
        setSelectedTemplate((current) => (current ? (next.find((t) => t.id === current.id) ?? first) : first));
      } else {
        setSelectedTemplate(null);
        setPanelMode("draft");
      }
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
    "1": "Priya",
    "2": "Dr. Ananya Rao",
    "3": "2 Sep 2026",
    "4": "10:30 AM",
    patient_name: "Priya",
    doctor_name: "Dr. Ananya Rao",
    clinic_name: "SmrkoMed Clinic",
    appointment_date: "2 Sep 2026",
    appointment_time: "10:30 AM",
    treatment_name: "General Consultation",
    medicine_name: "Amoxicillin 500mg",
    medicine_time: "8:00 AM after meals",
    payment_amount: "₹1,500",
    payment_link: "https://smrkomed.com/pay/sample",
    care_coordinator: "Meera Iyer",
  };

  const previewDraftBody = applyPreview(draftBody, sampleVars);
  const previewDraftHeader = applyPreview(draftHeader, sampleVars);
  const previewDraftFooter = applyPreview(draftFooter, sampleVars);

  const activeTemplate = selectedTemplate;
  const activeTemplateBody = activeTemplate?.body
    ? applyPreview(activeTemplate.body, sampleVars)
    : `Hi Priya, this is a message from SmrkoMed.`;
  const activeTemplateHeader = activeTemplate?.header ? applyPreview(activeTemplate.header, sampleVars) : null;
  const activeTemplateFooter = activeTemplate?.footer ? applyPreview(activeTemplate.footer, sampleVars) : null;

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

  const approvedCount = rows.filter((r) => r.status === "APPROVED").length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="WhatsApp Templates"
        subtitle={`Statuses come from Meta. ${approvedCount} approved template${approvedCount === 1 ? "" : "s"} ready for patient communication.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void sync()}
              disabled={syncing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing from Meta…" : "Sync from Meta"}
            </Button>
            <Button
              size="sm"
              variant={panelMode === "draft" ? "default" : "outline"}
              onClick={() => setPanelMode(panelMode === "draft" ? "view" : "draft")}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              {panelMode === "draft" ? "View Synced Preview" : "Draft New Template"}
            </Button>
          </div>
        }
      />

      {error ? (
        <EmptyState
          title="Unable to load templates"
          description={error}
          action={
            <div className="flex gap-2">
              <Button onClick={() => void load()}>Retry</Button>
              <Button variant="outline" asChild>
                <Link href="/settings">Check WhatsApp Settings</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                placeholder="Search templates by name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses ({rows.length})</option>
                <option value="APPROVED">Approved ({rows.filter((r) => r.status === "APPROVED").length})</option>
                <option value="PENDING">Pending ({rows.filter((r) => r.status === "PENDING").length})</option>
                <option value="REJECTED">Rejected ({rows.filter((r) => r.status === "REJECTED").length})</option>
                <option value="DISABLED">Disabled ({rows.filter((r) => r.status === "DISABLED").length})</option>
                <option value="PAUSED">Paused ({rows.filter((r) => r.status === "PAUSED").length})</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Click any row to preview its components
            </p>
          </div>

          {loading ? (
            <LoadingRows rows={5} />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Template</th>
                    <th className="px-3 py-3">Language</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Components</th>
                    <th className="px-3 py-3">Flows</th>
                    <th className="px-4 py-3">Last Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-2">
                          <MessageSquare className="size-8 text-muted-foreground/50" />
                          <p className="font-medium text-foreground">No templates found</p>
                          <p className="text-xs">
                            {rows.length === 0
                              ? "Click 'Sync from Meta' above to fetch approved templates from your WhatsApp Business Account."
                              : "No templates match your search filter."}
                          </p>
                          {rows.length === 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void sync()}
                              disabled={syncing}
                              className="mt-2"
                            >
                              Sync from Meta
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const isSelected = selectedTemplate?.id === row.id && panelMode === "view";
                      const used = usage[row.name.toLowerCase()]?.flows ?? [];
                      const activeCount = used.filter((f) => f.active).length;
                      const hasHeader = Boolean(row.header);
                      const hasFooter = Boolean(row.footer);
                      const hasButtons = Boolean(row.buttons && Array.isArray(row.buttons) && row.buttons.length > 0);
                      const varCount = row.variables?.length ?? row.parameterCount ?? 0;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            setSelectedTemplate(row);
                            setPanelMode("view");
                          }}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/40",
                            isSelected && "bg-primary-soft/35 font-medium",
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{row.name}</div>
                            {row.externalId && (
                              <div className="text-[11px] text-muted-foreground tabular-nums">
                                ID: {row.externalId}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 uppercase text-muted-foreground">{row.language}</td>
                          <td className="px-3 py-3">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {row.category}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge label={label(row.status)} tone={tone(row.status)} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {hasHeader && (
                                <span className="rounded border bg-background px-1 py-0.2 text-muted-foreground">
                                  Header
                                </span>
                              )}
                              <span className="rounded border bg-background px-1 py-0.2 text-muted-foreground">
                                Body
                              </span>
                              {hasFooter && (
                                <span className="rounded border bg-background px-1 py-0.2 text-muted-foreground">
                                  Footer
                                </span>
                              )}
                              {hasButtons && (
                                <span className="rounded border bg-sky-50 px-1 py-0.2 text-sky-700">
                                  Buttons
                                </span>
                              )}
                              {varCount > 0 && (
                                <span className="rounded border bg-violet-50 px-1 py-0.2 text-violet-700">
                                  {varCount} var{varCount === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {used.length === 0
                              ? "—"
                              : `${used.length} flow${used.length === 1 ? "" : "s"}${activeCount ? ` (${activeCount} active)` : ""}`}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                            {row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleDateString("en-IN") : "—"}
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

        <aside className="surface-card space-y-4 p-5">
          {panelMode === "view" && activeTemplate ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">{activeTemplate.name}</h2>
                    <StatusBadge label={label(activeTemplate.status)} tone={tone(activeTemplate.status)} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Language: <span className="font-medium uppercase">{activeTemplate.language}</span> • Category:{" "}
                    <span className="font-medium">{activeTemplate.category}</span>
                  </p>
                  {activeTemplate.externalId && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Meta ID: {activeTemplate.externalId}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => setPanelMode("draft")}
                >
                  New Draft
                </Button>
              </div>

              {activeTemplate.status === "REJECTED" && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="size-4 text-rose-600" />
                    Rejected by Meta
                  </div>
                  <p className="mt-1">
                    {activeTemplate.rejectionReason ??
                      "Meta reviewers did not approve this template. Review Meta's Business Messaging guidelines before editing."}
                  </p>
                </div>
              )}

              {activeTemplate.status === "PENDING" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Clock className="size-4 text-amber-600" />
                    Pending Meta Approval
                  </div>
                  <p className="mt-1">
                    This template was submitted to Meta and is awaiting approval. SmrkoMed will automatically enable it once approved.
                  </p>
                </div>
              )}

              {activeTemplate.variables && activeTemplate.variables.length > 0 && (
                <div className="rounded-lg border bg-muted/20 p-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase">
                    Template Variables ({activeTemplate.variables.length})
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {activeTemplate.variables.map((v) => (
                      <span
                        key={v}
                        className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Message Preview Bubble */}
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  Patient Preview
                </p>
                <div className="rounded-2xl bg-[#efeae2] p-4 shadow-inner">
                  <div className="ml-auto max-w-[95%] space-y-2 rounded-xl bg-white p-3 text-sm shadow-sm">
                    {activeTemplateHeader && (
                      <p className="font-semibold text-foreground">{activeTemplateHeader}</p>
                    )}
                    <p className="whitespace-pre-wrap text-foreground/90">{activeTemplateBody}</p>
                    {activeTemplateFooter && (
                      <p className="pt-1 text-[11px] text-muted-foreground">{activeTemplateFooter}</p>
                    )}

                    {activeTemplate.buttons && Array.isArray(activeTemplate.buttons) && activeTemplate.buttons.length > 0 && (
                      <div className="mt-2 divide-y divide-border border-t pt-1">
                        {activeTemplate.buttons.map((btn, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-[#00a884]"
                          >
                            {btn.type === "URL" ? (
                              <>
                                <ExternalLink className="size-3" />
                                {btn.text ?? "Visit Link"}
                              </>
                            ) : btn.type === "PHONE_NUMBER" ? (
                              <>
                                <CheckCircle2 className="size-3" />
                                {btn.text ?? "Call"}
                              </>
                            ) : (
                              btn.text ?? `Option ${idx + 1}`
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-right text-[10px] text-muted-foreground">
                    Simulated WhatsApp rendering with sample clinic data
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild className="w-full" size="sm">
                  <Link href="/whatsapp/automations">Use in Automations</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-sm font-semibold">Live WhatsApp-style Draft Composer</h2>
                {rows.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={() => setPanelMode("view")}
                  >
                    View Synced
                  </Button>
                )}
              </div>
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
                <Input value={draftHeader} onChange={(e) => setDraftHeader(e.target.value)} placeholder="Optional header" />
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
                  {previewDraftHeader ? <p className="mb-1 font-semibold">{previewDraftHeader}</p> : null}
                  <p className="whitespace-pre-wrap">{previewDraftBody}</p>
                  {previewDraftFooter ? <p className="mt-2 text-[11px] text-muted-foreground">{previewDraftFooter}</p> : null}
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
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

