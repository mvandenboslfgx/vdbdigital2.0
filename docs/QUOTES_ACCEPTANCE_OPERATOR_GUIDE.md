# Quotes Acceptance Operator Guide

## Day-to-day

- Create quotes only for **active** organizations
- Prefer READY before send; never expose drafts to customers
- Always set **terms version** before send
- After accept: use separate workflows for project kickoff / invoicing — quotes do not auto-create them
- Withdraw promptly if wrong org or pricing error; issue a new version

## Customer roles

| Role | View | Download | Accept | Decline |
|------|------|----------|--------|---------|
| PRIMARY | ✓ | ✓ | ✓ | ✓ |
| MEMBER | ✓ | ✓ | ✓ | ✓ |
| BILLING | ✓ | ✓ | ✗ | ✗ |
| VIEW_ONLY | ✓ | ✓ | ✗ | ✗ |

## Incidents

- Failed send must leave status non-SENT — retry send idempotently
- Duplicate accept: treat as success if same acceptance; conflict if another decision
- Expired: block accept even if UI still shows SENT

## Local verification

`npm run db:verify-quotes-acceptance` → `RESULT: PASS`
