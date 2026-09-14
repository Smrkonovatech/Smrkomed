"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";

import { AbdmEnvironmentBanner } from "@/components/digital-health/digital-health-nav";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Connection = {
  connected: boolean;
  status: string;
  environment: string;
  message: string;
  facilityId: string | null;
  facilityConfigured: boolean;
  lastCheckedAt: string;
  demoLinkAllowed: boolean;
  baseUrl?: string | null;
  capabilities?: Record<string, boolean>;
  authMethods?: Array<{ id: string; label: string }>;
};

export default function AbdmSettingsPage() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const dash = await apiGet<{ connection: Connection }>("/api/v1/digital-health/dashboard");
      setConnection(dash.connection);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load ABDM settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function testConnection() {
    setTesting(true);
    try {
      const result = await apiPost<Connection>("/api/v1/digital-health/abdm/test-connection", {});
      toast.message(result.message);
      setConnection(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <LoadingRows rows={4} />;
  if (error || !connection) {
    return <EmptyState title="Unable to load settings" description={error ?? ""} icon={Settings} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="ABDM Integration Settings"
        subtitle="Facility, environment, and connection status. Credentials stay on the server and are never shown here."
        actions={
          <Button disabled={testing} onClick={() => void testConnection()}>
            Test Connection
          </Button>
        }
      />

      <AbdmEnvironmentBanner environment={connection.environment} connected={connection.connected} />

      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">ABDM Connection</h2>
          <StatusBadge
            label={connection.connected ? "Connected" : "Not connected"}
            tone={connection.connected ? "success" : "warning"}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{connection.message}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Item label="Environment" value={connection.environment} />
          <Item label="Facility ID" value={connection.facilityId ?? "Not configured"} />
          <Item label="Facility configured" value={connection.facilityConfigured ? "Yes" : "No"} />
          <Item label="Last health check" value={new Date(connection.lastCheckedAt).toLocaleString("en-IN")} />
          <Item label="Sandbox demo intents" value={connection.demoLinkAllowed ? "Allowed" : "Disabled"} />
          <Item label="Base URL" value={connection.baseUrl ? "Configured (hidden)" : "Not set"} />
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Setup wizard checklist</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            ["Facility configuration", connection.facilityConfigured],
            ["Environment selected", connection.environment !== "unconfigured"],
            ["API credentials (server)", connection.connected],
            ["Authentication methods", Boolean(connection.authMethods?.length || connection.demoLinkAllowed)],
            ["Demo / sandbox labelled", connection.environment !== "production"],
          ].map(([label, ok]) => (
            <li key={String(label)} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <span>{label}</span>
              <StatusBadge label={ok ? "Ready" : "Pending"} tone={ok ? "success" : "muted"} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Configure ABDM_ENABLED, ABDM_ENV, ABDM_BASE_URL, ABDM_CLIENT_ID, ABDM_CLIENT_SECRET, and ABDM_FACILITY_ID
          on the API server. Never paste secrets into the browser.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Capabilities</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(connection.capabilities ?? {}).map(([key, enabled]) => (
            <StatusBadge
              key={key}
              label={`${key}: ${enabled ? "on" : "off"}`}
              tone={enabled ? "success" : "muted"}
              dot={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
