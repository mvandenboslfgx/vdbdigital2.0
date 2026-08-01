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

/**
 * Routes that intentionally do not need locale-aware alternates.
 * Keep this list short and justified — it is a debt allowlist, not a bypass.
 */
const ALLOWLIST = new Set<string>([
  // Legacy hyphenated aliases: 308 permanentRedirect before any metadata renders.
  "src/app/(marketing)/solutions/live-chat/page.tsx",
  "src/app/(marketing)/solutions/review-flows/page.tsx",
  "src/app/(marketing)/solutions/custom-websites/page.tsx",
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

describe("SEO-005 marketing metadata alternates coverage", () => {
  const pageFiles = collectPageFiles(MARKETING_ROOT).map(toRepoRelativePosix);

  it("finds marketing page routes to scan", () => {
    expect(pageFiles.length).toBeGreaterThan(10);
  });

  const candidates = pageFiles.filter((file) => !ALLOWLIST.has(file));

  it.each(candidates)(
    "%s uses locale-aware alternates instead of a bare canonical",
    (file) => {
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
    },
  );

  it("keeps the allowlist free of stale entries", () => {
    for (const entry of ALLOWLIST) {
      expect(pageFiles).toContain(entry);
    }
  });
});
