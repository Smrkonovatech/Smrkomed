import { PrismaClient } from "@prisma/client";

import { loadDatabaseEnv } from "./env";

loadDatabaseEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl =
  process.env["DATABASE_URL"] ?? "postgresql://127.0.0.1:1/smrkomed";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env["NODE_ENV"] === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function pingDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}
