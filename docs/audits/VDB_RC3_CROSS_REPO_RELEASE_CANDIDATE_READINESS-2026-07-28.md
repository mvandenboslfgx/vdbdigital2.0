# RC3 Cross-Repository Release Candidate Freeze — Production Readiness

**Verdict:** `RC3 CROSS-REPOSITORY RELEASE CANDIDATE FREEZE PASS — PRODUCTION NOT AUTHORIZED`  
**UTC:** 2026-07-28T11:30:00Z  
**Nature:** Local freeze + readiness only. No production apply, push, merge, deploy, store submit, checkout/Mollie/P0.5 activation.

---

## 1. Repository inventory

| Repo | Path | Role | Branch | HEAD (full) | Tag peel | Working tree | Upstream |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Owner (RC freeze) | `C:\Users\XXX\vdbdigital-rc3-freeze` | CANONICAL_BACKEND_OWNER | `freeze/shared-backend-rc3-local` | `5e33d249d7754ffa27e605306814dfbac8c6e7c8` | `rc3-cross-repository-release-candidate` → same | clean after RC commit | no upstream on freeze branch |
| Owner (primary) | `C:\Users\XXX\vdbdigital2.0` | same remote, dirty WIP | `phase/shared-partner-backend` | `a593e5d395fc7b90994c5cb2e8554cd241c48706` | N/A for this RC | **heavily dirty** — EXCLUDE from RC | not RC candidate |
| Partners | `C:\Users\XXX\vdb-partners` | PARTNER_CLIENT | `main` | `a380db26d6fb4426e2a8bc46e9c8d94388766690` | `rc3-cross-repository-release-candidate` → same | clean | `origin/main` gone locally |
| Mobile | `C:\Users\XXX\vdb-app` | MOBILE_CLIENT | `fix/a5-owner-contract-runtime` | `db182e795295dc4f841540241cf98a69ecb2da05` | `rc3-cross-repository-release-candidate` → same | tracked clean; `artifacts/` local evidence (gitignored) | no upstream tracking |

### Contract / schema (runtime pins)

| Repo | Contract | schemaVersion | Runtime env |
| --- | --- | --- | --- |
| Owner | `vdb-backend-contract@0.2.0-rc.3` | `2026.07.25.messaging-support-appointments-rc3` | Next.js Owner portal/admin; Supabase staging `qzekuvmgfekzsowdecyk` |
| Partners | pin.json + `lib/contract/pin.ts` → **0.2.0-rc.3** / same schema | same | Next Partner portal; staging smoke 55/55 |
| Mobile | `BACKEND_CONTRACT` + `contracts/backend-contract.json` → **0.2.0-rc.3** / same schema | same | Expo `nl.vdbdigital.app` 1.0.0 / versionCode 1; preview APK |

### Dirty-file classification (freeze worktrees at tag time)

**Owner freeze (committed into `76dcfe3`):**

| Path | Class |
| --- | --- |
| `supabase/migrations/20260728090000_*.sql`, `20260728090100_*.sql` | REQUIRED RELEASE CHANGE |
| `scripts/staging-rc3-*.ts`, `scripts/mobile-rc3-credential-handoff.ts` | REQUIRED RELEASE CHANGE (ops/validation) |
| Prior `docs/artifacts/*verify*.json` local churn | GENERATED — restored / not in RC commit |
| `docs/evidence/**` | TEST/EVIDENCE — gitignored |

**Partners:** transient docs downgrade to rc.2 in working tree was **UNRELATED — EXCLUDE** (restored to HEAD rc.3). Evidence JSON touch restored.

**Mobile:** post-`db182e7` maestro WIP stashed as `rc3-rc-freeze-wip-maestro` → TEST/EVIDENCE. `artifacts/rc3-preview/**` → TEST/EVIDENCE (gitignored).

**Owner primary `vdbdigital2.0`:** large unrelated WIP (catalog, lighthouse, legal, MFA polish, etc.) → **UNRELATED — EXCLUDE** from this RC. Do not freeze primary.

---

## 2. Release-candidate commits and tags

| Repo | Action | Result |
| --- | --- | --- |
| Owner | Commit financial-summary migrations + staging scripts + readiness report | `5e33d24` (includes `76dcfe3`) |
| Owner | Annotated tag `rc3-cross-repository-release-candidate` | peels to `5e33d24` |
| Partners | Tag at validated HEAD | peels to `a380db2` |
| Mobile | Tag at validated HEAD | peels to `db182e7` |

**No push.** Tags are local only.

Prior Owner tag `shared-backend-rc3-local-freeze` remains at `c55abc6` (pre financial-summary remediation). RC tag supersedes for cross-repo candidate.

---

## 3. Cross-repository contract control

| Check | Owner | Partners | Mobile |
| --- | --- | --- | --- |
| Contract `0.2.0-rc.3` | PASS | PASS (pin.ts) | PASS |
| Schema `2026.07.25.messaging-support-appointments-rc3` | PASS | PASS | PASS |
| Staging tip `20260728090100` / count 48 | PASS (live) | consumes same staging | consumes same staging |
| Canonical portal_* objects | PASS | PASS (no parallel domain) | PASS (owner surfaces) |
| No mock/demo auth fallback | PASS | PASS | PASS (device matrix) |
| Production ref absent from staging runtime | PASS | PASS | PASS (evidence) |

### Object mapping matrix (canonical Owner)

| Logical | Owner table / RPC |
| --- | --- |
| conversations | `portal_conversations` |
| participants / read state | `portal_conversation_participants.last_read_at` |
| messages | `portal_messages` |
| attachments | `portal_message_attachments` |
| support tickets | `portal_support_tickets` |
| support replies (public/internal) | `portal_support_replies.is_internal` |
| appointments | `portal_appointments` + `portal_appointment_participants` |
| partner financial summary | `partner_financial_summary(uuid)` (fixed ambiguity + ACTIVE self-access) |
| commissions / ledger / payouts | `partner_commissions`, `partner_ledger_*`, `partner_payout*` |
| feature flags (fail-closed) | `messaging_realtime`, `support_internal_notes_rpc`, `appointments_booking`, checkout/Mollie/payouts |

---

## 4. Regression results (this gate)

### Owner (`vdbdigital-rc3-freeze`)

| Gate | Exit | Notes |
| --- | --- | --- |
| lint | **0** | after RC script lint fixes |
| typecheck | **0** | |
| unit | **0** | |
| db:verify-messaging… | **0** | |
| db:verify-partner-backend | **0** | |
| test:messaging…-rls | **0** | local docker |
| checkout:release-gate | **2** | fail-closed expected |
| format full prettier | **1** | pre-existing freeze drift (known) |

Prior staging: Owner website + security/fixtures PASS; financial-summary remediation PASS.

### Partners

| Gate | Exit |
| --- | --- |
| lint | **0** |
| typecheck | **0** |
| test | **0** |
| test:staging-rc3-smoke | **0** |

Prior: PARTNER RC3 STAGING UI VALIDATION PASS (55/55).

### Mobile

| Gate | Exit / Result |
| --- | --- |
| lint | **0** |
| typecheck | **0** |
| test | **0** (175 tests class per evidence) |
| APK SHA-256 | **MATCH** `1a8d36b447bbbca0a41409cc7e835df0f5ffdf7faa7de32e80efb78a2a4a2cf9` |
| Build ID | `63c8c04f-2dfb-48b7-9974-37eb40a43f7b` tied to HEAD `db182e7` |
| Device matrix | 59 PASS / 0 FAIL (evidence reused; code/APK unchanged) |

---

## 5. Production environment diff (read-only)

| Surface | Staging `qzekuvmgfekzsowdecyk` | Production `nhsrdnjfsxfikfbdmdfj` |
| --- | --- | --- |
| Project name | VDB Digital Staging | vdb nieuw |
| Region | eu-west-1 | eu-west-1 |
| Status | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| Migration count / tip | **48** / `20260728090100` | **5** history rows (markers only: `20260714220325`…`20260720132521`) |
| RC3 / partner / portal schema | Present | **Absent** relative to staging RC3 tip |
| Management API from Owner CLI token | full staging SQL | project GET often **403**; MCP can list prod migrations only |
| Feature flags (staging live) | checkout/Mollie/payouts/messaging_realtime/appointments_booking/support_internal = **false** | not mutated; prod must be re-inventoried under authorized prod credentials before apply |
| Auth / redirects / SMTP / Storage / Realtime / CORS / CSP / observability | staging validated in prior gates | **diff incomplete without authorized prod inventory** — blocker for *production apply*, not for RC freeze existence |

**Stop criterion for any future prod apply:** complete prod inventory under denylist-safe credentials; never use staging-only assumptions.

---

## 6. Checkout and payments

Confirmed on staging flags (live query this gate):

- `digital_product_checkout`, `payments.digital_goods_checkout` = false  
- `mollie_checkout`, `payments.mollie_checkout` = false  
- `partner_payouts` = false  
- RC3 flags fail-closed  
- Owner checkout release gate exit **2**  
- No P0.5 activation in this RC  

RC3 may ship technically **without** checkout.

---

## 7. Security and privacy (summary)

| Control | Status |
| --- | --- |
| Production denylist | Enforced in scripts/evidence; no prod SQL mutation this gate |
| Synthetic credentials | Outside Git (`C:\Users\XXX\.vdb-vault\…`) |
| RLS / RPC search_path / isolation | Staging + local RLS suites PASS |
| Internal support isolation | Staging fixtures + Mobile matrix PASS |
| Secrets in chat/git | Not printed; vault ACL limited |
| Partner pending financial | ACTIVE-only self-access after `20260728090100` |

---

## 8. Deployment and rollback plan (NOT EXECUTED)

| # | Step | Repo | Expected | Stop | Rollback |
| --- | --- | --- | --- | --- | --- |
| 1 | Production backup / PITR confirm | Owner ops | WAL-G/PITR documented | backup missing | N/A |
| 2 | Prod migration preflight (counts, tip, pending list) | Owner | exact pending set known | unexpected tip/history | abort |
| 3 | Apply **only** authorized additive migrations (never reset/repair) | Owner | tip matches planned | any SQL error | PITR / forward-fix only |
| 4 | Post-apply verify RPC/RLS/flags/financial integrity | Owner | verify contracts 0 fails; flags fail-closed | any fail | revoke RPCs / PITR |
| 5 | Owner web deploy (env pins rc.3, staging≠prod keys) | Owner | health + smoke | config error | redeploy prior |
| 6 | Partner deploy (pin rc.3) | Partners | auth routing + surfaces | isolation fail | redeploy prior |
| 7 | Mobile production EAS build (new authorization) | Mobile | signed non-debug APK | signing/env fail | keep prior store binary |
| 8 | Internal smoke (cust/partner/staff) | all | matrix subset PASS | any cross-tenant leak | rollback apps + consider DB |
| 9 | Public release | ops | announced | — | — |
| 10 | Rollback criteria | ops | leak, payment enablement, migration fail, contract mismatch | — | PITR + prior deploys |

---

## 9. Mobile production readiness (no build/submit)

| Item | Status |
| --- | --- |
| versionName / versionCode | `1.0.0` / `1` — may need bump before store |
| package | `nl.vdbdigital.app` |
| signing / preview cert | evidence cert SHA recorded; **production keystore separate** |
| privacy / store metadata / screenshots | **not closed in this gate** — open for store |
| production EAS profile / prod Supabase env | **not authorized / not built** |
| crash monitoring / update policy | open |
| Device validation evidence | PASS at `db182e7` + build `63c8c04f-…` |

---

## 10. Go / no-go matrix

| Question | Answer |
| --- | --- |
| RC3 cross-repo freeze reproducible? | **YES** (local tags) |
| Staging gates green? | **YES** |
| Contract/schema aligned? | **YES** |
| Production apply authorized? | **NO** |
| Production migration parity known? | **YES — large gap (5 vs 48)** |
| Checkout/Mollie/P0.5 in RC? | **NO (fail-closed)** |
| Store submit ready? | **NO** |

### Open blockers for *production authorization* (not for RC freeze)

1. Production schema far behind staging (5 vs 48); full apply plan + rehearsal required.  
2. Incomplete prod Auth/SMTP/Storage/Realtime/CORS/observability inventory under authorized credentials.  
3. Owner primary worktree still dirty — do not deploy from primary.  
4. Mobile store metadata / production signing / version bump not closed.  
5. No push of RC tags yet (intentional).

---

## Verdict

**RC3 CROSS-REPOSITORY RELEASE CANDIDATE FREEZE PASS — PRODUCTION NOT AUTHORIZED**
