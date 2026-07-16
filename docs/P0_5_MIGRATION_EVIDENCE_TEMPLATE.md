# P0.5 Operator Evidence — Migration Verification

Copy this template after a successful verifier run. Store in a secure ops location or under `docs/evidence/` (gitignored secrets never belong here).

```env
CHECKOUT_ENABLED=false
```

Do **not** set `P05_MIGRATION_APPLIED=1` until this evidence shows **PASS** for schema **and** behavioral mode.

---

## Metadata

| Field | Value |
| --- | --- |
| Date (UTC) | |
| Operator | |
| Target project / environment | staging / preview / production (circle one) |
| Supabase project ref (non-secret) | |
| Git commit | |
| Backup / PITR confirmed before migrate | yes / no |
| Migrations applied (in order) | `20260716000000` → `20260716010000` → `20260716020000` |
| Command | `P05_VERIFY_BEHAVIORAL=1 P05_VERIFY_WRITE_EVIDENCE=1 npm run db:verify-p0-payments` |
| Verifier exit code | |
| Overall result | PASS / FAIL |

---

## Required outcomes

| Gate | Pass criteria |
| --- | --- |
| Repo migration files | All three SQL files present |
| Enum `payment_status` | Includes AUTHORIZED, REFUNDED, CHARGED_BACK |
| Columns | idempotency_key, customer_type, payment_init_status, provider_status, processing_status, … |
| Indexes / constraints | idempotency unique index; webhook provider+external_event unique |
| RPC signatures | `check_rate_limit`, `create_order_with_items`, `apply_mollie_payment_update`, `p05_verify_payment_contracts` |
| SECURITY DEFINER + search_path=public | All payment RPCs |
| EXECUTE grants | service_role only (not PUBLIC/anon/authenticated) |
| RLS | rate_limit_buckets deny anon + authenticated |
| Behavioral rate limit | Cap holds under serial + client concurrency |
| Behavioral webhook | FAILED reclaim → PAID; duplicate paid already_processed; refund after PAID |
| Existing data | No NULL payment_init_status / processing_status |

---

## Paste verifier output

```text
(paste full console output here — redact URLs with tokens if any)
```

---

## Operator attestation

I confirm:

- [ ] Backup / PITR was available before applying migrations
- [ ] Migrations were applied in chronological order
- [ ] Verifier RESULT is PASS with `P05_VERIFY_BEHAVIORAL=1`
- [ ] No secrets or customer PII are stored in this file
- [ ] `CHECKOUT_ENABLED` remains false
- [ ] Only after the above: `P05_MIGRATION_APPLIED=1` may be set for the release-gate CLI

Signature / date: ____________________
