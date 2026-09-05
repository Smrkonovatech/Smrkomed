import type { Prisma } from "@smrkomed/database";

/** Execution metadata stored in WhatsAppFlowExecution.context Json — avoids a Stage 2 migration. */
export type ExecutionContext = {
  vars?: Record<string, string>;
  simulation?: boolean;
  waitNextNodeId?: string | null;
  /** reply | delay — WAIT_FOR_REPLY sets "reply" */
  waitKind?: "reply" | "delay" | null;
  /** Tags applied by ADD_TAG / REMOVE_TAG within this execution (no Patient.tags column). */
  tags?: string[];
  retryCount?: number;
  maxRetries?: number;
  lastError?: string | null;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  lockedAt?: string | null;
  lockToken?: string | null;
  lockExpiresAt?: string | null;
};

export const DEFAULT_MAX_RETRIES = 3;
export const LOCK_TTL_MS = 120_000;

export function parseExecutionContext(raw: unknown): ExecutionContext {
  if (!raw || typeof raw !== "object") return {};
  return { ...(raw as ExecutionContext) };
}

export function mergeExecutionContext(
  current: ExecutionContext,
  patch: Partial<ExecutionContext>,
): Prisma.InputJsonValue {
  return { ...current, ...patch } as Prisma.InputJsonValue;
}

export function isLockHeld(ctx: ExecutionContext, now = Date.now()) {
  if (!ctx.lockToken || !ctx.lockExpiresAt) return false;
  return new Date(ctx.lockExpiresAt).getTime() > now;
}
