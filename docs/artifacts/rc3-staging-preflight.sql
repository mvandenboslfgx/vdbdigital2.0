# Staging RC.3 preflight SQL (read-only)

Use on **`qzekuvmgfekzsowdecyk` only**. Never run against `nhsrdnjfsxfikfbdmdfj`.

```sql
-- Identity sanity (optional): expect empty / no prod coupling in app settings
SELECT current_database(), current_user;

-- Migration tip
SELECT version
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- Highest version present?
SELECT max(version) AS highest_version
FROM supabase_migrations.schema_migrations;

-- RC.3 versions must be ABSENT before apply
SELECT version
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260725120000',
  '20260725120100',
  '20260725120200',
  '20260725120300'
);

-- rc.2 / baseline objects must EXIST
SELECT
  to_regclass('public.portal_conversations') IS NOT NULL AS portal_conversations,
  to_regclass('public.portal_messages') IS NOT NULL AS portal_messages,
  to_regclass('public.portal_support_tickets') IS NOT NULL AS portal_support_tickets,
  to_regclass('public.portal_support_replies') IS NOT NULL AS portal_support_replies,
  to_regclass('public.portal_projects') IS NOT NULL AS portal_projects,
  to_regclass('public.portal_quotes') IS NOT NULL AS portal_quotes,
  to_regclass('public.portal_invoices') IS NOT NULL AS portal_invoices,
  to_regclass('public.portal_files') IS NOT NULL AS portal_files,
  to_regclass('public.partner_commissions') IS NOT NULL AS partner_commissions,
  to_regclass('public.feature_flags') IS NOT NULL AS feature_flags;

-- RC.3 objects must be ABSENT before apply
SELECT
  to_regclass('public.portal_message_attachments') IS NOT NULL AS portal_message_attachments,
  to_regclass('public.portal_appointments') IS NOT NULL AS portal_appointments,
  to_regclass('public.portal_appointment_participants') IS NOT NULL AS portal_appointment_participants,
  to_regprocedure('public.verify_messaging_support_appointments_contracts()') IS NOT NULL AS verify_rpc;

-- Ticket enum: NEW must be ABSENT before apply (added by RC.3)
SELECT EXISTS (
  SELECT 1
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'portal_ticket_status' AND e.enumlabel = 'NEW'
) AS ticket_status_has_new;
```

### Pass criteria before apply

| Check | Expected |
| --- | --- |
| Highest migration | ≥ `20260724160000` |
| RC.3 versions listed | **0 rows** |
| Baseline portal/partner/flags | all `true` |
| RC.3 tables/RPC | all `false` |
| `ticket_status_has_new` | `false` |

If any baseline is missing or RC.3 is partially present → **STOP** and escalate; do not blind-apply.
