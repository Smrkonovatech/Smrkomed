import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adminDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootEnv = resolve(adminDir, "../../.env");
const adminEnv = resolve(adminDir, ".env");

if (existsSync(rootEnv)) {
  copyFileSync(rootEnv, adminEnv);
}

const adminUrl = process.env["ADMIN_APP_URL"] ?? "http://localhost:3001";
const apiUrl = process.env["API_URL"] ?? "http://localhost:4000";
const overrides = {
  AUTH_URL: adminUrl,
  NEXTAUTH_URL: adminUrl,
  NEXT_PUBLIC_APP_URL: adminUrl,
  NEXT_PUBLIC_API_URL: apiUrl,
};

let contents = existsSync(adminEnv) ? readFileSync(adminEnv, "utf8") : "";
for (const [key, value] of Object.entries(overrides)) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  contents = pattern.test(contents) ? contents.replace(pattern, line) : `${contents.trimEnd()}\n${line}\n`;
}
writeFileSync(adminEnv, contents.endsWith("\n") ? contents : `${contents}\n`);
