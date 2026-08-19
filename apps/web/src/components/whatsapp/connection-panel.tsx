"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { runWhatsAppEmbeddedSignup } from "@/lib/whatsapp/embedded-signup";

type ConnectionStatus = "NOT_CONNECTED" | "CONNECTING" | "CONNECTED" | "ACTION_REQUIRED" | "ERROR" | "DISCONNECTED";

type WhatsAppStatus = {
  integration: { connectionStatus: ConnectionStatus; displayName: string | null; lastError: { message: string } | null };
  account: {
    displayName: string | null;
    displayPhoneNumber: string | null;
    businessAccountId: string | null;
    qualityRating: string | null;
  } | null;
  templates: { approved: number; pending: number; rejected: number; total: number };
  lastSyncAt: string | null;
  attention: string | null;
};

const progressCopy = [
  "Connecting to Meta...",
  "Setting up WhatsApp Business...",
  "Finalizing connection...",
];

function toneFor(status: ConnectionStatus) {
  if (status === "CONNECTED") return "success" as const;
  if (status === "ACTION_REQUIRED" || status === "CONNECTING") return "warning" as const;
  if (status === "ERROR") return "danger" as const;
  return "muted" as const;
}

function labelFor(status: ConnectionStatus) {
  if (status === "CONNECTED") return "Connected";
  if (status === "ACTION_REQUIRED") return "Needs attention";
  if (status === "CONNECTING") return "Connecting";
  if (status === "ERROR") return "Error";
  if (status === "DISCONNECTED") return "Disconnected";
  return "Not connected";
}

export function WhatsAppConnectionPanel({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiGet<WhatsAppStatus>("/api/v1/integrations/whatsapp");
    setStatus(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await apiGet<WhatsAppStatus>("/api/v1/integrations/whatsapp");
        if (!cancelled) setStatus(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load WhatsApp status.");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    setError(null);
    setBusy("connect");
    setProgress(progressCopy[0] ?? null);
    try {
      const start = await apiPost<{
        state: string;
        appId: string;
        configId: string;
        graphVersion: string;
      }>("/api/v1/integrations/whatsapp/connect");
      setProgress(progressCopy[1] ?? null);
      const session = await runWhatsAppEmbeddedSignup({
        appId: start.appId,
        configId: start.configId,
        graphVersion: start.graphVersion,
      });
      setProgress(progressCopy[2] ?? null);
      const result = await apiPost<{ needsSelection: boolean }>("/api/v1/integrations/whatsapp/callback", {
        state: start.state,
        code: session.code,
        wabaId: session.wabaId,
        phoneNumberId: session.phoneNumberId,
      });
      if (result.needsSelection) {
        setError("Meta returned more than one phone number. Complete selection in WhatsApp Manager, then try again.");
      }
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "WhatsApp couldn't be connected.";
      setError(message);
    }
    setBusy(null);
    setProgress(null);
  }

  async function disconnect() {
    setBusy("disconnect");
    setError(null);
    try {
      await apiPost("/api/v1/integrations/whatsapp/disconnect");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "WhatsApp could not be disconnected.");
    }
    setBusy(null);
  }

  async function sync() {
    setBusy("sync");
    setError(null);
    try {
      await apiPost("/api/v1/integrations/whatsapp/sync");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Templates could not be synced.");
    }
    setBusy(null);
  }

  const connectionStatus = status?.integration.connectionStatus ?? "NOT_CONNECTED";
  const connected = connectionStatus === "CONNECTED";

  return (
    <div className="space-y-4">
      {!compact ? (
        <PageHeader
          title="WhatsApp"
          subtitle="Connect your clinic's WhatsApp Business account to communicate with patients, send appointment reminders, and follow up with leads."
        />
      ) : null}
      {error ? (
        <p className="rounded-xl border border-warning/30 bg-warning-soft/60 px-4 py-3 text-sm">
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void connect()}>
            Try Again
          </button>
        </p>
      ) : null}
      {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">WhatsApp Business</h2>
              <StatusBadge label={labelFor(connectionStatus)} tone={toneFor(connectionStatus)} />
            </div>
            {connected ? (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>Business: {status?.account?.displayName ?? status?.integration.displayName ?? "WhatsApp Business"}</p>
                <p>Phone: {status?.account?.displayPhoneNumber ?? "••••"}</p>
                <p>WABA: {status?.account?.businessAccountId ?? "••••"}</p>
                <p>Templates: {status?.templates.approved ?? 0} approved</p>
                <p>Last sync: {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Not synced yet"}</p>
              </div>
            ) : (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Connect your clinic's WhatsApp Business account to communicate with patients, send appointment
                reminders, follow up with leads, and support Care Loop workflows.
              </p>
            )}
            {status?.attention ? <p className="mt-2 text-sm text-warning-foreground">{status.attention}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/integrations/whatsapp/templates">Manage</Link>
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void sync()}>
                  {busy === "sync" ? "Syncing…" : "Sync"}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void disconnect()}>
                  {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" disabled={busy !== null} onClick={() => void connect()}>
                {busy === "connect" ? "Connecting…" : "Connect WhatsApp"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
