# next-intl / compat-layer cleanup inventory

Status: informational inventory only. **No files listed here were deleted.**
This documents which parts of the `next-intl` package and this codebase's own
`getDictionary`/`createT`/`MessagesProvider` compatibility layer are still
live, which are dead, and what a future cleanup PR could safely remove —
call-site-by-call-site — once someone signs off on it.

## Why this doc exists

The project migrated (or is mid-migrating) from raw `next-intl` APIs
(`useTranslations`, `NextIntlClientProvider`, `next-intl/navigation`) to a
homegrown server-first pattern: `getDictionary()` for server components/pages
and `t()` closures for anything that needs a translate function, backed by
the same static catalogs (`src/i18n/messages/en.ts`, `src/i18n/messages/nl.ts`
via `src/i18n/catalogs.ts`) that `next-intl`'s own request config
(`src/i18n/request.ts`) also reads. Both systems currently run **side by
side** and stay in sync because they share `catalogs.ts` as the single
message source. This doc inventories every remaining touchpoint of the old
system so a follow-up PR can remove exactly the right things in the right
order, without breaking either system prematurely.

## 1. The three layers found in `src/i18n/`

### Layer A — raw `next-intl` package (library-native)

| File | Next-intl API used | Purpose |
| --- | --- | --- |
| `src/i18n/routing.ts` | `defineRouting` (`next-intl/routing`) | Locale list + prefix strategy config, consumed only by `navigation.ts` below. |
| `src/i18n/navigation.ts` | `createNavigation` (`next-intl/navigation`) | Exports `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`. |
| `src/i18n/request.ts` | `getRequestConfig` (`next-intl/server`) | Supplies `locale`/`messages` to `NextIntlClientProvider` + any `next-intl` server API. |
| `src/i18n/global.ts` | `declare module "next-intl"` | Type augmentation (`AppConfig.Locale`/`Messages`) for next-intl's own typed hooks. |
| `src/app/layout.tsx` | `NextIntlClientProvider`, `getMessages` (`next-intl/server`) | Mounts the provider once, at the root, for every page. |
| `next.config.ts` | `next-intl/plugin` (`createNextIntlPlugin`) | Wires `request.ts` into the Next.js build. |
| `src/i18n/locale-provider.tsx` | `useLocale` (`next-intl`) | Compat wrapper — re-exports a narrowed `Locale`-typed `useLocale()`. |
| `src/i18n/use-localized-href.ts` | `useLocale` (`next-intl`) | `useLocalizedHref()` hook built on the same `next-intl` `useLocale()`. |
| `src/i18n/locale-link.tsx` | `useLocale` (`next-intl`) | `LocaleLink`, `useLocalizedPath`, `useLocalePathname` — all depend on `NextIntlClientProvider` being mounted. |

**Dead code found:** `src/i18n/navigation.ts` (and therefore its dependency
`src/i18n/routing.ts`) has **zero importers anywhere in `src/`** — grepped for
`from "@/i18n/navigation"` and `from "@/i18n/routing"` (outside
`navigation.ts` itself) with no hits. Nothing in the app uses next-intl's own
`Link`/`redirect`/`usePathname`/`useRouter`/`getPathname`; every call site
uses the hand-rolled `LocaleLink` (`locale-link.tsx`) / `withLocale()`
(`config.ts`) helpers instead. **This pair is safe to delete outright** once
someone double-checks no external script imports it.

**Still live (cannot remove yet):** `NextIntlClientProvider` in
`src/app/layout.tsx`, `request.ts`, `global.ts`, and the `next-intl/plugin`
wiring in `next.config.ts` are load-bearing — `locale-provider.tsx`,
`use-localized-href.ts`, and `locale-link.tsx` (used in 17 files, see below)
all call `useLocale()` from the `next-intl` package itself, which throws
without a mounted `NextIntlClientProvider` ancestor. Removing the provider
before those three files are rewritten to a non-next-intl locale source (e.g.
a plain React context, or reading from `usePathname()` directly) would break
every page that renders `LocaleLink`/header/footer.

### Layer B — homegrown compat layer (`getDictionary` / `createT` / `MessagesProvider`)

| File | Exports | Purpose |
| --- | --- | --- |
| `src/i18n/create-t.ts` | `createT`, `TranslateFn`, `getPath` | Builds a `t(key, vars?)` closure from a `Messages` object — the actual interpolation logic. |
| `src/i18n/get-dictionary.ts` | `getDictionary`, `getLocale`, `getMessages` | Server-only. `getDictionary()` returns `{ locale, messages, t }` — the dominant pattern for server components. |
| `src/i18n/provider.tsx` | `I18nProvider`, `useI18n`, `useT` | Client context that holds `{ locale, messages, t }`, built with `createT`. Independent of `next-intl`'s context. |
| `src/i18n/messages-provider.tsx` | `MessagesProvider` | Thin wrapper around `I18nProvider`; the component pages actually import. |

**Usage counts (grep, `src/`):**

- `from "@/i18n/get-dictionary"` — **150+ call sites** (nearly every server
  page/layout/server action in the app). This is the SSOT server-side pattern
  today; nothing here should move until a next-intl-native replacement
  (`getTranslations` from `next-intl/server`) is adopted everywhere, which is
  a much larger follow-up.
- `from "@/i18n/messages-provider"` (i.e. `MessagesProvider`) — **19 files**,
  all client-side interactive islands that need `useT()` inside forms:
  auth forms (`auth-forms.tsx`, `auth-login-form.tsx`), MFA forms
  (`mfa-setup-form.tsx`, `mfa-verify-form.tsx`), and the marketing
  contact/quote/support forms plus their host pages
  (`(marketing)/contact`, `(marketing)/quote`, `(marketing)/support`,
  `(auth)/inloggen`, `(auth)/account-aanmaken`, `(auth)/wachtwoord-vergeten`,
  `(auth)/wachtwoord-herstellen`, `(auth)/uitnodiging/accepteren`,
  `admin/mfa/setup`, `admin/mfa/verify`).

None of Layer B depends on `next-intl` at all — `createT`/`I18nProvider` are
fully self-contained, reading from the same `catalogs.ts` that `request.ts`
(Layer A) also reads. **Layer B could in principle outlive Layer A entirely**
if the goal is to drop the `next-intl` npm dependency; conversely, Layer A's
`useTranslations`/`getTranslations` could replace Layer B if the goal is to
lean fully into `next-intl`. Right now the repo does neither — it runs both,
which is the thing this doc flags for a decision.

### Layer C — shared foundation (keep regardless of which side "wins")

`src/i18n/catalogs.ts`, `src/i18n/messages/en.ts`, `src/i18n/messages/nl.ts`,
`src/i18n/config.ts`, `src/i18n/resolve-locale.ts`, `src/i18n/preference.ts`,
`src/i18n/locale-choice.ts`, `src/i18n/locale-query.ts`,
`src/i18n/formatters.ts`, `src/i18n/seo.ts`, `src/i18n/localize-product.ts`.
None of these import `next-intl` or the compat layer's React context — they
are plain data/URL utilities consumed by both Layer A and Layer B. Not in
scope for cleanup.

## 2. What can be removed now vs. later

| Item | Safe to remove now? | Why / prerequisite |
| --- | --- | --- |
| `src/i18n/navigation.ts`, `src/i18n/routing.ts` | **Yes** (0 importers) | Confirm no build script / codemod references them, then delete both files together (routing.ts has no other consumer). |
| `src/i18n/global.ts` type augmentation | No | Still required as long as any `next-intl` typed hook (`useLocale`, `NextIntlClientProvider`) is in the tree. |
| `NextIntlClientProvider` in `src/app/layout.tsx`, `next-intl/plugin` in `next.config.ts`, `src/i18n/request.ts` | No | Load-bearing for `locale-provider.tsx` / `use-localized-href.ts` / `locale-link.tsx` (17 call sites) until those are rewritten to not call `next-intl`'s `useLocale()`. |
| `src/i18n/locale-provider.tsx`, `use-localized-href.ts`, `locale-link.tsx` | No (rewrite first) | Rewrite `useLocale()` to derive locale from `usePathname()` + `stripLocalePrefix()` (already used elsewhere, e.g. `LanguageSwitcher`) instead of `next-intl`'s hook; once done, the three items above become removable too. |
| `MessagesProvider` / `I18nProvider` / `createT` (Layer B) | No | 19 client form islands depend on `useT()`; only remove if migrating those forms to `next-intl`'s `useTranslations()` (bigger effort, needs a client-side message subset decision — currently `MessagesProvider` passes the *entire* locale catalog to each island). |
| `getDictionary` / `getMessages` (Layer B, server) | No | 150+ call sites; this is the de-facto server SSOT. Only worth revisiting if the team commits to `next-intl`'s `getTranslations()` everywhere, which is a repo-wide mechanical migration, not a "cleanup." |

## 3. Recommended next step (not done here)

1. Delete `src/i18n/navigation.ts` + `src/i18n/routing.ts` (dead code, zero
   risk) in a small standalone PR.
2. Decide, as a team, whether the long-term direction is "lean into
   `next-intl`" (replace Layer B with `useTranslations`/`getTranslations`) or
   "drop `next-intl`" (rewrite the 3 Layer-A hooks in `locale-provider.tsx` /
   `use-localized-href.ts` / `locale-link.tsx` to stop calling `next-intl`'s
   `useLocale()`, then remove `NextIntlClientProvider`, `request.ts`,
   `global.ts`, and the `next-intl` dependency itself).
3. Whichever direction is chosen, do it as a mechanical, reviewable migration
   — not a mass delete — since both layers currently read from the same
   `catalogs.ts` and are functionally redundant rather than broken.
