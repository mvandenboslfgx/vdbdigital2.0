# Resend i18n handoff

Status: producer contract ready; no external template changes, deploy, or remote configuration in this phase.

## Ownership boundary

- Website producers own locale resolution and emit the validated contract in `src/lib/notifications/locale-event.ts`.
- Resend/template consumers select an exact template version and locale. They must not infer locale from names, country, or email address.
- `src/lib/email/resend.ts` now creates the contract for customer contact, quote, support, order, and payment mail before sending the existing HTML/text body.
- Existing HTML templates in `src/lib/email/templates.ts` are unchanged.

## Event contract

```json
{
  "eventType": "customer.paymentSuccess",
  "templateVersion": "web-customer-v1",
  "recipientLocale": "nl",
  "localeSource": "account",
  "data": {
    "orderNumber": "ORD-EXAMPLE-001"
  },
  "fallbackLocale": "en"
}
```

Required fields:

- `eventType`: stable domain event name.
- `templateVersion`: immutable producer/consumer contract version.
- `recipientLocale`: currently `en` or `nl`.
- `localeSource`: `account`, `cookie`, `url`, `form`, `accept-language`, or `default`.
- `data`: template variables only; no credentials, payment tokens, or secrets.
- `fallbackLocale`: always `en`.

Consumers must validate with `parseNotificationLocaleEvent()` before rendering. Producers use `createNotificationLocaleEvent()`.

## Event and template inventory

| Domain event | Current producer | Template family | EN | NL | Version |
| --- | --- | --- | --- | --- | --- |
| `customer.contact` | contact form | `contact` | yes | yes | `web-customer-v1` |
| `customer.quote` | quote form | `quote` | yes | yes | `web-customer-v1` |
| `customer.support` | support form | `support` | yes | yes | `web-customer-v1` |
| `customer.orderReceived` | order service | `orderReceived` | yes | yes | `web-customer-v1` |
| `customer.paymentSuccess` | Mollie webhook | `paymentSuccess` | yes | yes | `web-customer-v1` |
| `customer.paymentFailed` | Mollie webhook | `paymentFailed` | yes | yes | `web-customer-v1` |
| `customer.orderCancelled` | available helper; call-site audit needed | `orderCancelled` | yes | yes | `web-customer-v1` |

Internal contact/quote notifications currently include the submitted locale in the subject/body but are staff mail, not recipient-localized customer templates.

## EN and NL samples

English:

```json
{
  "eventType": "customer.quote",
  "templateVersion": "web-customer-v1",
  "recipientLocale": "en",
  "localeSource": "form",
  "data": { "templateArgument": "Example customer" },
  "fallbackLocale": "en"
}
```

Dutch:

```json
{
  "eventType": "customer.quote",
  "templateVersion": "web-customer-v1",
  "recipientLocale": "nl",
  "localeSource": "form",
  "data": { "templateArgument": "Voorbeeldklant" },
  "fallbackLocale": "en"
}
```

## Fallback rules

1. Use persisted account/order locale where available.
2. Otherwise use validated form/URL/cookie locale.
3. Unknown, absent, or unsupported locale resolves to English.
4. Missing NL template or required NL variable falls back to the same immutable version in English.
5. Never fall back to a different event type or newer template version.
6. Log event type, requested locale, selected locale, and version; do not log full payloads containing personal data.

## Missing templates and producer gaps

- Quote sent/accepted/declined/expired.
- Invoice issued/due/overdue/paid/credit note.
- Portal invitation, account activation, password/security notice.
- Project milestone, deliverable, feedback, and document-shared notices.
- Partner application, review outcome, agreement version, payout, and commission notices.
- Appointment booking/confirmation/reminder/cancellation.
- Support ticket status and agent reply.
- Mollie webhook currently calls payment helpers without the persisted order locale; this must be fixed before localized payment rollout.
- Order creation also calls the helper without the persisted checkout locale.
- A durable queue/outbox, idempotency key, and delivery-status model are outside this handoff and remain required for production reliability.

## Test matrix

| Case | Expected |
| --- | --- |
| EN form event | EN subject, text, HTML; contract validates |
| NL form event | NL subject, text, HTML; contract validates |
| Unsupported locale | schema rejects producer input or resolver selects EN |
| Missing locale | EN selected with `localeSource=default` |
| Missing NL template | same-version EN fallback, observable fallback marker |
| Missing required variable | fail before send; no partial template |
| Duplicate payment webhook | existing idempotency prevents duplicate customer mail |
| HTML variable injection | escaped in existing template implementation |
| Resend unavailable | producer reports `sent=false`; business record remains persisted |
| Secret/large payload | contract/policy rejects before queueing |

## Rollout order

1. Freeze event names and `web-customer-v1` variable schemas.
2. Add unit contract tests for producer events and EN/NL fallback.
3. Persist locale on order/quote/invoice records and pass it through all producers.
4. Create/version Resend templates in a non-production environment without changing the website HTML templates.
5. Run preview sends to controlled EN/NL inboxes.
6. Add delivery observability, idempotency, and retry/outbox behavior.
7. Enable one low-risk form confirmation domain.
8. Enable commerce mail only after webhook duplicate and locale persistence tests pass.
9. Roll out portal, finance, partner, and legal mail last, each behind an explicit release gate.

No Resend deployment, API mutation, or production template activation was performed.
