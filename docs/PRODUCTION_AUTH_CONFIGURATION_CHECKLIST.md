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

## Screenshot review attempt (2026-07-19 ~23:05)

### AUTH / ORIGIN SCREENSHOT REVIEW — PARTIAL

| Check | Result |
|-------|--------|
| Project ref for review | Expected `nhsrdnjfsxfikfbdmdfj` / `vdb nieuw` |
| Screenshots in chat | Meerdere ontvangen (project identity; Vercel APP_URL edit; Vercel Domains 2026-07-20) |
| Site URL / Redirect URLs | **PARTIEEL VERIFIED** — URL Configuration screenshot 2026-07-20 |
| Providers / SMTP / templates / MFA / CAPTCHA | **PARTIEEL** — Providers/signups screenshot 2026-07-20; SMTP/templates/MFA/CAPTCHA nog open |
| Instellingen gewijzigd door reviewer | **Nee** |
| Code / migraties / commit / deploy door reviewer | **Nee** |

#### Wat zichtbaar is

| Onderdeel | Status | Evidence (geen secrets) |
|-----------|--------|-------------------------|
| Supabase projectnaam `vdb nieuw` | VERIFIED | Project Settings → General → Project name |
| Supabase projectref `nhsrdnjfsxfikfbdmdfj` | VERIFIED | Project Settings → General → Project ID |
| Region `eu-west-1` | VERIFIED | Project Settings → Project region |
| Overview PRODUCTION / Healthy | VERIFIED | Project Overview header + status |
| Vercel env key `NEXT_PUBLIC_APP_URL` aanwezig | VERIFIED | Vercel Environment Variables row |
| Vercel env **waarde** exact `https://vdbdigital.nl` | VERIFIED | Edit-dialog screenshot 2026-07-19 ~23:14 — value exactly `https://vdbdigital.nl` (no slash, no www, HTTPS) |
| Vercel env scope | OPERATOR REVIEW REQUIRED | Eerdere row: **Production and Preview**; bevestig of Preview bewust dezelfde apex gebruikt of een aparte Preview-waarde nodig heeft |
| Vercel Domains — apex `vdbdigital.nl` Production | VERIFIED | Domains screenshot 2026-07-20 — Valid Configuration + Production |
| Vercel Domains — `www.vdbdigital.nl` → apex | VERIFIED (redirect) | 307 redirect naar `vdbdigital.nl` zichtbaar |
| Vercel Domains — `www.vdbdigital.nl` DNS | OPERATOR REVIEW REQUIRED | Badge **DNS Change Recommended** + “View DNS configuration” — redirect OK, DNS-opschoning open |
| Extra domain `www.vdbdigital.shop` → apex | VERIFIED (alias redirect) | 307 → `vdbdigital.nl` (shop-alias; geen Site URL) |
| Vercel default `vdbdigital2-0.vercel.app` | VERIFIED (platform host) | Production Valid Configuration — niet canonical; niet gebruiken als Auth Site URL |
| Supabase Auth Site URL | VERIFIED | URL Configuration — exact `https://vdbdigital.nl` |
| Redirect `…/auth/callback` | VERIFIED | Op allowlist |
| Redirect `…/auth/callback?next=/portal` | VERIFIED | Allowlist screenshot 2026-07-20 — Total URLs: 7 |
| Redirect `…/wachtwoord-herstellen` | VERIFIED | Op allowlist |
| Redirect `…/uitnodiging/accepteren` | VERIFIED (path) | Op allowlist; app-owned invite + `?token=` |
| Localhost redirect entries | OPERATOR REVIEW REQUIRED | 3× `http://localhost:3000/…` aanwezig — OK voor local; Site URL is niet localhost |
| Foreign / www / wildcards op allowlist | VERIFIED (afwezig) | Geen TrustBooker/Grill/www/wildcards zichtbaar |
| Backups | OPERATOR REVIEW REQUIRED | Overview toont **Last Backup: No backups** (FREE / geen bevestigde backup) |

- **Status (review als geheel):** OPERATOR REVIEW REQUIRED (partieel bewijs; Auth URL/security nog open)
- **Blokkeert productieapply:** ja
- **Exacte handmatige actie (resterend):** (1) Email-provider detail (password + magic link toggles); (2) SMTP settings screenshot zonder secrets; (3) Email templates; (4) MFA; (5) CAPTCHA/rate limits/sessions; (6) localhost redirects; (7) optional www DNS; (8) Preview APP_URL scope. **Nooit wachtwoorden/API-keys in chat of checklist plakken.**

**App contract (code, read-only):** invitation-first; password + magic link; no OAuth/phone/anonymous; admin AAL2/TOTP; redirects use `resolveAppUrl()` / `NEXT_PUBLIC_APP_URL`.

**Canonical production origin (code contract):** `https://vdbdigital.nl`  
**Vercel Production `NEXT_PUBLIC_APP_URL`:** VERIFIED — exact `https://vdbdigital.nl` (screenshot edit-dialog 2026-07-19 ~23:14). Scope Production+Preview blijft OPERATOR REVIEW REQUIRED.

**Verwachte Supabase Site URL:** `https://vdbdigital.nl`  
**Verwachte Redirect URLs:**
- `https://vdbdigital.nl/auth/callback`
- `https://vdbdigital.nl/auth/callback?next=/portal`
- `https://vdbdigital.nl/wachtwoord-herstellen`

Geen VERIFIED voor Site URL, redirects, providers, templates, SMTP, MFA of CAPTCHA zonder zichtbaar UI-bewijs.

---

## 1. Project identity

### Project name / ref
- **Status:** VERIFIED
- **Gecontroleerd op:** 2026-07-19
- **Gecontroleerd door:** Cursor agent (CLI/MCP eerder) + operator screenshots 2026-07-19 ~23:05
- **Veilige evidence-referentie:** Project Settings General — name=`vdb nieuw`, Project ID=`nhsrdnjfsxfikfbdmdfj`, region=`eu-west-1`; Overview PRODUCTION Healthy
- **Huidige waarde gemaskeerd:** n/a (geen secrets; member e-mail niet vastgelegd)
- **Verwachte waarde:** vdb nieuw / nhsrdnjfsxfikfbdmdfj
- **Benodigde actie:** none
- **Blokkeert productieapply:** nee

---

## 2. URL Configuration (Dashboard)

### Site URL
- **Status:** VERIFIED
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent (operator screenshot URL Configuration)
- **Veilige evidence-referentie:** Auth → URL Configuration — Site URL field
- **Huidige waarde gemaskeerd:** `https://vdbdigital.nl`
- **Verwachte waarde:** `https://vdbdigital.nl` (HTTPS apex only; no www, no localhost, no trailing slash)
- **Benodigde actie:** none
- **Blokkeert productieapply:** nee

### Redirect allowlist — `/auth/callback`
- **Status:** VERIFIED
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent (screenshot + code)
- **Veilige evidence-referentie:** Allowlist bevat `https://vdbdigital.nl/auth/callback` en `https://vdbdigital.nl/auth/callback?next=/portal` (Total URLs: 7)
- **Huidige waarde gemaskeerd:** beide aanwezig
- **Verwachte waarde:** `https://vdbdigital.nl/auth/callback` and `https://vdbdigital.nl/auth/callback?next=/portal`
- **Benodigde actie:** none
- **Blokkeert productieapply:** nee
### Redirect allowlist — password reset `/wachtwoord-herstellen`
- **Status:** VERIFIED
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent (screenshot)
- **Veilige evidence-referentie:** Allowlist `https://vdbdigital.nl/wachtwoord-herstellen`
- **Huidige waarde gemaskeerd:** aanwezig
- **Verwachte waarde:** `https://vdbdigital.nl/wachtwoord-herstellen`
- **Benodigde actie:** none
- **Blokkeert productieapply:** nee

### Account activation / confirm email
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent (code; templates not screenshotted)
- **Veilige evidence-referentie:** UI hubs `/account-activeren`, `/e-mail-bevestigen`; invite create uses `email_confirm: true`
- **Huidige waarde gemaskeerd:** (templates niet gelezen)
- **Verwachte waarde:** If confirm-email enabled, template/redirect must use `/auth/callback` or documented hub on production origin
- **Benodigde actie:** Review Confirm signup setting + template redirect
- **Blokkeert productieapply:** ja

### Invitation acceptance
- **Status:** VERIFIED (allowlist path) / app route VERIFIED in code
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent
- **Veilige evidence-referentie:** Allowlist `https://vdbdigital.nl/uitnodiging/accepteren`; app builds `{APP_URL}/uitnodiging/accepteren?token=`
- **Huidige waarde gemaskeerd:** path aanwezig
- **Verwachte waarde:** Invite e-mails link to `https://vdbdigital.nl/uitnodiging/accepteren?token=…`
- **Benodigde actie:** Confirm invite e-mail body uses apex (template/SMTP screenshots still open)
- **Blokkeert productieapply:** ja tot e-mail/template origin bewezen

### Preview URLs
- **Status:** VERIFIED (afwezig op Auth allowlist)
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent (screenshot)
- **Veilige evidence-referentie:** Geen `*.vercel.app` / preview wildcards in Redirect URLs
- **Huidige waarde gemaskeerd:** n/a
- **Verwachte waarde:** Only consciously approved Vercel preview origins, or none
- **Benodigde actie:** none for Auth allowlist
- **Blokkeert productieapply:** nee

### Localhost redirects
- **Status:** OPERATOR REVIEW REQUIRED
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent (screenshot)
- **Veilige evidence-referentie:** Allowlist bevat 3× `http://localhost:3000/…` (callback, reset, invite)
- **Huidige waarde gemaskeerd:** localhost entries aanwezig; **Site URL is niet localhost**
- **Verwachte waarde:** Localhost only if local Auth tests required; document retention
- **Benodigde actie:** Keep for local dev or remove before strict go-live
- **Blokkeert productieapply:** nee (Site URL is apex)

### Foreign / case domains (TrustBooker, Grill Gasten, other projects)
- **Status:** VERIFIED (afwezig)
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent (screenshot)
- **Veilige evidence-referentie:** Redirect URLs tonen alleen vdbdigital.nl + localhost
- **Huidige waarde gemaskeerd:** n/a
- **Verwachte waarde:** No TrustBooker / Grill Gasten / foreign company domains on Auth allowlist
- **Benodigde actie:** none
- **Blokkeert productieapply:** nee

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
- **Gecontroleerd op:** 2026-07-20
- **Gecontroleerd door:** Cursor agent
- **Veilige evidence-referentie:** Geen SMTP-settings screenshot. Operator gaf mondeling aan dat SMTP-username `resend` is (Resend SMTP-patroon). **Geen wachtwoord/secret vastgelegd.**
- **Verwachte waarde:** Custom SMTP (not built-in rate-limited mail) for production
- **Benodigde actie:** Screenshot Auth → SMTP (host/port/user/sender zichtbaar; wachtwoord gemaskeerd). Daarna **roteer** elk wachtwoord dat in chat is gedeeld.
- **Testmail:** only to controlled internal address — **not executed** this round
- **Blokkeert productieapply:** ja tot SMTP UI bewezen + sender domain/SPF/DKIM beoordeeld

### Alignment with app mail (`EMAIL_FROM` / Resend)
- **Status:** OPERATOR REVIEW REQUIRED
- **Blokkeert productieapply:** ja if Auth SMTP domain ≠ verified sending domain
- **Benodigde actie:** Compare Auth SMTP sender domain with production Resend/`EMAIL_FROM` (names only in evidence; no secrets)

---

## 5. Providers and registration (code + remote metadata + Dashboard)

### Email / password
- **Status:** VERIFIED (app) + VERIFIED (Dashboard Email provider Enabled)
- **Gecontroleerd op:** 2026-07-20
- **Evidence:** `signInWithPassword` on `/inloggen`; Auth screenshot — Email **Enabled**
- **Benodigde actie:** Open Email provider detail — confirm password sign-in + magic link toggles explicitly
- **Blokkeert productieapply:** nee for Email-on; detail toggles remain recommended review

### Magic link
- **Status:** VERIFIED (app uses it) + OPERATOR REVIEW REQUIRED (Dashboard Email detail)
- **Evidence:** `signInWithOtp`, `shouldCreateUser: false`; Email provider Enabled but inner “magic link” toggle not screenshotted
- **Blokkeert productieapply:** ja until Email-provider detail of template confirms OTP/magic link path

### OAuth / social
- **Status:** NOT APPLICABLE (app) + OPERATOR REVIEW REQUIRED (Dashboard full list)
- **Evidence:** no `signInWithOAuth` in app; screenshot toont Phone/SAML/Web3 Disabled; andere social rows mogelijk buiten frame
- **Benodigde actie:** Scroll volledige Providers-lijst — bevestig geen Google/GitHub/etc. Enabled
- **Blokkeert productieapply:** ja if unexpected OAuth enabled

### Phone auth
- **Status:** VERIFIED (Dashboard Disabled) + NOT APPLICABLE (app)
- **Gecontroleerd op:** 2026-07-20
- **Evidence:** Auth Providers — Phone **Disabled**
- **Blokkeert productieapply:** nee

### Anonymous sign-ins
- **Status:** VERIFIED (Dashboard Disabled)
- **Gecontroleerd op:** 2026-07-20
- **Evidence:** User Signups — Allow anonymous sign-ins **Disabled**
- **Blokkeert productieapply:** nee

### Public signup vs invitation-first
- **Status:** VERIFIED (app) + VERIFIED (Dashboard)
- **Gecontroleerd op:** 2026-07-20
- **Evidence:** no `auth.signUp`; invites via admin; Dashboard **Allow new users to sign up = Disabled**
- **Also visible:** Allow manual linking **Disabled**; Confirm email **Enabled**
- **Blokkeert productieapply:** nee for signup policy

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
| Operator (Dashboard) | partial screenshots (Vercel origin/domains + Supabase URL Configuration) |
| Date (code/API pass) | 2026-07-19 |
| Date (screenshot review) | 2026-07-20 — **PARTIAL** (URL + signup/providers partial; SMTP/templates/MFA open) |
| Production origin confirmed | **yes (Vercel + Supabase Site URL + redirects)** — Auth email/SMTP/MFA still open |
| Checklist complete (all actionable VERIFIED or N/A) | **no** |
| Readiness gate impact | Remains **PRODUCTION MIGRATION GATE CONDITIONAL PASS** |
| Auth settings mutated this round | **no** |
| Customer invite / production e-mail sent | **no** |
| Commit of checklist after this round | pending |

### Open blockers (must clear for Auth → VERIFIED / full PASS)

1. SMTP settings screenshot (no secrets) + rotate any password shared in chat; confirm SPF/DKIM.
2. Email provider detail: password + magic link toggles; confirm OAuth list fully scrolled (none unexpected).
3. E-mail templates (magic link + reset) — apex + VDB copy.
4. Enroll staff MFA (API earlier: 0 factors) and document recovery.
5. CAPTCHA / Auth rate limits / sessions — operator review.
6. Decide keep/remove localhost redirect entries.
7. Optional: Vercel www DNS Change Recommended; Preview APP_URL scope.
8. Backup/PITR posture (Overview: No backups) — accept or remediate before full PASS.

Until these are `VERIFIED`, do **not** create `production-migration-readiness-pass` and do **not** run production apply.
