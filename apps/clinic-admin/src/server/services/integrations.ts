import type { IntegrationProvider, TenantContext } from "@smrkomed/database";
import {
  connectIntegrationRecord,
  disconnectIntegrationRecord,
  getIntegrationsForClinic,
} from "@smrkomed/database";
import { getAdapter } from "@/lib/integrations/adapters";
import { encryptSecret } from "@/lib/integrations/secrets";
import type { PublicIntegration } from "@/lib/integrations/types";
import { INTEGRATIONS } from "@/lib/saas/catalog";

function toPublic(row: {
  provider: IntegrationProvider;
  status: PublicIntegration["status"] | string;
  displayName: string | null;
  externalAccountId: string | null;
  lastError: string | null;
}): PublicIntegration {
  return {
    provider: row.provider,
    status: row.status as PublicIntegration["status"],
    displayName: row.displayName,
    externalAccountId: row.externalAccountId,
    lastError: row.lastError,
  };
}

export async function listIntegrations(ctx: TenantContext): Promise<PublicIntegration[]> {
  const rows = await getIntegrationsForClinic(ctx);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  return INTEGRATIONS.filter((item) => item.provider !== "OPENAI" && item.provider !== "S3").map(
    (item) => {
      const row = byProvider.get(item.provider);
      if (!row) {
        return {
          provider: item.provider,
          status: "DISABLED",
          displayName: null,
          externalAccountId: null,
          lastError: null,
        };
      }
      return toPublic(row);
    },
  );
}

export async function connectIntegration(ctx: TenantContext, provider: IntegrationProvider) {
  const catalog = INTEGRATIONS.find((item) => item.provider === provider);
  if (!catalog || catalog.comingSoon) {
    throw new Error("This integration is not available yet.");
  }

  const adapter = getAdapter(provider);
  const connected = await adapter.connect();
  const row = await connectIntegrationRecord(ctx, provider, {
    displayName: connected.displayName,
    externalAccountId: connected.externalAccountId,
    encryptedCredentials: encryptSecret(JSON.stringify({ connectedAt: new Date().toISOString() })),
  });
  return toPublic(row);
}

export async function disconnectIntegration(ctx: TenantContext, provider: IntegrationProvider) {
  await disconnectIntegrationRecord(ctx, provider);
}
