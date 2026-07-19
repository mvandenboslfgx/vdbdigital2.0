# Production Migration & Deployment Readiness — Evidence Template

Fill after a **read-only** production readiness gate. Never paste secrets, tokens, connection strings, PII, or Storage object contents.

## Meta

| Field | Value |
|-------|--------|
| Date (local) | |
| Date (UTC) | |
| Git HEAD (full) | |
| Tag on HEAD | |
| Branch | |
| Worktree | clean / dirty |
| Linked project ref | `nhsrdnjfsxfikfbdmdfj` (must match) |
| Project name | vdb nieuw |
| Region | eu-west-1 |
| Remote status | ACTIVE_HEALTHY / other |
| Org plan | free / pro / team / enterprise |
| Supabase CLI | |
| Docker | |
| Local `project_id` | |
| `CHECKOUT_ENABLED` effective | false |
| `P05_MIGRATION_APPLIED` | unset |
| Migration file count | |

## 1. Preflight

| Check | Result |
|-------|--------|
| Correct project ref | PASS / FAIL |
| Worktree clean | PASS / FAIL |
| Login + link | PASS / FAIL |
| Local Supabase up | PASS / FAIL |
| Target DB unambiguous | PASS / FAIL |

Preflight verdict: `PASS` / `BLOCKED — preflight failed`

## 2. Backup / PITR

| Check | Exact label |
|-------|-------------|
| Daily backups | `BACKUP VERIFIED` / `BACKUP NOT VERIFIED` |
| PITR | `PITR VERIFIED` / `PITR NOT AVAILABLE` |
| Restore procedure | `RESTORE PROCEDURE VERIFIED` / `RESTORE PROCEDURE NOT VERIFIED` |
| Retention / last success | (metadata only) |
| Operator action required | yes / no — describe without executing |

## 3. Migration inventory

| Version (local) | Filename | Class | Remote | Data mig | Schema | RLS | Auth | Storage | Downtime | Lock | Rollback | Verifier |
|-----------------|----------|-------|--------|----------|--------|-----|------|---------|----------|------|----------|----------|
| | | REMOTE_APPLIED / LOCAL_ONLY_EXPECTED / MISSING_REMOTE / UNEXPECTED_REMOTE / CHECKSUM_MISMATCH / ORDERING_RISK / DESTRUCTIVE_RISK / REVIEW_REQUIRED | | | | | | | | | | |

Remote history versions (as recorded):

```text

```

## 4. Remote schema snapshot (metadata only)

| Object | Count / notes |
|--------|----------------|
| public tables | |
| views | |
| functions/RPCs | |
| enums | |
| indexes | |
| constraints | |
| triggers | |
| policies (public) | |
| policies (storage) | |
| storage buckets | |
| extensions | |
| cron / webhooks / realtime | |

Dump artifacts (gitignored paths only):

```text

```

## 5. Local clean-install

| Check | Result |
|-------|--------|
| `supabase db reset` from empty | PASS / FAIL |
| Seeds required | none / listed |
| DB verifiers | PASS / FAIL |
| Manual steps required | yes / no |
| Migration order OK | yes / no |
| Existing migrations unmodified | yes / no |

Blockers (if any):

```text

```

## 6. Production-upgrade dry-run (local only)

Baseline: remote schema(+anon data) → apply missing local migrations in isolated DB.

| Migration | Result |
|-----------|--------|
| | PASS / FAIL / WARNING / NOT TESTED |

Overall dry-run: PASS / FAIL / WARNING

Notes (constraints, enums, NOT NULL, FK, RLS, legacy catalog):

```text

```

## 7. Data compatibility (remote read-only counts)

| Check | Count / status | Remediation if blocker |
|-------|----------------|------------------------|
| products / categories | | |
| null future NOT NULL | | |
| duplicate slugs / emails | | |
| invalid enums | | |
| orders / payments | | |
| Tawk-related | | |
| storage objects | | |

## 8. Auth production config (read-only)

| Item | Status |
|------|--------|
| Site URL | CONFIGURED / MISSING / INCORRECT / NOT ACCESSIBLE / REVIEW REQUIRED |
| Redirect allowlist | |
| Confirm / reset / invite redirects | |
| OAuth providers | |
| SMTP | |
| Email templates | |
| CAPTCHA / MFA / JWT | |
| Custom domain | |
| localhost/staging redirects | |

## 9. Storage production config

| Bucket | Remote exists | Public? | Size/MIME | Policies | Later apply plan |
|--------|---------------|---------|-----------|----------|------------------|
| product-media | | | | | |
| customer-documents | | | | | |
| project-files | | | | | |
| quote-documents | | | | | |
| invoice-documents | | | | | |
| support-attachments | | | | | |

## 10. Environment & secrets contract (names only)

| Variable | Present | Notes |
|----------|---------|-------|
| NEXT_PUBLIC_SUPABASE_URL | | ref must match |
| publishable/anon key | | |
| SUPABASE_SECRET_KEY (server-only) | | |
| CHECKOUT_ENABLED | | must be false/unset |
| P05_* | | must be unset for deploy |
| Mollie / Resend / origins | | |

No secret values in evidence.

## 11. Checkout / payment fail-closed

| Check | Result |
|-------|--------|
| CHECKOUT_ENABLED effective false | |
| P05_MIGRATION_APPLIED unset | |
| Order POST fail-closed | |
| No Mollie live | |
| No pay CTA / invoice “Betaal nu” | |

## 12. Build & application gate

| Command | Result | Notes |
|---------|--------|-------|
| npm ci | | |
| npm run lint | | |
| npm run typecheck | | |
| npm test | | counts |
| npm run test:access-control | | counts |
| npm run build | | |
| npm run catalog:verify-no-tawk | | |
| npm run audit:supabase-full | | |

## 13. Database verifiers

| Command | Result |
|---------|--------|
| db:verify-p0-payments | |
| db:verify-auth-portal | |
| db:verify-project-management | |
| db:verify-documents-storage | |
| db:verify-quotes-acceptance | |
| db:verify-invoices-financial | |

## 14. Smoke-test plan (post-deploy only — not executed here)

Public / Auth / Admin / Portal / Security checklist attached: yes / no

## 15. Deployment runbook

Ordered steps 1–14 documented: yes / no  
Separated: DB apply / Storage / Auth / Vercel / operator flags

## 16. Rollback & stop criteria

Hard stops listed: yes / no  
Non-reversible migrations listed: yes / no

## 17. Readiness verdict

Exact one of:

- `PRODUCTION MIGRATION GATE PASS`
- `PRODUCTION MIGRATION GATE CONDITIONAL PASS`
- `PRODUCTION MIGRATION GATE FAIL`
- `PRODUCTION MIGRATION GATE BLOCKED`

### Confirmations (required)

```text
De productieomgeving is uitsluitend read-only onderzocht.
Er zijn geen remote migraties toegepast.
Er is geen Storage- of Auth-configuratie gewijzigd.
Er is geen applicatiedeployment uitgevoerd.
CHECKOUT_ENABLED=false.
P05_MIGRATION_APPLIED niet gezet.
Geen Mollie-livepayment uitgevoerd.
Supabase isolation audit blijft PASS.
De volgende stap is uitsluitend een expliciet goedgekeurde productieapply,
wanneer de readiness gate PASS of geaccepteerde CONDITIONAL PASS is.
```

## Blockers & operator actions

| # | Blocker | Owner | Required before apply |
|---|---------|-------|------------------------|
| | | | |
