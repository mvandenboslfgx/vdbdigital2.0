# Staging Accounts and Fixture Plan

**Status:** PLAN — no accounts created; no passwords in Git  
**Synthetic only — no real PII / no production emails**

---

## Test accounts (fictitious)

| ID | Role | Purpose | Scenarios |
|----|------|---------|-----------|
| `cust_a` | customer | Primary customer org A | 1–3, 7, 10 |
| `cust_b` | customer | Isolation peer | 10 |
| `part_pending` | partner_pending | Onboarding | 4 (pre) |
| `part_a` | partner | Approved partner A | 4–6, 8–10 |
| `part_b` | partner | Isolation peer | 10 |
| `staff_s` | staff | Limited staff | 2–5 |
| `admin_a` | admin | Admin ops | 2–5, 9 |
| `owner_o` | owner | Break-glass / approvals | 5, 9 |
| `user_disabled` | disabled | Negative auth | auth negatives |
| `user_unconfirmed` | unconfirmed | Negative auth | auth negatives |

**Email pattern (proposed):** `staging+{id}@example.test` or controlled staging mailbox aliases — **never** `@vdbdigital.nl` customer addresses.  

**Passwords:** generated at bootstrap; stored only in secret store / local vault — **not** in Git.  

**MFA:** staff/admin/owner enroll on staging when MFA required by app; document recovery codes in vault only.

---

## Role mapping note (canonical today)

| Target shared role | Canonical today | Gap |
|--------------------|-----------------|-----|
| customer | org membership + portal | OK for web/portal |
| staff / admin / owner | `admin_roles` + permissions | Map owner/staff carefully |
| partner / partner_pending | **missing** | See gap register — blocking for 4–6, 8–9 |

---

## Minimal fixtures (synthetic)

| Fixture | Contents | Class |
|---------|----------|-------|
| Orgs | Org A (cust_a), Org B (cust_b) | SQL seed + RPC |
| Projects | 2 portal projects with milestones/deliverables | factory |
| Messaging | 1 conversation + messages | factory |
| Support | 1 ticket + reply | factory |
| Document | 1 `portal_files` metadata (+ optional Storage object) | factory |
| Quote | 1 ready/sent quote | factory |
| Invoice | 1 issued invoice | factory |
| Payment | 1 test-mode payment attempt (when checkout allowed later) | RPC-driven |
| Partner application/profile | **blocked until schema exists** | proposal |
| Lead / sale / commission / payout | **blocked until schema exists** | proposal |
| Refund/adjustment | via invoice reversal path where present | RPC-driven |

**Preferred form:** **API/RPC-driven bootstrap script** in canonical repo (idempotent, APP_ENV=staging guard, projectref denylist) + small SQL seed for enums/reference rows. Avoid production dumps.

**Properties:** fictitious · deterministic IDs where safe · idempotent · resettable · no live Mollie IDs · no duplicate ledger once partner finance exists.

---

## Bootstrap rules

1. Refuse if projectref ∈ production denylist.  
2. Refuse if `APP_ENV` ≠ `staging` (except local demo mode with explicit flag).  
3. Log actions without secrets/PII.  
4. Re-runnable after soft/full reset.
