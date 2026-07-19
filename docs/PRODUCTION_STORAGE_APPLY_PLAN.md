# Production Storage apply plan

**Do not create buckets or change policies until an explicit production apply order.**  
Remote currently has **0** buckets (verified read-only). Local migrations define the contract below.

Project: `nhsrdnjfsxfikfbdmdfj`

## Bucket matrix

| Bucket | Purpose | Public | File size limit | MIME allowlist (summary) | Upload | Download | Path contract |
|--------|---------|--------|-----------------|--------------------------|--------|----------|---------------|
| `product-media` | Catalog product images | **private** | 5 MiB (`5242880`) | jpeg, png, webp, gif | service-role server actions only | signed URL / server | `products/{product_id}/{timestamp}-{safe-name}.{ext}` |
| `customer-documents` | Org general portal files | **private** | 25 MiB (`26214400`) | pdf, images, txt, csv, docx, xlsx, zip | staff/service via app; clients via signed upload only if implemented | signed URL for entitled org members | org/prefix via `portal_files` |
| `project-files` | Project / deliverable files | **private** | 50 MiB (`52428800`) | pdf, images, zip, txt, csv, docx, … | same | signed URL | project-scoped prefixes |
| `quote-documents` | Quote PDF artifacts | **private** | 25 MiB | pdf | staff/service | signed URL | quote/document ids |
| `invoice-documents` | Invoice PDF artifacts | **private** | 25 MiB | pdf | staff/service | signed URL | invoice/document ids |
| `support-attachments` | Support ticket attachments | **private** | 25 MiB | pdf, images, txt | entitled roles | signed URL | ticket-scoped |

Sources: `20260716230000_catalog_admin_storage.sql`, `20260717000000_customer_portal.sql`, `20260719120000_documents_storage.sql`.

## Policies (intended)

- **anon**: deny mutate; deny select on private portal/product buckets (fail-closed policies in migrations).
- **authenticated**: deny direct Storage access to these buckets; app uses service-role + signed URLs after authZ checks.
- **service_role**: bypasses RLS — keep server-only; never expose in `NEXT_PUBLIC_*`.

## Signed URL rules

- Mint only after RLS/app authorization (org membership or staff).
- Short TTL; no permanent public objects for confidential docs.
- Never log full signed URLs in analytics.

## Apply sequence (later)

1. DB migrations applied + verifiers PASS  
2. Create/update buckets per migration SQL (or re-run storage sections if idempotent)  
3. Confirm `public = false` for all six  
4. Confirm MIME + size limits  
5. Confirm deny policies for anon/authenticated  
6. Smoke: unauthorized signed URL fails; authorized download works  

## Rollback / cleanup

- Do not delete buckets with live objects without backup of metadata + objects.
- If misconfigured public=true: immediately set public=false and rotate any leaked URLs.
- Empty buckets can be removed only with explicit approval after verifying no `portal_files` / media references.
