# Invoices Financial Quote Conversion

Staff action on ACCEPTED quote: **Factuurconcept maken**.

Rules:

1. Quote status must be ACCEPTED
2. Same organization
3. Selected optional quote lines only
4. Copy amounts into DRAFT invoice + items
5. Link `quote_id` + `accepted_quote_version_id`
6. No auto-issue, no payment, no Mollie
7. Existing DRAFT for same quote redirects (idempotent warning)

Quote acceptance itself never creates an invoice.
