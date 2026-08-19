import { PrismaClient } from "@prisma/client";

import { loadDatabaseEnv } from "./env";

loadDatabaseEnv();

function resolveDatabaseUrl() {
  const url = process.env["DATABASE_URL"];
  if (!url) return url;
  const onVercel = process.env["VERCEL"] === "1";
  if (!onVercel) return url;
  if (/sslmode=/i.test(url)) return url;
  if (/localhost|127\.0\.0\.1/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env["NODE_ENV"] === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

export function databaseUrlDiagnostics() {
  const raw = process.env["DATABASE_URL"] ?? "";
  if (!raw.trim()) {
    return { configured: false as const, privateNetwork: false };
  }
  return {
    configured: true as const,
    privateNetwork: /railway\.internal|\.rlwy\.internal/i.test(raw),
  };
}

export function prismaErrorHint(error: unknown): { code: string; message: string } {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const text = error instanceof Error ? error.message : "";
  const unreachable =
    code === "P1001" ||
    code === "P1002" ||
    /can't reach|timed out|econnrefused|enotfound|etimedout/i.test(text);
  if (unreachable) {
    return {
      code: "DB_UNREACHABLE",
      message:
        "Vercel cannot reach Postgres. On Railway, copy the public DATABASE_URL (not *.railway.internal) and set it on the Vercel web project, then Redeploy.",
    };
  }
  if (code === "P2021" || /does not exist/i.test(text)) {
    return {
      code: "DB_SCHEMA",
      message:
        "Postgres is reachable but clinic tables are missing. Run database migrations against this DATABASE_URL, then try again.",
    };
  }
  if (code === "P1010" || /authentication failed/i.test(text)) {
    return {
      code: "DB_AUTH",
      message: "Postgres rejected the credentials in DATABASE_URL. Paste the current Railway public URL on Vercel and Redeploy.",
    };
  }
  if (code === "P2002") {
    return {
      code: "DB_CONFLICT",
      message: "A demo clinic record already exists in a conflicting state. Try signing in again, or use a different clinic email to register.",
    };
  }
  if (code === "P2003") {
    return {
      code: "DB_REFERENCE",
      message: "Demo clinic setup hit a missing related record. Sign in again after this deploy so roles can be created.",
    };
  }
  if (/permission denied|read-only/i.test(text)) {
    return {
      code: "DB_READONLY",
      message: "Postgres connected, but this database user cannot write. Use the Railway DATABASE_URL for a read-write role on Vercel.",
    };
  }
  if (/not a valid bcrypt hash/i.test(text)) {
    return {
      code: "DB_PASSWORD",
      message: "A demo user exists with an invalid password hash. Sign in again after this deploy to reset it.",
    };
  }
  if (error instanceof Error && error.message && !/postgresql:\/\/|DATABASE_URL/i.test(error.message)) {
    return { code: code || "DEMO_SETUP_FAILED", message: error.message };
  }
  return {
    code: code || "DEMO_SETUP_FAILED",
    message:
      "Postgres is connected, but creating demo users failed. Redeploy the latest web build and try Sign in again.",
  };
}

export async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}
