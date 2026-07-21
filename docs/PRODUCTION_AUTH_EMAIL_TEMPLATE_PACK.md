# Production Auth Email Template Pack — VDB Digital Software

**Status:** Corrected — approved for phased Dashboard paste (Magic Link first)  
**Project:** `nhsrdnjfsxfikfbdmdfj` / vdb nieuw  
**Canonical origin:** `https://vdbdigital.nl`  
**From:** `VDB Digital Software <noreply@vdbdigital.nl>`  
**Contact:** `06 28600727`

> Do **not** paste secrets, real user emails, or live tokens into this file.  
> Supabase Dashboard templates were **not** modified by creating or correcting this pack.  
> Paste **only** the NL subject + HTML body into each Dashboard template field. Plain-text blocks below are reference only.

---

## 1. Codeflow verification (read-only)

| Flow | Code evidence | Contract |
|------|---------------|----------|
| Magic link | `requestMagicLinkAction` → `signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: false } })` | ConfirmationURL + redirect to `/auth/callback?next=/portal` |
| Password reset **request** | Route `src/app/(auth)/wachtwoord-vergeten/page.tsx` → `PasswordResetRequestForm` → `requestPasswordResetAction` → `resetPasswordForEmail` | User-facing request URL: `/wachtwoord-vergeten` |
| Password reset **land / set** | `resetPasswordForEmail` `redirectTo` = `{APP_URL}/wachtwoord-herstellen`; page `src/app/(auth)/wachtwoord-herstellen/page.tsx` → `PasswordUpdateForm` | ConfirmationURL lands on `/wachtwoord-herstellen` |
| Password update | `updateUser({ password })` after recovery session | Triggers security notification when enabled |
| Auth callback | `/auth/callback` → `exchangeCodeForSession(code)` → safe `next` / `resolvePostLoginPath` | PKCE / code exchange |
| Customer invite | `organization_invitations` + app token URL `/uitnodiging/accepteren?token=…` | **Not** `inviteUserByEmail` |
| Public signup | No `auth.signUp`; Dashboard signup disabled | Invitation-first |
| MFA | Admin TOTP enroll/challenge/verify → AAL2 | Security notifications for factor add/remove |
| OAuth / phone / anonymous | Not used in app | Off |

### Reset routes (verified in code)

| Route | Exists | Role |
|-------|--------|------|
| `/wachtwoord-vergeten` | **Yes** — `src/app/(auth)/wachtwoord-vergeten/page.tsx` | Aanvraagflow (`PasswordResetRequestForm` / `requestPasswordResetAction`) |
| `/wachtwoord-herstellen` | **Yes** — `src/app/(auth)/wachtwoord-herstellen/page.tsx` | Landingsflow na e-maillink (`PasswordUpdateForm`) |

Security mails that tell the user to request a new reset correctly link to **`https://vdbdigital.nl/wachtwoord-vergeten`**. Do not point users at `/wachtwoord-herstellen` for the request step — that route expects a recovery session from the Auth link.

### Deviations / notes before paste

1. **Invite User (Supabase)** is **NOT APPLICABLE** — invites are application-owned; admin gets `inviteUrl` from the server (no Supabase Invite mail).
2. **Confirm Signup** is **not** the primary invitation-first path. Keep a professional template only as a safety net if Auth ever sends confirmation for an edge-case user create.
3. **Reauthentication** is not driven by the current MFA TOTP UI (TOTP codes are entered in-app). Keep a template ready if Dashboard “secure password change” / sensitive-action email OTP is enabled later.
4. **Change Email Address** is not called from app code today; template is REQUIRED for Dashboard-safe email change when that feature is used.
5. Magic link must keep **`{{ .ConfirmationURL }}`**. Do **not** switch the primary CTA to `{{ .Token }}` (that becomes a standalone OTP, not the current link flow).

No blocking code deviations found for Magic Link or Reset Password.

---

## 2. Language strategy (launch)

**Choice: A — Nederlandse templates als primaire launchtaal**

Why:

- Auth UI copy in app actions is already Dutch.
- Public Auth routes are Dutch (`/inloggen`, `/wachtwoord-vergeten`, `/wachtwoord-herstellen`, `/uitnodiging/accepteren`).
- Supabase Dashboard supports **one** active body per template; bilingual NL+EN doubles length and weakens clarity on mobile.
- EN can be added later via a separate product decision (or a dedicated app/Resend flow), not via fragile Go-template conditionals.

EN subject lines are still provided below for reference / future switch — **paste the NL subject + NL HTML for launch** (not the plain-text blocks).

---

## 3. Shared design system (inline CSS, ~600px)

Use this shell for every HTML template. Replace `{{TITLE}}`, `{{BODY_ROWS}}`, and `{{CTA_BLOCK}}`.

**Source of truth:** production brand tokens in `public/brand/brand-tokens.css` (+ `siteConfig.brand.themeColor`).

| Token | Hex | Email use |
|-------|-----|-----------|
| `--vdb-obsidian` / themeColor | `#08090B` | Header bar, CTA button fill |
| `--vdb-champagne` | `#C7A86B` | Subtitle accent on dark, CTA border |
| `--vdb-champagne-dark` | `#987238` | Links + ConfirmationURL text on white |
| `--vdb-ivory` | `#F4F4F2` | Optional light wash (not required) |
| Card / body | `#FFFFFF` / `#111827` / `#6B7280` | Content surface and text |
| Structural border | `#E5E7EB` | Card outline |

**Do not use** the app CSS `--primary: #4E73FF` (legacy blue) in Auth mail — production brand direction is black/white with champagne-gold accents.

### WCAG contrast (measured)

| Pair | Ratio | Verdict |
|------|-------|---------|
| `#FFFFFF` on CTA `#08090B` | **19.92:1** | Pass AAA (normal text) |
| `#C7A86B` on header `#08090B` | **8.77:1** | Pass AAA (accent subtitle) |
| `#987238` on `#FFFFFF` (links) | **4.38:1** | Pass AA Large / UI (≥3:1); near AA normal (4.5:1) — keep links underlined |
| `#FFFFFF` on `#C7A86B` | **2.27:1** | **Fail** — never use champagne as CTA fill with white text |
| `#FFFFFF` on `#987238` | **4.38:1** | Borderline for 15px body — CTA therefore uses obsidian, not champagne fill |

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VDB Digital Software</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;letter-spacing:0.02em;">VDB Digital Software</p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#C7A86B;">Software gebouwd rond jouw bedrijf</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <!-- TITLE + BODY + CTA -->
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>
              <a href="https://vdbdigital.nl" style="color:#987238;text-decoration:underline;">https://vdbdigital.nl</a><br>
              06 28600727</p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#9CA3AF;">Je ontvangt deze e-mail omdat er een accountactie is aangevraagd of uitgevoerd bij VDB Digital Software.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Primary button pattern:**

```html
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" bgcolor="#08090B" style="border-radius:6px;border:1px solid #C7A86B;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">Knoptekst</a>
    </td>
  </tr>
</table>
```

---

## 4. Auth templates

### A. Magic Link — **REQUIRED**

| Field | Value |
|-------|--------|
| Dashboard name | Magic Link |
| Subject NL | Je inloglink voor VDB Digital Software |
| Subject EN | Your sign-in link for VDB Digital Software |
| Variables | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .RedirectTo }}` |
| Status | **REQUIRED** |

**Technical notes:** Keep CTA on `{{ .ConfirmationURL }}`. App uses `shouldCreateUser: false` and `emailRedirectTo=https://vdbdigital.nl/auth/callback?next=/portal`. Say the link is one-time and temporary — do **not** invent an exact expiry (e.g. “60 minutes”) unless confirmed in Dashboard.

#### HTML (copy into Dashboard)

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inloglink</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#C7A86B;">Software gebouwd rond jouw bedrijf</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Je inloglink</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Hallo,</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Je hebt een inloglink aangevraagd voor <strong>{{ .Email }}</strong> bij VDB Digital Software.</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Klik op de knop hieronder om veilig in te loggen. Deze link is eenmalig en tijdelijk geldig.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center" bgcolor="#08090B" style="border-radius:6px;border:1px solid #C7A86B;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">Inloggen</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#6B7280;">Werkt de knop niet? Kopieer en plak deze URL in je browser:</p>
              <p style="margin:0 0 16px;font-size:12px;line-height:1.5;word-break:break-all;color:#987238;">{{ .ConfirmationURL }}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">Heb jij deze link niet aangevraagd? Negeer deze e-mail. Er wordt dan niet ingelogd.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>
              <a href="https://vdbdigital.nl" style="color:#987238;text-decoration:underline;">https://vdbdigital.nl</a><br>
              06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Je inloglink

Hallo,

Je hebt een inloglink aangevraagd voor {{ .Email }} bij VDB Digital Software.

Open deze eenmalige, tijdelijke link om in te loggen:
{{ .ConfirmationURL }}

Heb jij deze link niet aangevraagd? Negeer deze e-mail.

VDB Digital Software
https://vdbdigital.nl
06 28600727
```

#### Test steps

1. Paste **only** NL subject + HTML in Dashboard → Magic Link (not plain text).
2. **Disable Resend click tracking** for Auth mail (tracking can rewrite Auth links).
3. Request magic link for a known invited/test user from `/inloggen`.
4. Confirm mail From = `VDB Digital Software <noreply@vdbdigital.nl>`.
5. Open the message in **Gmail** — inspect that the CTA href is still the Supabase Auth `ConfirmationURL` (not a tracker redirect).
6. Open the same or a fresh message in **Outlook** — same href check.
7. Before the user clicks: confirm the link is **not** already consumed (no prior prefetch by scanner/client). If the first real click fails as used/expired without user action, treat as prefetch — check Auth logs + Resend delivery logs.
8. Click CTA → lands on `https://vdbdigital.nl/auth/callback?…` then portal/admin home. Keep `{{ .ConfirmationURL }}` (do not convert to OTP).
9. Confirm link cannot be reused after success.
10. On invalid/expired link: check **Supabase Auth logs** and **Resend delivery logs**.
11. Confirm unknown email still shows generic success UI (no user enumeration).

---

### B. Reset Password — **REQUIRED**

| Field | Value |
|-------|--------|
| Dashboard name | Reset Password / Recovery |
| Subject NL | Wachtwoord opnieuw instellen — VDB Digital Software |
| Subject EN | Reset your password — VDB Digital Software |
| Variables | `{{ .ConfirmationURL }}`, `{{ .Email }}` |
| Status | **REQUIRED** |

**Technical notes:** Request UI is `/wachtwoord-vergeten`. App sets Auth `redirectTo` to `/wachtwoord-herstellen`. CTA must use `{{ .ConfirmationURL }}` — never hand-built token URLs.

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wachtwoord opnieuw instellen</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#C7A86B;">Software gebouwd rond jouw bedrijf</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Wachtwoord opnieuw instellen</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Hallo,</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">We ontvingen een verzoek om het wachtwoord te resetten voor <strong>{{ .Email }}</strong>.</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Klik op de knop om een nieuw wachtwoord te kiezen. Deze link is eenmalig en tijdelijk geldig.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center" bgcolor="#08090B" style="border-radius:6px;border:1px solid #C7A86B;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">Wachtwoord opnieuw instellen</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#6B7280;">Werkt de knop niet? Gebruik deze URL:</p>
              <p style="margin:0 0 16px;font-size:12px;line-height:1.5;word-break:break-all;color:#987238;">{{ .ConfirmationURL }}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">Heb jij dit niet aangevraagd? Negeer deze e-mail. Je huidige wachtwoord blijft dan ongewijzigd.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>
              <a href="https://vdbdigital.nl" style="color:#987238;text-decoration:underline;">https://vdbdigital.nl</a><br>
              06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Wachtwoord opnieuw instellen

Hallo,

We ontvingen een verzoek om het wachtwoord te resetten voor {{ .Email }}.

Stel je wachtwoord opnieuw in via deze eenmalige, tijdelijke link:
{{ .ConfirmationURL }}

Heb jij dit niet aangevraagd? Negeer deze e-mail.

VDB Digital Software
https://vdbdigital.nl
06 28600727
```

#### Test steps

1. Paste **only** NL subject + HTML in Dashboard → Reset Password (not plain text).
2. **Disable Resend click tracking** for Auth mail.
3. Request reset from `/wachtwoord-vergeten` for a known user (aanvraagroute — not `/wachtwoord-herstellen`).
4. Open the message in **Gmail** — confirm CTA href is the Auth `ConfirmationURL`, not a tracker rewrite.
5. Open in **Outlook** — same href check.
6. Before the user clicks: confirm the link is **not** already consumed by client/scanner prefetch. If invalid without a user click, check Auth logs + Resend logs.
7. Open CTA → lands on `/wachtwoord-herstellen` with usable recovery session. Keep `{{ .ConfirmationURL }}` (do not convert to OTP).
8. Set new password → login works; old password fails.
9. On invalid/expired link: check **Supabase Auth logs** and **Resend delivery logs**.
10. Confirm unused request for unknown email still shows generic success.

---

### C. Change Email Address — **REQUIRED** (when email change is used)

| Field | Value |
|-------|--------|
| Dashboard name | Change Email Address |
| Subject NL | Bevestig je nieuwe e-mailadres — VDB Digital Software |
| Subject EN | Confirm your new email address — VDB Digital Software |
| Variables | `{{ .ConfirmationURL }}`, `{{ .NewEmail }}`, `{{ .Email }}` |
| Status | **REQUIRED** (Dashboard safety; not primary app UI today) |

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nieuw e-mailadres bevestigen</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Bevestig je nieuwe e-mailadres</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Er is een verzoek gedaan om het e-mailadres van je VDB Digital Software-account te wijzigen naar <strong>{{ .NewEmail }}</strong>.</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Bevestig de wijziging met de knop hieronder. De link is eenmalig en tijdelijk geldig.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center" bgcolor="#08090B" style="border-radius:6px;border:1px solid #C7A86B;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">Nieuw e-mailadres bevestigen</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:12px;line-height:1.5;word-break:break-all;color:#987238;">{{ .ConfirmationURL }}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">Was jij dit niet? Negeer deze e-mail en neem contact op met VDB Digital Software via https://vdbdigital.nl of 06 28600727.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>https://vdbdigital.nl<br>06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Bevestig je nieuwe e-mailadres

Er is een verzoek gedaan om je account-e-mail te wijzigen naar {{ .NewEmail }}.

Bevestig via:
{{ .ConfirmationURL }}

Was jij dit niet? Negeer deze e-mail en neem contact op via https://vdbdigital.nl of 06 28600727.

VDB Digital Software
```

---

### D. Reauthentication — **OPTIONAL**

| Field | Value |
|-------|--------|
| Dashboard name | Reauthentication |
| Subject NL | Je verificatiecode — VDB Digital Software |
| Subject EN | Your verification code — VDB Digital Software |
| Variables | `{{ .Token }}`, `{{ .Email }}` |
| Status | **OPTIONAL** (prepare; current MFA path is TOTP in-app) |

**Technical notes:** Supabase reauthentication mails use **`{{ .Token }}`** (OTP), not ConfirmationURL. Do not invent a custom verify URL.

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificatiecode</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Verificatiecode</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Gebruik de onderstaande code om een gevoelige accountactie te bevestigen voor <strong>{{ .Email }}</strong>.</p>
              <p style="margin:16px 0;font-size:28px;line-height:1.2;letter-spacing:0.12em;font-weight:700;color:#08090B;">{{ .Token }}</p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#6B7280;">Deze code is eenmalig en tijdelijk geldig. Deel de code met niemand.</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">Was jij dit niet? Negeer deze e-mail en neem contact op via https://vdbdigital.nl of 06 28600727.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>https://vdbdigital.nl<br>06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Verificatiecode

Gebruik deze code om een gevoelige accountactie te bevestigen voor {{ .Email }}:

{{ .Token }}

Was jij dit niet? Negeer deze e-mail en neem contact op via https://vdbdigital.nl of 06 28600727.
```

---

### E. Confirm Signup — **OPTIONAL / NOT PRIMARY**

| Field | Value |
|-------|--------|
| Dashboard name | Confirm sign up |
| Subject NL | Bevestig je e-mailadres — VDB Digital Software |
| Subject EN | Confirm your email address — VDB Digital Software |
| Variables | `{{ .ConfirmationURL }}`, `{{ .Email }}` |
| Status | **OPTIONAL** (not invitation-first primary; keep professional fallback) |

Public signup is disabled. Do **not** market this as the customer onboarding mail. Paste only so any edge-case Auth confirmation looks on-brand.

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-mailadres bevestigen</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Bevestig je e-mailadres</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Bevestig <strong>{{ .Email }}</strong> voor je VDB Digital Software-account.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center" bgcolor="#08090B" style="border-radius:6px;border:1px solid #C7A86B;">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;">E-mailadres bevestigen</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:12px;line-height:1.5;word-break:break-all;color:#987238;">{{ .ConfirmationURL }}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7280;">Was jij dit niet? Negeer deze e-mail.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>https://vdbdigital.nl<br>06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Bevestig je e-mailadres

Bevestig {{ .Email }} via:
{{ .ConfirmationURL }}

Was jij dit niet? Negeer deze e-mail.

VDB Digital Software
https://vdbdigital.nl
06 28600727
```

---

### F. Invite User — **NOT APPLICABLE**

| Field | Value |
|-------|--------|
| Dashboard name | Invite user |
| Status | **NOT APPLICABLE** |

**Why:** Customer invitations use `organization_invitations` and  
`https://vdbdigital.nl/uitnodiging/accepteren?token=…` from the application.  
There is **no** `inviteUserByEmail` in the codebase.

**Dashboard advice:** Do **not** activate or rely on the Supabase Invite User template for portal onboarding. Leave Dashboard Invite content unused or minimally branded later if Auth UI ever sends it — it is **not** part of the launch invite path.

No Dashboard activation recommended for this template in the current contract.

---

## 5. Security notification templates

Enable only what the Auth contract needs. Phone / OAuth linking notifications stay **NOT APPLICABLE**.

| Notification | Status | Variables |
|--------------|--------|-----------|
| Password changed | **REQUIRED** | `{{ .Email }}` |
| Email address changed | **REQUIRED** | `{{ .OldEmail }}`, `{{ .Email }}` |
| MFA / verification method added | **REQUIRED** | `{{ .FactorType }}`, `{{ .Email }}` |
| MFA / verification method removed | **REQUIRED** | `{{ .FactorType }}`, `{{ .Email }}` |
| Phone number changed | **NOT APPLICABLE** | — |
| Sign-in method linked | **NOT APPLICABLE** | — |
| Sign-in method removed | **NOT APPLICABLE** | — |

Rules applied: no invented IP/location/time; “Was jij dit niet?”; contact via site/phone; no fake reset deep-link without a supported variable.

### G. Password changed — **REQUIRED**

**Subject NL:** Je wachtwoord is gewijzigd — VDB Digital Software  
**Subject EN:** Your password was changed — VDB Digital Software

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wachtwoord gewijzigd</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#FCA5A5;">Beveiligingsmelding</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Je wachtwoord is gewijzigd</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Het wachtwoord voor je account <strong>{{ .Email }}</strong> bij VDB Digital Software is zojuist gewijzigd.</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;"><strong>Was jij dit niet?</strong> Beveilig je account zo snel mogelijk: vraag een wachtwoordreset aan via https://vdbdigital.nl/wachtwoord-vergeten en neem contact op via https://vdbdigital.nl of 06 28600727.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>https://vdbdigital.nl<br>06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Beveiligingsmelding

Je wachtwoord is gewijzigd

Het wachtwoord voor {{ .Email }} is zojuist gewijzigd.

Was jij dit niet?
1) Ga naar https://vdbdigital.nl/wachtwoord-vergeten
2) Neem contact op via https://vdbdigital.nl of 06 28600727

VDB Digital Software
```

---

### H. Email address changed — **REQUIRED**

**Subject NL:** Je e-mailadres is gewijzigd — VDB Digital Software  
**Subject EN:** Your email address was changed — VDB Digital Software  
**Variables:** `{{ .OldEmail }}`, `{{ .Email }}` (new address per Supabase docs)

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-mailadres gewijzigd</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#FCA5A5;">Beveiligingsmelding</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Je e-mailadres is gewijzigd</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Het e-mailadres van je VDB Digital Software-account is gewijzigd van <strong>{{ .OldEmail }}</strong> naar <strong>{{ .Email }}</strong>.</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;"><strong>Was jij dit niet?</strong> Neem direct contact op via https://vdbdigital.nl of 06 28600727.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>https://vdbdigital.nl<br>06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Beveiligingsmelding

Je e-mailadres is gewijzigd van {{ .OldEmail }} naar {{ .Email }}.

Was jij dit niet? Neem contact op via https://vdbdigital.nl of 06 28600727.
```

---

### I. MFA method added (Verification method added) — **REQUIRED**

**Subject NL:** Nieuwe verificatiemethode toegevoegd — VDB Digital Software  
**Subject EN:** A verification method was added — VDB Digital Software  
**Variables:** `{{ .FactorType }}`, `{{ .Email }}`

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificatiemethode toegevoegd</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#FCA5A5;">Beveiligingsmelding</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Nieuwe verificatiemethode toegevoegd</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Er is een verificatiemethode van type <strong>{{ .FactorType }}</strong> toegevoegd aan account <strong>{{ .Email }}</strong>.</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;"><strong>Was jij dit niet?</strong> Neem direct contact op via https://vdbdigital.nl of 06 28600727.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>https://vdbdigital.nl<br>06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Beveiligingsmelding

Nieuwe verificatiemethode toegevoegd: {{ .FactorType }}
Account: {{ .Email }}

Was jij dit niet? Neem contact op via https://vdbdigital.nl of 06 28600727.
```

---

### J. MFA method removed (Verification method removed) — **REQUIRED**

**Subject NL:** Verificatiemethode verwijderd — VDB Digital Software  
**Subject EN:** A verification method was removed — VDB Digital Software  
**Variables:** `{{ .FactorType }}`, `{{ .Email }}`

#### HTML

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificatiemethode verwijderd</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
          <tr>
            <td style="background-color:#08090B;padding:20px 28px;">
              <p style="margin:0;font-size:18px;line-height:1.3;font-weight:700;color:#FFFFFF;">VDB Digital Software</p>
              <p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#FCA5A5;">Beveiligingsmelding</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Verificatiemethode verwijderd</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Er is een verificatiemethode van type <strong>{{ .FactorType }}</strong> verwijderd van account <strong>{{ .Email }}</strong>.</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;"><strong>Was jij dit niet?</strong> Neem direct contact op via https://vdbdigital.nl of 06 28600727.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6B7280;">VDB Digital Software<br>https://vdbdigital.nl<br>06 28600727</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

#### Plain-textversie (referentie — niet plakken in Supabase)

> Plain-textversie: referentie voor toekomstige custom mailflow.  
> Niet in het Supabase HTML-templateveld plakken.

```text
VDB Digital Software — Beveiligingsmelding

Verificatiemethode verwijderd: {{ .FactorType }}
Account: {{ .Email }}

Was jij dit niet? Neem contact op via https://vdbdigital.nl of 06 28600727.
```

---

## 6. Template safety checklist (all packs)

| Check | Result |
|-------|--------|
| Correct Supabase variables | Pass (documented per template) |
| No invented / unknown variables | Pass |
| No hardcoded tokens | Pass |
| No localhost / www / preview hosts | Pass |
| No foreign project domains | Pass (`vdbdigital.nl` + Supabase `{{ .ConfirmationURL }}` only) |
| No TrustBooker / Grill Gasten / Tawk | Pass |
| No scripts / tracking pixels / forms | Pass |
| Table + inline CSS only | Pass (no broken nesting in packed HTML) |
| Brand tokens from `brand-tokens.css` (no `#4E73FF`) | Pass |
| CTA white-on-obsidian contrast ≥ 4.5:1 | Pass (19.92:1) |
| Plain-text = reference only (not Dashboard paste) | Pass |
| Company details match brief | Pass |
| Magic Link / Reset keep ConfirmationURL | Pass |
| Invite User not recommended for app invites | Pass |
| Reset request URL = `/wachtwoord-vergeten` (verified route) | Pass |
| Reset land URL = `/wachtwoord-herstellen` (verified route) | Pass |

---

## 7. Recommended Dashboard paste order (tomorrow)

1. **Magic Link** (subject NL + **HTML only**) → screenshot open template → then replace → send test (with tracking/prefetch checks)  
2. **Reset Password** → send test (same email-link security checks)  
3. **Change Email Address** (prepare; test if email-change enabled)  
4. **Confirm Signup** (optional fallback)  
5. **Reauthentication** (optional)  
6. Skip **Invite User** activation for portal invites  
7. Security notifications **on** + paste templates:  
   Password changed → Email address changed → MFA added → MFA removed  
8. Only then: OWNER TOTP enroll + AAL2 end-to-end

---

## 8. Overall test plan

1. Magic link known user → CTA → callback → session; Gmail + Outlook; no click-tracking rewrite; no prefetch consumption; Auth + Resend logs on failure.  
2. Magic link unknown user → generic UI; no account created (`shouldCreateUser: false`).  
3. Password reset request from `/wachtwoord-vergeten` → mail → `/wachtwoord-herstellen` → update → security mail “password changed”; same tracking/prefetch/log checks.  
4. MFA enroll OWNER → security mail “method added” → challenge/verify → `aal2`.  
5. Confirm no mails contain localhost, www, Vercel preview, Tawk, scripts, or tracking pixels.  
6. Confirm From display name/address.  
7. Spot-check Gmail + Outlook + mobile rendering (layout, button tap).  
8. Confirm plain-text blocks were **not** pasted into the HTML template field.

---

## 9. Confirmations

- No Supabase Auth settings changed by this document.  
- No remote migrations.  
- No Storage changes.  
- No deployment.  
- No secrets included.  
- `CHECKOUT_ENABLED` remains false.  
- `P05_MIGRATION_APPLIED` remains unset.  
- **No git commit** created for this pack (awaiting operator paste of Magic Link first).