"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { IntegrationProvider } from "@smrkomed/database";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  INTEGRATIONS,
  integrationStatusLabel,
  integrationTone,
  type IntegrationCategory,
} from "@/lib/saas/catalog";
import type { PublicIntegration } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

const categories: IntegrationCategory[] = [
  "Communication",
  "Marketing",
  "Scheduling",
  "Payments",
  "Healthcare",
];

export default function IntegrationsPage() {
  const [rows, setRows] = useState<PublicIntegration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/integrations");
        const body = (await response.json()) as {
          success: boolean;
          data?: { integrations?: PublicIntegration[]; demo?: boolean };
        };
        if (cancelled) return;
        if (body.success && body.data?.integrations && body.data.integrations.length > 0) {
          setRows(body.data.integrations);
          return;
        }
      } catch {
        if (!cancelled) {
          setNotice("Showing local connection state until the clinic database is reachable.");
        }
      }
      if (cancelled) return;
      setRows(
        INTEGRATIONS.map((item) => ({
          provider: item.provider,
          status: "DISABLED",
          displayName: null,
          externalAccountId: null,
          lastError: null,
        })),
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const byProvider = useMemo(() => new Map(rows.map((row) => [row.provider, row])), [rows]);

  async function connect(provider: IntegrationProvider, comingSoon?: boolean) {
    if (comingSoon) {
      setNotice("Integration coming soon. Provider connect is not implemented yet.");
      return;
    }
    setBusy(provider);
    setNotice(null);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action: "connect" }),
      });
      const body = (await response.json()) as { success: boolean; error?: { message: string } };
      setNotice(body.error?.message ?? "Integration coming soon.");
    } catch {
      setNotice("Integration coming soon. Provider connect is not implemented yet.");
    }
    setBusy(null);
  }

  async function disconnect(provider: IntegrationProvider) {
    setBusy(provider);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action: "disconnect" }),
      });
      const body = (await response.json()) as { error?: { message: string } };
      setNotice(body.error?.message ?? "Provider disconnect is not implemented yet.");
    } catch {
      setNotice("Provider disconnect is not implemented yet.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Connect the clinic’s own WhatsApp, Google and Meta accounts. Credentials stay on the server."
      />

      {notice && (
        <p className="rounded-xl border border-warning/30 bg-warning-soft/60 px-4 py-3 text-sm text-warning-foreground">
          {notice}
        </p>
      )}

      {categories.map((category) => {
        const items = INTEGRATIONS.filter((item) => item.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category} className="rounded-xl border bg-card p-5">
            <h2 className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              {category}
            </h2>
            <div className="mt-3 divide-y">
              {items.map((item) => {
                const state = byProvider.get(item.provider);
                const status = state?.status ?? "DISABLED";
                const connected = status === "ACTIVE";
                const isWhatsApp = item.provider === "WHATSAPP_CLOUD";
                return (
                  <div
                    key={item.provider}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <StatusBadge
                          label={integrationStatusLabel(status)}
                          tone={integrationTone(status)}
                        />
                      </div>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                      {connected && state?.displayName && (
                        <p className="mt-1 text-xs text-muted-foreground">{state.displayName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isWhatsApp ? (
                        <Button asChild size="sm" variant={connected ? "outline" : "default"}>
                          <Link href="/integrations/whatsapp">{connected ? "Manage" : item.connectLabel}</Link>
                        </Button>
                      ) : connected ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy === item.provider}
                          onClick={() => void disconnect(item.provider)}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className={cn(item.comingSoon && "opacity-90")}
                          disabled={busy === item.provider}
                          onClick={() => void connect(item.provider, item.comingSoon)}
                        >
                          {busy === item.provider ? "Connecting…" : item.comingSoon ? "Coming soon" : item.connectLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
