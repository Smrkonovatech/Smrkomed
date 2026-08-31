"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { WhatsAppConnectionPanel } from "@/components/whatsapp/connection-panel";
import { AiCoordinationPanel } from "@/components/whatsapp/center/ai-coordination";
import { EmptyState, LoadingRows } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiGet, apiPatch } from "@/lib/api/client";
import Link from "next/link";

type DayHours = { start: string; end: string } | null;
type WorkingHours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>>;

type CommSettings = {
  workingHours: WorkingHours | null;
  timezone: string;
  maxMessagesPerDay: number;
  minDelayMinutes: number;
  requireConsentGranted: boolean;
  urgentBypassHours: boolean;
};

const DAYS: Array<{ key: keyof WorkingHours; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export default function WhatsAppSettingsPage() {
  const [settings, setSettings] = useState<CommSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<CommSettings>("/api/v1/whatsapp-automation/settings/communication");
      setSettings(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load communication settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await apiPatch<CommSettings>("/api/v1/whatsapp-automation/settings/communication", settings);
      setSettings(next);
      toast.success("Communication settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateDay(key: keyof WorkingHours, closed: boolean) {
    if (!settings) return;
    const hours = { ...(settings.workingHours ?? {}) };
    hours[key] = closed ? null : { start: "09:00", end: "18:00" };
    setSettings({ ...settings, workingHours: hours });
  }

  function updateDayTime(key: keyof WorkingHours, field: "start" | "end", value: string) {
    if (!settings) return;
    const hours = { ...(settings.workingHours ?? {}) };
    const cur = hours[key] ?? { start: "09:00", end: "18:00" };
    hours[key] = { ...cur, [field]: value };
    setSettings({ ...settings, workingHours: hours });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">WhatsApp Settings</h2>
        <p className="text-sm text-muted-foreground">
          Connection, automation timing, consent, and AI safety for Care Loop communication.
        </p>
      </div>
      <WhatsAppConnectionPanel />

      <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold">Automation settings</h2>
          <p className="text-xs text-muted-foreground">
            Default reminder timing, escalation windows, message limits, and working hours.
          </p>
        </div>

        {loading ? <LoadingRows rows={3} /> : null}
        {error ? <EmptyState title="Unable to load settings" description={error} /> : null}

        {settings && !loading ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Max automated messages / patient / day</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.maxMessagesPerDay}
                  onChange={(e) =>
                    setSettings({ ...settings, maxMessagesPerDay: Number(e.target.value) || 5 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum delay between automated messages (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  value={settings.minDelayMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, minDelayMinutes: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={settings.requireConsentGranted}
                onChange={(e) => setSettings({ ...settings, requireConsentGranted: e.target.checked })}
              />
              <span>
                Require WhatsApp consent <strong>GRANTED</strong> before automated sends (recommended for production).
                Default off preserves existing clinics that only block REVOKED.
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={settings.urgentBypassHours}
                onChange={(e) => setSettings({ ...settings, urgentBypassHours: e.target.checked })}
              />
              <span>Allow urgent / escalation paths to bypass working-hours wait.</span>
            </label>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Working hours</Label>
              <ul className="space-y-2">
                {DAYS.map(({ key, label }) => {
                  const day = settings.workingHours?.[key] ?? null;
                  const closed = day === null;
                  return (
                    <li key={key} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="w-24 font-medium">{label}</span>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input type="checkbox" checked={closed} onChange={(e) => updateDay(key, e.target.checked)} />
                        Closed
                      </label>
                      {!closed && day ? (
                        <>
                          <Input
                            className="w-28"
                            value={day.start}
                            onChange={(e) => updateDayTime(key, "start", e.target.value)}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            className="w-28"
                            value={day.end}
                            onChange={(e) => updateDayTime(key, "end", e.target.value)}
                          />
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            <Button className="rounded-xl" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save communication settings"}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Consent settings</h2>
        <p className="text-xs text-muted-foreground">
          WhatsApp consent and communication preferences are managed per patient. Automation respects revoked
          consent and opt-outs.
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/whatsapp/consent">Open consent history</Link>
        </Button>
      </section>

      <AiCoordinationPanel />
    </div>
  );
}
