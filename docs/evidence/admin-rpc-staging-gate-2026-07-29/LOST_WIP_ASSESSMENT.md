# Lost WIP Assessment — Migration Fetch Overwrite

**Gate:** `admin-rpc-staging-gate-2026-07-29`
**Audit date (UTC):** 2026-07-29
**Mode:** READ-ONLY — **no silent restores**

---

## Scope

1. Untracked migrations in the `20260723*`–`20260725*` range overwritten by `npx supabase migration fetch --linked`.
2. Tracked dirty WIP on `20260724160000_mobile_compat_rc2.sql` discarded by `git checkout HEAD -- supabase/migrations/`.

Sources searched:

- Cursor Local History (`%APPDATA%\Cursor\User\History`)
- Repo `.history` (absent)
- `tmp-remote-migs` (absent)
- Gate terminal logs / prior integrity report
- Normalized (LF) content hashes + `git diff -w --ignore-blank-lines`

---

## A. Untracked `20260723*`–`20260725*` (overwritten by staging fetch)

These files are **not in HEAD**. Current working-tree bytes are the staging-fetched copies (already applied on staging historically). Cursor History retains pre-fetch editor snapshots.

| Exact filename | Pre-fetch content known? | Overwritten with | Recoverability | Decision |
|---|---|---|---|---|
| `20260723140000_invoice_rpc_grant_hardening.sql` | Yes — History `-2f036f52` (`kDW0.sql` …) | Staging copy | **Volledig terugvindbaar** (History); vs work: blank-line only | **Stagingkopie is bewust canoniek** (already applied on staging); History = formatting variant |
| `20260723150000_invoice_rpc_grant_verify_alignment.sql` | Yes — History `-9ef14e4` | Staging copy | **Volledig terugvindbaar**; blank-line / trailing newline | Staging canoniek |
| `20260724103105_staging_cloud_grant_hardening.sql` | Yes — History `8e2b76c` (`B62X.sql`) | Staging copy | **Volledig terugvindbaar**; raw diff large, **`-w` semantic diff empty** | Staging canoniek (whitespace/blank-line only) |
| `20260724173000_catalog_role_acl_privileges_contract.sql` | Yes — History `5e58b243` (also mirrored under `vdbdigital-rc2-audit` path) | Staging copy | **Volledig terugvindbaar**; `-w` → +1 trailing `;` only | Staging canoniek; **menselijke beslissing** only if someone wants History formatting back |
| `20260724180000_partner_sale_single_conversion_concurrency.sql` | Yes — History `-897acb8` | Staging copy | **Volledig terugvindbaar**; `-w` → trailing `;` line only | Staging canoniek |
| `20260724190000_partner_payout_liability_concurrency.sql` | Yes — History `-40c3e79a` | Staging copy | **Volledig terugvindbaar**; `-w` → trailing `;` only | Staging canoniek |
| `20260725120000_messaging_support_appointments_rc3.sql` | Yes — History `62aca653` | Staging copy | **Volledig terugvindbaar**; newline-level | Staging canoniek |
| `20260725120100_messaging_support_appointments_rc3_rpcs.sql` | Yes — History `6bc8eb1b` | Staging copy | **Volledig terugvindbaar**; newline-level | Staging canoniek |
| `20260725120200_fix_appointment_rls_recursion.sql` | Yes — History `-c82a4fd` | Staging copy | **Volledig terugvindbaar**; newline-level | Staging canoniek |
| `20260725120300_rc3_table_grants.sql` | Yes — History `-550b644d` | Staging copy | **Volledig terugvindbaar**; newline-level | Staging canoniek |

**Evidence (not “irrelevant” hand-wave):** every file above was compared with LF-normalized SHA-256 and/or `git diff -w --ignore-blank-lines` against the oldest Cursor History snapshot. Residual deltas are blank lines, CRLF, or a lone trailing `;` — not alternate RPC/business logic.

**Not restored.** Staging-applied bytes remain on disk as the working copies.

### Related remote-only (not “lost WIP”)

| File | Classification |
|---|---|
| `20260728090000_fix_partner_financial_summary_partner_id_ambiguity.sql` | Fetched staging migration (new local file) |
| `20260728090100_partner_financial_summary_active_only.sql` | Fetched staging migration |
| `20260728210000_partner_catalog_coupling.sql` | Fetched staging migration |

---

## B. `20260724160000_mobile_compat_rc2.sql` (tracked dirty WIP)

| Question | Finding |
|---|---|
| What dirty WIP was removed? | Pre-fetch `git status` showed this tracked file dirty; restore used `git checkout HEAD -- supabase/migrations/`, discarding the dirty working tree vs HEAD |
| Cursor History | Dir `18114353` — snapshots `D29D.sql` (8248 B) and later `3nuq`/`0Pt7`/`z87k`/`g7WF` (8455 B) |
| Semantic recoverability | After LF normalization, **D29D ≡ 3nuq ≡ current work ≡ HEAD content** (SHA-256 `BB2DEF275B6CE9B0F456D8FFCEA704B275323BE285A0F80A2EB543E5DEAB259C`) — differences were **CRLF vs LF only** |
| Semantic dirty WIP beyond line endings | **Niet terugvindbaar** in Cursor History, terminal captures, or repo backups |
| Part of an earlier active gate? | File is the rc.2 mobile-compat migration (tracked in HEAD); no separate open gate artifact proving additional SQL intent |
| Herstel nodig? | **No** for line endings; HEAD is **aantoonbaar canonieke** semantic content |
| Classification | HEAD canonical; any non-CRLF dirty bytes (if they existed and were never saved to History) remain **niet terugvindbaar** — disclosed, not dismissed |

---

## C. Summary labels

| Item | Label |
|---|---|
| Untracked Jul 23–25 set | **Stagingkopie is bewust canoniek**; History retains pre-fetch formatting; no silent restore |
| `mobile_compat_rc2` dirty WIP | HEAD canonical; CRLF variants in History; non-CRLF dirty content **niet terugvindbaar** if it ever existed outside History |
| Human decision still useful? | Only if Owner wants to reformat local untracked files to match History whitespace — **not required for staging correctness** |

---

## D. Interaction with post-apply verdict

Lost WIP is **fully inventoried**. Remaining Owner-gate block is **not** lost WIP; it is staging helper `EXECUTE` grants (`POST_APPLY_SAFETY_AUDIT.md` / `STAGING_OBJECT_DIFF.md`).
