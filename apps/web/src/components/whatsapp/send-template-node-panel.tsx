"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { ApiError, apiGet } from "@/lib/api/client";

type ApprovedTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  sendable: boolean;
  header?: string | null;
  body?: string | null;
  footer?: string | null;
  buttons?: unknown;
  parsed?: {
    variables: Array<{
      component: string;
      token: string;
      key: string;
      buttonIndex?: number;
    }>;
    header: string | null;
    body: string | null;
    footer: string | null;
    buttons: Array<{ type: string; text?: string; url?: string }> | null;
  };
};

type VariableCatalog = {
  supported: Record<string, readonly string[]>;
};

const SAMPLE: Record<string, string> = {
  "patient.firstName": "Priya",
  "patient.lastName": "Sharma",
  "patient.fullName": "Priya Sharma",
  "doctor.name": "Dr. Ananya Rao",
  "appointment.date": "2 Sep 2026",
  "appointment.time": "10:30 AM",
  "clinic.name": "SmrkoMed Demo Clinic",
  "journey.stage": "Stimulation",
  "careLoop.taskTitle": "Upload lab report",
  patient_name: "Priya Sharma",
  appointment_date: "2 Sep 2026",
  appointment_time: "10:30 AM",
  doctor_name: "Dr. Ananya Rao",
  clinic_name: "SmrkoMed Demo Clinic",
};

const SOURCE_GROUPS: Array<{ group: string; options: Array<{ value: string; label: string }> }> = [
  {
    group: "Patient",
    options: [
      { value: "patient.firstName", label: "First Name" },
      { value: "patient.lastName", label: "Last Name" },
      { value: "patient.fullName", label: "Full Name" },
      { value: "patient.phone", label: "Phone" },
    ],
  },
  {
    group: "Doctor",
    options: [
      { value: "doctor.name", label: "Name" },
      { value: "doctor.title", label: "Title" },
    ],
  },
  {
    group: "Appointment",
    options: [
      { value: "appointment.date", label: "Date" },
      { value: "appointment.time", label: "Time" },
      { value: "appointment.doctor", label: "Doctor" },
      { value: "appointment.type", label: "Type" },
    ],
  },
  {
    group: "Clinic",
    options: [
      { value: "clinic.name", label: "Name" },
      { value: "clinic.phone", label: "Phone" },
    ],
  },
  {
    group: "Journey",
    options: [
      { value: "journey.stage", label: "Stage" },
      { value: "journey.status", label: "Status" },
    ],
  },
  {
    group: "Care Loop",
    options: [
      { value: "careLoop.taskTitle", label: "Task Title" },
      { value: "careLoop.taskDueDate", label: "Task Due Date" },
      { value: "careLoop.taskStatus", label: "Task Status" },
    ],
  },
  {
    group: "Previous node",
    options: [
      { value: "patient_name", label: "patient_name (lookup)" },
      { value: "appointment_date", label: "appointment_date" },
      { value: "appointment_time", label: "appointment_time" },
      { value: "doctor_name", label: "doctor_name" },
      { value: "medicine_name", label: "medicine_name" },
      { value: "clinic_name", label: "clinic_name" },
    ],
  },
];

function applyPreview(text: string | null | undefined, values: Record<string, string>) {
  if (!text) return "";
  return text.replace(/\{\{\s*([0-9A-Za-z_]+)\s*\}\}/g, (_, token: string) => {
    return (
      values[`body.${token}`] ??
      values[`header.${token}`] ??
      values[token] ??
      `{{${token}}}`
    );
  });
}

export function SendTemplateNodePanel({
  config,
  readOnly,
  onChange,
}: {
  config: Record<string, unknown>;
  readOnly?: boolean;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApprovedTemplate | null>(null);

  const templateId = String(config["templateId"] ?? "");
  const mappings = useMemo(() => {
    const raw = config["variableMappings"];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return { ...(raw as Record<string, string>) };
    }
    return {} as Record<string, string>;
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiGet<ApprovedTemplate[]>("/api/v1/integrations/whatsapp/templates/approved")
      .then((rows) => {
        if (cancelled) return;
        const approved = rows.filter((t) => t.sendable || t.status === "APPROVED");
        setTemplates(approved);
        setLoadError(null);
        const match = approved.find((t) => t.id === templateId) ?? null;
        setSelected(match);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Could not load approved templates.");
        setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // Warm catalog (Phase 1) — unused beyond confirming API; options are local + catalog-aligned
    void apiGet<VariableCatalog>("/api/v1/integrations/whatsapp/templates/variable-catalog").catch(
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const slots = selected?.parsed?.variables ?? [];

  const sampleValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const slot of slots) {
      const source = mappings[slot.key] ?? "";
      const sample = (source && SAMPLE[source]) || SAMPLE[slot.key] || SAMPLE[slot.token] || "Sample";
      out[slot.key] = sample;
      out[slot.token] = sample;
      out[`${slot.component.toLowerCase()}.${slot.token}`] = sample;
    }
    return out;
  }, [slots, mappings]);

  const unmapped = slots.filter((s) => !String(mappings[s.key] ?? "").trim());

  const selectTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id) ?? null;
    setSelected(tpl);
    if (!tpl) {
      onChange({
        ...config,
        templateId: "",
        templateName: "",
        templateLanguage: "",
        variableMappings: {},
      });
      return;
    }
    // Preserve prior mappings when re-selecting same structure; reset otherwise
    const nextMappings: Record<string, string> = {};
    for (const slot of tpl.parsed?.variables ?? []) {
      if (mappings[slot.key]) nextMappings[slot.key] = mappings[slot.key]!;
    }
    onChange({
      ...config,
      templateId: tpl.id,
      templateName: tpl.name,
      templateLanguage: tpl.language,
      variableMappings: nextMappings,
      // Clear legacy-only keys so persistence is templateId-first
      variableKeys: undefined,
    });
  };

  const setMapping = (slotKey: string, source: string) => {
    onChange({
      ...config,
      variableMappings: { ...mappings, [slotKey]: source },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Template</Label>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading approved templates…</p>
        ) : loadError ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {loadError}
          </p>
        ) : templates.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            No APPROVED Meta templates for this clinic. Sync templates from WhatsApp settings first.
          </p>
        ) : (
          <select
            className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            disabled={readOnly}
            value={templateId}
            onChange={(e) => selectTemplate(e.target.value)}
          >
            <option value="">Select approved template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.language}
              </option>
            ))}
          </select>
        )}
        <p className="text-[11px] text-muted-foreground">Only Meta-APPROVED templates can be selected.</p>
      </div>

      {selected ? (
        <>
          <div className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1">
            <p>
              <span className="text-muted-foreground">Name</span> · {selected.name}
            </p>
            <p>
              <span className="text-muted-foreground">Language</span> · {selected.language}
            </p>
            <p className="flex items-center gap-1">
              <span className="text-muted-foreground">Status</span> ·
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="size-3" /> {selected.status}
              </span>
            </p>
            {selected.header || selected.parsed?.header ? (
              <p>
                <span className="text-muted-foreground">Header</span> ·{" "}
                {selected.parsed?.header ?? selected.header}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Body</span> ·{" "}
              {selected.parsed?.body ?? selected.body ?? "—"}
            </p>
            {selected.footer || selected.parsed?.footer ? (
              <p>
                <span className="text-muted-foreground">Footer</span> ·{" "}
                {selected.parsed?.footer ?? selected.footer}
              </p>
            ) : null}
            {(selected.parsed?.buttons?.length ?? 0) > 0 ? (
              <p>
                <span className="text-muted-foreground">Buttons</span> ·{" "}
                {selected.parsed!.buttons!.map((b) => b.text || b.type).join(", ")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Variables</Label>
            {slots.length === 0 ? (
              <p className="text-xs text-muted-foreground">This template has no variables.</p>
            ) : (
              slots.map((slot) => (
                <div key={slot.key} className="space-y-1 rounded-md border p-2">
                  <p className="text-xs font-medium">
                    {slot.component === "HEADER"
                      ? "Header"
                      : slot.component === "BUTTON"
                        ? "Button"
                        : "Body"}{" "}
                    {`{{${slot.token}}}`}
                  </p>
                  <Label className="text-[10px] text-muted-foreground">Source</Label>
                  <select
                    className="flex h-8 w-full rounded-md border bg-background px-2 text-xs"
                    disabled={readOnly}
                    value={mappings[slot.key] ?? ""}
                    onChange={(e) => setMapping(slot.key, e.target.value)}
                  >
                    <option value="">Select variable</option>
                    {SOURCE_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {g.group} → {o.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {!mappings[slot.key] ? (
                    <p className="text-[11px] text-destructive">Required for activation.</p>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Preview</Label>
            <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-xs space-y-1">
              <p className="font-semibold uppercase tracking-wide text-amber-800">
                Demo / sample data — not sent in live runs
              </p>
              {selected.parsed?.header || selected.header ? (
                <p className="font-medium">
                  {applyPreview(selected.parsed?.header ?? selected.header, sampleValues)}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap">
                {applyPreview(selected.parsed?.body ?? selected.body, sampleValues)}
              </p>
              {selected.parsed?.footer || selected.footer ? (
                <p className="text-muted-foreground">
                  {selected.parsed?.footer ?? selected.footer}
                </p>
              ) : null}
            </div>
          </div>

          {unmapped.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              Map all variables before activating this flow.
            </p>
          ) : slots.length > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Template configuration looks complete.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
