# Security

## Doel

Ontwikkeling gericht op OWASP ASVS 5.0 Level 2 best practices. Geen compliance-claims op de website.

## Geïmplementeerd

- Content Security Policy (middleware)
- HSTS (productie)
- X-Content-Type-Options, X-Frame-Options
- Referrer-Policy, Permissions-Policy
- Server-side inputvalidatie (Zod)
- **Rate limiting:** Vercel Firewall/WAF (Preview/Production) + dev in-memory limiter
- Honeypot op formulieren
- CSRF/origin controle op mutaties
- Veilige cookies (httpOnly cart)
- Idempotente webhook verwerking
- RBAC admin autorisatie
- Audit log tabel (schema)
- Geen secrets in client code
- Supabase SSR session refresh (middleware)
- Env-validatie scripts — loggen nooit secret waarden
- Live RLS testscript (`npm run db:test-rls`)
- OWNER-validatie (`npm run db:verify-owner`)
- Preview noindex (`X-Robots-Tag`, `robots.txt`)
- Centrale base-URL (`src/lib/url/app-url.ts`) — geen localhost op Preview
- **Zero-trust admin auth** (`src/server/auth/`) — MFA AAL2, RBAC permissions, object-level authorization
- Access-control tests (`npm run test:access-control`)

## Rate limiting architectuur

| Omgeving | Laag |
| --- | --- |
| Development | In-memory limiter (`src/lib/security/rate-limit.ts`) |
| Preview/Production | **Vercel WAF** (primair) + applicatie-validatie (defense in depth) |

Zie [VERCEL_WAF_RATE_LIMITING.md](./VERCEL_WAF_RATE_LIMITING.md) en [HTTP_MUTATION_ROUTES.md](./HTTP_MUTATION_ROUTES.md).

Werkelijke mutaties zijn Next.js Server Actions op paginapaden (`POST /contact`, etc.), geen `/api/contact`.

Upstash wordt **niet** gebruikt.

## Chat / contact

- **tawk.to:** optioneel — uitgeschakeld zonder Widget ID
- **WhatsApp:** actieve fallback (`NEXT_PUBLIC_WHATSAPP_NUMBER`)

## CSP externe domeinen

- `embed.tawk.to` — livechat (alleen wanneer tawk actief + consent)
- `*.supabase.co` — database/auth
- `api.mollie.com` — betalingen

## Niet geïmplementeerd zonder credentials

- Turnstile CAPTCHA (configureerbaar via env)
- MFA (voorbereid via Supabase Auth)
