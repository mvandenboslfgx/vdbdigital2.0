# CSP Allowlist

Bron: `src/middleware.ts`

| Directive | Waarde | Reden |
|-----------|--------|-------|
| `default-src` | `'self'` | Basis |
| `script-src` | `'self' 'unsafe-inline' https://embed.tawk.to` | Next.js inline + tawk.to (na consent) |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind/component styles |
| `img-src` | `'self' data: https:` | Afbeeldingen |
| `font-src` | `'self'` | Geist via next/font |
| `connect-src` | `'self' https://*.supabase.co https://api.mollie.com https://embed.tawk.to wss://*.tawk.to` | API calls |
| `frame-src` | `https://embed.tawk.to https://www.mollie.com` | Chat + checkout |
| `frame-ancestors` | `'none'` | Clickjacking bescherming |
| `base-uri` | `'self'` | |
| `form-action` | `'self'` | Formulieren |

## Niet toegestaan

- `script-src *`
- `unsafe-eval` (productie)
- Brede `https:` in script-src

## Externe domeinen

| Domein | Dienst |
|--------|--------|
| `embed.tawk.to` | Livechat widget |
| `*.supabase.co` | Database/Auth |
| `api.mollie.com` | Betalingen (server-side; CSP voor redirects) |
| `www.mollie.com` | Hosted Checkout iframe |
