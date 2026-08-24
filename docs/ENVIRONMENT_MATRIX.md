# Environment matrix (canonical)

Last updated: 2026-08-24

| Environment | Project ref | Name | App writes |
|---|---|---|---|
| Staging / RC7 | `kjricvicakvsreuytvra` | VDB Digital Staging RC7 | Allowed for authorized staging work |
| Production | `nhsrdnjfsxfikfbdmdfj` | vdb nieuw | Owner-gated only |
| Deprecated | `qzekuvmgfekzsowdecyk` | VDB Digital Staging (removed) | Never |

## Local / preview

- Must not use production unless `ALLOW_PRODUCTION_SUPABASE_WRITES=1` **and** this is an explicit production run.
- Must not use the deprecated staging ref.
- Default target: RC7 or local Docker.

## Isolated invitation migration (RC7)

- File: `supabase/migrations/20260824160000_invitation_delivery.sql`
- SHA256: `6c96c20cd16c1a2f60d7aa75a0e44d21662ff2b3e83ac52ca50cc74bd305b2d1`
- Applied on RC7 as `invitation_delivery` (`20260824172759`)
- Catalog WIP `20260820164821` and `20260820224500` were **not** applied
- Partner `submit_partner_application` was **not** replaced: RC7 already implements INDIVIDUAL/BUSINESS via `partner_type`
