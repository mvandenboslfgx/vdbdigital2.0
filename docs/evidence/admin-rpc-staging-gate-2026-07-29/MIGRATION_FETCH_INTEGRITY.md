# Migration fetch integrity report

**Gate pause:** `OWNER ADMIN RPC IMPLEMENTATION IN PROGRESS — MIGRATION FETCH INTEGRITY CHECK REQUIRED`
**Captured:** 2026-07-29
**Policy this turn:** no staging write, no production action, no commit, no push, no contract bump, no local reset

## 1. Repository / branch / HEAD

| Item | Value |
| --- | --- |
| Repository | `C:/Users/XXX/vdbdigital2.0` |
| Branch | `phase/shared-partner-backend` |
| HEAD | `a593e5d395fc7b90994c5cb2e8554cd241c48706` |

## 2–4. Git status / diffs

- `git status --short`: large pre-existing dirty tree (marketing/UI/docs/etc.) + untracked migrations/contracts/evidence from RC3/RC4 work. **No tracked migration files are dirty.**
- `git diff --name-status` (tracked): many non-migration paths `M`; **zero** `supabase/migrations/*` tracked paths.
- `git diff --check`: only pre-existing non-migration noise (e.g. `.gitignore` blank line at EOF). **No migration whitespace/conflict markers.**

## 5. Tracked migrations touched by `migration fetch`

Fetch overwrote the full `supabase/migrations` directory. Tracked files that appeared dirty after fetch (then restored via `git checkout HEAD -- supabase/migrations/`):

31 tracked files from `20260714000000` … `20260724160000_mobile_compat_rc2.sql` (list in §6).

## 6. Byte identity vs HEAD (hard proof)

Method: `git hash-object <file>` == `git rev-parse HEAD:<file>` for each.

| Result | Count |
| --- | --- |
| MATCH | **31 / 31** |
| MISMATCH | **0** |
| MISSING | **0** |

`git diff HEAD -- supabase/migrations/` → **empty** (no tracked migration content drift).

Also: pre-fetch dirty WIP on `20260724160000_mobile_compat_rc2.sql` was discarded by restore-to-HEAD (immutable history preferred). Working tree for that file now equals HEAD blob `d0f84b72a7575b0259e80d8e2098838eda3496ae`.

## 7. Three remote-only migration files

| Filename | Version timestamp | Source project | SHA-256 | Why locally missing |
| --- | --- | --- | --- | --- |
| `20260728090000_fix_partner_financial_summary_partner_id_ambiguity.sql` | `20260728090000` | Staging `qzekuvmgfekzsowdecyk` (CLI `--linked` at fetch) | `98EF1D47EB17522E5355E5E563C22933C3332BCEA812B5070E6548491FD7B7EB` | Present on staging history; absent from local tree / local column empty before fetch |
| `20260728090100_partner_financial_summary_active_only.sql` | `20260728090100` | Staging `qzekuvmgfekzsowdecyk` | `A198B52D23688B0ABBD1B25B45A92A305650607E8EF3820B3053311CD5A3A047` | same |
| `20260728210000_partner_catalog_coupling.sql` | `20260728210000` | Staging `qzekuvmgfekzsowdecyk` | `4608CEE1191144C357A9DDB7D956CCC4AAC85F4417FACF6A40F3012C720BE111` | same |

All three are **untracked** additive files (not in HEAD).

## 8. Staging vs production provenance

- CLI linked project during fetch: **`qzekuvmgfekzsowdecyk`** (VDB Digital Staging).
- Staging schema_migrations includes `20260728090000`, `20260728090100`, `20260728210000`.
- Production (`nhsrdnjfsxfikfbdmdfj`) read-only migration list: has `20260728090000` / `20260728090100`, but catalog coupling is **different** history (`20260728192415_partner_catalog_coupling`, plus other `20260728192*` / `20260728213*` names) — **not** `20260728210000_partner_catalog_coupling`. Therefore the fetched `20260728210000_*` file is **staging-specific**, not a production pull.

## 9. Supabase CLI link

`supabase/.temp/project-ref` = `qzekuvmgfekzsowdecyk` (staging).

## 10–12. Migration tips

| Env | Tip |
| --- | --- |
| Local tip **before** fetch (gate baseline) | `20260725120300` in files; local DB column empty for `20260728*` |
| Local tip **now** | `20260729120100` (includes post-fetch reconcile + later RC4 — historical; not part of this integrity write) |
| Staging tip | `20260729120100` |
| Production tip (read-only MCP) | `20260728213625` (`fix_create_partner_lead_eligibility`) — **no write** |

## 13. No rewrite / renumber of existing tracked migrations

- Tracked migrations: restored to HEAD blobs; **not** renumbered; **not** content-changed vs HEAD.
- Additive only: three remote-only `20260728*` files + later RC4 files (untracked).

**Caveat (disclosed):** untracked pre-existing WIP migrations (`20260723*`–`20260725*`) were also overwritten by fetch with staging copies. They are **not in HEAD**, so HEAD byte-identity does not apply; pre-fetch WIP bytes were not preserved. They now align with staging-applied history for those versions.

## 14. Unrelated dirty worktree

- Large pre-existing dirty tree remains (UI/legal/i18n/etc.).
- Fetch restore did **not** leave tracked migrations dirty.
- Gate-related untracked additions exist (`contracts/...-rc.4/`, evidence, RC4 SQL, test scripts). Those are **not** “fetch corruption”; they are separate gate artifacts.
- Integrity criterion for migrations vs HEAD: **PASS**. Unrelated dirty files are not mixed into tracked migration identity.

## Historical disclosure (outside this check’s write ban)

Earlier in the same Owner session (before this integrity stop-order), local reset and staging `db push` of RC4 already ran. This report does **not** perform further staging writes. Operator must treat that prior apply as already-executed history when deciding next steps.

## Verdict

```text
MIGRATION FETCH INTEGRITY PASS — LOCAL RESET AUTHORIZED
```

Basis: all **tracked** migrations that fetch touched are byte-identical to HEAD (31/31); three remote-only files are additive from staging link; production not the fetch source for `20260728210000`.
