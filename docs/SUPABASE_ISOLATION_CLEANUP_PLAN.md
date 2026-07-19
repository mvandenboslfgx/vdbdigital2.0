# Supabase Isolation Cleanup Plan

> Generated from the isolation audit. **No cleanup executed.** Human approval required per item.

## Context

- Approved project: `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`, `eu-west-1`)
- Audit mode: read-only
- Approved portfolio cases (not platform data): Vermeulen Bouwservice, Grill Gasten, TrustBooker
- TrustBooker remains “Binnenkort live” in marketing; never auto-approved as VDB platform schema/buckets/config

## Classification rules

| Brand | Org / product / cases | Platform / bucket / config |
|-------|------------------------|----------------------------|
| Vermeulen Bouwservice | `APPROVED_CASE` | not auto-approved |
| Grill Gasten | `APPROVED_CASE` | not auto-approved |
| TrustBooker | `APPROVED_CASE` | `FOREIGN_PROJECT_DATA` if found as platform pollution |
| Other foreign brands (Tvelio, KlusPro, …) | `AMBIGUOUS_REVIEW_REQUIRED` | `FOREIGN_PROJECT_DATA` |

## Findings requiring human review

| Object | Masked ID | Classification | Reason | Impact | Recommended action | Dependencies | Backup | Forward-only migration | Approval | Rollback |
|--------|-----------|----------------|--------|--------|--------------------|--------------|--------|------------------------|----------|----------|
| Remote not linked | n/a | `REVIEW_REQUIRED` | `supabase link` not set for approved ref | Remote Management/DB inventory skipped in CLI | Link read-only when ready; re-run `audit:supabase-full` | CLI login | n/a | n/a | OWNER | unlink |
| Remote public schema (MCP read-only 2026-07-19) | ~20 base tables | `REMOTE_LAG` | No portal/quotes/invoices/documents tables remotely yet; storage.buckets rows=0 | Local Docker ahead of remote | Plan controlled migrate later — **not now** | App local foundations | DB dump before migrate | pending migrations | OWNER | Restore dump |
| Remote Auth/profiles | profiles=1, admin_roles=1 | `VDB_CORE` | Minimal staff bootstrap only | Low | Keep monitoring | n/a | n/a | n/a | n/a | n/a |
| Co-located local TrustBooker Docker stack | containers `supabase_*_trustbooker` | `FOREIGN_PROJECT` (separate product) | Separate local stack beside `supabase_*_vdbdigital2` | None if DBs stay isolated | Keep stacks separate; audits target `supabase_db_vdbdigital2` only | Portfolio case work | n/a | n/a | n/a | n/a |
| Legacy `customers` table | count varies | `VDB_LEGACY` | Pre-organizations customer model may still exist | Schema noise after portal org model | Align later; do not delete without plan | leads/orders may FK | dump | portal foundation migrate | OWNER | re-create |

## Explicit non-actions

- Do **not** auto-delete organizations or cases named after other companies without proof they are platform pollution.
- Do **not** treat Grill Gasten / TrustBooker / Vermeulen as approved **platform** data.
- Do **not** run migration repair or linked reset.
- Do **not** deploy cleanup migrations until this plan is approved item-by-item.
- Do **not** delete or mutate remote Auth/Storage/DB from this audit.
