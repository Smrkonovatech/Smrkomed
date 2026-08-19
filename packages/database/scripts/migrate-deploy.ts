import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadDatabaseEnv } from "../src/env";

loadDatabaseEnv();

const databaseUrl = process.env["DATABASE_URL"] ?? "";
if (!databaseUrl.trim()) {
  console.error("DATABASE_URL is not set. Cannot run prisma migrate deploy.");
  process.exit(1);
}

const onVercel = process.env["VERCEL"] === "1";
if (
  onVercel &&
  !/sslmode=/i.test(databaseUrl) &&
  !/localhost|127\.0\.0\.1/i.test(databaseUrl)
) {
  process.env["DATABASE_URL"] = `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}sslmode=require`;
}

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: pkgDir,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(result.status ?? 1);
