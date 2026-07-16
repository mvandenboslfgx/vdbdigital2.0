# Admin Offers

Route: `/admin/offers` (permission: settings.read)

## Current capability

Config-driven review of:

- Founding Client Offer enablement, max slots, used slots (server state)
- Draft benefits (not public)
- Package / bundle founding eligibility
- Warning when `discountApproved` is false

## Not yet: full DB CRUD

Create/edit/audit of arbitrary offers in Supabase is a follow-up. Price and publication changes must remain audited and permission-gated.

## Rules

- No client-side slot authority
- Do not enable campaign in production without approved benefits
