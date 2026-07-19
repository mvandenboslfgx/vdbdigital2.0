# Production logical backup and restore runbook

Read-only / pre-apply procedure for project `nhsrdnjfsxfikfbdmdfj` (vdb nieuw).  
**PITR NOT AVAILABLE** on Free plan — logical dump + verified restore is the minimum recovery route.

## When to run

- Immediately before any approved production migration apply
- After major catalog/content changes if a new baseline dump is desired
- Never as a substitute for upgrading to a plan with PITR when RPO requires it

## Operator rights

- Supabase project member with permission to run `supabase db dump --linked`
- Local Docker + Supabase CLI for isolated restore verification
- Access to an encrypted offline/store location for dump artifacts (not git)

## Pre-apply backup steps

1. Confirm linked project ref is exactly `nhsrdnjfsxfikfbdmdfj`.
2. Confirm `CHECKOUT_ENABLED` is not `true`; leave `P05_MIGRATION_APPLIED` unset.
3. Create a timestamped directory (gitignored):

```text
backups/production-readiness/YYYYMMDD-HHMMSS/
```

4. Dump schema + data (public) read-only:

```bash
npx supabase db dump --linked --schema public -f backups/production-readiness/<ts>/schema-public.sql
npx supabase db dump --linked --data-only --schema public -f backups/production-readiness/<ts>/data-public.sql
```

5. Record migration history (versions + names only) into `migration-history.csv`.
6. Store SHA-256 of dump files in the same directory (or evidence note).
7. **Do not** commit dumps. **Do not** print connection strings, passwords, or service-role keys.

## Safe storage / retention

- Keep dumps encrypted at rest (OS disk encryption or encrypted archive)
- Restrict ACLs to operators who perform apply/restore
- Retention: keep last N successful pre-apply dumps until the next verified apply + observation window
- Deletion: shred/secure-delete after retention; never paste dump contents into tickets with PII

## Restore to isolated environment

1. Create an isolated Postgres database (local Docker / separate instance) — never restore onto production for “tests”.
2. Ensure `auth` stub or full Auth schema exists if dump FKs require it.
3. Apply `schema-public.sql`, then `data-public.sql`.
4. Verify:

| Check | Expectation (example baseline 2026-07-19) |
|-------|---------------------------------------------|
| public tables | 20 |
| products | 16 |
| categories | 11 |
| customers / orders / payments | 0 / 0 / 0 |
| policies (public) | ~35 (dump/restore may differ slightly) |
| migration history file | 4 remote versions present |

5. Only after counts match: label **LOGICAL BACKUP VERIFIED** + **RESTORE PROCEDURE VERIFIED**.

A dump file without a successful restore test is **not** a verified backup.

## When database restore is required

- Partial migration apply leaves inconsistent schema
- Data corruption / accidental destructive DDL
- Failed apply that cannot be forward-fixed safely

Prefer forward-fix when safe; use restore when schema/data integrity is uncertain.

## Limits without PITR

- No point-in-time recovery to an arbitrary second
- Recovery point = last successful logical dump
- Downtime for restore may be significant (dump size, re-apply migrations, app freeze)

## Maximum acceptable downtime (suggested)

- Document per apply window with stakeholders (example target: ≤ 30–60 minutes for current catalog-sized DB)
- Freeze writes (checkout already off) during apply + verify

## Incident criteria

- Wrong project ref detected mid-apply
- Restore verification counts mismatch
- Migration verifier FAIL after apply
- Unexpected public storage bucket
- Checkout unexpectedly enabled

Collect: timestamp, project ref, migration list, verifier logs, dump checksums (no secrets).
