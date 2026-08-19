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

export async function writeAuditLog(input: {
  organizationId?: string | null;
  clinicId?: string | null;
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const metadata = sanitizeMetadata(input.metadata);
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      clinicId: input.clinicId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      ...(metadata === undefined ? {} : { metadata }),
    },
  });
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
