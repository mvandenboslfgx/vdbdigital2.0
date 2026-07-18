# Documents Storage RLS

## `portal_files`

Customer SELECT when:

- `status = AVAILABLE`
- `archived_at IS NULL`
- `visibility IN (CUSTOMER_VISIBLE, CUSTOMER_UPLOAD)`
- `scan_status IN (NOT_REQUIRED, CLEAN)`
- `is_org_member(organization_id)`

Staff: `is_staff_admin()` or service-role after permission checks.

## `portal_document_download_events`

RLS on; no grants to anon/authenticated — service role only.

## Storage

Restrictive deny policies for anon/authenticated on the five portal buckets.
