import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

let loaded = false;

/** Load the repository-root `.env` when the Next app runs from `apps/web`. */
export function loadRootEnv() {
  if (loaded) return;
  loaded = true;

  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const file = resolve(dir, ".env");
    if (existsSync(file)) {
      loadDotenv({ path: file, quiet: true });
      return;
    }
    dir = dirname(dir);
  }
}
