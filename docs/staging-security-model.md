# Staging Security Model — VDB Digital Platform

**Status:** PLAN — no secrets configured in this phase  
**Canonical HEAD:** `93ab6cc4e61c19da072fe41bba7361397bd8bed0`

---

## Principles

1. Staging ≠ production (different projectref, different secrets).  
2. Least privilege: Mobile never receives server secrets.  
3. Financial authority only via central RPCs / service role on **canonical web server**.  
4. Fail-closed feature flags until staging gates pass.  
5. No production credentials in staging deployments, docs, or screenshots.

---

## Secret matrix

| Secret / config | Public client | Server staging | Server prod | CI-only | Local-only | Forbidden in Mobile | Forbidden in Git |
|-----------------|:-------------:|:--------------:|:-----------:|:-------:|:----------:|:-------------------:|:----------------:|
| Supabase publishable / anon | ✓ | ✓ | ✓ | | ✓ | | ✓ values |
| Supabase service-role / secret key | | ✓ | ✓ | ✓ | ✓ | **YES** | **YES** |
| DB password / direct URL | | ✓ (ops) | ✓ (ops) | ✓ | ✓ | **YES** | **YES** |
| Pooler URL with password | | ✓ | ✓ | ✓ | ✓ | **YES** | **YES** |
| SMTP password | | ✓ | ✓ | ✓ | | **YES** | **YES** |
| Resend API key | | ✓ | ✓ | ✓ | ✓ | **YES** | **YES** |
| Mollie **test** key | | ✓ | | ✓ | ✓ | **YES** | **YES** |
| Mollie **live** key | | | ✓ | ✓ | | **YES** | **YES** |
| Webhook app token | | ✓ | ✓ | ✓ | ✓ | **YES** | **YES** |
| Encryption keys | | ✓ | ✓ | ✓ | | **YES** | **YES** |
| Vercel / GitHub / EAS tokens | | | | ✓ | | **YES** | **YES** |
| `APP_ENV` / contract pins | ✓ | ✓ | ✓ | ✓ | ✓ | | OK as non-secret |

Placeholders only in docs (e.g. `<STAGING_PUBLISHABLE_KEY>`).

---

## Client rules

### Mobile

**Allowed:** staging URL, publishable key, `APP_ENV=staging`, `VDB_BACKEND_CONTRACT`, `VDB_SCHEMA_VERSION`, non-secret feature flags.  

**Forbidden:** service-role, DB password, SMTP/Resend/Mollie secrets, webhook secrets, production admin keys.

### Partner Portal

Publishable config in browser OK. Server secrets only if server-side, not `NEXT_PUBLIC_*`, documented, least privilege, **no** independent financial authority outside central RPCs.

### Canonical web

May hold staging service-role for admin, verifiers, webhook receiver, contract checks. Must use staging-only secrets.

---

## Rotation & leak

| Event | Action |
|-------|--------|
| Suspected leak | Rotate staging secrets immediately; revoke publishable if needed; audit Auth sessions |
| Staging reset | May rotate webhook tokens; update all three clients |
| Operator offboarding | Revoke Dashboard + secret-store access |

Never paste secret values into chat, Git, or audit markdown.

---

## Production denylist

```text
nhsrdnjfsxfikfbdmdfj   # vdb nieuw — NEVER staging target
```

Any script that mutates remote DB must refuse this ref when `APP_ENV=staging` or when staging mode is declared.
