-- STATUS: LOCAL ONLY — grant authenticated DML on rc.3 tables (RLS still applies)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_message_attachments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointment_participants TO authenticated, service_role;
