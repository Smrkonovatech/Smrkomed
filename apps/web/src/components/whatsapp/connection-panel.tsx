"use client";

import Link from "next/link";
import { CheckCircle2, MessageCircle, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { runWhatsAppEmbeddedSignup } from "@/lib/whatsapp/embedded-signup";
import { cn } from "@/lib/utils";

type ConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "ACTION_REQUIRED"
  | "ERROR"
  | "DISCONNECTED";

type PhoneOption = { id: string; displayPhoneNumber: string };

type WhatsAppStatus = {
  integration: {
    connectionStatus: ConnectionStatus;
    displayName: string | null;
    lastError: { message: string } | null;
  };
  account: {
    displayName: string | null;
    displayPhoneNumber: string | null;
    businessAccountId: string | null;
    qualityRating: string | null;
    verifiedName: string | null;
    demo?: boolean;
  } | null;
  accounts?: Array<{
    displayName: string | null;
    displayPhoneNumber: string | null;
    isActive: boolean;
    demo?: boolean;
  }>;
  templates: { approved: number; pending: number; rejected: number; total: number };
  lastSyncAt: string | null;
  attention: string | null;
  webhookStatus?: string;
  platform?: {
    metaConfigured: boolean;
    demoModeAvailable: boolean;
    demoConnection: boolean;
  };
};

type TestResult = {
  healthy: boolean;
  demo: boolean;
  summary: string;
  checkedAt: string;
  checks: Array<{ id: string; label: string; ok: boolean; detail: string }>;
};

const progressCopy = [
  "Connecting your WhatsApp Business account...",
  "Meta onboarding in progress...",
  "Configuring webhook...",
  "Verifying number...",
  "Checking messaging...",
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
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [phoneChoices, setPhoneChoices] = useState<PhoneOption[] | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const load = useCallback(async () => {
    const data = await apiGet<WhatsAppStatus>("/api/v1/integrations/whatsapp");
    setStatus(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiGet<WhatsAppStatus>("/api/v1/integrations/whatsapp");
        if (!cancelled) setStatus(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load WhatsApp status.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    setError(null);
    setTestResult(null);
    setPhoneChoices(null);
    setBusy("connect");
    setProgress(progressCopy[0] ?? null);
    try {
      const start = await apiPost<{
        demo?: boolean;
        state: string;
        appId?: string;
        configId?: string;
        graphVersion?: string;
        message?: string;
      }>("/api/v1/integrations/whatsapp/connect");

      setOauthState(start.state);

      if (start.demo) {
        setProgress("DEMO / SIMULATED — finishing local connection...");
        await apiPost("/api/v1/integrations/whatsapp/demo-callback", {
          state: start.state,
          phoneLabel: "+91 ••••• ••000",
        });
        toast.success("Demo WhatsApp connected (simulated).");
        await load();
        return;
      }

      if (!start.appId || !start.configId || !start.graphVersion) {
        throw new Error("WhatsApp Embedded Signup is not configured on this server.");
      }

      setProgress(progressCopy[1] ?? null);
      const session = await runWhatsAppEmbeddedSignup({
        appId: start.appId,
        configId: start.configId,
        graphVersion: start.graphVersion,
      });
      setProgress(progressCopy[2] ?? null);
      const result = await apiPost<{
        needsSelection: boolean;
        phones?: PhoneOption[];
        state?: string;
        wabaId?: string;
      }>("/api/v1/integrations/whatsapp/callback", {
        state: start.state,
        code: session.code,
        ...(session.wabaId ? { wabaId: session.wabaId } : {}),
        ...(session.phoneNumberId ? { phoneNumberId: session.phoneNumberId } : {}),
      });

      if (result.needsSelection && result.phones?.length) {
        setPhoneChoices(result.phones);
        setOauthState(start.state);
        setProgress(null);
        setBusy(null);
        return;
      }

      setProgress(progressCopy[4] ?? null);
      toast.success("WhatsApp connected successfully.");
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? humanizeConnectError(err.message)
          : err instanceof Error
            ? humanizeConnectError(err.message)
            : "WhatsApp connection could not be completed.";
      setError(message);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  async function selectPhone(phoneNumberId: string) {
    if (!oauthState) return;
    setBusy("select");
    setError(null);
    try {
      await apiPost("/api/v1/integrations/whatsapp/callback", {
        state: oauthState,
        phoneNumberId,
      });
      setPhoneChoices(null);
      toast.success("WhatsApp connected successfully.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? humanizeConnectError(err.message) : "Phone selection failed.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    setError(null);
    try {
      await apiPost("/api/v1/integrations/whatsapp/disconnect");
      setDisconnectOpen(false);
      toast.success("WhatsApp disconnected from SmrkoMed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "WhatsApp could not be disconnected.");
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setError(null);
    try {
      await apiPost("/api/v1/integrations/whatsapp/sync");
      toast.success("Templates synced.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Templates could not be synced.");
    } finally {
      setBusy(null);
    }
  }

  async function testConnection() {
    setBusy("test");
    setError(null);
    try {
      const result = await apiPost<TestResult>("/api/v1/integrations/whatsapp/test", {});
      setTestResult(result);
      toast.message(result.summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connection test failed.");
    } finally {
      setBusy(null);
    }
  }

  const connectionStatus = status?.integration.connectionStatus ?? "NOT_CONNECTED";
  const connected = connectionStatus === "CONNECTED";
  const demo =
    Boolean(status?.platform?.demoConnection) ||
    Boolean(status?.account?.demo) ||
    (status?.account?.verifiedName ?? "").includes("DEMO");

  return (
    <div className="space-y-4">
      {!compact ? (
        <PageHeader
          title="WhatsApp Business"
          subtitle="Connect your clinic's WhatsApp Business number to communicate with patients, automate care workflows, and manage conversations from one place."
        />
      ) : null}

      {(status?.platform?.demoModeAvailable || demo) && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold tracking-wide text-sky-900 uppercase">
          DEMO / SIMULATED — Not a live Meta production connection
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">WhatsApp connection could not be completed.</p>
          <p className="mt-1 text-xs">{error}</p>
          <p className="mt-2 text-xs text-amber-900/80">
            Possible reasons: Meta authorization cancelled, phone verification failed, incomplete business
            setup, missing permission, or an existing configuration conflict.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void connect()}>
              Try Again
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/help">Contact Support</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {progress ? (
        <p className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{progress}</p>
      ) : null}

      {phoneChoices ? (
        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold">Select WhatsApp phone number</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Meta returned more than one number on this WhatsApp Business Account. Choose which number to use
            in SmrkoMed.
          </p>
          <ul className="mt-4 space-y-2">
            {phoneChoices.map((phone) => (
              <li key={phone.id}>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void selectPhone(phone.id)}
                  className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:border-primary hover:bg-primary-soft/30"
                >
                  <span className="font-medium tabular-nums">{phone.displayPhoneNumber}</span>
                  <span className="text-xs text-primary">Use this number</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!connected ? (
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2">
                <span className="grid size-10 place-items-center rounded-xl bg-[#25D366]/15 text-[#128C7E]">
                  <MessageCircle className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">Connect your clinic&apos;s WhatsApp</h2>
                  <StatusBadge label={labelFor(connectionStatus)} tone={toneFor(connectionStatus)} />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Connect your WhatsApp Business number to SmrkoMed to communicate with patients, automate care
                workflows and manage conversations from one place.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Shield className="mt-0.5 size-4 shrink-0 text-primary" /> Secure Meta connection
                </li>
                <li className="flex gap-2">
                  <Shield className="mt-0.5 size-4 shrink-0 text-primary" /> No API credentials required
                </li>
                <li className="flex gap-2">
                  <Shield className="mt-0.5 size-4 shrink-0 text-primary" /> Your clinic controls its WhatsApp
                  Business account
                </li>
                <li className="flex gap-2">
                  <Shield className="mt-0.5 size-4 shrink-0 text-primary" /> Patient conversations stay with
                  your clinic
                </li>
              </ul>
              <Button
                className="mt-5"
                disabled={busy !== null}
                onClick={() => void connect()}
              >
                {busy === "connect"
                  ? "Connecting…"
                  : status?.platform?.demoModeAvailable
                    ? "Connect WhatsApp (Demo)"
                    : "Connect WhatsApp"}
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 lg:w-[320px]">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                How it works
              </p>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>1. Connect your Meta Business account</li>
                <li>2. Select or create your WhatsApp Business account</li>
                <li>3. Select or add your business phone number</li>
                <li>4. Complete Meta verification</li>
                <li>5. SmrkoMed automatically connects your WhatsApp</li>
              </ol>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Onboarding opens in Meta&apos;s official window. SmrkoMed never asks for access tokens, WABA
                IDs, or App Secrets.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">WhatsApp Business</h2>
                <StatusBadge label="Connected" tone="success" />
                {demo && <StatusBadge label="DEMO" tone="info" />}
              </div>
              <p className="mt-2 text-sm font-medium">
                {status?.account?.displayName ?? status?.integration.displayName ?? "WhatsApp Business"}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                Phone: {status?.account?.displayPhoneNumber ?? "••••"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last checked:{" "}
                {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("en-IN") : "Just now"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/whatsapp/inbox">Open WhatsApp Inbox</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/integrations/whatsapp/templates">Manage</Link>
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void testConnection()}>
                {busy === "test" ? "Testing…" : "Test WhatsApp"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void sync()}>
                {busy === "sync" ? "Syncing…" : "Sync templates"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => setDisconnectOpen(true)}
              >
                Disconnect
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "WhatsApp Business Account", value: "Connected", ok: true },
              { label: "Phone Number", value: "Connected", ok: true },
              { label: "Messaging", value: "Active", ok: true },
              {
                label: "Webhooks",
                value:
                  status?.webhookStatus === "RECEIVING"
                    ? "Connected"
                    : status?.webhookStatus === "WAITING"
                      ? "Waiting for events"
                      : "Inactive",
                ok: status?.webhookStatus !== "INACTIVE",
              },
              {
                label: "Templates",
                value: `${status?.templates.approved ?? 0} approved`,
                ok: (status?.templates.approved ?? 0) > 0 || demo,
              },
              {
                label: "Quality",
                value: status?.account?.qualityRating ?? "—",
                ok: true,
              },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border px-3 py-3 text-sm">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium">
                  {card.ok ? <CheckCircle2 className="size-3.5 text-success" /> : null}
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {(status?.accounts?.length ?? 0) > 1 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">WhatsApp Numbers</h3>
              <ul className="mt-2 space-y-2">
                {status?.accounts?.map((row, index) => (
                  <li
                    key={`${row.displayPhoneNumber}-${index}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="tabular-nums">{row.displayPhoneNumber}</span>
                    <StatusBadge label={row.isActive ? "Active" : "Inactive"} tone={row.isActive ? "success" : "muted"} />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Architecture supports multiple clinic numbers. Use Connect WhatsApp again after Meta
                onboarding to add another number when available.
              </p>
            </div>
          )}

          {status?.attention ? (
            <p className="mt-4 text-sm text-amber-800">{status.attention}</p>
          ) : null}
        </section>
      )}

      {testResult ? (
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{testResult.summary}</h3>
            <StatusBadge
              label={testResult.healthy ? "Healthy" : "Action required"}
              tone={testResult.healthy ? "success" : "warning"}
            />
          </div>
          <ul className="mt-3 space-y-2">
            {testResult.checks.map((check) => (
              <li
                key={check.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
                  check.ok ? "border-border" : "border-amber-200 bg-amber-50/50",
                )}
              >
                <div>
                  <p className="font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
                <StatusBadge label={check.ok ? "OK" : "Issue"} tone={check.ok ? "success" : "warning"} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/whatsapp/inbox", label: "Messages" },
          { href: "/integrations/whatsapp/templates", label: "Templates" },
          { href: "/whatsapp/automations", label: "Automations" },
          { href: "/whatsapp/analytics", label: "Analytics" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border bg-card px-4 py-3 text-sm font-medium hover:border-primary/40 hover:bg-primary-soft/20"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect WhatsApp from SmrkoMed?</DialogTitle>
            <DialogDescription>
              Existing SmrkoMed conversations and patient records will remain stored according to your
              clinic&apos;s data policies. New WhatsApp messages will no longer be received through this
              connection. Your Meta WhatsApp Business account and phone number remain yours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy !== null} onClick={() => void disconnect()}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function humanizeConnectError(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("cancelled") || lower.includes("canceled")) {
    return "Meta authorization was cancelled. You can try again when ready.";
  }
  if (lower.includes("not configured") || lower.includes("501")) {
    return "WhatsApp Embedded Signup is not configured on this server yet. Ask your SmrkoMed administrator to complete Meta App setup, or enable demo mode for local testing.";
  }
  if (lower.includes("conflict") || lower.includes("already connected")) {
    return "This WhatsApp number appears to be connected to another clinic. Contact support if this is unexpected.";
  }
  if (lower.includes("phone")) {
    return "Phone verification or phone selection could not be completed. Try again or finish verification in Meta.";
  }
  return raw;
}
