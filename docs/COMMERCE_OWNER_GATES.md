# Commerce finalization — remaining owner gates

**Updated:** 2026-08-20  
**Verdict:** `WEB/BACKEND COMMERCE — BLOCKED`

## Confirmed identities

| Env | Ref | Rule |
|-----|-----|------|
| Production Supabase | `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`) | **Read-only** without explicit OWNER approval |
| Staging / RC7 | `kjricvicakvsreuytvra` | Canonical staging |
| Deprecated | `qzekuvmgfekzsowdecyk` | REMOVED — never use |

## Safe work completed in repo (no prod DB writes)

- Catalog SSOT + mobile RC7 handoff docs
- Software shop: removed customer-facing review/candidate stats
- Shop CTAs: Bestellen / Abonneren / Configureer aanvraag
- PDP: empty LEVERTIJD/VOOR WIE/WERKWIJZE not rendered
- Fulfillment stub on `delivery_released` (manual review + audit)
- Provider adapter registry (internal only)
- `GET /api/catalog/version` + ETag

## OWNER decisions still required

1. **Staging:** create auth user `algemeen@vdbdigital.nl` → `BOOTSTRAP_USER_EMAIL` → `db:bootstrap-owner` → apply governance SQL (named `20260820120000_owner_staff_role_governance.sql` is **not in repo**; use existing `admin_roles` / bootstrap docs) → inventory + RLS + AAL2
2. **Catalog SSOT migrate:** approve mirroring commercial packages into Supabase as DRAFT → legal/price APPROVED → `publication_ready`
3. **`CHECKOUT_ENABLED=true`** on staging first; never live Mollie without approval
4. **TV Streaming €100/yr:** only if distribution rights proven
5. **Production:** no migration / user / role / secret / Mollie live / provider provision without separate OWNER OK
6. **Contract publish:** bump beyond unpublished `0.2.0-rc.3` when catalog API is complete (user cited rc.7 — not present yet)

## Not claiming READY FOR MOBILE INTEGRATION

Mobile may use auth/portal + version probe; must not assume full commerce catalog/checkout/fulfillment APIs.
