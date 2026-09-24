# Cloudflare environment matrix

| Variabele | Local | Preview | Production |
| --- | --- | --- | --- |
| `VDB_DEPLOYMENT_ENV` | development | preview | production |
| `NEXT_PUBLIC_APP_URL` | localhost | workers.dev preview origin | https://vdbdigital.nl |
| `NEXT_PUBLIC_SUPABASE_URL` | vereist | vereist | vereist |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | vereist | vereist | vereist |
| `SUPABASE_SECRET_KEY` | server-only | secret | secret |
| `MOLLIE_API_KEY` | test_ | test_ | live_ of bewust test_ vóór go-live |
| `MOLLIE_WEBHOOK_TOKEN` | optioneel | secret | secret |
| `RESEND_API_KEY` | secret | secret | secret |
| `EMAIL_FROM` | verified sender | verified sender | verified sender |
| `RESEND_MARKETING_SEGMENT_ID` | optioneel | configured | configured |
| `RESEND_MARKETING_TOPIC_ID` | optioneel | configured | configured |
| `GOOGLE_PLACES_API_KEY` | server secret | secret | secret |
| `PUBLIC_FORM_RPC_SECRET` | server secret | secret | secret |
| `UPSTASH_REDIS_REST_URL` | optioneel | optioneel | optioneel |
| `UPSTASH_REDIS_REST_TOKEN` | optioneel | optioneel | optioneel |

Als Upstash niet volledig is geconfigureerd, gebruikt de production runtime de Supabase `check_rate_limit` RPC als duurzame fallback.
