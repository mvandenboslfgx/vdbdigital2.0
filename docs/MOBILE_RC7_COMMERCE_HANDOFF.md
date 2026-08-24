# Mobile RC7 — Commerce handoff (from vdbdigital2.0)

**Audience:** Mobile app repository engineers  
**Backend repo:** `vdbdigital2.0`  
**Contract pin:** `vdb-backend-contract@0.2.0-rc.3` (**unpublished** — do not treat as production-published)  
**Updated:** 2026-08-20  
**Verdict:** `WEB/BACKEND COMMERCE — BLOCKED` for full dynamic commerce integration

This document describes what the mobile app **can** integrate today and what is **not** ready. No secrets.

---

## 1. Do not build a second catalog in the app

Target: app loads products/categories/prices/options from this backend only.

Today the website still has TypeScript commercial SSOT for packages. Mobile must not copy those cents into the app binary.

---

## 2. What exists for mobile today

| Capability | Status | Notes |
|------------|--------|-------|
| Auth / session (Supabase) | EXISTS | Shared project; AAL2 for **admin** only |
| Customer portal data model | EXISTS | Projects, quotes, invoices, support — portal routes are web; APIs via Supabase client + RLS |
| Partner financial RPCs | EXISTS | Schema in this repo; partner **UI** lives in affiliate repo |
| Public shop products (DB) | PARTIAL | Fail-closed gates; few/no ACTIVE public SKUs depending on env |
| Software license browse | PARTIAL | Fail-closed curated catalog; quote-only |
| Mollie one-time checkout | PARTIAL | Website cart/checkout; `CHECKOUT_ENABLED` fail-closed |
| Catalog version / ETag API | PARTIAL | `GET /api/catalog/version` — content version + ETag; not full product payload |
| Server price-quote API for options+qty | MISSING | Cart revalidates server-side on web only |
| Product options schema API | MISSING | Addons exist in DB; no full configurator contract |
| Fulfillment / entitlements push | PARTIAL | `delivery_released` → audited manual-review jobs; no provider adapters yet |
| Subscriptions / renewals | MISSING | |
| Admin product publish → app refresh | PARTIAL | Admin CMS exists; version bump via `catalog_version` constant |

---

## 2b. Catalog version probe

```http
GET /api/catalog/version
If-None-Match: "<catalog_version>"
```

Response `200`:

```json
{
  "catalog_version": "2026.08.20.commerce-cta-1",
  "contract": "vdb-backend-contract@0.2.0-rc.3",
  "updated_at": "<iso>",
  "status": "partial_ssot",
  "notes": "..."
}
```

`304` when ETag matches. Do not treat this as a full product sync API.

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

## 7. Backend work remaining before READY

1. Single Supabase commercial SSOT (packages leave TS)
2. Public ACTIVE SKUs with media + NL/EN
3. Documented catalog list/detail + `catalog_version`
4. Server quote endpoint (qty + options)
5. Checkout enabled path for FIXED SKUs (owner gate)
6. Post-pay fulfillment job consuming `delivery_released`
7. Contract bump published for mobile consumers

Until then mobile should integrate **portal/auth** surfaces and treat shop as quote-led / secondary.

---

## 8. Production identity (read-only)

| Env | Supabase project ref (public) |
|-----|-------------------------------|
| Production | `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`) |
| Staging / RC7 | `kjricvicakvsreuytvra` (`VDB Digital Staging RC7`) |
| Deprecated | `qzekuvmgfekzsowdecyk` — **REMOVED** — never use |

Never apply staging scripts to production ref.
