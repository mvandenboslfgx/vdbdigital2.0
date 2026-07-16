# Mobile QA (multilingual)

Mobile-first checks for **English and Dutch** public surfaces. Complements [`MOBILE_FIRST.md`](./MOBILE_FIRST.md).

## Viewports

Test each viewport in **both** `en` and `nl`:

| Width × Height | Device class |
| --- | --- |
| 320 × 568 | Narrow phone |
| 360 × 800 | Android compact |
| 390 × 844 | iPhone 14/15 |
| 430 × 932 | Large phone |
| 768 × 1024 | Tablet portrait |

Also spot-check: landscape phone, iOS Safari, Android Chrome, keyboard open on forms, larger system text, safe-area insets.

## Language switcher (touch)

Implemented in `src/i18n/language-switcher.tsx`:

- `min-h-11 min-w-11` (~44px) touch targets
- `touch-manipulation` CSS
- Present in header (hidden on small screens in bar; visible in mobile menu) and footer

| Check | EN | NL | Status |
| --- | --- | --- | --- |
| Visible at 320px | — | — | PASS (E2E) |
| Tappable without mis-tap | — | — | SKIPPED (manual) |
| Active locale visually distinct | — | — | SKIPPED (manual) |
| Switch preserves current page | — | — | PASS (E2E) |

## Dutch text expansion

NL copy is often longer than EN. Verify on NL routes:

- [ ] No horizontal page scroll (320–768px)
- [ ] Buttons not clipped (hero CTAs, card actions, checkout)
- [ ] Nav/mobile menu items wrap or truncate gracefully
- [ ] Product cards readable (title + price + CTA)
- [ ] Form labels and error messages not overlapping inputs
- [ ] Cookie banner fits above home indicator (safe-area)
- [ ] Footer link columns do not overflow

## Per-area checklist

| Area | EN @ 320–768 | NL @ 320–768 | Notes |
| --- | --- | --- | --- |
| Header + mobile menu | SKIPPED | SKIPPED | Accordion Solutions / For business |
| Language switcher | PASS (E2E @ 320) | SKIPPED | |
| Hero | SKIPPED | SKIPPED | Stacked CTAs |
| Solution pages | SKIPPED | SKIPPED | Long feature lists |
| Shop grid + filters | SKIPPED | SKIPPED | Horizontal chip scroll |
| Product detail | SKIPPED | SKIPPED | |
| Cart | SKIPPED | SKIPPED | |
| Checkout | SKIPPED | SKIPPED | |
| Contact / quote / support forms | SKIPPED | SKIPPED | Keyboard + FAB overlap |
| Cookie banner | SKIPPED | SKIPPED | |
| Footer | SKIPPED | SKIPPED | Includes switcher |
| Admin login | SKIPPED | N/A | English only |
| MFA setup / verify | SKIPPED | N/A | English only |

**Status:** Manual viewport passes not yet recorded. E2E covers EN homepage + switcher at 320px only.

## Screenshot QA

Screenshot artifacts are **not committed**. Run Playwright with screenshot output when ready.

| Screenshot | EN | NL | Status |
| --- | --- | --- | --- |
| Homepage desktop | pending | pending | SKIPPED |
| Homepage 360px | pending | pending | SKIPPED |
| Mobile menu open | pending | pending | SKIPPED |
| Solutions overview | pending | pending | SKIPPED |
| Solution detail | pending | pending | SKIPPED |
| Shop listing | pending | pending | SKIPPED |
| Product page | pending | pending | SKIPPED |
| Cart | pending | pending | SKIPPED |
| Checkout | pending | pending | SKIPPED |
| Contact | pending | pending | SKIPPED |
| Quote | pending | pending | SKIPPED |
| Support | pending | pending | SKIPPED |
| Legal page | pending | pending | SKIPPED |
| Admin login | pending | N/A | SKIPPED |
| MFA setup | pending | N/A | SKIPPED |

Review each capture for: language consistency, clipping, overflow, wrong route, wrong active language, untranslated strings, translation keys, CTA parity.

## Local testing

```powershell
npm run dev
```

Chrome DevTools → device toolbar → test widths above on `/` and `/nl` routes.

E2E mobile coverage:

```powershell
npm run test:e2e
```

## Related

- [`TRANSLATION_QA.md`](./TRANSLATION_QA.md) — gates 22–23
- [`PUBLIC_ROUTE_QA.md`](./PUBLIC_ROUTE_QA.md) — route list
