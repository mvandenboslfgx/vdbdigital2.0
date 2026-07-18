# Customer Portal Architecture

## Environments

| Audience | Home | Auth |
|----------|------|------|
| Staff (OWNER/ADMIN/SUPPORT/CONTENT) | `/admin` | Supabase Auth + `admin_roles` + AAL2 |
| Customer | `/portal` | Supabase Auth + `organization_members` |
| Guest | Public site | `/inloggen` |

One auth stack (SSR cookies / PKCE). No second role system. Customers are **not** in `admin_roles`.

## Routes

Public auth: `/inloggen`, `/account-aanmaken`, `/wachtwoord-vergeten`, `/wachtwoord-herstellen`, `/account-activeren`, `/uitnodiging/accepteren`, `/e-mail-bevestigen`, `/uitloggen`.

Portal: `/portal`, projecten, offertes, facturen, documenten, berichten, support, meldingen, profiel, beveiliging.

Admin: existing catalog routes plus customers, projects, quotes, invoices, files, messages, support, users, roles, audit.

## Data model (core)

- `organizations` / `organization_members` / `organization_invitations` / `organization_internal_notes`
- `portal_projects` (+ milestones, deliverables, feedback)
- `portal_quotes` / `portal_invoices` / `portal_files`
- `portal_conversations` / `portal_messages`
- `portal_support_tickets` / `portal_support_replies`
- `portal_notifications`

## Security

- RLS on all portal tables; anon deny; membership via `auth.uid()` + `is_org_member`
- Internal notes: staff only
- Quote accept: server action + audit; **no Mollie / no checkout**
- Service role only on server after `requireAdmin` / `requireCustomer`
- Redirect allowlist: `isSafeInternalPath`

## Verification

```bash
npm run db:verify-customer-portal
```

Local DB only (`127.0.0.1` / `localhost`). Without migration: `FAIL — customer portal verification RPC missing`.
