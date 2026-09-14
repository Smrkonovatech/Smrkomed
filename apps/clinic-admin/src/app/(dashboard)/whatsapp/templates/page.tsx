"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type TemplateButton = {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
};

type ParsedSlot = {
  component: "HEADER" | "BODY" | "BUTTON";
  buttonIndex?: number;
  buttonType?: string;
  index: number;
  token: string;
  positional: boolean;
  key: string;
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
  sendable?: boolean;
  sourceOfTruth?: "META";
  parsed?: {
    header: string | null;
    body: string | null;
    footer: string | null;
    buttons: TemplateButton[] | null;
    variables: ParsedSlot[];
    variableKeys: string[];
    bodyParameterCount: number;
    parameterCount: number;
  };
};

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  whatsappNumber?: string | null;
};

type ResolveResult = {
  valid: boolean;
  missing: string[];
  values: Record<string, string>;
  sources: Record<string, string>;
  preview: {
    sourceOfTruth: "META";
    previewKind: "DEMO_SAMPLE_DATA" | "RESOLVED_DATA";
    disclaimer: string;
    header: string;
    body: string;
    footer: string | null;
    buttons: TemplateButton[] | null;
  };
};

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
  return text.replace(/\{\{(\d+|\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}

const SAMPLE_VARS: Record<string, string> = {
  "1": "Priya",
  "2": "2 Sep 2026",
  "3": "10:30 AM",
  "4": "Dr. Ananya Rao",
  "patient.fullName": "Priya Sharma",
  "doctor.name": "Dr. Ananya Rao",
  "clinic.name": "SmrkoMed Demo Clinic",
  "appointment.date": "2 Sep 2026",
  "appointment.time": "10:30 AM",
  patient_name: "Priya Sharma",
  doctor_name: "Dr. Ananya Rao",
  clinic_name: "SmrkoMed Demo Clinic",
  appointment_date: "2 Sep 2026",
  appointment_time: "10:30 AM",
};

export default function WhatsAppTemplatesCenterPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [testPatientId, setTestPatientId] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState<"sample" | "resolved">("sample");

  const [usage, setUsage] = useState<
    Record<string, { flows: Array<{ id: string; name: string; status: string; active: boolean }> }>
  >({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, usageRes, patientList] = await Promise.all([
        apiGet<Template[]>("/api/v1/integrations/whatsapp/templates?detailed=1"),
        apiGet<{
          items: Array<{
            templateName: string;
            flows: Array<{ id: string; name: string; status: string; active: boolean }>;
          }>;
        }>("/api/v1/whatsapp-automation/template-usage").catch(() => ({ items: [] })),
        apiGet<PatientOption[]>("/api/v1/patients").catch(() => [] as PatientOption[]),
      ]);
      setRows(next);
      setPatients(patientList);
      if (next.length > 0) {
        const first = next[0] ?? null;
        setSelectedTemplate((current) =>
          current ? (next.find((t) => t.id === current.id) ?? first) : first,
        );
      } else {
        setSelectedTemplate(null);
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

  const activeTemplate = selectedTemplate;
  const slots = activeTemplate?.parsed?.variables ?? [];
  const headerText = activeTemplate?.parsed?.header ?? activeTemplate?.header ?? null;
  const bodyText = activeTemplate?.parsed?.body ?? activeTemplate?.body ?? null;
  const footerText = activeTemplate?.parsed?.footer ?? activeTemplate?.footer ?? null;
  const buttons = activeTemplate?.parsed?.buttons ?? activeTemplate?.buttons ?? null;

  const previewValues =
    previewMode === "resolved" && resolveResult
      ? resolveResult.values
      : SAMPLE_VARS;

  const previewHeader = resolveResult?.preview && previewMode === "resolved"
    ? resolveResult.preview.header
    : applyPreview(headerText, previewValues);
  const previewBody = resolveResult?.preview && previewMode === "resolved"
    ? resolveResult.preview.body
    : applyPreview(bodyText, previewValues) || "No body text synced from Meta.";
  const previewFooter = resolveResult?.preview && previewMode === "resolved"
    ? resolveResult.preview.footer
    : footerText;

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

  const runResolve = async (sample: boolean) => {
    if (!activeTemplate) return;
    setResolving(true);
    try {
      const next = await apiPost<ResolveResult>(
        `/api/v1/integrations/whatsapp/templates/${activeTemplate.id}/resolve`,
        {
          sample,
          ...(testPatientId ? { patientId: testPatientId } : {}),
          overrides,
        },
      );
      setResolveResult(next);
      setPreviewMode(sample ? "sample" : "resolved");
      if (!sample && next.missing.length) {
        toast.message("Some variables are still missing", {
          description: next.missing.join(", "),
        });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not resolve variables.");
    } finally {
      setResolving(false);
    }
  };

  const testSend = async () => {
    if (!activeTemplate) return;
    if (activeTemplate.status !== "APPROVED") {
      toast.error("Only Meta-approved templates can be sent.");
      return;
    }
    if (!testPatientId) {
      toast.error("Select a test patient with a WhatsApp number.");
      return;
    }
    setSending(true);
    try {
      const result = await apiPost<{
        ok: boolean;
        messageId: string;
        providerMessageId: string | null;
        status: string;
      }>("/api/v1/integrations/whatsapp/templates/test-send", {
        templateId: activeTemplate.id,
        patientId: testPatientId,
        overrides,
        confirm: true,
      });
      toast.success("Test template sent.", {
        description: result.providerMessageId
          ? `Meta message ID: ${result.providerMessageId}`
          : `Message ${result.messageId} · ${result.status}`,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Test send failed.");
    } finally {
      setSending(false);
    }
  };

  const approvedCount = rows.filter((r) => r.status === "APPROVED").length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="WhatsApp Templates"
        subtitle={`Meta is the source of truth. ${approvedCount} approved template${approvedCount === 1 ? "" : "s"} ready to send. Local drafts are never treated as approved.`}
        actions={
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
                <Link href="/whatsapp/settings">Check WhatsApp Settings</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
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
                              ? "Sync from Meta to load templates from your WhatsApp Business Account."
                              : "No templates match your search filter."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const isSelected = selectedTemplate?.id === row.id;
                      const used = usage[row.name.toLowerCase()]?.flows ?? [];
                      const activeCount = used.filter((f) => f.active).length;
                      const varCount =
                        row.parsed?.parameterCount ?? row.variables?.length ?? row.parameterCount ?? 0;
                      const hasHeader = Boolean(row.parsed?.header ?? row.header);
                      const hasFooter = Boolean(row.parsed?.footer ?? row.footer);
                      const hasButtons = Boolean(
                        (row.parsed?.buttons ?? row.buttons) &&
                          Array.isArray(row.parsed?.buttons ?? row.buttons) &&
                          ((row.parsed?.buttons ?? row.buttons) as unknown[]).length > 0,
                      );

                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            setSelectedTemplate(row);
                            setResolveResult(null);
                            setOverrides({});
                            setPreviewMode("sample");
                          }}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/40",
                            isSelected && "bg-primary-soft/35 font-medium",
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{row.name}</div>
                            <div className="text-[11px] text-muted-foreground">REAL META TEMPLATE</div>
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
                              {hasHeader ? (
                                <span className="rounded border bg-background px-1 text-muted-foreground">Header</span>
                              ) : null}
                              <span className="rounded border bg-background px-1 text-muted-foreground">Body</span>
                              {hasFooter ? (
                                <span className="rounded border bg-background px-1 text-muted-foreground">Footer</span>
                              ) : null}
                              {hasButtons ? (
                                <span className="rounded border bg-sky-50 px-1 text-sky-700">Buttons</span>
                              ) : null}
                              {varCount > 0 ? (
                                <span className="rounded border bg-violet-50 px-1 text-violet-700">
                                  {varCount} var{varCount === 1 ? "" : "s"}
                                </span>
                              ) : null}
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
          {activeTemplate ? (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">{activeTemplate.name}</h2>
                  <StatusBadge label={label(activeTemplate.status)} tone={tone(activeTemplate.status)} />
                </div>
                <p className="mt-1 text-[11px] font-medium tracking-wide text-emerald-800 uppercase">
                  Real Meta template · source of truth
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Language: <span className="font-medium uppercase">{activeTemplate.language}</span> · Category:{" "}
                  <span className="font-medium">{activeTemplate.category}</span>
                </p>
              </div>

              {activeTemplate.status === "REJECTED" ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="size-4 text-rose-600" />
                    Rejected by Meta
                  </div>
                  <p className="mt-1">
                    {activeTemplate.rejectionReason ??
                      "Meta did not approve this template. It cannot be sent from SmrkoMed."}
                  </p>
                </div>
              ) : null}

              {activeTemplate.status === "PENDING" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Clock className="size-4 text-amber-600" />
                    Pending Meta Approval
                  </div>
                  <p className="mt-1">Not selectable for sending until Meta marks it APPROVED.</p>
                </div>
              ) : null}

              {activeTemplate.status === "DISABLED" || activeTemplate.status === "PAUSED" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="size-4" />
                    {activeTemplate.status === "DISABLED" ? "Disabled by Meta" : "Paused by Meta"}
                  </div>
                  <p className="mt-1">Sending is blocked while this status remains.</p>
                </div>
              ) : null}

              {slots.length > 0 ? (
                <div className="rounded-lg border bg-muted/20 p-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase">
                    Detected variables ({slots.length})
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {slots.map((slot) => (
                      <span
                        key={`${slot.component}-${slot.token}-${slot.buttonIndex ?? ""}`}
                        className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px]"
                        title={slot.key}
                      >
                        {slot.component.slice(0, 1)} · {`{{${slot.token}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Preview</p>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                      previewMode === "sample"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900",
                    )}
                  >
                    {previewMode === "sample" ? "DEMO / SAMPLE DATA" : "RESOLVED PATIENT DATA"}
                  </span>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="space-y-2 rounded-lg border bg-background p-3 text-sm shadow-sm">
                    {previewHeader ? <p className="font-semibold">{previewHeader}</p> : null}
                    <p className="whitespace-pre-wrap text-foreground/90">{previewBody}</p>
                    {previewFooter ? (
                      <p className="pt-1 text-[11px] text-muted-foreground">{previewFooter}</p>
                    ) : null}
                    {buttons && Array.isArray(buttons) && buttons.length > 0 ? (
                      <div className="mt-2 divide-y border-t pt-1">
                        {buttons.map((btn, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-primary"
                          >
                            {btn.type === "URL" ? <ExternalLink className="size-3" /> : null}
                            {btn.type === "PHONE_NUMBER" ? <CheckCircle2 className="size-3" /> : null}
                            {btn.text ?? `Button ${idx + 1}`}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {previewMode === "sample"
                      ? "Sample preview only — not a live patient message."
                      : "Resolved from clinic records for the selected patient."}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Test send</p>
                <div className="space-y-2">
                  <Label>Test patient</Label>
                  <select
                    className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={testPatientId}
                    onChange={(e) => setTestPatientId(e.target.value)}
                  >
                    <option value="">Select patient…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                        {p.whatsappNumber || p.phone ? ` · ${p.whatsappNumber || p.phone}` : " · no phone"}
                      </option>
                    ))}
                  </select>
                </div>

                {slots.map((slot) => (
                  <div key={`override-${slot.key}-${slot.token}`} className="space-y-1">
                    <Label className="text-xs">
                      {slot.component} {`{{${slot.token}}}`} → {slot.key}
                    </Label>
                    <Input
                      value={overrides[slot.key] ?? overrides[slot.token] ?? ""}
                      placeholder="Override if not auto-resolved"
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [slot.key]: e.target.value,
                          [slot.token]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}

                {resolveResult && !resolveResult.valid ? (
                  <p className="text-xs text-rose-700">
                    Missing: {resolveResult.missing.join(", ")}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolving}
                    onClick={() => void runResolve(true)}
                  >
                    Sample preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolving || !testPatientId}
                    onClick={() => void runResolve(false)}
                  >
                    Resolve for patient
                  </Button>
                  <Button
                    size="sm"
                    disabled={sending || activeTemplate.status !== "APPROVED" || !testPatientId}
                    className="gap-1.5"
                    onClick={() => void testSend()}
                  >
                    <Send className="size-3.5" />
                    {sending ? "Sending…" : "Confirm & send test"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Test send uses the existing Meta send path. Only APPROVED templates. Consent and clinic rules still
                  apply. Tokens are never shown.
                </p>
              </div>

              <Button asChild className="w-full" size="sm" variant="outline">
                <Link href="/whatsapp/flows">Use in Automations</Link>
              </Button>
            </div>
          ) : (
            <EmptyState
              title="Select a Meta template"
              description="Synced templates appear here with real Meta status. Create or edit copy in Meta Business Manager, then sync."
            />
          )}
        </aside>
      </div>
    </div>
  );
}
