# Notification locale event contract (ADR-001)

**Owner:** website/account layer (`profiles.preferred_locale` + form locale).  
**Consumers:** Resend Work / notification workers.  
**Status:** contract defined locally; Resend templates not rewritten in this phase.

## Required event fields

| Field | Type | Notes |
|-------|------|-------|
| `eventType` | string | e.g. `quote.received`, `auth.mfa_challenge` |
| `templateVersion` | string | Semver or date stamp of template |
| `recipientLocale` | `en` \| `nl` | Allowlisted only |
| `localeSource` | enum | `account` \| `cookie` \| `url` \| `form` \| `accept-language` \| `default` |
| `data` | object | Locale-safe template vars only — no secrets/PII beyond what the mail already needs |
| `fallbackLocale` | `en` | Always English technical fallback |

## Resolution rules for producers

1. Authenticated user → `profiles.preferred_locale` when set (`localeSource: account`).
2. Else explicit `NEXT_LOCALE` cookie (`cookie`).
3. Anonymous form → hidden form `locale` field (`form`).
4. Else English (`default`).

## Internal VDB staff notifications

May remain Dutch as an **internal** template category, marked `localeSource` accordingly — never mixed EN/NL payloads in one send.

## Implementation

- Zod schema: `src/lib/notifications/locale-event.ts`
- Do not log secrets or unnecessary PII.
