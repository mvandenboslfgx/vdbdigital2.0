# Project Management Architecture

## Canonical model

Project data lives in the existing **`portal_*`** schema (not a second `projects` table):

| Table | Role |
|-------|------|
| `portal_projects` | Project header (org-scoped) |
| `portal_project_members` | Internal staff assignment |
| `portal_project_milestones` | Milestones |
| `portal_project_actions` | Internal + customer actions |
| `portal_project_deliverables` | Deliverable metadata (files later) |
| `portal_project_feedback` | Feedback (INTERNAL / CUSTOMER_SHARED) |
| `portal_project_activity` | Tenant-safe timeline |

Tenancy source of truth: **`organizations` + `organization_members`**.

## Routes

**Admin (English path, NL UI):** `/admin/projects`, `/new`, `/[id]/{overview,milestones,actions,deliverables,feedback,activity,settings}`

**Portal (Dutch canonical):** `/portal/projecten`, `/[id]/{overview,milestones,deliverables,feedback,activity}`

## Visibility

- `visibility` = `INTERNAL` | `CUSTOMER_VISIBLE` (synced to `customer_visible` boolean for RLS)
- DRAFT defaults to internal
- Customers see only non-archived, `customer_visible` projects for their active org membership

## Progress source of truth

`portal_projects.progress_percent` is **manually managed** by staff (0–100). Milestone completion does not auto-update progress in this phase.

## Out of scope

- File storage / signed downloads (document phase)
- Real customer emails in local tests
- Mollie / checkout coupling
