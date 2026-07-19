# Production Auth configuration checklist

Project: `nhsrdnjfsxfikfbdmdfj` (vdb nieuw)  
Mode: **operator Dashboard review only** — do not change settings in a remediation round unless separately approved.

Status vocabulary: `VERIFIED` | `MISSING` | `INCORRECT` | `NOT APPLICABLE` | `OPERATOR REVIEW REQUIRED`

API access for Auth settings was **not** available during remediation; defaults below are `OPERATOR REVIEW REQUIRED` until an operator confirms in the Supabase Dashboard.

## Site URL

| Item | Status | Notes |
|------|--------|-------|
| Definitive VDB production domain | OPERATOR REVIEW REQUIRED | Must be HTTPS production origin |
| HTTPS only | OPERATOR REVIEW REQUIRED | |
| No localhost as Site URL | OPERATOR REVIEW REQUIRED | Localhost only in allowlist if consciously needed |

## Redirect allowlist

| Item | Status | Expected path pattern |
|------|--------|------------------------|
| Login / auth callback | OPERATOR REVIEW REQUIRED | `/auth/callback` (or app equivalent) on production origin |
| Password reset | OPERATOR REVIEW REQUIRED | |
| Account activation / confirm | OPERATOR REVIEW REQUIRED | |
| Invitation acceptance | OPERATOR REVIEW REQUIRED | Portal invite flow |
| Approved preview origin | OPERATOR REVIEW REQUIRED | Only if Preview deployments are in scope |
| Localhost redirects | OPERATOR REVIEW REQUIRED | Remove or keep explicitly for local/preview |

## Email / identity

| Item | Status |
|------|--------|
| Confirm-email setting | OPERATOR REVIEW REQUIRED |
| Secure password change | OPERATOR REVIEW REQUIRED |
| SMTP provider configured | OPERATOR REVIEW REQUIRED |
| Sender domain aligned with Resend/`EMAIL_FROM` | OPERATOR REVIEW REQUIRED |
| Email templates (confirm) | OPERATOR REVIEW REQUIRED |
| Invite template | OPERATOR REVIEW REQUIRED |
| Reset template | OPERATOR REVIEW REQUIRED |
| Magic-link template (if used) | OPERATOR REVIEW REQUIRED / NOT APPLICABLE |

## Security controls

| Item | Status |
|------|--------|
| MFA | OPERATOR REVIEW REQUIRED |
| CAPTCHA / Turnstile | OPERATOR REVIEW REQUIRED |
| JWT expiry | OPERATOR REVIEW REQUIRED |
| Refresh token policy | OPERATOR REVIEW REQUIRED |
| OAuth providers | OPERATOR REVIEW REQUIRED (expect none unless approved) |
| Custom Auth domain | OPERATOR REVIEW REQUIRED / NOT APPLICABLE |
| Rate limits | OPERATOR REVIEW REQUIRED |

## Sign-off

| Field | Value |
|-------|--------|
| Operator | |
| Date | |
| Production origin confirmed | |
| Checklist complete (all actionable items VERIFIED or N/A) | yes / no |

Until this checklist is completed, Auth remains a **CONDITIONAL** gate item — not a reason to mutate Auth during remediation.
