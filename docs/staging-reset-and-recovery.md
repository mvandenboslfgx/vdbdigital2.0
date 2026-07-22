# Staging Reset and Recovery

**Status:** PLAN — destructive staging ops require dual confirmation  
**Production ref denylist:** `nhsrdnjfsxfikfbdmdfj`

---

## Guards (every destructive script)

1. `APP_ENV=staging` (or explicit `--confirm-staging`)  
2. Target projectref **≠** denylist  
3. Target project name contains `Staging`  
4. Operator types projectref twice  
5. Log to evidence without secrets  

**Forbidden:** any reset/repair/push against production ref.

---

## Reset levels

| Level | What | When |
|-------|------|------|
| Soft | Truncate fixture tables; keep Auth users | Fast scenario reruns |
| Fixture | Rebuild fixtures via bootstrap | After soft drift |
| Full | Re-apply migrations / recreate DB schema + re-bootstrap Auth | Schema change / corruption |
| Nuclear | Delete/recreate staging project | Only with owner auth (new provisioning) |

Before non-idempotent experiments: logical backup of staging (Auth metadata + public schema + storage inventory).

---

## Auth & Storage

- Re-create synthetic users from vault passwords after full reset  
- Re-upload test Storage objects via bootstrap  
- Rotate webhook tokens if leaked during testing  

---

## Incident

| Symptom | Action |
|---------|--------|
| Script pointed at production | **ABORT**; revoke credentials used; audit logs |
| Staging data polluted with real PII | Wipe fixtures; rotate; document |
| Wrong client env (prod keys in staging app) | Stop app; scrub env; rotate if exposed |

Migration repair is **not** schema rollback. Prefer restore + re-apply.
