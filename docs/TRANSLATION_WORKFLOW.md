# Translation workflow

How to add or update translations for the VDB Digital platform.

## Principles

1. **English-first** — default locale is `en`; URLs have no `/en` prefix.
2. **Dutch under `/nl`** — same English pathnames, Dutch UI via dictionary + content maps.
3. **Admin stays English** — `/admin/*` is not localised; no `/nl/admin`.
4. **No auto-publish** — completing a translation does not publish products or content.
5. **Do not enable incomplete locales** — `de`, `fr`, `es`, `sq` are reserved; keep them out of `locales` until fully translated.

## Adding UI strings (dictionary keys)

1. Add the key to `src/i18n/messages/en.ts` (source of truth for the `Messages` type).
2. Add the **same key** with Dutch copy to `src/i18n/messages/nl.ts`.
3. Use in server components: `const { t } = await getDictionary()` then `t("section.key")`.
4. Use in client components: `const t = useT()` (requires `I18nProvider` in root layout).
5. Interpolation: `t("about.title", { name: "VDB Digital" })` replaces `{name}`.

Run unit tests to confirm key parity:

```powershell
npm run test -- tests/unit/i18n.test.ts
```

Both dictionaries must stay at **identical key paths** (currently 364 keys each).

## Adding long-form content maps

### Solution pages

Edit `src/i18n/content/solutions.ts`. Each solution has `en` and `nl` blocks with `metaTitle`, `metaDescription`, `title`, `description`, `features`, `benefits`.

### Product Dutch copy

Edit `src/i18n/content/products-nl.ts`. Key entries by **product slug** (unchanged from EN). Do not alter prices or slugs in the overlay.

English product copy comes from the database or `src/config/products.seed.ts`.

## Links and navigation

Always use locale-aware components for internal links:

- `LocaleLink` / `LocaleLinkButton` — client-side prefix handling
- `withLocale(path, locale)` — server-side or static href building

Never hardcode `/nl` in marketing components unless generating metadata or sitemap URLs.

## Forms

1. Add translated labels, placeholders, validation messages, and success text to the dictionary.
2. Include hidden `<input name="locale" value={locale} />` on the form.
3. Server actions must call `parseFormLocale()` — never trust raw client strings.

## Email copy

Add or update both `en` and `nl` branches in `src/lib/email/templates.ts` for the relevant `customerMail` family. Internal notification subjects should include the locale code.

## SEO metadata

For indexable pages, prefer `buildLocaleAlternates(pathname, locale)` from `src/i18n/seo.ts` so canonical and hreflang stay correct per locale. See `docs/SEO.md`.

## Legal pages

Legal body copy is currently **hardcoded English** in `src/app/(legal)/*/page.tsx`. To localise:

1. Move prose into dictionary keys or a dedicated content map.
2. Render via `LegalPageContent` with locale-specific children.
3. Update `docs/I18N_ROUTE_MATRIX.md` when NL legal bodies are complete.

## Admin content management

- Product admin (`/admin/products`) shows EN/NL completeness badges and publication advice.
- Full EN/NL tab editors are **not** enabled yet — edits go through seed files, NL overlay, or database tooling.
- Changing `status` to `PUBLISHED` or clearing `is_concept` requires explicit human action; translation completeness alone does not publish.

## Enabling a new locale (future)

Only when **all** of the following are complete:

1. Add locale code to `locales` in `src/i18n/config.ts`.
2. Create `src/i18n/messages/{code}.ts` matching `Messages`.
3. Register in `get-dictionary.ts` catalogs.
4. Translate `solutions.ts` and product overlays (or equivalent).
5. Decide URL prefix strategy (`/de`, …).
6. Extend sitemap, SEO helpers, email templates, and forms.
7. Run full QA checklist (`docs/TRANSLATION_QA.md`).

**Never** add `de`, `fr`, `es`, or `sq` to `locales` until the above is done.

## Checklist before merge

- [ ] EN and NL dictionary keys match
- [ ] No raw translation keys visible in UI (pattern test in `tests/unit/i18n.test.ts`)
- [ ] Locale-aware links used for new routes
- [ ] Form locale validated server-side
- [ ] Product prices unchanged after NL overlay edits
- [ ] Route matrix and product review docs updated if routes or products changed
