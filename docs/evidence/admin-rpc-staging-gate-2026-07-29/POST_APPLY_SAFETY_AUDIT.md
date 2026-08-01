# Owner RC4 — Post-Apply Safety Audit

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Audit date (UTC):** 2026-07-29
**Mode:** READ-ONLY (no new migrations, staging writes, seeds, contract bumps, commits, pushes, production writes, or Mobile changes)

**Linked CLI project-ref during audit:** `qzekuvmgfekzsowdecyk` (staging)
**Production denylist ref:** `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`) — read-only MCP only
**Owner HEAD:** `a593e5d395fc7b90994c5cb2e8554cd241c48706` (`phase/shared-partner-backend`)

---

## Verdict

```text
OWNER RC4 POST-APPLY SAFETY BLOCKED
```

**Blocking finding:** on staging, internal helpers `admin_idempotency_get` / `admin_idempotency_put` have `EXECUTE` for role `authenticated` (ACL includes `authenticated=X/postgres`). Local DB after reset correctly leaves ACL as `{postgres=X/postgres}` only. Migration `20260729120000` only `REVOKE … FROM PUBLIC` and does **not** revoke `authenticated`, so cloud default privileges re-exposed the helpers. `verify_admin_control_surface_contracts()` still reports 31/31 and does not cover this grant gap.

No further staging writes in this audit. Repair requires a **new authorized** additive hardening migration (not performed here).

---

## 1. No new writes (this audit)

Confirmed not executed during this post-apply audit:

- no new migration / staging apply / seed / contract generation / commit / push
- no production SQL that mutates schema or data
- no commission/suspend mutation tests
- no Mobile / APK work

---

## 2. Exact staging-apply chronology (pre stop-order)

Reconstructed from Cursor terminal metadata + gate evidence (timestamps UTC).

| # | When (UTC) | Command | CWD | Linked ref | Exit | Notes |
|---|---|---|---|---|---|---|
| 1 | ~2026-07-29T01:16 | `npx supabase migration fetch --linked` | `C:\Users\XXX\vdbdigital2.0` | `qzekuvmgfekzsowdecyk` | 0 | Overwrote local migration files with remote copies; introduced three remote-only `20260728*` files |
| 2 | soon after #1 | `git checkout HEAD -- supabase/migrations/` + re-copy three remote-only files | same | staging | 0 | Restored tracked migrations to HEAD; kept staging-only `20260728*` |
| 3 | 2026-07-29T01:40:27 → 01:43:24 (~177s) | `npx supabase db reset --local` | same | linked staging but `--local` only | **0** | Applied through `20260729120100` on local Docker DB |
| 4 | after local matrix PASS (~01:43–01:54 window) | `npx supabase db push --linked --yes` | same | `qzekuvmgfekzsowdecyk` | **0** | Applied RC4 to staging; evidenced by remote migration list + tip + verify |
| 5 | 2026-07-29T01:54:32 | `npx supabase db query --linked` verify + `migration list --linked` | same | staging | 0 | verify 31/31; remote tip `20260729120100` |

`schema_migrations` on both local and staging has columns `version`, `name`, `statements` only — **no `applied_at` / `inserted_at`**. Apply wall-clock is therefore terminal/session evidence, not a DB timestamp.

### Migration tips

| Surface | Tip before this session’s RC4 | Tip after |
|---|---|---|
| Staging | `20260728210000` (`partner_catalog_coupling`) | `20260729120100` |
| Local (files, pre-fetch) | file tip ≈ `20260725120300` (+ missing `20260728*`) | after reset: `20260729120100` |
| Production (read-only) | n/a | tip `20260728213625` (`fix_create_partner_lead_eligibility`) — **no** `2026072912*` |

### RC4 migrations applied

| File | SHA-256 | Target | Local present before apply | Staging present before apply | Staging present after | Depends on |
|---|---|---|---|---|---|---|
| `20260729120000_admin_control_surface_rc4.sql` | `BCA30C9C10629921DC2CF58E93A082A2005031D9C4CFC9DC22FE48B160ECE469` | staging (+ local) | yes (authored this session) | no | yes | prior partner/portal surface through `20260728210000` |
| `20260729120100_admin_control_surface_rc4_rpcs.sql` | `6D4FDC19C636B46D1A187BFDC302F9DCE4099D6C596BFE76B8E050F79C02D610` | staging (+ local) | yes | no | yes | `20260729120000` |

**Objects created/changed (high level):** enum value `REJECTED` on `partner_commission_status`; table `admin_rpc_idempotency`; helpers `is_admin_or_owner`, `require_aal2`, `admin_idempotency_*`, `admin_require_reason`; ticket alias `transition_portal_support_ticket`; rewrite of `confirm_partner_sale` (PENDING commission, no ledger); staff RPCs dashboard/work_queue/commission/lifecycle/directory/settings/security + `verify_admin_control_surface_contracts`.

Fetched remote-only (already on staging before RC4; not re-applied as new content in push beyond history alignment):

| File | SHA-256 |
|---|---|
| `20260728090000_fix_partner_financial_summary_partner_id_ambiguity.sql` | `98EF1D47EB17522E5355E5E563C22933C3332BCEA812B5070E6548491FD7B7EB` |
| `20260728090100_partner_financial_summary_active_only.sql` | `A198B52D23688B0ABBD1B25B45A92A305650607E8EF3820B3053311CD5A3A047` |
| `20260728210000_partner_catalog_coupling.sql` | `4608CEE1191144C357A9DDB7D956CCC4AAC85F4417FACF6A40F3012C720BE111` |

---

## 3. Production safetycheck (read-only)

| Check | Result |
|---|---|
| Production project-ref | `nhsrdnjfsxfikfbdmdfj` |
| Production migration tip | `20260728213625` |
| RC4 versions `20260729120000` / `20260729120100` | **absent** (`SELECT … WHERE version LIKE '20260729%'` → `[]`) |
| RC4 RPC names listed | **absent** (`[]`) |
| Table `admin_rpc_idempotency` | **absent** (`has_admin_rpc_idempotency=false`) |
| Enum `partner_commission_status` includes `REJECTED` | **no** (PENDING…ADJUSTED only) |
| Product data mutations / grant/policy/deploy/alias changes from this Owner session | **none observed**; this audit issued only read SELECTs via MCP |

Staging has `REJECTED`; production does not — consistent with RC4 staging-only apply.

---

## 4. Staging object summary

Full per-object inventory: `STAGING_OBJECT_DIFF.md`.

Read-only controls this audit:

| Check | Result |
|---|---|
| RPC presence (RC4 set) | present on staging + local |
| `verify_admin_control_surface_contracts()` | staging **31 pass / 0 fail**; local same after reset |
| Anon EXECUTE `admin_dashboard_stats()` | **false** |
| Anon EXECUTE `approve_partner_commission(...)` | **false** |
| Anon SELECT `admin_rpc_idempotency` | **false** |
| Authenticated EXECUTE public admin RPCs | **true** (capability/AAL2 enforced inside SECURITY DEFINER) |
| Authenticated EXECUTE `admin_idempotency_get/put` | **true on staging — BLOCK** (false on local) |

No payout mutation RPCs newly activated; no state-changing commission/suspend tests run.

---

## 5. Contract status

| Item | Value |
|---|---|
| Working-tree contract | `vdb-backend-contract@0.2.0-rc.4` |
| `schemaVersion` | `2026.07.29.admin-control-surface-rc4` |
| Bundle path | `contracts/releases/vdb-backend-contract-0.2.0-rc.4/` (manifest, rpcs, enums, migration-manifest, types, checksums, …) |
| `docs/backend-contract.md` | points at rc.4 / admin-control-surface-rc4 |
| RC4 committed? | **No** — untracked/dirty working tree; `unpublished: true` in manifest |
| Contract vs staging RPCs | names/shapes aligned for delivered surface; **grant hardening for helpers diverges** (local contract/tests assume internal-only helpers) |
| Contract changes before stop-order | rc.4 bundle + `docs/backend-contract.md` update authored in same Owner session as staging push |

No new contract generation in this audit.

---

## 6–7. Lost WIP + working tree

See `LOST_WIP_ASSESSMENT.md`.
Git snapshot dumps: `_tmp_git_status.txt` (212 paths), `_tmp_git_diff_name_status.txt`, `_tmp_git_migrations_status.txt`.

Classification counts (approx from status short):

| Bucket | Count (approx) |
|---|---|
| RC4 implementation / gate artifacts | 6+ |
| Evidence under this gate | 16+ |
| Fetched staging `20260728*` | 3 |
| Pre-existing untracked `20260723*`–`20260725*` migrations | 10 |
| Unrelated pre-existing WIP | ~177 |

Tracked migrations remain HEAD-identical (prior integrity report). Unrelated WIP must **not** be bundled into a later RC4 commit.

---

## 8. Evidence artifacts

| File | Role |
|---|---|
| `POST_APPLY_SAFETY_AUDIT.md` | this document |
| `LOST_WIP_ASSESSMENT.md` | overwrite / dirty WIP recoverability |
| `STAGING_OBJECT_DIFF.md` | per-object classification |
| `MIGRATION_FETCH_INTEGRITY.md` | prior tracked-integrity PASS (superseded framing) |

---

## End state

```text
OWNER RC4 POST-APPLY SAFETY BLOCKED
```

**Required before staging testing may resume:** authorized additive revoke of `EXECUTE` on `admin_idempotency_get` / `admin_idempotency_put` from `PUBLIC`, `anon`, and `authenticated` on staging (matching local), plus verify coverage for helper grants. Production remains untouched.
