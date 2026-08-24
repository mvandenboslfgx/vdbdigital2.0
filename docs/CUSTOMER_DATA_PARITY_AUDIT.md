# CUSTOMER DATA PARITY AUDIT

**Date:** 2026-08-24  
**Gate:** `CUSTOMER_DATA_PARITY`  
**Verdict:** **FAIL** (code root cause fixed in app; same-environment proof and OWNER retest still required)  
**Production mutation:** **NO** — no rows deleted or altered.

This audit started before any further Play Store / general release work. Matthijs reported that the **website** shows the customers he considers real, while the **app** shows extra / unexpected customer data.

---

## 1. Website source of truth

| Item | Proven value |
|------|----------------|
| Page | `/admin/customers` (`src/app/admin/(protected)/customers/page.tsx`), titled **Klanten** |
| Same dataset | `/admin/organizations` uses the same `listAdminOrganizations` |
| Query | Service-role `from("organizations")` in `listAdminOrganizations` (`src/server/repositories/admin-portal.ts`) |
| RPC | None. Direct table read after `requireAdmin` + `customers.view` |
| Tables | **`organizations`** (not `customers`, not `profiles`, not `auth.users`) |
| Default filters | Status `ALL` unless the form sets ACTIVE / INVITED / BLOCKED / ARCHIVED. Search on legal/trade name, customer number, contact email |
| Pagination | Default page size **20**, max 50 |
| Soft-delete | `ARCHIVED` orgs remain visible unless filtered out. No `deleted_at` filter |
| Tenant | Staff sees **all** organizations (service role; no account-manager restriction on the list) |
| Portal user vs customer | A person is a portal customer only with an **ACTIVE** `organization_members` row on a non-BLOCKED / non-ARCHIVED org (`requireCustomer`). Staff with `admin_roles` are redirected to `/admin` |

**Canonical definition:** a **CUSTOMER** is an **`organizations` row**. A **customer user** is a member of such an org. Auth existence alone is not CUSTOMER. PARTNER / PARTNER_PENDING / ADMIN / OWNER / LEAD / CONTACT are not customers unless they also have that membership.

The legacy `customers` table is checkout/order snapshot data (`docs/LEGACY_CUSTOMERS_VS_ORGANIZATIONS.md`). It is **not** the Klanten SSOT.

---

## 2. Website inventory (connected DB = staging RC7)

MCP/project URL: `https://kjricvicakvsreuytvra.supabase.co`  
This is **staging** (`STAGING_SUPABASE_PROJECT_REF`), **not** production `nhsrdnjfsxfikfbdmdfj`.

| Website customer | org_id prefix | email (redacted) | role | status | source | why visible |
|------------------|---------------|------------------|------|--------|--------|-------------|
| RC7 Customer A Household | `292da59f-…` | `cu***@example.com` | org CONSUMER / PRIMARY member | ACTIVE | `organizations` + `organization_members` | Matches Klanten query (status ALL) |

`customers` table: **0 rows**.  
`organizations`: **1 row**.  
That is the entire website Klanten set on this database.

---

## 3. App inventory

| Item | Proven value |
|------|----------------|
| Admin UI | Meer → Klanten → `/(admin)/more/surface/customers` |
| Endpoint | Owner RPC `admin_list_customers` (`listAdminCustomers` → `p_limit` default 25, optional cursor/status) |
| RPC body (live staging) | Reads **`organizations`**, staff-gated (`is_staff_admin`), no archived exclusion, no profiles |
| Mapper | Title from `name` / `legal_name` / `id` |
| Cache | React Query; demo/mock only when `EXPO_PUBLIC_ENABLE_DEMO_MODE` in development |
| Pagination | First page 25 |

On **this same staging DB**, `admin_list_customers` returns the **same 1 organization** as the website.

### Extra identities that are NOT website customers

Privacy-friendly staging `profiles` (14) that the website Klanten page does **not** list:

| Class | Examples (redacted) | Why they exist | Website Klanten? |
|-------|---------------------|----------------|------------------|
| OWNER | `al***@vdbdigital.nl` | `admin_roles.OWNER`, no org membership | No |
| ADMIN | `m.***@gmail.com` (M.A. van den Bos) | `admin_roles.ADMIN`, no org membership | No |
| OWNER fixture | `ow***@example.com` | RC8/S25 fixture | No |
| Partners | `pa***@example.com` ×4 | `partner_profiles` PENDING/ACTIVE/SUSPENDED/REVOKED | No |
| Staff | `st***@example.com` AAL1/AAL2 | SUPPORT / ADMIN | No |
| Orphan “customer” profile | `cu***@example.com` Customer B | Profile without `organization_members` | No |
| Gate fixtures | `s2***@example.com` ×2 | ACTIVE members of the one org (extra users, not extra orgs) | No (not separate Klanten rows) |
| Auth reset fixture | `vd***@gmail.com` | Test account | No |

`portal_projects`: **12** rows. Staff RLS (`is_staff_admin()`) can SELECT all of them.

---

## 4. Diff (same staging DB, admin Klanten lists)

| Bucket | Result |
|--------|--------|
| BOTH | 1 organization: RC7 Customer A Household |
| ONLY WEBSITE | none |
| ONLY APP (admin RPC) | none **if** `admin_list_customers` is used |
| INVALID/TEST | Entire staging org + most profiles are RC7/S25 fixtures |
| UNKNOWN ORIGIN | none on this DB |

**App-only unexpected data appears in the customer shell / identity set, not in the RPC list:**

1. **Client role bug (root cause, now fixed in app source):** `resolveAppRolesFromRecords` always added `customer`. OWNER/ADMIN therefore always had a customer area. Combined with staff RLS on `portal_projects`, OWNER could see **all 12 staging projects** as if they were customer records.
2. **Customer layout had no membership guard** (fixed): any signed-in user could open `/(customer)`.
3. **Area switchers** always offered Klant (fixed): now only if `canAccessCustomerArea`.

---

## 5. Environment proof

| Surface | Supabase ref | Backend URL | Environment | Version |
|---------|--------------|-------------|-------------|---------|
| **Website production** | Intended `nhsrdnjfsxfikfbdmdfj` (`vdb nieuw`). Live site `https://vdbdigital.nl`. Latest production deploy `dpl_Er146o7iT1uZDZjDrL6Aew9GwNmT`, commit `c00ecf36ea0f112551ac3f76339d1f59fc7696d8` | Vercel `vdbdigital2-0` | production | SHA above |
| **This audit DB** | `kjricvicakvsreuytvra` | `https://kjricvicakvsreuytvra.supabase.co` | staging RC7 | MCP connected project |
| **App preview/RC config** | Preview **must** use `kjricvicakvsreuytvra`; production **must** use `nhsrdnjfsxfikfbdmdfj` (`src/config/env.ts` guards) | Same as bound `EXPO_PUBLIC_SUPABASE_URL` | `eas.json` preview → `EXPO_PUBLIC_APP_ENV=preview`; production → `production` | `app-identity.json`: version **1.0.0**, versionCode **7** |
| **App local `.env`** | Docker `127.0.0.1:54521` | local | development | n/a |
| **App `.env.preview.local`** | `kjricvicakvsreuytvra` | staging | preview | n/a |

**P0 environment risk:** If Matthijs compares **production website** (real `organizations` on `nhsrdnjfsxfikfbdmdfj`) with a **preview APK on staging**, the datasets **cannot** match. That is a hard `CUSTOMER_DATA_PARITY` fail until both clients are proven on the **same** intended project ref.

This session could **not** query production `nhsrdnjfsxfikfbdmdfj` (MCP is staging). Production Klanten inventory is therefore **NOT PROVEN** here.

Website production env var `NEXT_PUBLIC_SUPABASE_URL` was not dumped (secret). Isolation allowlist says production website must use `nhsrdnjfsxfikfbdmdfj`.

---

## 6. Data model (tables that exist on staging)

| Table | Role in “klant” |
|-------|-----------------|
| `auth.users` | Login identities (14). **Not** Klanten SSOT |
| `profiles` | Display names (14). **Not** Klanten SSOT |
| `organizations` | **SSOT for admin Klanten** (1) |
| `organization_members` | Customer-user link (3 ACTIVE on the one org) |
| `admin_roles` | OWNER/ADMIN/SUPPORT (5). Not customers |
| `partner_profiles` / `partner_applications` | Partner track. Not customers |
| `customers` | Legacy commerce. **0 rows** |
| `leads` | **0 rows** |
| `portal_projects` / quotes / invoices | Org-scoped work, 12/12/11 on staging |
| `tenants` | **Does not exist** |

---

## 7. Customer definition (architecture)

```
CUSTOMER     = organizations row (legal/commercial account)
CUSTOMER USER = organization_members.status = ACTIVE on a non-blocked/archived org
OWNER/ADMIN  = admin_roles only → staff, not customer
PARTNER      = partner_profiles, not customer
LEAD/CONTACT = separate tables; not auto-promoted
```

Dual roles are allowed only when both relations exist (e.g. partner who is also an org member).

---

## 8. Role parity

| Account (redacted) | Website | App (before fix) | App (after source fix) | DB |
|--------------------|---------|------------------|------------------------|-----|
| `al***@vdbdigital.nl` | OWNER → `/admin`, no portal | OWNER **+ customer** | OWNER/admin/staff only | `admin_roles.OWNER`, no membership |
| `m.***@gmail.com` | ADMIN → `/admin` | ADMIN **+ customer** | ADMIN/staff only | `admin_roles.ADMIN`, no membership |
| RC7 Customer A | Portal via membership | customer | customer | PRIMARY member |
| Partners | Partner routes | partner + **customer** | partner only unless membership | `partner_profiles` |

Backend/DB remain SSOT. The app no longer invents `customer` on the client.

---

## 9. Root cause and fix

**Root cause:** App client role projection defaulted every session to `customer` (`resolveAppRolesFromRecords` started with `Set(['customer'])`). Website never does that. Staff therefore entered the customer shell and, via staff RLS, saw org-scoped rows (projects, etc.) that are not Klanten and are not “his” customers.

**Not done:** deleting staging/production rows to force the lists to look equal.

**Code fix (vdb-app):**

- `customer` only if `organization_members.status = ACTIVE`
- `isCustomer` no longer treats empty roles as customer
- Customer layout redirects without membership
- Admin/partner “switch to customer” hidden without membership
- Caller org resolution requires ACTIVE membership

**Regression tests:**

- Website: `tests/unit/customer-data-ssot.test.ts`
- App: `resolveAppRolesFromRecords` + `roles` unit tests

**Retest still required:** website Klanten, app Meer → Klanten, and API/RPC `admin_list_customers` on the **same** project ref; cross-tenant RLS suite.

---

## 10. Gate

**CUSTOMER_DATA_PARITY: FAIL**

PASS only when all of the following are true:

- [x] Same SSOT table for admin lists (`organizations`) in website + RPC  
- [x] App no longer assigns customer without membership (source)  
- [ ] Website and the **installed** RC APK proven on the same Supabase ref  
- [ ] Matthijs confirms the visible Klanten set matches  
- [ ] No staging fixtures on the compared environment (or explicitly accepted as test-only)  
- [ ] Tenant isolation re-run on that environment  

Until then: **GOOGLE PLAY RELEASE = BLOCKED**.

---

## 11. Broader parity (not started)

Repeat this SSOT method after customer PASS:

| Entity | Website | App | Backend | DB | Status |
|--------|---------|-----|---------|----|--------|
| Customers | `organizations` via `listAdminOrganizations` | `admin_list_customers` → `organizations` | same RPC/table | `organizations` | **FAIL** (env + role until retest) |
| Partners | admin partners UI / applications | `admin_list_partners` → `partner_profiles` | RPC | `partner_profiles` | NOT STARTED |
| Users | `/admin/users` = `admin_roles`+`profiles` | not the Klanten list | — | `admin_roles` | NOT STARTED |
| Products | catalog SSOT | `admin_list_products` | — | catalog tables | NOT STARTED |
| Orders | admin orders | TBD | — | `orders` (0 staging) | NOT STARTED |
| Invoices | portal invoices | `admin_list_invoices` | RPC | `portal_invoices` | NOT STARTED |
| Payments | Mollie/fail-closed | — | — | `payments` / invoice payments | NOT STARTED |

---

## 12. Report fields

| Field | Value |
|-------|--------|
| Unexpected records | Staging fixture profiles + 12 staff-visible portal projects in the customer shell; 1 real Klanten org on staging |
| Root cause | Client always-on `customer` role; possible website-prod vs app-staging mix |
| Fix | Membership-gated customer role/area (app). No production data mutation |
| Regression test | `customer-data-ssot.test.ts` (website); `socialAuth` / `roles` (app) |
| Production mutation required | **NO** |
