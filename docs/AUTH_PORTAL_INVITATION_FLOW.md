# Auth & Portal — Invitation Flow

## Model

Table: `organization_invitations`

- `token_hash` only (SHA-256); plaintext token once in email link
- Bound to email + organization_id + customer_role
- Statuses: PENDING → ACCEPTED | EXPIRED | REVOKED
- Single-use; revoke invalidates; re-invite issues new token

## Accept path

`/uitnodiging/accepteren?token=…`

1. Rate-limited
2. Hash lookup
3. Create auth user + ACTIVE membership transactionally (via service role after validation)
4. Audit log
5. Redirect to portal

## Rules

- No role escalation via request body
- Wrong email / expired / revoked → generic failure
- No open portal access without accepted invite (or staff-created membership)
