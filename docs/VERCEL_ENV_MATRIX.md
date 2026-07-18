# Vercel Environment Matrix

## Scopes per variabele

| Variabele | Development | Preview | Production | Opmerking |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ | Zelfde project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✓ | ✓ | ✓ | Publiek |
| `SUPABASE_SECRET_KEY` | ✓ | ✓ | ✓ | Server-only |
| `NEXT_PUBLIC_APP_URL` | localhost | Preview-URL* | Productiedomein | *Bij build op Vercel Preview wordt `VERCEL_URL` gebruikt |
| `MOLLIE_API_KEY` | `test_` | `test_` | `live_` (later) | Preview: **alleen test** |
| `MOLLIE_WEBHOOK_TOKEN` | optioneel | optioneel | optioneel | Applicatietoken (geen Mollie signature) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | — | ✓ | — | Alleen Preview + Deployment Protection |
| `RESEND_API_KEY` | ✓ | ✓ | ✓ | |
| `EMAIL_FROM` | ✓ | ✓ | ✓ | Geverifieerde afzender |
| `EMAIL_ADMIN` | ✓ | ✓ | ✓ | |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ✓ | ✓ | ✓ | Optionele WhatsApp-CTA |

**Production in Phase 5:** leeg of ongewijzigd.

---

## Preview (Vercel) — verplicht

| Variabele | Verplicht | Opmerking |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Ja | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ja | Publieke key |
| `SUPABASE_SECRET_KEY` | Ja | Server-only Secret key |
| `MOLLIE_API_KEY` | Ja | Alleen `test_` prefix — `live_` blokkeert deploy |
| `RESEND_API_KEY` | Ja | Transactionele e-mail |
| `EMAIL_FROM` | Ja | Geverifieerde afzender |
| `EMAIL_ADMIN` | Ja | Admin notificaties |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Ja | Actieve chatfallback |

## Optioneel (Preview)

| Variabele | Status |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Aanbevolen; anders `VERCEL_URL` server-side |
| `MOLLIE_WEBHOOK_TOKEN` | Optioneel applicatietoken (queryparam `token`) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vereist voor Mollie op beschermde Preview |
| `MOLLIE_WEBHOOK_SECRET` | Legacy alias — migreer naar TOKEN |

## Niet gebruikt

| Variabele | Status |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Verwijderd |
| `UPSTASH_REDIS_REST_TOKEN` | Verwijderd |

## Rate limiting

| Laag | Development | Preview/Production |
| --- | --- | --- |
| Edge | — | **Vercel WAF** (handmatig) |
| Applicatie | In-memory dev limiter | Zod, honeypot, origin |

Zie [VERCEL_WAF_RATE_LIMITING.md](./VERCEL_WAF_RATE_LIMITING.md).

## Integratiestatus

- **Externe livechat-widgets:** verwijderd
- **WhatsApp:** optionele contact-CTA
- **Rate limiting:** VERCEL WAF CONFIGURATION REQUIRED
