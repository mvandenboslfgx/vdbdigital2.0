# Local Infrastructure Isolation — VDB Digital 2.0

**REPOSITORY_ROLE:** `CANONICAL_BACKEND_OWNER`  
**Date:** 2026-07-22  
**Status:** FREEZE — definitive port matrix

---

## Definitive local port matrix (all three repos)

| Repository | Project-id | API | DB | Studio | Mail |
|------------|------------|----:|---:|-------:|-----:|
| **VDB Digital 2.0** (this repo) | `vdbdigital2` | **54321** | **54322** | **54323** | **54324** |
| VDB Partner Portal | `vdb-partners` | 54421 | 54422 | 54423 | 54424 |
| VDB Digital Mobile | `vdb-digital-mobile-local` | 54521 | 54522 | 54523 | 54524 |

Mobile **must not** use `54321`/`54322`. That collision caused earlier agent/container wars.

### This repo — additional reserved ports

| Service | Port | Notes |
|---------|-----:|-------|
| Shadow DB (`db.shadow_port`) | 54320 | `db diff` only |
| Analytics (when enabled) | 54327 | Stay in `543xx`; never steal Partner/Mobile bands |

Pinned in `supabase/config.toml`.

---

## Own resources only

| Resource | Identity |
|----------|----------|
| CLI project_id | `vdbdigital2` |
| Typical DB container | `supabase_db_vdbdigital2` |
| Volume labels | `com.supabase.cli.project=vdbdigital2` |
| Allowed `supabase stop` | `--project-id vdbdigital2` only |

---

## Forbidden (agents and scripts)

- Stopping `vdb-partners` or `vdb-digital-mobile-local` containers  
- `docker stop $(…)` / wildcards that match sibling names  
- `docker compose down` outside this repo  
- Global `taskkill` / `Stop-Process` / `pkill` / `killall` for “cleanup”  
- Claiming ports `54421–54429` or `54521–54529`  
- Deleting sibling volumes or networks  
- Editing files in sibling repositories  

### On port conflict

1. Stop **only** this stack: `npx supabase stop --project-id vdbdigital2`  
2. Report which foreign process holds the port  
3. Do **not** stop siblings — ask Mobile/Partner to move to their reserved ports  
4. Resume when `54321`/`54322` are free **or** owned by `vdbdigital2`

---

## Conflict-scan result (this repo, 2026-07-22)

| Area | Finding |
|------|---------|
| `scripts/` | No `docker stop` / `supabase stop` sibling targeting |
| `supabase/config.toml` | Ports pinned to `54321–54324` (+ shadow/analytics in band) |
| Docs historically telling operators to stop Mobile | Corrected — see apply-plan/manifest notes |

Historical incident (forbidden going forward): audits stopped Mobile/Partner to free default ports. Isolation = reserved ports, not kill-the-sibling.

---

## Sibling acceptance gate (before shared staging)

Staging is created only after:

```text
VDB MOBILE SHARED BACKEND AND LOCAL ISOLATION PASS
VDB PARTNER SHARED BACKEND AND LOCAL ISOLATION PASS
```

with ports confirmed as in the table above.
