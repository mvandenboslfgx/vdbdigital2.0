-- =============================================================================
-- Cash receipts + adjustments metadata (BCP-STAGING-010)
-- Compensating entries go through ledger RPCs.
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partner_cash_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partner_profiles(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  evidence_uri TEXT,
  evidence_note TEXT,
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_cash_receipts_idempotency UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.partner_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  reason TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  related_payout_id UUID REFERENCES public.partner_payouts(id) ON DELETE SET NULL,
  related_commission_id UUID REFERENCES public.partner_commissions(id) ON DELETE SET NULL,
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_adjustments_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_partner_cash_receipts_partner ON public.partner_cash_receipts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_adjustments_partner ON public.partner_adjustments(partner_id);

ALTER TABLE public.partner_cash_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_adjustments ENABLE ROW LEVEL SECURITY;
