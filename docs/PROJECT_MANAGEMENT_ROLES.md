# Project Management Roles & Permissions

## Staff (`src/lib/auth/permissions.ts`)

| Permission | CONTENT | SUPPORT | ADMIN | OWNER |
|------------|---------|---------|-------|-------|
| `projects.view_all` | — | ✓ | ✓ | ✓ |
| `projects.view_assigned` | ✓ | ✓ | ✓ | ✓ |
| `projects.create` | — | — | ✓ | ✓ |
| `projects.edit` | — | — | ✓ | ✓ |
| `projects.archive` | — | — | ✓ | ✓ |
| `projects.manage_members` | — | — | ✓ | ✓ |
| `projects.manage_milestones` | ✓ | — | ✓ | ✓ |
| `projects.manage_actions` | — | ✓ | ✓ | ✓ |
| `projects.manage_deliverables` | ✓ | — | ✓ | ✓ |
| `projects.view_internal_activity` | — | ✓ | ✓ | ✓ |

CONTENT without assignment sees only projects where they are `project_manager_id` when lacking `view_all`.

## Customer org roles (`customer-permissions.ts`)

| Permission | VIEW_ONLY | BILLING | MEMBER | PRIMARY |
|------------|-----------|---------|--------|---------|
| `portal.projects.view` | ✓ | ✓ | ✓ | ✓ |
| `portal.projects.feedback` | — | — | ✓ | ✓ |
| `portal.projects.approve_deliverable` | — | — | ✓ | ✓ |
| `portal.projects.complete_action` | — | — | ✓ | ✓ |

Customers never change project status, progress, planning, or visibility.
