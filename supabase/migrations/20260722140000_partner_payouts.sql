-- =============================================================================
-- Payout requests + payouts (BCP-STAGING-008)
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partner_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE RESTRICT,
  requested_amount_cents BIGINT NOT NULL CHECK (requested_amount_cents > 0),
  available_amount_snapshot_cents BIGINT NOT NULL CHECK (available_amount_snapshot_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  status public.partner_payout_request_status NOT NULL DEFAULT 'REQUESTED',
  idempotency_key TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_payout_requests_idempotency UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE RESTRICT,
  payout_request_id UUID NOT NULL UNIQUE REFERENCES public.partner_payout_requests(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  status public.partner_payout_status NOT NULL DEFAULT 'PENDING',
  payout_method TEXT NOT NULL DEFAULT 'MANUAL',
  external_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_payout_requests_partner ON public.partner_payout_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON public.partner_payouts(partner_id);

-- Paid payouts immutable status (cannot unset PAID)
CREATE OR REPLACE FUNCTION public.partner_payout_protect_paid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'PAID' AND (NEW.status IS DISTINCT FROM 'PAID' OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents) THEN
    RAISE EXCEPTION 'partner_payout_paid_immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_payout_protect_paid ON public.partner_payouts;
CREATE TRIGGER trg_partner_payout_protect_paid
  BEFORE UPDATE ON public.partner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.partner_payout_protect_paid();

ALTER TABLE public.partner_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
