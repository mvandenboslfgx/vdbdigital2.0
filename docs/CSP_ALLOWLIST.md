# CSP Allowlist

Bron: `src/middleware.ts`

| Directive | Waarde | Reden |
|-----------|--------|-------|
| `default-src` | `'self'` | Basis |
| `script-src` | `'self' 'unsafe-inline'` | Next.js inline (geen externe chatwidgets) |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind/component styles |
| `img-src` | `'self' data: https:` | Afbeeldingen |
| `font-src` | `'self'` | Geist via next/font |
| `connect-src` | `'self' https://*.supabase.co https://api.mollie.com` | API calls |
| `frame-src` | `https://www.mollie.com` | Hosted Checkout iframe |
| `frame-ancestors` | `'none'` | Clickjacking bescherming |
| `base-uri` | `'self'` | |
| `form-action` | `'self'` | Formulieren |

## Niet toegestaan

- `script-src *`
- `unsafe-eval` (productie)
- Brede `https:` in script-src
- Externe livechat-domeinen

## Externe domeinen

| Domein | Dienst |
|--------|--------|
| `*.supabase.co` | Database/Auth |
| `api.mollie.com` | Betalingen (server-side; CSP voor redirects) |
| `www.mollie.com` | Hosted Checkout iframe |
