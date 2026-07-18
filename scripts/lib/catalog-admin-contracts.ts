/**
 * Catalog admin contract catalog (pure — no DB I/O).
 */

export const CATALOG_ADMIN_MIGRATION_FILES = [
  "supabase/migrations/20260716200000_catalog_admin.sql",
  "supabase/migrations/20260716210000_catalog_admin_hardening.sql",
  "supabase/migrations/20260716220000_catalog_verify_admin_contracts.sql",
  "supabase/migrations/20260716230000_catalog_admin_storage.sql",
] as const;

/** Schema/data checks that the SQL RPC must return for a full PASS */
export const REQUIRED_CATALOG_CONTRACT_CHECKS = [
  "table:products",
  "table:categories",
  "table:product_translations",
  "table:product_media",
  "table:product_addons",
  "table:product_addon_links",
  "enum:product_status",
  "enum:price_mode",
  "enum:legal_approval_status",
  "enum:price_approval_status",
  "column:products.internal_sku",
  "column:products.price_mode",
  "column:products.version",
  "column:products.legal_status",
  "column:products.price_status",
  "column:products.publication_ready",
  "column:products.audience_b2b",
  "column:products.audience_b2c",
  "column:products.legal_approved_by",
  "column:products.legal_approved_at",
  "column:categories.is_active",
  "column:categories.name_nl",
  "column:product_translations.locale",
  "column:product_media.storage_path",
  "column:product_media.mime_type",
  "index:idx_products_internal_sku",
  "index:idx_product_translations_locale_slug",
  "index:idx_product_media_storage_path",
  "constraint:product_translations_product_locale",
  "fk:product_media.product_id",
  "fk:product_addon_links",
  "rls:product_translations.enabled",
  "rls:product_media.enabled",
  "rls:product_addons.enabled",
  "rls:product_addon_links.enabled",
  "policy:product_translations.deny_anon_auth",
  "policy:product_media.deny_anon_auth",
  "policy:product_addons.deny_anon_auth",
  "policy:product_addon_links.deny_anon_auth",
  "data:duplicate_sku",
  "data:duplicate_product_slug",
  "data:duplicate_translation_slug",
  "data:orphan_media",
  "data:orphan_translations",
  "data:orphan_addon_links",
  "data:recurring_marked_ready",
  "data:legal_without_price_approval",
  "data:fixed_without_price",
  "data:starting_from_without_price",
  "data:legal_fields_nonnull",
  "rpc:catalog_verify_admin_contracts.signature",
  "rpc:catalog_verify_admin_contracts.security_definer",
  "rpc:catalog_verify_admin_contracts.search_path",
  "rpc:catalog_verify_admin_contracts.no_public_execute",
  "rpc:catalog_verify_admin_contracts.service_role_execute",
] as const;

export type CatalogVerifyCheck = {
  name: string;
  ok: boolean;
  detail?: string;
};

export type CatalogVerifySummary = {
  ok: boolean;
  failed: CatalogVerifyCheck[];
  missingRequired: string[];
  checks: CatalogVerifyCheck[];
};

export function evaluateCatalogContractResults(
  rows: CatalogVerifyCheck[],
): CatalogVerifySummary {
  const byName = new Map(rows.map((r) => [r.name, r]));
  const missingRequired = REQUIRED_CATALOG_CONTRACT_CHECKS.filter(
    (name) => !byName.has(name),
  );
  const failed = rows.filter((r) => !r.ok);

  for (const name of missingRequired) {
    failed.push({
      name,
      ok: false,
      detail: "required check missing from verifier output",
    });
  }

  return {
    ok: failed.length === 0 && missingRequired.length === 0,
    failed,
    missingRequired: [...missingRequired],
    checks: rows,
  };
}

export function formatCatalogEvidenceBlock(
  summary: CatalogVerifySummary,
  meta: { environment: string; runAt: string; gitCommit?: string },
): string {
  const lines = [
    "# Catalog admin verification evidence",
    "",
    `- Environment: ${meta.environment}`,
    `- Run at: ${meta.runAt}`,
    `- Git commit: ${meta.gitCommit ?? "(unknown)"}`,
    `- Result: ${summary.ok ? "PASS" : "FAIL"}`,
    `- CHECKOUT_ENABLED: must remain false`,
    `- P05_MIGRATION_APPLIED: must remain unset`,
    "",
    "## Checks",
    "",
  ];
  for (const c of summary.checks) {
    lines.push(`- ${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  if (summary.failed.length > 0) {
    lines.push("", "## Failures", "");
    for (const f of summary.failed) {
      lines.push(`- ${f.name}: ${f.detail ?? "failed"}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
