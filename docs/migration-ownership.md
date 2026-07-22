# Migration Ownership — Canonical Backend

**Owner repository:** VDB Digital 2.0  
**REPOSITORY_ROLE:** `CANONICAL_BACKEND_OWNER`  
**Migrations path:** `supabase/migrations/`

---

## Rule

Only this repository publishes definitive migrations for **staging** and **production**.

Mobile (`MOBILE_CLIENT`) and Partner (`PARTNER_CLIENT`) may:

- invent schema on **their local** Supabase for spikes;
- open a **backend change proposal**;
- **not** `db push` / `migration repair` against shared staging or production as owners.

---

## Proposal flow (Mobile or Partner needs schema)

Example: Mobile needs `push_tokens`.

1. **Propose** (issue/PR doc in client repo or ticket):  
   - tables/columns/indexes  
   - RLS policies  
   - RPCs  
   - grants  
   - Storage impact  
   - test plan  
   - suggested `schemaVersion` bump  
2. **Local spike only** in the client’s isolated stack (optional).  
3. **No remote apply** from the client repo.  
4. Canonical owner implements reviewable SQL under `supabase/migrations/` here.  
5. Local `db reset` / contract verifiers run in **this** repo.  
6. Apply to **staging** from this repo when authorized.  
7. Bump `docs/backend-contract.md` (`schemaVersion` + semver).  
8. Clients upgrade pin and regenerate types.  
9. Production apply only with explicit production authorization (existing apply gates).

---

## What belongs in canonical migrations

- Tables, enums, constraints  
- RLS / Storage policies  
- `SECURITY DEFINER` functions with fixed `search_path`  
- Financial and portal RPCs  
- Contract verification RPCs  
- Baseline markers / history alignment for this project  

## What does not

- Client-only UI state  
- Mobile build flavors  
- Partner marketing copy  
- Per-repo seed data meant only for local demos (keep out of production seeds)

---

## Conflict with sibling local stacks

If `supabase start` fails because ports are taken:

1. Identify foreign container names (`docker ps`) — **do not** stop them.  
2. Confirm this repo uses only `54321–54324` (pinned in `config.toml`).  
3. Sibling must move: Partner → `544xx`, Mobile → `545xx`.  
4. Stop only `npx supabase stop --project-id vdbdigital2` if restarting **this** stack.  
5. Document the conflict in the session report.

Historical incident: agents stopped `vdb-digital-mobile-local` / `vdb-partners` to free `54321`/`54322`. That pattern is **forbidden**. See `docs/local-infrastructure-isolation.md`.

---

## Production apply

Unchanged: production database apply requires the separate authorization protocol in `docs/PRODUCTION_DATABASE_APPLY_MANIFEST.md`.  
This ownership doc does **not** authorize repair, push, checkout, or Mollie live.
