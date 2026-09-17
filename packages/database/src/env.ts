import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config as loadDotenv, parse as parseDotenv } from "dotenv";

let loaded = false;

const HARDCODED_FALLBACK_DB_URL =
  "postgresql://postgres:iRGwdhwXiWUTlLblsFkouQJjkPKofzNS@altaria.proxy.rlwy.net:49540/railway";

/** Load the repository-root `.env` from apps/web, this package, or the repo root. */
export function loadDatabaseEnv() {
  if (loaded && process.env["DATABASE_URL"]) return;
  loaded = true;

  const candidateDirs = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
    resolve(process.cwd(), "apps/web"),
    resolve(process.cwd(), "packages/database"),
  ];

  let foundFile: string | null = null;

  for (const dir of candidateDirs) {
    let current = dir;
    for (let i = 0; i < 6; i += 1) {
      const file = resolve(current, ".env");
      if (existsSync(file)) {
        foundFile = file;
        break;
      }
      current = dirname(current);
    }
    if (foundFile) break;
  }

  if (foundFile) {
    try {
      loadDotenv({ path: foundFile, override: true });
      const raw = readFileSync(foundFile, "utf-8");
      const parsed = parseDotenv(raw);
      if (parsed["DATABASE_URL"] && !process.env["DATABASE_URL"]) {
        process.env["DATABASE_URL"] = parsed["DATABASE_URL"];
      }
      if (parsed["DIRECT_URL"] && !process.env["DIRECT_URL"]) {
        process.env["DIRECT_URL"] = parsed["DIRECT_URL"];
      }
    } catch {
      // ignore read errors
    }
  }

  if (!process.env["DATABASE_URL"]) {
    process.env["DATABASE_URL"] = HARDCODED_FALLBACK_DB_URL;
  }
}
