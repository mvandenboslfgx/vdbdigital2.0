import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * SEO-005: every indexable marketing route must resolve locale-aware
 * canonical + hreflang alternates via `buildLocaleAlternates` (directly, or
 * indirectly through `createSolutionMetadata`, which wraps it). A bare
 * `alternates: { canonical: ... }` object ignores the active locale and was
 * the Phase 5 gap documented in `docs/SEO.md`.
 */

const MARKETING_ROOT = join(process.cwd(), "src", "app", "(marketing)");
const SHOP_ROOT = join(process.cwd(), "src", "app", "(shop)");

/**
 * Routes that intentionally do not need locale-aware alternates.
 * Keep this list short and justified — it is a debt allowlist, not a bypass.
 */
const ALLOWLIST = new Set<string>([
  // Legacy hyphenated aliases: 308 permanentRedirect before any metadata renders.
  "src/app/(marketing)/solutions/live-chat/page.tsx",
  "src/app/(marketing)/solutions/review-flows/page.tsx",
  "src/app/(marketing)/solutions/custom-websites/page.tsx",
  // Private/personalized cart+checkout flow: robots-noindexed (see robots.test.ts
  // and per-page `robots: { index: false }` metadata), so hreflang alternates
  // are not meaningful — there is nothing for a crawler to index in any locale.
  "src/app/(shop)/cart/page.tsx",
  "src/app/(shop)/checkout/page.tsx",
  "src/app/(shop)/checkout/success/page.tsx",
  "src/app/(shop)/checkout/cancelled/page.tsx",
]);

function collectPageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectPageFiles(full, acc);
    } else if (entry === "page.tsx") {
      acc.push(full);
    }
  }
  return acc;
}

function toRepoRelativePosix(absolutePath: string): string {
  return relative(process.cwd(), absolutePath).split("\\").join("/");
}

function checkAlternatesCoverage(file: string) {
  const source = readFileSync(join(process.cwd(), file), "utf8");

  if (!source.includes("generateMetadata")) {
    // No exported metadata function on this route — nothing to validate.
    return;
  }

  const usesBareCanonical = /alternates:\s*\{\s*canonical:/.test(source);
  const usesLocaleAwareHelper =
    source.includes("buildLocaleAlternates(") ||
    source.includes("createSolutionMetadata(");

  expect(
    usesBareCanonical,
    `${file} sets alternates: { canonical } directly — switch to buildLocaleAlternates(path, locale).`,
  ).toBe(false);
  expect(
    usesLocaleAwareHelper,
    `${file} has generateMetadata but never calls buildLocaleAlternates (directly or via createSolutionMetadata).`,
  ).toBe(true);
}

describe("SEO-005 marketing metadata alternates coverage", () => {
  const pageFiles = collectPageFiles(MARKETING_ROOT).map(toRepoRelativePosix);

  it("finds marketing page routes to scan", () => {
    expect(pageFiles.length).toBeGreaterThan(10);
  });

  const candidates = pageFiles.filter((file) => !ALLOWLIST.has(file));

  it.each(candidates)(
    "%s uses locale-aware alternates instead of a bare canonical",
    checkAlternatesCoverage,
  );

  it("keeps the allowlist free of stale entries", () => {
    for (const entry of ALLOWLIST) {
      expect(pageFiles.concat(collectPageFiles(SHOP_ROOT).map(toRepoRelativePosix))).toContain(
        entry,
      );
    }
  });
});

describe("SEO-005 (shop) metadata alternates coverage", () => {
  const pageFiles = collectPageFiles(SHOP_ROOT).map(toRepoRelativePosix);

  it("finds shop page routes to scan", () => {
    expect(pageFiles.length).toBeGreaterThan(0);
  });

  const candidates = pageFiles.filter((file) => !ALLOWLIST.has(file));

  it("has at least one indexable shop route left to check (list + PDP)", () => {
    expect(candidates.length).toBeGreaterThanOrEqual(2);
  });

  it.each(candidates)(
    "%s uses locale-aware alternates instead of a bare canonical",
    checkAlternatesCoverage,
  );
});
