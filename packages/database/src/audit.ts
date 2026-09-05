import type { Prisma } from "@prisma/client";

import { prisma } from "./client";
import type { TenantContext } from "./tenant";

const SENSITIVE_METADATA_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "clientSecret",
  "appSecret",
  "systemUserToken",
  "secret",
  "encryptedCredentials",
  "encryptedPayload",
  "authorization",
  "code",
]);

const SENSITIVE_KEY_PATTERN = /secret|token|credential|password|authorization/i;

/**
 * Synthetic TenantContext.userId values used by webhooks/workers.
 * These are NOT rows in User — writing them as AuditLog.actorId violates AuditLog_actorId_fkey.
 */
const SYSTEM_TENANT_USER_IDS = new Set([
  "system-webhook",
  "system_webhook",
  "system-worker",
]);

export function isSystemTenantUserId(userId: string | null | undefined): boolean {
  return Boolean(userId && SYSTEM_TENANT_USER_IDS.has(userId));
}

/** Map tenant userId → nullable AuditLog.actorId (never invent fake User rows). */
export function resolveAuditActorId(actorId: string | null | undefined): {
  actorId: string | null;
  systemActor: string | null;
} {
  if (!actorId) return { actorId: null, systemActor: null };
  if (SYSTEM_TENANT_USER_IDS.has(actorId)) {
    return { actorId: null, systemActor: actorId };
  }
  return { actorId, systemActor: null };
}

function sanitizeMetadata(metadata?: Prisma.InputJsonValue): Prisma.InputJsonValue | undefined {
  if (metadata === undefined) return undefined;
  return sanitizeValue(metadata) as Prisma.InputJsonValue;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key]) => !SENSITIVE_METADATA_KEYS.has(key) && !SENSITIVE_KEY_PATTERN.test(key),
  );
  return Object.fromEntries(entries.map(([key, nested]) => [key, sanitizeValue(nested)]));
}

function isActorFkViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: string }).code ?? "") : "";
  const message = err instanceof Error ? err.message : String(err);
  return code === "P2003" || /AuditLog_actorId_fkey/i.test(message);
}

export async function writeAuditLog(input: {
  organizationId?: string | null;
  clinicId?: string | null;
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const resolved = resolveAuditActorId(input.actorId);
  const baseMeta =
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? { ...(input.metadata as Record<string, unknown>) }
      : {};
  if (resolved.systemActor) {
    baseMeta["actorType"] = "SYSTEM";
    baseMeta["systemActor"] = resolved.systemActor;
  }
  const metadata = sanitizeMetadata(
    Object.keys(baseMeta).length ? (baseMeta as Prisma.InputJsonValue) : input.metadata,
  );

  const data = {
    organizationId: input.organizationId ?? null,
    clinicId: input.clinicId ?? null,
    actorId: resolved.actorId,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    ...(metadata === undefined ? {} : { metadata }),
  };

  try {
    await prisma.auditLog.create({ data });
  } catch (err) {
    // Stale / invalid real user id → retry once with null actor so business ops can continue.
    if (isActorFkViolation(err) && data.actorId) {
      const retryMeta = sanitizeMetadata({
        ...(typeof metadata === "object" && metadata && !Array.isArray(metadata)
          ? (metadata as Record<string, unknown>)
          : {}),
        actorType: "SYSTEM",
        actorIdInvalid: true,
      } as Prisma.InputJsonValue);
      await prisma.auditLog.create({
        data: {
          ...data,
          actorId: null,
          ...(retryMeta === undefined ? {} : { metadata: retryMeta }),
        },
      });
      return;
    }
    throw err;
  }
}

export async function writeTenantAuditLog(
  ctx: TenantContext,
  input: { action: string; entityType?: string; entityId?: string; metadata?: Prisma.InputJsonValue },
) {
  await writeAuditLog({
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    actorId: ctx.userId,
    action: input.action,
    ...(input.entityType === undefined ? {} : { entityType: input.entityType }),
    ...(input.entityId === undefined ? {} : { entityId: input.entityId }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  });
}
