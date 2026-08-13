# Legal document localization architecture

Status: schema preparation only. No legal text is approved, effective, accepted, or published by this work.

## Metadata model

Additive migration `20260801013715_legal_document_localization_prep.sql` prepares:

- `document_locale`: language of the exact rendered body (`en` or `nl`).
- `governing_locale`: language designated by counsel as controlling if versions differ.
- `document_version`: immutable business/legal version identifier.
- `approved_at`: explicit human legal approval timestamp.
- `effective_at`: date/time from which the approved version governs.
- `accepted_at`: acceptance timestamp where the canonical document record requires it.
- `content_hash`: hash of the exact reviewed/accepted bytes or normalized body.

The fields are added to the canonical document table (`portal_files`) and the partner agreement version/acceptance model where applicable. Existing version, effective, acceptance, integrity, and legal-review fields remain intact; this phase does not reinterpret or backfill them.

## Invariants for later implementation

1. `document_locale` does not imply approval.
2. A translation never inherits `approved_at` from another locale.
3. `governing_locale` must be a deliberate legal decision, not the UI locale or default locale.
4. `effective_at` requires an approved immutable version and must not be inferred from upload/creation time.
5. Acceptance records must identify the exact document version, locale, governing locale, and content hash accepted.
6. Changing legal body content creates a new immutable version and hash; it must not mutate an accepted version in place.
7. `content_hash` is generated from the exact final content delivered to the user, not placeholder copy.
8. Placeholder partner agreements with `legal_review_status=REQUIRED` remain blocked even if localization metadata is present.
9. Product legal approval and legal-document approval are separate controls.
10. No locale fallback may silently substitute a legal body at acceptance time.

## Publication/acceptance gate

A future legal document may be presented as binding only when all are true:

- Legal review status is explicitly approved by an authorized human.
- `document_locale`, `governing_locale`, `document_version`, `approved_at`, `effective_at`, and `content_hash` are present and coherent.
- The exact locale/version/hash shown to the user is recorded with acceptance.
- The effective date has been reached.
- Any required supersession/withdrawal rule is satisfied.

Until a dedicated reviewed workflow enforces these invariants, legal pages and agreement placeholders remain informational or blocked according to their existing status.

## Explicit non-goals

- No legal copy translation.
- No machine translation.
- No auto-approval or approval backfill.
- No governing-language decision.
- No remote migration apply.
- No modification of previous migration files.
