/**
 * Read-only Tawk catalog absence scanner (pure; no DB writes).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { commercialCatalog } from "../../src/config/commercial/pricing";
import {
  categories as seedCategories,
  seedProducts,
} from "../../src/config/products.seed";
import { productsNl } from "../../src/i18n/content/products-nl";
import {
  containsTawkBrandMarker,
  isLegacyTawkAddon,
  isLegacyTawkCatalogOffering,
  isLegacyTawkCategorySlug,
  isLegacyTawkProduct,
  isLegacyTawkProductSlug,
  isLegacyTawkSku,
  LEGACY_TAWK_PRODUCT_SLUGS,
} from "../../src/lib/commerce/tawk-legacy-blocklist";

export type TawkMatchClass =
  | "TECHNICAL_RUNTIME"
  | "ACTIVE_PRODUCT"
  | "ARCHIVED_PRODUCT"
  | "PRODUCT_SLUG"
  | "ADDON"
  | "CATEGORY"
  | "SEO"
  | "DOCUMENTATION"
  | "REGRESSION_TEST"
  | "LEGACY_CLEANUP_MIGRATION"
  | "EVIDENCE_ONLY";

export type TawkCatalogMatch = {
  classification: TawkMatchClass;
  path: string;
  detail: string;
  blocking: boolean;
};

const BLOCKING: ReadonlySet<TawkMatchClass> = new Set([
  "TECHNICAL_RUNTIME",
  "ACTIVE_PRODUCT",
  "PRODUCT_SLUG",
  "ADDON",
  "CATEGORY",
  "SEO",
]);

export function isBlockingTawkClass(c: TawkMatchClass): boolean {
  return BLOCKING.has(c);
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "evidence",
  "backups",
  "test-results",
  "review-package",
  ".git",
]);

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|sql|csv|toml)$/i.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(cwd: string, absolute: string): string {
  return relative(cwd, absolute).replace(/\\/g, "/");
}

function classifyRepoPath(pathRel: string): TawkMatchClass | null {
  const p = pathRel.replace(/\\/g, "/");
  if (p.includes("docs/evidence/")) return "EVIDENCE_ONLY";
  if (/supabase\/migrations\/.*remove_tawk/i.test(p)) {
    return "LEGACY_CLEANUP_MIGRATION";
  }
  if (
    p.includes("tawk-legacy-blocklist") ||
    p.includes("catalog-no-tawk") ||
    p.includes("verify-catalog-no-tawk")
  ) {
    return "LEGACY_CLEANUP_MIGRATION";
  }
  if (
    /(^|\/)tests\//.test(p) ||
    p.includes("secret-scan") ||
    /\.test\.(ts|tsx)$/.test(p) ||
    /\.spec\.(ts|tsx)$/.test(p)
  ) {
    return "REGRESSION_TEST";
  }
  if (/(^|\/)docs\//.test(p) || p === "README.md") return "DOCUMENTATION";
  if (
    p === "package.json" ||
    p === "package-lock.json" ||
    p.endsWith("/package.json")
  ) {
    // Script name catalog:verify-no-tawk is intentional gate wiring
    return "LEGACY_CLEANUP_MIGRATION";
  }
  if (
    /src\/app\/api\/tawk\//.test(p) ||
    /src\/config\/tawk\.ts$/.test(p) ||
    /tawk-secure|tawk-widget|chat-provider|embed\.tawk|Tawk_API/.test(p)
  ) {
    return "TECHNICAL_RUNTIME";
  }
  return null;
}

const TAWK_TOKEN_RE = /tawk\.?\s*to|\btawk\b|Tawk_API|Tawk_LoadStart|TAWK_|embed\.tawk/i;

function scanTextForRepoMatches(
  cwd: string,
  files: string[],
): TawkCatalogMatch[] {
  const out: TawkCatalogMatch[] = [];
  for (const file of files) {
    const pathRel = rel(cwd, file);
    let body: string;
    try {
      body = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!TAWK_TOKEN_RE.test(body)) continue;

    const classified = classifyRepoPath(pathRel);
    if (classified) {
      out.push({
        classification: classified,
        path: pathRel,
        detail: "token match in file",
        blocking: isBlockingTawkClass(classified),
      });
      continue;
    }

    // Unclassified commercial / src hit — inspect further
    if (/src\/config\/products\.seed|products-nl|commercial\/pricing/.test(pathRel)) {
      out.push({
        classification: "ACTIVE_PRODUCT",
        path: pathRel,
        detail: "unexpected Tawk token in catalog config",
        blocking: true,
      });
      continue;
    }
    if (/sitemap\.ts$/.test(pathRel) && /tawk/i.test(body)) {
      out.push({
        classification: "SEO",
        path: pathRel,
        detail: "Tawk token in sitemap source",
        blocking: true,
      });
      continue;
    }
    // Deny-path consumers (import blocklist only) — non-blocking cleanup
    if (
      /isLegacyTawk|LEGACY_TAWK_|denyLegacyTawk|tawk-legacy-blocklist/.test(body) &&
      !/embed\.tawk|Tawk_API|Tawk_LoadStart/.test(body)
    ) {
      out.push({
        classification: "LEGACY_CLEANUP_MIGRATION",
        path: pathRel,
        detail: "fail-closed deny reference (no runtime widget)",
        blocking: false,
      });
      continue;
    }

    out.push({
      classification: "TECHNICAL_RUNTIME",
      path: pathRel,
      detail: "unclassified Tawk token — treated as runtime risk",
      blocking: true,
    });
  }
  return out;
}

export function scanSeedAndConfig(cwd = process.cwd()): TawkCatalogMatch[] {
  const matches: TawkCatalogMatch[] = [];

  for (const p of seedProducts) {
    if (isLegacyTawkCatalogOffering(p) || isLegacyTawkProduct(p)) {
      const archived = p.status === "ARCHIVED";
      matches.push({
        classification: archived ? "ARCHIVED_PRODUCT" : "ACTIVE_PRODUCT",
        path: "src/config/products.seed.ts",
        detail: `seed product ${p.slug} (${p.status})`,
        blocking: !archived,
      });
    }
    if (isLegacyTawkProductSlug(p.slug) && p.status !== "ARCHIVED") {
      matches.push({
        classification: "PRODUCT_SLUG",
        path: "src/config/products.seed.ts",
        detail: `slug=${p.slug}`,
        blocking: true,
      });
    }
    if (
      containsTawkBrandMarker(p.seoTitle) ||
      containsTawkBrandMarker(p.seoDescription)
    ) {
      matches.push({
        classification: "SEO",
        path: "src/config/products.seed.ts",
        detail: `SEO on ${p.slug}`,
        blocking: true,
      });
    }
  }

  for (const c of seedCategories) {
    if (
      isLegacyTawkCategorySlug(c.slug) ||
      containsTawkBrandMarker(c.name) ||
      containsTawkBrandMarker(c.description)
    ) {
      matches.push({
        classification: "CATEGORY",
        path: "src/config/products.seed.ts",
        detail: `category ${c.slug}`,
        blocking: true,
      });
    }
  }

  for (const item of commercialCatalog) {
    if (
      isLegacyTawkProductSlug(item.slug) ||
      containsTawkBrandMarker(item.nameEn) ||
      containsTawkBrandMarker(item.nameNl)
    ) {
      matches.push({
        classification: "ACTIVE_PRODUCT",
        path: "src/config/commercial/pricing.ts",
        detail: `commercial ${item.slug}`,
        blocking: true,
      });
    }
  }

  for (const [slug, copy] of Object.entries(productsNl)) {
    if (
      isLegacyTawkProductSlug(slug) ||
      isLegacyTawkCatalogOffering({
        slug,
        name: copy.name,
        shortDescription: copy.shortDescription,
        fullDescription: copy.fullDescription,
        seoTitle: copy.seoTitle,
        seoDescription: copy.seoDescription,
        categoryName: copy.categoryName,
        features: [...copy.includedItems, ...copy.extensions],
      })
    ) {
      matches.push({
        classification: containsTawkBrandMarker(copy.seoTitle) ||
          containsTawkBrandMarker(copy.seoDescription)
          ? "SEO"
          : "ACTIVE_PRODUCT",
        path: "src/i18n/content/products-nl.ts",
        detail: `NL copy ${slug}`,
        blocking: true,
      });
    }
  }

  const sitemapPath = join(cwd, "src/app/sitemap.ts");
  if (existsSync(sitemapPath)) {
    const body = readFileSync(sitemapPath, "utf8");
    for (const slug of LEGACY_TAWK_PRODUCT_SLUGS) {
      if (body.includes(slug) || body.includes(`/shop/${slug}`)) {
        matches.push({
          classification: "SEO",
          path: "src/app/sitemap.ts",
          detail: `hardcoded shop route for ${slug}`,
          blocking: true,
        });
      }
    }
    if (/tawk/i.test(body)) {
      matches.push({
        classification: "SEO",
        path: "src/app/sitemap.ts",
        detail: "tawk token in sitemap source",
        blocking: true,
      });
    }
  }

  // Generic livechat marketing route must not be treated as Tawk product slug
  // (/solutions/livechat is allowed when brand-free).

  return matches;
}

export type DbTawkRow = {
  kind: "product" | "category" | "addon" | "translation";
  id?: string;
  slug?: string | null;
  name?: string | null;
  status?: string | null;
  internalSku?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive?: boolean | null;
};

export function classifyDbRows(rows: DbTawkRow[]): TawkCatalogMatch[] {
  const matches: TawkCatalogMatch[] = [];
  for (const row of rows) {
    if (row.kind === "category") {
      if (
        isLegacyTawkCategorySlug(row.slug) ||
        containsTawkBrandMarker(row.name)
      ) {
        matches.push({
          classification: "CATEGORY",
          path: "supabase:categories",
          detail: `id=${row.id} slug=${row.slug}`,
          blocking: true,
        });
      }
      continue;
    }
    if (row.kind === "addon") {
      if (
        isLegacyTawkAddon({
          slug: row.slug,
          name: row.name,
          description: row.shortDescription,
        }) &&
        row.isActive !== false
      ) {
        matches.push({
          classification: "ADDON",
          path: "supabase:product_addons",
          detail: `id=${row.id} slug=${row.slug}`,
          blocking: true,
        });
      } else if (
        isLegacyTawkAddon({
          slug: row.slug,
          name: row.name,
          description: row.shortDescription,
        })
      ) {
        matches.push({
          classification: "ARCHIVED_PRODUCT",
          path: "supabase:product_addons",
          detail: `inactive addon id=${row.id}`,
          blocking: false,
        });
      }
      continue;
    }

    const offering = isLegacyTawkCatalogOffering({
      id: row.id,
      slug: row.slug,
      name: row.name,
      internalSku: row.internalSku,
      shortDescription: row.shortDescription,
      fullDescription: row.fullDescription,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
    });
    if (!offering && !isLegacyTawkSku(row.internalSku)) continue;

    const archived =
      row.status === "ARCHIVED" ||
      row.status === "HIDDEN" ||
      row.isActive === false;

    if (
      containsTawkBrandMarker(row.seoTitle) ||
      containsTawkBrandMarker(row.seoDescription)
    ) {
      matches.push({
        classification: archived ? "ARCHIVED_PRODUCT" : "SEO",
        path: row.kind === "translation" ? "supabase:product_translations" : "supabase:products",
        detail: `SEO id=${row.id} slug=${row.slug}`,
        blocking: !archived,
      });
    }

    matches.push({
      classification: archived ? "ARCHIVED_PRODUCT" : "ACTIVE_PRODUCT",
      path:
        row.kind === "translation"
          ? "supabase:product_translations"
          : "supabase:products",
      detail: `${row.status ?? "unknown"} id=${row.id} slug=${row.slug}`,
      blocking: !archived,
    });

    if (isLegacyTawkProductSlug(row.slug) && !archived) {
      matches.push({
        classification: "PRODUCT_SLUG",
        path: "supabase:products",
        detail: `slug=${row.slug}`,
        blocking: true,
      });
    }
  }
  return matches;
}

export function runNoTawkCatalogScan(opts?: {
  cwd?: string;
  dbRows?: DbTawkRow[];
}): {
  matches: TawkCatalogMatch[];
  blockers: TawkCatalogMatch[];
  allowed: TawkCatalogMatch[];
} {
  const cwd = opts?.cwd ?? process.cwd();
  const matches: TawkCatalogMatch[] = [];

  matches.push(...scanSeedAndConfig(cwd));

  const roots = ["src", "public", "tests", "scripts", "docs", "supabase"].map(
    (d) => join(cwd, d),
  );
  const extra = ["package.json", "package-lock.json", ".env.example"].map((f) =>
    join(cwd, f),
  );
  const files = [
    ...roots.flatMap((d) => walkFiles(d)),
    ...extra.filter((f) => existsSync(f)),
  ];
  matches.push(...scanTextForRepoMatches(cwd, files));

  if (opts?.dbRows) {
    matches.push(...classifyDbRows(opts.dbRows));
  }

  // Deduplicate by classification+path+detail
  const seen = new Set<string>();
  const deduped: TawkCatalogMatch[] = [];
  for (const m of matches) {
    const key = `${m.classification}|${m.path}|${m.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(m);
  }

  const blockers = deduped.filter((m) => m.blocking);
  const allowed = deduped.filter((m) => !m.blocking);
  return { matches: deduped, blockers, allowed };
}

/** Pure helpers exported for unit tests */
export const __test = {
  isLegacyTawkProduct,
  isLegacyTawkProductSlug,
  isLegacyTawkAddon,
  isLegacyTawkCategorySlug,
  isLegacyTawkCatalogOffering,
  containsTawkBrandMarker,
  isLegacyTawkSku,
};
