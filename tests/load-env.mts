/**
 * Load `.env` then `.env.local` so `npm test` sees DATABASE_URL.
 * Does not log values.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(file: string) {
  const p = path.join(process.cwd(), file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
