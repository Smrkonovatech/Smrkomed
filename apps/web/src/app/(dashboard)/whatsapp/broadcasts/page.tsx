"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { PreviewBanner, WaSection, WaStatusPill } from "@/components/whatsapp/center/section";
import { EmptyState, LoadingRows } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Campaign = {
  id: string;
  name: string;
  status: string;
  templateName: string;
  templateLanguage: string;
  scheduledAt: string | null;
  audienceCount: number;
  eligibleCount: number;
  excludedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  updatedAt: string;
};

type Preview = {
  audienceCount: number;
  consentEligibleCount: number;
  skippedCount: number;
  exclusionCounts: Record<string, number>;
  sampleEligible: Array<{ id: string; name: string }>;
};

const AUDIENCES = [
  { id: "all", label: "All consenting patients" },
  { id: "ivf", label: "Active IVF patients" },
  { id: "overdue", label: "Patients with overdue tasks" },
  { id: "monitoring", label: "Patients in Monitoring stage" },
  { id: "upcoming", label: "Patients with upcoming appointments" },
] as const;

const TYPES = [
  "Clinic Announcement",
  "Appointment Availability",
  "Health Education",
  "Treatment Information",
  "Follow-up Campaign",
  "Reminder Campaign",
] as const;

export default function WhatsAppBroadcastsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("Monitoring stage reminder campaign");
  const [campaignType, setCampaignType] = useState<string>(TYPES[5]!);
  const [templateName, setTemplateName] = useState("appointment_confirmation");
  const [language, setLanguage] = useState("en");
  const [audience, setAudience] = useState<string>("monitoring");
  const [inactiveDays, setInactiveDays] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<Campaign[]>("/api/v1/whatsapp-automation/campaigns");
      setCampaigns(list);
      setUsingDemo(false);
    } catch {
      setCampaigns([]);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runPreview() {
    try {
      const next = await apiPost<Preview>("/api/v1/whatsapp-automation/segments/preview", {
        filters: {
          ...(inactiveDays ? { inactiveDays: Number(inactiveDays) } : {}),
          status: "ACTIVE",
          whatsappConsent: "GRANTED",
        },
      });
      setPreview(next);
      setUsingDemo(false);
    } catch {
      setPreview({
        audienceCount: 128,
        consentEligibleCount: 124,
        skippedCount: 4,
        exclusionCounts: { NO_CONSENT: 3, OPTED_OUT: 1 },
        sampleEligible: [
          { id: "1", name: "Priya + Rahul" },
          { id: "2", name: "Anjali + Arjun" },
        ],
      });
      setUsingDemo(true);
      toast.message("Showing sample audience preview");
    }
  }

  async function create() {
    if (usingDemo && !preview) {
      toast.message("Preview audience first, then save draft when API is connected.");
      return;
    }
    try {
      const created = await apiPost<Campaign>("/api/v1/whatsapp-automation/campaigns", {
        name: `${campaignType}: ${name}`,
        templateName,
        templateLanguage: language,
        filters: {
          status: "ACTIVE",
          ...(inactiveDays ? { inactiveDays: Number(inactiveDays) } : {}),
          whatsappConsent: "GRANTED",
        },
      });
      toast.success("Campaign drafted — confirm to send");
      setConfirmId(created.id);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed — connect automation API");
    }
  }

  async function confirm(id: string) {
    try {
      await apiPost(`/api/v1/whatsapp-automation/campaigns/${id}/confirm`, {});
      toast.success("Campaign confirmed — sending eligible recipients");
      setConfirmId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Confirm failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Broadcasts</h2>
        <p className="text-sm text-muted-foreground">
          Controlled healthcare communication — not mass marketing. Consent-gated, template-only, approval
          required.
        </p>
      </div>

      {usingDemo ? <PreviewBanner>Sample audience estimates until campaigns API is connected.</PreviewBanner> : null}

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        <div>
          <p className="font-medium text-emerald-950">Uncontrolled bulk messaging is blocked</p>
          <p className="mt-0.5 text-xs text-emerald-900/80">
            Only Meta-approved templates to patients with WhatsApp consent. Staff must confirm before send.
          </p>
        </div>
      </div>

      <WaSection title="Create broadcast" subtitle="Audience → approved template → preview → approval">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Broadcast type</Label>
            <select
              className="flex h-10 w-full rounded-xl border bg-background px-3 text-sm"
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input className="rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAudience(a.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    audience === a.id
                      ? "border-primary/40 bg-primary-soft/60 font-medium"
                      : "border-border/70 hover:bg-muted/40"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Approved template</Label>
              <Input
                className="rounded-xl"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="appointment_confirmation"
              />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Input className="rounded-xl" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Optional: inactive days</Label>
            <Input
              className="rounded-xl"
              type="number"
              placeholder="e.g. 30"
              value={inactiveDays}
              onChange={(e) => setInactiveDays(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void runPreview()}>
              Preview audience
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={!name.trim() || !templateName.trim()}
              onClick={() => toast.message("Draft saved locally — connect API to persist.")}
            >
              Save draft
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              disabled={!name.trim() || !templateName.trim()}
              onClick={() => void create()}
            >
              Schedule / send for approval
            </Button>
          </div>
          {preview ? (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <WaStatusPill label={`Recipients: ${preview.audienceCount}`} tone="muted" />
                <WaStatusPill label={`Estimated delivery: ${preview.consentEligibleCount}`} tone="success" />
                <WaStatusPill label="Requires approval: Yes" tone="warning" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Excluded: {preview.skippedCount}
                {Object.keys(preview.exclusionCounts).length
                  ? ` (${Object.entries(preview.exclusionCounts)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(", ")})`
                  : ""}
              </p>
              {preview.sampleEligible?.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sample: {preview.sampleEligible.map((s) => s.name).join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </WaSection>

      {confirmId ? (
        <div className="space-y-2 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 text-sm">
          <p className="font-medium">Confirm send?</p>
          <p className="text-muted-foreground">
            Sends the approved template only to consent-eligible recipients. Messages already accepted by Meta
            cannot be recalled.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="rounded-xl" onClick={() => void confirm(confirmId)}>
              Confirm & send
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? <LoadingRows rows={3} /> : null}
      {!loading && campaigns.length === 0 ? (
        <EmptyState
          title="No broadcasts yet"
          description="Create a draft, preview eligible counts, then get staff approval before send."
        />
      ) : null}

      <ul className="space-y-2">
        {campaigns.map((c) => (
          <li key={c.id} className="space-y-2 rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.templateName} ({c.templateLanguage})
                </p>
              </div>
              <WaStatusPill
                label={c.status}
                tone={c.status === "COMPLETED" ? "success" : c.status === "DRAFT" ? "warning" : "primary"}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Audience {c.audienceCount} · Eligible {c.eligibleCount} · Excluded {c.excludedCount} · Sent{" "}
              {c.sentCount} · Failed {c.failedCount}
            </p>
            <div className="flex gap-2">
              {["DRAFT", "READY", "PAUSED"].includes(c.status) ? (
                <Button size="sm" className="rounded-xl" onClick={() => setConfirmId(c.id)}>
                  Review & confirm
                </Button>
              ) : null}
              {!["COMPLETED", "CANCELLED"].includes(c.status) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() =>
                    void apiPost(`/api/v1/whatsapp-automation/campaigns/${c.id}/cancel`, {}).then(() => load())
                  }
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
