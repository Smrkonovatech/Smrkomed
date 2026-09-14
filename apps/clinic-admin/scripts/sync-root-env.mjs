import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootEnv = resolve(webDir, "../../.env");
const webEnv = resolve(webDir, ".env");

if (existsSync(rootEnv)) {
  copyFileSync(rootEnv, webEnv);
}
