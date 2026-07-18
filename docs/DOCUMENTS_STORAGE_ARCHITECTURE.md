# Documents & Storage Architecture

## Canonical model

**Table:** `portal_files` (UI: Documenten / Bestanden).  
Do **not** create a parallel `portal_documents` table.

Extended columns include: `document_number`, `title`, `category`, `visibility`, `status`, `version_number`, `parent_document_id`, `deliverable_id`, `checksum_sha256`, `scan_status`, etc.

## Buckets (all private)

| Bucket | Use |
|--------|-----|
| `customer-documents` | Org-general files |
| `project-files` | Project / deliverable files |
| `quote-documents` | Quote PDFs (prep) |
| `invoice-documents` | Invoice PDFs (prep) |
| `support-attachments` | Support attachments (prep) |

Path pattern (server-composed only):

`organizations/{organization_id}/projects/{project_id}/{document_id}/{safe_filename}`  
or `organizations/{organization_id}/general/{document_id}/{safe_filename}`

## Access

- Mutations via **service role** after `requireAdmin` / `requireCustomer` + permissions
- Downloads via **short-lived signed URLs** (TTL 120s) — never stored in DB/logs
- Storage policies: restrictive deny for anon/authenticated on portal buckets

## Out of scope

- External malware scanner (status fields prepared; honest “nog niet uitgevoerd”)
- Full quote/invoice/support authoring flows
- Mollie / checkout coupling
