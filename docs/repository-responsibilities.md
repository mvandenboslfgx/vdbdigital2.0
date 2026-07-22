# Repository Responsibilities — VDB Digital Platform

**This repository:** VDB Digital 2.0  
**REPOSITORY_ROLE:** `CANONICAL_BACKEND_OWNER`

---

## VDB Digital 2.0 (this repo)

**Owns**

- Public website (NL/EN) and web admin
- Customer portal (web)
- Canonical Supabase schema, RLS, Storage, RPCs, financial integrity
- Mollie webhook route and payment contracts
- Checkout/feature flags for web commerce
- Production migration history and apply runbooks
- Shared backend contract publication (types, enums, RPC names, schemaVersion)

**Does not own**

- Android/iOS app UI or store releases
- Affiliate Portal UI
- Sibling local Docker stacks

**Local stack identity (definitive)**

| Field | Value |
|-------|--------|
| CLI `project_id` | `vdbdigital2` |
| Docker DB container | `supabase_db_vdbdigital2` |
| API / DB / Studio / Mail | `54321` / `54322` / `54323` / `54324` |
| Linked production ref | `nhsrdnjfsxfikfbdmdfj` (vdb nieuw) |

Never stop sibling stacks. Full matrix: `docs/local-infrastructure-isolation.md`.

---

## VDB Digital Mobile (`MOBILE_CLIENT`)

**Owns**

- Mobile UX (customer, partner, mobile admin surfaces)
- Local-only Supabase: `vdb-digital-mobile-local` on **54521–54524**
- Backend **change proposals** when schema is missing
- Consuming published contract version

**Must not**

- Use ports `54321–54324` or `54421–54424`
- Apply production/staging migrations independently as source of truth
- Stop `vdbdigital2` or `vdb-partners` containers
- Invent a second commission ledger

---

## VDB Partner Portal / Affiliate (`PARTNER_CLIENT`)

**Owns**

- Partner web UX (leads, sales, commissions display, payouts UX, marketing assets)
- Local-only Supabase: `vdb-partners` on **54421–54424**
- Backend change proposals for partner domain gaps

**Must not**

- Use ports `54321–54324` or `54521–54524`
- Own a divergent partner schema in production
- Apply remote migrations as canonical owner
- Stop website or mobile stacks

---

## Decision rights

| Change type | Decides | Implements in git |
|-------------|--------|-------------------|
| Production schema / RLS / RPC | Backend owner (this repo) | `supabase/migrations/` here |
| Web UI | This repo | `src/` here |
| Mobile UI | Mobile repo | Mobile repo |
| Partner UI | Partner repo | Partner repo |
| Shared contract bump | Backend owner | Published from this repo; clients pin version |
| Staging project creation | Platform owner | Config in all three env sets |

---

## Agent rules (all Cursor projects)

1. Only touch the current workspace.  
2. Never `docker stop` / `supabase stop` on foreign `project_id`s.  
3. Never delete foreign volumes.  
4. On port conflict: report + isolate own stack.  
5. No remote mutation without explicit authorization for **that** environment.
