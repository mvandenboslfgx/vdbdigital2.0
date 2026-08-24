-- Invitation delivery metadata + partner entity kind.
-- Backwards compatible: existing PENDING/ACCEPTED/EXPIRED/REVOKED remain valid.
-- SENT/FAILED are added for mail dispatch outcomes. PENDING still means "not accepted".

DO $$
BEGIN
  ALTER TYPE public.portal_invite_status ADD VALUE IF NOT EXISTS 'SENT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.portal_invite_status ADD VALUE IF NOT EXISTS 'FAILED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.organization_invitations.email IS
  'Recipient mailbox only. Must never store EMAIL_FROM / noreply unless an admin typed that address as the customer.';
COMMENT ON COLUMN public.organization_invitations.provider_message_id IS
  'Resend (or other provider) message id after accepted send. Not an invite token.';

CREATE INDEX IF NOT EXISTS idx_org_invites_status
  ON public.organization_invitations (status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'partner_entity_kind'
  ) THEN
    CREATE TYPE public.partner_entity_kind AS ENUM ('INDIVIDUAL', 'BUSINESS');
  END IF;
END $$;

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS entity_kind public.partner_entity_kind NOT NULL DEFAULT 'BUSINESS';

COMMENT ON COLUMN public.partner_applications.entity_kind IS
  'INDIVIDUAL = particulier (KvK optional). BUSINESS = zakelijk (KvK required at submit).';

CREATE OR REPLACE FUNCTION public.submit_partner_application(
  p_legal_name text,
  p_trade_name text,
  p_contact_email text,
  p_kvk text DEFAULT NULL,
  p_vat text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_entity_kind public.partner_entity_kind DEFAULT 'BUSINESS'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_kind public.partner_entity_kind;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_kind := COALESCE(p_entity_kind, 'BUSINESS');

  IF v_kind = 'BUSINESS' AND (p_kvk IS NULL OR length(trim(p_kvk)) < 8) THEN
    RAISE EXCEPTION 'KVK_REQUIRED';
  END IF;

  SELECT id INTO v_id
  FROM public.partner_applications
  WHERE user_id = auth.uid()
    AND status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW')
  FOR UPDATE;

  IF v_id IS NOT NULL THEN
    UPDATE public.partner_applications
    SET status = 'SUBMITTED',
        legal_name = p_legal_name,
        trade_name = p_trade_name,
        contact_email = p_contact_email,
        kvk_number = NULLIF(trim(COALESCE(p_kvk, '')), ''),
        vat_number = p_vat,
        contact_phone = p_phone,
        entity_kind = v_kind,
        submitted_at = COALESCE(submitted_at, NOW()),
        updated_at = NOW(),
        version = version + 1
    WHERE id = v_id;
  ELSE
    INSERT INTO public.partner_applications (
      user_id, status, legal_name, trade_name, contact_email, kvk_number, vat_number,
      contact_phone, entity_kind, submitted_at
    ) VALUES (
      auth.uid(), 'SUBMITTED', p_legal_name, p_trade_name, p_contact_email,
      NULLIF(trim(COALESCE(p_kvk, '')), ''), p_vat, p_phone, v_kind, NOW()
    )
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.partner_profiles (user_id, status, legal_name, display_name)
  VALUES (auth.uid(), 'PENDING', p_legal_name, COALESCE(p_trade_name, p_legal_name))
  ON CONFLICT (user_id) DO UPDATE
    SET legal_name = EXCLUDED.legal_name,
        display_name = EXCLUDED.display_name,
        updated_at = NOW()
  WHERE public.partner_profiles.status = 'PENDING';

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partner_application(text,text,text,text,text,text,public.partner_entity_kind) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text,text,text,text,text,text,public.partner_entity_kind) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_partner_application(
  p_legal_name text,
  p_trade_name text,
  p_contact_email text,
  p_kvk text DEFAULT NULL,
  p_vat text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.submit_partner_application(
    p_legal_name, p_trade_name, p_contact_email, p_kvk, p_vat, p_phone, 'BUSINESS'::public.partner_entity_kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text,text,text,text,text,text) TO authenticated;
