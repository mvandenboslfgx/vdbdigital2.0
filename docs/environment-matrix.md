# Environment Matrix — VDB Digital Platform

**This repository role:** `CANONICAL_BACKEND_OWNER`  
**Date:** 2026-07-22

---

## Summary

| | Local | Staging | Production |
|--|-------|---------|------------|
| Backend instances | **3** (one per repo) | **1** shared | **1** shared |
| Auth users | Isolated per stack | Shared test users | Real users |
| Schema source of truth | Each repo may reset local DB | Migrations from **this** repo | Migrations from **this** repo |
| Cross-client E2E | Not required | **Required** | Controlled / rare |
| Real customer data | No | Anonymized only | Yes |

---

## Definitive local port matrix

| Repository | Project-id | API | DB | Studio | Mail |
|------------|------------|----:|---:|-------:|-----:|
| VDB Digital 2.0 | `vdbdigital2` | 54321 | 54322 | 54323 | 54324 |
| VDB Partner Portal | `vdb-partners` | 54421 | 54422 | 54423 | 54424 |
| VDB Digital Mobile | `vdb-digital-mobile-local` | 54521 | 54522 | 54523 | 54524 |

See `docs/local-infrastructure-isolation.md`.

## This repo — local

| Item | Value / rule |
|------|----------------|
| `project_id` | `vdbdigital2` |
| Ports (pinned in `supabase/config.toml`) | API `54321`, DB `54322`, Studio `54323`, Mail `54324` |
| Extra in-band | Shadow `54320`, Analytics `54327` |
| Reset allowed | Yes — local only (`npx supabase db reset`) |
| Linked remote | `nhsrdnjfsxfikfbdmdfj` for **read-only** CLI inventory when needed |
| App URL (typical) | `http://localhost:3000` |

**Isolation rule:** Never stop sibling stacks to free ports. Mobile must use `545xx` (not `54321`/`54322`). Partner must use `544xx`.

---

## Staging (planned shared project)

| Item | Status |
|------|--------|
| Project name (proposed) | `VDB Digital Staging` |
| Project ref | **UNPROVEN / NOT CREATED in this freeze** — fill when provisioned |
| Used by | Website + Mobile + Partner |
| Client env | `APP_ENV=staging`, shared `SUPABASE_URL`, shared publishable/anon key |
| Server secrets | Per-app secret stores; **never** embed service role in Mobile |
| Data | Synthetic or anonymized — **no** raw production dump without anonymization plan |
| Migrations | Applied only from VDB Digital 2.0 canonical migrations |

Until staging exists, cross-repo integration scenarios remain **documented but UNPROVEN**.

---

## Production

| Item | Value |
|------|--------|
| Name | `vdb nieuw` |
| Ref | `nhsrdnjfsxfikfbdmdfj` |
| Region | `eu-west-1` |
| Canonical origin (web) | `https://vdbdigital.nl` |
| Clients | Website, Mobile, Partner (when live) |
| Mutation gate | Explicit owner authorization; separate from this architecture freeze |
| Checkout / Mollie live | Fail-closed until separately authorized |

---

## Env var pattern (clients)

```env
APP_ENV=local|staging|production
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # or legacy ANON
# Server only (web/partner server):
SUPABASE_SECRET_KEY=...
```

Mobile uses only publishable keys + user JWT. Never ship `SUPABASE_SECRET_KEY` / service role in the app binary.

Feature flags that affect commerce (`CHECKOUT_ENABLED`, `P05_MIGRATION_APPLIED`) remain owned by this platform and default fail-closed.

---

## What “local apart, staging/production together” means

- Developers may run all three products on one machine **without** sharing a Docker DB.
- QA proves real coupling only on **staging**.
- Production remains one backend; three frontends.
