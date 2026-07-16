# SEO (multilingual)

Search and metadata behaviour for English-first URLs with Dutch under `/nl`.

## URL rules

| Rule | Implementation |
| --- | --- |
| English canonical **never** uses `/en` | `withLocale(path, "en")` returns bare path (`src/i18n/config.ts`) |
| Dutch canonical uses `/nl` prefix | `withLocale(path, "nl")` → `/nl/...` |
| Pathnames stay English in both locales | Same slug for products, cases, solutions |
| x-default → English | `buildLocaleAlternates`, sitemap, root layout |

## Helpers

`src/i18n/seo.ts`:

```typescript
buildLocaleAlternates(pathname, locale)
// → { canonical, languages: { en, nl, "x-default" } }

absoluteLocalizedUrl(pathname, locale)  // absolute URL for sitemap
openGraphLocale(locale)                 // en_GB | nl_NL
```

## Per-page metadata (current state)

| Page group | Canonical | hreflang en/nl/x-default | Open Graph locale |
| --- | --- | --- | --- |
| Root layout (site default) | — | ✅ `/` and `/nl` only | ✅ from `getLocale()` |
| Shop list + PDP | ✅ locale-aware | ✅ `buildLocaleAlternates` | ✅ shop list |
| Solutions (overview + detail) | ⚠️ bare path only | ❌ not per-page | ⚠️ partial |
| Marketing (contact, about, …) | ⚠️ bare path only | ❌ not per-page | ⚠️ from root |
| Cases | ⚠️ bare path only | ❌ not per-page | ⚠️ partial |
| Legal | ⚠️ bare path only | ❌ not per-page | ⚠️ partial |
| Cart / checkout | ⚠️ bare path; checkout/success **noindex** | ❌ | — |
| Admin | `robots: noindex` | — | — |

**Gap:** Most marketing pages set `alternates: { canonical: paths.contact }` without locale prefix or hreflang. When viewed at `/nl/contact`, metadata may still point canonical to `/contact`. Shop pages are the reference implementation.

**Recommended fix (future):** use `buildLocaleAlternates(paths.contact, locale)` in each `generateMetadata` (with `getLocale()`).

## Sitemap

`src/app/sitemap.ts` emits **two URLs per route** (EN + NL) with:

```typescript
alternates: {
  languages: {
    en: enUrl,
    nl: nlUrl,
    "x-default": enUrl,
  },
}
```

Includes: static marketing routes, four case slugs, all product slugs from the database.

Checkout success/cancelled are excluded (transactional, noindex).

## hreflang summary

| Signal | EN URL example | NL URL example | x-default |
| --- | --- | --- | --- |
| Homepage | `https://example.com/` | `https://example.com/nl` | EN |
| Solutions | `…/solutions` | `…/nl/solutions` | EN |
| Product | `…/shop/starter-website` | `…/nl/shop/starter-website` | EN |

Product **prices in metadata/body** are identical across locales (localisation affects copy only).

## Preview & non-production

`src/middleware.ts` sets on preview deployments (`VERCEL_ENV=preview`):

```
X-Robots-Tag: noindex, nofollow
```

Preview URLs must not be treated as production canonicals. Use production `NEXT_PUBLIC_APP_URL` for live sitemap and hreflang absolutes.

## Structured data

`OrganizationJsonLd` in root layout — not locale-split; organisation entity is language-neutral.

## Verification

Unit tests (`tests/unit/i18n.test.ts`):

- English canonical has no `/en`
- Dutch alternate starts with `/nl`
- All `paths` keys produce valid alternates

Manual:

- [ ] View source on `/shop` and `/nl/shop` — compare `<link rel="alternate" hreflang="…">`
- [ ] Fetch `/sitemap.xml` — confirm paired EN/NL entries
- [ ] Preview deployment response headers include `X-Robots-Tag: noindex, nofollow`

## Related

- [`I18N_ARCHITECTURE.md`](./I18N_ARCHITECTURE.md) — middleware, helpers
- [`I18N_ROUTE_MATRIX.md`](./I18N_ROUTE_MATRIX.md) — indexable routes
- [`TRANSLATION_QA.md`](./TRANSLATION_QA.md) — gate 20–21
