# VDB Digital 2.0 — platform finalization report

**Date:** 2026-08-25  
**Repo:** `vdbdigital2.0`  
**Branch work:** website production engine, Admin Command Center, catalog CTA, staging schema  
**Environments:** staging `kjricvicakvsreuytvra` used for schema apply. Production `nhsrdnjfsxfikfbdmdfj` **untouched**. Deprecated `qzekuvmgfekzsowdecyk` unused.

## FINAL VERDICT

`VDBDIGITAL2.0 — BLOCKED`

| Class | Blocker |
|---|---|
| ENV | Same-env staging E2E (invite → pay → intake) not executed in this pass; local `.env` / owner mailbox required |
| OWNER | Mollie live, production migration, `CHECKOUT_ENABLED` on production, yearly third-party licence publish |
| EXTERNAL | Dedicated partner **web** portal lives in a separate repo; Resend real mailbox for invitation E2E |
| CODE | Recurring checkout still fail-closed (by design until rights/provider confirmed); AI website generator does not write production code autonomously |

What **is** done in this pass is the missing business process: paid website order → project → intake → tasks → website job → review lifecycle, plus a real Admin Command Center instead of placeholder orders/leads.

---

## PLATFORM

Public marketing, shop, legal, auth, customer portal and admin routes exist as Next.js App Router pages. Placeholder admin screens that previously said “once Supabase is configured” for **Orders** and **Leads** now query the database.

Broken / fake UX fixed:

- Admin orders list (real `orders` rows, mobile cards)
- Admin leads list (real `leads` rows)
- Shop primary CTA uses Bestellen / Abonneren / Configureer aanvraag instead of quote-everywhere
- Quantity stepper `[-] n [+]`
- Customer intake route `/portal/intake`

Not a full visual/mobile pixel audit of every marketing page in a browser this pass (no logged-in admin session in automation). Header already uses `whitespace-nowrap` to prevent `Oplossin / gen` wrap.

---

## ADMIN

**Before:** flat nav, dashboard with 6 KPIs, orders/leads placeholders, jobs table only.

**Now:** Command Center grouped nav (Overzicht, Sales, Commerce, Delivery, Partners, Service, Automation, Beheer) filtered by permissions. Dashboard KPIs from real counts (leads, customers, projects, orders, payments, quotes, support, website jobs, failed jobs, commissions, payouts). New pages: payments, partners, partner applications, commissions, website-production, automation events. Customers/orders use stacked cards under `md`.

---

## CUSTOMER

SSOT unchanged and documented: customer account = `organizations`; customer user = ACTIVE `organization_members` on a non-blocked org. Staff with `admin_roles` still redirected to `/admin`.

New: automatic intake after website fulfillment; customer can submit structured intake and later approve/request changes (feedback on project).

Parity: website admin Klanten = `organizations` (same as app `admin_list_customers`). Not proven again live in this pass.

---

## PARTNER

Backend RPCs, commissions, payouts, applications already existed. This repo still has **no** customer-facing `/partners` portal (architecture: separate partner app). Admin can now **see** partners, applications, commissions, payouts from SSOT tables.

---

## CATALOG

Supabase SSOT remains. Yearly “€100 / seat” SKU stays DRAFT until supplier/rights are proven. `rc7-catalog-probe` remains the staging publish-without-deploy SKU and now maps to `WEBSITE_PROJECT` fulfillment.

---

## COMMERCE

Flow still: product → (config/quote or cart) → Mollie hosted checkout (fail-closed unless `CHECKOUT_ENABLED`) → webhook → order snapshots in `order_items` → fulfillment. Website packages no longer stop at “manual review / queued_intake_project_link”; they call `createProjectFromOrder`.

---

## WEBSITE AUTOMATION

| Step | Status |
|---|---|
| Project auto-create after paid website SKU | Implemented, idempotent on `source_order_id` |
| Intake auto-create | `website_intakes` NOT_STARTED |
| Tasks / milestones from package template | Onepage / Launch / Growth / Webshop |
| Build spec | JSON on `website_production_jobs.spec` |
| Website job | `WEBSITE_GENERATE`, queued |
| Preview / review | Customer feedback + lifecycle; **no auto production deploy** |
| Deployment records | Lifecycle field only; no Cloudflare/Vercel push wired |

Staging migration `website_production_from_order` **applied** on `kjricvicakvsreuytvra`.

---

## AUTOMATION

`platform_events` table + emit helper (unique `idempotency_key`). Admin `/admin/automation` lists events. Fulfillment jobs remain retryable; retry re-runs delivery with `forceRetry`.

---

## SECURITY

No production writes. Service-role still server-only. Intake RLS: org members can select/update own intake. Website jobs: staff select + service role writes. Customer SSOT not widened.

---

## UI

Desktop admin: grouped sidebar, Command Center label. Mobile admin: grouped drawer + card lists for customers/orders/website jobs. NL shop CTAs. EN labels on quantity stepper.

---

## TESTS

See session log for exact commands. Targeted unit tests added: `tests/unit/website-production-platform.test.ts`, fulfillment probe mapping, customer SSOT helper.

---

## GIT

Source + migration + docs in this working tree. Production not deployed.

---

## PRODUCTION

Untouched. No production migration, no production deploy.

---

## BLOCKERS

1. **ENV** — Full same-env E2E (Mollie test pay → project → intake) needs staging checkout flag + credentials.  
2. **OWNER** — Production schema/deploy, Mollie live, publishing restricted yearly SKUs.  
3. **EXTERNAL** — Partner web portal repo; Resend mailbox for invitation E2E.  
4. **CODE** — Recurring checkout and autonomous AI site generation remain gated (correct).
