# Quotes & Acceptance Versioning

## Model

`portal_quote_versions` stores an **immutable snapshot** at send time:

- Header fields (title, amounts, currency, terms, validity)
- Line items JSON / mirrored rows as stored by migration
- Selected optional items (at accept time recorded on acceptance)
- Checksum / version hash
- Optional link to `portal_files` document version
- `created_by`, `created_at`, version number

## Rules

1. Only a valid ready/send path creates a sent version
2. Edits after `SENT` produce a **new** version and may mark prior as `SUPERSEDED`
3. Old sent versions remain downloadable under ACL
4. Prior acceptance is **never** silently moved to a new version
5. Accept/decline bind to `expected_version` / current version number

## Document link

When a real PDF/HTML artifact is stored, it uses `portal_files` with category `QUOTE` and private `quote-documents` bucket.  
If PDF generation is unavailable: print-optimized HTML preview only — **do not** store a fake PDF.
