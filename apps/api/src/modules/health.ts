import { Hono } from "hono";
import { pingDatabase } from "@smrkomed/database";

import type { AppEnv } from "../types";

export const healthRoutes = new Hono<AppEnv>().get("/", async (c) => {
  try {
    await pingDatabase();
    return c.json({ status: "ok", database: "connected" });
  } catch {
    return c.json({ status: "error", database: "disconnected" }, 503);
  }
});
