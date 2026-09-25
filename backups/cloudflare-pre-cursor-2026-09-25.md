# Pre-Cursor backup — 2026-09-25 21:18 Europe/Amsterdam

This file records the live Cloudflare production configuration before Cursor is connected.

## Cloudflare production Worker

- Service: `vdbdigital-preview` (historical name; currently serves production)
- Active Cloudflare Worker version: `f84ffd2e-b118-402e-9b06-37a9f7fc804f`
- Version number: `42`
- Explicit backup deployment: `62be2d82-3994-48b9-b975-954551d522ba`
- Backup deployment points 100% to the same version; no code/build change was made.
- Compatibility date: `2026-09-23`
- Compatibility flags: `nodejs_compat`
- Observability/logs: enabled

## Production domains

- `vdbdigital.nl` -> `vdbdigital-preview`
- `www.vdbdigital.nl` -> `vdbdigital-preview`
- Both are enabled as production Worker Domains.

## Plain-text bindings captured

- ALLOWED_ORIGINS=https://vdbdigital.nl,https://www.vdbdigital.nl
- BOOKING_ENABLED=1
- BOOKING_ONLINE_URL=https://calendly.com/verzamelvdbdigital/strategiegesprek
- BOOKING_PROVIDER=calendly
- BOOKING_PROVIDER_URL=https://calendly.com/verzamelvdbdigital/strategiegesprek
- CHECKOUT_ENABLED=true
- EMAIL_ADMIN=algemeen@vdbdigital.nl
- EMAIL_FROM=VDB Digital Software <noreply@vdbdigital.nl>
- GOOGLE_AUTH_ENABLED=1
- NEXT_PUBLIC_APP_URL=https://vdbdigital.nl
- NEXT_PUBLIC_COMPANY_ADDRESS=Molendijk 29
- NEXT_PUBLIC_COMPANY_CITY=Klaaswaal
- NEXT_PUBLIC_COMPANY_KVK=99981440
- NEXT_PUBLIC_COMPANY_PHONE=06 286 00 727
- NEXT_PUBLIC_COMPANY_PHONE_TEL=+31628600727
- NEXT_PUBLIC_COMPANY_POSTAL_CODE=3286 BE
- NEXT_PUBLIC_COMPANY_VAT=NL005423221B29
- NEXT_PUBLIC_CONTACT_EMAIL=algemeen@vdbdigital.nl
- NEXT_PUBLIC_PRIVACY_EMAIL=privacy@vdbdigital.nl
- NEXT_PUBLIC_SITE_NAME=VDB Digital Software
- NEXT_PUBLIC_SUPABASE_URL=https://nhsrdnjfsxfikfbdmdfj.supabase.co
- NEXT_PUBLIC_SUPPORT_EMAIL=support@vdbdigital.nl
- UPSTASH_REDIS_REST_URL=https://classic-hookworm-296438.upstash.io

## Secret bindings preserved in Cloudflare version 42

Cloudflare does not expose secret plaintext after creation. The active version preserves these secret bindings:

- GOOGLE_PLACES_API_KEY
- MOLLIE_API_KEY
- MOLLIE_WEBHOOK_TOKEN
- PUBLIC_FORM_RPC_SECRET
- RESEND_API_KEY
- SUPABASE_SECRET_KEY
- UPSTASH_REDIS_REST_TOKEN

## Recovery

If Cursor or a later deployment breaks production, redeploy/rollback Cloudflare to Worker version:
`f84ffd2e-b118-402e-9b06-37a9f7fc804f`

The explicit pre-Cursor backup deployment is:
`62be2d82-3994-48b9-b975-954551d522ba`

Do not overwrite or delete the above Cloudflare secrets without separately saving the original values from their providers.
