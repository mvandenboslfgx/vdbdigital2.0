# Staging Integration Plan — Shared VDB Supabase

**Status:** PLAN — staging project not yet provisioned  
**Canonical migrations:** VDB Digital 2.0 only  
**Consumers:** Website, Mobile, Partner Portal  

**Superseding detail docs (2026-07-22 preflight):**  
`docs/staging-provisioning-plan.md` and siblings (`staging-security-model`, `staging-environment-contract`, `staging-account-and-fixture-plan`, `staging-cross-repository-execution-plan`, `staging-reset-and-recovery`, `staging-ci-gates`, `staging-readiness-checklist`, `staging-backend-gap-register`).

---

## Goal

One shared staging Supabase where all three frontends prove identity and data coupling **without** touching production (`nhsrdnjfsxfikfbdmdfj`).

---

## Provisioning checklist (owner)

1. Create Supabase project `VDB Digital Staging` (EU recommended).  
2. Record project ref (fill here when known): `________________`.  
3. From **this** repo: link staging separately from production (or use CI secrets) and apply **canonical** migrations only.  
4. Never point Mobile/Partner CLI `db push` at staging as schema owners — only consume.  
5. Create seed/anonymized fixtures (customers, one partner, one staff) — document passwords in a private operator vault, not git.  
6. Distribute to all three repos:

```env
APP_ENV=staging
SUPABASE_URL=<shared staging URL>
SUPABASE_PUBLISHABLE_KEY=<shared publishable>
# server apps only:
SUPABASE_SECRET_KEY=<per-app or shared server secret — never in mobile>
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.1.0
VDB_SCHEMA_VERSION=2026.07.22.freeze
```

7. Configure Auth redirect allowlists for:
   - staging web origin(s)
   - mobile deep links / auth callbacks
   - partner portal origin(s)

8. Configure Storage CORS and bucket policies from canonical migrations.  
9. Mollie: **test** keys only on staging; webhook URL points to staging web webhook.  
10. Confirm production link in this repo remains `nhsrdnjfsxfikfbdmdfj` and is not overwritten by staging link mistakes.

---

## What staging must prove

See `docs/cross-repository-test-plan.md` (scenarios 1–10).

Minimum green bar before mobile 20/20 device marathon against shared backend:

- [ ] Same user session works on web + mobile  
- [ ] Partner lead visible in admin web  
- [ ] Shared commission record (single row) visible in portal + mobile  
- [ ] RLS deny cross-org / cross-partner  
- [ ] Contract drift check fails a deliberate wrong `schemaVersion`

---

## Data rules

| Allowed | Forbidden |
|---------|-----------|
| Synthetic fixtures | Raw production DB restore without anonymization |
| Anonymized subsets with written plan | Live Mollie charges |
| Test-mode payments | Production Auth user mutations from staging tools |

---

## Local vs staging confusion prevention

| Symptom | Action |
|---------|--------|
| Agent stops “foreign” containers to free 54321 | **Forbidden** — siblings must use `544xx` / `545xx`; see `docs/local-infrastructure-isolation.md` |
| Mobile points `.env` at production | **Stop** — use staging or local only |
| Partner applies a migration remotely | **Stop** — open proposal in this repo |

---

## Exit criteria for this plan

Staging is **READY** when:

1. Project ref documented in this file and in all three repos’ env templates (no secrets).  
2. Canonical migrations applied once from VDB Digital 2.0.  
3. Cross-repo scenarios 1–10 have recorded PASS evidence.  
4. Production remains untouched by staging work.
