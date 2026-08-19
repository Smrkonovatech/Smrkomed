import { Hono } from "hono";
import { pingDatabase } from "@smrkomed/database";

import { env } from "../../config/env";
import { ok } from "../../lib/http";
import type { AppEnv } from "../../types";

export const adminHealthRoutes = new Hono<AppEnv>().get("/system/health", async (c) => {
  let database: "connected" | "disconnected" = "disconnected";
  try {
    await pingDatabase();
    database = "connected";
  } catch {
    database = "disconnected";
  }

  let web: "connected" | "disconnected" | "unchecked" = "unchecked";
  try {
    const response = await fetch(`${env.webAppUrl.replace(/\/$/, "")}/api/health`, {
      signal: AbortSignal.timeout(2500),
    });
    web = response.ok ? "connected" : "disconnected";
  } catch {
    web = "disconnected";
  }

  return ok(c, {
    api: "ok",
    database,
    web,
    environment: env.nodeEnv,
    version: "0.1.0",
    services: {
      api: "ok",
      postgres: database,
      web,
    },
  });
});
