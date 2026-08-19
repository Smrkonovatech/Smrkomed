import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadDatabaseEnv } from "../src/env";

loadDatabaseEnv();

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: pkgDir,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(result.status ?? 1);
