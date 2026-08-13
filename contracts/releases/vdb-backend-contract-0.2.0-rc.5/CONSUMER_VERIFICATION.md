# Consumer verification — vdb-backend-contract@0.2.0-rc.5

```text
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.5
VDB_SCHEMA_VERSION=2026.07.29.partner-identity-directory-rc5
```

schemaVersion: `2026.07.29.partner-identity-directory-rc5`

## Bundle integrity

1. Confirm `manifest.json` → `schemaVersion` equals the value above.
2. Compare every file's SHA256 to `checksums.json`.
3. Recompute `BUNDLE_SHA256.txt` as `sha256("<name>:<sha256>\n" joined over all other
   bundle files sorted by name, with a trailing newline)`.
4. Confirm every RPC name in `rpcs.json` exists on the target environment.
5. Confirm `SELECT * FROM public.verify_partner_identity_directory_rc5_contracts()
   WHERE ok = false` returns zero rows.

## Mobile must

1. Pin the contract and schemaVersion above.
2. **Migrate `submit_partner_application` to the 7-argument typed signature.** The
   6-argument overload no longer exists, so old calls fail. Collect INDIVIDUAL vs BUSINESS
   explicitly; never send a KvK for INDIVIDUAL; always send an 8-digit KvK for BUSINESS.
3. Stop treating application approval as activation. After
   `review_partner_application(..., true, ...)` the partner may still be `PENDING`. Read
   `partner_activation_checklist` and render `missing[]` as the remaining onboarding steps.
4. Handle `ACTIVATION_DENIED:<code>` from `activate_partner_profile` and
   `reactivate_partner`. Render the full checklist, not just the suffix.
5. Never offer self-activation. `activate_partner_profile` and `partner_try_activate`
   reject partner callers with `FORBIDDEN`; activation is OWNER/ADMIN + AAL2 only.
6. Allowlist the new staff RPCs: `admin_get_product`, `admin_get_partner`,
   `admin_get_customer`, `admin_get_project`, `admin_get_quote`, `admin_get_invoice`,
   `admin_get_appointment`, `list_portal_support_ticket_replies`.
7. Use `list_portal_support_ticket_replies` for ticket threads and do **not** build a
   client-side internal/public filter. The server decides: staff sessions receive
   `is_internal = true` rows, customer sessions never do.
8. Treat these as absent by design, not as a bug: product cost and supplier fields,
   customer contact details, quote `customer_note`, appointment `meeting_link` and
   attendees, partner email addresses and balances.
9. Do not present agreement bodies as final terms while `legal_review_status = REQUIRED`.
10. Always pass all eight arguments to `create_partner_lead`; the 7-argument compat
    wrapper is ambiguous with the 8-argument form and Postgres refuses to choose.
11. Keep payout mutation UI disabled.
12. Expect `AAL2_REQUIRED` / `FORBIDDEN` / `NOT_FOUND` / `INVALID_TRANSITION` /
    `IDEMPOTENCY_CONFLICT` / `VALIDATION_FAILED` / `FEATURE_DISABLED` /
    `ACTIVATION_DENIED` on the surfaces listed in `error-codes.json`.
13. Never call `staff_set_partner_compliance_fixture`. It is staging-only synthetic data
    behind a fail-closed flag.

Owner does not modify the Mobile repository.
