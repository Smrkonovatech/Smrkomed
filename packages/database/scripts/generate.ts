import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npx", ["prisma", "generate"], {
  cwd: pkgDir,
  stdio: "pipe",
  shell: true,
  env: process.env,
  encoding: "utf-8",
});

if (result.status !== 0) {
  const combined = (result.stdout || "") + (result.stderr || "");
  console.log(result.stdout);
  if (combined.includes("EPERM") && combined.includes("query_engine-windows.dll.node")) {
    const clientPath = resolve(pkgDir, "../../node_modules/.prisma/client/index.js");
    if (existsSync(clientPath)) {
      console.warn("warn: Prisma engine DLL is locked by an active dev process. Existing generated Prisma client is reused.");
      process.exit(0);
    }
  }
  console.error(result.stderr);
  process.exit(result.status ?? 1);
} else {
  if (result.stdout) {
    console.log(result.stdout);
  }
}
