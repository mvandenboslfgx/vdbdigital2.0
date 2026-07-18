# Customer Portal Operator Guide

## Daily flows

1. **Invite customer:** Admin → Klanten → create org + invite email → customer opens `/uitnodiging/accepteren?token=…`
2. **Create project:** Admin → Projecten → Nieuw → select organization → customer sees it when `customer_visible`
3. **Quote:** Insert `portal_quotes` with status SENT (admin tooling expands later) → customer accepts/declines in portal (no payment)
4. **Support:** Customer opens ticket → admin Support list

## Account blocking

Set `profiles.is_active = false` and/or organization `status = BLOCKED`. Portal and admin deny access.

## Local verification

```bash
npm run db:verify-customer-portal
npm run lint && npm run typecheck && npm test && npm run test:access-control && npm run build
```
