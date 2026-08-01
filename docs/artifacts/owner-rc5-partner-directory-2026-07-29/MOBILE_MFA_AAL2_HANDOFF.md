# Mobile MFA AAL2 Operator Handoff — Owner RC5

This document contains **no secrets**. Load credentials from the local vault only.

## Operator
- Role: ADMIN
- Operator fingerprint (masked): 0b8bcb2be814
- Vault path (secrets): `C:\Users\XXX\.vdb-vault\owner-staging-mfa-operator-rc5.env`
- Staging ref: `qzekuvmgfekzsowdecyk`
- Verified TOTP factor id prefix: `51ee4626`

## AAL1 -> AAL2 proof status
- AAL1 login status: PASS (currentLevel=aal1 after fresh sign-in)
- AAL2 challenge/verify status: PASS (currentLevel=aal2 after supabase.auth.mfa.challenge + verify)

## Suitable Mobile sensitive action (for one-shot action resume)
Use RPC: `public.reject_partner_commission(uuid,text,text)`

Reason:
- It is guarded by `public.is_admin_or_owner()` and `public.require_aal2()` (AAL2 step-up).
- It is designed to have **no ledger post** / **no payout state change** (safe for staging one-shot resume).

## Mobile device steps (high-level)
1. Start with an AAL1 session on the operator account (fresh sign-in).
2. Trigger the UI flow that calls `reject_partner_commission`.
3. Complete the MFA challenge/verify using the TOTP from your authenticator app.
4. Confirm the action resumes successfully and returns a result payload.

## Cleanup
- Keep this operator account for the remainder of the RC5 APK readiness review.
- To rotate MFA: re-run this script (idempotent by enrolling only when factor is missing), then update the local vault.

## Limitations
- This handoff assumes staging still points to `qzekuvmgfekzsowdecyk`.
