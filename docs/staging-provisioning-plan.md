# Shared Staging Provisioning Plan — VDB Digital Platform

**Status:** PLAN READY FOR REVIEW — staging project **NOT CREATED**  
**Date:** 2026-07-22  
**Canonical HEAD:** `93ab6cc4e61c19da072fe41bba7361397bd8bed0`  
**Contract:** `vdb-backend-contract@0.1.0` / `schemaVersion=2026.07.22.freeze`  
**Role:** `CANONICAL_BACKEND_OWNER`

Related: `docs/staging-security-model.md`, `docs/staging-environment-contract.md`, `docs/staging-account-and-fixture-plan.md`, `docs/staging-cross-repository-execution-plan.md`, `docs/staging-reset-and-recovery.md`, `docs/staging-ci-gates.md`, `docs/staging-readiness-checklist.md`, `docs/staging-backend-gap-register.md`.

---

## 1. Proposed staging identity

| Field | Proposed value |
|-------|----------------|
| Display name | **VDB Digital Staging** |
| Internal environment-id | `vdb-staging` |
| Region | **eu-west-1** (same as production for latency/compliance parity) |
| Region rationale | Match production Auth/Storage latency and operator familiarity; isolation is by **projectref**, not region |
| Projectref | `<STAGING_PROJECT_REF_TBD>` — **must never equal** `nhsrdnjfsxfikfbdmdfj` |
| Staging URL placeholder | `https://<STAGING_PROJECT_REF_TBD>.supabase.co` |
| Web staging origin placeholder | `https://staging.vdbdigital.nl` (or Vercel preview URL explicitly allowlisted) |
| Project ownership | Platform owner (same org as production) |
| Billing ownership | Same org; separate from production budget line preferred |
| Access ownership | Owner + designated operators only |
| Who may apply migrations | **Only** VDB Digital 2.0 operators with explicit staging authorization |
| Who may manage secrets | Owner + CI secret store admins |
| Who may reset staging | Owner + two-person confirmation (see reset doc) |
| Break-glass | Documented owner recovery; revoke staging keys; never use production keys |

**Hard rules**

- Staging name must contain `Staging`
- `APP_ENV=staging` required on all clients
- Never reuse production projectref or credentials
- Detect environment via `APP_ENV` + allowlisted projectref denylist (`nhsrdnjfsxfikfbdmdfj`), not hostname alone
- `schemaVersion` / `contractVersion` must be verifiable (DB comment / `site_settings` / contract package — see drift plan)

---

## 2. Clean migration chain (local proof)

| Check | Result |
|-------|--------|
| Local `supabase_db_vdbdigital2` on 54322 | Present |
| `schema_migrations` count | **27** |
| Private Storage buckets | **6** (`public=false`) |
| Companion marker | Pure no-op `SELECT` (version `20260720132521`) |
| Locale columns | From `20260715190000_submission_locale.sql` (real migration) |
| Baseline markers | Documentation-only `SELECT`s — no DDL |
| Five production **history repairs** | **Not required** on empty staging — apply full SQL file order only |
| Checkout | Fail-closed (`CHECKOUT_ENABLED` false) |
| P05 activation | Separate; unset initially |

**Expected staging history after first apply:** all 27 local versions in file order (same as clean `db reset`), including markers. No `migration repair` on staging for the five production-only history alignments.

**CLEAN MIGRATION CHAIN: PASS** (proven against isolated local DB; staging not yet created).

---

## 3. Provisioning phases (exact order)

| Phase | Name | Owner | Mutations | Stop if |
|-------|------|-------|-----------|---------|
| A | Plan review | Owner + leads | None | Gaps block critical scenarios |
| B | Explicit auth to create project | Owner | Written authorization | Missing auth message |
| C | Project creation | Owner | Create staging only | Wrong name/region/org |
| D | Identity verification | Operator | Read-only | ref = production |
| E | Secret separation | Operator | Staging secrets only | Any prod secret copied |
| F | Canonical migrations | Canonical repo | Apply SQL chain | Any migration fail |
| G | Schema/RLS/Storage verify | Canonical | Read-only + verifiers | Bucket/RLS fail |
| H | Contract publication | Canonical | Publish `0.1.0` artefact | Drift tooling missing |
| I | Auth configuration | Operator | Staging Auth URLs | Prod callback used |
| J | Test accounts | Operator | Staging Auth users | Real PII |
| K | Fixtures | Canonical scripts | Staging data | Prod dump |
| L | Web staging connect | Canonical | Env only | Prod credentials |
| M | Partner staging connect | Partner | Env only | Schema gaps unacked |
| N | Mobile staging connect | Mobile | Publishable only | Service role present |
| O | Cross-repo scenarios 1–10 | All | Staging mutations | Scenario fail |
| P | Negative RLS/security | All | Staging | Isolation fail |
| Q | Evidence freeze | Canonical | Docs only | Secrets in evidence |
| R | Staging readiness verdict | Owner | None | Incomplete checklist |

**This preflight ends at phase A.** Phases B+ require separate authorization.

---

## 4. Sibling freeze references

| Repo | HEAD | Local id | Ports |
|------|------|----------|-------|
| Canonical | `93ab6cc…` | `vdbdigital2` | 54320–54324, 54327 |
| Mobile | `04ecde7…` | `vdb-digital-mobile-local` | 54521–54524 |
| Partner | `31649ea…` | `vdb-partners` | 54421–54424, 54427 |

---

## 5. Non-claims

- Staging project **not** created  
- Production **not** modified  
- Partner/commission schema **not** invented in this plan — see gap register  
- Production apply **not** authorized  
