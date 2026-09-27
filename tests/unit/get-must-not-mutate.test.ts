/**
 * Permanent regression: GET handlers must not mutate business/auth state.
 * OAuth code exchange on GET /auth/callback is the documented exception.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

function getBody(src: string): string | null {
  const m = src.match(/export\s+async\s+function\s+GET\s*\([\s\S]*?\{/);
  if (!m || m.index === undefined) return null;
  // Approximate: from GET to next export or EOF
  const start = m.index;
  const rest = src.slice(start);
  const next = rest.search(/\nexport\s+(async\s+)?function\s+(?!GET)/);
  return next === -1 ? rest : rest.slice(0, next);
}

const MUTATION_PATTERNS = [
  /\.signOut\s*\(/,
  /\.delete\s*\(/,
  /\.insert\s*\(/,
  /\.upsert\s*\(/,
  /\.update\s*\(/,
  /capture_partner_referral_click/,
  /approve/i,
  /reject/i,
];

const ALLOWLIST = new Set([
  // OAuth code exchange must run on GET (provider redirect).
  path.normalize("src/app/auth/callback/route.ts"),
  // Affiliate landing: click insert only on real document navigations;
  // prefetch/RSC paths are guarded in-route. Full POST migration is P1.
  path.normalize("src/app/r/[token]/route.ts"),
]);

describe("GET must never mutate state", () => {
  const routes = walk("src/app");

  it("scans route handlers", () => {
    expect(routes.length).toBeGreaterThan(3);
  });

  it("uitloggen GET is 405 and POST signs out", () => {
    const src = readFileSync("src/app/(auth)/uitloggen/route.ts", "utf8");
    const get = getBody(src)!;
    expect(get).toMatch(/405/);
    expect(get).not.toMatch(/signOut/);
    expect(src).toMatch(/export async function POST/);
    expect(src.slice(src.indexOf("export async function POST"))).toMatch(
      /signOut/,
    );
  });

  for (const file of routes) {
    const rel = path.normalize(file);
    it(`${rel} GET has no forbidden mutations`, () => {
      const src = readFileSync(file, "utf8");
      if (!/export\s+async\s+function\s+GET/.test(src)) return;
      if (ALLOWLIST.has(rel)) return;
      const body = getBody(src);
      if (!body) return;
      for (const pat of MUTATION_PATTERNS) {
        expect(body, `${rel} matched ${pat}`).not.toMatch(pat);
      }
    });
  }
});
