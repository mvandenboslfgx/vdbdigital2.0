-- RC.3 staging preflight (READ-ONLY) — target qzekuvmgfekzsowdecyk only

SELECT current_database() AS database, current_user AS db_user;

SELECT version
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

SELECT max(version) AS highest_version
FROM supabase_migrations.schema_migrations;

SELECT version AS rc3_already_applied
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260725120000',
  '20260725120100',
  '20260725120200',
  '20260725120300'
);

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

SELECT
  to_regclass('public.portal_message_attachments') IS NOT NULL AS portal_message_attachments,
  to_regclass('public.portal_appointments') IS NOT NULL AS portal_appointments,
  to_regclass('public.portal_appointment_participants') IS NOT NULL AS portal_appointment_participants,
  to_regprocedure('public.verify_messaging_support_appointments_contracts()') IS NOT NULL AS verify_rpc;

SELECT EXISTS (
  SELECT 1
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'portal_ticket_status' AND e.enumlabel = 'NEW'
) AS ticket_status_has_new;
