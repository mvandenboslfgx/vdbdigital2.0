# Catalog admin migration audit

**Audited file:** `supabase/migrations/20260716200000_catalog_admin.sql`  
**Hygiene date:** 2026-07-16  
**Action:** No silent edits to the original migration (may already exist in forks/PRs). Hardening via forward-only `20260716210000_catalog_admin_hardening.sql`.

## Independence

| Dependency | Status |
|------------|--------|
| `initial_schema` / phase2/3/6 products & categories | Required |
| P0.5 payment migrations (`202607160*`) | **Not required** |
| Mollie / webhook RPCs | None |

## Schema summary

| Area | Assessment |
|------|------------|
| Tables | `product_translations`, `product_media`, `product_addons`, `product_addon_links` + ALTER products/categories |
| Enums | Adds `REVIEW`/`HIDDEN`; creates `price_mode`, `price_approval_status`, `legal_approval_status` |
| Defaults | Fail-closed: `legal_status=NOT_REVIEWED`, `price_status=DRAFT`, `publication_ready=false` |
| Optimistic concurrency | `products.version` INT NOT NULL DEFAULT 1 |
| Legal fields | `legal_status`, `legal_approved_by/at`, `legal_terms_version`, `legal_internal_note` |
| RLS | Enabled + deny-all for anon/authenticated on new tables |
| Grants | Service role bypasses RLS (admin path); no PUBLIC grants added |
| Audit | Application-level `writeAuditLog` (existing `audit_logs`) — no DB trigger |
| Storage | Path column only in v1; bucket in `20260716230000` |

## Gaps closed by forward migrations

| Gap | Forward file |
|-----|----------------|
| Unique (locale, slug) | `20260716210000` |
| Unique `storage_path` | `20260716210000` |
| MIME check constraint | `20260716210000` |
| `version >= 1` check | `20260716210000` |
| Contract verifier RPC | `20260716220000` |
| Storage bucket + deny policies | `20260716230000` |

## Risks

| Risk | Mitigation |
|------|------------|
| Enum `ADD VALUE` lock | Prefer dry-run; additive only |
| Existing NULL commercial fields | Defaults applied on ADD COLUMN |
| Slug mismatch shop vs commercial | Alignment report; no auto-link |
| Rollback | Forward-only; restore from backup |

## Do not apply yet

Keep `CHECKOUT_ENABLED=false` and `P05_MIGRATION_APPLIED` unset until a separate catalog dry-run gate passes.
