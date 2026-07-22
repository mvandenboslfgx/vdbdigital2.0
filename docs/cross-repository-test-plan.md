# Cross-Repository Test Plan — Shared Backend

**Purpose:** Prove website, mobile, and partner portal share one backend correctly.  
**Primary environment:** **Staging** (shared Supabase).  
**Local stacks:** useful for unit tests; **not** sufficient for these scenarios.

---

## Preconditions

- Staging project provisioned (`docs/staging-integration-plan.md`)
- Canonical migrations applied from VDB Digital 2.0
- All clients pin matching `VDB_SCHEMA_VERSION`
- Test users: customer A, partner P, staff S (no production users)
- Checkout/Mollie: test mode only; live forbidden

---

## Scenarios

| # | Scenario | Actors | Pass criteria | Evidence |
|---|----------|--------|---------------|----------|
| 1 | Customer registers on website and logs in on Mobile with same account | Customer | Same `auth.users` id; mobile session valid | Staging auth logs / app screenshot (no secrets) |
| 2 | Customer creates request in Mobile; admin sees it on website | Customer, Staff | Single DB row; visible in admin under correct org | Admin URL + row id |
| 3 | Admin updates project; customer sees update in Mobile | Staff, Customer | Realtime or refresh shows same fields | Before/after field values |
| 4 | Partner registers lead in Partner Portal | Partner | Lead row with partner attribution | Lead id |
| 5 | Admin handles lead in VDB Digital 2.0 | Staff | Status transition enforced server-side | Status history |
| 6 | Partner sees sale status in Portal **and** Mobile | Partner | Identical status from same sale record | Both UIs + sale id |
| 7 | Customer payment confirmed server-side | Customer, system | Webhook/RPC updates payment; clients display confirmed | Payment id + status (test mode) |
| 8 | Exactly **one** shared commission created | System | Single commission row; no duplicate mobile/affiliate ledgers | Commission id count=1 |
| 9 | Payout status identical in Portal and Mobile | Partner | Same `payout_requests` row/status | Payout id |
| 10 | RLS blocks other users’ data | Attacker/peer user | Cross-tenant read/update denied | Negative test log |

---

## Negative / isolation tests (mandatory add-ons)

- Partner cannot read another partner’s leads  
- Customer cannot read another org’s invoices  
- Staff permissions respect intended scopes (after P1 fixes in this repo)  
- Mobile without service role cannot call privileged RPCs  
- Wrong `schemaVersion` fails client drift check  

---

## What not to run yet

Do **not** treat a 20/20 Maestro device marathon as the next milestone while:

- sibling Docker stacks still collide, or  
- staging shared backend is missing, or  
- partner domain tables are only local forks  

Device runs remain valuable **after** scenarios 1–10 are green on staging.

---

## Recording results

Store evidence under each repo’s gitignored evidence folder, e.g.:

`docs/evidence/staging-cross-repo-YYYY-MM-DD/`

Include: date, schemaVersion, staging project ref, scenario table with PASS/FAIL, and confirmation that production was not mutated.
