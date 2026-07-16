/**
 * Laadt .env.local voor standalone scripts (server-side only).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    const existing = process.env[key];
    if (existing === undefined || existing === "") {
      process.env[key] = value;
    }
  }
}

export function requireEnv(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Ontbrekende environment variables: ${missing.join(", ")}`);
    console.error("Vul .env.local in (zie .env.example) en voer opnieuw uit.");
    process.exit(1);
  }
}
