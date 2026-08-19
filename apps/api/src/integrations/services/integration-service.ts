import { prisma, writeAuditLog, type IntegrationProvider, type TenantContext } from "@smrkomed/database";
import { assertClinicAccess } from "@smrkomed/database";

import { IntegrationError } from "../core/errors";
import { getProvider } from "../core/registry";
import { assertNoSecrets, SAFE_INTEGRATION_SELECT, serializeIntegration, virtualNotConnected } from "../core/serializer";
import { assertTransition, toIntegrationStatus } from "../core/status";
import type { ConnectionStatus, FrameworkProviderId, PublicIntegration } from "../core/types";
import { credentialService } from "../credentials/service";

async function loadRow(clinicId: string, provider: IntegrationProvider) {
  return prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId, provider } },
    select: SAFE_INTEGRATION_SELECT,
  });
}

export async function validateOwnership(ctx: TenantContext, clinicId: string) {
  await assertClinicAccess(ctx, clinicId);
  if (clinicId !== ctx.clinicId && ctx.role !== "ORGANIZATION_ADMIN" && ctx.role !== "PLATFORM_ADMIN") {
    throw new IntegrationError("AUTHORIZATION_FAILED", "You cannot access another clinic.", 403);
  }
}

export async function getConnection(
  ctx: TenantContext,
  provider: FrameworkProviderId,
  clinicId = ctx.clinicId,
): Promise<PublicIntegration> {
  await validateOwnership(ctx, clinicId);
  const row = await loadRow(clinicId, provider);
  if (!row || row.organizationId !== ctx.organizationId) {
    return virtualNotConnected({ organizationId: ctx.organizationId, clinicId, provider });
  }
  const publicRow = serializeIntegration(row);
  assertNoSecrets(publicRow);
  return publicRow;
}

export async function listConnections(ctx: TenantContext, clinicId = ctx.clinicId) {
  await validateOwnership(ctx, clinicId);
  const rows = await prisma.integration.findMany({
    where: { clinicId, organizationId: ctx.organizationId },
    select: SAFE_INTEGRATION_SELECT,
  });
  const serialized = rows.map(serializeIntegration);
  serialized.forEach(assertNoSecrets);
  return serialized;
}

export async function getStatus(ctx: TenantContext, provider: FrameworkProviderId, clinicId = ctx.clinicId) {
  const connection = await getConnection(ctx, provider, clinicId);
  return {
    provider,
    connectionStatus: connection.connectionStatus,
    lastSyncAt: connection.lastSyncAt,
    lastError: connection.lastError,
  };
}

async function transition(
  ctx: TenantContext,
  provider: FrameworkProviderId,
  to: ConnectionStatus,
  extra: {
    lastError?: string | null;
    lastErrorCode?: string | null;
    encryptedCredentials?: string | null;
    externalAccountId?: string | null;
    displayName?: string | null;
    lastSyncAt?: Date | null;
  },
) {
  const current = await getConnection(ctx, provider);
  assertTransition(current.connectionStatus, to);
  const status = toIntegrationStatus(to);
  const createData = {
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    provider,
    status,
    displayName: extra.displayName ?? null,
    externalAccountId: extra.externalAccountId ?? null,
    encryptedCredentials: extra.encryptedCredentials ?? null,
    lastError: extra.lastError ?? null,
    lastErrorCode: extra.lastErrorCode ?? null,
    lastSyncAt: extra.lastSyncAt ?? null,
  };
  const updateData: {
    status: typeof status;
    displayName?: string | null;
    externalAccountId?: string | null;
    encryptedCredentials?: string | null;
    lastError?: string | null;
    lastErrorCode?: string | null;
    lastSyncAt?: Date | null;
  } = { status };
  if (extra.displayName !== undefined) updateData.displayName = extra.displayName;
  if (extra.externalAccountId !== undefined) updateData.externalAccountId = extra.externalAccountId;
  if (extra.encryptedCredentials !== undefined) updateData.encryptedCredentials = extra.encryptedCredentials;
  if (extra.lastError !== undefined) updateData.lastError = extra.lastError;
  if (extra.lastErrorCode !== undefined) updateData.lastErrorCode = extra.lastErrorCode;
  if (extra.lastSyncAt !== undefined) updateData.lastSyncAt = extra.lastSyncAt;
  return prisma.integration.upsert({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider } },
    create: createData,
    update: updateData,
    select: SAFE_INTEGRATION_SELECT,
  });
}

export async function createConnection(ctx: TenantContext, provider: FrameworkProviderId) {
  await validateOwnership(ctx, ctx.clinicId);
  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "integration.connect.attempt",
    entityType: "Integration",
    entityId: provider,
    metadata: { provider },
  });
  const adapter = getProvider(provider);
  try {
    const result = await adapter.connect();
    await transition(ctx, provider, "CONNECTING", {});
    const encrypted = credentialService.encrypt(result.credentials);
    const row = await transition(ctx, provider, "CONNECTED", {
      encryptedCredentials: encrypted,
      externalAccountId: result.externalAccountId,
      displayName: result.displayName,
      lastError: null,
      lastErrorCode: null,
      lastSyncAt: new Date(),
    });
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "integration.connect",
      entityType: "Integration",
      entityId: row.id,
      metadata: { provider, connectionStatus: "CONNECTED" },
    });
    return serializeIntegration(row);
  } catch (error) {
    if (error instanceof IntegrationError && error.code === "PROVIDER_NOT_IMPLEMENTED") {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Connection failed.";
    await transition(ctx, provider, "ERROR", {
      lastError: message,
      lastErrorCode: error instanceof IntegrationError ? error.code : "CONNECTION_FAILED",
    }).catch(() => undefined);
    throw error;
  }
}

export async function disconnectConnection(ctx: TenantContext, provider: FrameworkProviderId) {
  await validateOwnership(ctx, ctx.clinicId);
  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "integration.disconnect.attempt",
    entityType: "Integration",
    entityId: provider,
    metadata: { provider },
  });
  const adapter = getProvider(provider);
  const stored = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider } },
    select: { encryptedCredentials: true, externalAccountId: true, status: true },
  });
  try {
    await adapter.disconnect({
      ...(stored?.encryptedCredentials
        ? { credentials: credentialService.decrypt(stored.encryptedCredentials) }
        : {}),
      ...(stored?.externalAccountId ? { externalAccountId: stored.externalAccountId } : {}),
    });
  } catch (error) {
    if (error instanceof IntegrationError && error.code === "PROVIDER_NOT_IMPLEMENTED") {
      throw new IntegrationError(
        "PROVIDER_DISCONNECT_NOT_IMPLEMENTED",
        "External provider disconnect is not implemented yet. The local connection was not changed.",
        501,
      );
    }
    throw error;
  }
  const row = await transition(ctx, provider, "DISCONNECTED", {
    encryptedCredentials: credentialService.remove(),
    lastError: null,
    lastErrorCode: null,
  });
  if (provider === "WHATSAPP_CLOUD") {
    await prisma.whatsAppAccount.updateMany({
      where: { clinicId: ctx.clinicId },
      data: { isActive: false },
    });
  }
  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "integration.disconnect",
    entityType: "Integration",
    entityId: row.id,
    metadata: { provider, connectionStatus: "DISCONNECTED" },
  });
  return serializeIntegration(row);
}

export async function updateConnectionStatus(
  ctx: TenantContext,
  provider: FrameworkProviderId,
  to: ConnectionStatus,
) {
  await validateOwnership(ctx, ctx.clinicId);
  const row = await transition(ctx, provider, to, {});
  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "integration.status.change",
    entityType: "Integration",
    entityId: row.id,
    metadata: { provider, connectionStatus: to },
  });
  return serializeIntegration(row);
}

export const integrationService = {
  getConnection,
  listConnections,
  createConnection,
  disconnectConnection,
  getStatus,
  validateOwnership,
  updateConnectionStatus,
};
