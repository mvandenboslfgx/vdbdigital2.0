# Shop QA

Route: `/shop` · `/nl/shop`

## Features

- Category chips
- Search (`?q=`)
- Billing filter chips (all / one-time / monthly / quote-only)
- Mobile filters in details/summary drawer pattern
- Website packages section with dual VAT price display
- Bundles section
- Product cards: name, category, value proposition, price, billing, up to 3 highlights, lead time, CTA
- Empty / reset states
- No countdown / fake sale pressure

## Publication rules

- Concept products stay hidden (RLS / repository filters)
- Catalog packages are starting prices (DRAFT) — not checkout-published
- Custom / proposal-only items route to quote

## VAT clarity

Packages show excl. VAT (B2B) and incl. VAT (consumer context) without pretending client type is known.
