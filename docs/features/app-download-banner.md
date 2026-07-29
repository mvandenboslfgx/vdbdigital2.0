# App Download Banner

> **Status: FEATURE-FLAGGED OFF — Not active in production**
> The app is not yet publicly available. The banner must remain disabled until the release checklist passes.

## Overview

A premium, non-intrusive mobile-only banner that invites website visitors to download or open the VDB Digital app. The banner appears subtly after a short delay or scroll engagement, can be dismissed, and remembers the visitor's choice for 30 days.

## Behaviour

| Condition | Outcome |
|---|---|
| Feature flag `NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED` ≠ `"true"` | Banner never renders |
| Flag is `true` but no valid store/deep-link URL | Banner never renders (fail-closed) |
| Desktop viewport (≥768 px) | Banner never renders |
| Mobile viewport (<768 px) | May render after trigger |
| Already shown this session | Does not render again |
| Dismissed within 30 days | Does not render |

**Show triggers** (mobile only, flag on, valid destination):
- After `NEXT_PUBLIC_APP_BANNER_DELAY_MS` milliseconds (default: 12 000 ms), **or**
- After the visitor scrolls ≥ 45 % of the page height — whichever fires first.

## Route Exclusions

Defined centrally in `src/config/promotion-policy.ts` (`GLOBALLY_EXCLUDED_ROUTES` + `APP_BANNER_EXCLUDED_ROUTES`).

The banner is **never** shown on:

- All authentication routes (`/inloggen`, `/account-aanmaken`, `/account-activeren`, `/e-mail-bevestigen`, `/uitloggen`, `/geen-toegang`, `/uitnodiging`, `/wachtwoord-herstellen`, `/wachtwoord-vergeten`, `/auth/**`)
- Checkout / payment (`/checkout/**`, `/betaling/**`, `/payment/**`, `/cart`)
- Customer portal (`/portal/**`)
- Admin panel (`/admin/**`)
- API routes (`/api/**`)
- Legal / cookie pages (`/privacy`, `/cookies`, `/terms`, `/refund-policy`)
- Contact, support, quote pages (`/contact`, `/support`, `/quote`)
- Error pages

The MarketingLayout reads the `x-pathname` header (set by middleware) and calls `isAppBannerAllowedOnRoute()` before rendering the banner server component.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED` | `false` | Master switch. Must be `"true"` to enable. |
| `NEXT_PUBLIC_APP_DEEP_LINK_URL` | _(empty)_ | URI scheme for app deep-link (e.g. `vdbdigital://home`). |
| `NEXT_PUBLIC_ANDROID_APP_STORE_URL` | _(empty)_ | Google Play Store URL. |
| `NEXT_PUBLIC_IOS_APP_STORE_URL` | _(empty)_ | Apple App Store URL. |
| `NEXT_PUBLIC_IOS_APP_STORE_ID` | _(empty)_ | Numeric App Store ID for iOS Smart App Banner meta tag. |
| `NEXT_PUBLIC_APP_BANNER_DELAY_MS` | `12000` | Delay before banner appears (ms). |
| `NEXT_PUBLIC_APP_BANNER_DISMISS_DAYS` | `30` | Days to hide after dismissal. |
| `NEXT_PUBLIC_APP_BANNER_VERSION` | `v1` | Storage key version. Bump to re-show after major update. |

## Analytics Events

Events fire **only** when the visitor has given analytics consent via the existing VDB consent layer.

| Event | When |
|---|---|
| `app_banner_impression` | Banner becomes visible |
| `app_banner_open_click` | CTA click when deep link destination |
| `app_banner_store_click` | CTA click when store destination |
| `app_banner_dismiss` | Close button or Escape key |
| `app_banner_fallback` | Deep link fallback to store fires |

**Event properties** (no PII):
- `platform` — `ios | android | other`
- `locale` — `en | nl`
- `routeGroup` — e.g. `marketing`
- `bannerVersion` — storage key version
- `destinationType` — `deep_link | ios_store | android_store | none`

## Privacy

- Dismiss state stored in `localStorage` key: `vdb_app_banner_dismissed_{version}` (functional storage, no consent required).
- Session tracking in `sessionStorage` key: `vdb_app_banner_shown` (functional, session-scoped, no consent required).
- No cookies.
- No user PII collected.
- No automatic redirect without user click.

## Deep Link / Store Fallback Flow

1. If a deep link URL is configured: on CTA click, attempt to open the app.
2. If the app does not open within 2 000 ms, open the appropriate store URL in a new tab.
3. If only a store URL is configured: open store directly.
4. If no valid destination exists: banner does not render.

No automatic redirects. All navigation is user-initiated via CTA click.

## iOS Smart App Banner

Optional iOS native meta tag via `<meta name="apple-itunes-app">`. Rendered **only** when:
- `NEXT_PUBLIC_IOS_APP_STORE_ID` contains a valid numeric ID, **and**
- `NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED=true`, **and**
- The app is live in the App Store.

Currently not wired — add in `app/layout.tsx` `generateMetadata` when conditions are met. The custom banner suppresses the native banner to avoid duplication.

## App Status

| Status | Description |
|---|---|
| `COMING_SOON` | Reserved for a non-intrusive informational variant. Not active. |
| Live | Only after release checklist passes. |

## Accessibility

- `role="region"` with `aria-label`
- Close button: `aria-label="Banner sluiten"` (NL) / `"Close banner"` (EN)
- Keyboard: **Escape** closes banner when focus is inside
- No focus trap
- No autoplay media
- iOS safe-area insets respected via `pb-[env(safe-area-inset-bottom,0px)]`
- Reduced motion respected via `@media (prefers-reduced-motion: reduce)`
- Touch targets ≥ 36 px

## Activation Procedure

### Prerequisites (ALL required before enabling)

1. ☐ VDB Digital app is publicly available in App Store **and** Play Store
2. ☐ Real App Store URL confirmed and tested
3. ☐ Real Play Store URL confirmed and tested
4. ☐ Deep link scheme tested on real Android + iOS devices
5. ☐ Android App Links / iOS Universal Links verified
6. ☐ Banner tested on real devices (320 px, 360 px, 390 px, 430 px)
7. ☐ Banner does not interfere with Core Web Vitals (CLS = 0)
8. ☐ Privacy/cookie policy updated if needed
9. ☐ Analytics consent-aware events verified
10. ☐ Vercel Preview env tested with `NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED=true`
11. ☐ VDB Digital full release checklist PASS

### Steps

1. In Vercel Dashboard (or `.env.local` for preview): set env variables.
2. Set `NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED=true`.
3. Set `NEXT_PUBLIC_ANDROID_APP_STORE_URL` and/or `NEXT_PUBLIC_IOS_APP_STORE_URL`.
4. Optionally set `NEXT_PUBLIC_APP_DEEP_LINK_URL`.
5. Deploy to Preview. Test on real devices.
6. If all checks pass: deploy to Production.

### Rollback

1. Set `NEXT_PUBLIC_APP_DOWNLOAD_BANNER_ENABLED=false` (or remove the variable).
2. Redeploy. No database changes. No cookie changes.
3. Existing localStorage dismiss keys expire naturally (30 days max).

## Files

| File | Purpose |
|---|---|
| `src/components/promotion/app-download-banner.tsx` | Client component — full banner logic |
| `src/components/promotion/app-download-banner-server.tsx` | Server wrapper — reads flags + i18n |
| `src/config/features.ts` | Feature flag helpers |
| `src/config/promotion-policy.ts` | Route exclusion policy |
| `src/i18n/messages/en.ts` | English labels (`appBanner.*`) |
| `src/i18n/messages/nl.ts` | Dutch labels (`appBanner.*`) |
| `src/components/layout/marketing-layout.tsx` | Wires banner into public layout |
| `src/styles/globals.css` | `vdb-banner-slide-in` animation |
| `tests/unit/app-download-banner.test.tsx` | Component tests |
| `tests/unit/promotion-policy.test.ts` | Route policy tests |
| `tests/unit/app-banner-features.test.ts` | Feature flag tests |
