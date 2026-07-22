# Shared Backend Architecture — VDB Digital Platform

**Status:** ARCHITECTURE FREEZE (documentation)  
**Date:** 2026-07-22  
**This repository role:** `CANONICAL_BACKEND_OWNER`  
**Git HEAD (at authorship):** `1544d445d1d05c700b59360bdd4015afb0727bb8`  
**Tag:** `production-database-apply-ready`

---

## Intent

Three separate product repositories share one central Supabase backend in **staging** and **production**. They keep **fully isolated local Supabase stacks** during development so Docker, ports, volumes, and agents cannot destroy each other’s work.

```text
VDB Digital 2.0 (website + web admin) ──┐
VDB Digital Mobile (Android/iOS) ───────┼── same Auth / DB / Storage / Realtime / RPCs
VDB Partner Portal / Affiliate ─────────┘   (staging + production only)
```

Coupling is **not** “one monorepo” and **not** “three production databases”. Coupling is **shared identity + shared data + shared server rules**.

---

## Repositories

| Product | Repository | Role |
|---------|------------|------|
| Website + web admin | **VDB Digital 2.0** (this repo) | `CANONICAL_BACKEND_OWNER` |
| Mobile app | VDB Digital Mobile | `MOBILE_CLIENT` |
| Affiliate / Partner Portal | VDB Partner Portal | `PARTNER_CLIENT` |

Clients consume the backend; they do **not** own production migrations.

---

## Environment model

| Environment | Backend topology |
|-------------|------------------|
| **local** | Each repo runs its **own** Supabase stack (unique `project_id`, ports, volumes) |
| **staging** | **One** shared VDB staging Supabase project for all three clients |
| **production** | **One** shared VDB production Supabase project (`vdb nieuw` / `nhsrdnjfsxfikfbdmdfj`) |

See `docs/environment-matrix.md`.

---

## Canonical ownership (this repo)

VDB Digital 2.0 alone owns the definitive:

- Supabase migrations under `supabase/migrations/`
- RLS and Storage policies
- Database functions / financial RPCs
- Edge Functions (when introduced)
- Mollie webhook implementation for the platform
- Shared TypeScript database types and backend contracts

Mobile/Partner may **propose** schema changes; they must not apply remote production migrations independently. Process: `docs/migration-ownership.md`.

---

## Shared identity

All clients use the same Supabase Auth (`auth.users`) and role model (target):

```text
customer | partner_pending | partner | staff | admin | owner
```

No separate production auth system per frontend. RLS decides what each role may see.

Current website/admin implementation uses `admin_roles`, organization membership, and customer portal tables — partner roles are a **planned** extension of the same identity plane, not a second auth product.

---

## Shared domains (logical)

### Website ↔ Mobile

profiles · projects · milestones · conversations/messages · support · documents · quotes · invoices · payments · appointments · reviews

### Partner Portal ↔ Mobile

partner applications/profiles/codes · leads · sales · commissions · payouts · marketing assets

### Admin (web)

approvals · project updates · quotes · payments · commissions · payouts · audit logs

**Rule:** one business record set — never “mobile commissions” vs “affiliate commissions”.

Existing portal table names in this repo (e.g. `portal_projects`, `portal_quotes`) are the current canonical schema names; future partner tables land here via owned migrations.

---

## Hard isolation rules (local)

**Forbidden for agents/operators in any repo:**

- Editing sibling repository files
- Stopping sibling Supabase/Docker containers
- Docker wildcards that affect other projects
- Killing global Node/PowerShell/Java processes belonging to siblings
- Claiming sibling ports
- Removing sibling volumes/networks
- Stopping sibling test harnesses

**On conflict:** report it; stop only **this** repo’s processes; change nothing outside this workspace.

Root cause of past agent wars: Mobile/Partner also binding default `54321`/`54322`.  
**Definitive fix:** reserved ports — Website `543xx`, Partner `544xx`, Mobile `545xx`.  
Isolation = unique `project_id` + those ports — **not** “stop the other stack”.  
See `docs/local-infrastructure-isolation.md`.

---

## Staging purpose

Local-only stacks cannot prove cross-client coupling. Staging must prove, with shared test users/data (never raw production copies without anonymization):

1. Customer registers on website → same account logs into Mobile  
2. Partner creates lead in Portal → admin sees it in web  
3. Commission/payout status identical in Portal and Mobile  
4. RLS blocks cross-tenant access  

See `docs/staging-integration-plan.md` and `docs/cross-repository-test-plan.md`.

---

## Production rules

Without explicit owner authorization: no remote migration, Edge deploy, live Mollie, production push, production seed, remote reset, Git push, or store upload.

Production DB apply for this website remains separately gated (see production apply manifest). Shared-backend freeze ≠ apply authorization.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| `docs/local-infrastructure-isolation.md` | Definitive ports; no sibling kills |
| `docs/backend-change-proposal-template.md` | Client → owner proposal form |
| `docs/repository-responsibilities.md` | Who owns what |
| `docs/environment-matrix.md` | Local / staging / production matrix |
| `docs/backend-contract.md` | Versioned contract surface |
| `docs/staging-integration-plan.md` | Shared staging setup |
| `docs/cross-repository-test-plan.md` | Ten integration scenarios |
| `docs/migration-ownership.md` | Proposal → canonical migration flow |
