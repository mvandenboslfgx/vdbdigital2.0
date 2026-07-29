# PRIMARY OWNER STAGING ASSIGNMENT

- Date: 2026-07-29
- Gate: VDB OWNER RC5 — assign primary owner account on staging
- Staging ref: `qzekuvmgfekzsowdecyk`
- Production ref (read-only only): `nhsrdnjfsxfikfbdmdfj`
- Method: Preference B — guarded staging operator script
  `scripts/staging/assign-primary-owner-staging.mjs` (linked CLI SQL)
- No Preference A RPC exists for `admin_roles` writes (authenticated writes denied by RLS)

## Target account (masked)

| Field | Value |
| --- | --- |
| Email | `m***@gmail.com` |
| User id prefix | `8a88dcb4` |
| Fingerprint | `8c00743bbe80` |
| Email confirmed | true |
| Banned | false |

## Staging target proof (before every write)

| Check | Result |
| --- | --- |
| `supabase/.temp/project-ref` | `qzekuvmgfekzsowdecyk` |
| CLI `projects list` linked | `qzekuvmgfekzsowdecyk` only |
| `APP_ENV` | `staging` |
| `STAGING_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | `qzekuvmgfekzsowdecyk.supabase.co` |
| `scripts/assert-staging-target.ts` | `STAGING_TARGET_GATE: PASS` |
| Production as write target | refused / unused |

## 1. Read-only baseline (pre-assignment)

| Field | Value |
| --- | --- |
| Auth user exists | true |
| Profile linked | false |
| Profile active | n/a (no row yet; default active after create) |
| Admin roles | `[]` (count 0) |
| Primary role | NONE |
| Partner profile | none |
| Org memberships | 0 |
| MFA verified factors | 0 |
| MFA unverified factors | 0 |
| Conflicting role rows | none |
| `partner_payouts` | false |
| `support_internal_notes_rpc` | true (staging operator) |
| `partner_compliance_fixtures` | true (staging operator) |

## 2. Assignment result

| Field | Value |
| --- | --- |
| Previous role | NONE |
| New role | `OWNER` |
| Profile linked | true |
| Profile `is_active` | true |
| Role row count | 1 (no conflicting legacy roles) |
| Partner/customer data wiped | no (none existed; untouched) |
| Idempotent re-run | PASS (`previous_role=OWNER`, `idempotent=true`) |

### Audit (no PII)

| Field | Value |
| --- | --- |
| Action | `admin.owner_role_assigned_staging` |
| First audit id prefix | `b1eaf500` |
| Metadata | `method=guarded_staging_operator_script`, `staging_ref=qzekuvmgfekzsowdecyk`, `previous_role=NONE`, `new_role=OWNER`, fingerprint only |

## 3. Capability / role resolution

### Server-side (staging)

| Check | Result |
| --- | --- |
| `admin_roles.role` | `OWNER` |
| `is_admin_or_owner` eligible | true |
| `is_staff_admin` eligible | true |
| Owner/Admin capability set | `dashboard.read`, `work_queue.read`, `directory.read`, `settings.read`, `security.read`, `commission.approve`, `commission.reject`, `partner.suspend`, `partner.reactivate` |
| Web OWNER permission extras (from `src/lib/auth/permissions.ts`) | includes Admin set + `roles.manage`, `settings.manage`, `products.legal_approve`, `payments.refund`, `audit.read` |

### Web

- Role source: `admin_roles` via server-only `loadTrustedAdminRole` / `resolvePostLoginPath` — not client email comparison.
- AAL2 gate: `requireAdmin()` → `requireAal2()`; sensitive permissions also check `SENSITIVE_PERMISSIONS`.
- Logout: `src/app/(auth)/uitloggen/route.ts` calls `supabase.auth.signOut()` and writes `auth.logout` audit — session cleared; next login re-reads role from DB.

### Mobile

- Mobile app source is not in this repository. Backend contract for staff is `admin_roles` + `is_staff_admin()` / `is_admin_or_owner()`.
- Expected Owner primary navigation (contract/product requirement): Home, Goedkeuringen, Tickets, Financiën, Meer — five tabs; Meer routes are staff directories.
- Runtime Mobile tab/cache proof for this personal session was **not** executed in this gate (no password/session for the personal account in local vault; MFA not enrolled).

### Hardcoded bypass scan

| Pattern | Result |
| --- | --- |
| `matthijsvandenbos8` in `src/` | none |
| `email === …` Owner allowlist in `src/` | none |
| `isAdmin = true` override in `src/` | none |

## 4. MFA / AAL2 (personal account)

| Check | Result |
| --- | --- |
| Verified TOTP factors | **0** |
| Unverified factors | 0 |
| Fresh-login AAL1 proof for this account | NOT RUN (no session credential in vault) |
| Wrong-code / right-code AAL2 step-up for this account | NOT RUN |
| `require_aal2()` lowered | no |

**Stop condition (section 5):** human MFA enrollment is required before personal-account AAL2 can be proven.

### What Matthijs must do on staging (official Supabase MFA flow)

1. Open the staging Owner web app (or staging Mobile build) pointed at `qzekuvmgfekzsowdecyk`.
2. Sign in as `matthijsvandenbos8@gmail.com` with the normal password (AAL1).
3. When redirected to MFA setup (`/admin/mfa/setup` on web), enroll TOTP via the on-screen QR / provisioning URI.
4. Confirm enrollment with a current authenticator code (factor becomes `verified`).
5. Sign out completely.
6. Sign in again — session must start at AAL1.
7. Open a sensitive Owner action (e.g. commission reject / partner suspend UI) — step-up challenge must appear.
8. Enter a wrong code once — must be denied.
9. Enter the correct code — session becomes AAL2 and the action may proceed by capability.
10. Sign out again; a new login must again start at AAL1 (no permanent elevated AAL2).

Do **not** insert a verified factor via SQL. Do **not** store the TOTP secret in Git or chat.

A separate staging MFA operator fixture already exists for RC5 AAL2 surface proof (`MOBILE_MFA_AAL2_HANDOFF.md`) — that does **not** replace enrollment on this personal account.

## 5. Financial / product fail-closed

| Control | Staging state |
| --- | --- |
| `partner_payouts` | false |
| Checkout (Vercel staging `CHECKOUT_ENABLED`) | false |
| Payments live | false |
| Payout execution / Mollie live | not enabled by this gate |

## 6. Production safety (read-only MCP)

| Field | Value |
| --- | --- |
| Auth exists | true |
| Email masked | `m***@gmail.com` |
| User id prefix | `11e054c2` |
| Fingerprint | `5e4a964cc150` |
| Profile linked | false |
| Admin roles | `[]` |
| MFA verified | 0 |
| Writes / migrations / flags / MFA changes | **none** |

Production remains without OWNER for this personal account. Any production OWNER assignment requires a separate explicit authorization.

## 7. Open limitations (blockers for PASS)

1. **Personal account has zero verified MFA factors** — AAL2 step-up cycle not proven for this identity.
2. **Mobile runtime navigation / logout-cache isolation** not executed against a live personal Owner session in this gate.
3. Mobile five-tab UI confirmation requires the staging Samsung build + personal login after MFA enrollment.

## 8. Commit / deploy boundaries

- No push.
- No Vercel deployment.
- No Mobile build / AAB / Play Store.
- No production write.
- Guarded script added under `scripts/staging/` only when needed for Preference B.

## Verdict

```
PRIMARY OWNER STAGING ASSIGNMENT BLOCKED
```

Reason: staging canonical `OWNER` role + Owner/Admin capability projection + audit + production untouched are complete, but **MFA/AAL2 is not uitvoerbaar for the personal account** until Matthijs completes official TOTP enrollment and the AAL1→AAL2 proofs above.
