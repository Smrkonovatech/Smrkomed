import type { Integration, IntegrationProvider, IntegrationStatus } from "@smrkomed/database";

import { maskAccount } from "./mask";
import { toConnectionStatus } from "./status";
import type { PublicIntegration } from "./types";

const FORBIDDEN_RESPONSE_KEYS = [
  "accessToken",
  "refreshToken",
  "clientSecret",
  "appSecret",
  "systemUserToken",
  "encryptedCredentials",
  "encryptedPayload",
  "config",
] as const;

export type IntegrationRow = Pick<
  Integration,
  | "id"
  | "organizationId"
  | "clinicId"
  | "provider"
  | "status"
  | "displayName"
  | "externalAccountId"
  | "lastError"
  | "lastErrorCode"
  | "lastSyncAt"
  | "createdAt"
  | "updatedAt"
>;

export const SAFE_INTEGRATION_SELECT = {
  id: true,
  organizationId: true,
  clinicId: true,
  provider: true,
  status: true,
  displayName: true,
  externalAccountId: true,
  lastError: true,
  lastErrorCode: true,
  lastSyncAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function serializeIntegration(row: IntegrationRow): PublicIntegration {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clinicId: row.clinicId,
    provider: row.provider,
    status: row.status,
    connectionStatus: toConnectionStatus(row.status),
    displayName: row.displayName,
    externalAccount: maskAccount(row.externalAccountId),
    lastSyncAt: row.lastSyncAt,
    lastError:
      row.lastError || row.lastErrorCode
        ? { code: row.lastErrorCode ?? "ERROR", message: row.lastError ?? "Integration error." }
        : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function virtualNotConnected(input: {
  organizationId: string;
  clinicId: string;
  provider: IntegrationProvider;
}): PublicIntegration {
  return {
    id: null,
    organizationId: input.organizationId,
    clinicId: input.clinicId,
    provider: input.provider,
    status: "DISABLED" satisfies IntegrationStatus,
    connectionStatus: "NOT_CONNECTED",
    displayName: null,
    externalAccount: null,
    lastSyncAt: null,
    lastError: null,
    createdAt: null,
    updatedAt: null,
  };
}

export function assertNoSecrets(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    for (const key of Object.keys(current)) {
      if ((FORBIDDEN_RESPONSE_KEYS as readonly string[]).includes(key)) {
        throw new Error(`Refusing to serialize secret field: ${key}`);
      }
      stack.push((current as Record<string, unknown>)[key]);
    }
  }
}
