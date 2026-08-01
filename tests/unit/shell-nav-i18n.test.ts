import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import nl from "@/i18n/messages/nl";
import { createT, getPath, type NestedValue } from "@/i18n/create-t";

/**
 * `t()` falls back to echoing the key when it is missing, so a typo in a nav
 * entry ships silently as "admin.custmers" in the sidebar. These tests read the
 * shell layouts and assert every key they reference actually resolves in both
 * dictionaries, and that the shells still take a language switcher.
 */

const REPO_ROOT = process.cwd();

function readSource(...segments: string[]): string {
  return readFileSync(join(REPO_ROOT, ...segments), "utf8");
}

const adminLayout = readSource("src", "app", "admin", "(protected)", "layout.tsx");
const portalLayout = readSource("src", "app", "portal", "(protected)", "layout.tsx");
const adminShell = readSource("src", "components", "admin", "admin-shell.tsx");
const portalShell = readSource("src", "components", "portal", "portal-shell.tsx");

function referencedKeys(source: string, namespace: string): string[] {
  const pattern = new RegExp(`["']${namespace}\\.[a-zA-Z0-9_.]+["']`, "g");
  return [
    ...new Set(
      (source.match(pattern) ?? []).map((raw) => raw.slice(1, -1)),
    ),
  ];
}

describe("shell navigation i18n", () => {
  const tEn = createT(en);
  const tNl = createT(nl);

  it("resolves every admin shell key in both dictionaries", () => {
    const keys = referencedKeys(adminLayout, "admin");
    expect(keys.length).toBeGreaterThan(15);

    for (const key of keys) {
      expect(getPath(en as unknown as NestedValue, key), `${key} missing in en`).toBeTypeOf(
        "string",
      );
      expect(getPath(nl as unknown as NestedValue, key), `${key} missing in nl`).toBeTypeOf(
        "string",
      );
      expect(tEn(key)).not.toBe(key);
      expect(tNl(key)).not.toBe(key);
    }
  });

  it("resolves every portal shell key in both dictionaries", () => {
    const keys = referencedKeys(portalLayout, "portal");
    expect(keys.length).toBeGreaterThan(10);

    for (const key of keys) {
      expect(tEn(key), `${key} missing in en`).not.toBe(key);
      expect(tNl(key), `${key} missing in nl`).not.toBe(key);
    }
  });

  it("keeps the admin nav free of hardcoded labels", () => {
    expect(adminLayout).not.toMatch(/label:\s*"/);
    for (const dutch of ["Klanten", "Projecten", "Offertes", "Facturen", "Gebruikers"]) {
      expect(adminLayout).not.toContain(`"${dutch}"`);
    }
  });

  it("offers a language switcher in both authenticated shells", () => {
    expect(adminLayout).toContain("ServerLanguageSwitcher");
    // The portal's mobile header switcher is md:hidden; the sidebar needs one too.
    expect(portalShell.match(/LanguageSwitcherBoundary/g)?.length ?? 0).toBeGreaterThan(1);
  });

  it("matches the active admin nav item by locale-stripped path", () => {
    expect(adminShell).toContain("stripLocalePrefix");
  });
});
