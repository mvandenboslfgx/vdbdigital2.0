# INTEGRATION I18N FINAL REPORT

**Worktree:** `C:/Users/XXX/vdbdigital-visual-rc6-i18n`  
**Branch:** `integration/visual-rc6-i18n-foundation` (no upstream)  
**Functionele code-tip (laatste niet-docs feature/fix):** `b918b12da3b1e606bbec0f366ed9f7ee0330c0cd`  
**Actuele HEAD (inclusief dit rapport):** zie `git rev-parse HEAD` in deze worktree — op moment van afronding: `0149f87683776eee0cf29ba8156bf7a0c433766c`  
**Rapport gegenereerd:** 2026-08-01  

Dit rapport hoort bij de lokale integratiebranch. Verifieer altijd met `git rev-parse HEAD` + `git status --porcelain=v1`. Niets is gepusht, gedeployed, of extern toegepast.

---

## 0. HEAD-inconsistentie (preflight — opgehelderd)

Eerdere rapportage noemde twee SHA’s:

| SHA | Rol |
| --- | --- |
| `1cafc7d0261e0e860f9df39fe4b4776c6d0a7510` | Feature-commit (portal shell / SEO / switcher) |
| `f75855ec2a4804b6da874cbd29ca22c19f0d7e0f` | Statusrapport-commit **bovenop** `1cafc7d` |

Feiten (geen reset/rebase):

1. **Worktree-tip destijds** was `f75855e` (later verder gebouwd tot huidige tip).
2. `1cafc7d` **is ancestor** van `f75855e` (en van huidige HEAD).
3. Verschil: docs-statuscommit na feature-commit.
4. Fase 0–2 commits (`8453f5b` RC6-merge, `0ac3d7a` next-intl, `0a22722` preference, `1cafc7d`, `f75855e`, `dd69907` digest) zitten in huidige tip (`merge-base --is-ancestor` = exit 0).
5. Worktree was schoon vóór verdere afronding; tip nu opnieuw schoon na laatste commit.

---

## 1. Worktree / branch / status

| Veld | Waarde |
| --- | --- |
| Path | `C:/Users/XXX/vdbdigital-visual-rc6-i18n` |
| Branch | `integration/visual-rc6-i18n-foundation` |
| Upstream | **geen** (lokale integratiebranch) |
| HEAD | `0149f87683776eee0cf29ba8156bf7a0c433766c` (docs tip; functionele tip `b918b12`) |
| `git status -sb` | schoon (`## integration/visual-rc6-i18n-foundation`) |

---

## 2. Commitlijst (integratie + i18n vanaf ADR)

Volledige tip bevat ADR `31170f8`, Phase 0 merge `8453f5b`, RC6/cherry-picks, en alle i18n-afrondingscommits tot `2032028`. Belangrijke domeincommits (nieuwste eerst, selectie):

- `2032028` — query-preserving switcher, seed/e2e shop, 320px overflow, FAB fallback  
- `b2b14fb` — hardcoded-UI allowlist leeggemaakt (auth+cart)  
- admin i18n-reeks (`095faf0`…`3b2aca5`, `1cdc929`, `5b6ad1f`…)  
- `ec80160` — commercial/portal test-alignment  
- `241f1e2` / `6dbbbd8` / `977fb96` / `3c2f24d` — portal copy, labels, preferred_locale, shells  
- `4ccd13c` / `3ae3272` — product_translations SSOT + publish gate  
- `b40fe07` / `b458d6d` — SEO alternates + private noindex  
- `87a1585` / `3489c47` — email locale producers + Resend handoff  
- `0063568` / `cbb9258` — legal document localization prep/versions  
- `7c4627c` — feat-promo delta analysis (**niet geïntegreerd**)  
- `dd69907` — LF/CRLF-tolerante contract digest  
- `f75855e` ← eerdere “rapport-HEAD”; `1cafc7d` ← eerdere “feature-HEAD”

**Niet opgenomen:** `ad842d6`, `45f583f` (feat-promo) — `merge-base --is-ancestor` exit 1.

---

## 3. Conflictresoluties (Phase 0)

Bij merge `origin/fix/rc6-full-staging-recovery` (`76694a32`) in visual tip:

- `package.json` — messaging + staging mollie scripts behouden  
- `docs/backend-contract.md` — RC5/6 + RC2/3 geschiedenis  
- `scripts/verify-partner-backend.ts` — RC4 AAL2 commission block  

Daarna cherry-picks: `0c78975` (NODE_ENV mollie tests), `fceb4a41` (rc.7 admin review attestation).

---

## 4. Migrations (additief; **niet** extern toegepast)

| Bestand | Doel |
| --- | --- |
| `20260801120000_staff_attest_partner_admin_review_rc7.sql` | RC7 partner admin review (uit RC6-lijn) |
| `20260801130000_profiles_preferred_locale.sql` | `profiles.preferred_locale` |
| `20260801140000_product_translation_status.sql` | translation status lifecycle |
| `20260801013715_legal_document_localization_prep.sql` | legal localization prep |
| `20260801150000_legal_document_versions.sql` | versioned legal docs + acceptance (deny-all RLS) |

**Bevestiging:** geen staging/productie `supabase db push` / apply in deze Work.

---

## 5. Route- en localematrix

| Regel | Status |
| --- | --- |
| EN unprefixed | ja |
| NL onder `/nl` | ja |
| `/en` → 308 bare EN | ja (middleware) |
| Officiële talen | `en`, `nl` alleen |
| Auth/portal/checkout behouden `/nl` | ja |
| `html lang` per locale | ja (request + layout) |
| Admin EN+NL, EN fallback | ja (shell + page bodies + editors) |

---

## 6. Surface-matrix (Fase 3)

| Surface | EN+NL via keys | Opmerking |
| --- | --- | --- |
| Auth (login, register, verify, reset, invite, MFA/AAL2) | ja | Zod + server actions gelokaliseerd |
| Portal shell + pages (projecten, offertes, facturen, documenten, support, berichten, meldingen, profiel, beveiliging) | ja | enum labels via dictionary keys |
| Admin shell + lists + details + editors | ja | scanner allowlist admin-sectie leeg |
| Marketing | deels bestaand + SEO | dictionaries |
| Cart | ja | laatste allowlist-entries weg |
| Checkout | fail-closed; copy keys waar van toepassing | geen echte betaling |
| Hardcoded-string scanner | ja | `tests/unit/hardcoded-ui-string-scan.test.ts`; allowlist **0** actieve entries |

---

## 7. Accountvoorkeur / sync (Fase 3 preference)

Geïmplementeerd in `src/i18n/preference.ts` + server actions + portal profiel:

- Account `preferred_locale` > cookie > URL > Accept-Language > EN  
- Validatie via allowlist; null/ongeldig → veilige fallback  
- Cookie sync bij login; geen overwrite van bestaande accountkeuze door guest  
- Unit tests: `tests/unit/preferred-locale.test.ts` (en gerelateerde)  

Migration **niet** remote toegepast → runtime schrijft/leest alleen wanneer kolom bestaat; anders fail-safe.

---

## 8. Catalogus SSOT (Fase 4)

- Merge helper: `src/lib/commerce/product-locale-merge.ts` (published only; approved alleen admin preview; nooit auto-publish MT)  
- Storefront: `public-shop-catalog` + `localizeProduct` + popular products  
- Admin: `TranslationWorkflowPanel`, status, missing fields, stale via `source_hash`, publish gate + audit  
- Parity inventory: `docs/adr/PRODUCTS_NL_PARITY_INVENTORY.md`  
- **`products-nl.ts` behouden** tot DB-published parity (seed overlay fallback)  

---

## 9. SEO (Fase 5)

- `buildLocaleAlternates` / OG locale op marketing + shop + legal  
- `robots.ts`: private prefixes + bare `/admin`, `/portal`, `/checkout`, `/cart`  
- Layout/page `noindex` voor admin/portal/auth/cart/checkout  
- Tests: `seo-alternates-coverage.test.ts`, `robots.test.ts`  

`/en/...` is geen aparte indexeerbare variant (redirect).

---

## 10. E-mail / Resend (Fase 6)

- Producer contract: `src/lib/notifications/locale-event.ts`  
- Handoffs: `docs/handoff/RESEND_I18N_HANDOFF.md`, `docs/adr/RESEND_LOCALE_HANDOFF.md`  
- Producers threaden locale voor contact/quote/support/order/payment  
- **Resend HTML-templates niet herschreven** (aparte Resend-Work)  

---

## 11. Taalkeuze (Fase 7)

- Header: client `LanguageSwitcherBoundary` (query-safe)  
- Footer/auth/portal/admin: switchers aanwezig  
- Compact: EN/NL zichtbaar; aria-label volledige taalnamen  
- Equivalent route + veilige query; tests in unit + Playwright  

---

## 12. Juridische documentarchitectuur (technisch)

- Migrations + docs (`docs/LEGAL_I18N_ARCHITECTURE.md` / versie-schema)  
- Velden: locale, governing_locale, version, approved/effective/accepted, content_hash  
- Geen auto-approve; bestaande reviewblokkers blijven  

---

## 13. Legacy i18n / next-intl

- Inventory: `docs/adr/NEXT_INTL_CLEANUP_INVENTORY.md`  
- Runtime: next-intl provider + homegrown `getDictionary`/`createT` delen `catalogs.ts`  
- Dead candidates (`navigation.ts`/`routing.ts`) gedocumenteerd, **niet massaal verwijderd** (geen dual-break)  

---

## 14. feat-promo advies

Zie `docs/adr/FEAT_PROMO_DELTA_ANALYSIS.md`.

- `ad842d6`: **exclude** van Owner-release (design/reference only; security/URL/i18n blockers)  
- `45f583f`: **exclude** (staging OWNER-assignment artifact)  
- **Niet geïntegreerd** in deze branch  

---

## 15. Contract checksum

- Fix: `dd69907` — LF/CRLF-tolerante digest verification  
- Historische seals **niet** herschreven  
- `tests/unit/contract-bundle-digest.test.ts`: PASS  

---

## 16. Testresultaten (lokale matrix)

| Gate | Resultaat |
| --- | --- |
| `tsc --noEmit` / `npm run typecheck` | PASS |
| `npx vitest run` (unit) | **662 passed / 78 files** |
| `npm run test:security` | 77 passed / 7 files |
| Contract digest + partner/payment contracts | PASS |
| Hardcoded UI scanner | PASS (allowlist leeg) |
| SEO/robots/preferred-locale/product-locale-merge/notification-locale | PASS |
| `npm run env:scan-secrets` | PASS (tracked clean; `.env.local` gitignored) |
| `npm run build` | PASS |
| Playwright `tests/e2e/site.spec.ts` | **23 passed / 23** |
| Playwright volledige suite (84 listed) | deels; site.spec volledig groen; overige specs niet allemaal opnieuw geforceerd in deze sessie |
| `npm run lint` | **FAIL pre-existing**: 4× `@typescript-eslint/no-require-imports` in `scripts/import-software-catalog-xlsx.cjs`; 1 unused var in staging evidence script — **niet** door i18n-commits |
| `npm run checkout:release-gate` | NOT READY (verwacht lokaal: migraties/env/Mollie niet gezet; gate houdt checkout uit) |
| `npm run env:validate` | missing lokale secrets (verwacht; waarden niet getoond) |
| RLS / remote DB verifies | **NIET BEWEZEN** (geen remote) |
| Staging/prod Mollie e2e | **NIET BEWEZEN** / niet uitgevoerd tegen externe env |

Pre-existing lint in CJS scripts blijft buiten release-claim; geen i18n-regressie.

---

## 17. Security / release-eindcontrole (lokaal + read-only)

| Onderwerp | Status |
| --- | --- |
| Env contracts / `.env.example` placeholders | PASS scan |
| Secret exposure tracked | PASS |
| Fail-closed checkout (flag off) | PASS / gate NOT READY |
| Supabase remote schema/RLS live | **NIET BEWEZEN** |
| Vercel project/aliases/protection | **NIET BEWEZEN** (geen externe wijziging; geen live verify) |
| Resend live templates | **NIET BEWEZEN** (handoff only) |
| Mollie live/testmode | **NIET BEWEZEN** |
| Sentry | **NIET BEWEZEN** |
| Feature flags in remote | **NIET BEWEZEN** |
| EAS/Expo shared | **NIET BEWEZEN** / buiten scope waar niet gedeeld |

---

## 18. Resterende blockers (eerlijk)

1. **Migrations niet toegepast** — `preferred_locale`, translation status, legal versions werken pas volledig na gecontroleerde apply.  
2. **`products-nl.ts` nog nodig** — DB published NL-parity ontbreekt; verwijderen geblokkeerd tot parity = 0 content loss.  
3. **Dual i18n runtime** — next-intl + getDictionary; cleanup inventory klaar, mass-delete nog niet.  
4. **Lint CJS scripts** — pre-existing; geen push-gate claim.  
5. **Checkout release gate** — bewust NOT READY zonder staging env/migrations.  
6. **Externe omgevingen** — staging/prod/Vercel/Supabase remote = NIET BEWEZEN.  
7. **feat-promo** — bewust buiten branch.  

**Niet** productiegereed. **Niet** klaar voor push/staging zonder Owner-go.

---

## 19. Bevestigingen

| Claim | |
| --- | --- |
| Niets gepusht | **JA** (geen `git push`; geen upstream) |
| Niets gedeployed | **JA** |
| Geen staging/productie schema/env gewijzigd | **JA** |
| Geen historische contract seals overschreven | **JA** |
| feat-promo niet geïntegreerd | **JA** |

---

## 20. Verdict

| Vraag | Antwoord |
| --- | --- |
| Lokale foundation + Fase 3–7 afronding | **sterk vooruit; surfaces grotendeels EN+NL** |
| Klaar voor push | **NEE** |
| Klaar voor staging | **NEE** (migrations/env/externe verify open) |
| Internationalisering volledig t.o.v. Owner-release | **NEE** tot migrations + products-nl retirement + dual-runtime cleanup + externe gates |
| Verder lokaal | optioneel: migration dry-run docs, remaining Playwright files, lint CJS quarantine |

**Actuele tip voor alle verdere discussie:** `git rev-parse HEAD` in `C:/Users/XXX/vdbdigital-visual-rc6-i18n` op `integration/visual-rc6-i18n-foundation` (bij afronding: `0149f87683776eee0cf29ba8156bf7a0c433766c`; laatste functionele fix `b918b12`).
