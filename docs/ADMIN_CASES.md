# Admin Cases

Route: `/admin/cases` (permission: cases.manage)

## Current capability

Config-driven catalog review (`src/config/commercial/cases.ts`):

- Type: real / internal / demonstration
- Status workflow
- Permission checklist
- Public visibility blockers

## Publication blockers enforced in UI review

- Incomplete permissions for real cases
- Unverified metrics
- Wrong status (must be APPROVED/PUBLISHED + publicVisible)
- Missing translations (tracked in content checklists)

## Vermeulen Bouwservice

Remains DRAFT / not public. See `docs/VERMEULEN_CASE_CONTENT_CHECKLIST.md`.

Full media upload + DB CRUD is a follow-up; do not publish without client approval.
