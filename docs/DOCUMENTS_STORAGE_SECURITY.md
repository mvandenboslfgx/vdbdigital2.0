# Documents Storage Security

- Private buckets only for confidential customer documents
- No permanent public download URLs
- No service-role key in browser
- organization_id / project_id / paths composed server-side
- MIME + magic-byte checks; blocked executables/scripts/HTML/SVG
- ZIP: staff only in portal customer uploads blocked
- Rate limits on upload/download
- Origin/CSRF on mutating portal actions
- Signed URLs never audited as plaintext URLs
- Scan: `NOT_REQUIRED` locally; production must not claim CLEAN without a scanner

Future scanner: wire provider into `scan_status` / `scanned_at` / `scan_reference` while keeping QUARANTINED until CLEAN.
