# Integration workstream — status report (local only)

**Date:** 2026-08-01  
**Worktree:** `C:/Users/XXX/vdbdigital-visual-rc6-i18n`  
**Branch:** `integration/visual-rc6-i18n-foundation`  
**HEAD:** `f75855ec2a4804b6da874cbd29ca22c19f0d7e0f`  
**Note:** `1cafc7d…` is the parent commit (portal/SEO/switcher). Tip = status-report commit on top of that.  
**Audit WT:** `C:/Users/XXX/vdbdigital-i18n-audit` @ `0fe80ca` — **untouched / clean**  
**Push / deploy / staging apply:** **none**

---

## 1. Worktree / branch / HEAD

| Item | Value |
|------|-------|
| Repository | same git as `vdbdigital2.0` |
| Integration worktree | `C:/Users/XXX/vdbdigital-visual-rc6-i18n` |
| Branch | `integration/visual-rc6-i18n-foundation` (no upstream) |
| HEAD | `1cafc7d0261e0e860f9df39fe4b4776c6d0a7510` |
| Status | clean |

---

## 2. Included source commits

- Visual base `0fe80caa…`
- origin RC6 `76694a32…` (merge)
- Cherry-pick `0c789755…` (NODE_ENV test typing)
- Cherry-pick `fceb4a41…` (rc.7 admin review attestation)
- **Not included:** feat-promo `ad842d6`, `45f583f`

---

## 3. Local implementation commits

| SHA | Summary |
|-----|---------|
| `31170f8` | ADR-001 international i18n decisions |
| `8453f5b` | merge origin RC6 into visual/i18n |
| `7ef9373` | cherry-pick NODE_ENV mollie test fix |
| `b8706ac` | cherry-pick rc.7 admin review attestation |
| `44811e0` | Phase 0 integration report |
| `0ac3d7a` | Phase 1 next-intl foundation |
| `0a22722` | Phase 2 preferred_locale + event contract |
| `1cafc7d` | Portal shell + SEO alternates + language switcher |

---

## 4. Conflict resolutions (Phase 0)

- `package.json` — keep messaging scripts + `staging:mollie-e2e`
- `docs/backend-contract.md` — RC5/6 header + RC2/3 history
- `scripts/verify-partner-backend.ts` — keep RC4 AAL2 commission approval

---

## 5. Architecture changes

- **next-intl** is the runtime (plugin + `request.ts` + `NextIntlClientProvider`)
- Shared catalogs (`catalogs.ts`); `getDictionary` compatibility retained
- Preference module + nullable `profiles.preferred_locale` migration (not applied remotely)
- Notification locale event Zod contract documented
- `/en` → unprefixed 308; admin no longer forced English-only
- Cookie `nl` restores `/` → `/nl`
- Language switcher: globe + native names (English / Nederlands)

---

## 6–7. New migrations (not applied remotely)

| File | Purpose |
|------|---------|
| `20260801130000_profiles_preferred_locale.sql` | nullable allowlisted `preferred_locale` |
| (from RC6/rc7 cherry-picks) | AAL2, admin stamps, staff attest — **not applied** here |

---

## 8. Old i18n status

| Kept | Role |
|------|------|
| `messages/en.ts`, `nl.ts` | catalogs (next-intl + createT) |
| `content/*` | domain long-form |
| `create-t.ts`, `get-dictionary.ts` | compatibility during migration |
| `products-nl.ts` | still used via `localizeProduct` (PDP wired); DB `product_translations` not yet storefront SSOT |

| Removed/reduced |
|-----------------|
| Standalone `LocaleProvider` context | now re-exports next-intl `useLocale` |
| Competing unused next-intl | **now used** |

Custom runtime **not fully deleted** — call sites still use `getDictionary`/`createT` widely (intentional interim).

---

## 9–13. Coverage matrix (honest)

| Area | Status |
|------|--------|
| Marketing dictionaries | Existing EN/NL + next-intl wired |
| Portal shell/nav | **Done** (keys) |
| Portal page bodies | **Remaining** (hardcoded NL) |
| Auth / MFA / Zod errors | **Remaining** |
| Admin UI strings | **Remaining** (routing EN+NL ready) |
| Checkout/forms labels | Partial (pre-existing) |
| Shop PDP NL overlay | **localizeProduct wired**; DB translations **not** SSOT yet |
| Publication gates / translation status enum | **Not built** |
| SEO home + solutions hreflang | **Done** |
| SEO contact/about/cases/quote/support | **Remaining** |
| Email event contract | **Defined**; Resend templates not rewritten |
| Language switcher premium | **Done** (server) |
| Document legal versioning fields | **Not built** |
| products-nl removal | **Blocked** until DB migration proven |

---

## 14. Tests run

| Check | Result |
|-------|--------|
| `tsc --noEmit` | PASS (after latest commit) |
| Unit i18n / preference / seo-redirects | PASS |
| Core Phase 0 suite (mollie/security/etc.) | 93 PASS earlier |
| `next build` | PASS (Phase 0 + Phase 1) |
| Contract bundle checksum tests | FAIL pre-existing (CRLF/seal) |
| Lint | FAIL pre-existing catalog `require()` script |
| Playwright / full suite | Not fully re-run this session |
| Migrations applied | **No** (intentional) |

---

## 15. Security notes

- Fail-closed payment/AAL2 codes retained as machine codes
- No secrets committed; no env value dumps
- Open-redirect allowlist unchanged
- `/en` redirect uses pathname rewrite only (no open redirect)

---

## 16. Remaining blockers / next work

1. **Phase 3 remainder:** auth, MFA, Zod, portal pages, admin copy, API user-facing maps, RC6 support NL→keys  
2. **Phase 4:** storefront ← `product_translations` + status gates; retire `products-nl.ts` after parity  
3. **Phase 5 remainder:** marketing pages still on canonical-only; robots private paths; JSON-LD languages  
4. **Phase 6:** wire producers to `notificationLocaleEventSchema`; Resend Work consumes  
5. **Account sync:** read/write `preferred_locale` on login/profile UI  
6. **feat-promo:** still deferred  
7. **Contract seal LF CI** before trusting rc5/rc6/rc7 digests  

**Stop condition hit:** full surface i18n is multi-day; foundation + Owner tip are in place. Awaiting Matthijs for continue / review / push.

---

## 17–18. Git / deploy confirmation

- `git status`: clean on integration branch  
- **Nothing pushed**  
- **Nothing deployed**  
- **Nothing applied** to staging/production Supabase  
- Audit worktree not used for implementation  
- **Not** declared live or production-ready  

---

## External settings

Vercel/Supabase/Resend/Mollie production aliases: **not verified remotely** in this phase (read-only local only).
