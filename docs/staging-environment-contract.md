# Staging Environment Contract — Matrix

**Status:** PLAN  
**Contract pin:** `vdb-backend-contract@0.1.0` / `2026.07.22.freeze`

---

## Full matrix

| Dimension | Canonical local | Mobile local | Partner local | **Shared staging** | Production |
|-----------|-----------------|--------------|---------------|--------------------|------------|
| `APP_ENV` | `local` | `local` | `local` | **`staging`** | `production` |
| Project name | local Docker | local Docker | local Docker | **VDB Digital Staging** | vdb nieuw |
| Projectref | n/a (Docker) | n/a | n/a | `<STAGING_REF_TBD>` ≠ prod | `nhsrdnjfsxfikfbdmdfj` |
| Local project_id | `vdbdigital2` | `vdb-digital-mobile-local` | `vdb-partners` | n/a (remote) | n/a |
| Ports | 54320–54324, 54327 | 54521–54524 | 54421–54424, 54427 | n/a | n/a |
| Supabase URL | `http://127.0.0.1:54321` | `http://127.0.0.1:54521` | `http://127.0.0.1:54421` | `https://<STAGING_REF>.supabase.co` | production URL |
| Publishable key | local demo | local demo | local demo | staging publishable | prod publishable |
| Server secret | local only | **none** | optional server-only | staging secret | prod secret |
| DB credentials | local postgres | local | local | staging (ops/CI only) | prod (ops only) |
| Mollie | off / test harness | none | none | **test only**; live absent | live gated separately |
| Resend/SMTP | local Mailpit / optional | none | optional | staging sink / test | production Resend |
| Callbacks | localhost | localhost / Expo | localhost | staging origins only | `vdbdigital.nl` |
| Redirect allowlist | local | local | local | staging web+mobile+partner | production only |
| `CHECKOUT_ENABLED` | false | n/a | n/a | **false** initially | false until authorized |
| `P05_MIGRATION_APPLIED` | unset | n/a | n/a | **unset** initially | unset until authorized |
| Testdata | yes | yes | yes | yes (synthetic) | no |
| Reset allowed | yes (`db reset`) | yes (own stack) | yes (own stack) | yes (staging reset protocol) | **no** without prod auth |
| Deployment target | local | emulator/device | local | staging hosts | production |
| Contract drift | warn/fail | warn/fail | warn/fail | **fail-closed** | **fail-closed** |

---

## Required client env shape (staging)

```env
APP_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://<STAGING_REF_TBD>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<STAGING_PUBLISHABLE>
VDB_BACKEND_CONTRACT=vdb-backend-contract@0.1.0
VDB_SCHEMA_VERSION=2026.07.22.freeze
# Server apps only:
# SUPABASE_SECRET_KEY=<STAGING_SECRET>
```

Mobile: **omit** all server secrets.

---

## Contract publication preference (design only — not published)

| Option | Verdict |
|--------|---------|
| A. Private npm package | **Preferred** — semver, CI pin, checksum |
| B. Git submodule | Acceptable short-term |
| C. Generated artefact + SHA256 | Required companion to A |
| D. Release artefact on GitHub | Acceptable for Mobile |
| E. Manual copy | **Temporary risk only** |

**Producer:** VDB Digital 2.0. **Consumers:** Mobile, Partner, (web optionally).  
Bump policy: additive = minor; breaking = major + `schemaVersion` change.  
Drift error code: `BACKEND_CONTRACT_MISMATCH`. User-facing copy: generic “App tijdelijk niet beschikbaar — probeer later opnieuw” (no technical leak).
