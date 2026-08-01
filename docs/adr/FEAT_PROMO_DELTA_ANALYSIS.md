# Feat-promo delta analysis

Scope: read-only review of commits `ad842d6` and `45f583f`. Neither commit was merged, cherry-picked, or otherwise integrated.

## Executive recommendation for Owner release

- `ad842d6`: **exclude as a commit from the Owner release**. Preserve the design as a future, separately reviewed promotion feature; selectively reimplement only after the app/store, privacy, i18n, security, and performance gates below pass.
- `45f583f`: **exclude completely from the Owner release**. It is a staging identity-assignment operation and evidence bundle, not a product feature. Do not ship the role-mutation script with the application release.

Both commits are outside `HEAD` ancestry at the time of review.

## `ad842d6` — app promotion and monetization foundation

Delta: 16 files, approximately 2,421 insertions and 116 deletions.

What it adds:

- Mobile app-download banner with delay/scroll triggers, session suppression, 30-day local dismissal, deep-link/store fallback, and consent-gated analytics.
- Revenue promotion card for own-service, affiliate, and sponsored placements.
- Central route policy, feature flags defaulting off, EN/NL message keys, CSS, tests, and operational docs.
- Marketing layout integration and public environment variables.

Positive properties:

- Flags default off and banner rendering fails closed when no destination exists.
- Private, auth, checkout, legal, and form routes are excluded centrally.
- Affiliate/sponsored links use `sponsored nofollow noopener noreferrer`.
- Promotion destinations require HTTPS.
- Analytics emission checks analytics consent.
- Dismiss/session storage contains no direct personal data.
- Tests cover feature flags, policy, banner behavior, and promotion card behavior.

Release blockers:

1. The general banner URL validator accepts any syntactically valid scheme because `protocol.endsWith(":")` is always true for URL protocols. Store URLs need strict HTTPS host allowlists; deep links need an explicit allowlist such as `vdbdigital:` only.
2. Deep-link fallback starts a fixed timer but does not cancel on `visibilitychange`/page hide. A successfully opened app can still cause a store tab to open when the browser resumes.
3. `RevenuePromotionCard` hardcodes Dutch badges/disclosures while exposing a locale prop; English pages can receive Dutch legal disclosure text.
4. Placement count limits are documentation/caller conventions, not enforced by a placement registry or render boundary.
5. `NEXT_PUBLIC_*` values are build-time public configuration. Activation needs an auditable release gate and tested rollback, not only an environment toggle.
6. The banner changes the shared marketing layout and message catalogs, which have diverged on the current i18n branch; direct integration would create semantic conflicts.
7. App Store/Play Store URLs, app publication, universal/app links, real-device behavior, reduced-motion/accessibility, and Core Web Vitals are not release-proven.
8. Affiliate/sponsored content still requires Owner/editorial/legal approval, disclosure wording approval, destination ownership checks, and a takedown process.

Recommended future extraction order:

1. Keep the central promotion policy and pure policy tests.
2. Replace URL validation with destination-specific allowlists.
3. Localize all disclosure copy through the current catalog.
4. Add deep-link lifecycle cancellation and real-device tests.
5. Integrate only the own-service banner behind a server-side release gate.
6. Keep affiliate/sponsored placements disabled until separate legal/editorial approval.

## `45f583f` — primary Owner staging assignment

Delta: two files, 485 insertions:

- A historical staging-assignment evidence document.
- A Node operator script that creates/updates a profile, grants `OWNER`, and writes an audit record through linked Supabase SQL.

Why it must not enter the Owner product release:

- It performs privileged identity and role mutations and is unrelated to application runtime.
- It hardcodes a personal email, staging/production project references, and operational assumptions.
- It relies on a linked CLI and environment checks rather than a reviewed, reusable privileged administration workflow.
- The evidence itself records environment-specific identity and audit details.
- Its own verdict is blocked because personal MFA/AAL2 and mobile-session proof were incomplete.
- Shipping a staging role-assignment utility increases operator misuse and supply-chain blast radius without providing runtime value.

If Owner assignment is needed later, create a separate time-bounded operator change with explicit target approval, current schema validation, MFA/AAL2 completion, masked evidence outside the application artifact, and independent production authorization.

## Decision

For the Owner release, include neither commit. `ad842d6` is a useful design/reference source only; `45f583f` is an operational artifact to keep outside the release. This analysis does not authorize activation, role assignment, deployment, or any remote write.
