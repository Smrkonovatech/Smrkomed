import { Hono } from "hono";

import { corsMiddleware } from "./config/cors";
import { fail } from "./lib/http";
import { onError } from "./middleware/error";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { v1 } from "./routes/v1";
import type { AppEnv } from "./types";

export function createApp() {
  const app = new Hono<AppEnv>();
  app.onError(onError);
  app.notFound((c) => fail(c, 404, "RESOURCE_NOT_FOUND", "Resource not found"));
  app.use("*", corsMiddleware);
  app.use("*", rateLimitMiddleware);
  app.route("/api/v1", v1);
  return app;
}
