import { prisma } from "@smrkomed/database";

import { SAFE_INTEGRATION_SELECT } from "../core/serializer";
import { toConnectionStatus } from "../core/status";
import type { ConnectionStatus, FrameworkProviderId } from "../core/types";

export function healthFromStoredStatus(status: Parameters<typeof toConnectionStatus>[0]): ConnectionStatus {
  return toConnectionStatus(status);
}

export async function summarizeIntegrationHealth(filters?: {
  organizationId?: string;
  clinicId?: string;
  provider?: FrameworkProviderId;
}) {
  const rows = await prisma.integration.findMany({
    where: {
      ...(filters?.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters?.clinicId ? { clinicId: filters.clinicId } : {}),
      ...(filters?.provider ? { provider: filters.provider } : {}),
    },
    select: SAFE_INTEGRATION_SELECT,
  });

  const counts: Record<ConnectionStatus, number> = {
    NOT_CONNECTED: 0,
    CONNECTING: 0,
    CONNECTED: 0,
    ACTION_REQUIRED: 0,
    ERROR: 0,
    DISCONNECTED: 0,
  };
  for (const row of rows) {
    counts[toConnectionStatus(row.status)] += 1;
  }

  return {
    totals: counts,
    connected: counts.CONNECTED,
    actionRequired: counts.ACTION_REQUIRED,
    error: counts.ERROR,
    disconnected: counts.DISCONNECTED,
    notConnected: counts.NOT_CONNECTED,
    items: rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      organizationId: row.organizationId,
      clinicId: row.clinicId,
      connectionStatus: toConnectionStatus(row.status),
      lastSyncAt: row.lastSyncAt,
      lastError: row.lastError,
      lastErrorCode: row.lastErrorCode,
    })),
  };
}

export const integrationHealthService = {
  healthFromStoredStatus,
  summarize: summarizeIntegrationHealth,
};
