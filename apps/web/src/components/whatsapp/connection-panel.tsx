"use client";

import Link from "next/link";
import { CheckCircle2, MessageCircle, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
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
import { PERMISSIONS, roleHasPermission, type StaffRole } from "@/lib/permissions/rbac";
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

type ConnectErrorKind = "permission" | "meta_sdk" | "cancelled" | "config" | "conflict" | "phone" | "generic";

type ConnectError = {
  kind: ConnectErrorKind;
  message: string;
  technical?: string;
};

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

function canManageWhatsApp(role: StaffRole | undefined) {
  if (!role) return false;
  return (
    roleHasPermission(role, PERMISSIONS.WHATSAPP_SETTINGS) ||
    roleHasPermission(role, PERMISSIONS.SETTINGS_MANAGE)
  );
}

export function WhatsAppConnectionPanel({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const manageAllowed = canManageWhatsApp(role);

  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<ConnectError | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
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
        if (!cancelled) {
          setStatus(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(classifyConnectError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    if (!manageAllowed) {
      setError({
        kind: "permission",
        message:
          "Only a clinic administrator can connect WhatsApp. Ask an admin to complete Meta onboarding.",
      });
      return;
    }

    setError(null);
    setShowTechnical(false);
    setTestResult(null);
    setPhoneChoices(null);
    setBusy("connect");
    setProgress("Connecting to Meta...");
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

      setProgress("Opening Meta WhatsApp onboarding...");
      const sessionResult = await runWhatsAppEmbeddedSignup({
        appId: start.appId,
        configId: start.configId,
        graphVersion: start.graphVersion,
      });

      setProgress("Configuring your WhatsApp connection...");
      const result = await apiPost<{
        needsSelection: boolean;
        phones?: PhoneOption[];
        state?: string;
        wabaId?: string;
      }>("/api/v1/integrations/whatsapp/callback", {
        state: start.state,
        code: sessionResult.code,
        ...(sessionResult.wabaId ? { wabaId: sessionResult.wabaId } : {}),
        ...(sessionResult.phoneNumberId ? { phoneNumberId: sessionResult.phoneNumberId } : {}),
      });

      if (result.needsSelection && result.phones?.length) {
        setPhoneChoices(result.phones);
        setOauthState(start.state);
        setProgress(null);
        setBusy(null);
        return;
      }

      setProgress("Verifying messaging and webhooks...");
      toast.success("WhatsApp connected successfully.");
      await load();
    } catch (err) {
      setError(classifyConnectError(err));
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
      setError(classifyConnectError(err));
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
      setError(classifyConnectError(err));
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
      setError(classifyConnectError(err));
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
      setError(classifyConnectError(err));
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
          <p className="font-semibold">
            {error.kind === "permission"
              ? "You do not have permission to manage WhatsApp"
              : error.kind === "meta_sdk"
                ? "Unable to connect to Meta"
                : "WhatsApp connection could not be completed"}
          </p>
          <p className="mt-1 text-sm">{error.message}</p>
          {error.kind !== "permission" && error.kind !== "meta_sdk" && error.kind !== "config" ? (
            <p className="mt-2 text-xs text-amber-900/80">
              This usually means Meta onboarding was cancelled, phone verification failed, business setup is
              incomplete, or the number is not eligible. SmrkoMed never asks you for API tokens.
            </p>
          ) : null}
          {manageAllowed && error.technical ? (
            <div className="mt-2">
              <button
                type="button"
                className="text-xs font-medium text-amber-900 underline"
                onClick={() => setShowTechnical((v) => !v)}
              >
                {showTechnical ? "Hide technical details" : "View technical details"}
              </button>
              {showTechnical ? (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-white/70 p-2 text-[11px] text-amber-950">
                  {error.technical}
                </pre>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {error.kind === "permission" ? null : (
              <Button size="sm" onClick={() => void connect()} disabled={!manageAllowed || busy !== null}>
                Try Again
              </Button>
            )}
            {(error.kind === "meta_sdk" || error.kind === "config") && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/help">View Setup Help</Link>
              </Button>
            )}
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
              {!manageAllowed ? (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  Connecting WhatsApp requires a clinic administrator. You can still view status and
                  conversations if WhatsApp is already connected.
                </p>
              ) : null}
              <Button
                className="mt-5"
                disabled={busy !== null || !manageAllowed}
                onClick={() => void connect()}
              >
                {busy === "connect"
                  ? "Connecting to Meta…"
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
                <h2 className="text-lg font-semibold">WhatsApp Connected</h2>
                <StatusBadge label="Connected" tone="success" />
                {demo && <StatusBadge label="DEMO" tone="info" />}
              </div>
              <p className="mt-2 text-sm font-medium">
                Business: {status?.account?.displayName ?? status?.integration.displayName ?? "WhatsApp Business"}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                Phone: {status?.account?.displayPhoneNumber ?? "••••"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last synced:{" "}
                {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("en-IN") : "Just now"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/whatsapp/inbox">Open WhatsApp Inbox</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/whatsapp/templates">Manage Templates</Link>
              </Button>
              {manageAllowed ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => void testConnection()}
                  >
                    {busy === "test" ? "Testing…" : "Test WhatsApp"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => void sync()}
                  >
                    {busy === "sync" ? "Syncing…" : "Refresh Status"}
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
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "WhatsApp Business Account", value: "Connected", ok: true },
              { label: "Phone Number", value: "Connected", ok: true },
              { label: "Status", value: "Active", ok: true },
              {
                label: "Webhook",
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
                value:
                  (status?.templates.approved ?? 0) > 0
                    ? "Connected"
                    : demo
                      ? "Demo"
                      : `${status?.templates.approved ?? 0} approved`,
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
                    <StatusBadge
                      label={row.isActive ? "Active" : "Inactive"}
                      tone={row.isActive ? "success" : "muted"}
                    />
                  </li>
                ))}
              </ul>
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
          { href: "/whatsapp/templates", label: "Templates" },
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

function classifyConnectError(err: unknown): ConnectError {
  const raw =
    err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Something went wrong while connecting WhatsApp.";
  const lower = raw.toLowerCase();
  const technical = err instanceof ApiError ? `${err.code}: ${err.message}` : raw;

  if (lower.includes("missing permission") || lower.includes("insufficient") || (err instanceof ApiError && err.status === 403)) {
    return {
      kind: "permission",
      message:
        "Only a clinic administrator can connect or manage WhatsApp. Sign in as an admin, or ask an admin to complete Meta onboarding.",
      technical,
    };
  }
  if (lower.includes("unable to connect to meta") || lower.includes("facebook sdk") || lower.includes("sdk is not available")) {
    return {
      kind: "meta_sdk",
      message: "Unable to connect to Meta right now. Please try again.",
      technical,
    };
  }
  if (lower.includes("cancelled") || lower.includes("canceled")) {
    return {
      kind: "cancelled",
      message: "WhatsApp connection was cancelled. You can try again whenever you're ready.",
      technical,
    };
  }
  if (lower.includes("not configured") || lower.includes("501")) {
    return {
      kind: "config",
      message:
        "SmrkoMed could not complete the Meta connection. Ask your SmrkoMed administrator to finish Meta App setup (App ID, Embedded Signup configuration, and webhook).",
      technical,
    };
  }
  if (lower.includes("conflict") || lower.includes("already connected")) {
    return {
      kind: "conflict",
      message: "This WhatsApp number appears to be connected to another clinic. Contact support if this is unexpected.",
      technical,
    };
  }
  if (lower.includes("phone") || lower.includes("verification")) {
    return {
      kind: "phone",
      message: "We couldn't verify this phone number. Please check the number and verification method in Meta, then try again.",
      technical,
    };
  }
  return {
    kind: "generic",
    message: "Something went wrong while connecting WhatsApp. Please try again.",
    technical,
  };
}
