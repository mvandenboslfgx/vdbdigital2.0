# ADR-001: International i18n architecture

- **Status:** Accepted
- **Date:** 2026-08-01
- **Decision makers:** Matthijs (Owner)
- **Context:** Audit on `0fe80caa690e59aa6406c2a5edf12fc5d32491b5` (`audit/i18n-international-readiness`). Implementation proceeds on `integration/visual-rc6-i18n-foundation` after Phase 0 (visual/i18n + RC6 merge).

## Decisions (binding)

1. English is the canonical technical source language and general fallback.
2. English remains without a URL prefix.
3. Dutch uses `/nl`.
4. Later official languages use a locale prefix (e.g. `/de`, `/fr`).
5. `/en` permanently redirects to the equivalent English URL without `/en`.
6. Portal, authentication, checkout, customer environment, and admin are fully English and Dutch.
7. Admin uses the same locale preference as the user; English is fallback.
8. Explicit user language choice always precedes automatic detection.
9. Preference order: (a) account `preferred_locale`; (b) explicit locale cookie; (c) URL locale; (d) `Accept-Language` only on a suitable first entry; (e) English.
10. Definitive runtime i18n architecture uses **next-intl** with ICU.
11. The existing custom i18n runtime is migrated in a controlled way, then removed or reduced to demonstrably necessary domain content modules.
12. No second competing runtime i18n system may remain.
13. Dynamic catalog content uses translation tables and publication gates.
14. `product_translations` is the source for translated product content.
15. `products-nl.ts` and parallel product overlays are removed only after content and fallback are demonstrably migrated.
16. No external browser translation widget as the primary solution.
17. Machine translation may later create draft translations for non-critical content only.
18. Machine translations are never auto-approved or auto-published.
19. Legal, financial, checkout, security, account, and contract texts require human review.
20. For Dutch agreements, Dutch is the governing language.
21. For international agreements, English may be governing only when explicitly recorded per document/agreement.
22. Documents must be prepared for: `document_locale`, `document_version`, `governing_locale`, `approved_at`, `accepted_at`, and content hash (or equivalent integrity record).
23. Website/account owns `preferred_locale`.
24. Resend and other notifications receive locale via an explicit, validated event contract.
25. VDB Partners is audited/implemented in a separate repository, using the same locale conventions, terminology, and preference contracts.
26. Officially supported languages for now: `en` and `nl` only.
27. New languages appear in the language switcher only after required content is complete, reviewed, and approved.
28. Brand names (VDB Digital, VDB Digital Software, VDB Partners) are not translated.

## Consequences

- Phase 0 must produce one Owner-complete tip (visual/i18n + RC6) before next-intl migration.
- Implementation commits are local-only until Matthijs approves push/staging/deploy.
- Audit worktree `C:/Users/XXX/vdbdigital-i18n-audit` remains read-only evidence.

## Related

- Audit branch: `audit/i18n-international-readiness` @ `0fe80caa…`
- Integration branch: `integration/visual-rc6-i18n-foundation`
- Primary RC6 source: `origin/fix/rc6-full-staging-recovery` @ `76694a32…`
