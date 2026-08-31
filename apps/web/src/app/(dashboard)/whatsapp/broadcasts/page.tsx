"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
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

export default function WhatsAppBroadcastsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("en");
  const [inactiveDays, setInactiveDays] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await apiGet<Campaign[]>("/api/v1/whatsapp-automation/campaigns"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load campaigns");
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
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Preview failed");
    }
  }

  async function create() {
    try {
      const created = await apiPost<Campaign>("/api/v1/whatsapp-automation/campaigns", {
        name,
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
      setName("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Create failed");
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
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Broadcasts / Campaigns"
        subtitle="Template-only, consent-gated campaigns. Explicit staff confirmation required before any send."
      />

      <div className="surface-card space-y-3 p-4">
        <h2 className="text-sm font-semibold">Create campaign</h2>
        <div className="space-y-2">
          <Label>Campaign name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Approved template name</Label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Optional: inactive days filter</Label>
          <Input
            type="number"
            placeholder="e.g. 30"
            value={inactiveDays}
            onChange={(e) => setInactiveDays(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void runPreview()}>
            Preview audience
          </Button>
          <Button size="sm" disabled={!name.trim() || !templateName.trim()} onClick={() => void create()}>
            Save draft + materialize
          </Button>
        </div>
        {preview ? (
          <div className="rounded-lg border p-3 text-sm">
            <p>Audience: {preview.audienceCount}</p>
            <p>Consent eligible: {preview.consentEligibleCount}</p>
            <p>Excluded: {preview.skippedCount}</p>
            {Object.keys(preview.exclusionCounts).length ? (
              <p className="text-xs text-muted-foreground">
                Reasons:{" "}
                {Object.entries(preview.exclusionCounts)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {confirmId ? (
        <div className="surface-card space-y-2 border-amber-200 bg-amber-50/50 p-4 text-sm">
          <p className="font-medium">Confirm send?</p>
          <p className="text-muted-foreground">
            This will start sending the Meta-approved template to consent-eligible recipients only. This cannot be
            undone for messages already accepted by Meta.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void confirm(confirmId)}>
              Confirm & send
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? <LoadingRows rows={3} /> : null}
      {!loading && campaigns.length === 0 ? (
        <EmptyState title="No campaigns yet" description="Create a draft, review eligible counts, then confirm." />
      ) : null}

      <ul className="space-y-2">
        {campaigns.map((c) => (
          <li key={c.id} className="surface-card space-y-2 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.templateName} ({c.templateLanguage})
                </p>
              </div>
              <StatusBadge label={c.status} tone={c.status === "COMPLETED" ? "success" : "info"} />
            </div>
            <p className="text-xs text-muted-foreground">
              Audience {c.audienceCount} · Eligible {c.eligibleCount} · Excluded {c.excludedCount} · Sent {c.sentCount}{" "}
              · Failed {c.failedCount} · Skipped {c.skippedCount}
            </p>
            <div className="flex gap-2">
              {["DRAFT", "READY", "PAUSED"].includes(c.status) ? (
                <Button size="sm" onClick={() => setConfirmId(c.id)}>
                  Review & confirm
                </Button>
              ) : null}
              {!["COMPLETED", "CANCELLED"].includes(c.status) ? (
                <Button
                  size="sm"
                  variant="outline"
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
