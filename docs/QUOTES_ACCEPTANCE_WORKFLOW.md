# Quotes & Acceptance Workflow

## Admin

1. Create draft (`/admin/quotes/new`) — org required, project optional
2. Edit lines, discounts, tax basis points, validity, terms version
3. Preview (`/admin/quotes/[id]/preview`) — print HTML
4. Mark ready / send (`quotes.send`) — **send only when status is READY**
5. Send atomically: validate READY → snapshot version → status `SENT` → audit + notify
6. Withdraw / archive with reason when needed
7. New version after customer-visible send if content changes

## Portal (NL routes)

| Route | Purpose |
|-------|---------|
| `/portal/offertes` | List own org quotes |
| `/portal/offertes/[id]` | Detail; may set `first_viewed_at` / `VIEWED` |
| `/portal/offertes/[id]/accepteren` | Digital acceptance |
| `/portal/offertes/[id]/afwijzen` | Decline with optional reason |

## Acceptance checklist (server)

- Active membership + PRIMARY/MEMBER (or explicit business rule)
- Status SENT or VIEWED
- Not expired (`valid_until`)
- Not withdrawn
- Exact version
- Terms version visible + checkbox confirmation in UI
- Totals recalculated
- Idempotent RPC

## Status labels (NL)

Concept · Ter controle · Gereed · Verzonden · Bekeken · Geaccepteerd · Afwijzen · Verlopen · Ingetrokken · Vervangen · Gearchiveerd
