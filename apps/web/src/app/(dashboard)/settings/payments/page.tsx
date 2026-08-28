"use client";

import { CreditCard, Link2, ShieldCheck, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  formatDateTime,
  gatewayStatusTone,
  normalizeGatewayProviders,
  type GatewayProviderCard,
  type GatewaysResponse,
} from "@/components/payments/format";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { PERMISSIONS, roleHasPermission } from "@/lib/permissions/rbac";

type CredentialForm = {
  keyId: string;
  keySecret: string;
  appId: string;
  secretKey: string;
  merchantKey: string;
  merchantSalt: string;
  webhookSecret: string;
  displayName: string;
  mode: "TEST" | "LIVE";
  isDefault: boolean;
};

const emptyCredentials = (): CredentialForm => ({
  keyId: "",
  keySecret: "",
  appId: "",
  secretKey: "",
  merchantKey: "",
  merchantSalt: "",
  webhookSecret: "",
  displayName: "",
  mode: "TEST",
  isDefault: false,
});

function capabilityChips(capabilities: GatewayProviderCard["capabilities"]) {
  const chips: string[] = [];
  if (capabilities.upi) chips.push("UPI");
  if (capabilities.cards) chips.push("Cards");
  if (capabilities.netBanking) chips.push("Net Banking");
  if (capabilities.paymentLinks) chips.push("Payment Links");
  if (capabilities.refunds) chips.push("Refunds");
  return chips;
}

function isConnected(card: GatewayProviderCard) {
  return Boolean(
    card.connection &&
      card.connection.hasCredentials &&
      card.connection.status === "CONNECTED",
  );
}

export default function PaymentGatewaysSettingsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManage = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_GATEWAY_MANAGE));
  const canView = Boolean(role && roleHasPermission(role, PERMISSIONS.PAYMENTS_VIEW));

  const [providers, setProviders] = useState<GatewayProviderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<GatewayProviderCard | null>(null);
  const [form, setForm] = useState<CredentialForm>(emptyCredentials());
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<GatewaysResponse>("/api/v1/payments/gateways");
      setProviders(normalizeGatewayProviders(data));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load payment gateways.");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    void load();
  }, [canView]);

  function openConnect(card: GatewayProviderCard) {
    setActiveProvider(card);
    setForm({
      ...emptyCredentials(),
      displayName: card.connection?.displayName ?? card.name,
      mode: (card.connection?.mode === "LIVE" ? "LIVE" : "TEST") as "TEST" | "LIVE",
      isDefault: card.connection?.isDefault ?? providers.every((p) => !p.connection?.isDefault),
    });
    setDialogOpen(true);
  }

  async function connectGateway(event: FormEvent) {
    event.preventDefault();
    if (!activeProvider || !canManage) return;

    const provider = activeProvider.provider;
    const credentials: Record<string, string> = {};
    if (provider === "RAZORPAY") {
      if (!form.keyId.trim() || !form.keySecret.trim()) {
        toast.error("Razorpay requires Key ID and Key Secret.");
        return;
      }
      credentials["keyId"] = form.keyId.trim();
      credentials["keySecret"] = form.keySecret.trim();
    } else if (provider === "CASHFREE") {
      if (!form.appId.trim() || !form.secretKey.trim()) {
        toast.error("Cashfree requires App ID and Secret Key.");
        return;
      }
      credentials["appId"] = form.appId.trim();
      credentials["secretKey"] = form.secretKey.trim();
    } else if (provider === "PAYU") {
      if (!form.merchantKey.trim() || !form.merchantSalt.trim()) {
        toast.error("PayU requires Merchant Key and Merchant Salt.");
        return;
      }
      credentials["merchantKey"] = form.merchantKey.trim();
      credentials["merchantSalt"] = form.merchantSalt.trim();
    }
    if (form.webhookSecret.trim()) credentials["webhookSecret"] = form.webhookSecret.trim();

    setSaving(true);
    try {
      await apiPost(`/api/v1/payments/gateways/${provider}/connect`, {
        mode: form.mode,
        displayName: form.displayName.trim() || activeProvider.name,
        isDefault: form.isDefault,
        credentials,
      });
      toast.success(`${activeProvider.name} connected and activated.`);
      setDialogOpen(false);
      setForm(emptyCredentials());
      setActiveProvider(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to connect gateway.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(key: string, action: () => Promise<void>) {
    if (!canManage) return;
    setActionBusy(key);
    try {
      await action();
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActionBusy(null);
    }
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          title="Payment Gateways"
          subtitle="Connect your preferred payment provider to securely collect patient payments."
        />
        <EmptyState
          title="You do not have access to payment gateways."
          description="Ask a clinic admin for payments:view permission."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        title="Payment Gateways"
        subtitle="Connect your preferred payment provider to securely collect patient payments."
      />

      {loading ? (
        <LoadingRows rows={3} />
      ) : error ? (
        <EmptyState
          title="Unable to load gateways."
          description={error}
          action={<Button onClick={() => void load()}>Retry</Button>}
        />
      ) : !providers.length ? (
        <EmptyState
          title="No payment providers available."
          description="Gateway catalog is empty. Confirm the payments API is running."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {providers.map((card) => {
            const connected = isConnected(card);
            const conn = card.connection;
            const chips = capabilityChips(card.capabilities);
            const busyPrefix = card.provider;
            return (
              <section
                key={card.provider}
                className="flex flex-col rounded-xl border bg-background p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      {card.provider === "RAZORPAY" ? (
                        <Wallet className="size-5" />
                      ) : card.provider === "CASHFREE" ? (
                        <CreditCard className="size-5" />
                      ) : (
                        <Link2 className="size-5" />
                      )}
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold">{card.name}</h2>
                      <p className="text-xs text-muted-foreground">{card.provider}</p>
                    </div>
                  </div>
                  <StatusBadge
                    label={connected ? "Connected" : "Not Connected"}
                    tone={connected ? "success" : "muted"}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                {conn && connected ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-dashed bg-muted/20 p-3 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={conn.mode} tone={conn.mode === "LIVE" ? "danger" : "info"} />
                      {conn.isDefault && <StatusBadge label="Default" tone="primary" />}
                      <StatusBadge
                        label={conn.isActive ? "Active" : "Inactive"}
                        tone={conn.isActive ? "success" : "warning"}
                      />
                      <StatusBadge label={conn.status} tone={gatewayStatusTone(conn.status)} />
                    </div>
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <ShieldCheck className="size-3.5 shrink-0 text-success" />
                      Credentials stored securely (encrypted)
                    </p>
                    {conn.publicKeyLast4 && (
                      <p className="text-muted-foreground">Public key ····{conn.publicKeyLast4}</p>
                    )}
                    {conn.lastTestedAt && (
                      <p className="text-muted-foreground">
                        Last tested {formatDateTime(conn.lastTestedAt)}
                      </p>
                    )}
                    {conn.lastError && <p className="text-danger">{conn.lastError}</p>}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Connect credentials to collect UPI, card, and link payments. Secrets are never
                    shown again after save.
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {!connected ? (
                    <Button
                      size="sm"
                      className="rounded-lg"
                      disabled={!canManage}
                      onClick={() => openConnect(card)}
                    >
                      Connect
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={!canManage}
                        onClick={() => openConnect(card)}
                      >
                        Manage
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={!canManage || actionBusy === `${busyPrefix}-test`}
                        onClick={() =>
                          void runAction(`${busyPrefix}-test`, async () => {
                            setTesting(true);
                            try {
                              const result = await apiPost<{ ok: boolean; message: string }>(
                                `/api/v1/payments/gateways/${card.provider}/test`,
                              );
                              toast.success(result.message || "Connection test succeeded.");
                            } finally {
                              setTesting(false);
                            }
                          })
                        }
                      >
                        {testing && actionBusy === `${busyPrefix}-test` ? "Testing…" : "Test"}
                      </Button>
                      {!conn?.isDefault && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          disabled={!canManage || actionBusy === `${busyPrefix}-default`}
                          onClick={() =>
                            void runAction(`${busyPrefix}-default`, async () => {
                              await apiPost(
                                `/api/v1/payments/gateways/${card.provider}/set-default`,
                              );
                              toast.success(`${card.name} set as default.`);
                            })
                          }
                        >
                          Set Default
                        </Button>
                      )}
                      {!conn?.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          disabled={!canManage || actionBusy === `${busyPrefix}-activate`}
                          onClick={() =>
                            void runAction(`${busyPrefix}-activate`, async () => {
                              await apiPatch(`/api/v1/payments/gateways/${card.provider}`, {
                                isActive: true,
                              });
                              toast.success(`${card.name} activated.`);
                            })
                          }
                        >
                          Activate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-lg text-danger"
                        disabled={!canManage || actionBusy === `${busyPrefix}-disconnect`}
                        onClick={() =>
                          void runAction(`${busyPrefix}-disconnect`, async () => {
                            await apiPost(
                              `/api/v1/payments/gateways/${card.provider}/disconnect`,
                            );
                            toast.success(`${card.name} disconnected.`);
                          })
                        }
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
                {!canManage && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    View only — gateway changes require payments:gateway:manage.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setActiveProvider(null);
            setForm(emptyCredentials());
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={connectGateway}>
            <DialogHeader>
              <DialogTitle>
                {activeProvider && isConnected(activeProvider) ? "Manage" : "Connect"}{" "}
                {activeProvider?.name}
              </DialogTitle>
              <DialogDescription>
                Enter provider credentials. Secrets are encrypted server-side and never stored in
                the browser.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <Label>Display name</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder={activeProvider?.name}
                />
              </div>
              <div className="space-y-1">
                <Label>Mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(value) =>
                    setForm({ ...form, mode: value as "TEST" | "LIVE" })
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEST">TEST</SelectItem>
                    <SelectItem value="LIVE">LIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeProvider?.provider === "RAZORPAY" && (
                <>
                  <div className="space-y-1">
                    <Label>Key ID</Label>
                    <Input
                      autoComplete="off"
                      value={form.keyId}
                      onChange={(e) => setForm({ ...form, keyId: e.target.value })}
                      placeholder="rzp_test_…"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Key Secret</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.keySecret}
                      onChange={(e) => setForm({ ...form, keySecret: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Webhook Secret (optional)</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.webhookSecret}
                      onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                    />
                  </div>
                </>
              )}

              {activeProvider?.provider === "CASHFREE" && (
                <>
                  <div className="space-y-1">
                    <Label>App ID</Label>
                    <Input
                      autoComplete="off"
                      value={form.appId}
                      onChange={(e) => setForm({ ...form, appId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.secretKey}
                      onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Webhook Secret</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.webhookSecret}
                      onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                    />
                  </div>
                </>
              )}

              {activeProvider?.provider === "PAYU" && (
                <>
                  <div className="space-y-1">
                    <Label>Merchant Key</Label>
                    <Input
                      autoComplete="off"
                      value={form.merchantKey}
                      onChange={(e) => setForm({ ...form, merchantKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Merchant Salt</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.merchantSalt}
                      onChange={(e) => setForm({ ...form, merchantSalt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Webhook Secret</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.webhookSecret}
                      onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                    />
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="size-4 rounded border"
                />
                Set as default gateway
              </label>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canManage}>
                {saving ? "Saving…" : "Test Connection then Save & Activate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
