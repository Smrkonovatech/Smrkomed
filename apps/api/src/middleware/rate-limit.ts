import { createMiddleware } from "hono/factory";

import { env } from "../config/env";
import { HttpError } from "../lib/errors";
import type { AppEnv } from "../types";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

type Bucket = { count: number; resetAt: number };

/**
 * In-memory rate limiter for local development.
 * This is not shared across processes. Replace with Redis in a later phase.
 * Disable with RATE_LIMIT_DISABLED=1. Webhook routes use a stricter bucket.
 */
export function createMemoryRateLimiter(max = MAX_REQUESTS, windowMs = WINDOW_MS) {
  const hits = new Map<string, Bucket>();
  return {
    consume(key: string) {
      const now = Date.now();
      const current = hits.get(key);
      if (!current || current.resetAt < now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: max - 1 };
      }
      current.count += 1;
      if (current.count > max) {
        return { allowed: false, remaining: 0 };
      }
      return { allowed: true, remaining: max - current.count };
    },
  };
}

const limiter = createMemoryRateLimiter();
const webhookLimiter = createMemoryRateLimiter(30, WINDOW_MS);

export const rateLimitMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (env.rateLimitDisabled || c.req.path === "/api/v1/health") {
    await next();
    return;
  }
  const key = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const webhook = c.req.path.startsWith("/api/v1/webhooks/");
  const result = (webhook ? webhookLimiter : limiter).consume(webhook ? `wh:${key}` : key);
  if (!result.allowed) {
    throw new HttpError(429, "RATE_LIMITED", "Too many requests.");
  }
  await next();
});
