-- =============================================================================
-- Commissions + balanced append-only ledger (BCP-STAGING-007, 010)
-- Outside production apply baseline ending at 20260719170000.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE RESTRICT,
  partner_sale_id UUID NOT NULL REFERENCES public.partner_sales(id) ON DELETE RESTRICT,
  status public.partner_commission_status NOT NULL DEFAULT 'PENDING',
  basis_amount_cents BIGINT NOT NULL CHECK (basis_amount_cents >= 0),
  rate_bps INT NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  calculation_rule_version TEXT NOT NULL DEFAULT 'v1_flat_bps',
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  CONSTRAINT partner_commissions_idempotency UNIQUE (idempotency_key),
  CONSTRAINT partner_commissions_one_per_sale UNIQUE (partner_sale_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON public.partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON public.partner_commissions(status);

-- Ledger header + entries (must balance)
CREATE TABLE IF NOT EXISTS public.partner_ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (char_length(currency) = 3),
  idempotency_key TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_ledger_tx_idempotency UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.partner_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.partner_ledger_transactions(id) ON DELETE CASCADE,
  account public.partner_ledger_account NOT NULL,
  partner_id UUID REFERENCES public.partner_profiles(id) ON DELETE RESTRICT,
  debit_cents BIGINT NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
  credit_cents BIGINT NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
  CONSTRAINT partner_ledger_entry_one_side CHECK (
    (debit_cents > 0 AND credit_cents = 0) OR (credit_cents > 0 AND debit_cents = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_partner_ledger_entries_tx ON public.partner_ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_entries_partner ON public.partner_ledger_entries(partner_id);

CREATE OR REPLACE FUNCTION public.partner_ledger_assert_balanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debit bigint;
  v_credit bigint;
BEGIN
  SELECT COALESCE(SUM(debit_cents),0), COALESCE(SUM(credit_cents),0)
    INTO v_debit, v_credit
  FROM public.partner_ledger_entries
  WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION 'partner_ledger_unbalanced debit=% credit=%', v_debit, v_credit;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_ledger_balanced ON public.partner_ledger_entries;
CREATE CONSTRAINT TRIGGER trg_partner_ledger_balanced
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.partner_ledger_assert_balanced();

-- Immutable posted ledger: block UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.partner_ledger_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'partner_ledger_immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_ledger_tx_immutable ON public.partner_ledger_transactions;
CREATE TRIGGER trg_partner_ledger_tx_immutable
  BEFORE UPDATE OR DELETE ON public.partner_ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION public.partner_ledger_reject_mutation();

DROP TRIGGER IF EXISTS trg_partner_ledger_entry_immutable ON public.partner_ledger_entries;
CREATE TRIGGER trg_partner_ledger_entry_immutable
  BEFORE UPDATE OR DELETE ON public.partner_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.partner_ledger_reject_mutation();

ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_ledger_entries ENABLE ROW LEVEL SECURITY;
