# Quote Flow

Routes: `/quote` · `/nl/quote` (legacy `/nl/offerte` redirects)

## Steps

1. Customer type — Business | Consumer (required, never preselected)
2. Contact — name, email, phone optional, preferred method
3. Company — business only
4. Project — type, package/product prefills, goals, problems
5. Planning — timeline, budget bands, online/physical meeting
6. Consent — privacy (required, unchecked), terms as applicable

## Prefills

- `?product=` product slug
- `?package=` package slug

## Server rules

- Zod validation including `superRefine` for business company name
- Locale validated server-side
- Honeypot + rate limiting retained
- Extra context appended to description until dedicated metadata column exists
- Confirmation email uses customer locale
- Internal notification English-first with locale + customer type

## After submit

- Success state
- Schedule introduction CTA
- Booking link if configured; otherwise contact/quote/WhatsApp/email fallbacks
- In-person meetings: depending on project, location and availability
