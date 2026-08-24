# Mobile RC7 — Commerce handoff (from vdbdigital2.0)

**Audience:** Mobile app repository engineers  
**Backend repo:** `vdbdigital2.0`  
**Contract pin:** `vdb-backend-contract@0.2.0-rc.3` (**unpublished** — do not treat as production-published)  
**Updated:** 2026-08-24  
**Verdict:** `WEB/BACKEND COMMERCE — READY FOR MOBILE INTEGRATION` for catalog/quote/auth/portal contracts. Live invitation/payout E2E and Mollie checkout remain owner-gated.

This document describes what the mobile app **can** integrate today. No secrets.

---

## 1. Do not build a second catalog in the app

App loads products/categories/prices from this backend only. Public shop is Supabase SSOT (`GET /api/catalog/version` status `supabase_ssot`). Do not copy euro cents into the app binary.

---

## 2. What exists for mobile today

| Capability | Status | Notes |
|------------|--------|-------|
| Auth / session (Supabase) | EXISTS | Shared project; AAL2 for **admin** only |
| Customer portal data model | EXISTS | Projects, quotes, invoices, support — RLS |
| Partner financial RPCs | EXISTS | Partner cannot set price/payment/payout |
| Public shop products (DB) | EXISTS | Fail-closed publish gate; admin publish without git deploy |
| Server price-quote API | EXISTS | `POST /api/commerce/quote` — preview only; server is source of truth |
| Mollie one-time checkout | EXISTS, FAIL-CLOSED | Website cart/checkout; `CHECKOUT_ENABLED` off by default; test-mode only |
| Catalog version / ETag API | EXISTS | `GET /api/catalog/version` |
| Fulfillment jobs | EXISTS | Persist + admin `/admin/jobs`; adapters fail closed to manual review |
| Subscriptions / renewals | PREPARED | Yearly quantity/billing/entitlement modelled; not ACTIVE without supplier rights |
| Invoices from paid orders | PARTIAL | Portal invoices exist; shop auto-invoice still fail-closed without org mapping |

---

## 2b. Catalog version probe

```http
GET /api/catalog/version
If-None-Match: "<catalog_version>"
```

```json
{
  "catalog_version": "2026.08.24.supabase-ssot-1",
  "contract": "vdb-backend-contract@0.2.0-rc.3",
  "updated_at": "<iso>",
  "status": "supabase_ssot",
  "notes": "Public shop catalog is Supabase-backed."
}
```

---

## 2c. Server quote (preview only)

```http
POST /api/commerce/quote
Content-Type: application/json

{ "slug": "rc7-catalog-probe", "quantity": 2 }
```

Success includes `previewOnly: true`, `unitPriceCents`, `lineTotalCents`. Never send client totals to payment.

---

## 3. Auth & roles (mobile must honor)

| Role | Mobile expectation |
|------|-------------------|
| CUSTOMER | Own org data only |
| PARTNER | Own partner scope only (use partner RPCs; never trust client filters alone) |
| ADMIN / SUPPORT / CONTENT | Prefer web admin; if exposed, require AAL2 for sensitive actions |
| OWNER | Bootstrap `algemeen@vdbdigital.nl` — never auto-promote from email in app |

Frontend hiding ≠ authorization. RLS + server RPCs are authoritative.

---

## 4. Deep links (website / app)

Existing patterns to preserve:

- scheme `vdbdigital`
- applinks host `vdbdigital.nl`
- path `/app`

Payment return / login deep links must land on authenticated handlers that re-check session; never trust query amounts.

---

## 5. Required mobile env (names only)

- Supabase URL + publishable key (environment-specific)
- App URL / deep link hosts
- **Never** service role / Mollie secret / Resend secret in the app

---

## 6. Tests mobile must run after integration

- Catalog empty / fail-closed does not crash
- Cross-tenant: customer A cannot read customer B
- Partner cannot read other partner commissions
- Price shown in UI ≠ trusted for payment (server recalculates)
- Offline cache respects catalog version once API exists
- Logout clears tokens

---

## 7. Remaining owner gates (not code blockers)

- Staging `RESEND_TEST_TO` real mailbox for invitation E2E (never `noreply@vdbdigital.nl`)
- RC7 anon + service-role keys in local env if live admin/E2E against staging is required
- OWNER + AAL2 session for payout review E2E
- `CHECKOUT_ENABLED=true` only on staging for Mollie **test-mode**
- Supplier/rights confirmation before publishing any yearly third-party-like licence SKU
- Production remains read-only / no-write

Mobile can integrate catalog, quote, auth, portal, and order states now. Do not wait for mailbox/payout E2E.

---

## 8. Production identity (read-only)

| Env | Supabase project ref (public) |
|-----|-------------------------------|
| Production | `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`) |
| Staging / RC7 | `kjricvicakvsreuytvra` (`VDB Digital Staging RC7`) |
| Deprecated | `qzekuvmgfekzsowdecyk` — **REMOVED** — never use |

Never apply staging scripts to production ref.
