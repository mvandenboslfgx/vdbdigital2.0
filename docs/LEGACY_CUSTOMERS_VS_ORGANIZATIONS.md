# Legacy `customers` vs `organizations` (read-only mapping)

## Source of truth for portal / projects

**`organizations` + `organization_members`**

Projects (`portal_projects.organization_id`) reference organizations only.

## Legacy `customers` (checkout / orders)

From initial schema: order/email snapshot for commerce. **Not** used for:

- portal login tenancy
- project membership
- invitations

## This phase

- No destructive migration
- No new FK from projects → `customers`
- Admin “Klanten” UI already maps to organizations
- Future consolidation: map historical order customer emails → org contacts in a dedicated round
