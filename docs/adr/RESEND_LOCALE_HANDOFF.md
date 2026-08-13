# Resend locale handoff (Phase 6)

Scope: wire the validated `NotificationLocaleEvent` contract (ADR-001 §24,
[`NOTIFICATION_LOCALE_EVENT_CONTRACT.md`](./NOTIFICATION_LOCALE_EVENT_CONTRACT.md))
into every customer-facing Resend send. This phase does **not** rewrite Resend
HTML templates — it validates the locale envelope around the existing
`src/lib/email/templates.ts` bodies and (where the data exists) threads the
correct locale into the call sites in `src/lib/email/resend.ts`.

## Producer inventory

All Resend sends live in `src/lib/email/resend.ts`. Customer-facing sends run
through the shared `sendCustomerMail()` producer, which builds and validates a
`NotificationLocaleEvent` via `createNotificationLocaleEvent()`
(`src/lib/notifications/locale-event.ts`, `parse`-equivalent — both call
`notificationLocaleEventSchema.parse`) before calling `resend.emails.send`.
Internal (staff-facing) admin notifications are out of scope for this
contract — they are single-locale operational mail, not customer
communication.

| Function | Event type | Locale source | Call site(s) |
| --- | --- | --- | --- |
| `sendContactConfirmation` | `customer.contact` | `form` (hidden `locale` field, `parseFormLocale`) | `src/server/actions/form-actions.ts` → `submitContactAction` |
| `sendQuoteConfirmation` | `customer.quote` | `form` | `src/server/actions/form-actions.ts` → `submitQuoteAction` |
| `sendSupportConfirmation` | `customer.support` | `form` | `src/server/actions/form-actions.ts` → `submitSupportAction` |
| `sendOrderConfirmation` | `customer.orderReceived` | `cookie` (`getLocale()` session resolution at submit time — see **Known gap** below) | `src/server/services/order-service.ts` → `createOrder` |
| `sendPaymentSuccess` | `customer.paymentSuccess` | `default` (no session available — async Mollie webhook) | `src/app/api/webhooks/mollie/route.ts` |
| `sendPaymentFailed` | `customer.paymentFailed` | `default` | `src/app/api/webhooks/mollie/route.ts` |
| `sendOrderCancelled` | `customer.orderCancelled` | `default` (not currently called; reserved) | — |
| `sendContactNotification` | — (internal, admin inbox) | n/a | out of scope |
| `sendQuoteNotification` | — (internal, admin inbox) | n/a | out of scope |
| `sendTestEmail` | — (operator utility) | n/a | out of scope |

## Schema

`src/lib/notifications/locale-event.ts`:

```typescript
{
  eventType: string;                 // e.g. "customer.quote"
  templateVersion: string;           // template placeholder version, see below
  recipientLocale: "en" | "nl";      // allowlisted only, never a raw client string
  localeSource: "account" | "cookie" | "url" | "form" | "accept-language" | "default";
  data: Record<string, unknown>;     // locale-safe template vars only — no secrets/PII
  fallbackLocale: "en";              // always the English technical fallback
}
```

Producers call `createNotificationLocaleEvent(input)` (alias behaviour to
`parseNotificationLocaleEvent(unknown)` — both run the same zod
`.parse()`), so a malformed event throws before any `resend.emails.send`
call, rather than silently sending an unvalidated payload.

## EN/NL example payloads

Quote confirmation, Dutch recipient (`localeSource: "form"`):

```json
{
  "eventType": "customer.quote",
  "templateVersion": "web-customer-v1",
  "recipientLocale": "nl",
  "localeSource": "form",
  "data": { "templateArgument": "Sanne" },
  "fallbackLocale": "en"
}
```

Order confirmation, English recipient resolved from the session cookie
(`localeSource: "cookie"`):

```json
{
  "eventType": "customer.orderReceived",
  "templateVersion": "web-customer-v1",
  "recipientLocale": "en",
  "localeSource": "cookie",
  "data": { "templateArgument": "VDB-20260801-4F9K2C" },
  "fallbackLocale": "en"
}
```

Payment failure from the Mollie webhook, no session context available
(`localeSource: "default"` — falls back to English until the **Known gap**
below is resolved):

```json
{
  "eventType": "customer.paymentFailed",
  "templateVersion": "web-customer-v1",
  "recipientLocale": "en",
  "localeSource": "default",
  "data": { "templateArgument": "VDB-20260801-4F9K2C" },
  "fallbackLocale": "en"
}
```

## Fallback behaviour

- `recipientLocale` is always resolved through `resolveMailLocale()`
  (`src/lib/email/templates.ts`): anything other than `"nl"` becomes `"en"`.
  There is no runtime path that can produce an unsupported locale in the
  validated event — the zod schema additionally rejects it defensively.
- `fallbackLocale` is hardcoded to `"en"` and rejected by the schema if a
  producer tries to set anything else (`tests/unit/notification-locale-event.test.ts`).
- If Resend itself is not configured (`RESEND_API_KEY`/`EMAIL_FROM` missing),
  `sendCustomerMail` still builds and returns the validated `localeEvent`
  alongside `{ sent: false, reason: "Email is not configured" }` — locale
  resolution and delivery are independent failure domains.

## Template version placeholders

| Family | Current version | Notes |
| --- | --- | --- |
| `contact` | `web-customer-v1` | Plain-text + escaped-HTML body in `templates.ts`; no visual redesign in this phase. |
| `quote` | `web-customer-v1` | Same. |
| `support` | `web-customer-v1` | Same. |
| `orderReceived` | `web-customer-v1` | Same. |
| `paymentSuccess` | `web-customer-v1` | Same. |
| `paymentFailed` | `web-customer-v1` | Same. |
| `orderCancelled` | `web-customer-v1` | Same. |

All families currently share one version stamp because they share one
inline-HTML implementation style. Bump the affected row(s) — not the whole
table — the next time a family's copy or markup changes, so the event log
stays a reliable audit trail of what a customer actually received.

## Known gap: orders have no persisted locale

`orders` (and the underlying `ValidatedCheckout`/`CustomerInput` types) do not
store a `locale` column. `createOrder()` resolves `getLocale()` from the
active request's cookie/header at submit time (`localeSource: "cookie"`) —
correct for the initial "order received" email, which is sent synchronously
in the same request as checkout submission.

The **Mollie webhook** (`src/app/api/webhooks/mollie/route.ts`) is an
asynchronous server-to-server callback with no buyer session, so
`sendPaymentSuccess`/`sendPaymentFailed` cannot resolve a locale and fall
back to English (`localeSource: "default"`). Closing this gap requires
persisting `preferred_locale` (or a one-off `checkout_locale`) on the order
row at creation time — an additive schema change intentionally **not**
included in this phase's migration set. Track it as a follow-up before
relying on localized payment-status emails.

## Test matrix

| Scenario | Test | Status |
| --- | --- | --- |
| Event schema accepts valid EN/NL events, sets `fallbackLocale: "en"` | `tests/unit/notification-locale-event.test.ts` | covered |
| Event schema rejects unsupported `recipientLocale` (e.g. `"de"`) | `tests/unit/notification-locale-event.test.ts` | covered |
| Event schema rejects non-English `fallbackLocale` | `tests/unit/notification-locale-event.test.ts` | covered |
| `getCustomerMailPreview` returns EN copy for `en` | `tests/unit/i18n.test.ts` (`localized emails`) | covered |
| `getCustomerMailPreview` returns NL copy for `nl` | `tests/unit/i18n.test.ts` | covered |
| `getCustomerMailPreview` falls back to English for missing locale | `tests/unit/i18n.test.ts` | covered |
| Customer HTML bodies escape user input (XSS) | `tests/unit/i18n.test.ts` | covered |
| `sendCustomerMail` builds a `localeEvent` even when Resend is unconfigured | — | **gap — add unit test mocking `RESEND_API_KEY` unset** |
| `sendOrderConfirmation` receives `localeSource: "cookie"` from `createOrder` | — | **gap — add integration-style test on `order-service.ts`** |
| Mollie webhook payment emails use `localeSource: "default"` | `tests/unit/mollie-webhook.test.ts` (send call assertions) | partially covered — extend to assert `localeEvent.localeSource` |

The two `gap` rows above are recommended follow-ups; they were not required
to land this phase and are safe to schedule independently since they test
existing, now-wired behaviour rather than net-new production code.

## Related

- [`NOTIFICATION_LOCALE_EVENT_CONTRACT.md`](./NOTIFICATION_LOCALE_EVENT_CONTRACT.md) — the abstract contract this document wires into concrete producers.
- [`docs/SEO.md`](../SEO.md) — Phase 5 locale-aware metadata, same `Locale` type.
- `src/lib/notifications/locale-event.ts` — schema + `createNotificationLocaleEvent`/`parseNotificationLocaleEvent`.
- `src/lib/email/resend.ts` — producers.
- `src/lib/email/templates.ts` — unmodified customer mail bodies (`resolveMailLocale`, `getCustomerMailPreview`).
