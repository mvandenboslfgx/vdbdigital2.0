import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import en from "@/i18n/messages/en";
import nl from "@/i18n/messages/nl";
import { createT } from "@/i18n/create-t";

/**
 * Portal copy guard. Two failure modes are covered:
 *
 * 1. `t()` echoes an unknown key instead of throwing, so `portal.documentsPage.titel`
 *    would silently render as that string in the UI. Every `portal.*` key the
 *    portal surface references must exist in *both* dictionaries.
 * 2. Dutch copy creeping back into JSX, which is what the migration removed.
 */

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = [
  join(REPO_ROOT, "src", "app", "portal"),
  join(REPO_ROOT, "src", "components", "portal"),
  join(REPO_ROOT, "src", "lib", "portal"),
];

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

const files = SCAN_ROOTS.flatMap((root) => collectFiles(root));

/**
 * Only `t()` arguments — a bare `"portal.quotes.accept"` elsewhere is a
 * permission code, and enum namespaces are resolved through `labelFor`.
 * Dynamic keys (`portal.x.${id}`) are asserted explicitly below.
 */
function staticKeys(source: string): string[] {
  const pattern = /\bt\(\s*(["'`])(portal(?:\.[a-zA-Z0-9_]+)+)\1/g;
  const keys: string[] = [];
  for (const match of source.matchAll(pattern)) keys.push(match[2]!);
  return keys;
}

describe("portal copy is routed through the dictionaries", () => {
  const tEn = createT(en);
  const tNl = createT(nl);

  const referenced = [
    ...new Set(files.flatMap((file) => staticKeys(readFileSync(file, "utf8")))),
  ].sort();

  it("finds portal keys to verify", () => {
    expect(referenced.length).toBeGreaterThan(50);
  });

  it("resolves every referenced portal key in en and nl", () => {
    const missing: string[] = [];
    for (const key of referenced) {
      if (tEn(key) === key) missing.push(`en: ${key}`);
      if (tNl(key) === key) missing.push(`nl: ${key}`);
    }
    expect(missing).toEqual([]);
  });

  it("resolves the dynamic project tab keys", () => {
    for (const tab of [
      "overview",
      "milestones",
      "deliverables",
      "documents",
      "feedback",
      "activity",
    ]) {
      const key = `portal.projectDetail.tabs.${tab}`;
      expect(tEn(key)).not.toBe(key);
      expect(tNl(key)).not.toBe(key);
    }
  });

  it("keeps Dutch copy out of portal pages and components", () => {
    const dutch =
      /"(?:Geen|Nog geen|Er zijn|Openstaande|Voortgang|Volgende|Gepland|Reden|Bestand|Grootte|Bron|Datum|Versiehistorie|Reacties|Subtotaal|Totaal|Uitgifte|Verval|Betaaldatum|Regels|Nieuw ticket|Onderwerp|Omschrijving|Uploaden|Downloaden|Titel)[^"]*"/;
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, index) => {
        // Metadata titles are still static; they need generateMetadata to localize.
        if (/^\s*title:\s*"/.test(line)) return;
        if (dutch.test(line)) {
          offenders.push(
            `${relative(REPO_ROOT, file).split("\\").join("/")}:${index + 1}`,
          );
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
