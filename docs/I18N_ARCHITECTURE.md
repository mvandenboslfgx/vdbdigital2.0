# I18N architecture

English-first internationalisation for the VDB Digital platform. Only **`en`** and **`nl`** are enabled at runtime.

## URL model

| Locale | URL pattern | Example |
| --- | --- | --- |
| English (default) | Root, no `/en` prefix | `/contact`, `/shop/starter-website` |
| Dutch | `/nl` prefix | `/nl/contact`, `/nl/shop/starter-website` |

Pathnames stay **English** in both locales. Localised slugs are not used (expandable later via `src/i18n/config.ts`).

Admin routes are **English-only** at `/admin/*`. `/nl/admin` redirects with **308** to `/admin`.

## Middleware rewrite flow

`src/middleware.ts`:

1. Strips `/nl` prefix → sets `x-locale: nl` and **rewrites** internally to the bare pathname (same page components serve both locales).
2. English routes set `x-locale: en` without rewrite.
3. Sets `NEXT_LOCALE` cookie (1 year, `SameSite=Lax`) for preference persistence.
4. Applies legacy **308 redirects** from old Dutch URLs (`/oplossingen`, `/offerte`, …) to English pathnames, preserving `/nl` when present.
5. Preview deployments receive `X-Robots-Tag: noindex, nofollow`.

```
Request /nl/solutions
  → stripLocalePrefix → locale=nl, bare=/solutions
  → rewrite internally to /solutions
  → x-locale=nl header + NEXT_LOCALE=nl cookie
  → page renders with Dutch dictionary
```

## Core modules

| Piece | Location | Role |
| --- | --- | --- |
| Locale config + path helpers | `src/i18n/config.ts` | `locales`, `withLocale`, `stripLocalePrefix`, `paths`, legacy redirects |
| UI dictionaries | `src/i18n/messages/en.ts`, `nl.ts` | 364 keys each (nav, forms, checkout, errors, …) |
| Server dictionary | `src/i18n/get-dictionary.ts` | Resolves locale from `x-locale` header or `NEXT_LOCALE` cookie |
| Client provider | `src/i18n/provider.tsx` | `I18nProvider`, `useT()`, `useI18n()` |
| Translation function | `src/i18n/create-t.ts` | Dot-path lookup + `{var}` interpolation |
| Locale-aware links | `src/i18n/locale-link.tsx`, `src/components/ui/locale-link-button.tsx` | Prefix `/nl` when active locale is Dutch |
| Hook | `src/i18n/use-localized-href.ts` | Client href helper |

## Content maps (long-form copy)

Structured bilingual content outside the main dictionary:

| Map | Location | Used by |
| --- | --- | --- |
| Solution pages | `src/i18n/content/solutions.ts` | `/solutions` and detail pages |
| Product NL overlays | `src/i18n/content/products-nl.ts` | Shop PDP via `localizeProduct()` |

Product EN copy lives in seed/DB; NL overlays keyed by **unchanged slug**.

## Language switcher & query sanitization

`src/i18n/language-switcher.tsx`:

- Reads bare pathname via `stripLocalePrefix`.
- Builds target href with `withLocale(bare, code)`.
- Preserves only **safe** query keys (`src/i18n/locale-query.ts`):

  **Allowed:** `product`, `category`, `categorie`, `ref`, UTM params

  **Stripped:** `token`, `access_token`, `code`, `state`, `session`, `payment_id`, `mollie`, `password`, `secret`, `api_key`, …

- Hash fragments are **not** appended by the switcher (Next.js `Link` href only).
- Touch targets: `min-h-11 min-w-11` (~44px).
- Rendered in header (desktop + mobile menu) and footer via `LanguageSwitcherBoundary` (Suspense for `useSearchParams`).

## Form locale validation

Hidden `locale` field on contact, quote, and support forms. Server actions call `parseFormLocale()` (`src/i18n/locale-query.ts`):

- Accepts only `en` | `nl` via `isLocale()`.
- Any other client value **falls back to `en`**.
- Validated locale is stored on the submission record and passed to email templates.

## Email templates

`src/lib/email/templates.ts` — bilingual customer mail for:

- contact, quote, support confirmations
- order received, payment success/failed, order cancelled

`resolveMailLocale()` falls back to English. HTML uses `escapeHtml()` for user-supplied names.

Internal admin notifications include `(EN)` or `(NL)` in the subject and a `Language:` line in the body (`src/lib/email/resend.ts`).

## SEO helpers

`src/i18n/seo.ts`:

- `buildLocaleAlternates(pathname, locale)` — canonical + `hreflang` `en`, `nl`, `x-default` (English never uses `/en`).
- `absoluteLocalizedUrl()` — absolute URL for sitemap/metadata.
- `openGraphLocale()` — `en_GB` / `nl_NL`.

**Current usage:** `buildLocaleAlternates` is wired on shop list and PDP pages. Most other pages set a bare `canonical` without per-page hreflang (see `docs/SEO.md`).

Root layout (`src/app/layout.tsx`) sets site-wide `alternates.languages` for `/` and `/nl` only.

## Sitemap

`src/app/sitemap.ts` emits **bilingual entries** for static routes, case studies, and each product slug with `alternates.languages` (`en`, `nl`, `x-default` → English).

## Expandable locales (not enabled)

`src/i18n/config.ts` comments reference future locales: `de`, `fr`, `es`, `sq`. They are **not** in the `locales` array and must not be enabled until dictionaries and content maps are complete. See `docs/TRANSLATION_WORKFLOW.md`.

## HTML `lang` attribute

Root `<html lang={locale}>` is set from `getLocale()` in `src/app/layout.tsx` — `en` or `nl`.

## Related docs

- [`I18N.md`](./I18N.md) — quick reference
- [`I18N_ROUTE_MATRIX.md`](./I18N_ROUTE_MATRIX.md) — route parity
- [`TRANSLATION_WORKFLOW.md`](./TRANSLATION_WORKFLOW.md) — how to add keys
- [`SEO.md`](./SEO.md) — canonical, hreflang, preview noindex
