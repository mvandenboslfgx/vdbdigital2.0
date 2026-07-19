# Production Auth configuration checklist

Project identity (CLI/API verified 2026-07-19):

| Field | Value |
|-------|--------|
| Project name | vdb nieuw |
| Project ref | `nhsrdnjfsxfikfbdmdfj` |
| Status | ACTIVE_HEALTHY |
| Linked locally | yes |

**Mode:** read-only verification. No Auth Dashboard mutations in this round.

**Status vocabulary:** `VERIFIED` | `MISSING` | `INCORRECT` | `NOT APPLICABLE` | `OPERATOR REVIEW REQUIRED`

---

## Screenshot review attempt (2026-07-19 ~22:15)

### AUTH DASHBOARD SCREENSHOT REVIEW — BLOCKED

| Check | Result |
|-------|--------|
| Project ref for review | Expected `nhsrdnjfsxfikfbdmdfj` / `vdb nieuw` |
| Screenshots in chat / `docs/evidence/auth-dashboard/` | **MISSING** — geen afbeeldingen ontvangen of gevonden |
| Live Dashboard browser tab | Nog op Supabase **sign-in** (`returnTo` = Auth URL config voor juiste ref) |
| Site URL / Redirect URLs / SMTP / templates / MFA / CAPTCHA gelezen uit UI | **Nee** |
| Instellingen gewijzigd | **Nee** |
| Code / migraties / commit / deploy | **Nee** |

- **Status (review als geheel):** OPERATOR REVIEW REQUIRED
- **Huidige waarde gemaskeerd:** (geen Dashboard-waarden beschikbaar)
- **Verwachte waarde:** Screenshots of ingelogde Dashboard-sessie voor project `nhsrdnjfsxfikfbdmdfj` covering URL config, providers, templates, SMTP, MFA, attack protection, sessions
- **Verschil:** Review kan niet worden uitgevoerd zonder beeldmateriaal
- **Risico:** Verkeerde VERIFIED/INCORRECT-classificatie als er geraden wordt
- **Exacte handmatige actie:** Sla screenshots (zonder secrets) op in gitignored `docs/evidence/auth-dashboard/` of plak ze in de chat, minstens: (1) project header met naam/ref, (2) URL Configuration Site URL + Redirect URLs, (3) Providers, (4) Email templates list/detail, (5) SMTP, (6) MFA, (7) Rate limits / CAPTCHA / Attack protection, (8) Sessions/security. Bevestig tegelijk productie `NEXT_PUBLIC_APP_URL` origin (gemaskeerd: alleen host, geen secrets).
- **Blokkeert productieapply:** ja

Tot screenshots aanwezig zijn blijven alle Dashboard-onderdelen hieronder op hun eerdere status (**OPERATOR REVIEW REQUIRED** of code-side VERIFIED/N/A). Er worden **geen** statuses naar VERIFIED gezet op basis van ontbrekende UI-evidence.

**App contract (code, read-only):** invitation-first; password + magic link; no OAuth/phone/anonymous; admin AAL2/TOTP; redirects use `resolveAppUrl()` / `NEXT_PUBLIC_APP_URL`.

**Canonical production origin (code contract):** `https://vdbdigital.nl`  
**Vercel Production `NEXT_PUBLIC_APP_URL`:** OPERATOR REVIEW REQUIRED until Matthijs confirms Production env is exactly `https://vdbdigital.nl` (no slash, no www, no localhost).

**Verwachte Supabase Site URL:** `https://vdbdigital.nl`  
**Verwachte Redirect URLs:**
- `https://vdbdigital.nl/auth/callback`
- `https://vdbdigital.nl/auth/callback?next=/portal`
- `https://vdbdigital.nl/wachtwoord-herstellen`

Dashboardwaarden hieronder blijven **OPERATOR REVIEW REQUIRED** zonder aangeleverde screenshots. Geen VERIFIED voor Site URL/redirects tot screenshot-review.

---

## 1. Project identity

### Project name / ref
- **Status:** VERIFIED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent (CLI `projects list` + MCP `get_project`)
- **Veilige evidence-referentie:** linked=`true`, name=`vdb nieuw`, ref=`nhsrdnjfsxfikfbdmdfj`
- **Huidige waarde gemaskeerd:** n/a
- **Verwachte waarde:** vdb nieuw / nhsrdnjfsxfikfbdmdfj
- **Benodigde actie:** none
- **Blokkeert productieapply:** nee

---

## 2. URL Configuration (Dashboard)

### Site URL
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent (Dashboard login wall)
- **Veilige evidence-referentie:** `docs/evidence/auth-dashboard/README-session-2026-07-19.md`
- **Huidige waarde gemaskeerd:** (niet gelezen)
- **Verwachte waarde:** `https://vdbdigital.nl` (HTTPS apex only; no www, no localhost, no trailing slash)
- **Benodigde actie:** Operator opent Auth → URL Configuration; set Site URL to chosen production origin; confirm no TrustBooker/Grill/foreign domains
- **Blokkeert productieapply:** ja

### Redirect allowlist — `/auth/callback`
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent (code + Dashboard inaccessible)
- **Veilige evidence-referentie:** `src/app/auth/callback/route.ts`; magic link `redirectTo` → `{APP_URL}/auth/callback?next=/portal`
- **Huidige waarde gemaskeerd:** (niet gelezen)
- **Verwachte waarde:** `https://<prod-origin>/auth/callback` and optionally `https://<prod-origin>/auth/callback?next=/portal` (prefer exact paths)
- **Benodigde actie:** Confirm present on allowlist; remove foreign/preview unless approved
- **Blokkeert productieapply:** ja

### Redirect allowlist — password reset `/wachtwoord-herstellen`
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent (code)
- **Veilige evidence-referentie:** `src/server/actions/auth-actions.ts` reset → `{APP_URL}/wachtwoord-herstellen`
- **Huidige waarde gemaskeerd:** (niet gelezen)
- **Verwachte waarde:** `https://<prod-origin>/wachtwoord-herstellen`
- **Benodigde actie:** Confirm on allowlist
- **Blokkeert productieapply:** ja

### Account activation / confirm email
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent (code)
- **Veilige evidence-referentie:** UI hubs `/account-activeren`, `/e-mail-bevestigen`; invite create uses `email_confirm: true` — confirm-signup may be rare
- **Huidige waarde gemaskeerd:** (niet gelezen)
- **Verwachte waarde:** If confirm-email enabled, template/redirect must use `/auth/callback` or documented hub on production origin — no localhost
- **Benodigde actie:** Review Confirm signup setting + template redirect
- **Blokkeert productieapply:** ja

### Invitation acceptance
- **Status:** OPERATOR REVIEW REQUIRED (Auth allowlist) / app route VERIFIED in code
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent
- **Veilige evidence-referentie:** `/uitnodiging/accepteren?token=` is app-owned (not Supabase Auth redirect); still ensure e-mail bodies use production origin
- **Huidige waarde gemaskeerd:** n/a for allowlist
- **Verwachte waarde:** Invite e-mails link to `https://<prod-origin>/uitnodiging/accepteren?token=…`
- **Benodigde actie:** Confirm invite e-mail content / admin invite builder origin
- **Blokkeert productieapply:** ja (wrong origin in invite mail)

### Preview URLs
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent
- **Veilige evidence-referentie:** —
- **Huidige waarde gemaskeerd:** (niet gelezen)
- **Verwachte waarde:** Only consciously approved Vercel preview origins, or none
- **Benodigde actie:** Remove unapproved preview wildcards
- **Blokkeert productieapply:** ja if unknown domains present

### Localhost redirects
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent
- **Veilige evidence-referentie:** Local APP_URL is localhost (dev). Production Site URL must not be localhost.
- **Huidige waarde gemaskeerd:** (niet gelezen)
- **Verwachte waarde:** Localhost only if local Auth tests required; document retention
- **Benodigde actie:** Confirm production Site URL is HTTPS prod origin
- **Blokkeert productieapply:** ja if Site URL is localhost

### Foreign / case domains (TrustBooker, Grill Gasten, other projects)
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent
- **Veilige evidence-referentie:** Isolation allowlist: case domains are product/case context only — not Auth origins
- **Huidige waarde gemaskeerd:** (niet gelezen)
- **Verwachte waarde:** No TrustBooker / Grill Gasten / foreign company domains on Auth allowlist
- **Benodigde actie:** Scan Redirect URLs list; remove foreign entries
- **Blokkeert productieapply:** ja if present

---

## 3. E-mailtemplates (Dashboard)

| Template | Status | Blokkeert apply | Verwachte actie |
|----------|--------|-----------------|-----------------|
| Confirm signup | OPERATOR REVIEW REQUIRED | ja | NL copy; `{{ .ConfirmationURL }}` / SSR-compatible; prod origin; no localhost |
| Invite user | OPERATOR REVIEW REQUIRED | ja | Prefer app invite flow; if used, VDB branding + prod links |
| Magic link | OPERATOR REVIEW REQUIRED | ja | **In use** (`signInWithOtp`); must land on `/auth/callback` |
| Change email address | OPERATOR REVIEW REQUIRED | ja | Prod links; secure change flow |
| Reset password | OPERATOR REVIEW REQUIRED | ja | Must align with `/wachtwoord-herstellen` |
| Reauthentication | OPERATOR REVIEW REQUIRED | ja | Review if enabled |
| Security notifications | OPERATOR REVIEW REQUIRED | nee* | Enable preferred; *does not block schema apply but recommended before go-live |

Per template also verify: VDB Digital branding; NL text; no foreign company; no preview leftovers; no hardcoded tokens; variables not broken.

Evidence: Dashboard inaccessible this round → operator screenshots under `docs/evidence/auth-dashboard/` (gitignored).

---

## 4. SMTP (Dashboard)

### Custom SMTP
- **Status:** OPERATOR REVIEW REQUIRED
- **Blokkeert productieapply:** ja
- **Verwachte waarde:** Custom SMTP (not built-in rate-limited mail) for production
- **Benodigde actie:** Confirm provider; sender domain VDB/auth; sender name `VDB Digital Software`; SPF/DKIM confirmed; DMARC reviewed; no link rewriting/tracking that breaks Auth URLs
- **Testmail:** only to controlled internal address — **not executed** this round

### Alignment with app mail (`EMAIL_FROM` / Resend)
- **Status:** OPERATOR REVIEW REQUIRED
- **Blokkeert productieapply:** ja if Auth SMTP domain ≠ verified sending domain
- **Benodigde actie:** Compare Auth SMTP sender domain with production Resend/`EMAIL_FROM` (names only in evidence)

---

## 5. Providers and registration (code + remote metadata + Dashboard)

### Email / password
- **Status:** VERIFIED (app) + OPERATOR REVIEW REQUIRED (Dashboard enabled flag)
- **Evidence:** `signInWithPassword` on `/inloggen`
- **Blokkeert productieapply:** ja until Dashboard confirms Email provider on

### Magic link
- **Status:** VERIFIED (app uses it) + OPERATOR REVIEW REQUIRED (Dashboard)
- **Evidence:** `signInWithOtp`, `shouldCreateUser: false`
- **Blokkeert productieapply:** ja until template + provider confirmed

### OAuth / social
- **Status:** NOT APPLICABLE (app) + OPERATOR REVIEW REQUIRED (Dashboard must show none unexpected)
- **Evidence:** no `signInWithOAuth` in app
- **Remote identities providers (metadata):** `email` only
- **Blokkeert productieapply:** ja if Dashboard has unexpected OAuth clients

### Phone auth
- **Status:** NOT APPLICABLE (app) + OPERATOR REVIEW REQUIRED (Dashboard should be off)
- **Remote:** users with phone = 0
- **Blokkeert productieapply:** ja if phone auth enabled without product support

### Anonymous sign-ins
- **Status:** NOT APPLICABLE (app) + OPERATOR REVIEW REQUIRED (Dashboard should be off)
- **Blokkeert productieapply:** ja if enabled

### Public signup vs invitation-first
- **Status:** VERIFIED (app invitation-first)
- **Evidence:** no `auth.signUp`; `/account-aanmaken` creates lead only; invites via `admin.createUser`
- **Dashboard:** OPERATOR REVIEW REQUIRED — disable open signup if present
- **Blokkeert productieapply:** ja if public signup enabled in Dashboard

---

## 6. MFA and AAL2

### App AAL2 contract
- **Status:** VERIFIED
- **Evidence:** `requireAal2` / `requireAdmin` / admin protected layout; TOTP setup/verify routes under `/admin/mfa/*`
- **Blokkeert productieapply:** nee (code gate present)

### Dashboard MFA availability + enrolled staff factors
- **Status:** OPERATOR REVIEW REQUIRED / risk note
- **Remote metadata:** `auth.mfa_factors` count = **0** (no enrolled factors yet)
- **Blokkeert productieapply:** ja for **staff go-live** until OWNER/ADMIN enroll MFA; schema migration apply may proceed only if operator accepts staff cannot reach `/admin` until enroll — still mark as open Auth blocker for full PASS
- **Benodigde actie:** Enable MFA in Dashboard if needed; enroll staff TOTP; document recovery

### Client-only AAL2 bypass
- **Status:** VERIFIED (server-enforced)
- **Evidence:** server `requireAal2` on admin path
- **Blokkeert productieapply:** nee

---

## 7. Bot and abuse protection

### CAPTCHA / Turnstile (Auth Dashboard + app env)
- **Status:** OPERATOR REVIEW REQUIRED
- **Local `.env.local`:** Turnstile keys **absent**
- **Blokkeert productieapply:** ja for public Auth abuse posture (operator may accept risk with documented rate limits only)
- **Benodigde actie:** Decide CAPTCHA for signup/reset/OTP; configure Dashboard + env if required

### Auth rate limits
- **Status:** OPERATOR REVIEW REQUIRED
- **Blokkeert productieapply:** ja until reviewed (signup, reset, OTP, verify, refresh, MFA challenge, invite abuse)
- **Benodigde actie:** Review Dashboard rate limits vs expected traffic

---

## 8. Session and token policy (Dashboard)

| Item | Status | Blokkeert apply |
|------|--------|-----------------|
| JWT expiry | OPERATOR REVIEW REQUIRED | ja (document current value) |
| Refresh token policy | OPERATOR REVIEW REQUIRED | ja |
| Session duration | OPERATOR REVIEW REQUIRED | ja |
| Secure password change | OPERATOR REVIEW REQUIRED | ja |
| Email change confirmation | OPERATOR REVIEW REQUIRED | ja |
| Security notification emails | OPERATOR REVIEW REQUIRED | nee* (recommended) |
| Account blocking / banned users | OPERATOR REVIEW REQUIRED | nee* |
| Staff recovery procedure | OPERATOR REVIEW REQUIRED | ja for ops readiness |
| Revoked membership behaviour | VERIFIED (app tenancy) + OPERATOR REVIEW REQUIRED (session revoke ops) | nee for schema |

Do not change values in the first verification pass — classify only.

---

## Remote Auth metadata (read-only SQL, no PII)

| Metric | Count |
|--------|-------|
| auth.users | 1 |
| email confirmed | 1 |
| mfa_factors | 0 |
| identity providers | email |
| users with phone | 0 |

---

## Sign-off

| Field | Value |
|-------|--------|
| Operator (Dashboard) | _pending — screenshots not supplied_ |
| Date (code/API pass) | 2026-07-19 |
| Date (screenshot review) | 2026-07-19 — **BLOCKED** (no images) |
| Production origin confirmed | **no** |
| Checklist complete (all actionable VERIFIED or N/A) | **no** |
| Readiness gate impact | Remains **PRODUCTION MIGRATION GATE CONDITIONAL PASS** |
| Auth settings mutated this round | **no** |
| Customer invite / production e-mail sent | **no** |
| Commit of checklist after this round | **not done** (review incomplete) |

### Open blockers (must clear for Auth → VERIFIED / full PASS)

1. Operator login to project `nhsrdnjfsxfikfbdmdfj` Auth URL Configuration — confirm Site URL + allowlist.
2. Confirm e-mail templates (especially magic link + reset) use production origin and Dutch VDB copy.
3. Confirm custom SMTP + SPF/DKIM for production.
4. Confirm providers: email on; OAuth/phone/anonymous off; no public signup.
5. Enroll staff MFA (currently 0 factors) and document recovery.
6. Decide CAPTCHA/rate limits; align production `NEXT_PUBLIC_APP_URL` (not localhost).

Until these are `VERIFIED`, do **not** create `production-migration-readiness-pass` and do **not** run production apply.
