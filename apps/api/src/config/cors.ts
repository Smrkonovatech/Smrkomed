import { cors } from "hono/cors";

import { env } from "./env";

const allowed = new Set(env.corsOrigins);

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return env.corsOrigins[0] ?? "http://localhost:3000";
    if (allowed.has(origin)) return origin;
    return undefined;
  },
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  maxAge: 86400,
});
