-- STATUS: LOCAL ONLY — fix appointment RLS recursion (rc.3)
-- portal_appointments <-> portal_appointment_participants cross-policy SELECT loop.

CREATE OR REPLACE FUNCTION public.can_view_portal_appointment(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_appointments a
    WHERE a.id = p_appointment_id
      AND (
        public.is_staff_admin()
        OR public.is_org_member(a.organization_id)
        OR a.organizer_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.portal_appointment_participants ap
          WHERE ap.appointment_id = a.id AND ap.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_portal_appointment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_portal_appointment(uuid) TO authenticated;

DROP POLICY IF EXISTS portal_appointments_select ON public.portal_appointments;
CREATE POLICY portal_appointments_select ON public.portal_appointments
  FOR SELECT TO authenticated
  USING (public.can_view_portal_appointment(id));

DROP POLICY IF EXISTS portal_appointment_participants_select ON public.portal_appointment_participants;
CREATE POLICY portal_appointment_participants_select ON public.portal_appointment_participants
  FOR SELECT TO authenticated
  USING (
    public.is_staff_admin()
    OR user_id = auth.uid()
    OR public.can_view_portal_appointment(appointment_id)
  );

-- Table grants (RLS still enforced); new tables missed default authenticated DML grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_message_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointment_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_message_attachments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_appointment_participants TO service_role;
